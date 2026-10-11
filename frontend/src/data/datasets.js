/**
 * datasets.js - Datasets preconfigurados para visualización 3D y fallback
 */

export const mock1 = {
  nombre: "Mock 1: 2 Qubits (4 estados - 25 shots)",
  num_estados: 4,
  estados: ["00", "01", "10", "11"],
  shots: [
    "00", "01", "11", "10", "11",
    "01", "11", "11", "10", "11",
    "11", "00", "11", "01", "11",
    "10", "11", "11", "01", "11",
    "11", "10", "11", "01", "11"
  ]
};

export const mock2 = {
  nombre: "Mock 2: 3 Qubits (8 estados - 100 shots)",
  num_estados: 8,
  estados: ["000", "001", "010", "011", "100", "101", "110", "111"],
  shots: Array.from({ length: 100 }, (_, i) => {
    const r = Math.random();
    if (r < 0.45) return "101"; // Ground state pico
    if (r < 0.65) return "011";
    if (r < 0.80) return "001";
    if (r < 0.90) return "110";
    return ["000", "010", "100", "111"][i % 4];
  })
};

export const mock3 = {
  nombre: "Mock 3: 4 Qubits (16 estados - 1024 shots)",
  num_estados: 16,
  estados: [
    "0000", "0001", "0010", "0011",
    "0100", "0101", "0110", "0111",
    "1000", "1001", "1010", "1011",
    "1100", "1101", "1110", "1111"
  ],
  shots: Array.from({ length: 1024 }, () => {
    const r = Math.random();
    if (r < 0.38) return "1010"; // Estado óptimo dominante
    if (r < 0.55) return "1001";
    if (r < 0.68) return "0110";
    if (r < 0.78) return "0011";
    if (r < 0.86) return "1100";
    const others = ["0000", "0001", "0010", "0100", "0101", "0111", "1000", "1011", "1101", "1110", "1111"];
    return others[Math.floor(Math.random() * others.length)];
  })
};

export const MOCK_ACTIVO = "mock3";
export const data = mock3;
