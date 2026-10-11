import React, { useState, useEffect, useMemo } from 'react';
import { PIPELINE_MOCK_DATA } from './mockData.js';
import { adaptBackendDataToPipeline } from './dataAdapter.js';
import CodeParserStage from './CodeParserStage.jsx';
import GraphQuboStage from './GraphQuboStage.jsx';
import FeaturesStage from './FeaturesStage.jsx';
import PinnStage from './PinnStage.jsx';
import CircuitComposerStage from './CircuitComposerStage.jsx';
import ShotStreamStage from './ShotStreamStage.jsx';

const STAGES = [
  { id: 'parser', name: '1. Parser MiniZinc', icon: 'code', component: CodeParserStage, duration: 6500 },
  { id: 'graph', name: '2. Grafo & QUBO', icon: 'hub', component: GraphQuboStage, duration: 7000 },
  { id: 'features', name: '3. Features Espectrales', icon: 'analytics', component: FeaturesStage, duration: 6500 },
  { id: 'pinn', name: '4. Red PINN', icon: 'neurology', component: PinnStage, duration: 7500 },
  { id: 'circuit', name: '5. QAOA Composer', icon: 'memory', component: CircuitComposerStage, duration: 7000 },
  { id: 'shots', name: '6. Shots & Solución', icon: 'emoji_events', component: ShotStreamStage, duration: 0 },
];

export default function PipelineModal({
  isOpen,
  onClose,
  initialCode = null,
  result = null,
  isLoading = false,
  loadingStep = 1,
  loadingMessage = '',
  hyperparams = null
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1.0);
  const [autoAdvance, setAutoAdvance] = useState(true);

  // Adapta los datos reales de ejecución del backend para todas las pestañas (excepto PINN que queda mock)
  const pipelineData = useMemo(() => {
    return adaptBackendDataToPipeline(result, initialCode, hyperparams);
  }, [result, initialCode, hyperparams]);

  // Auto-avance secuencial para etapas 1 a 5.
  // La etapa 6 (shots) NO se corta artificialmente por tiempo; se completa cuando terminan los 1024 disparos.
  useEffect(() => {
    if (!isOpen || !isPlaying || !autoAdvance) return;
    if (currentStep >= STAGES.length - 1) return;

    const currentDuration = STAGES[currentStep].duration / speed;
    const timer = setTimeout(() => {
      setCurrentStep((prev) => Math.min(STAGES.length - 1, prev + 1));
    }, currentDuration);

    return () => clearTimeout(timer);
  }, [isOpen, isPlaying, autoAdvance, currentStep, speed]);

  const handleStageComplete = React.useCallback(() => {
    if (autoAdvance) {
      setCurrentStep((prev) => {
        if (prev < STAGES.length - 1) {
          return prev + 1;
        } else {
          setIsPlaying(false);
          return prev;
        }
      });
    } else {
      setIsPlaying(false);
    }
  }, [autoAdvance]);

  if (!isOpen) return null;

  const ActiveStageComponent = STAGES[currentStep].component;

  const handleRestart = () => {
    setCurrentStep(0);
    setIsPlaying(true);
  };

  const handlePopout = () => {
    // Abrir una nueva pestaña para el visualizador si el usuario lo desea
    window.open('/pipeline.html', '_blank', 'width=1280,height=800');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 select-none animate-in fade-in duration-200">
      <div className="w-full h-full max-w-[1440px] max-h-[920px] bg-[#060913] rounded-3xl border border-cyan-500/40 shadow-[0_0_50px_rgba(0,242,254,0.2)] flex flex-col overflow-hidden relative">
        {/* Barra Superior de Control y Navegación de Etapas */}
        <header className="px-5 py-3.5 bg-slate-900/90 border-b border-cyan-500/20 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#00f2fe]" />
              <h2 className="font-mono text-sm sm:text-base font-bold text-white tracking-wide">
                OptiQ <span className="text-cyan-400">Quantum Pipeline Visualizer</span>
              </h2>
            </div>
            {isLoading ? (
              <span className="hidden sm:inline-flex items-center gap-1.5 font-mono text-[10px] bg-cyan-950/80 border border-cyan-400 text-cyan-300 px-2.5 py-0.5 rounded-full animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                <span>Simulación QAOA en Ejecución...</span>
              </span>
            ) : result?.success ? (
              <span className="hidden sm:inline-flex items-center gap-1.5 font-mono text-[10px] bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 px-2.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Backend Real Conectado ({pipelineData.circuit?.qubitsCount || 4} Qubits | {result.details?.hardware || 'Qiskit Aer'})</span>
              </span>
            ) : (
              <span className="hidden sm:inline-block font-mono text-[10px] bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 px-2 py-0.5 rounded-full">
                End-to-End BIP → PINN → QAOA
              </span>
            )}
          </div>

          {/* Stepper de Etapas Cuánticas */}
          <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/10 overflow-x-auto max-w-full">
            {STAGES.map((stg, idx) => {
              const isActive = idx === currentStep;
              const isPassed = idx < currentStep;

              return (
                <button
                  key={stg.id}
                  onClick={() => setCurrentStep(idx)}
                  className={`px-2.5 py-1 rounded-lg font-mono text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_12px_#38bdf8]'
                      : isPassed
                      ? 'text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/50'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="text-[10px]">
                    {isPassed ? '✓' : idx + 1}
                  </span>
                  <span>{stg.name.split('. ')[1]}</span>
                </button>
              );
            })}
          </div>

          {/* Botones de Ventana */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePopout}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-400 text-slate-300 hover:text-white transition-all text-xs flex items-center gap-1"
              title="Abrir en ventana independiente"
            >
              <span className="material-symbols-outlined text-[16px]">open_in_new</span>
              <span className="hidden md:inline font-mono text-[11px]">Nueva Ventana</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-red-950/40 hover:bg-red-500/30 border border-red-500/30 text-red-300 hover:text-white flex items-center justify-center transition-all cursor-pointer font-bold"
              title="Cerrar Visualizador"
            >
              ✕
            </button>
          </div>
        </header>

        {/* Área Central: Visualizador de la Etapa Activa */}
        <main className="flex-1 min-h-0 w-full overflow-hidden relative">
          <ActiveStageComponent
            data={pipelineData}
            isPlaying={isPlaying}
            speed={speed}
            onComplete={handleStageComplete}
          />
        </main>

        {/* Barra Inferior de Control de Reproducción */}
        <footer className="px-5 py-2.5 bg-slate-900/90 border-t border-cyan-500/20 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Controles de Reproducción y Etapas */}
          <div className="flex items-center gap-2 font-mono text-xs">
            {/* Paso Anterior */}
            <button
              onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
              disabled={currentStep === 0}
              className="px-2.5 py-1 bg-white/5 hover:bg-cyan-500/20 border border-white/10 text-white rounded-lg transition-all disabled:opacity-40 cursor-pointer"
            >
              ⏮ Anterior
            </button>

            {/* Play / Pausa */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-3.5 py-1 bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 border border-cyan-400 text-white rounded-lg font-semibold transition-all shadow-md cursor-pointer"
            >
              {isPlaying ? '⏸ Pausar' : '▶ Reanudar'}
            </button>

            {/* Siguiente Paso */}
            <button
              onClick={() => setCurrentStep((prev) => Math.min(STAGES.length - 1, prev + 1))}
              disabled={currentStep === STAGES.length - 1}
              className="px-2.5 py-1 bg-white/5 hover:bg-cyan-500/20 border border-white/10 text-white rounded-lg transition-all disabled:opacity-40 cursor-pointer"
            >
              Siguiente ⏭
            </button>

            {/* Reiniciar */}
            <button
              onClick={handleRestart}
              className="p-1 bg-white/5 hover:bg-cyan-500/20 border border-white/10 text-cyan-300 hover:text-white rounded-lg transition-all cursor-pointer"
              title="Reiniciar flujo desde el Paso 1"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>
          </div>

          {/* Información del Paso Actual */}
          <div className="font-mono text-xs text-slate-300">
            ETAPA:{' '}
            <span className="text-cyan-400 font-bold">{currentStep + 1} / {STAGES.length}</span> —{' '}
            <span className="text-white font-semibold">{STAGES[currentStep].name}</span>
          </div>

          {/* Selector de Velocidad y Auto-avance */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoAdvance}
                onChange={(e) => setAutoAdvance(e.target.checked)}
                className="rounded accent-cyan-400 cursor-pointer"
              />
              <span>Auto-avance</span>
            </label>

            <div className="flex bg-black/40 rounded-lg p-0.5 border border-white/10 font-mono text-[10px]">
              {[0.5, 1.0, 2.0, 5.0].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-2 py-0.5 rounded cursor-pointer transition-all ${
                    speed === s
                      ? 'bg-cyan-500/30 text-cyan-300 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
