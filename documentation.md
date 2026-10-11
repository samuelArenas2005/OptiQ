<p align="center">
  <img src="https://raw.githubusercontent.com/samuelArenas2005/OptiQ/main/docs/assets/logo.png" alt="OptiQ banner" width="320" />
</p>

# OptiQ: declarative quantum optimization

> **Try it now → [opti-q.vercel.app](https://opti-q.vercel.app/)** · **Source code → [github.com/samuelArenas2005/OptiQ](https://github.com/samuelArenas2005/OptiQ)**
> The full IDE runs in your browser: write a model, press **RUN**, and see the QAOA results, the probability histogram of measured states, and the best feasible solution selected directly from the quantum distribution.

**OptiQ** lets you describe an optimization problem the way you would on paper, in a **MiniZinc-style** language, and solves it with **QAOA** in Qiskit. No gates, no Hamiltonians by hand: OptiQ compiles your model to a **binary program**, then to a **QUBO / Ising Hamiltonian**, builds the quantum circuit, runs it, and checks the best answer.

There are two ways to use it:

| | Where | What you get |
|---|---|---|
| **Web IDE** | [opti-q.vercel.app](https://opti-q.vercel.app/) | Editor, parameter panel, solution, histogram, graph features and 3D view |
| **Qollab** | Press **Run** on this page | The same pipeline in the console via `main.py`, plus Qollab's Circuit and Probabilities widgets |
| **GitHub** | [samuelArenas2005/OptiQ](https://github.com/samuelArenas2005/OptiQ) | Full source: backend, React frontend, dataset and Docker deployment |

---

## Contents

1. [What it shows](#what-it-shows)
2. [Why it matters](#why-it-matters)
3. [Background: binary programming and MiniZinc](#background-binary-programming-and-minizinc)
4. [QAOA in a nutshell](#qaoa-in-a-nutshell)
5. [From a binary program to a QAOA circuit](#from-a-binary-program-to-a-qaoa-circuit)
6. [Tuning γ and β: classical optimizers and PINNs](#tuning-γ-and-β-classical-optimizers-and-pinns)
7. [Shots, probabilities and the answer](#shots-probabilities-and-the-answer)
8. [Run it on Qollab](#run-it-on-qollab)
9. [How it works](#how-it-works)
10. [Make it yours](#make-it-yours)
11. [Credits](#credits)

---

## What it shows

<p align="center">
  <img src="https://raw.githubusercontent.com/samuelArenas2005/OptiQ/main/docs/assets/demo.png" alt="OptiQ IDE overview" width="900" />
</p>

### The interface

The screen has two areas:

**Left (2/3): the MiniZinc editor**
- Up to 5 tabs of `.mzn` models.
- **Examples** menu with ready-made problems: Knapsack, Set Cover, Max-Cut, Vertex Cover and Bipartite Matching.

**Right (1/3): run and telemetry panel**
- **RUN** solves the model. **RUN & VISUALIZE** solves it and opens the 3D view.
- A status bar shows the shots and whether the run succeeded.
- Four tabs:

| Tab | What you see |
|---|---|
| **Parámetros** | QAOA settings: layers `p`, shots (1,024 to 8,192), classical optimizer, angle initialization (Automatic / Heuristic / Manual with γ₀, β₀) and backend |
| **Solución** | Optimal value, chosen bitstring, value of each variable, and the **state distribution histogram**, with feasible states and the optimum highlighted |
| **Consola** | Graph features in sub-tabs (**Global**, **Nodes**, **Edges**) plus the solver **Logs** |
| **3D** | Interactive Three.js graph: qubits are nodes, QUBO couplings are edges |

<!-- TODO screenshots (save in docs/assets/ and push):
![Editor and examples](https://raw.githubusercontent.com/samuelArenas2005/OptiQ/main/docs/assets/ui_editor.png)
![Parameters tab](https://raw.githubusercontent.com/samuelArenas2005/OptiQ/main/docs/assets/ui_params.png)
![Solution tab with histogram](https://raw.githubusercontent.com/samuelArenas2005/OptiQ/main/docs/assets/ui_solution.png)
![Console: graph features](https://raw.githubusercontent.com/samuelArenas2005/OptiQ/main/docs/assets/ui_console.png)
![3D view](https://raw.githubusercontent.com/samuelArenas2005/OptiQ/main/docs/assets/ui_3d.png)
-->

### A run, end to end

Take the default **0/1 Knapsack**: 4 items, weights `[2, 3, 4, 5]`, values `[3, 4, 5, 8]`, capacity 7.

1. OptiQ adds **3 slack qubits** for the `<= 7` constraint, so the circuit has **7 qubits** (4 items + 3 slack).
2. QAOA runs and measures a distribution of bitstrings across the shots.
3. OptiQ decodes the measured states, filters out infeasible configurations, and selects the best candidate among the feasible states: `x = [1, 0, 0, 1]` with value **11**.
4. *(Optional in console)*: In `main.py`, a classical exact check (exhaustive search) runs alongside as a benchmark to verify that 11 matches the theoretical global optimum and compute the approximation ratio. The Web IDE itself does not run classical brute force; it relies purely on quantum sampling.

<!-- TODO: table with real results for the 4 benchmarks (qubits, true optimum, QAOA value, ratio, time) -->

---

## Why it matters

Combinatorial optimization (routing, scheduling, portfolio selection, network design) is one of the most promising uses of near-term quantum computers. Today, using QAOA still means writing Hamiltonians and penalty terms by hand. OptiQ removes that barrier:

- **Declarative in, quantum out.** You write constraints and an objective. OptiQ handles slack variables, penalties and the Ising mapping.
- **Insight into the problem.** Spectral and topological features (λ₂, λ_max, frustration, `h_i`, `J_ij`) show how hard the landscape is for QAOA.
- **A path to smarter QAOA.** The same features feed a dataset of about 10,000 solved instances, built to train a model that predicts good starting angles (see [Tuning γ and β](#tuning-γ-and-β-classical-optimizers-and-pinns)).

---

## Background: binary programming and MiniZinc

### Binary programming in one paragraph

A **Binary Integer Program (BIP)** is an optimization problem whose decision variables can only be 0 or 1 ("take the item or not", "use the edge or not"). You maximize or minimize a linear objective subject to linear constraints. Many classic NP-hard problems (Knapsack, Set Cover, Vertex Cover, Max-Cut) fit this form.

- [Integer programming (Wikipedia)](https://en.wikipedia.org/wiki/Integer_programming)
- [QUBO, the unconstrained quadratic form QAOA needs (Wikipedia)](https://en.wikipedia.org/wiki/Quadratic_unconstrained_binary_optimization)
- [Glover et al., *A Tutorial on Formulating and Using QUBO Models* (arXiv:1811.11538)](https://arxiv.org/abs/1811.11538)

### MiniZinc

[**MiniZinc**](https://www.minizinc.org/) is a free, open-source **constraint modelling language**. You state *what* a solution must satisfy, not *how* to find it, and a solver does the rest. OptiQ supports the subset needed for binary programs and uses a quantum solver behind it.

The four building blocks:

```minizinc
int: capacity = 7;                                % parameter (fixed data)
array[1..4] of int: weights = [2, 3, 4, 5];       % parameter array
array[1..4] of var 0..1: x;                       % binary decision variables

constraint sum(i in 1..4)(weights[i] * x[i]) <= capacity;   % constraint
solve maximize sum(i in 1..4)(values[i] * x[i]);            % objective
```

| Construct | Meaning |
|---|---|
| `int: n = 4;` | A constant |
| `array[1..n] of var 0..1: x;` / `var 0..1: y;` | Binary decision variables |
| `constraint ... <= / >= / = ...;` | Linear constraints, with `sum(i in 1..n)(...)` |
| `solve maximize ...;` / `solve minimize ...;` | The objective |

Learn more: [MiniZinc Handbook](https://docs.minizinc.dev/en/stable/) · [Basic modelling tutorial](https://docs.minizinc.dev/en/stable/modelling.html)

**In the code:** [`backend/parser/minizinc_parser.py`](https://github.com/samuelArenas2005/OptiQ/blob/main/backend/parser/minizinc_parser.py) reads the model into variables, linear constraints and an objective.

---

## QAOA in a nutshell

The **Quantum Approximate Optimization Algorithm** ([Farhi, Goldstone & Gutmann, 2014](https://arxiv.org/abs/1411.4028)) is a hybrid quantum-classical algorithm for problems written as a cost Hamiltonian `H_C`, whose lowest-energy state encodes the best solution.

The circuit:

1. **Start** in an equal superposition of every bitstring (a Hadamard on each qubit).
2. **Repeat `p` layers.** Each layer applies:
   - the **cost layer** `exp(-i γₖ H_C)`, which marks good solutions with a phase;
   - the **mixer layer** `exp(-i βₖ Σ Xᵢ)`, which makes those phases interfere.
3. **Measure.** Good solutions should now come out with high probability.

Each layer `k` has its own pair of angles, so a depth-`p` circuit has **2p parameters**: `γ = (γ₁ … γₚ)` and `β = (β₁ … βₚ)`. A classical optimizer adjusts them to minimize the energy `⟨H_C⟩`. More layers give a better approximation, at the cost of a deeper circuit and a harder optimization.

References:
- [IBM Quantum tutorial: Quantum Approximate Optimization Algorithm](https://quantum.cloud.ibm.com/docs/en/tutorials/quantum-approximate-optimization-algorithm)
- [IBM Quantum tutorial: Advanced techniques for QAOA](https://quantum.cloud.ibm.com/docs/en/tutorials/advanced-techniques-for-qaoa)
- [Qiskit Algorithms: QAOA tutorial](https://qiskit-community.github.io/qiskit-algorithms/tutorials/05_qaoa.html)

**In the code:** `build_qaoa_circuit` in [`backend/quantum/qaoa_solver.py`](https://github.com/samuelArenas2005/OptiQ/blob/main/backend/quantum/qaoa_solver.py) builds the ansatz: `H` gates, then per layer `Rz`/`Rzz` for the cost terms and `Rx(2β)` for the mixer.

---

## From a binary program to a QAOA circuit

QAOA can't take constraints directly. It needs a single energy function. OptiQ gets there in four steps:

```
MiniZinc model ──► BIP ──► QUBO ──► Ising Hamiltonian ──► QAOA circuit
```

| Step | What happens | File |
|---|---|---|
| **1. Parse** | MiniZinc → binary variables, linear constraints, objective | [`minizinc_parser.py`](https://github.com/samuelArenas2005/OptiQ/blob/main/backend/parser/minizinc_parser.py) |
| **2. BIP** | Build a Qiskit `QuadraticProgram` | [`problem_parser.py`](https://github.com/samuelArenas2005/OptiQ/blob/main/backend/parser/problem_parser.py) |
| **3. QUBO** | Remove constraints (details below) | [`problem_parser.py`](https://github.com/samuelArenas2005/OptiQ/blob/main/backend/parser/problem_parser.py) |
| **4. Ising** | Map to Pauli Z operators | [`qaoa_solver.py`](https://github.com/samuelArenas2005/OptiQ/blob/main/backend/quantum/qaoa_solver.py) |

**Step 3, removing the constraints.** Qiskit's `QuadraticProgramToQubo` does three things:
- **Inequalities become equalities** by adding binary **slack variables**, which become extra qubits. For example, `Σ wᵢxᵢ ≤ 7` becomes `Σ wᵢxᵢ + s = 7`, with `s` written in binary.
- **Equalities become penalties.** Each one turns into a quadratic term `P · (Σ aᵢxᵢ − b)²` that adds energy whenever the constraint is broken.
- **Maximize becomes minimize** by flipping the sign.

**Step 4, the Ising map.** Substituting `xᵢ = (1 − Zᵢ)/2` gives `H_C = Σ hᵢ Zᵢ + Σ Jᵢⱼ ZᵢZⱼ + const`. This is exactly what the cost layer of QAOA applies.

**Graph features.** The QUBO is also a weighted graph: each qubit is a node and each `Jᵢⱼ ≠ 0` is an edge. [`backend/quantum/feature_extractor.py`](https://github.com/samuelArenas2005/OptiQ/blob/main/backend/quantum/feature_extractor.py) computes:
- density;
- the Laplacian **spectral gap λ₂** (how well connected the graph is);
- the **spectral radius λ_max**;
- a **frustration index** (how much the couplings conflict);
- per-node and per-edge features.

More: [Qiskit Optimization: converters for quadratic programs](https://qiskit-community.github.io/qiskit-optimization/tutorials/02_converters_for_quadratic_programs.html) · [Lucas, *Ising formulations of many NP problems* (arXiv:1302.5843)](https://arxiv.org/abs/1302.5843)

---

## Tuning γ and β: classical optimizers and PINNs

QAOA is only as good as its angles. OptiQ splits the job into two parts:

**1. Where to start: initial angles γ₀, β₀**
- **Manual:** you set γ₀ and β₀.
- **Heuristic:** γ grows and β shrinks across the layers, a schedule inspired by adiabatic evolution.
- **Automatic (PINN):** a **Physics-Informed Neural Network** ([Raissi et al., 2019](https://arxiv.org/abs/1711.10561)) predicts the starting angles from the problem's graph features, which helps avoid flat regions (*barren plateaus*) that random starts often hit.

**2. How to refine them: a classical optimizer**
- The optimizer minimizes `⟨H_C⟩`, evaluated exactly with Qiskit's `Statevector`.
- Available methods (SciPy): **COBYLA** (default, gradient-free), **Nelder-Mead** and **SLSQP**.

> [!NOTE]
> **Status of the PINN.** [`backend/ml/pinn_model.py`](https://github.com/samuelArenas2005/OptiQ/blob/main/backend/ml/pinn_model.py) is the integration point and currently returns fixed seed angles. The training data is ready: [`backend/dataset/qaoa_pignn_dataset.csv`](https://github.com/samuelArenas2005/OptiQ/blob/main/backend/dataset/qaoa_pignn_dataset.csv) holds **10,000 solved instances** (Knapsack and other problems), generated by [`generate_dataset.ipynb`](https://github.com/samuelArenas2005/OptiQ/blob/main/backend/dataset/generate_dataset.ipynb).
> - **Inputs:** graph features such as λ₂, λ_max, frustration and `h`/`J` statistics.
> - **Targets:** the best depth `p*`, approximation ratios, optimal γ/β for `p = 1, 2`, and recommended learning rate and shots.
>
> Training the model on it is the next step. Until then, COBYLA does the tuning.

**In the code:** the angle schedules and the `scipy.optimize.minimize` loop live in `run_qaoa` in [`qaoa_solver.py`](https://github.com/samuelArenas2005/OptiQ/blob/main/backend/quantum/qaoa_solver.py).

---

## Shots, probabilities and the answer

A quantum circuit doesn't return one answer. Each run ("shot") collapses to one bitstring at random, following the probabilities QAOA built.

- **More shots, sharper histogram.** With 8,192 shots, the frequency of each bitstring closely matches its true probability. With few shots, rare states can be missed.
- **The tallest bar is the most likely state, not always the optimum.** QAOA with a small `p` spreads probability over several good states. Slack qubits can also scatter it.
- **How OptiQ picks the answer (no classical brute force in the IDE):**
  1. **Ignore slack qubits.** Sum the marginal probabilities of all measured bitstrings that share the same physical decision variables.
  2. **Filter feasible quantum samples.** Check each sampled state against the original model constraints to identify which ones are valid.
  3. **Pick the best candidate among feasible states.** From the top sampled feasible configurations, OptiQ selects the one that maximizes (or minimizes) the objective value. This candidate is highlighted with the **Óptimo** badge in the histogram.
  4. **Classical verification only for benchmarking.** In the terminal runner (`main.py`), a classical exhaustive solver is run exclusively to calculate the approximation ratio and evaluate QAOA's performance against ground truth. The Web IDE operates purely on the quantum sampling results.
- **Configure it well and it lands on the optimum.** With adequate layers ($p$), guided angle initialization, and sufficient shots, the true ground state appears among the top measured states with high probability.

**In the code:** sampling, slack marginalization, feasibility checks and solution selection are in `run_qaoa` ([`qaoa_solver.py`](https://github.com/samuelArenas2005/OptiQ/blob/main/backend/quantum/qaoa_solver.py)). The exact check is `solve_classical_exact` in [`main.py`](https://github.com/samuelArenas2005/OptiQ/blob/main/main.py).

---

## Run it on Qollab

1. Press **Run** in the Qollab toolbar and pick the **Built-in simulator** or the **IonQ simulator**.
2. `main.py` solves the **4-item Knapsack** and prints 7 steps:
   1. model
   2. BIP compilation
   3. graph features
   4. initial angles
   5. QAOA execution
   6. measured distribution
   7. exact classical check
3. To change the problem or the settings, edit the last line of `main.py`:
   ```python
   main(benchmark="maxcut", p_steps=2, shots=4096)   # knapsack | knapsack8 | maxcut | setcover
   ```
4. When it finishes, Qollab's **Circuit** and **Probabilities** widgets show the QAOA circuit and the measured counts.

> [!TIP]
> The angle optimization runs locally on an exact statevector. Only the final, optimized circuit is sent to the backend, so **each run uses a single job**, which is what IonQ backends on Qollab require.

---

## How it works

```
main.py                              Qollab entry point: full pipeline + console report
backend/parser/minizinc_parser.py    MiniZinc subset -> variables, constraints, objective
backend/parser/problem_parser.py     BIP -> QuadraticProgram -> QUBO (slack + penalties)
backend/quantum/feature_extractor.py Laplacian spectrum, frustration, h_i / J_ij features
backend/quantum/qaoa_solver.py       QAOA circuit, angle optimization, backend run, decoding
backend/ml/pinn_model.py             initial angles (gamma_0, beta_0)
backend/dataset/                     dataset notebook + qaoa_pignn_dataset.csv (10k instances)
backend/api/router.py                POST /api/solve, used by the web IDE
frontend/                            React + Vite + Three.js IDE (opti-q.vercel.app)
requirements.txt                     qiskit, qiskit-optimization, numpy, scipy
```

<!-- TODO: Qollab runtime notes (backend global, circuit/counts widgets, web IDE hosting) -->

---

## Make it yours

1. **Add a problem.** Add an entry to `BENCHMARKS` in `main.py` with MiniZinc code using `var 0..1` variables, or paste it into the [web IDE](https://opti-q.vercel.app/).
2. **Add a graph feature.** Extend `extract_bip_features` in `backend/quantum/feature_extractor.py`.
3. **Plug in your own angle predictor.** Replace `get_hyperparameters` in `backend/ml/pinn_model.py` with a model trained on `qaoa_pignn_dataset.csv`.

---

## Credits

OptiQ is by [Ckancord33](https://github.com/Ckancord33), [samuelArenas2005](https://github.com/samuelArenas2005), [theClowner](https://github.com/theClowner) and [Danicol12](https://github.com/Danicol12), released under the MIT License (see `LICENSE`).

- Live app: [opti-q.vercel.app](https://opti-q.vercel.app/)
- Source: [github.com/samuelArenas2005/OptiQ](https://github.com/samuelArenas2005/OptiQ)

<!-- TODO: demo video link -->
<!-- TODO: "What existed before the build window" disclosure (required by the rules) -->
