import React, { useState } from 'react';
import AtomLoader from './AtomLoader';
import Visualizer3D from './Visualizer3D';

export default function RightTelemetryPanel({
  onRun,
  onRunWith3D,
  isLoading,
  loadingStep,
  loadingMessage,
  hasRun,
  result,
  hyperparams,
  onUpdateHyperparams,
  activeTab = 'params',
  onSelectTab
}) {
  // Fallback internal tab state if not controlled
  const [internalTab, setInternalTab] = useState(hasRun ? 'solution' : 'params');
  const currentTab = onSelectTab ? activeTab : internalTab;
  const setTab = onSelectTab || setInternalTab;

  const parsedSummary = result?.parsedSummary;
  const details = result?.details;
  const isSuccess = result?.success;
  const quboNodes = parsedSummary?.qubo_nodes || 0;

  return (
    <div className="w-full h-full flex flex-col gap-2.5 overflow-hidden">
      {/* Top Action Execution Buttons (Stacked with text left-aligned) */}
      <div className="flex flex-col gap-2 shrink-0">
        {/* RUN & VISUALIZE - Left aligned text */}
        <button
          onClick={onRunWith3D}
          disabled={isLoading}
          className="w-full py-2.5 px-4 rounded-xl bg-primary text-on-primary font-headline-sm text-sm font-semibold shadow-sm hover:bg-primary-container hover:shadow transition-all flex items-center justify-start gap-2.5 active:scale-[0.99] cursor-pointer disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-[19px]">play_arrow</span>
          <span>RUN &amp; VISUALIZE</span>
          <span className="material-symbols-outlined text-[16px] opacity-80 ml-auto">auto_awesome</span>
        </button>

        {/* Simplified RUN button with play icon - Left aligned text */}
        <button
          onClick={onRun}
          disabled={isLoading}
          className="w-full py-2 px-4 rounded-xl bg-surface-container-lowest border border-outline-variant/70 text-primary font-headline-sm text-sm font-medium hover:bg-surface-container-low active:bg-surface-container transition-colors shadow-sm flex items-center justify-start gap-2.5 cursor-pointer disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-[19px]">play_arrow</span>
          <span>RUN</span>
        </button>
      </div>

      {/* Runtime Parameter Capsule Bar - Beautified and evenly distributed */}
      <div className="bg-surface-container-low/70 rounded-xl px-2 py-2 border border-outline-variant/50 shadow-sm grid grid-cols-4 divide-x divide-outline-variant/40 text-center font-mono shrink-0">
        <div className="flex flex-col items-center justify-center px-1">
          <span className="text-outline text-[10px] font-sans font-semibold tracking-wide">
            SHOTS
          </span>
          <span className="font-bold text-xs text-on-surface mt-0.5">
            {hyperparams?.shots ? Number(hyperparams.shots).toLocaleString() : '8,192'}
          </span>
        </div>

        <div className="flex flex-col items-center justify-center px-1">
          <span className="text-outline text-[10px] font-sans font-semibold tracking-wide">
            DEPTH
          </span>
          <span className="font-bold text-xs text-on-surface mt-0.5">
            p = {hyperparams?.pSteps || 3}
          </span>
        </div>

        <div className="flex flex-col items-center justify-center px-1">
          <span className="text-outline text-[10px] font-sans font-semibold tracking-wide">
            ESTADO
          </span>
          <span
            className={`font-bold text-xs mt-0.5 ${
              !hasRun
                ? 'text-outline'
                : isSuccess
                ? 'text-secondary'
                : 'text-error'
            }`}
          >
            {!hasRun ? 'En espera' : isSuccess ? 'Éxito' : 'Error'}
          </span>
        </div>

        <div className="flex flex-col items-center justify-center px-1">
          <span className="text-outline text-[10px] font-sans font-semibold tracking-wide">
            PARSER
          </span>
          <span
            className={`font-bold text-xs mt-0.5 ${
              !hasRun
                ? 'text-outline'
                : isSuccess
                ? 'text-secondary'
                : 'text-error'
            }`}
          >
            {!hasRun ? 'Pendiente' : isSuccess ? 'Validado' : 'Falló'}
          </span>
        </div>
      </div>

      {/* Loader OR Consolidated Single Multi-Tab Card */}
      {isLoading ? (
        <div className="flex-1 bg-surface-container-lowest rounded-xl border border-outline-variant/60 shadow-sm p-4 flex flex-col justify-center overflow-hidden">
          <AtomLoader statusMessage={loadingMessage} step={loadingStep} totalSteps={4} />
        </div>
      ) : (
        /* =========================================================================
           SINGLE CONSOLIDATED WINDOW CARD WITH TABS
           "mejor solo un card para console y solution, y que se pueda seleccionar uno
            o el otro como si fueran tab de ventanas"
        ========================================================================= */
        <div className="flex-1 min-h-0 bg-surface-container-lowest rounded-xl border border-outline-variant/60 shadow-sm flex flex-col overflow-hidden">
          {/* Window Tabs Header */}
          <div className="flex items-center justify-between bg-surface-container-low/80 border-b border-outline-variant/40 px-2 pt-1.5 shrink-0 select-none">
            <div className="flex items-center gap-1 overflow-x-auto w-full">
              {/* Tab 1: Solution */}
              <button
                type="button"
                onClick={() => setTab('solution')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-t-lg transition-colors cursor-pointer shrink-0 ${
                  currentTab === 'solution'
                    ? 'bg-surface-container-lowest text-primary font-semibold shadow-sm border-t-2 border-primary'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/60 font-medium'
                }`}
              >
                <span className="material-symbols-outlined text-[15px] text-tertiary">flare</span>
                <span>Solución</span>
                {hasRun && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isSuccess ? 'bg-secondary' : 'bg-error'
                    }`}
                  />
                )}
              </button>

              {/* Tab 2: Console */}
              <button
                type="button"
                onClick={() => setTab('console')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-t-lg transition-colors cursor-pointer shrink-0 ${
                  currentTab === 'console'
                    ? 'bg-surface-container-lowest text-primary font-semibold shadow-sm border-t-2 border-primary'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/60 font-medium'
                }`}
              >
                <span className="material-symbols-outlined text-[15px] text-primary">terminal</span>
                <span>Consola</span>
                {hasRun && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isSuccess ? 'bg-secondary' : 'bg-error'
                    }`}
                  />
                )}
              </button>

              {/* Tab 3: 3D Visualization */}
              <button
                type="button"
                onClick={() => setTab('3d')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-t-lg transition-colors cursor-pointer shrink-0 ${
                  currentTab === '3d'
                    ? 'bg-surface-container-lowest text-primary font-semibold shadow-sm border-t-2 border-primary'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/60 font-medium'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">view_in_ar</span>
                <span>3D</span>
              </button>

              {/* Tab 4: QAOA Hyperparameters */}
              <button
                type="button"
                onClick={() => setTab('params')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-t-lg transition-colors cursor-pointer shrink-0 ml-auto ${
                  currentTab === 'params'
                    ? 'bg-surface-container-lowest text-primary font-semibold shadow-sm border-t-2 border-primary'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/60 font-medium'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">tune</span>
                <span>Parámetros</span>
              </button>
            </div>
          </div>

          {/* Active Tab Body - Scrollable content within the single card */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3.5 flex flex-col">
            {/* ================= TAB 1: SOLUCIÓN ================= */}
            {currentTab === 'solution' && (
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-outline-variant/30">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-on-surface">Resultados del Algoritmo</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                          !hasRun
                            ? 'bg-surface-container text-outline'
                            : isSuccess
                            ? 'bg-secondary/10 text-secondary font-medium'
                            : 'bg-error/10 text-error font-medium'
                        }`}
                      >
                        {!hasRun ? 'En espera' : isSuccess ? `${quboNodes} Qubits` : 'Error'}
                      </span>
                    </div>

                    {hasRun && isSuccess && (
                      <button
                        onClick={() => window.print()}
                        className="flex items-center gap-1 px-2 py-0.5 rounded border border-outline-variant/60 bg-surface-container-low hover:bg-surface-container hover:text-primary text-on-surface-variant text-[11px] transition-colors cursor-pointer"
                        title="Imprimir o exportar solución"
                      >
                        <span className="material-symbols-outlined text-[13px]">print</span>
                        <span>Exportar</span>
                      </button>
                    )}
                  </div>

                  {!hasRun ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center text-outline">
                      <span className="material-symbols-outlined text-[32px] opacity-40 mb-1.5 text-primary">
                        biotech
                      </span>
                      <p className="text-xs font-semibold text-on-surface-variant">Sin solución calculada</p>
                      <p className="text-[11px] max-w-xs mt-1 text-outline">
                        Presiona <strong className="text-primary font-medium">RUN</strong> para ejecutar la formulación QAOA y obtener la asignación óptima.
                      </p>
                    </div>
                  ) : !isSuccess ? (
                    <div className="p-3 bg-error/5 border border-error/20 rounded-lg text-xs text-error font-mono text-center my-auto">
                      <div className="flex items-center justify-center gap-1.5 font-semibold mb-1">
                        <span className="material-symbols-outlined text-[16px]">error</span>
                        <span>Error al procesar modelo</span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant">{result?.error}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Metric Banner */}
                      <div className="p-3 rounded-xl bg-surface-container-low/70 border border-outline-variant/40 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-outline uppercase font-semibold">
                            Fase Preliminar
                          </span>
                          <div className="text-base font-bold text-primary tracking-tight mt-0.5">
                            Parseo Exitoso
                          </div>
                        </div>
                        <div className="h-7 w-px bg-outline-variant/40"></div>
                        <div className="text-right">
                          <span className="text-[10px] text-outline uppercase font-semibold">
                            Nodos Binarios
                          </span>
                          <div className="font-mono text-sm font-bold text-on-surface mt-0.5">
                            {quboNodes} Qubits
                          </div>
                        </div>
                      </div>

                      {/* QUBO Variables */}
                      <div className="text-xs text-on-surface-variant bg-surface-container-low/50 p-2.5 rounded-lg border border-outline-variant/30 font-mono">
                        <span className="text-[11px] text-outline font-sans block mb-1">
                          Variables QUBO Mapeadas:
                        </span>
                        <p className="break-words">
                          {(parsedSummary?.qubo_variables || parsedSummary?.variables || []).join(', ') || 'Sin variables asignadas'}
                        </p>
                      </div>

                      {/* Objective */}
                      <div className="text-xs text-on-surface-variant bg-surface-container-low/50 p-2.5 rounded-lg border border-outline-variant/30">
                        <span className="text-[11px] text-outline block mb-0.5">
                          Función Objetivo:
                        </span>
                        <p className="font-mono font-medium text-on-surface">
                          {parsedSummary?.objective?.sense || 'Maximizar beneficio'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-2 border-t border-outline-variant/30 text-outline text-[11px] flex items-center justify-between">
                  <span>{hasRun && isSuccess ? 'Estructura binaria construida' : 'Esperando ejecución'}</span>
                  <span className="text-primary font-mono font-medium">
                    {hasRun && isSuccess ? `Solver: ${details?.solver_used || 'qaoa-pinn'}` : 'qaoa'}
                  </span>
                </div>
              </div>
            )}

            {/* ================= TAB 2: CONSOLA ================= */}
            {currentTab === 'console' && (
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-outline-variant/30">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-on-surface">Console Output</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                          !hasRun
                            ? 'bg-surface-container text-outline'
                            : isSuccess
                            ? 'bg-secondary/10 text-secondary font-medium'
                            : 'bg-error/10 text-error font-medium'
                        }`}
                      >
                        {!hasRun ? 'En espera' : isSuccess ? 'Validado con éxito' : 'Error'}
                      </span>
                    </div>
                    {hasRun && (
                      <span className="text-[10px] font-mono text-outline">
                        {result?.timestamp || ''}
                      </span>
                    )}
                  </div>

                  {!hasRun ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center text-outline">
                      <span className="material-symbols-outlined text-[32px] opacity-40 mb-1.5 text-primary">
                        terminal
                      </span>
                      <p className="text-xs font-semibold text-on-surface-variant">Consola en espera</p>
                      <p className="text-[11px] max-w-xs mt-1 text-outline">
                        Presiona <strong className="text-primary font-medium">RUN</strong> para parsear el modelo declarativo en FastAPI.
                      </p>
                    </div>
                  ) : !isSuccess ? (
                    <div className="space-y-1.5 font-mono text-xs text-error bg-error/5 p-3 rounded-lg border border-error/20">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <span className="material-symbols-outlined text-[16px]">error</span>
                        <span>Error en el Backend / Parser:</span>
                      </div>
                      <p className="text-[11px] text-on-surface break-words mt-1">{result?.error}</p>
                    </div>
                  ) : (
                    <div className="space-y-2 font-mono text-xs text-on-surface-variant">
                      <div className="flex justify-between items-center pb-1">
                        <span className="text-outline">Estado del parser:</span>
                        <span className="font-semibold text-secondary flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">check_circle</span>
                          Validado con éxito
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-outline">Variables detectadas:</span>
                        <span className="font-medium text-on-surface">
                          {parsedSummary?.variables_count ?? 0} (
                          {(parsedSummary?.variables || []).slice(0, 4).join(', ') || 'ninguna'}
                          {(parsedSummary?.variables || []).length > 4 ? '...' : ''})
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-outline">Restricciones declarativas:</span>
                        <span className="font-medium text-on-surface">
                          {parsedSummary?.constraints_count ?? 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-outline">Topología QUBO (Nodos):</span>
                        <span className="font-semibold text-primary">
                          {quboNodes} nodos
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-outline">Función Objetivo:</span>
                        <span className="font-medium text-on-surface truncate max-w-[180px]">
                          {parsedSummary?.objective?.sense || 'Sin objetivo'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-2 border-t border-outline-variant/30 flex items-center justify-between text-outline text-[11px]">
                  <span>FastAPI Backend • /api/solve</span>
                  <span className={hasRun && isSuccess ? 'text-secondary font-medium' : ''}>
                    {hasRun && isSuccess ? 'Parseo verificado' : 'Modo escucha'}
                  </span>
                </div>
              </div>
            )}

            {/* ================= TAB 3: 3D VISUALIZATION ================= */}
            {currentTab === '3d' && (
              <div className="flex-1 flex flex-col min-h-[260px]">
                <div className="flex-1 rounded-lg overflow-hidden border border-outline-variant/40 relative bg-surface-container-lowest">
                  <Visualizer3D qubits={quboNodes > 0 ? quboNodes : 6} />
                </div>
                <div className="mt-2 text-center text-[11px] text-outline font-mono">
                  Arrastra para rotar la topología tridimensional
                </div>
              </div>
            )}

            {/* ================= TAB 4: HIPERPARÁMETROS QAOA ================= */}
            {currentTab === 'params' && (
              <div className="flex flex-col gap-3 pt-0.5">
                {/* Header Sub-bar */}
                <div className="flex items-center justify-between pb-1 border-b border-outline-variant/30">
                  <span className="text-xs font-semibold text-on-surface">Configuración QAOA</span>
                  <div className="flex items-center gap-1.5">
                    <span className="bg-primary/10 text-primary text-[10px] font-medium px-2 py-0.5 rounded-full">
                      Opcional
                    </span>
                    <span className="text-[10px] text-outline">Valores activos</span>
                  </div>
                </div>

                {/* Row 1: Capas p-steps & Disparos */}
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Capas p-steps */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-medium text-on-surface">Capas p-steps</label>
                      <span className="text-[10px] font-mono text-outline">
                        p = {hyperparams?.pSteps || 3}
                      </span>
                    </div>
                    <div className="flex items-center bg-surface-container-low rounded-lg px-2 py-1 border border-outline-variant/50">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateHyperparams({
                            ...hyperparams,
                            pSteps: Math.max(1, (hyperparams?.pSteps || 3) - 1)
                          })
                        }
                        className="w-6 h-6 flex items-center justify-center text-on-surface-variant hover:text-on-surface font-bold text-xs cursor-pointer hover:bg-surface-container-lowest rounded-md transition-colors select-none"
                        title="Reducir capas"
                      >
                        -
                      </button>
                      <span className="flex-1 text-center font-mono text-xs font-semibold text-on-surface">
                        {hyperparams?.pSteps || 3}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateHyperparams({
                            ...hyperparams,
                            pSteps: Math.min(10, (hyperparams?.pSteps || 3) + 1)
                          })
                        }
                        className="w-6 h-6 flex items-center justify-center text-on-surface-variant hover:text-on-surface font-bold text-xs cursor-pointer hover:bg-surface-container-lowest rounded-md transition-colors select-none"
                        title="Aumentar capas"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Disparos (Shots) */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-on-surface">Disparos (Shots)</label>
                    <div className="relative">
                      <select
                        value={hyperparams?.shots || 8192}
                        onChange={(e) =>
                          onUpdateHyperparams({
                            ...hyperparams,
                            shots: Number(e.target.value)
                          })
                        }
                        className="w-full bg-surface-container-lowest border border-outline-variant/60 hover:border-primary/60 focus:border-primary rounded-lg px-2.5 py-1 text-on-surface font-mono text-xs appearance-none focus:outline-none focus:ring-1 focus:ring-primary/20 cursor-pointer pr-7 shadow-sm transition-colors"
                      >
                        <option value="1024">1,024 shots</option>
                        <option value="2048">2,048 shots</option>
                        <option value="4096">4,096 shots</option>
                        <option value="8192">8,192 shots</option>
                      </select>
                      <span className="material-symbols-outlined text-[16px] text-primary pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
                        unfold_more
                      </span>
                    </div>
                  </div>
                </div>

                {/* Row 2: Optimizador Clásico */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-on-surface">Optimizador Clásico</label>
                  <div className="grid grid-cols-3 gap-1 bg-surface-container-low p-1 rounded-lg border border-outline-variant/50">
                    {['COBYLA', 'Adam', 'Nelder-Mead'].map((opt) => {
                      const isSelected = (hyperparams?.optimizer || 'COBYLA') === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => onUpdateHyperparams({ ...hyperparams, optimizer: opt })}
                          className={`py-1 px-1.5 text-center rounded-md text-xs cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-surface-container-lowest text-primary shadow-sm font-semibold'
                              : 'text-on-surface-variant hover:text-on-surface font-normal'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Row 3: Inicialización de Ángulos */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-on-surface">
                    Inicialización de Ángulos [γ₀, β₀]
                  </label>
                  <div className="grid grid-cols-3 gap-1 bg-surface-container-low p-1 rounded-lg border border-outline-variant/50">
                    {['Automática', 'Heurística', 'Manual'].map((mode) => {
                      const isSelected = (hyperparams?.angleInit || 'Automática') === mode;
                      return (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => onUpdateHyperparams({ ...hyperparams, angleInit: mode })}
                          className={`py-1 px-1.5 text-center rounded-md text-xs cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-surface-container-lowest text-primary shadow-sm font-semibold'
                              : 'text-on-surface-variant hover:text-on-surface font-normal'
                          }`}
                        >
                          {mode}
                        </button>
                      );
                    })}
                  </div>

                  {/* Manual Angle Fields when 'Manual' */}
                  {hyperparams?.angleInit === 'Manual' && (
                    <div className="grid grid-cols-2 gap-2 pt-1.5">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center justify-between text-[10px] font-mono text-outline">
                          <span>γ₀ (Gamma)</span>
                          <span className="text-primary font-semibold">rad</span>
                        </div>
                        <div className="flex items-center bg-surface-container-lowest rounded-lg px-2 py-1 border border-outline-variant/60 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 shadow-sm">
                          <input
                            type="number"
                            step="0.01"
                            value={hyperparams?.gamma0 ?? 0.39}
                            onChange={(e) =>
                              onUpdateHyperparams({
                                ...hyperparams,
                                gamma0: parseFloat(e.target.value) || 0
                              })
                            }
                            className="w-full bg-transparent font-mono text-xs text-on-surface focus:outline-none"
                            placeholder="0.39"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center justify-between text-[10px] font-mono text-outline">
                          <span>β₀ (Beta)</span>
                          <span className="text-primary font-semibold">rad</span>
                        </div>
                        <div className="flex items-center bg-surface-container-lowest rounded-lg px-2 py-1 border border-outline-variant/60 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 shadow-sm">
                          <input
                            type="number"
                            step="0.01"
                            value={hyperparams?.beta0 ?? 0.78}
                            onChange={(e) =>
                              onUpdateHyperparams({
                                ...hyperparams,
                                beta0: parseFloat(e.target.value) || 0
                              })
                            }
                            className="w-full bg-transparent font-mono text-xs text-on-surface focus:outline-none"
                            placeholder="0.78"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
