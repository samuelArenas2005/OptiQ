import React, { useRef, useEffect, useState } from 'react';
import { BarVisualizationApp, defaultData } from '../../logica/main.js';

export default function BarChartVisualizer3D({ customData = null }) {
  const mountRef = useRef(null);
  const appRef = useRef(null);

  const activeDataset = customData || defaultData;
  const [selectedMockName, setSelectedMockName] = useState('default');
  const [shotState, setShotState] = useState({
    currentShot: 1,
    totalShots: activeDataset?.shots?.length || 1024,
    currentShotState: '',
    progress: 0,
    isWinner: false,
    winnerState: null,
    winnerCount: 0,
  });

  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1.0);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Instanciar la app 3D de barras neón
    const app = new BarVisualizationApp(container, activeDataset);
    appRef.current = app;

    let lastReportedShot = -1;
    app.setUIListener((event) => {
      if (event.type === 'tick') {
        const isLastShot = event.shotIndex >= event.totalShots - 1;
        const winner = event.winner;

        if (event.shotIndex !== lastReportedShot || isLastShot) {
          lastReportedShot = event.shotIndex;
          setShotState({
            currentShot: event.shotIndex + 1,
            totalShots: event.totalShots,
            currentShotState: event.currentShotState || '',
            progress: event.progress * 100,
            isWinner: isLastShot && !!winner,
            winnerState: winner ? winner.state : null,
            winnerCount: winner ? winner.count : 0,
          });

          if (event.isPlaying !== undefined) {
            setIsPlaying(event.isPlaying);
          }
        }
      }
    });

    return () => {
      if (appRef.current) {
        appRef.current.dispose();
      }
    };
  }, [activeDataset]);

  const handleTogglePlay = () => {
    if (!appRef.current) return;
    const playing = appRef.current.animationController.togglePlay();
    setIsPlaying(playing);
  };

  const handleReload = () => {
    if (!appRef.current) return;
    appRef.current.animationController.reset();
    setIsPlaying(true);
  };

  const handleSpeedChange = (newSpeed) => {
    if (!appRef.current) return;
    setSpeed(newSpeed);
    appRef.current.animationController.setSpeed(newSpeed);
  };

  return (
    <div className="w-full h-full min-h-[380px] relative overflow-hidden rounded-xl bg-[#060913] flex flex-col select-none border border-outline-variant/40 shadow-inner">
      {/* Three.js Canvas mount container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full z-0 cursor-grab active:cursor-grabbing" />

      {/* Superposed HUD Layer */}
      <div className="absolute inset-0 p-3 sm:p-4 flex flex-col justify-between pointer-events-none z-10">
        {/* Top Section: SOLO conserva el mensaje del estado ganador al finalizar */}
        {shotState.isWinner && shotState.winnerState ? (
          <div className="pointer-events-auto self-center bg-slate-900/95 backdrop-blur-md border border-amber-400/80 px-4 py-2 rounded-xl shadow-[0_0_28px_rgba(255,234,0,0.65)] animate-bounce flex items-center gap-2">
            <span className="text-xl">👑</span>
            <span className="font-mono text-xs font-bold text-amber-300">
              ESTADO GANADOR: <strong className="text-white text-sm">|{shotState.winnerState}⟩</strong> ({shotState.winnerCount} disparos)
            </span>
          </div>
        ) : (
          <div />
        )}

        {/* Bottom Control Panel Simplificado */}
        <div className="pointer-events-auto self-center bg-slate-900/90 backdrop-blur-md border border-cyan-500/20 rounded-xl px-4 py-2 flex flex-col items-center gap-1.5 shadow-xl max-w-full">
          <div className="flex items-center gap-3.5">
            {/* Shot Count */}
            <div className="font-mono text-xs font-semibold text-slate-300 whitespace-nowrap">
              SHOT:{' '}
              <span className="text-white font-bold text-sm">
                {String(shotState.currentShot).padStart(2, '0')}
              </span>{' '}
              /{' '}
              <span className="text-slate-400 text-xs">
                {String(shotState.totalShots).padStart(2, '0')}
              </span>
            </div>

            {/* Play / Pause Button */}
            <button
              onClick={handleTogglePlay}
              className="px-3 py-1 bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 border border-cyan-400 text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1 shadow-md cursor-pointer active:scale-95 whitespace-nowrap"
              title="Pause / Resume"
            >
              {isPlaying ? '⏸ Pause' : '▶ Resume'}
            </button>

            {/* Reload button to return to Shot 1 */}
            <button
              onClick={handleReload}
              className="p-1.5 bg-white/5 hover:bg-cyan-500/25 border border-white/10 hover:border-cyan-400 text-cyan-300 hover:text-white rounded-lg transition-all flex items-center justify-center cursor-pointer active:scale-90"
              title="Restart simulation at Shot 1"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>

            {/* Speed Selector */}
            <div className="flex bg-black/40 rounded-lg p-0.5 border border-white/10">
              {[0.5, 1.0, 2.0].map((s) => (
                <button
                  key={s}
                  onClick={() => handleSpeedChange(s)}
                  className={`px-1.5 py-0.5 font-mono text-[10px] font-semibold rounded cursor-pointer transition-all ${
                    speed === s ? 'bg-cyan-500/30 text-cyan-300 shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          <div className="text-[9px] font-mono text-slate-400 text-center opacity-70">
            🖱️ Drag: Rotate camera • Scroll: Zoom • Right click: Pan
          </div>
        </div>
      </div>
    </div>
  );
}
