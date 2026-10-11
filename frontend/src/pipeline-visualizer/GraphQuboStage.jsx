import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { animate, stagger } from 'animejs';

export default function GraphQuboStage({ data, isPlaying, speed = 1.0, onComplete }) {
  const mountRef = useRef(null);
  const matrixRef = useRef(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [activeEdgeIndex, setActiveEdgeIndex] = useState(0);

  const qubo = data.qubo;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Three.js Scene Setup
    const width = container.clientWidth || 480;
    const height = container.clientHeight || 360;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060913);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 8.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Iluminación
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0x00f2fe, 3, 20);
    pointLight.position.set(0, 0, 5);
    scene.add(pointLight);

    const graphGroup = new THREE.Group();
    scene.add(graphGroup);

    // 1. Crear Nodos 3D (Qubits)
    const nodeMeshes = [];
    qubo.nodes.forEach((node) => {
      // Esfera del nodo
      const geometry = new THREE.SphereGeometry(0.38, 32, 32);
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(node.color),
        emissive: new THREE.Color(node.color),
        emissiveIntensity: 0.85,
        roughness: 0.2,
        metalness: 0.5,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(node.x, node.y, node.z);
      graphGroup.add(mesh);

      // Anillo orbital de energía neón
      const ringGeo = new THREE.RingGeometry(0.5, 0.56, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(node.color),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.copy(mesh.position);
      graphGroup.add(ringMesh);

      // Etiqueta de texto de canvas
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`q${node.id}`, 64, 42);
      const texture = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.set(node.x, node.y + 0.65, node.z);
      sprite.scale.set(0.9, 0.45, 1);
      graphGroup.add(sprite);

      nodeMeshes.push({ mesh, ringMesh, data: node });
    });

    // 2. Crear Enlaces 3D (Acoplamientos Cuadráticos J_ij)
    const edgeMeshes = [];
    (qubo.edges || []).forEach((edge, i) => {
      const uNode = qubo.nodes[edge.u] || qubo.nodes.find(n => n.id === edge.u);
      const vNode = qubo.nodes[edge.v] || qubo.nodes.find(n => n.id === edge.v);
      if (!uNode || !vNode) return;

      const start = new THREE.Vector3(uNode.x, uNode.y, uNode.z);
      const end = new THREE.Vector3(vNode.x, vNode.y, vNode.z);

      const path = new THREE.LineCurve3(start, end);
      const tubeGeo = new THREE.TubeGeometry(path, 20, 0.05, 8, false);
      const tubeMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x00f2fe,
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0.85,
      });
      const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
      graphGroup.add(tubeMesh);

      // Partícula de pulso cuántico que viaja por el enlace
      const pulseGeo = new THREE.SphereGeometry(0.12, 16, 16);
      const pulseMat = new THREE.MeshBasicMaterial({ color: 0xffea00 });
      const pulseMesh = new THREE.Mesh(pulseGeo, pulseMat);
      graphGroup.add(pulseMesh);

      edgeMeshes.push({ tubeMesh, pulseMesh, start, end, progress: Math.random() });
    });

    // Bucle de animación Three.js
    let reqId;
    const clock = new THREE.Clock();

    const animate = () => {
      reqId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      // Rotación suave del grafo completo
      if (isPlaying) {
        graphGroup.rotation.y += 0.3 * delta * speed;
        graphGroup.rotation.x = Math.sin(clock.getElapsedTime() * 0.5) * 0.1;
      }

      // Animación de partículas a lo largo de los enlaces
      edgeMeshes.forEach((em) => {
        if (isPlaying) {
          em.progress = (em.progress + delta * 0.8 * speed) % 1.0;
        }
        em.pulseMesh.position.lerpVectors(em.start, em.end, em.progress);
      });

      // Giro de los anillos orbitales
      nodeMeshes.forEach((nm, idx) => {
        nm.ringMesh.rotation.z += (idx % 2 === 0 ? 1 : -1) * delta * 1.5;
      });

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [isPlaying, speed, qubo]);

  // Animación de la matriz QUBO usando anime.js
  useEffect(() => {
    if (matrixRef.current) {
      animate(matrixRef.current.querySelectorAll('.matrix-cell'), {
        scale: [0.7, 1],
        opacity: [0, 1],
        delay: stagger(60),
        ease: 'outElastic(1, .8)',
      });
    }
  }, []);

  return (
    <div className="w-full h-full flex flex-col lg:flex-row gap-4 p-4 text-white overflow-hidden select-none">
      {/* Columna Izquierda: Visualizador 3D del Grafo Cuántico de Qubits */}
      <div className="flex-1 flex flex-col bg-[#070b16] rounded-2xl border border-cyan-500/30 shadow-[0_0_20px_rgba(0,242,254,0.12)] p-4 relative overflow-hidden">
        <div className="flex items-center justify-between pb-2 border-b border-cyan-500/20">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#38bdf8]" />
            <span className="font-mono text-xs font-bold text-cyan-300 tracking-wider uppercase">
              2. Topología de Acoplamientos Cuánticos (V={qubo.nodes.length}, E={qubo.edges.length})
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 bg-black/40 px-2 py-0.5 rounded border border-white/10">
            Nodos = Qubits | Enlaces = J_ij
          </span>
        </div>

        {/* Canvas de Three.js */}
        <div ref={mountRef} className="flex-1 w-full relative min-h-[260px] cursor-grab" />

        <div className="flex items-center justify-between text-[11px] font-mono bg-black/40 p-2 rounded-xl border border-white/5 mt-1">
          <span className="text-slate-400">
            Acoplamientos Antiferromagnéticos (J &gt; 0) favorecen estados de espín opuestos
          </span>
          <span className="text-cyan-400 font-bold">λ_penalización = {qubo.penaltyLambda}</span>
        </div>
      </div>

      {/* Columna Derecha: Formulación Matemática del Hamiltoniano e Hiper-matriz QUBO */}
      <div className="w-full lg:w-[420px] flex flex-col gap-3">
        {/* Ecuación del Hamiltoniano de Ising */}
        <div className="bg-[#070b16] rounded-2xl border border-cyan-500/30 p-3.5 shadow-lg">
          <h4 className="font-mono text-xs font-bold text-cyan-300 mb-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#00f2fe]" />
            Hamiltoniano de Costo Cuántico H_C (Ising)
          </h4>
          <div className="bg-black/60 p-2.5 rounded-xl border border-cyan-500/20 font-mono text-xs text-cyan-200 text-center leading-relaxed shadow-inner">
            <div className="text-[13px] font-bold text-white mb-1">
              H_C = ∑ hᵢ Zᵢ + ∑ Jᵢⱼ Zᵢ Zⱼ + C
            </div>
            <div className="text-[10px] text-slate-400">
              Operadores Pauli-Z con autoestados computational basis {'{|0⟩, |1⟩}'}
            </div>
          </div>
        </div>

        {/* Matriz QUBO Q (4x4) */}
        <div ref={matrixRef} className="bg-[#070b16] rounded-2xl border border-emerald-500/30 p-3.5 shadow-lg flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-mono text-xs font-bold text-emerald-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
              Matriz QUBO Q (Diagonal = hᵢ, Fuera = Jᵢⱼ)
            </h4>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
              min xᵀ Q x
            </span>
          </div>

          <div className="flex-1 flex flex-col justify-center overflow-auto max-h-[220px]">
            <div
              className="grid gap-1.5 font-mono text-xs"
              style={{ gridTemplateColumns: `repeat(${qubo.matrix.length || 4}, minmax(0, 1fr))` }}
            >
              {qubo.matrix.map((row, rIdx) =>
                row.map((val, cIdx) => {
                  const isDiag = rIdx === cIdx;
                  const isZero = val === 0;

                  return (
                    <div
                      key={`${rIdx}-${cIdx}`}
                      className={`matrix-cell p-2 rounded-xl text-center border font-semibold transition-all duration-200 ${
                        isDiag
                          ? 'bg-purple-950/50 border-purple-500/50 text-purple-300 shadow-[0_0_8px_rgba(168,85,247,0.2)]'
                          : isZero
                          ? 'bg-slate-900/30 border-white/5 text-slate-600'
                          : 'bg-cyan-950/40 border-cyan-500/40 text-cyan-200'
                      }`}
                      title={
                        isDiag
                          ? `Término lineal h_${rIdx} = ${val}`
                          : `Acoplamiento cuadrático J_${rIdx}${cIdx} = ${val}`
                      }
                    >
                      <div className="text-[9px] text-slate-500 font-normal">
                        q_{rIdx}q_{cIdx}
                      </div>
                      <div className="text-xs">
                        {val > 0 ? `+${val.toFixed(2)}` : val.toFixed(2)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="text-[10px] font-mono text-slate-400 mt-2 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-purple-500 inline-block" /> Diagonal: Campos hᵢ
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-cyan-500 inline-block" /> Fuera: Enlaces Jᵢⱼ
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
