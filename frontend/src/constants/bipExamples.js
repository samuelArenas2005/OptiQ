// 5 Canonical Binary Integer Programming (BIP) examples in MiniZinc
// Purely binary formulations compatible with QUBO and QAOA

export const BIP_EXAMPLES = [
  {
    id: 'knapsack',
    name: 'knapsack_01.mzn',
    title: '1. Binary Knapsack (0/1 Knapsack)',
    description: 'Maximize selection profit under a capacity constraint using binary decisions.',
    code: `% 1. Binary Knapsack Problem (0/1 Knapsack)
% Binary decision: x[i] = 1 if item i is included, 0 otherwise.

int: n = 4;
int: capacity = 7;
array[1..4] of int: weights = [2, 3, 4, 5];
array[1..4] of int: profits = [3, 4, 5, 8];

array[1..4] of var 0..1: x;

% Total capacity constraint
constraint sum(i in 1..n)(weights[i] * x[i]) <= capacity;

% Maximize the value of selected items
solve maximize sum(i in 1..n)(profits[i] * x[i]);
`
  },
  {
    id: 'vertex_cover',
    name: 'vertex_cover.mzn',
    title: '2. Vertex Cover',
    description: 'Select the minimum subset of vertices that covers all edges.',
    code: `% 2. Minimum Vertex Cover on a Graph
% x[i] = 1 if vertex i belongs to the cover.

int: n = 5;
array[1..5] of var 0..1: x;

% Graph edges: (1,2), (1,3), (2,4), (3,4), (4,5)
% Each edge must be covered by at least one endpoint
constraint x[1] + x[2] >= 1;
constraint x[1] + x[3] >= 1;
constraint x[2] + x[4] >= 1;
constraint x[3] + x[4] >= 1;
constraint x[4] + x[5] >= 1;

% Minimize the total number of chosen vertices
solve minimize sum(i in 1..n)(x[i]);
`
  },
  {
    id: 'max_independent_set',
    name: 'max_independent_set.mzn',
    title: '3. Maximum Independent Set (Max-IS)',
    description: 'Maximize the number of selected vertices with no adjacent edges.',
    code: `% 3. Maximum Independent Set on a Graph
% x[i] = 1 if node i is selected. Two connected nodes cannot coexist.

int: n = 5;
array[1..5] of var 0..1: x;

% Edges that forbid simultaneous selection of adjacent vertices
constraint x[1] + x[2] <= 1;
constraint x[2] + x[3] <= 1;
constraint x[3] + x[4] <= 1;
constraint x[4] + x[5] <= 1;
constraint x[1] + x[5] <= 1;

% Maximize the cardinality of the independent set
solve maximize sum(i in 1..n)(x[i]);
`
  },
  {
    id: 'number_partition',
    name: 'number_partition.mzn',
    title: '4. Equal Number Partitioning',
    description: 'Divide a set of numbers into two subsets of equal sum.',
    code: `% 4. Number Partitioning (Subset Sum / Number Partitioning)
% x[i] = 1 if the element belongs to subset A, 0 if it belongs to B.

int: n = 4;
int: half_sum = 10;
array[1..4] of int: values = [3, 5, 7, 5];

array[1..4] of var 0..1: x;

% The sum of assigned elements must equal exactly half of the total
constraint sum(i in 1..n)(values[i] * x[i]) == half_sum;

solve satisfy;
`
  },
  {
    id: 'binary_assignment',
    name: 'binary_assignment.mzn',
    title: '5. Binary Resource Assignment (Set Packing)',
    description: 'Assign binary resources to maximize utility under constraints.',
    code: `% 5. Optimal Binary Task / Resource Assignment
% assign[i] = 1 if task i is executed.

int: n = 4;
array[1..4] of var 0..1: assign;

% Budget / available resource constraint
constraint 2*assign[1] + 3*assign[2] + 4*assign[3] + 2*assign[4] <= 6;

% Incompatibility: task 1 and task 3 are mutually exclusive
constraint assign[1] + assign[3] <= 1;

% Maximize the total utility of the assignment plan
solve maximize 5*assign[1] + 6*assign[2] + 8*assign[3] + 4*assign[4];
`
  }
];
