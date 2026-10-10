/**
 * templates.js - Predefined MiniZinc models & snippets for OptiQ IDE
 */

export const TEMPLATES = {
  knapsack: {
    name: 'Mochila (Knapsack)',
    filename: 'knapsack.mzn',
    description: '10 items, capacidad 26, formulación QUBO/Ising',
    code: `% QAOA Knapsack Optimization (10 Qubits)
include "quantum_primitives.mzn";

int: n = 10;
int: capacity = 26;
array[1..n] of int: weights = [4, 2, 5, 4, 5, 1, 3, 5, 2, 6];
array[1..n] of int: values  = [10, 7, 12, 8, 14, 3, 9, 11, 6, 15];

var qreg[n]: x; % Variables de decisión binarias

% Restricción de capacidad proyectada en Hamiltoniano
constraint sum(i in 1..n)(weights[i] * x[i]) <= capacity;

% Función objetivo: Maximizar valor acumulado
solve maximize sum(i in 1..n)(values[i] * x[i]);

% Compilación de circuito cuántico
quantum_ansatz: QAOA(cost_hamiltonian, mixer=RX, depth=3);
`
  },
  maxcut: {
    name: 'Max-Cut (Grafo)',
    filename: 'maxcut.mzn',
    description: 'Partición de corte máximo en grafo de 8 nodos',
    code: `% QAOA Max-Cut en grafo de 8 nodos
include "quantum_primitives.mzn";

int: n = 8;
set of int: NODES = 1..n;
set of tuple(int, int): EDGES = {
  (1,2), (1,3), (2,4), (3,4), (3,5), (4,6), (5,7), (6,8), (7,8)
};

var qreg[n]: s; % Spin s[i] in {-1, +1} mapeado a sigma_z

% Maximizar aristas que cruzan el corte: sum (1 - s[u]*s[v]) / 2
solve maximize sum((u,v) in EDGES)((1 - s[u] * s[v]) / 2);

quantum_ansatz: QAOA(cost_hamiltonian, mixer=RX, depth=3);
`
  },
  portfolio: {
    name: 'Optimización de Cartera',
    filename: 'portfolio.mzn',
    description: 'Selección de activos Markowitz con riesgo QUBO',
    code: `% Optimización de Cartera Cuántica Markowitz
include "quantum_primitives.mzn";

int: n = 6;
int: budget = 3; % Seleccionar exactamente 3 activos
array[1..n] of float: returns = [0.12, 0.18, 0.09, 0.15, 0.22, 0.11];
float: risk_factor = 0.5;

var qreg[n]: w;

constraint sum(i in 1..n)(w[i]) == budget;

solve maximize sum(i in 1..n)(returns[i] * w[i]) - risk_factor * sum(i in 1..n, j in 1..n)(0.04 * w[i] * w[j]);

quantum_ansatz: QAOA(cost_hamiltonian, mixer=RX, depth=2);
`
  },
  qubo_direct: {
    name: 'QUBO Simétrico',
    filename: 'qubo_ising.mzn',
    description: 'Matriz cuadrática Q_ij directa para recocido o QAOA',
    code: `% Formulación QUBO directa (5 qubits)
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
  { label: 'constraint', type: 'keyword', insert: 'constraint ', desc: 'Define una restricción lógica o aritmética' },
  { label: 'constraint sum(...) <= capacity;', type: 'snippet', insert: 'constraint sum(i in 1..n)(${1:weights}[i] * ${2:x}[i]) <= ${3:capacity};', desc: 'Restricción de suma lineal' },
  { label: 'solve maximize', type: 'keyword', insert: 'solve maximize ', desc: 'Maximizar función objetivo' },
  { label: 'solve minimize', type: 'keyword', insert: 'solve minimize ', desc: 'Minimizar función objetivo' },
  { label: 'solve satisfy;', type: 'keyword', insert: 'solve satisfy;\n', desc: 'Problema de satisfacción de restricciones (CSP)' },
  { label: 'var qreg[n]: x;', type: 'snippet', insert: 'var qreg[${1:n}]: ${2:x};', desc: 'Registro cuántico de qubits en superposición' },
  { label: 'array[1..n] of var 0..1: x;', type: 'snippet', insert: 'array[1..${1:n}] of var 0..1: ${2:x};', desc: 'Vector de variables binarias' },
  { label: 'quantum_ansatz: QAOA(...)', type: 'snippet', insert: 'quantum_ansatz: QAOA(cost_hamiltonian, mixer=RX, depth=${1:3});', desc: 'Ansatz QAOA con mezclador RX' },
  { label: 'include "quantum_primitives.mzn";', type: 'snippet', insert: 'include "quantum_primitives.mzn";\n', desc: 'Importar primitivas cuánticas' },
  { label: 'int', type: 'type', insert: 'int: ', desc: 'Tipo entero' },
  { label: 'float', type: 'type', insert: 'float: ', desc: 'Tipo punto flotante' },
  { label: 'bool', type: 'type', insert: 'bool: ', desc: 'Tipo booleano' },
  { label: 'array', type: 'type', insert: 'array[${1:1..n}] of ${2:int}: ', desc: 'Declaración de array' },
  { label: 'sum', type: 'function', insert: 'sum(${1:i in 1..n})(${2:x[i]})', desc: 'Sumatoria sobre colección' },
  { label: 'forall', type: 'function', insert: 'forall(${1:i in 1..n})(${2:expr})', desc: 'Cuantificador universal' },
  { label: 'in', type: 'keyword', insert: 'in ', desc: 'Pertenencia a conjunto' }
];
