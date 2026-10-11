/**
 * templates.js - Predefined MiniZinc models & snippets for OptiQ IDE
 */

export const TEMPLATES = {
  knapsack: {
    name: 'Knapsack Problem',
    filename: 'knapsack.mzn',
    description: '10 items, capacity 26, QUBO/Ising formulation',
    code: `% QAOA Knapsack Optimization (10 Qubits)
include "quantum_primitives.mzn";

int: n = 10;
int: capacity = 26;
array[1..n] of int: weights = [4, 2, 5, 4, 5, 1, 3, 5, 2, 6];
array[1..n] of int: values  = [10, 7, 12, 8, 14, 3, 9, 11, 6, 15];

var qreg[n]: x; % Binary decision variables

% Capacity constraint projected into Hamiltonian
constraint sum(i in 1..n)(weights[i] * x[i]) <= capacity;

% Objective function: Maximize accumulated value
solve maximize sum(i in 1..n)(values[i] * x[i]);

% Quantum circuit compilation
quantum_ansatz: QAOA(cost_hamiltonian, mixer=RX, depth=3);
`
  },
  maxcut: {
    name: 'Max-Cut (Graph)',
    filename: 'maxcut.mzn',
    description: 'Maximum cut partition on 8-node graph',
    code: `% QAOA Max-Cut on 8-node graph
include "quantum_primitives.mzn";

int: n = 8;
set of int: NODES = 1..n;
set of tuple(int, int): EDGES = {
  (1,2), (1,3), (2,4), (3,4), (3,5), (4,6), (5,7), (6,8), (7,8)
};

var qreg[n]: s; % Spin s[i] in {-1, +1} mapped to sigma_z

% Maximize edges crossing the cut: sum (1 - s[u]*s[v]) / 2
solve maximize sum((u,v) in EDGES)((1 - s[u] * s[v]) / 2);

quantum_ansatz: QAOA(cost_hamiltonian, mixer=RX, depth=3);
`
  },
  portfolio: {
    name: 'Portfolio Optimization',
    filename: 'portfolio.mzn',
    description: 'Markowitz asset selection with QUBO risk formulation',
    code: `% Markowitz Quantum Portfolio Optimization
include "quantum_primitives.mzn";

int: n = 6;
int: budget = 3; % Select exactly 3 assets
array[1..n] of float: returns = [0.12, 0.18, 0.09, 0.15, 0.22, 0.11];
float: risk_factor = 0.5;

var qreg[n]: w;

constraint sum(i in 1..n)(w[i]) == budget;

solve maximize sum(i in 1..n)(returns[i] * w[i]) - risk_factor * sum(i in 1..n, j in 1..n)(0.04 * w[i] * w[j]);

quantum_ansatz: QAOA(cost_hamiltonian, mixer=RX, depth=2);
`
  },
  qubo_direct: {
    name: 'Symmetric QUBO',
    filename: 'qubo_ising.mzn',
    description: 'Direct quadratic matrix Q_ij for annealing or QAOA',
    code: `% Direct QUBO Formulation (5 qubits)
include "quantum_primitives.mzn";

int: n = 5;
array[1..n, 1..n] of float: Q = [|
  -3.0,  2.0,  0.5,  0.0,  1.2 |
   2.0, -4.0,  1.8,  0.7,  0.0 |
   0.5,  1.8, -2.5,  2.1,  0.3 |
   0.0,  0.7,  2.1, -5.0,  1.5 |
   1.2,  0.0,  0.3,  1.5, -3.2 |];

var qreg[n]: x;

solve minimize sum(i in 1..n, j in 1..n)(Q[i,j] * x[i] * x[j]);

quantum_ansatz: QAOA(cost_hamiltonian, mixer=RX, depth=3);
`
  }
};

export const AUTOCOMPLETE_ITEMS = [
  { label: 'constraint', type: 'keyword', insert: 'constraint ', desc: 'Define a logical or arithmetic constraint' },
  { label: 'constraint sum(...) <= capacity;', type: 'snippet', insert: 'constraint sum(i in 1..n)(${1:weights}[i] * ${2:x}[i]) <= ${3:capacity};', desc: 'Linear sum constraint' },
  { label: 'solve maximize', type: 'keyword', insert: 'solve maximize ', desc: 'Maximize objective function' },
  { label: 'solve minimize', type: 'keyword', insert: 'solve minimize ', desc: 'Minimize objective function' },
  { label: 'solve satisfy;', type: 'keyword', insert: 'solve satisfy;\n', desc: 'Constraint satisfaction problem (CSP)' },
  { label: 'var qreg[n]: x;', type: 'snippet', insert: 'var qreg[${1:n}]: ${2:x};', desc: 'Quantum register in superposition' },
  { label: 'array[1..n] of var 0..1: x;', type: 'snippet', insert: 'array[1..${1:n}] of var 0..1: ${2:x};', desc: 'Binary variables vector' },
  { label: 'quantum_ansatz: QAOA(...)', type: 'snippet', insert: 'quantum_ansatz: QAOA(cost_hamiltonian, mixer=RX, depth=${1:3});', desc: 'QAOA ansatz with RX mixer' },
  { label: 'include "quantum_primitives.mzn";', type: 'snippet', insert: 'include "quantum_primitives.mzn";\n', desc: 'Import quantum primitives' },
  { label: 'int', type: 'type', insert: 'int: ', desc: 'Integer type' },
  { label: 'float', type: 'type', insert: 'float: ', desc: 'Floating-point type' },
  { label: 'bool', type: 'type', insert: 'bool: ', desc: 'Boolean type' },
  { label: 'array', type: 'type', insert: 'array[${1:1..n}] of ${2:int}: ', desc: 'Array declaration' },
  { label: 'sum', type: 'function', insert: 'sum(${1:i in 1..n})(${2:x[i]})', desc: 'Summation over collection' },
  { label: 'forall', type: 'function', insert: 'forall(${1:i in 1..n})(${2:expr})', desc: 'Universal quantifier' },
  { label: 'in', type: 'keyword', insert: 'in ', desc: 'Set membership' }
];
