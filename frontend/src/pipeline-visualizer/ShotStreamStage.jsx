import React, { useEffect, useRef, useState } from 'react';
import { BarVisualizationApp } from '../../logica/main.js';
<<<<<<< HEAD
=======
import { mock3 } from '../data/datasets.js';
>>>>>>> ddec6e4c730aebfc1be83296fa089d02e7a8fa5a

export default function ShotStreamStage({ data, isPlaying, speed = 1.0, onComplete }) {
  const mountRef = useRef(null);
  const appRef = useRef(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const [localSpeed, setLocalSpeed] = useState(speed);

  const [shotState, setShotState] = useState({
    currentShot: 1,
    totalShots: data?.shots?.totalShots || 1024,
    currentShotState: data?.shots?.optimalState || '1010',
    isWinner: false,
    winnerState: null,
    winnerCount: 0,
  });

  const shotsData = data?.shots?.shotsData || null;
  const optimalBitstring = shotState.winnerState || data?.shots?.optimalState || '1010';
  const optimalValue = data?.shots?.optimalValue !== undefined ? data.shots.optimalValue : 11.0;
  const energyMin = data?.shots?.energyMin !== undefined ? data.shots.energyMin : -11.0;
  const optimalVariables = data?.shots?.optimalVariables || { x1: 1, x2: 0, x3: 1, x4: 0 };
  const isFeasible = data?.shots?.feasible ?? true;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Instanciar el motor 3D de Three.js con BarManager y mock3 (1024 shots) una sola vez
    const app = new BarVisualizationApp(container, shotsData);
    appRef.current = app;

    if (app.animationController) {
      app.animationController.setSpeed(localSpeed);
      app.animationController.isPlaying = isPlaying;
    }

    let lastReportedShot = -1;
    app.setUIListener((event) => {
      if (event.type === 'tick') {
        const isLastShot = event.shotIndex >= event.totalShots - 1;
        const winner = event.winner;

        // Actualizar estado de React solo si el shot cambia o al llegar al último shot
        if (event.shotIndex !== lastReportedShot || isLastShot) {
          lastReportedShot = event.shotIndex;
          setShotState({
            currentShot: event.shotIndex + 1,
            totalShots: event.totalShots,
            currentShotState: event.currentShotState || '1010',
            isWinner: isLastShot && !!winner,
            winnerState: winner ? winner.state : null,
            winnerCount: winner ? winner.count : 0,
          });
        }

        if (isLastShot && onCompleteRef.current) {
          onCompleteRef.current();
        }
      }
    });

    return () => {
      if (appRef.current) {
        appRef.current.dispose();
        appRef.current = null;
      }
    };
  }, [shotsData]);

  useEffect(() => {
    const total = data?.shots?.totalShots || shotsData?.shots?.length || 1024;
    setShotState((prev) => ({
      ...prev,
      totalShots: total,
    }));
  }, [data?.shots?.totalShots, shotsData]);

  // Sincronizar play/pause con los controles generales
  useEffect(() => {
    if (appRef.current && appRef.current.animationController) {
      appRef.current.animationController.isPlaying = isPlaying;
    }
  }, [isPlaying]);

  // Sincronizar velocidad externa o local
  useEffect(() => {
    if (appRef.current && appRef.current.animationController) {
      appRef.current.animationController.setSpeed(localSpeed);
    }
  }, [localSpeed]);

  useEffect(() => {
    setLocalSpeed(speed);
  }, [speed]);

  const handleRestart3D = () => {
    if (appRef.current && appRef.current.animationController) {
      appRef.current.animationController.reset();
    }
  };

  const handleSpeedSelect = (newSpeed) => {
    setLocalSpeed(newSpeed);
    if (appRef.current && appRef.current.animationController) {
      appRef.current.animationController.setSpeed(newSpeed);
    }
  };

  return (
    <div className="w-full h-full flex flex-col lg:flex-row gap-4 p-4 text-white overflow-hidden select-none">
      {/* Columna Izquierda: Animación 3D del Diagrama de Barras (Three.js BarManager) */}
      <div className="flex-1 flex flex-col bg-[#060913] rounded-2xl border border-cyan-500/30 shadow-[0_0_30px_rgba(0,242,254,0.15)] relative overflow-hidden">
        {/* Encabezado Superpuesto del HUD */}
        <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-cyan-500/30">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#38bdf8]" />
            <span className="font-mono text-xs font-bold text-cyan-300">
              6. Simulación 3D de Barras Cuánticas ({shotState.totalShots} Shots)
            </span>
          </div>

          <div className="pointer-events-auto flex items-center gap-2 font-mono text-xs bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
            <span className="text-slate-400">SHOT:</span>
            <span className="text-white font-bold text-cyan-300">
              {shotState.currentShot} / {shotState.totalShots}
            </span>
            <span className="text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/40">
              Medido: |{shotState.currentShotState}⟩
            </span>
          </div>
        </div>

        {/* Banner Flotante de Ganador cuando finaliza */}
        {shotState.isWinner && shotState.winnerState && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 pointer-events-auto bg-slate-900/95 backdrop-blur-md border-2 border-amber-400 px-4 py-2 rounded-2xl shadow-[0_0_30px_rgba(255,234,0,0.8)] animate-bounce flex items-center gap-2">
            <span className="text-2xl">👑</span>
            <div className="font-mono text-xs font-bold text-amber-300">
              ESTADO GANADOR: <span className="text-white text-sm">|{shotState.winnerState}⟩</span> ({shotState.winnerCount} disparos)
            </div>
          </div>
        )}

        {/* Contenedor del Canvas de Three.js (BarManager) */}
        <div
          ref={mountRef}
          className="w-full h-full relative cursor-grab active:cursor-grabbing"
        />

        {/* Pie de página con ayuda de navegación 3D y botón de reinicio */}
        <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none text-[10px] font-mono">
          <div className="pointer-events-auto bg-black/70 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10 text-slate-400">
            🖱️ Arrastrar: Rotar cámara 3D • Rueda: Zoom • Las barras acumulan los conteos en tiempo real
          </div>

          <div className="pointer-events-auto flex items-center gap-2">
            <div className="flex bg-black/80 rounded-lg p-0.5 border border-white/10">
              {[1.0, 2.0, 5.0, 10.0].map((s) => (
                <button
                  key={s}
                  onClick={() => handleSpeedSelect(s)}
                  className={`px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                    localSpeed === s
                      ? 'bg-cyan-500/30 text-cyan-300 font-bold border border-cyan-400/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title={`Velocidad ${s}x`}
                >
                  {s}x
                </button>
              ))}
            </div>

            <button
              onClick={handleRestart3D}
              className="px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-cyan-500/20 border border-white/10 text-cyan-300 hover:text-white transition-all cursor-pointer flex items-center gap-1"
              title="Reiniciar disparos 3D al Shot 1"
            >
              <span>🔄</span> Reiniciar 3D
            </button>
          </div>
        </div>
      </div>

      {/* Columna Derecha: Tarjeta de Solución Óptima Decodificada */}
      <div className="w-full lg:w-[380px] flex flex-col gap-3">
        {/* Banner de Victoria Óptima */}
        <div
          className={`bg-[#070b16] rounded-2xl border p-4 shadow-xl transition-all duration-500 flex flex-col justify-between flex-1 ${
            shotState.isWinner
              ? 'border-amber-400 shadow-[0_0_30px_rgba(255,234,0,0.3)] bg-gradient-to-b from-amber-950/20 to-[#070b16]'
              : 'border-cyan-500/30'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">👑</span>
              <span className="font-mono text-xs font-bold text-amber-300 bg-amber-400/10 border border-amber-400/40 px-2.5 py-1 rounded-full shadow-[0_0_10px_rgba(255,234,0,0.3)]">
                SOLUCIÓN QAOA DEL SISTEMA
              </span>
            </div>

            <div className="text-center my-3">
              <div className="font-mono text-3xl font-extrabold text-white tracking-widest drop-shadow-[0_0_15px_rgba(255,234,0,0.8)]">
                |{optimalBitstring}⟩
              </div>
              <div className="text-xs font-mono text-amber-400 mt-1">
                Eigenestado de Mínima Energía: ⟨H_C⟩ = {typeof energyMin === 'number' ? energyMin.toFixed(4) : energyMin} eV
              </div>
            </div>

            {/* Asignación de Variables Binarias Físicas */}
            <div className="bg-black/60 rounded-xl p-3 border border-white/10 font-mono text-xs space-y-2 mt-4">
              <div className="text-[11px] text-slate-400 border-b border-white/10 pb-1 font-bold">
                Asignación Binaria Decodificada:
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs max-h-[140px] overflow-y-auto pr-1">
                {Object.entries(optimalVariables).map(([varName, val], idx) => (
                  <div key={varName} className="p-1.5 bg-slate-900/80 rounded border border-white/10 flex justify-between">
                    <span className="text-slate-300">{varName} (q_{idx}):</span>
                    <span className="text-cyan-300 font-bold">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Valor Objetivo & Factibilidad */}
            <div className="mt-3 space-y-2 font-mono text-xs">
              <div className="flex justify-between p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300">
                <span>Valor Objetivo Óptimo:</span>
                <span className="font-bold text-white text-sm">f(x*) = {optimalValue}</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-300">
                <span>Restricciones BIP:</span>
                <span className={`font-bold ${isFeasible ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {isFeasible ? '100% Factible (Válido)' : 'No Factible'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 text-center font-mono text-[10px] text-slate-500">
            Algoritmo Cuántico Variacional QAOA Finalizado con Éxito
          </div>
        </div>
      </div>
    </div>
  );
}
