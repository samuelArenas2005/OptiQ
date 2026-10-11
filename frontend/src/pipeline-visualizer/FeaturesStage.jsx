import React, { useEffect, useRef } from 'react';
import { animate, stagger } from 'animejs';

export default function FeaturesStage({ data, isPlaying, speed = 1.0, onComplete }) {
  const containerRef = useRef(null);
  const dialsRef = useRef([]);

  const feats = data.features;

  useEffect(() => {
    if (!containerRef.current) return;

    // Metric card entrance animation with anime.js
    animate(containerRef.current.querySelectorAll('.feature-card'), {
      translateY: [25, 0],
      opacity: [0, 1],
      delay: stagger(70),
      ease: 'outCubic',
    });

    // Circular arc gauge animation
    animate(containerRef.current.querySelectorAll('.gauge-circle'), {
      strokeDashoffset: [100, 0],
      ease: 'inOutSine',
      duration: 1200 / speed,
      delay: stagger(90),
    });
  }, [speed]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex flex-col p-4 text-white overflow-y-auto select-none"
    >
      {/* Features Scan Header */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-cyan-500/20">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#38bdf8]" />
          <span className="font-mono text-xs font-bold text-cyan-300 tracking-wider uppercase">
            3. QUBO Graph Physico-Spectral Feature Extraction (100% Real)
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span>Complete Input Vector (ℝ¹⁷)</span>
        </div>
      </div>

      {/* Grid of 4 Main Radial Gauges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {/* 1. Graph Density (rho) */}
        <div className="feature-card bg-[#070b16] rounded-2xl border border-cyan-500/30 p-3.5 flex flex-col items-center text-center shadow-lg relative overflow-hidden">
          <div className="relative w-20 h-20 mb-2">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-800"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="gauge-circle text-cyan-400"
                strokeDasharray={`${feats.density * 100}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
              <span className="text-sm font-bold text-white">{(feats.density * 100).toFixed(1)}%</span>
            </div>
          </div>
          <span className="font-mono text-xs font-bold text-cyan-300">Density (ρ)</span>
          <span className="text-[10px] text-slate-400 mt-1">2|E| / (|V|(|V|-1))</span>
        </div>

        {/* 2. Laplacian Spectral Gap (lambda_2) */}
        <div className="feature-card bg-[#070b16] rounded-2xl border border-emerald-500/30 p-3.5 flex flex-col items-center text-center shadow-lg relative overflow-hidden">
          <div className="relative w-20 h-20 mb-2">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-800"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="gauge-circle text-emerald-400"
                strokeDasharray={`${(feats.spectralGapLambda2 / 3.0) * 100}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
              <span className="text-sm font-bold text-white">{feats.spectralGapLambda2.toFixed(3)}</span>
            </div>
          </div>
          <span className="font-mono text-xs font-bold text-emerald-300">Spectral Gap (λ₂)</span>
          <span className="text-[10px] text-slate-400 mt-1">Algebraic connectivity L=D-A</span>
        </div>

        {/* 3. Spectral Radius (lambda_max) */}
        <div className="feature-card bg-[#070b16] rounded-2xl border border-purple-500/30 p-3.5 flex flex-col items-center text-center shadow-lg relative overflow-hidden">
          <div className="relative w-20 h-20 mb-2">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-800"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="gauge-circle text-purple-400"
                strokeDasharray={`${(feats.spectralRadius / 6.0) * 100}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
              <span className="text-sm font-bold text-white">{feats.spectralRadius.toFixed(3)}</span>
            </div>
          </div>
          <span className="font-mono text-xs font-bold text-purple-300">Spectral Radius (λ_max)</span>
          <span className="text-[10px] text-slate-400 mt-1">Extremal energy eigenvalue</span>
        </div>

        {/* 4. Quantum Frustration Index (chi) */}
        <div className="feature-card bg-[#070b16] rounded-2xl border border-amber-500/30 p-3.5 flex flex-col items-center text-center shadow-lg relative overflow-hidden">
          <div className="relative w-20 h-20 mb-2">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-800"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="gauge-circle text-amber-400"
                strokeDasharray={`${feats.frustrationIndex * 100}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
              <span className="text-sm font-bold text-white">{(feats.frustrationIndex * 100).toFixed(1)}%</span>
            </div>
          </div>
          <span className="font-mono text-xs font-bold text-amber-300">Frustration (χ)</span>
          <span className="text-[10px] text-slate-400 mt-1">Signed Laplacian L_signed</span>
        </div>
      </div>

      {/* Full Physics Vector Telemetry Table */}
      <div className="bg-[#070b16] rounded-2xl border border-cyan-500/30 p-3.5 shadow-lg flex-1 flex flex-col">
        <h4 className="font-mono text-xs font-bold text-cyan-300 mb-2 flex items-center justify-between">
          <span>Input Vector for Physics-Informed Neural Network (PINN):</span>
          <span className="text-[10px] text-slate-400">X_features ∈ ℝ¹⁷ (11 Physical + 6 One-Hot)</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 font-mono text-xs">
          {feats.featureVector.map((f, i) => (
            <div
              key={f.name}
              className="feature-card p-2.5 rounded-xl bg-slate-900/60 border border-white/10 hover:border-cyan-400 transition-all"
            >
              <div className="text-[10px] text-slate-400 truncate">{f.name}</div>
              <div className="text-sm font-bold text-cyan-300 my-0.5">
                {typeof f.value === 'number' ? f.value.toFixed(4) : f.value} {f.unit}
              </div>
              <div className="text-[9px] text-slate-500 leading-tight truncate">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
