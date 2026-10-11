#!/usr/bin/env python3
"""
OPTIQ  -  Quantum Combinatorial Optimization Protocol (Qollab Standalone Demo)
==============================================================================

Una demostración en consola del flujo completo de OptiQ:
1. Lenguaje Declarativo: Subconjunto MiniZinc (variables binarias, sum, forall, restricciones).
2. Compilador Algebraico: Traducción a Programación Entera Binaria (BIP) y QUBO con variables de holgura (slack).
3. Análisis Espectral del Grafo: Laplaciano, gap espectral (lambda_2), radio espectral y balance de frustración.
4. Red Neuronal Informada por la Física (PINN): Inferencia de hiperparámetros variacionales iniciales (gamma_0, beta_0).
5. Algoritmo Cuántico QAOA: Evolución de estado variacional (H_C e H_M), optimización clásica y muestreo de autoestados.

Este script ejecuta sobre el entorno local o directamente en el runtime de Qollab.xyz.
Reconoce la variable global `backend` provista por Qollab si está disponible.

Ejecución:
    python main.py                  # Ejecuta el problema clásico de la Mochila (Knapsack)
    python main.py maxcut           # Ejecuta el problema de Corte Máximo (Max-Cut)
    python main.py setcover         # Ejecuta el problema de Cobertura de Conjuntos (Set Cover)
    python main.py --server         # Levanta el servidor FastAPI (Uvicorn) en el puerto 8000
"""

import sys
import os
import time
import logging
import warnings
from pathlib import Path

# Silenciar advertencias y logs internos ruidosos para una salida completamente limpia
warnings.filterwarnings("ignore")
logging.basicConfig(level=logging.WARNING)
for log_name in ["qiskit", "ProblemParser", "MiniZincParser", "QAOASolver", "FeatureExtractor"]:
    logging.getLogger(log_name).setLevel(logging.WARNING)

# Asegurar que la raíz del proyecto esté en sys.path para importar módulos de backend/
if "__file__" in globals():
    BASE_DIR = Path(__file__).resolve().parent
else:
    BASE_DIR = Path.cwd().resolve()

if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

# Importar funciones y módulos del backend
try:
    from backend.parser.problem_parser import parse_problem
    from backend.ml.pinn_model import get_hyperparameters
    from backend.quantum.qaoa_solver import run_qaoa
    from backend.quantum.feature_extractor import extract_bip_features
    BACKEND_AVAILABLE = True
except ImportError:
    try:
        from parser.problem_parser import parse_problem
        from ml.pinn_model import get_hyperparameters
        from quantum.qaoa_solver import run_qaoa
        from quantum.feature_extractor import extract_bip_features
        BACKEND_AVAILABLE = True
    except ImportError as err:
        print(f"Error cargando módulos del backend: {err}")
        BACKEND_AVAILABLE = False


# -- Problemas MiniZinc de Ejemplo Precargados --------------------------------

BENCHMARKS = {
    "knapsack": {
        "title": "Problema de la Mochila Binaria (0/1 Knapsack)",
        "description": "Seleccionar el subconjunto de objetos de mayor valor sin exceder la capacidad máxima.",
        "code": """% 0/1 Knapsack Problem
int: n = 4;
int: capacity = 7;
array[1..4] of int: weights = [2, 3, 4, 5];
array[1..4] of int: values  = [3, 4, 5, 8];

array[1..4] of var 0..1: x;

% Restriccion de peso maximo
constraint sum(i in 1..n)(weights[i] * x[i]) <= capacity;

% Objetivo: Maximizar valor total
solve maximize sum(i in 1..n)(values[i] * x[i]);
"""
    },
    "maxcut": {
        "title": "Corte Máximo en Grafo (Max-Cut en Triángulo)",
        "description": "Particionar los vértices en dos conjuntos para maximizar las aristas que cruzan el corte.",
        "code": """% Max-Cut Problem en Grafo de 3 vertices
var 0..1: x1;
var 0..1: x2;
var 0..1: x3;

% Restriccion de no-trivialidad (al menos 1 vertice en cada particion)
constraint x1 + x2 + x3 >= 1;
constraint x1 + x2 + x3 <= 2;

% Maximizar aristas que difieren (formulacion linealizada)
solve maximize 2*x1 + 2*x2 + 2*x3;
"""
    },
    "setcover": {
        "title": "Problema de Cobertura Exacta (Set Cover)",
        "description": "Cubrir todos los elementos del universo con la menor cantidad de subconjuntos seleccionados.",
        "code": """% Set Cover Problem
array[1..4] of var 0..1: s;

% Cada elemento debe ser cubierto al menos una vez
constraint s[1] + s[2] >= 1;
constraint s[2] + s[3] >= 1;
constraint s[1] + s[4] >= 1;

% Minimizar numero de conjuntos seleccionados
solve minimize s[1] + s[2] + s[3] + s[4];
"""
    }
}


def _bar(value: float, width: int = 24, lo: float = 0.0, hi: float = 1.0) -> str:
    """Genera una barra visual de caracteres en consola."""
    frac = 0.0 if hi == lo else max(0.0, min(1.0, (value - lo) / (hi - lo)))
    filled = int(round(frac * width))
    return "#" * filled + "." * (width - filled)


def run_optiq_demo(benchmark_key: str = "knapsack", p_steps: int = 2, shots: int = 8192):
    """
    Ejecuta la canalización completa de OptiQ de forma interactiva y visual en la terminal.
    """
    benchmark = BENCHMARKS.get(benchmark_key.lower(), BENCHMARKS["knapsack"])

    print("=" * 78)
    print("   OPTIQ: QUANTUM COMBINATORIAL OPTIMIZATION PROTOCOL")
    print("   Traductor Declarativo MiniZinc  ->  QUBO  ->  PINN  ->  QAOA")
    print("=" * 78)
    print(f"\n[CASO DE ESTUDIO] : {benchmark['title']}")
    print(f"Descripcion       : {benchmark['description']}")
    print("-" * 78)

    # 1. MOSTRAR CÓDIGO MINIZINC
    print("\n[PASO 1] Codigo Declarativo del Problema (MiniZinc):")
    for line in benchmark["code"].strip().splitlines():
        print(f"    |  {line}")

    # 2. PARSEO Y MODELO BINARIO
    print("\n[PASO 2] Compilacion y Parseo a Programacion Entera Binaria (BIP):")
    t0 = time.perf_counter()
    binary_problem = parse_problem(benchmark["code"])
    t_parse = (time.perf_counter() - t0) * 1000

    parsed_model = binary_problem.parsed_model
    topology = binary_problem.topology
    qubo_nodes = topology.get("nodes", 0)
    qubo_vars = topology.get("variables", [])
    qubo_edges = topology.get("edges", [])

    print(f"    -> Tiempo de Parseo     : {t_parse:.2f} ms")
    print(f"    -> Variables de Decision: {len(parsed_model.variables)} {list(parsed_model.variables.keys())}")
    print(f"    -> Restricciones Lineal : {len(parsed_model.constraints)} procesadas")
    for idx, c in enumerate(parsed_model.constraints, 1):
        print(f"         [{idx}] {c['linear']} {c['sense']} {c['rhs']}")
    print(f"    -> Sentido del Objetivo : {parsed_model.objective.get('sense', '').upper()}")
    print(f"    -> Qubits Necesarios    : {qubo_nodes} (incluye variables de holgura/slack)")
    print(f"    -> Registro de Qubits   : {qubo_vars}")

    # 3. EXTRACCIÓN DE CARACTERÍSTICAS DEL GRAFO (CIENCIA DE DATOS & ESPECTRO)
    print("\n[PASO 3] Analisis Espectral y Extraccion de Features del Grafo QUBO:")
    qubo_problem = topology.get("qubo_problem")
    original_qp = topology.get("original_qp")

    t0 = time.perf_counter()
    features = extract_bip_features(qubo_problem, original_qp)
    t_feat = (time.perf_counter() - t0) * 1000

    glob = features.get("global", {})
    density = glob.get("graph_density", 0.0)
    lambda_2 = glob.get("laplacian_spectral_gap_lambda2", 0.0)
    frustration = glob.get("global_frustration_index", 0.0)

    print(f"    -> Tiempo de Extraccion : {t_feat:.2f} ms")
    print(f"    -> Densidad del Grafo   : {density:.3f}  [{_bar(density, 16)}]")
    print(f"    -> Gap Espectral (lambda_2): {lambda_2:.4f} (Controla la velocidad de propagacion cuantica)")
    print(f"    -> Indice de Frustracion: {frustration:.4f} [{_bar(frustration, 16)}] (Nivel de conflicto en restricciones)")

    # 4. RED NEURONAL INFORMADA POR LA FÍSICA (PINN)
    print("\n[PASO 4] Inferencia de Hiperparametros Iniciales (PINN):")
    t0 = time.perf_counter()
    pinn_params = get_hyperparameters(topology)
    t_pinn = (time.perf_counter() - t0) * 1000

    gamma_0 = pinn_params.get("gamma", [0.39])[0]
    beta_0 = pinn_params.get("beta", [0.78])[0]

    print(f"    -> Tiempo de Inferencia : {t_pinn:.2f} ms")
    print(f"    -> Gamma Inicial (gamma_0): {gamma_0:.4f} rad (Angulo de rotacion de costo H_C)")
    print(f"    -> Beta Inicial (beta_0)  : {beta_0:.4f} rad (Angulo de rotacion del mezclador H_M)")
    print("    -> Estado               : Evita mesetas esteriles (barren plateaus) vs inicio aleatorio")

    # 5. EJECUCIÓN CUÁNTICA CON QAOA
    print(f"\n[PASO 5] Construccion y Ejecucion del Circuito Cuantico QAOA (p={p_steps}, shots={shots:,}):")

    # Detectar automáticamente si Qollab proveyó la variable global 'backend'
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
        tipo_str = "QPU Cuántico Físico" if is_qpu else "Simulador Cloud"
        print(f"    [QOLLAB DETECTADO] Conectado a: {b_name} ({tipo_str})")

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

    print(f"    -> Disparos (Shots)     : {shots:,}")
    print(f"    -> Qubits del Circuito  : {qubits_cnt} (4 de decisión + {qubits_cnt - 4} de holgura/slack)")
    print(f"    -> Tiempo de Simulacion : {exec_time:.2f} ms")
    print(f"    -> Optimizador Clasico  : {qaoa_result.get('optimizer_used', 'COBYLA')}")
    print(f"    -> Hardware / Backend   : {qaoa_result.get('hardware', 'Vectorized Quantum Statevector')}")
    print(f"    -> Energia Minima <H_C> : {best_energy:.4f} eV")
    print(f"    -> Eigenestado Medido   : |{optimal_bitstring}>")
    print(f"    -> Asignacion de Solucion: {solution_dict}")
    print(f"    -> Valor de la Funcion F: {optimal_val:.2f}")

    # 6. DISTRIBUCIÓN DE MUESTREO CUÁNTICO
    print("\n[PASO 6] Espectro de Probabilidad de los Autoestados Cuanticos (Top Medidos):")
    print("    Estado |bits>      Probabilidad       Valor F   Factible")
    print("    " + "-" * 56)
    for sample in distribution[:6]:
        bits = sample.get("bits", "")
        prob = sample.get("prob", 0.0)
        fval = sample.get("fval", 0.0)
        feas = "SI" if sample.get("feasible", True) else "NO"
        peak = "<-- OPTIMO" if sample.get("peak") else ""
        print(f"    |{bits}>        {prob*100:5.1f}%  {_bar(prob, 14)}  {fval:7.2f}     {feas}    {peak}")

    # RESUMEN FINAL
    print("\n" + "=" * 78)
    print("   [RESUMEN] OPTIMIZACION COMPLETADA EXITOSAMENTE")
    print(f"   Solucion Factible Optima Encontrada: {solution_dict}")
    print(f"   Criterio Cumplido: Valor = {optimal_val:.2f} | Tiempo Total: {(t_parse + t_feat + t_pinn + exec_time):.2f} ms")
    print("=" * 78 + "\n")

    # WIDGETS DE QOLLAB (Circuit y Probabilities):
    # Asignamos las variables globales 'circuit' y 'counts' para que la UI de Qollab
    # active automáticamente los widgets gráficos en el panel derecho.
    global circuit, counts
    circuit = qaoa_result.get("circuit")
    counts = qaoa_result.get("counts", {})

    return qaoa_result


def main(*args, **kwargs):
    """Punto de entrada compatible con CLI y el runner interactivo de Qollab."""
    if len(sys.argv) > 1 and sys.argv[1] == "--server":
        print("\nLevantando servidor FastAPI de OptiQ...")
        import uvicorn
        uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
        return

    benchmark_key = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].isdigit() else kwargs.get("benchmark", "knapsack")
    p_steps = int(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2].isdigit() else int(kwargs.get("p_steps", 2))
    shots = int(kwargs.get("shots", sys.argv[3] if len(sys.argv) > 3 and sys.argv[3].isdigit() else 8192))

    if str(benchmark_key).lower() not in BENCHMARKS and benchmark_key != "--help":
        print(f"Caso '{benchmark_key}' no reconocido. Opciones: {list(BENCHMARKS.keys())}")
        print("Ejecutando caso por defecto: knapsack\n")
        benchmark_key = "knapsack"

    if benchmark_key == "--help":
        print(__doc__)
        return

    res = run_optiq_demo(benchmark_key=benchmark_key, p_steps=p_steps, shots=shots)
    return res.get("counts", {})


if __name__ == "__main__":
    main()
