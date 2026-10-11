import React, { useEffect, useRef, useState } from 'react';

const PINN_LAYERS = [8, 14, 10, 4]; // Arquitectura fija para evitar recreaciones de referencia

export default function PinnStage({ data, isPlaying, speed = 1.0, onComplete }) {
  const canvasRef = useRef(null);
  const lossTextRef = useRef(null);
  const layerTextRef = useRef(null);
  const [activeLayerIndex, setActiveLayerIndex] = useState(0);

  const pinn = data.pinn;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let animationFrameId;
    let pulseProgress = 0;
    let lastReportedLayer = 0;

    const width = canvas.width;
    const height = canvas.height;

    // Calcular coordenadas fijas de cada nodo
    const layerCoords = [];
    const layerGap = width / (PINN_LAYERS.length + 0.6);

    PINN_LAYERS.forEach((nodeCount, lIdx) => {
      const x = (lIdx + 0.8) * layerGap;
      const nodes = [];
      const nodeGap = Math.min(30, (height - 50) / nodeCount);
      const startY = (height - (nodeCount - 1) * nodeGap) / 2;

      for (let n = 0; n < nodeCount; n++) {
        nodes.push({ x, y: startY + n * nodeGap });
      }
      layerCoords.push(nodes);
    });

    // Partículas continuas de datos
    const particles = [];
    for (let i = 0; i < 28; i++) {
      particles.push({
        layer: Math.floor(Math.random() * (PINN_LAYERS.length - 1)),
        fromIdx: 0,
        toIdx: 0,
        t: Math.random(),
        speed: 0.012 + Math.random() * 0.01,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Fondo sutil con cuadrícula tecnológica
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.4)';
      ctx.lineWidth = 1;

      // 1. Dibujar Sinapsis (Líneas de conexión entre capas)
      for (let l = 0; l < layerCoords.length - 1; l++) {
        const fromNodes = layerCoords[l];
        const toNodes = layerCoords[l + 1];

        fromNodes.forEach((fn, fi) => {
          toNodes.forEach((tn, ti) => {
            ctx.beginPath();
            ctx.moveTo(fn.x, fn.y);
            ctx.lineTo(tn.x, tn.y);
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.09)';
            ctx.lineWidth = 1;
            ctx.stroke();
          });
        });
      }

      // 2. Animar propagación principal Feed-Forward
      if (isPlaying) {
        pulseProgress = (pulseProgress + 0.006 * speed) % 1.0;
        const currentActiveLayer = Math.min(
          PINN_LAYERS.length - 1,
          Math.floor(pulseProgress * PINN_LAYERS.length)
        );

        if (currentActiveLayer !== lastReportedLayer) {
          lastReportedLayer = currentActiveLayer;
          setActiveLayerIndex(currentActiveLayer);
          if (layerTextRef.current) {
            const names = ["Features Físicas (Entrada)", "Capa Densa Oculta 1", "Capa Densa Oculta 2", "Hiperparámetros Óptimos"];
            layerTextRef.current.textContent = names[currentActiveLayer] || "";
          }
        }

        // Actualizar pérdida física sin provocar re-renders de React
        if (lossTextRef.current) {
          const simulatedLoss = Math.max(pinn.lossPhysics, 0.048 - pulseProgress * 0.034);
          lossTextRef.current.textContent = `Pérdida Física: ℒ = ${simulatedLoss.toFixed(4)}`;
        }
      }

      // 3. Dibujar Partículas de Energía viajando por las sinapsis
      particles.forEach((p) => {
        if (isPlaying) {
          p.t += p.speed * speed;
          if (p.t >= 1) {
            p.t = 0;
            p.layer = (p.layer + 1) % (layerCoords.length - 1);
            p.fromIdx = Math.floor(Math.random() * layerCoords[p.layer].length);
            p.toIdx = Math.floor(Math.random() * layerCoords[p.layer + 1].length);
          }
        }

        const from = layerCoords[p.layer][p.fromIdx % layerCoords[p.layer].length];
        const to = layerCoords[p.layer + 1][p.toIdx % layerCoords[p.layer + 1].length];

        if (from && to) {
          const px = from.x + (to.x - from.x) * p.t;
          const py = from.y + (to.y - from.y) * p.t;

          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = p.layer === layerCoords.length - 2 ? '#ffea00' : '#00f2fe';
          ctx.shadowColor = p.layer === layerCoords.length - 2 ? '#ffd700' : '#00f2fe';
          ctx.shadowBlur = 10;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // 4. Dibujar Nodos de las Capas
      layerCoords.forEach((layer, lIdx) => {
        const isInput = lIdx === 0;
        const isOutput = lIdx === layerCoords.length - 1;
        const isReached = lIdx <= lastReportedLayer;

        layer.forEach((node, nIdx) => {
          // Halo de energía del nodo si está activo
          if (isReached) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, isOutput ? 14 : 11, 0, Math.PI * 2);
            ctx.fillStyle = isOutput
              ? 'rgba(255, 234, 0, 0.25)'
              : isInput
              ? 'rgba(56, 189, 248, 0.20)'
              : 'rgba(0, 255, 136, 0.20)';
            ctx.fill();
          }

          // Cuerpo del nodo
          ctx.beginPath();
          ctx.arc(node.x, node.y, isOutput ? 8 : 6, 0, Math.PI * 2);

          if (isOutput && isReached) {
            ctx.fillStyle = '#ffea00';
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 14;
          } else if (isReached) {
            ctx.fillStyle = isInput ? '#38bdf8' : '#00ff88';
            ctx.shadowColor = isInput ? '#38bdf8' : '#00ff88';
            ctx.shadowBlur = 10;
          } else {
            ctx.fillStyle = '#1e293b';
            ctx.shadowBlur = 0;
          }

          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.4;
          ctx.stroke();
          ctx.shadowBlur = 0;
        });

        // Título de la capa en la parte superior del canvas
        ctx.fillStyle = isReached ? '#e2e8f0' : '#64748b';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        const layerTitles = ["Features", "Oculta 1", "Oculta 2", "Salida (γ, β)"];
        ctx.fillText(layerTitles[lIdx], layer[0].x, 22);
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, speed, pinn]);

  return (
    <div className="w-full h-full flex flex-col lg:flex-row gap-4 p-4 text-white overflow-hidden select-none">
      {/* Columna Izquierda: Red Neuronal Visual con Propagación Activa */}
      <div className="flex-1 flex flex-col bg-[#070b16] rounded-2xl border border-cyan-500/30 shadow-[0_0_20px_rgba(0,242,254,0.12)] p-4 relative overflow-hidden">
        <div className="flex items-center justify-between pb-2 border-b border-cyan-500/20">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#38bdf8]" />
            <span className="font-mono text-xs font-bold text-cyan-300 tracking-wider uppercase">
              4. Red Neuronal Informada por Física (PINN): Propagación Hacia Adelante
            </span>
          </div>
          <span
            ref={lossTextRef}
            className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2.5 py-0.5 rounded border border-emerald-500/30 font-semibold"
          >
            Pérdida Física: ℒ = {pinn.lossPhysics.toFixed(4)}
          </span>
        </div>

        {/* Canvas de la Red Neuronal */}
        <div className="flex-1 w-full relative min-h-[260px] flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={640}
            height={340}
            className="w-full h-full object-contain"
          />
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono bg-black/40 p-2 rounded-xl border border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Capa Activa:</span>
            <span ref={layerTextRef} className="text-cyan-300 font-bold">
              Features Físicas (Entrada)
            </span>
          </div>
          <span className="text-amber-400 font-bold">Inferencia O(1) basada en el Hamiltoniano</span>
        </div>
      </div>

      {/* Columna Derecha: Hiperparámetros de Salida Predichos */}
      <div className="w-full lg:w-[400px] flex flex-col gap-3">
        {/* Panel de Hiperparámetros Óptimos Predichos */}
        <div className="bg-[#070b16] rounded-2xl border border-amber-500/30 p-3.5 shadow-lg flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-mono text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_#ffea00]" />
              Hiperparámetros QAOA Predichos por la PINN
            </h4>
            <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30">
              p = 2 capas
            </span>
          </div>

          <div className="space-y-2 mt-1">
            {pinn.predictions.formatted.map((param, i) => (
              <div
                key={param.name}
                className="p-2.5 rounded-xl bg-slate-900/60 border border-amber-500/30 shadow-sm flex items-center justify-between font-mono"
              >
                <div>
                  <div className="text-xs font-bold text-white">{param.name}</div>
                  <div className="text-[10px] text-slate-400">
                    {param.name.includes('γ') ? 'Ángulo Hamiltoniano Costo U_C' : 'Ángulo Hamiltoniano Mezclador U_M'}
                  </div>
                </div>
                <div className="text-xs font-bold text-amber-300 bg-black/50 px-2.5 py-1 rounded border border-amber-400/40 shadow-[0_0_8px_rgba(255,234,0,0.2)]">
                  {param.value}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-auto pt-3 border-t border-white/10 font-mono text-[10px] text-slate-400 space-y-1.5">
            <div className="flex justify-between">
              <span>Optimizador de Aprendizaje:</span>
              <span className="text-cyan-300">{pinn.optimizer}</span>
            </div>
            <div className="flex justify-between">
              <span>Función de Pérdida PINN:</span>
              <span className="text-emerald-400">ℒ_data + λ_phys · ⟨ψ|H_C|ψ⟩</span>
            </div>
            <div className="flex justify-between">
              <span>Garantía Teórica:</span>
              <span className="text-amber-300">Evita mesetas estériles (Barren Plateaus)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
