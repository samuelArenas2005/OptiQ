import React, { useEffect, useState, useRef } from 'react';
import { animate } from 'animejs';

export default function CircuitComposerStage({ data, isPlaying, speed = 1.0, onComplete }) {
  // Progressive construction state (0 = wires, 1 = Hadamard, 2 = R_ZZ, 3 = R_Z, 4 = R_X, 5 = Layer 2, 6 = Measurement)
  const [constructionStep, setConstructionStep] = useState(0);
  const [wireProgress, setWireProgress] = useState(0);
  const [activeGateInfo, setActiveGateInfo] = useState(null);

  const circuit = data.circuit;
  const wires = circuit.wires || ["q0", "q1", "q2", "q3"];
  const nQ = wires.length;

  const stepDescriptions = [
    { title: "Tracing Quantum Wires", desc: `Initializing ${nQ} qubit registers in the ground state |${'0'.repeat(nQ)}⟩` },
    { title: "Step 1: Uniform Superposition", desc: `Placing Hadamard H gates on all ${nQ} qubits: H|0⟩ = |+⟩` },
    { title: "Step 2: Cost Entanglement R_ZZ", desc: "Coupling qubit pairs according to QUBO topology with rotations e^{-i γ₁ J_ij Z_i Z_j}" },
    { title: "Step 3: Linear R_Z Rotations", desc: "Applying virtual local magnetic fields R_Z(2γ₁ h_i)" },
    { title: "Step 4: Pauli-X Mixer Layer R_X", desc: "Inserting transverse diffusion operators e^{-i β₁ ∑ X_i} with angle β₁" },
    { title: `Step 5: Variational Layer 2 (p=${circuit.pLayers || 2})`, desc: "Building the second ansatz layer with optimal angles (γ₂, β₂)" },
    { title: "Step 6: Measurement Register M", desc: `Coupling projective detectors in computational Z-basis to the ${nQ}-bit classical register` }
  ];

  useEffect(() => {
    // 1. Animate initial wire extension
    let wireTimer;
    let stepTimer;

    let p = 0;
    wireTimer = setInterval(() => {
      if (!isPlaying) return;
      p += 4 * speed;
      if (p >= 100) {
        p = 100;
        clearInterval(wireTimer);
      }
      setWireProgress(p);
    }, 16);

    // 2. Animate sequential gate-by-gate construction
    let currentStepIdx = 0;
    const stepDuration = Math.max(500, 1100 / speed);

    stepTimer = setInterval(() => {
      if (!isPlaying) return;

      currentStepIdx++;
      if (currentStepIdx <= 6) {
        setConstructionStep(currentStepIdx);
      } else {
        clearInterval(stepTimer);
        if (onComplete) onComplete();
      }
    }, stepDuration);

    return () => {
      clearInterval(wireTimer);
      clearInterval(stepTimer);
    };
  }, [isPlaying, speed, onComplete]);

  const handleRebuild = () => {
    setConstructionStep(0);
    setWireProgress(0);
    let p = 0;
    const wireTimer = setInterval(() => {
      p += 5;
      if (p >= 100) {
        p = 100;
        clearInterval(wireTimer);
      }
      setWireProgress(p);
    }, 16);

    let s = 0;
    const stepTimer = setInterval(() => {
      s++;
      if (s <= 6) {
        setConstructionStep(s);
      } else {
        clearInterval(stepTimer);
      }
    }, 900);
  };

  return (
    <div className="w-full h-full flex flex-col p-4 text-white overflow-hidden select-none">
      {/* Quantum Composer Header */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-cyan-500/20">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#38bdf8]" />
          <span className="font-mono text-xs font-bold text-cyan-300 tracking-wider uppercase">
            5. Progressive QAOA Circuit Construction ({nQ}-Qubit Ansatz)
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span className="text-amber-400 bg-amber-950/40 px-2.5 py-0.5 rounded border border-amber-500/30">
            Phase {constructionStep + 1} of 7: {stepDescriptions[constructionStep]?.title}
          </span>
          <button
            onClick={handleRebuild}
            className="px-2 py-0.5 rounded bg-white/10 hover:bg-cyan-500/20 border border-white/10 text-cyan-300 cursor-pointer transition-all"
            title="Rebuild animation"
          >
            🔄 Rebuild
          </button>
        </div>
      </div>

      {/* Quantum Composer Board */}
      <div className="flex-1 bg-[#070b16] rounded-2xl border border-cyan-500/30 p-5 shadow-[0_0_20px_rgba(0,242,254,0.12)] relative overflow-hidden flex flex-col justify-center">
        {/* Assembly stage descriptive banner */}
        <div className="mb-4 p-2.5 rounded-xl bg-black/60 border border-cyan-500/20 font-mono text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-white font-bold">{stepDescriptions[constructionStep]?.title}:</span>
            <span>{stepDescriptions[constructionStep]?.desc}</span>
          </div>
          <span className="text-[10px] text-cyan-400 font-bold hidden sm:inline">
            Dynamic Layer-by-Layer Construction
          </span>
        </div>

        {/* Quantum Wires and Animated Gates */}
        <div className="space-y-6 relative py-2">
          {wires.map((wireName, qIdx) => (
            <div key={wireName} className="relative flex items-center h-12">
              {/* Initial qubit label |0⟩ */}
              <div className="w-24 shrink-0 font-mono text-xs font-bold text-cyan-300 flex items-center gap-1.5 z-20 bg-[#070b16] pr-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#38bdf8]" />
                <span>|0⟩_{`q${qIdx}`}</span>
              </div>

              {/* Progressively extending quantum wire */}
              <div className="absolute left-24 right-0 h-[2px] bg-slate-800 z-0">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 via-sky-400 to-cyan-300 shadow-[0_0_10px_#00f2fe] transition-all duration-75"
                  style={{ width: `${wireProgress}%` }}
                />
              </div>

              {/* Gate container with appearance transitions */}
              <div className="flex-1 flex items-center justify-around pl-4 z-10">
                {/* 1. Hadamard Superposition H (Step >= 1) */}
                <div
                  className={`w-9 h-9 rounded-xl font-mono font-bold text-xs flex items-center justify-center transition-all duration-500 transform ${
                    constructionStep >= 1
                      ? 'translate-y-0 opacity-100 scale-100 bg-sky-600/40 border-2 border-sky-400 text-white shadow-[0_0_12px_rgba(56,189,248,0.5)]'
                      : '-translate-y-8 opacity-0 scale-50 pointer-events-none'
                  }`}
                  onMouseEnter={() =>
                    setActiveGateInfo({
                      name: 'Hadamard H',
                      formula: 'H = 1/√2 [[1, 1], [1, -1]]',
                      desc: 'Creates uniform quantum superposition with equal probability across all states.',
                    })
                  }
                >
                  H
                </div>

                {/* 2. Cost Layer 1: R_ZZ Entanglement (Step >= 2) */}
                <div
                  className={`relative w-10 h-9 rounded-xl font-mono font-bold text-[10px] flex items-center justify-center transition-all duration-500 transform ${
                    constructionStep >= 2
                      ? 'translate-y-0 opacity-100 scale-100 bg-purple-950/70 border-2 border-purple-400 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.5)]'
                      : 'translate-x-8 opacity-0 scale-50 pointer-events-none'
                  }`}
                  onMouseEnter={() =>
                    setActiveGateInfo({
                      name: 'R_ZZ Gate (2γ₁ J_ij)',
                      formula: 'exp(-i γ₁ J_ij Z_i ⊗ Z_j)',
                      desc: `Entangles qubit q${qIdx} with adjacent qubits according to the Cost Hamiltonian.`,
                    })
                  }
                >
                  R_ZZ
                  {/* Vertical visual connector if the qubit is coupled with another */}
                  {qIdx < wires.length - 1 && constructionStep >= 2 && (
                    <div className="absolute top-9 left-1/2 w-[2px] h-6 bg-purple-400 shadow-[0_0_6px_#c084fc] z-0 pointer-events-none" />
                  )}
                </div>

                {/* 3. Cost Z Rotation (Step >= 3) */}
                <div
                  className={`w-9 h-9 rounded-xl font-mono font-bold text-[10px] flex items-center justify-center transition-all duration-500 transform ${
                    constructionStep >= 3
                      ? 'translate-y-0 opacity-100 scale-100 bg-pink-950/60 border-2 border-pink-400 text-pink-200 shadow-[0_0_10px_rgba(236,72,153,0.4)]'
                      : '-translate-y-8 opacity-0 scale-50 pointer-events-none'
                  }`}
                  onMouseEnter={() =>
                    setActiveGateInfo({
                      name: 'R_Z Rotation (2γ₁ h_i)',
                      formula: 'exp(-i γ₁ h_i Z_i)',
                      desc: `Applies the phase dependent on the linear term h_${qIdx} of the QUBO problem.`,
                    })
                  }
                >
                  R_Z
                </div>

                {/* 4. Quantum Mixer R_X(β₁) (Step >= 4) */}
                <div
                  className={`w-9 h-9 rounded-xl font-mono font-bold text-[10px] flex items-center justify-center transition-all duration-500 transform ${
                    constructionStep >= 4
                      ? 'translate-y-0 opacity-100 scale-100 bg-amber-950/70 border-2 border-amber-400 text-amber-200 shadow-[0_0_12px_rgba(255,234,0,0.5)]'
                      : 'translate-x-8 opacity-0 scale-50 pointer-events-none'
                  }`}
                  onMouseEnter={() =>
                    setActiveGateInfo({
                      name: 'Mixer R_X(2β₁)',
                      formula: 'exp(-i β₁ X_i) = cos(β₁) I - i sin(β₁) X',
                      desc: 'Introduces destructive quantum interference on non-optimal states.',
                    })
                  }
                >
                  R_X
                </div>

                {/* 5. QAOA Layer 2: R_ZZ and R_X (Step >= 5) */}
                <div
                  className={`w-10 h-9 rounded-xl font-mono font-bold text-[10px] flex items-center justify-center transition-all duration-500 transform ${
                    constructionStep >= 5
                      ? 'translate-y-0 opacity-100 scale-100 bg-purple-950/70 border-2 border-purple-400 text-purple-200 shadow-[0_0_10px_rgba(168,85,247,0.4)]'
                      : '-translate-y-8 opacity-0 scale-50 pointer-events-none'
                  }`}
                  title="Layer 2 Cost R_ZZ(2γ₂)"
                >
                  R_ZZ
                </div>

                <div
                  className={`w-9 h-9 rounded-xl font-mono font-bold text-[10px] flex items-center justify-center transition-all duration-500 transform ${
                    constructionStep >= 5
                      ? 'translate-y-0 opacity-100 scale-100 bg-amber-950/70 border-2 border-amber-400 text-amber-200 shadow-[0_0_10px_rgba(255,234,0,0.4)]'
                      : 'translate-x-8 opacity-0 scale-50 pointer-events-none'
                  }`}
                  title="Layer 2 Mixer R_X(2β₂)"
                >
                  R_X
                </div>

                {/* 6. Projective Measurement M (Step >= 6) */}
                <div
                  className={`w-9 h-9 rounded-xl font-mono font-bold text-xs flex items-center justify-center transition-all duration-500 transform ${
                    constructionStep >= 6
                      ? 'translate-y-0 opacity-100 scale-100 bg-emerald-950/80 border-2 border-emerald-400 text-emerald-300 shadow-[0_0_14px_rgba(0,255,136,0.6)] animate-pulse'
                      : 'translate-y-8 opacity-0 scale-50 pointer-events-none'
                  }`}
                  onMouseEnter={() =>
                    setActiveGateInfo({
                      name: 'Measurement M (Z-Basis)',
                      formula: 'M = |0⟩⟨0| + |1⟩⟨1|',
                      desc: `Collapses the superposition into a binary bitstring x ∈ {0, 1}^${nQ}.`,
                    })
                  }
                >
                  M
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Information panel on gate hover */}
        {activeGateInfo && (
          <div className="mt-3 p-2 rounded-xl bg-slate-900/90 border border-cyan-500/40 font-mono text-xs flex items-center justify-between animate-in fade-in">
            <div>
              <span className="font-bold text-cyan-300">{activeGateInfo.name}:</span>{' '}
              <span className="text-slate-300">{activeGateInfo.desc}</span>
            </div>
            <span className="text-amber-400 font-bold bg-black/60 px-2 py-0.5 rounded border border-white/10 ml-2 shrink-0">
              {activeGateInfo.formula}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
