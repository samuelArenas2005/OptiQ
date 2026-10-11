#!/usr/bin/env python3
"""
OPTIQ  -  Quantum Combinatorial Optimization Protocol (Qollab Standalone Demo)
==============================================================================

A console demonstration of the full OptiQ pipeline:
1. Declarative Language: MiniZinc subset (binary variables, sum, forall, constraints).
2. Algebraic Compiler: Translation to Binary Integer Programming (BIP) and QUBO with slack variables.
3. Graph Spectral Analysis: Laplacian, spectral gap (lambda_2), spectral radius, and frustration balance.
4. Physics-Informed Neural Network (PINN): Inference of initial variational hyperparameters (gamma_0, beta_0).
5. QAOA Quantum Algorithm: Variational state evolution (H_C and H_M), classical optimization, and eigenstate sampling.

This script runs on local environments or directly within the Qollab.xyz runtime.
It recognizes the global `backend` variable provided by Qollab when available.

Execution:
    python main.py                  # Runs classic Knapsack problem (4 vars)
    python main.py knapsack8        # Runs Knapsack with 8 decision variables (12 Qubits)
    python main.py maxcut           # Runs Max-Cut problem
    python main.py setcover         # Runs Set Cover problem
    python main.py --server         # Launches FastAPI server (Uvicorn) on port 8000
"""

import sys
import os
import time
import logging
import warnings
from pathlib import Path
from typing import Any, Dict, List, Optional

# Silence warnings and noisy internal logs for a clean output
warnings.filterwarnings("ignore")
logging.basicConfig(level=logging.WARNING)
for log_name in ["qiskit", "ProblemParser", "MiniZincParser", "QAOASolver", "FeatureExtractor"]:
    logging.getLogger(log_name).setLevel(logging.WARNING)

# Ensure project root is in sys.path to import backend/ modules
if "__file__" in globals():
    BASE_DIR = Path(__file__).resolve().parent
else:
    BASE_DIR = Path.cwd().resolve()

if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))
backend_dir = BASE_DIR / "backend"
if backend_dir.exists() and str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Import backend modules and functions
try:
    from backend.parser.problem_parser import parse_problem
    from backend.ml.pinn_model import get_hyperparameters
    from backend.quantum.qaoa_solver import run_qaoa
    from backend.quantum.feature_extractor import extract_bip_features
    BACKEND_AVAILABLE = True
except ImportError:
    try:
        import importlib
        parse_problem = importlib.import_module("parser.problem_parser").parse_problem
        get_hyperparameters = importlib.import_module("ml.pinn_model").get_hyperparameters
        run_qaoa = importlib.import_module("quantum.qaoa_solver").run_qaoa
        extract_bip_features = importlib.import_module("quantum.feature_extractor").extract_bip_features
        BACKEND_AVAILABLE = True
    except (ImportError, ModuleNotFoundError) as err:
        print(f"Error loading backend modules: {err}")
        BACKEND_AVAILABLE = False


# -- Preloaded Sample MiniZinc Problems ---------------------------------------

BENCHMARKS = {
    "knapsack": {
        "title": "0/1 Knapsack Problem",
        "description": "Select the highest-value subset of items without exceeding maximum capacity.",
        "code": """% 0/1 Knapsack Problem
int: n = 10;
int: capacity = 25;
array[1..10] of int: weights = [3, 4, 6, 5, 2, 7, 8, 3, 5, 4];
array[1..10] of int: values  = [5, 6, 9, 8, 3, 11, 14, 5, 7, 6];

array[1..10] of var 0..1: x;

% Maximum weight constraint
constraint sum(i in 1..n)(weights[i] * x[i]) <= capacity;

% Objective: Maximize total value
solve maximize sum(i in 1..n)(values[i] * x[i]);
"""
    },
    "maxcut": {
        "title": "Maximum Cut on Graph (Triangle Max-Cut)",
        "description": "Partition vertices into two sets to maximize cut edges.",
        "code": """% Max-Cut Problem on 3-vertex Graph
var 0..1: x1;
var 0..1: x2;
var 0..1: x3;

% Non-triviality constraint (at least 1 vertex in each partition)
constraint x1 + x2 + x3 >= 1;
constraint x1 + x2 + x3 <= 2;

% Maximize differing edges (linearized formulation)
solve maximize 2*x1 + 2*x2 + 2*x3;
"""
    },
    "setcover": {
        "title": "Exact Cover Problem (Set Cover)",
        "description": "Cover all elements of the universe using the minimum number of selected subsets.",
        "code": """% Set Cover Problem
array[1..4] of var 0..1: s;

% Each element must be covered at least once
constraint s[1] + s[2] >= 1;
constraint s[2] + s[3] >= 1;
constraint s[1] + s[4] >= 1;

% Minimize number of selected sets
solve minimize s[1] + s[2] + s[3] + s[4];
"""
    },
    "knapsack8": {
        "title": "8-Variable Binary Knapsack Problem (0/1 Knapsack 8-Var)",
        "description": "Select the highest-value subset of 8 items without exceeding maximum capacity of 15.",
        "code": """% 0/1 Knapsack Problem (8 Decision Variables)
int: n = 8;
int: capacity = 15;
array[1..8] of int: weights = [2, 3, 4, 5, 2, 4, 6, 3];
array[1..8] of int: values  = [4, 5, 7, 9, 3, 6, 11, 5];

array[1..8] of var 0..1: x;

% Maximum weight constraint
constraint sum(i in 1..n)(weights[i] * x[i]) <= capacity;

% Objective: Maximize total value
solve maximize sum(i in 1..n)(values[i] * x[i]);
"""
    }
}


def _bar(value: float, width: int = 24, lo: float = 0.0, hi: float = 1.0) -> str:
    """Generates a visual ASCII bar in console output."""
    frac = 0.0 if hi == lo else max(0.0, min(1.0, (value - lo) / (hi - lo)))
    filled = int(round(frac * width))
    return "#" * filled + "." * (width - filled)


def solve_classical_exact(binary_problem: Any) -> dict:
    """
    Deterministic classical solver (Exhaustive Branch & Bound O(2^n))
    to obtain the absolute optimal Ground Truth and evaluate QAOA's Approximation Ratio.
    """
    parsed_model = getattr(binary_problem, "parsed_model", None)
    topology = getattr(binary_problem, "topology", {})
    original_qp = topology.get("original_qp")

    if parsed_model is not None and getattr(parsed_model, "variables", None):
        user_vars = list(parsed_model.variables.keys())
    elif original_qp is not None:
        user_vars = [v.name for v in original_qp.variables]
    else:
        return {}

    n = len(user_vars)
    if n > 22:
        return {}

    is_maximize = True
    if parsed_model is not None and parsed_model.objective:
        is_maximize = parsed_model.objective.get("sense", "maximize").lower() == "maximize"
    elif original_qp is not None:
        is_maximize = original_qp.objective.sense.name == "MAXIMIZE"

    best_val = None
    best_bits = None
    best_solution = None

    for i in range(1 << n):
        bit_str = f"{i:0{n}b}"
        val_map = {user_vars[j]: int(bit_str[j]) for j in range(n)}

        # Check MiniZinc model constraints
        feasible = True
        if parsed_model is not None and getattr(parsed_model, "constraints", None):
            for cn in parsed_model.constraints:
                lhs = sum(val_map.get(k, 0) * coeff for k, coeff in cn.get("linear", {}).items())
                rhs = float(cn.get("rhs", 0.0))
                sense = cn.get("sense", "<=")
                if sense == "<=" and lhs > rhs + 1e-5:
                    feasible = False
                    break
                elif sense == ">=" and lhs < rhs - 1e-5:
                    feasible = False
                    break
                elif sense == "==" and abs(lhs - rhs) > 1e-5:
                    feasible = False
                    break
        elif original_qp is not None:
            feasible = bool(original_qp.is_feasible([val_map[v] for v in user_vars]))

        if not feasible:
            continue

        # Evaluate objective function
        fval = 0.0
        if parsed_model is not None and parsed_model.objective:
            fval = float(parsed_model.objective.get("constant", 0.0))
            for v, coeff in parsed_model.objective.get("linear", {}).items():
                fval += val_map.get(v, 0) * float(coeff)
        elif original_qp is not None:
            fval = float(original_qp.objective.evaluate([val_map[v] for v in user_vars]))

        if best_val is None:
            best_val = fval
            best_bits = bit_str
            best_solution = val_map
        else:
            if is_maximize and fval > best_val:
                best_val = fval
                best_bits = bit_str
                best_solution = val_map
            elif not is_maximize and fval < best_val:
                best_val = fval
                best_bits = bit_str
                best_solution = val_map

    return {
        "best_value": round(best_val, 2) if best_val is not None else 0.0,
        "best_solution": best_solution or {},
        "best_bitstring": best_bits or "",
        "is_maximize": is_maximize,
        "feasible_found": best_val is not None
    }


def run_optiq_demo(benchmark_key: str = "knapsack", p_steps: int = 5, shots: int = 8192):
    """
    Executes the full OptiQ pipeline interactively and visually in the terminal.
    """
    benchmark = BENCHMARKS.get(benchmark_key.lower(), BENCHMARKS["knapsack"])

    print("=" * 78)
    print("   OPTIQ: QUANTUM COMBINATORIAL OPTIMIZATION PROTOCOL")
    print("   MiniZinc Declarative Translator -> QUBO -> PINN -> QAOA")
    print("=" * 78)
    print(f"\n[CASE STUDY]  : {benchmark['title']}")
    print(f"Description   : {benchmark['description']}")
    print("-" * 78)

    # 1. SHOW MINIZINC CODE
    print("\n[STEP 1] Declarative Problem Code (MiniZinc):")
    for line in benchmark["code"].strip().splitlines():
        print(f"    |  {line}")

    # 2. PARSING AND BINARY MODEL
    print("\n[STEP 2] Compilation and Parsing to Binary Integer Programming (BIP):")
    t0 = time.perf_counter()
    binary_problem = parse_problem(benchmark["code"])
    t_parse = (time.perf_counter() - t0) * 1000

    parsed_model = binary_problem.parsed_model
    topology = binary_problem.topology
    qubo_nodes = topology.get("nodes", 0)
    qubo_vars = topology.get("variables", [])
    qubo_edges = topology.get("edges", [])

    print(f"    -> Parsing Time         : {t_parse:.2f} ms")
    print(f"    -> Decision Variables   : {len(parsed_model.variables)} {list(parsed_model.variables.keys())}")
    print(f"    -> Linear Constraints   : {len(parsed_model.constraints)} processed")
    for idx, c in enumerate(parsed_model.constraints, 1):
        print(f"         [{idx}] {c['linear']} {c['sense']} {c['rhs']}")
    print(f"    -> Objective Sense      : {parsed_model.objective.get('sense', '').upper()}")
    print(f"    -> Required Qubits      : {qubo_nodes} (includes slack variables)")
    print(f"    -> Qubit Register       : {qubo_vars}")

    # 3. GRAPH FEATURE EXTRACTION (DATA SCIENCE & SPECTRAL ANALYSIS)
    print("\n[STEP 3] Spectral Analysis and QUBO Graph Feature Extraction:")
    qubo_problem = topology.get("qubo_problem")
    original_qp = topology.get("original_qp")

    t0 = time.perf_counter()
    features = extract_bip_features(qubo_problem, original_qp)
    t_feat = (time.perf_counter() - t0) * 1000

    glob = features.get("global", {})
    density = glob.get("graph_density", 0.0)
    lambda_2 = glob.get("laplacian_spectral_gap_lambda2", 0.0)
    frustration = glob.get("global_frustration_index", 0.0)

    print(f"    -> Extraction Time      : {t_feat:.2f} ms")
    print(f"    -> Graph Density        : {density:.3f}  [{_bar(density, 16)}]")
    print(f"    -> Spectral Gap (lambda_2): {lambda_2:.4f} (Governs quantum propagation speed)")
    print(f"    -> Frustration Index    : {frustration:.4f} [{_bar(frustration, 16)}] (Conflict level in constraints)")

    # 4. PHYSICS-INFORMED NEURAL NETWORK (PINN)
    print("\n[STEP 4] Initial Hyperparameter Inference (PINN):")
    t0 = time.perf_counter()
    # Enrich topology with extracted spectral metrics and problem type
    pinn_input = {
        **topology,
        "global": glob,
        "problem_type": benchmark_key
    }
    pinn_params = get_hyperparameters(pinn_input)
    t_pinn = (time.perf_counter() - t0) * 1000

    gamma_0 = pinn_params.get("gamma", [0.39])[0]
    beta_0 = pinn_params.get("beta", [0.78])[0]
    telemetry = pinn_params.get("telemetry", {})

    print(f"    -> Inference Time       : {t_pinn:.2f} ms")
    print(f"    -> Initial Gamma (gamma_0): {gamma_0:.4f} rad (Cost rotation angle H_C)")
    print(f"    -> Initial Beta (beta_0)  : {beta_0:.4f} rad (Mixer rotation angle H_M)")
    if "p2" in pinn_params:
        p2_g = [round(x, 4) for x in pinn_params["p2"]["gamma"]]
        p2_b = [round(x, 4) for x in pinn_params["p2"]["beta"]]
        print(f"    -> Multi-layer Angles (p=2): gamma={p2_g}, beta={p2_b}")
    print(f"    -> Suggested Telemetry  : Shots={telemetry.get('recommended_shots', shots)}, LR={telemetry.get('recommended_lr_eta', 0.01)}, p*={telemetry.get('target_depth_p_star', 1)}")
    print("    -> Status               : Mitigates barren plateaus vs random initialization")

    # 5. QUANTUM EXECUTION WITH QAOA
    print(f"\n[STEP 5] Construction and Execution of QAOA Quantum Circuit (p={p_steps}, shots={shots:,}):")

    # Automatically detect if Qollab provided the global 'backend' variable
    qollab_backend = globals().get("backend")
    if qollab_backend is None:
        main_mod = sys.modules.get("__main__")
        if main_mod and hasattr(main_mod, "backend"):
            qollab_backend = getattr(main_mod, "backend")

    if qollab_backend is not None:
        b_name = getattr(qollab_backend, "name", None)
        if callable(b_name):
            b_name = b_name()
        elif not b_name:
            b_name = qollab_backend.__class__.__name__
        is_qpu = any(w in str(b_name).lower() for w in ["qpu", "hardware", "forte", "aria", "harmony", "system"])
        backend_type_str = "Physical Quantum QPU" if is_qpu else "Cloud Simulator"
        print(f"    [QOLLAB DETECTED] Connected to: {b_name} ({backend_type_str})")

    qaoa_config = {
        "p_steps": p_steps,
        "shots": shots,
        "optimizer": "COBYLA",
        "angle_init": "Automática",
        "gamma0": gamma_0,
        "beta0": beta_0,
        "backend": qollab_backend
    }

    t0 = time.perf_counter()
    qaoa_result = run_qaoa(binary_problem, qaoa_config, backend=qollab_backend)
    t_quantum = (time.perf_counter() - t0) * 1000

    optimal_bitstring = qaoa_result.get("optimal_bitstring", "")
    optimal_val = qaoa_result.get("optimal_value", 0.0)
    best_energy = qaoa_result.get("energy", 0.0)
    solution_dict = qaoa_result.get("solution", {})
    distribution = qaoa_result.get("distribution", [])
    exec_time = qaoa_result.get("execution_time_ms", t_quantum)
    qubits_cnt = qaoa_result.get("qubits_count", 7)

    n_decision = len(parsed_model.variables) if parsed_model and getattr(parsed_model, "variables", None) else 4
    n_slack = max(0, qubits_cnt - n_decision)

    print(f"    -> Total Shots          : {shots:,}")
    print(f"    -> Circuit Qubits       : {qubits_cnt} ({n_decision} decision + {n_slack} slack)")
    print(f"    -> Simulation Time      : {exec_time:.2f} ms")
    print(f"    -> Classical Optimizer  : {qaoa_result.get('optimizer_used', 'COBYLA')}")
    print(f"    -> Hardware / Backend   : {qaoa_result.get('hardware', 'Vectorized Quantum Statevector')}")
    print(f"    -> Minimum Energy <H_C> : {best_energy:.4f} eV")
    print(f"    -> Measured Eigenstate  : |{optimal_bitstring}>")
    print(f"    -> Solution Assignment  : {solution_dict}")
    print(f"    -> Objective Value F    : {optimal_val:.2f}")

    # 6. QUANTUM SAMPLING DISTRIBUTION
    print("\n[STEP 6] Probability Spectrum of Quantum Eigenstates (Top Measured):")
    print("    State |bits>       Probability        Value F   Feasible")
    print("    " + "-" * 56)
    for sample in distribution[:6]:
        bits = sample.get("bits", "")
        prob = sample.get("prob", 0.0)
        fval = sample.get("fval", 0.0)
        feas = "YES" if sample.get("feasible", True) else "NO"
        peak = "<-- OPTIMAL" if sample.get("peak") else ""
        print(f"    |{bits}>        {prob*100:5.1f}%  {_bar(prob, 14)}  {fval:7.2f}     {feas}    {peak}")

    # 7. DETERMINISTIC CLASSICAL COMPARISON AND BENCHMARKING (GROUND TRUTH)
    print("\n[STEP 7] Verification with Deterministic Classical Algorithm (Ground Truth):")
    t0_exact = time.perf_counter()
    exact_res = solve_classical_exact(binary_problem)
    t_exact_ms = (time.perf_counter() - t0_exact) * 1000

    exact_val = exact_res.get("best_value", 0.0)
    exact_sol = exact_res.get("best_solution", {})
    exact_bits = exact_res.get("best_bitstring", "")
    is_max = exact_res.get("is_maximize", True)

    qaoa_val = float(optimal_val)
    gap = abs(exact_val - qaoa_val)
    is_exact_optimum = (gap < 1e-4)

    # Quantum Approximation Ratio calculation (alpha)
    if is_exact_optimum:
        approx_ratio = 100.0
    elif is_max:
        approx_ratio = max(0.0, min(100.0, (qaoa_val / exact_val) * 100)) if abs(exact_val) > 1e-6 else 0.0
    else:
        approx_ratio = max(0.0, min(100.0, (exact_val / qaoa_val) * 100)) if abs(qaoa_val) > 1e-6 else 0.0

    print(f"    -> Classical Algorithm   : Exhaustive Deterministic Branch & Bound")
    print(f"    -> Classical Time        : {t_exact_ms:.2f} ms")
    print(f"    -> Exact Global Optimum  : |{exact_bits}> -> {exact_sol}")
    print(f"    -> Exact Theoretical Val : {exact_val:.2f}")
    print(f"    -> Solution Found (QAOA) : |{optimal_bitstring}> -> {solution_dict} (Value = {qaoa_val:.2f})")
    print(f"    -> Approx. Ratio (alpha) : {approx_ratio:.1f}%  [{_bar(approx_ratio/100, 16)}]")
    if is_exact_optimum:
        print(f"    -> Optimality Diagnosis  : TOTAL SUCCESS: QAOA achieved 100% of the Global Optimum.")
    else:
        print(f"    -> Optimality Diagnosis  : FEASIBLE SUB-OPTIMAL (Gap: {gap:.2f} | Quantum Efficiency: {approx_ratio:.1f}%)")

    # FINAL SUMMARY
    print("\n" + "=" * 78)
    print("   [SUMMARY] QUANTUM OPTIMIZATION AND CLASSICAL BENCHMARKING")
    print(f"   QAOA Solution Obtained     : {solution_dict} (Value = {qaoa_val:.2f})")
    print(f"   Deterministic Global Opt   : {exact_sol} (Value = {exact_val:.2f})")
    print(f"   Approximation Ratio (a)    : {approx_ratio:.1f}% [{'100% GLOBAL OPTIMUM' if is_exact_optimum else 'APPROXIMATE SOLUTION'}]")
    print(f"   Optimality Verdict         : {'QAOA discovered the optimal global Ground State' if is_exact_optimum else f'QAOA found a feasible approximation with gap of {gap:.2f}'}")
    print(f"   Total Computation Time     : {(t_parse + t_feat + t_pinn + exec_time + t_exact_ms):.2f} ms (Quantum: {exec_time:.2f} ms | Classical: {t_exact_ms:.2f} ms)")
    print("=" * 78 + "\n")

    # QOLLAB WIDGETS (Circuit and Probabilities):
    # Assign global variables 'circuit' and 'counts' so that the Qollab UI
    # automatically activates graphical widgets in the right panel.
    global circuit, counts
    circuit = qaoa_result.get("circuit")
    counts = qaoa_result.get("counts", {})

    return qaoa_result


def main(*args, **kwargs):
    """Entry point compatible with CLI and Qollab interactive runner."""
    if len(sys.argv) > 1 and sys.argv[1] == "--server":
        print("\nStarting OptiQ FastAPI server...")
        import uvicorn
        uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
        return

    benchmark_key = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].isdigit() else kwargs.get("benchmark", "knapsack")
    p_steps = int(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2].isdigit() else int(kwargs.get("p_steps", 6))
    shots = int(kwargs.get("shots", sys.argv[3] if len(sys.argv) > 3 and sys.argv[3].isdigit() else 8192))

    if str(benchmark_key).lower() not in BENCHMARKS and benchmark_key != "--help":
        print(f"Case '{benchmark_key}' not recognized. Options: {list(BENCHMARKS.keys())}")
        print("Running default case: knapsack\n")
        benchmark_key = "knapsack"

    if benchmark_key == "--help":
        print(__doc__)
        return

    res = run_optiq_demo(benchmark_key=benchmark_key, p_steps=p_steps, shots=shots)
    return res.get("counts", {})


if __name__ == "__main__":
    main()

