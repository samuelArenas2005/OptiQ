/**
 * quantumApi.js - Direct and optimized interaction with the FastAPI backend (router.py)
 */

// Dynamic backend URL configuration via Vite environment variables
const rawEnvUrl = import.meta.env?.VITE_API_URL || import.meta.env?.VITE_BACKEND_URL;

export const API_BASE = (() => {
  if (!rawEnvUrl || typeof rawEnvUrl !== 'string' || !rawEnvUrl.trim()) {
    return 'http://127.0.0.1:8000/api';
  }
  const clean = rawEnvUrl.trim().replace(/\/+$/, '');
  return clean.endsWith('/api') ? clean : `${clean}/api`;
})();

export async function runQuantumSolver(code, options = {}, onProgress = () => {}) {
  const {
    solver = 'qaoa',
    shots = 8192,
    pSteps = 2,
    optimizer = 'COBYLA',
    angleInit = 'Automatic',
    gamma0 = 0.39,
    beta0 = 0.78,
    backend = null,
    backendConfig = null
  } = options;

  onProgress({ step: 1, message: 'Sending MiniZinc model and running concurrent pipeline...' });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const progressTimer = setTimeout(() => {
      onProgress({ step: 3, message: 'Extracting spectral features and optimizing QAOA circuit...' });
    }, 150);

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
        beta0: beta0 !== undefined ? Number(beta0) : 0.78,
        backend: backend || undefined,
        backend_config: backendConfig || undefined
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    clearTimeout(progressTimer);

    if (response.ok) {
      const data = await response.json();
      onProgress({ step: 4, message: 'Quantum solution obtained successfully.' });
      return {
        success: true,
        message: data.message || 'Problem parsed and solved successfully.',
        parsedSummary: data.parsed_summary || null,
        features: data.features || null,
        pinn: data.pinn || null,
        details: data.details || null,
        timestamp: new Date().toLocaleTimeString()
      };
    } else {
      const errJson = await response.json().catch(() => ({ detail: 'Quantum backend error' }));
      return {
        success: false,
        error: errJson.detail || `HTTP Error ${response.status}`,
        timestamp: new Date().toLocaleTimeString()
      };
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      return {
        success: false,
        error: 'The quantum simulation exceeded the timeout limit.',
        timestamp: new Date().toLocaleTimeString()
      };
    }
    return {
      success: false,
      error: `Could not connect to the FastAPI backend (${API_BASE}): ${err.message}`,
      timestamp: new Date().toLocaleTimeString()
    };
  }
}

/**
 * Ultra-fast inference (in milliseconds) of PINN angles and hyperparameters.
 */
export async function getPinnHyperparameters(code) {
  try {
    const response = await fetch(`${API_BASE}/pinn/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        pinn: data.pinn,
        features: data.features
      };
    }
    const err = await response.json().catch(() => ({ detail: 'PINN error' }));
    return { success: false, error: err.detail || 'Inference failed' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
