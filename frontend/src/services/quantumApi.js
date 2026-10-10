/**
 * quantumApi.js - Interacción directa con el backend FastAPI (router.py)
 */

const API_BASE = 'http://127.0.0.1:8000/api';

export async function runQuantumSolver(code, options = {}, onProgress = () => {}) {
  const {
    solver = 'qaoa',
    shots = 2048,
    pSteps = 3
  } = options;

  onProgress({ step: 1, message: 'Enviando modelo MiniZinc al backend FastAPI...' });
  await new Promise(r => setTimeout(r, 300));

  onProgress({ step: 2, message: 'Parseando variables y restricciones declarativas...' });
  await new Promise(r => setTimeout(r, 400));

  onProgress({ step: 3, message: 'Construyendo formulación cuadrática binaria QUBO...' });
  await new Promise(r => setTimeout(r, 400));

  onProgress({ step: 4, message: 'Extrayendo topología y resumen preliminar...' });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${API_BASE}/solve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: code,
        solver: solver
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        message: data.message || 'Problema parseado y analizado con éxito.',
        parsedSummary: data.parsed_summary || null,
        details: data.details || null,
        timestamp: new Date().toLocaleTimeString()
      };
    } else {
      const errJson = await response.json().catch(() => ({ detail: 'Error de parseo' }));
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
