import React, { useEffect, useState, useRef } from 'react';
import { animate } from 'animejs';

export default function CodeParserStage({ data, isPlaying, speed = 1.0, onComplete }) {
  const [activeLine, setActiveLine] = useState(0);
  const [parsedTokens, setParsedTokens] = useState([]);
  const laserRef = useRef(null);
  const containerRef = useRef(null);

  const lines = data.code.lines;

  useEffect(() => {
    let currentIdx = 0;
    const intervalDuration = (400 / speed);

    const timer = setInterval(() => {
      if (!isPlaying) return;

      if (currentIdx < lines.length) {
        setActiveLine(currentIdx);
        const line = lines[currentIdx];

        if (line.type === 'var' || line.type === 'constraint' || line.type === 'objective') {
          setParsedTokens((prev) => {
            if (!prev.some((p) => p.num === line.num)) {
              return [...prev, line];
            }
            return prev;
          });
        }

        currentIdx++;
      } else {
        clearInterval(timer);
        if (onComplete) onComplete();
      }
    }, intervalDuration);

    // Laser scanning animation using anime.js
    if (laserRef.current) {
      animate(laserRef.current, {
        translateY: [0, 320],
        duration: (lines.length * intervalDuration),
        ease: 'linear',
        autoplay: isPlaying,
      });
    }

    return () => clearInterval(timer);
  }, [isPlaying, speed, lines, onComplete]);

  return (
    <div className="w-full h-full flex flex-col lg:flex-row gap-4 p-4 text-white overflow-hidden select-none">
      {/* Columna Izquierda: Escaneo Láser del Código MiniZinc */}
      <div className="flex-1 flex flex-col bg-[#070b16] rounded-2xl border border-cyan-500/30 shadow-[0_0_20px_rgba(0,242,254,0.12)] p-4 relative overflow-hidden">
        {/* Cabecera de consola */}
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-cyan-500/20">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#38bdf8]" />
            <span className="font-mono text-xs font-bold text-cyan-300 tracking-wider uppercase">
              1. Extracción y Parseo Sintáctico (AST) MiniZinc
            </span>
          </div>
          <span className="font-mono text-[11px] text-slate-400 bg-black/40 px-2 py-0.5 rounded border border-white/10">
            Línea {Math.min(activeLine + 1, lines.length)} de {lines.length}
          </span>
        </div>

        {/* Contenedor del código con rayo láser */}
        <div ref={containerRef} className="relative flex-1 font-mono text-xs overflow-hidden py-1">
          {/* Rayo Láser Neón de escaneo */}
          <div
            ref={laserRef}
            className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#00f2fe] pointer-events-none z-20"
          />

          <div className="space-y-1">
            {lines.map((line, idx) => {
              const isCurrent = idx === activeLine;
              const isParsed = idx < activeLine;

              return (
                <div
                  key={line.num}
                  className={`flex items-center gap-3 px-2 py-0.5 rounded transition-all duration-150 ${
                    isCurrent
                      ? 'bg-cyan-500/20 border-l-2 border-cyan-400 text-white font-semibold shadow-[inset_0_0_10px_rgba(0,242,254,0.15)]'
                      : isParsed
                      ? 'text-slate-300'
                      : 'text-slate-600'
                  }`}
                >
                  <span className="w-6 text-right text-[10px] text-slate-500 select-none">
                    {line.num}
                  </span>
                  <span
                    className={`flex-1 truncate ${
                      line.type === 'comment'
                        ? 'text-emerald-500/80 italic'
                        : line.type === 'var'
                        ? 'text-cyan-300'
                        : line.type === 'constraint'
                        ? 'text-amber-300'
                        : line.type === 'objective'
                        ? 'text-purple-300 font-bold'
                        : 'text-slate-400'
                    }`}
                  >
                    {line.text}
                  </span>
                  {line.type === 'var' && (
                    <span className="text-[9px] bg-cyan-950 text-cyan-300 px-1.5 py-0.2 rounded border border-cyan-500/40">
                      Qubit {line.qubit}
                    </span>
                  )}
                  {line.type === 'constraint' && (
                    <span className="text-[9px] bg-amber-950 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/40">
                      Restricción {line.id}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Columna Derecha: Estructuras AST Extraídas Dinámicamente */}
      <div className="w-full lg:w-[380px] flex flex-col gap-3">
        {/* Panel de Variables Asignadas a Qubits */}
        <div className="bg-[#070b16] rounded-2xl border border-emerald-500/30 p-3.5 shadow-lg flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-mono text-xs font-bold text-emerald-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
              Variables Binarias Detectadas ({data.code.variables.length})
            </h4>
            <span className="text-[10px] font-mono text-slate-400">Dominio: {'{0, 1}'}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-1">
            {data.code.variables.map((v, i) => {
              const isFound = parsedTokens.some((t) => t.type === 'var' && t.varName === v.name);
              return (
                <div
                  key={v.name}
                  className={`p-2 rounded-xl border transition-all duration-300 ${
                    isFound
                      ? 'bg-emerald-950/40 border-emerald-500/50 shadow-[0_0_10px_rgba(0,255,136,0.15)] scale-100 opacity-100'
                      : 'bg-slate-900/40 border-white/5 scale-95 opacity-40'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-emerald-300">
                    <span>{v.name}</span>
                    <span className="text-[10px] px-1 bg-cyan-900/60 rounded text-cyan-200">
                      q_{v.qubit}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Peso en Costo: <span className="text-white font-semibold">+{v.costWeight}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel de Restricciones Matemáticas Detectadas */}
        <div className="bg-[#070b16] rounded-2xl border border-amber-500/30 p-3.5 shadow-lg flex-1 flex flex-col">
          <h4 className="font-mono text-xs font-bold text-amber-300 flex items-center gap-1.5 mb-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b]" />
            Restricciones Descompuestas
          </h4>

          <div className="space-y-2 mt-1 max-h-[160px] overflow-y-auto pr-1">
            {((data.code.constraints && data.code.constraints.length > 0)
              ? data.code.constraints
              : [
                  { id: 'C1', name: 'Mochila / Capacidad', text: '2·x₁ + 3·x₂ + 4·x₃ + 2·x₄ ≤ 6' },
                  { id: 'C2', name: 'Exclusión Mutua', text: 'x₁ + x₃ ≤ 1 (Acoplamiento de Conflicto)' }
                ]
            ).map((c, idx) => {
              const cId = c.id || `C${idx + 1}`;
              const isFound = parsedTokens.some((t) => t.id === cId) || parsedTokens.some((t) => t.type === 'constraint');
              
              let descText = c.text;
              if (!descText && c.linear) {
                const terms = Object.entries(c.linear).map(([k, v]) => `${v === 1 ? '' : v + '·'}${k}`).join(' + ');
                descText = `${terms} ${c.sense || '<='} ${c.rhs ?? ''}`;
              }
              
              return (
                <div
                  key={cId}
                  className={`p-2.5 rounded-xl border text-xs font-mono transition-all duration-300 ${
                    isFound
                      ? 'bg-amber-950/40 border-amber-500/50 text-amber-200 opacity-100 shadow-[0_0_10px_rgba(255,234,0,0.12)]'
                      : 'bg-slate-900/40 border-white/5 text-slate-600 opacity-40'
                  }`}
                >
                  <div className="font-semibold text-amber-300 text-[11px] mb-0.5">
                    {cId}: {c.name || 'Restricción Lineal'}
                  </div>
                  <div>{descText || c.rawConstraint || `Restricción ${cId}`}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel de Función Objetivo */}
        <div
          className={`bg-[#070b16] rounded-2xl border p-3 shadow-lg transition-all duration-300 ${
            parsedTokens.some((t) => t.type === 'objective')
              ? 'border-purple-500/50 bg-purple-950/20 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.2)]'
              : 'border-white/5 text-slate-600 opacity-40'
          }`}
        >
          <div className="font-mono text-xs font-bold text-purple-300 flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_6px_#c084fc]" />
            Objetivo: {data.code.objective?.sense === 'minimize' ? 'Minimize' : 'Maximize'} ∑ cᵢ xᵢ
          </div>
          <div className="font-mono text-xs text-slate-200">
            {data.code.objective?.rawText
              ? `f(x) = ${data.code.objective.rawText}`
              : data.code.objective?.linear
              ? `f(x) = ${Object.entries(data.code.objective.linear).map(([k, v]) => `${v === 1 ? '' : v + '·'}${k}`).join(' + ')}`
              : 'f(x) = 5·x₁ + 4·x₂ + 7·x₃ + 3·x₄'}
          </div>
        </div>
      </div>
    </div>
  );
}
