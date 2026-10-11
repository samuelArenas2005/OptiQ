import React, { useEffect, useRef } from 'react';

export default function SubtleParticles() {
  const canvasRef = useRef(null);


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Mouse coordinates for subtle interactive quantum wave
    const mouse = { x: -1000, y: -1000, radius: 140 };

    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    // Quantum particles pool (80 nodes for rich background coverage)
    const numParticles = 80;
    const particles = [];

    const colors = ['cyan', 'purple', 'teal'];

    for (let i = 0; i < numParticles; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2.8 + 1.6,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        baseAlpha: Math.random() * 0.45 + 0.55,
        pulseSpeed: Math.random() * 0.02 + 0.008,
        pulsePhase: Math.random() * Math.PI * 2,
        colorType: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const isDark =
        document.documentElement.classList.contains('dark') ||
        document.body.classList.contains('dark');

      // 1. Draw entanglement lines between nearby particles (< 125px)
      const maxDistance = 125;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            const lineAlpha = (1 - dist / maxDistance) * (isDark ? 0.35 : 0.28);
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);

            if (isDark) {
              ctx.strokeStyle = `rgba(56, 189, 248, ${lineAlpha})`;
            } else {
              ctx.strokeStyle = `rgba(0, 74, 198, ${lineAlpha})`;
            }
            ctx.lineWidth = 1.0;
            ctx.stroke();
          }
        }
      }

      // 2. Draw Quantum Particle Nodes
      particles.forEach((p) => {
        // Subtle drift movement
        p.x += p.vx;
        p.y += p.vy;

        // Mouse subtle interaction (gentle displacement)
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouse.radius) {
          const force = (mouse.radius - dist) / mouse.radius;
          p.x -= (dx / dist) * force * 1.5;
          p.y -= (dy / dist) * force * 1.5;
        }

        // Wrap around screen borders smoothly
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Pulsing breathing effect
        p.pulsePhase += p.pulseSpeed;
        const currentAlpha = p.baseAlpha * (0.65 + 0.35 * Math.sin(p.pulsePhase));

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);

        if (isDark) {
          // Antigravity Dark Mode: Glowing Cyan, Purple & Mint
          let colorRgb = '56, 189, 248'; // Cyan
          let shadowHex = '#0284c7';

          if (p.colorType === 'purple') {
            colorRgb = '192, 132, 252'; // Neon Violet
            shadowHex = '#9333ea';
          } else if (p.colorType === 'teal') {
            colorRgb = '45, 212, 191'; // Mint Teal
            shadowHex = '#0f766e';
          }

          ctx.fillStyle = `rgba(${colorRgb}, ${currentAlpha})`;
          ctx.shadowBlur = p.radius * 4;
          ctx.shadowColor = shadowHex;
        } else {
          // Light Mode: High-contrast Vibrant Cerulean, Indigo & Teal
          let colorRgb = '2, 132, 199'; // Cerulean
          let shadowHex = '#004ac6';

          if (p.colorType === 'purple') {
            colorRgb = '106, 30, 219'; // Deep Violet
            shadowHex = '#6a1edb';
          } else if (p.colorType === 'teal') {
            colorRgb = '0, 106, 97'; // Deep Teal
            shadowHex = '#006a61';
          }

          ctx.fillStyle = `rgba(${colorRgb}, ${currentAlpha * 0.85})`;
          ctx.shadowBlur = p.radius * 2.5;
          ctx.shadowColor = shadowHex;
        }

        ctx.fill();
        ctx.shadowBlur = 0; // reset
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="subtle-particles-canvas" />;
}
