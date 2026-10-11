import React from 'react';
import { Sliders, Play, Sparkles } from 'lucide-react';

export default function Hyperparameters({
  pLayers,
  onChangePLayers,
  shots,
  onChangeShots,
  optimizer,
  onChangeOptimizer,
  hardware,
  onChangeHardware,
  onRun,
  onRunWithViz,
  isRunning
}) {
  return (
    <div className="panel-container">
      <div className="panel-header">
        <div className="panel-title">
          <Sliders size={14} className="text-blue" />
          <span>QAOA &amp; QPU Configuration</span>
        </div>
      </div>

      <div className="params-grid">
        {/* p-layers stepper */}
        <div className="param-item">
          <label className="param-label">QAOA Layers (p-steps)</label>
          <div className="stepper-box">
            <button
              onClick={() => onChangePLayers(Math.max(1, pLayers - 1))}
              disabled={isRunning || pLayers <= 1}
              className="stepper-btn"
            >
              -
            </button>
            <span className="stepper-value">p = {pLayers}</span>
            <button
              onClick={() => onChangePLayers(Math.min(8, pLayers + 1))}
              disabled={isRunning || pLayers >= 8}
              className="stepper-btn"
            >
              +
            </button>
          </div>
        </div>

        {/* Shots select */}
        <div className="param-item">
          <label className="param-label">Shots</label>
          <select
            value={shots}
            onChange={(e) => onChangeShots(Number(e.target.value))}
            disabled={isRunning}
            className="input-select"
          >
            <option value={1024}>1,024 shots</option>
            <option value={2048}>2,048 shots</option>
            <option value={4096}>4,096 shots</option>
            <option value={8192}>8,192 shots</option>
          </select>
        </div>

        {/* Optimizer toggles */}
        <div className="param-item full-width">
          <label className="param-label">Classical Optimizer</label>
          <div className="segmented-control">
            {['COBYLA', 'Adam', 'Nelder-Mead'].map((opt) => (
              <button
                key={opt}
                onClick={() => onChangeOptimizer(opt)}
                disabled={isRunning}
                className={`segment-btn ${optimizer === opt ? 'active' : ''}`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Hardware target */}
        <div className="param-item full-width">
          <label className="param-label">Execution Hardware</label>
          <select
            value={hardware}
            onChange={(e) => onChangeHardware(e.target.value)}
            disabled={isRunning}
            className="input-select"
          >
            <option value="Rigetti Aspen-M3 (45Q)">Rigetti Aspen-M3 (45 Qubits)</option>
            <option value="IBM Quantum Eagle (127Q)">IBM Quantum Eagle (127 Qubits)</option>
            <option value="Local Statevector Sim">Local Statevector Simulator</option>
          </select>
        </div>
      </div>

      <div className="panel-actions">
        <button
          onClick={onRun}
          disabled={isRunning}
          className="btn-panel-secondary"
          title="Run algorithm and measure distribution"
        >
          <Play size={13} className="fill-current" />
          <span>Run</span>
        </button>

        <button
          onClick={onRunWithViz}
          disabled={isRunning}
          className="btn-panel-primary"
          title="Run and render interactive 3D visualization"
        >
          <Sparkles size={13} />
          <span>Run &amp; Visualize</span>
        </button>
      </div>
    </div>
  );
}
