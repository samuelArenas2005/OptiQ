import React from 'react';
import { API_BASE } from '../services/quantumApi';

export default function Header() {
  return (
    <header className="w-full bg-surface-container-lowest border-b border-outline-variant/60 px-6 py-3 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-on-primary shadow-sm">
            <span className="material-symbols-outlined text-[20px]">all_inclusive</span>
          </div>
          <span className="font-headline-sm text-[18px] text-on-surface font-bold tracking-tight">OptiQ</span>
        </div>
        <span className="hidden sm:inline-block text-xs font-mono text-outline-variant/80 border-l border-outline-variant/40 pl-3">
          Quantum Declarative IDE
        </span>
      </div>

      {/* Attribution Badge */}
      <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-low border border-outline-variant/40 text-[11px] font-mono text-outline shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span>This effort is supported by Qollab &amp; IonQ</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 text-on-surface-variant">
          <button
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container-low hover:text-on-surface transition-colors cursor-pointer"
            title="Environment settings"
            onClick={() => alert(`Server configuration:\nBackend API connected at: ${API_BASE}`)}
          >
            <span className="material-symbols-outlined text-[18px]">settings</span>
          </button>
        </div>
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-sm text-on-primary">
          <span className="material-symbols-outlined text-[18px]">person</span>
        </div>
      </div>
    </header>
  );
}
