import React, { useEffect, useState, useRef } from 'react';
import { animate } from 'animejs';

export default function CircuitComposerStage({ data, isPlaying, speed = 1.0, onComplete }) {
  // Estado de construcción progresiva (0 = cables, 1 = Hadamard, 2 = R_ZZ, 3 = R_Z, 4 = R_X, 5 = Capa 2, 6 = Medición)
  const [constructionStep, setConstructionStep] = useState(0);
  const [wireProgress, setWireProgress] = useState(0);
  const [activeGateInfo, setActiveGateInfo] = useState(null);

  const circuit = data.circuit;
  const wires = circuit.wires || ["q0", "q1", "q2", "q3"];
  const nQ = wires.length;

  const stepDescriptions = [
    { title: "Trazando Hilos Cuánticos", desc: `Inicializando ${nQ} registros de qubits en el estado fundamental |${'0'.repeat(nQ)}⟩` },
    { title: "Paso 1: Superposición Uniforme", desc: `Colocando compuertas Hadamard H en todos los ${nQ} qubits: H|0⟩ = |+⟩` },
    { title: "Paso 2: Entrelazamiento de Costo R_ZZ", desc: "Acoplando pares de qubits según la topología QUBO con rotaciones e^{-i γ₁ J_ij Z_i Z_j}" },
    { title: "Paso 3: Rotaciones Lineales R_Z", desc: "Aplicando campos magnéticos virtuales locales R_Z(2γ₁ h_i)" },
    { title: "Paso 4: Capa Mezcladora Pauli-X R_X", desc: "Insertando operadores de difusión transversal e^{-i β₁ ∑ X_i} con ángulo β₁" },
    { title: `Paso 5: Capa Variacional 2 (p=${circuit.pLayers || 2})`, desc: "Construyendo la segunda capa de ansatz con ángulos óptimos (γ₂, β₂)" },
    { title: "Paso 6: Registro de Medición M", desc: `Acoplando detectores proyectivos en base computacional Z hacia el registro clásico de ${nQ} bits` }
  ];

  useEffect(() => {
    // 1. Animar extensión inicial de los cables
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

    // 2. Animar construcción secuencial compuerta por compuerta
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
      {/* Encabezado del Quantum Composer */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-cyan-500/20">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#38bdf8]" />
          <span className="font-mono text-xs font-bold text-cyan-300 tracking-wider uppercase">
            5. Construcción Progresiva del Circuito QAOA (Ansatz de {nQ} Qubits)
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span className="text-amber-400 bg-amber-950/40 px-2.5 py-0.5 rounded border border-amber-500/30">
            Fase {constructionStep + 1} de 7: {stepDescriptions[constructionStep]?.title}
          </span>
          <button
            onClick={handleRebuild}
            className="px-2 py-0.5 rounded bg-white/10 hover:bg-cyan-500/20 border border-white/10 text-cyan-300 cursor-pointer transition-all"
            title="Reconstruir animación"
          >
            🔄 Reconstruir
          </button>
        </div>
      </div>

      {/* Tablero del Quantum Composer */}
      <div className="flex-1 bg-[#070b16] rounded-2xl border border-cyan-500/30 p-5 shadow-[0_0_20px_rgba(0,242,254,0.12)] relative overflow-hidden flex flex-col justify-center">
        {/* Banner descriptivo de la etapa de ensamblado */}
        <div className="mb-4 p-2.5 rounded-xl bg-black/60 border border-cyan-500/20 font-mono text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-white font-bold">{stepDescriptions[constructionStep]?.title}:</span>
            <span>{stepDescriptions[constructionStep]?.desc}</span>
          </div>
          <span className="text-[10px] text-cyan-400 font-bold hidden sm:inline">
            Construcción Dinámica por Capas
          </span>
        </div>

        {/* Hilos Cuánticos y Compuertas Animadas */}
        <div className="space-y-6 relative py-2">
          {wires.map((wireName, qIdx) => (
            <div key={wireName} className="relative flex items-center h-12">
              {/* Etiqueta del qubit inicial |0⟩ */}
              <div className="w-24 shrink-0 font-mono text-xs font-bold text-cyan-300 flex items-center gap-1.5 z-20 bg-[#070b16] pr-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#38bdf8]" />
                <span>|0⟩_{`q${qIdx}`}</span>
              </div>

              {/* Hilo cuántico animado que se extiende progresivamente */}
              <div className="absolute left-24 right-0 h-[2px] bg-slate-800 z-0">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 via-sky-400 to-cyan-300 shadow-[0_0_10px_#00f2fe] transition-all duration-75"
                  style={{ width: `${wireProgress}%` }}
                />
              </div>

              {/* Contenedor de compuertas con transiciones de aparición */}
              <div className="flex-1 flex items-center justify-around pl-4 z-10">
                {/* 1. Superposición Hadamard H (Paso >= 1) */}
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
                      desc: 'Crea superposición cuántica uniforme con igual probabilidad en todos los estados.',
                    })
                  }
                >
                  H
                </div>

                {/* 2. Capa Costo 1: Entrelazamiento R_ZZ (Paso >= 2) */}
                <div
                  className={`relative w-10 h-9 rounded-xl font-mono font-bold text-[10px] flex items-center justify-center transition-all duration-500 transform ${
                    constructionStep >= 2
                      ? 'translate-y-0 opacity-100 scale-100 bg-purple-950/70 border-2 border-purple-400 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.5)]'
                      : 'translate-x-8 opacity-0 scale-50 pointer-events-none'
                  }`}
                  onMouseEnter={() =>
                    setActiveGateInfo({
                      name: 'Compuerta R_ZZ(2γ₁ J_ij)',
                      formula: 'exp(-i γ₁ J_ij Z_i ⊗ Z_j)',
                      desc: `Entrelaza el qubit q${qIdx} con los qubits adyacentes según el Hamiltoniano de Costo.`,
                    })
                  }
                >
                  R_ZZ
                  {/* Conector vertical visual si el qubit está acoplado con otro */}
                  {qIdx < wires.length - 1 && constructionStep >= 2 && (
                    <div className="absolute top-9 left-1/2 w-[2px] h-6 bg-purple-400 shadow-[0_0_6px_#c084fc] z-0 pointer-events-none" />
                  )}
                </div>

                {/* 3. Rotación Z de Costo (Paso >= 3) */}
                <div
                  className={`w-9 h-9 rounded-xl font-mono font-bold text-[10px] flex items-center justify-center transition-all duration-500 transform ${
                    constructionStep >= 3
                      ? 'translate-y-0 opacity-100 scale-100 bg-pink-950/60 border-2 border-pink-400 text-pink-200 shadow-[0_0_10px_rgba(236,72,153,0.4)]'
                      : '-translate-y-8 opacity-0 scale-50 pointer-events-none'
                  }`}
                  onMouseEnter={() =>
                    setActiveGateInfo({
                      name: 'Rotación R_Z(2γ₁ h_i)',
                      formula: 'exp(-i γ₁ h_i Z_i)',
                      desc: `Aplica la fase dependiente del término lineal h_${qIdx} del problema QUBO.`,
                    })
                  }
                >
                  R_Z
                </div>

                {/* 4. Mezclador Cuántico R_X(β₁) (Paso >= 4) */}
                <div
                  className={`w-9 h-9 rounded-xl font-mono font-bold text-[10px] flex items-center justify-center transition-all duration-500 transform ${
                    constructionStep >= 4
                      ? 'translate-y-0 opacity-100 scale-100 bg-amber-950/70 border-2 border-amber-400 text-amber-200 shadow-[0_0_12px_rgba(255,234,0,0.5)]'
                      : 'translate-x-8 opacity-0 scale-50 pointer-events-none'
                  }`}
                  onMouseEnter={() =>
                    setActiveGateInfo({
                      name: 'Mezclador R_X(2β₁)',
                      formula: 'exp(-i β₁ X_i) = cos(β₁) I - i sin(β₁) X',
                      desc: 'Introduce interferencia cuántica destructiva en estados no óptimos.',
                    })
                  }
                >
                  R_X
                </div>

                {/* 5. Capa 2 QAOA: R_ZZ y R_X (Paso >= 5) */}
                <div
                  className={`w-10 h-9 rounded-xl font-mono font-bold text-[10px] flex items-center justify-center transition-all duration-500 transform ${
                    constructionStep >= 5
                      ? 'translate-y-0 opacity-100 scale-100 bg-purple-950/70 border-2 border-purple-400 text-purple-200 shadow-[0_0_10px_rgba(168,85,247,0.4)]'
                      : '-translate-y-8 opacity-0 scale-50 pointer-events-none'
                  }`}
                  title="Capa 2 Costo R_ZZ(2γ₂)"
                >
                  R_ZZ
                </div>

                <div
                  className={`w-9 h-9 rounded-xl font-mono font-bold text-[10px] flex items-center justify-center transition-all duration-500 transform ${
                    constructionStep >= 5
                      ? 'translate-y-0 opacity-100 scale-100 bg-amber-950/70 border-2 border-amber-400 text-amber-200 shadow-[0_0_10px_rgba(255,234,0,0.4)]'
                      : 'translate-x-8 opacity-0 scale-50 pointer-events-none'
                  }`}
                  title="Capa 2 Mezclador R_X(2β₂)"
                >
                  R_X
                </div>

                {/* 6. Medición Proyectiva M (Paso >= 6) */}
                <div
                  className={`w-9 h-9 rounded-xl font-mono font-bold text-xs flex items-center justify-center transition-all duration-500 transform ${
                    constructionStep >= 6
                      ? 'translate-y-0 opacity-100 scale-100 bg-emerald-950/80 border-2 border-emerald-400 text-emerald-300 shadow-[0_0_14px_rgba(0,255,136,0.6)] animate-pulse'
                      : 'translate-y-8 opacity-0 scale-50 pointer-events-none'
                  }`}
                  onMouseEnter={() =>
                    setActiveGateInfo({
                      name: 'Medición M (Z-Basis)',
                      formula: 'M = |0⟩⟨0| + |1⟩⟨1|',
                      desc: `Colapsa la superposición hacia un bitstring binario x ∈ {0, 1}^${nQ}.`,
                    })
                  }
                >
                  M
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Panel de Información al pasar el ratón por una compuerta */}
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
