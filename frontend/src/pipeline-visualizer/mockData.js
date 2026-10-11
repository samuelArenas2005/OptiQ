/**
 * mockData.js - Complete and rigorous dataset for end-to-end quantum simulation
 * Mathematically models the complete pipeline:
 * MiniZinc -> AST Parse -> QUBO Graph -> Spectral Features -> PINN -> QAOA Composer -> Shots
 */

export const PIPELINE_MOCK_DATA = {
  // 1. MINIZINC CODE AND PARSED TOKENS
  code: {
    raw: `% OptiQ - Binary Integer Programming (BIP)
% Quantum Knapsack & Assignment Problem
var bool: x1; % Qubit q0
var bool: x2; % Qubit q1
var bool: x3; % Qubit q2
var bool: x4; % Qubit q3

% Capacity Constraint
constraint 2*x1 + 3*x2 + 4*x3 + 2*x4 <= 6;

% Mutual Exclusion Constraint
constraint x1 + x3 <= 1;

% Maximization Objective Function
solve maximize 5*x1 + 4*x2 + 7*x3 + 3*x4;`,
    lines: [
      { num: 1, text: "% OptiQ - Binary Integer Programming (BIP)", type: "comment" },
      { num: 2, text: "% Quantum Knapsack & Assignment Problem", type: "comment" },
      { num: 3, text: "var bool: x1;", type: "var", varName: "x1", qubit: "q0", domain: "{0, 1}" },
      { num: 4, text: "var bool: x2;", type: "var", varName: "x2", qubit: "q1", domain: "{0, 1}" },
      { num: 5, text: "var bool: x3;", type: "var", varName: "x3", qubit: "q2", domain: "{0, 1}" },
      { num: 6, text: "var bool: x4;", type: "var", varName: "x4", qubit: "q3", domain: "{0, 1}" },
      { num: 7, text: "", type: "empty" },
      { num: 8, text: "% Capacity Constraint", type: "comment" },
      { num: 9, text: "constraint 2*x1 + 3*x2 + 4*x3 + 2*x4 <= 6;", type: "constraint", id: "C1", terms: { x1: 2, x2: 3, x3: 4, x4: 2 }, op: "<=", rhs: 6 },
      { num: 10, text: "", type: "empty" },
      { num: 11, text: "% Mutual Exclusion Constraint", type: "comment" },
      { num: 12, text: "constraint x1 + x3 <= 1;", type: "constraint", id: "C2", terms: { x1: 1, x3: 1 }, op: "<=", rhs: 1 },
      { num: 13, text: "", type: "empty" },
      { num: 14, text: "solve maximize 5*x1 + 4*x2 + 7*x3 + 3*x4;", type: "objective", sense: "maximize", weights: { x1: 5, x2: 4, x3: 7, x4: 3 } }
    ],
    variables: [
      { name: "x1", qubit: 0, label: "Variable x₁ (q₀)", costWeight: 5 },
      { name: "x2", qubit: 1, label: "Variable x₂ (q₁)", costWeight: 4 },
      { name: "x3", qubit: 2, label: "Variable x₃ (q₂)", costWeight: 7 },
      { name: "x4", qubit: 3, label: "Variable x₄ (q₃)", costWeight: 3 }
    ],
    constraintsCount: 2,
    domain: "Binary Integer Programming (BIP)"
  },

  // 2. COUPLING GRAPH AND QUBO FORMULATION
  qubo: {
    nodes: [
      { id: 0, label: "x₁ (q₀)", degree: 3, h_i: -3.20, color: "#38bdf8", x: -2.2, y: 1.5, z: 0 },
      { id: 1, label: "x₂ (q₁)", degree: 2, h_i: -1.85, color: "#00ff88", x: 2.2, y: 1.5, z: 0.5 },
      { id: 2, label: "x₃ (q₂)", degree: 3, h_i: -4.10, color: "#a855f7", x: 1.8, y: -1.6, z: -0.3 },
      { id: 3, label: "x₄ (q₃)", degree: 2, h_i: -1.45, color: "#ffea00", x: -1.8, y: -1.6, z: 0.2 }
    ],
    edges: [
      { u: 0, v: 1, J_ij: 3.50, type: "antiferromagnetic", label: "J₀₁ = +3.50" },
      { u: 0, v: 2, J_ij: 4.80, type: "antiferromagnetic", label: "J₀₂ = +4.80 (Exclusion)" },
      { u: 1, v: 2, J_ij: 2.90, type: "antiferromagnetic", label: "J₁₂ = +2.90" },
      { u: 2, v: 3, J_ij: 2.40, type: "antiferromagnetic", label: "J₂₃ = +2.40" },
      { u: 0, v: 3, J_ij: 1.60, type: "antiferromagnetic", label: "J₀₃ = +1.60" }
    ],
    matrix: [
      [-3.20,  3.50,  4.80,  1.60],
      [ 3.50, -1.85,  2.90,  0.00],
      [ 4.80,  2.90, -4.10,  2.40],
      [ 1.60,  0.00,  2.40, -1.45]
    ],
    formula: "H_C = \\sum_{i} h_i Z_i + \\sum_{(i,j)} J_{ij} Z_i Z_j + \\lambda_{penalty} \\sum_k (\\text{Constraint}_k)^2",
    penaltyLambda: 8.5
  },

  // 3. TOPOLOGICAL AND SPECTRAL PHYSICAL FEATURES
  features: {
    density: 0.8333,
    spectralGapLambda2: 1.4382,
    spectralRadius: 4.8210,
    frustrationIndex: 0.2480,
    clauseVarRatio: 1.25,
    numVariables: 4,
    numInteractions: 5,
    hStats: { mean: -2.65, variance: 1.24, min: -4.10, max: -1.45 },
    JStats: { mean: 3.04, variance: 1.15, min: 1.60, max: 4.80 },
    featureVector: [
      { name: "Graph Density (ρ)", value: 0.8333, unit: "", desc: "Quadratic coupling density" },
      { name: "Spectral Gap (λ₂)", value: 1.4382, unit: "rad", desc: "Quantum propagation speed" },
      { name: "Spectral Radius (λ_max)", value: 4.8210, unit: "rad", desc: "Maximum Laplacian energy bound" },
      { name: "Frustration Index (χ)", value: 0.2480, unit: "%", desc: "Frustration across odd spin loops" },
      { name: "Clause/Var Ratio (E/V)", value: 1.2500, unit: "", desc: "Average constraint degree" },
      { name: "Mean h Fields (μ_h)", value: -2.6500, unit: "eV", desc: "Net Z polarization bias" },
      { name: "Mean J Couplings (μ_J)", value: 3.0400, unit: "eV", desc: "Average antiferromagnetic magnitude" },
      { name: "Coupling Variance (σ²_J)", value: 1.1500, unit: "eV²", desc: "Bond energy dispersion" }
    ]
  },

  // 4. PHYSICS-INFORMED NEURAL NETWORK (PINN)
  pinn: {
    architecture: {
      layers: [8, 16, 12, 4],
      layerNames: ["Physical Features (8)", "Hidden Layer 1 (16)", "Hidden Layer 2 (12)", "QAOA Hyperparameters (4)"]
    },
    lossPhysics: 0.0142,
    lossData: 0.0089,
    epochsTrained: 500,
    optimizer: "AdamW + Physics Regularizer",
    predictions: {
      gamma: [0.3927, 0.7854],
      beta:  [0.5236, 0.2618],
      formatted: [
        { name: "γ₁ (Layer 1 Cost)", value: "0.3927 rad (π/8)", raw: 0.3927 },
        { name: "β₁ (Layer 1 Mixer)", value: "0.5236 rad (π/6)", raw: 0.5236 },
        { name: "γ₂ (Layer 2 Cost)", value: "0.7854 rad (π/4)", raw: 0.7854 },
        { name: "β₂ (Layer 2 Mixer)", value: "0.2618 rad (π/12)", raw: 0.2618 }
      ]
    }
  },

  // 5. QAOA QUANTUM CIRCUIT COMPOSER
  circuit: {
    pLayers: 2,
    qubitsCount: 4,
    wires: ["q₀ (x₁)", "q₁ (x₂)", "q₂ (x₃)", "q₃ (x₄)"],
    stages: [
      {
        id: "superposition",
        title: "Initial State |+⟩ⁿ",
        desc: "Uniform superposition achieved by applying Hadamard gates H across all qubits",
        gates: [
          { type: "H", target: 0, label: "H" },
          { type: "H", target: 1, label: "H" },
          { type: "H", target: 2, label: "H" },
          { type: "H", target: 3, label: "H" }
        ]
      },
      {
        id: "cost_layer_1",
        title: "Cost Hamiltonian Layer U_C(γ₁)",
        desc: "Unitary evolution e^{-i γ₁ H_C} via R_ZZ(2γ₁ J_ij) and R_Z(2γ₁ h_i) gates",
        gates: [
          { type: "RZZ", control: 0, target: 1, angle: "2γ₁ J₀₁", label: "R_ZZ" },
          { type: "RZZ", control: 0, target: 2, angle: "2γ₁ J₀₂", label: "R_ZZ" },
          { type: "RZZ", control: 1, target: 2, angle: "2γ₁ J₁₂", label: "R_ZZ" },
          { type: "RZZ", control: 2, target: 3, angle: "2γ₁ J₂₃", label: "R_ZZ" },
          { type: "RZ", target: 0, angle: "2γ₁ h₀", label: "R_Z" },
          { type: "RZ", target: 1, angle: "2γ₁ h₁", label: "R_Z" },
          { type: "RZ", target: 2, angle: "2γ₁ h₂", label: "R_Z" },
          { type: "RZ", target: 3, angle: "2γ₁ h₃", label: "R_Z" }
        ]
      },
      {
        id: "mixer_layer_1",
        title: "Pauli-X Mixer Layer U_M(β₁)",
        desc: "Transverse rotations e^{-i β₁ \\sum X_i} with R_X(2β₁) gates",
        gates: [
          { type: "RX", target: 0, angle: "2β₁", label: "R_X" },
          { type: "RX", target: 1, angle: "2β₁", label: "R_X" },
          { type: "RX", target: 2, angle: "2β₁", label: "R_X" },
          { type: "RX", target: 3, angle: "2β₁", label: "R_X" }
        ]
      },
      {
        id: "measurement",
        title: "Projective Measurement M",
        desc: "Quantum state collapse in computational Z-basis onto classical 4-bit register",
        gates: [
          { type: "M", target: 0, label: "M" },
          { type: "M", target: 1, label: "M" },
          { type: "M", target: 2, label: "M" },
          { type: "M", target: 3, label: "M" }
        ]
      }
    ]
  },

  // 6. SHOT STREAM AND CONVERGENCE TO OPTIMAL SOLUTION
  shots: {
    totalShots: 1024,
    optimalState: "1010",
    optimalValue: 11.0,
    optimalVariables: { x1: 1, x2: 0, x3: 1, x4: 0 },
    energyMin: -11.0,
    feasible: true,
    distribution: [
      { bits: "1010", count: 410, prob: 0.4004, feasible: true, fval: 11.0, peak: true },
      { bits: "0101", count: 256, prob: 0.2500, feasible: true, fval: 7.0,  peak: false },
      { bits: "1001", count: 102, prob: 0.0996, feasible: true, fval: 8.0,  peak: false },
      { bits: "1100", count: 82,  prob: 0.0801, feasible: true, fval: 9.0,  peak: false },
      { bits: "0010", count: 61,  prob: 0.0596, feasible: true, fval: 7.0,  peak: false },
      { bits: "1000", count: 51,  prob: 0.0498, feasible: true, fval: 5.0,  peak: false },
      { bits: "1111", count: 31,  prob: 0.0303, feasible: false, fval: 19.0, peak: false },
      { bits: "0000", count: 31,  prob: 0.0303, feasible: true, fval: 0.0,  peak: false }
    ],
    streamSample: [
      "1010", "1001", "1010", "0101", "1010", "1100", "1010", "1010",
      "0101", "1010", "1001", "1010", "1010", "0010", "1010", "1010",
      "0101", "1010", "1010", "1001", "1010", "1100", "1010", "1010"
    ]
  }
};
