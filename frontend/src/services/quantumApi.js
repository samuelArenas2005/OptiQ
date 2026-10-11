/**
 * quantumApi.js - Interacción directa con el backend FastAPI (router.py)
 */

const API_BASE = 'http://127.0.0.1:8000/api';

export async function runQuantumSolver(code, options = {}, onProgress = () => {}) {
  const {
    solver = 'qaoa',
    shots = 8192,
    pSteps = 2,
    optimizer = 'COBYLA',
    angleInit = 'Automática',
    gamma0 = 0.39,
    beta0 = 0.78
  } = options;

  onProgress({ step: 1, message: 'Enviando modelo MiniZinc al backend FastAPI...' });
  await new Promise(r => setTimeout(r, 250));

  onProgress({ step: 2, message: 'Parseando variables declarativas y construyendo QUBO...' });
  await new Promise(r => setTimeout(r, 300));

  onProgress({ step: 3, message: 'Extrayendo features espectrales del Laplaciano y Hamiltoniano...' });
  await new Promise(r => setTimeout(r, 300));

  onProgress({ step: 4, message: 'Ejecutando circuito QAOA simulado en Qiskit...' });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    const response = await fetch(`${API_BASE}/solve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: code,
        solver: solver,
        shots: Number(shots || 8192),
        p_steps: Number(pSteps || 2),
        optimizer: optimizer,
        angle_init: angleInit,
        gamma0: gamma0 !== undefined ? Number(gamma0) : 0.39,
        beta0: beta0 !== undefined ? Number(beta0) : 0.78
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        message: data.message || 'Problema parseado y resuelto con éxito.',
        parsedSummary: data.parsed_summary || null,
        features: data.features || null,
        details: data.details || null,
        timestamp: new Date().toLocaleTimeString()
      };
    } else {
      const errJson = await response.json().catch(() => ({ detail: 'Error en backend cuántico' }));
      return {
        success: false,
        error: errJson.detail || `Error HTTP ${response.status}`,
        timestamp: new Date().toLocaleTimeString()
      };
    }
  } catch (err) {
    return {
      success: false,
      error: `No se pudo conectar con el backend FastAPI (http://127.0.0.1:8000): ${err.message}`,
      timestamp: new Date().toLocaleTimeString()
    };
  }
}
