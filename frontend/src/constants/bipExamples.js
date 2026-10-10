// 5 Ejemplos canónicos de Programación Entera Binaria (BIP) en MiniZinc
// Formulaciones puramente binarias compatibles con QUBO y QAOA

export const BIP_EXAMPLES = [
  {
    id: 'knapsack',
    name: 'knapsack_01.mzn',
    title: '1. Mochila Binaria (0/1 Knapsack)',
    description: 'Maximizar el beneficio de selección binaria bajo restricción de capacidad.',
    code: `% 1. Problema de la Mochila Binaria (0/1 Knapsack)
% Decisión binaria: x[i] = 1 si se incluye el elemento i, 0 en caso contrario.

int: n = 4;
int: capacity = 7;
array[1..4] of int: weights = [2, 3, 4, 5];
array[1..4] of int: profits = [3, 4, 5, 8];

array[1..4] of var 0..1: x;

% Restricción de capacidad total
constraint sum(i in 1..n)(weights[i] * x[i]) <= capacity;

% Maximizar el valor de los elementos seleccionados
solve maximize sum(i in 1..n)(profits[i] * x[i]);
`
  },
  {
    id: 'vertex_cover',
    name: 'vertex_cover.mzn',
    title: '2. Cobertura de Vértices (Vertex Cover)',
    description: 'Seleccionar el subconjunto mínimo de vértices que cubra todas las aristas.',
    code: `% 2. Cobertura Mínima de Vértices en Grafo
% x[i] = 1 si el vértice i pertenece a la cobertura.

int: n = 5;
array[1..5] of var 0..1: x;

% Aristas del grafo: (1,2), (1,3), (2,4), (3,4), (4,5)
% Cada arista debe ser cubierta por al menos un vértice extremo
constraint x[1] + x[2] >= 1;
constraint x[1] + x[3] >= 1;
constraint x[2] + x[4] >= 1;
constraint x[3] + x[4] >= 1;
constraint x[4] + x[5] >= 1;

% Minimizar el número total de vértices elegidos
solve minimize sum(i in 1..n)(x[i]);
`
  },
  {
    id: 'max_independent_set',
    name: 'max_independent_set.mzn',
    title: '3. Conjunto Independiente Máximo (Max-IS)',
    description: 'Maximizar la cantidad de vértices seleccionados sin aristas adyacentes.',
    code: `% 3. Conjunto Independiente Máximo en Grafo
% x[i] = 1 si el nodo i es seleccionado. Dos nodos conectados no pueden coexistir.

int: n = 5;
array[1..5] of var 0..1: x;

% Aristas que prohíben la selección simultánea de vértices adyacentes
constraint x[1] + x[2] <= 1;
constraint x[2] + x[3] <= 1;
constraint x[3] + x[4] <= 1;
constraint x[4] + x[5] <= 1;
constraint x[1] + x[5] <= 1;

% Maximizar la cardinalidad del conjunto independiente
solve maximize sum(i in 1..n)(x[i]);
`
  },
  {
    id: 'number_partition',
    name: 'number_partition.mzn',
    title: '4. Partición Equitativa de Números',
    description: 'Dividir un conjunto de números en dos subconjuntos de suma idéntica.',
    code: `% 4. Partición de Números (Subset Sum / Number Partitioning)
% x[i] = 1 si el elemento pertenece al subconjunto A, 0 si pertenece a B.

int: n = 4;
int: half_sum = 10;
array[1..4] of int: values = [3, 5, 7, 5];

array[1..4] of var 0..1: x;

% La suma de los elementos asignados debe coincidir con la mitad exacta del total
constraint sum(i in 1..n)(values[i] * x[i]) == half_sum;

solve satisfy;
`
  },
  {
    id: 'binary_assignment',
    name: 'binary_assignment.mzn',
    title: '5. Asignación Binaria de Recursos (Set Packing)',
    description: 'Asignar recursos binarios maximizando la utilidad bajo restricciones.',
    code: `% 5. Asignación Binaria Óptima de Tareas / Recursos
% assign[i] = 1 si la tarea i es ejecutada.

int: n = 4;
array[1..4] of var 0..1: assign;

% Restricción de presupuesto / recursos disponibles
constraint 2*assign[1] + 3*assign[2] + 4*assign[3] + 2*assign[4] <= 6;

% Incompatibilidad: tarea 1 y tarea 3 son mutuamente excluyentes
constraint assign[1] + assign[3] <= 1;

% Maximizar la utilidad total del plan de asignación
solve maximize 5*assign[1] + 6*assign[2] + 8*assign[3] + 4*assign[4];
`
  }
];
