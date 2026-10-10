import React from 'react';

export default function AtomLoader({ statusMessage, step = 1, totalSteps = 4 }) {
  return (
    <div className="flex-1 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm p-6 flex flex-col items-center justify-center gap-5 min-h-[360px]">
      <div className="relative w-36 h-36 flex items-center justify-center">
        <svg viewBox="0 0 160 160" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="orbit-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#004ac6" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="orbit-grad-2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#006a61" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#004ac6" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="orbit-grad-3" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6a1edb" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#006a61" stopOpacity="0.2" />
            </linearGradient>
            <filter id="atom-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Orbit 1: 0 deg */}
          <g className="atom-orbit orbit-1">
            <ellipse cx="80" cy="80" rx="64" ry="24" fill="none" stroke="url(#orbit-grad-1)" strokeWidth="1.8" />
            <circle cx="144" cy="80" r="3.5" fill="#004ac6" filter="url(#atom-glow)" className="electron electron-1" />
          </g>

          {/* Orbit 2: 60 deg */}
          <g className="atom-orbit orbit-2">
            <ellipse cx="80" cy="80" rx="64" ry="24" fill="none" stroke="url(#orbit-grad-2)" strokeWidth="1.8" transform="rotate(60 80 80)" />
            <circle cx="144" cy="80" r="3.5" fill="#006a61" filter="url(#atom-glow)" className="electron electron-2" transform="rotate(60 80 80)" />
          </g>

          {/* Orbit 3: 120 deg */}
          <g className="atom-orbit orbit-3">
            <ellipse cx="80" cy="80" rx="64" ry="24" fill="none" stroke="url(#orbit-grad-3)" strokeWidth="1.8" transform="rotate(120 80 80)" />
            <circle cx="144" cy="80" r="3.5" fill="#6a1edb" filter="url(#atom-glow)" className="electron electron-3" transform="rotate(120 80 80)" />
          </g>

          {/* Central Quantum Nucleus */}
          <circle cx="80" cy="80" r="7.5" fill="#004ac6" filter="url(#atom-glow)" className="atom-nucleus" />
          <circle cx="80" cy="80" r="3.5" fill="#ffffff" />
        </svg>
      </div>

      <div className="flex flex-col items-center gap-2 max-w-xs text-center">
        <h4 className="font-headline-sm text-headline-sm text-on-surface">
          {statusMessage || 'Ejecutando algoritmo QAOA...'}
        </h4>
        <div className="w-44 h-1.5 bg-surface-container rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300 rounded-full"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
        <span className="font-code-sm text-code-sm text-on-surface-variant">
          Paso {step} de {totalSteps} • Despacho cuántico
        </span>
      </div>
    </div>
  );
}
