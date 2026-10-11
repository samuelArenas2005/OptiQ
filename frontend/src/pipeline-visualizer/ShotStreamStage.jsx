import React, { useEffect, useRef, useState } from 'react';
import { BarVisualizationApp } from '../../logica/main.js';

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
    isSweeping: false,
    sweepState: null,
    winnerState: null,
    winnerCount: 0,
  });

  const shotsData = data?.shots?.shotsData || null;
  const optimalBitstring = data?.shots?.optimalState || shotsData?.optimalState || '1010';
  const optimalValue = data?.shots?.optimalValue !== undefined ? data.shots.optimalValue : 11.0;
  const energyMin = data?.shots?.energyMin !== undefined ? data.shots.energyMin : -11.0;
  const optimalVariables = data?.shots?.optimalVariables || { x1: 1, x2: 0, x3: 1, x4: 0 };
  const isFeasible = data?.shots?.feasible ?? true;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Instanciar Three.js 3D con BarManager y configuración de estado óptimo
    const app = new BarVisualizationApp(container, shotsData, { optimalState: optimalBitstring });
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

        // Actualizar estado al cambiar shot o durante el barrido final
        if (event.shotIndex !== lastReportedShot || isLastShot || winner?.isSweeping || winner?.isOptimal) {
          lastReportedShot = event.shotIndex;
          setShotState({
            currentShot: event.shotIndex + 1,
            totalShots: event.totalShots,
            currentShotState: event.currentShotState || optimalBitstring,
            isWinner: isLastShot && !!winner?.isOptimal,
            isSweeping: isLastShot && !!winner?.isSweeping,
            sweepState: winner?.sweepState || null,
            winnerState: winner ? winner.state : optimalBitstring,
            winnerCount: winner ? winner.count : 0,
          });
        }

        if (isLastShot && winner?.isOptimal && onCompleteRef.current) {
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
  }, [shotsData, optimalBitstring]);

  useEffect(() => {
    const total = data?.shots?.totalShots || shotsData?.shots?.length || 1024;
    setShotState((prev) => ({
      ...prev,
      totalShots: total,
    }));
  }, [data?.shots?.totalShots, shotsData]);

  // Sync play/pause with general controls
  useEffect(() => {
    if (appRef.current && appRef.current.animationController) {
      appRef.current.animationController.isPlaying = isPlaying;
    }
  }, [isPlaying]);

  // Sync external or local speed
  useEffect(() => {
    if (appRef.current && appRef.current.animationController) {
      appRef.current.animationController.setSpeed(localSpeed);
    }
  }, [localSpeed]);

  useEffect(() => {
    setLocalSpeed(speed);
  }, [speed]);

  const handleRestart3D = () => {
    if (appRef.current) {
      if (appRef.current.reset) {
        appRef.current.reset();
      } else if (appRef.current.animationController) {
        appRef.current.animationController.reset();
      }
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
      {/* Left Column: 3D Bar Chart Animation (Three.js BarManager) */}
      <div className="flex-1 flex flex-col bg-[#060913] rounded-2xl border border-cyan-500/30 shadow-[0_0_30px_rgba(0,242,254,0.15)] relative overflow-hidden">
        {/* HUD Overlay Header */}
        <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-cyan-500/30">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#38bdf8]" />
            <span className="font-mono text-xs font-bold text-cyan-300">
              6. 3D Quantum Bar Simulation ({shotState.totalShots} Shots)
            </span>
          </div>

          <div className="pointer-events-auto flex items-center gap-2 font-mono text-xs bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
            <span className="text-slate-400">SHOT:</span>
            <span className="text-white font-bold text-cyan-300">
              {shotState.currentShot} / {shotState.totalShots}
            </span>
            <span className="text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/40">
              Measured: |{shotState.currentShotState}⟩
            </span>
          </div>
        </div>

        {/* Floating Banner during final sweep across all tops */}
        {shotState.isSweeping && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 pointer-events-auto bg-slate-900/95 backdrop-blur-md border border-cyan-400 px-4 py-2 rounded-2xl shadow-[0_0_25px_rgba(0,242,254,0.6)] animate-pulse flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <div className="font-mono text-xs font-bold text-cyan-300">
              SCANNING EIGENSTATES: <span className="text-white text-sm">|{shotState.sweepState || '...'}⟩</span> (evaluating ground state)
            </div>
          </div>
        )}

        {/* Floating Winner Banner when optimal state is locked */}
        {shotState.isWinner && shotState.winnerState && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 pointer-events-auto bg-slate-900/95 backdrop-blur-md border-2 border-amber-400 px-4 py-2 rounded-2xl shadow-[0_0_30px_rgba(255,234,0,0.8)] animate-bounce flex items-center gap-2">
            <span className="text-2xl">👑</span>
            <div className="font-mono text-xs font-bold text-amber-300">
              OPTIMAL SOLUTION: <span className="text-white text-sm">|{shotState.winnerState}⟩</span> ({shotState.winnerCount} shots • Min Energy ⟨H_C⟩)
            </div>
          </div>
        )}

        {/* Three.js Canvas Container (BarManager) */}
        <div
          ref={mountRef}
          className="w-full h-full relative cursor-grab active:cursor-grabbing"
        />

        {/* Footer with 3D navigation help and restart button */}
        <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none text-[10px] font-mono">
          <div className="pointer-events-auto bg-black/70 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10 text-slate-400">
            🖱️ Drag: Rotate 3D camera • Scroll: Zoom • Bars accumulate counts in real time
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
                  title={`Speed ${s}x`}
                >
                  {s}x
                </button>
              ))}
            </div>

            <button
              onClick={handleRestart3D}
              className="px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-cyan-500/20 border border-white/10 text-cyan-300 hover:text-white transition-all cursor-pointer flex items-center gap-1"
              title="Restart 3D shots from Shot 1"
            >
              <span>🔄</span> Restart 3D
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: Decoded Optimal Solution Card */}
      <div className="w-full lg:w-[380px] flex flex-col gap-3">
        {/* Optimal Victory Banner */}
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
                QAOA SYSTEM SOLUTION
              </span>
            </div>

            <div className="text-center my-3">
              <div className="font-mono text-3xl font-extrabold text-white tracking-widest drop-shadow-[0_0_15px_rgba(255,234,0,0.8)]">
                |{optimalBitstring}⟩
              </div>
              <div className="text-xs font-mono text-amber-400 mt-1">
                Minimum Energy Eigenstate: ⟨H_C⟩ = {typeof energyMin === 'number' ? energyMin.toFixed(4) : energyMin} eV
              </div>
            </div>

            {/* Physical Binary Variable Assignment */}
            <div className="bg-black/60 rounded-xl p-3 border border-white/10 font-mono text-xs space-y-2 mt-4">
              <div className="text-[11px] text-slate-400 border-b border-white/10 pb-1 font-bold">
                Decoded Binary Assignment:
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

            {/* Objective Value & Feasibility */}
            <div className="mt-3 space-y-2 font-mono text-xs">
              <div className="flex justify-between p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300">
                <span>Optimal Objective Value:</span>
                <span className="font-bold text-white text-sm">f(x*) = {optimalValue}</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-300">
                <span>BIP Constraints:</span>
                <span className={`font-bold ${isFeasible ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {isFeasible ? '100% Feasible (Valid)' : 'Infeasible'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 text-center font-mono text-[10px] text-slate-500">
            Variational Quantum Algorithm QAOA Completed Successfully
          </div>
        </div>
      </div>
    </div>
  );
}
