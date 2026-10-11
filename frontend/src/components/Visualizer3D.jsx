import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export default function Visualizer3D({ qubits = 10, bitstring = '1101000011' }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Scene, Camera, Renderer
    const width = container.clientWidth || 380;
    const height = container.clientHeight || 240;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090d16);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 16);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Quantum Ring of Qubit Nodes
    const group = new THREE.Group();
    scene.add(group);

    const radius = 5.5;
    const nodeCount = Math.max(6, Math.min(16, qubits));
    const nodeMeshes = [];

    // Ambient & Point light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const blueLight = new THREE.PointLight(0x3b82f6, 2, 50);
    blueLight.position.set(5, 5, 10);
    scene.add(blueLight);

    const purpleLight = new THREE.PointLight(0x8b5cf6, 2, 50);
    purpleLight.position.set(-5, -5, 10);
    scene.add(purpleLight);

    // Create central core sphere
    const coreGeometry = new THREE.SphereGeometry(1.2, 32, 32);
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.8
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    group.add(coreMesh);

    // Qubit nodes along circumference
    const sphereGeo = new THREE.SphereGeometry(0.55, 24, 24);
    for (let i = 0; i < nodeCount; i++) {
      const angle = (i / nodeCount) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const z = (Math.sin(angle * 2) * 1.2);

      const isBitOne = bitstring[i % bitstring.length] === '1';

      const mat = new THREE.MeshStandardMaterial({
        color: isBitOne ? 0x38bdf8 : 0x64748b,
        emissive: isBitOne ? 0x0284c7 : 0x1e293b,
        emissiveIntensity: isBitOne ? 0.9 : 0.2,
        roughness: 0.3
      });

      const sphere = new THREE.Mesh(sphereGeo, mat);
      sphere.position.set(x, y, z);
      group.add(sphere);
      nodeMeshes.push(sphere);

      // Line to center
      const lineMat = new THREE.LineBasicMaterial({
        color: isBitOne ? 0x3b82f6 : 0x334155,
        transparent: true,
        opacity: isBitOne ? 0.6 : 0.25
      });
      const points = [new THREE.Vector3(0, 0, 0), sphere.position];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(lineGeo, lineMat);
      group.add(line);
    }

    // Inter-qubit coupling lines (Entanglement ring)
    for (let i = 0; i < nodeCount; i++) {
      const nextIdx = (i + 1) % nodeCount;
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x8b5cf6,
        transparent: true,
        opacity: 0.45
      });
      const points = [nodeMeshes[i].position, nodeMeshes[nextIdx].position];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(lineGeo, lineMat);
      group.add(line);
    }

    // Subtle particle stars
    const starCount = 60;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i++) {
      starPositions[i] = (Math.random() - 0.5) * 25;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0x94a3b8, size: 0.12, transparent: true, opacity: 0.6 });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // Mouse drag interaction
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const onMouseDown = (e) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      group.rotation.y += deltaX * 0.01;
      group.rotation.x += deltaY * 0.01;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Animation Loop
    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (!isDragging) {
        group.rotation.y += 0.006;
        group.rotation.x += 0.002;
      }
      coreMesh.rotation.y += 0.015;
      renderer.render(scene, camera);
    };
    animate();

    // Resize Observer
    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      resizeObserver.disconnect();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [qubits, bitstring]);

  return (
    <div className="visualizer-3d-wrapper">
      <div className="visualizer-3d-toolbar">
        <span className="text-xs font-mono text-muted">3D Quantum Visualization (Hamiltonian)</span>
        <span className="text-xs font-mono text-cyan">Interactive (Drag to rotate)</span>
      </div>
      <div ref={mountRef} className="visualizer-3d-canvas" />
    </div>
  );
}
