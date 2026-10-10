import React, { useState } from 'react';
import { Copy, Check, BarChart2, Box, ArrowLeft, RefreshCw } from 'lucide-react';
import Visualizer3D from './Visualizer3D';

export default function ResultsPanel({ result, onBackToConfig, onRerun, isVisualized = false }) {
  const [activeTab, setActiveTab] = useState(isVisualized ? '3d' : 'histogram');
  const [copiedState, setCopiedState] = useState(false);
  const [hoveredState, setHoveredState] = useState(null);

  const handleCopyBitstring = () => {
    if (result?.optimalBitstring) {
      navigator.clipboard.writeText(result.optimalBitstring);
      setCopiedState(true);
      setTimeout(() => setCopiedState(false), 1500);
    }
  };

  const distribution = result?.distribution || [];
  const maxProb = Math.max(...distribution.map(d => d.prob), 0.3);

  return (
    <div className="panel-container results-panel">
      {/* Results Header */}
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToConfig}
            className="btn-icon"
            title="Volver a configuración de parámetros"
          >
            <ArrowLeft size={13} />
          </button>
          <span className="panel-title-text">Resultados de Simulación Cuántica</span>
        </div>

        <div className="view-toggle-pills">
          <button
            onClick={() => setActiveTab('histogram')}
            className={`pill-btn ${activeTab === 'histogram' ? 'active' : ''}`}
            title="Ver histograma de probabilidades"
          >
            <BarChart2 size={12} />
            <span>Histograma</span>
          </button>
          <button
            onClick={() => setActiveTab('3d')}
            className={`pill-btn ${activeTab === '3d' ? 'active' : ''}`}
            title="Ver estado 3D interactivo"
          >
            <Box size={12} />
            <span>Vista 3D</span>
          </button>
        </div>
      </div>

      {/* Metrics Row (Compact & Clean) */}
      <div className="results-metrics-grid">
        <div className="metric-card">
          <span className="metric-label">Objetivo Óptimo</span>
          <span className="metric-val text-blue">{result?.optimalObjective || '152.0'}</span>
        </div>

        <div className="metric-card">
          <span className="metric-label">⟨H_cost⟩ Valor Esperado</span>
          <span className="metric-val text-muted">{result?.energy || '-152.000'}</span>
        </div>

        <div className="metric-card full-span">
          <div className="flex items-center justify-between w-full">
            <span className="metric-label">Eigenestado Medido</span>
            <button
              onClick={handleCopyBitstring}
              className="btn-copy-mini"
              title="Copiar cadena de bits"
            >
              {copiedState ? <Check size={11} className="text-success" /> : <Copy size={11} />}
              <span>{copiedState ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>
          <div className="eigenstate-display">
            |{result?.optimalBitstring || '1101000011'}⟩
            <span className="eigenstate-prob">({result?.stateProbability || '28.4%'})</span>
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="results-content-area">
        {activeTab === 'histogram' ? (
          <div className="histogram-wrapper">
            <div className="histogram-header">
              <span className="text-xs text-muted font-mono">
                Distribución muestreada ({result?.shots || 8192} shots)
              </span>
              <span className="text-xs text-blue font-mono font-semibold">
                {hoveredState ? `|${hoveredState.bits}⟩: ${(hoveredState.prob * 100).toFixed(1)}%` : `P_max = ${result?.stateProbability || '28.4%'}`}
              </span>
            </div>

            <div className="histogram-bars-container">
              {distribution.map((item, idx) => {
                const heightPercent = Math.min(100, Math.max(8, (item.prob / maxProb) * 100));
                return (
                  <div
                    key={idx}
                    className={`histogram-bar-col ${item.peak ? 'is-peak' : ''}`}
                    onMouseEnter={() => setHoveredState(item)}
                    onMouseLeave={() => setHoveredState(null)}
                  >
                    <div
                      className="histogram-bar-fill"
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>
                );
              })}
            </div>

            <div className="histogram-axis">
              <span>|0000...⟩</span>
              <span className="text-blue font-bold">|{result?.optimalBitstring || '1101000011'}⟩</span>
              <span>|1111...⟩</span>
            </div>
          </div>
        ) : (
          <Visualizer3D
            qubits={result?.optimalBitstring?.length || 10}
            bitstring={result?.optimalBitstring || '1101000011'}
          />
        )}
      </div>

      {/* Footer Info & Actions */}
      <div className="results-footer">
        <div className="results-specs">
          <span>{result?.hardware || 'Rigetti Aspen-M3'}</span>
          <span>•</span>
          <span>p = {result?.pLayers || 3}</span>
          <span>•</span>
          <span>{result?.compilationTime || '142 ms'}</span>
        </div>

        <button
          onClick={onRerun}
          className="btn-rerun"
          title="Ejecutar de nuevo con los parámetros actuales"
        >
          <RefreshCw size={12} />
          <span>Re-ejecutar</span>
        </button>
      </div>
    </div>
  );
}
