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
  const [copiedState, setCopiedState] = useState(false);
  const [hoveredSample, setHoveredSample] = useState(null);
  const [featureSubTab, setFeatureSubTab] = useState('global'); // 'global' | 'nodes' | 'edges'

  const currentTab = onSelectTab ? activeTab : internalTab;
  const setTab = onSelectTab || setInternalTab;

  const parsedSummary = result?.parsedSummary;
  const details = result?.details;
  const features = result?.features;
  const isSuccess = result?.success;
  const quboNodes = parsedSummary?.qubo_nodes || details?.qubits_count || 0;

  const handleCopyBitstring = () => {
    if (details?.optimal_bitstring) {
      navigator.clipboard.writeText(details.optimal_bitstring);
      setCopiedState(true);
      setTimeout(() => setCopiedState(false), 1500);
    }
  };

  const distribution = details?.distribution || [];
  const maxProb = distribution.length > 0 ? Math.max(...distribution.map(d => d.prob), 0.01) : 1;

  // Variables dict
  const solutionEntries = Object.entries(details?.solution || {});

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

      {/* Runtime Parameter Capsule Bar */}
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
            p = {hyperparams?.pSteps || 2}
          </span>
        </div>

        <div className="flex flex-col items-center justify-center px-1">
          <span className="text-outline text-[10px] font-sans font-semibold tracking-wide">
            STATUS
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
            {!hasRun ? 'Idle' : isSuccess ? 'Success' : 'Error'}
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
            {!hasRun ? 'Pending' : isSuccess ? 'Validated' : 'Failed'}
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
                <span>Solution</span>
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
                <span>Console</span>
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
                <span>Parameters</span>
              </button>
            </div>
          </div>

          {/* Active Tab Body - Scrollable content within the single card */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3.5 flex flex-col">
            {/* ================= TAB 1: SOLUTION ================= */}
            {currentTab === 'solution' && (
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-outline-variant/30">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-on-surface">QAOA Results</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                          !hasRun
                            ? 'bg-surface-container text-outline'
                            : isSuccess
                            ? 'bg-secondary/10 text-secondary font-medium'
                            : 'bg-error/10 text-error font-medium'
                        }`}
                      >
                        {!hasRun ? 'Idle' : isSuccess ? `${quboNodes} Qubits` : 'Error'}
                      </span>
                    </div>

                    {hasRun && isSuccess && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={handleCopyBitstring}
                          className="flex items-center gap-1 px-2 py-0.5 rounded border border-outline-variant/60 bg-surface-container-low hover:bg-surface-container hover:text-primary text-on-surface-variant text-[11px] transition-colors cursor-pointer"
                          title="Copy optimal bitstring"
                        >
                          <span className="material-symbols-outlined text-[13px]">
                            {copiedState ? 'check' : 'content_copy'}
                          </span>
                          <span>{copiedState ? 'Copied' : 'Copy Bits'}</span>
                        </button>
                        <button
                          onClick={() => window.print()}
                          className="flex items-center gap-1 px-2 py-0.5 rounded border border-outline-variant/60 bg-surface-container-low hover:bg-surface-container hover:text-primary text-on-surface-variant text-[11px] transition-colors cursor-pointer"
                          title="Export solution"
                        >
                          <span className="material-symbols-outlined text-[13px]">print</span>
                          <span>Export</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {!hasRun ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center text-outline">
                      <span className="material-symbols-outlined text-[32px] opacity-40 mb-1.5 text-primary">
                        biotech
                      </span>
                      <p className="text-xs font-semibold text-on-surface-variant">No simulation computed</p>
                      <p className="text-[11px] max-w-xs mt-1 text-outline">
                        Press <strong className="text-primary font-medium">RUN</strong> to compile to QUBO, map to Ising, and solve with simulated QAOA on Qiskit.
                      </p>
                    </div>
                  ) : !isSuccess ? (
                    <div className="p-3 bg-error/5 border border-error/20 rounded-lg text-xs text-error font-mono text-center my-auto">
                      <div className="flex items-center justify-center gap-1.5 font-semibold mb-1">
                        <span className="material-symbols-outlined text-[16px]">error</span>
                        <span>Error processing model</span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant">{result?.error}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Metric Banner: Optimal Value & Energy */}
                      <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-surface-container-low/70 border border-outline-variant/40">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-outline uppercase font-semibold">
                            Optimal Cost / Objective
                          </span>
                          <span className="text-lg font-bold text-primary font-mono mt-0.5">
                            {details?.optimal_value !== undefined ? details.optimal_value : '—'}
                          </span>
                          <span className="text-[10px] text-outline font-mono">
                            {parsedSummary?.objective?.sense === 'maximize' ? 'Maximum value' : 'Minimum value'}
                          </span>
                        </div>

                        <div className="flex flex-col border-l border-outline-variant/40 pl-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-outline uppercase font-semibold">
                              ⟨H_cost⟩ Hamiltonian
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-on-surface font-mono mt-0.5">
                            {details?.energy !== undefined ? `${details.energy.toFixed(3)} eV` : '—'}
                          </span>
                          <span className="text-[10px] text-outline font-mono">
                            {details?.execution_time_ms ? `Time: ${details.execution_time_ms} ms` : 'Fast simulation'}
                          </span>
                        </div>
                      </div>

                      {/* Optimal Ground State & Probability */}
                      <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-primary uppercase font-semibold tracking-wider block">
                            Measured Eigenstate (Ground State)
                          </span>
                          <span className="font-mono text-sm font-bold text-primary mt-0.5 block">
                            |{details?.optimal_bitstring || '—'}⟩
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-outline uppercase font-semibold block">
                            Probability
                          </span>
                          <span className="font-mono text-xs font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded-full mt-0.5 inline-block">
                            {details?.state_probability || '—'}
                          </span>
                        </div>
                      </div>

                      {/* Binary Variable Assignment Solution */}
                      <div className="bg-surface-container-low/50 p-2.5 rounded-lg border border-outline-variant/30">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-semibold text-on-surface flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px] text-primary">check_circle</span>
                            Optimal Variable Assignment
                          </span>
                          <span className="text-[10px] text-outline font-mono">
                            {solutionEntries.length} variables
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pt-1">
                          {solutionEntries.length > 0 ? (
                            solutionEntries.map(([vName, vVal]) => {
                              const isOne = Number(vVal) === 1;
                              return (
                                <div
                                  key={vName}
                                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-mono border transition-colors ${
                                    isOne
                                      ? 'bg-secondary/10 border-secondary/30 text-secondary font-semibold'
                                      : 'bg-surface-container-lowest border-outline-variant/40 text-on-surface-variant'
                                  }`}
                                  title={`${vName} = ${vVal}`}
                                >
                                  <span>{vName}:</span>
                                  <span className={isOne ? 'text-secondary font-bold' : 'text-outline'}>
                                    {vVal}
                                  </span>
                                  <span className="text-[9px] uppercase tracking-wider ml-0.5 opacity-80">
                                    {isOne ? '✓' : '✗'}
                                  </span>
                                </div>
                              );
                            })
                          ) : (
                            <span className="text-xs text-outline font-mono">No computed variables</span>
                          )}
                        </div>
                      </div>

                      {/* State Probabilities Histogram */}
                      {distribution.length > 0 && (
                        <div className="bg-surface-container-low/50 p-2.5 rounded-lg border border-outline-variant/30">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-semibold text-on-surface flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px] text-tertiary">bar_chart</span>
                              State Distribution ({hyperparams?.shots ? Number(hyperparams.shots).toLocaleString() : '8,192'} shots)
                            </span>
                            <span className="text-[10px] text-outline font-mono">
                              {hoveredSample
                                ? `|${hoveredSample.bits}⟩: ${(hoveredSample.prob * 100).toFixed(1)}%`
                                : `P_max = ${details?.state_probability || ''}`}
                            </span>
                          </div>

                          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                            {distribution.slice(0, 8).map((sample, idx) => {
                              const probPct = Math.round(sample.prob * 1000) / 10;
                              const barWidth = Math.max(6, Math.round((sample.prob / maxProb) * 100));
                              const isPeak = sample.peak || sample.bits === details?.optimal_bitstring;

                              return (
                                <div
                                  key={idx}
                                  onMouseEnter={() => setHoveredSample(sample)}
                                  onMouseLeave={() => setHoveredSample(null)}
                                  className={`p-1.5 rounded-md transition-colors ${
                                    isPeak
                                      ? 'bg-primary/10 border border-primary/20'
                                      : 'hover:bg-surface-container-low'
                                  }`}
                                >
                                  <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className={isPeak ? 'font-bold text-primary' : 'text-on-surface'}>
                                        |{sample.bits}⟩
                                      </span>
                                      {isPeak && (
                                        <span className="text-[9px] px-1 py-0.2 bg-primary/20 text-primary rounded font-sans font-medium">
                                          Optimal
                                        </span>
                                      )}
                                      {sample.feasible && !isPeak && (
                                        <span className="text-[9px] text-secondary">Feasible</span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {sample.fval !== undefined && (
                                        <span className="text-outline text-[10px]">
                                          f={sample.fval}
                                        </span>
                                      )}
                                      <span className="font-semibold text-on-surface text-[10px]">
                                        {probPct}%
                                      </span>
                                    </div>
                                  </div>
                                  <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-300 ${
                                        isPeak ? 'bg-primary' : 'bg-secondary/70'
                                      }`}
                                      style={{ width: `${barWidth}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-2 border-t border-outline-variant/30 text-outline text-[11px] flex items-center justify-between">
                  <span>{hasRun && isSuccess ? 'Circuit simulated successfully' : 'Awaiting execution'}</span>
                  <span className="text-primary font-mono font-medium">
                    {hasRun && isSuccess ? (details?.hardware || 'Qiskit Statevector') : 'qaoa'}
                  </span>
                </div>
              </div>
            )}

            {/* ================= TAB 2: CONSOLE & FEATURES ================= */}
            {currentTab === 'console' && (
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-outline-variant/30">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-on-surface">Console &amp; BIP Features</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                          !hasRun
                            ? 'bg-surface-container text-outline'
                            : isSuccess
                            ? 'bg-secondary/10 text-secondary font-medium'
                            : 'bg-error/10 text-error font-medium'
                        }`}
                      >
                        {!hasRun ? 'Idle' : isSuccess ? 'Completed' : 'Error'}
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
                      <p className="text-xs font-semibold text-on-surface-variant">Console idle</p>
                      <p className="text-[11px] max-w-xs mt-1 text-outline">
                        Press <strong className="text-primary font-medium">RUN</strong> to extract graph features and view the solver trace.
                      </p>
                    </div>
                  ) : !isSuccess ? (
                    <div className="space-y-1.5 font-mono text-xs text-error bg-error/5 p-3 rounded-lg border border-error/20">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <span className="material-symbols-outlined text-[16px]">error</span>
                        <span>Backend / Parser Error:</span>
                      </div>
                      <p className="text-[11px] text-on-surface break-words mt-1">{result?.error}</p>
                    </div>
                  ) : (
                    <div className="space-y-3 font-mono text-xs">
                      {/* Features Navigation Pills */}
                      <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-lg border border-outline-variant/50 font-sans">
                        <button
                          type="button"
                          onClick={() => setFeatureSubTab('global')}
                          className={`flex-1 py-1 px-1.5 text-center rounded-md text-[11px] transition-all cursor-pointer ${
                            featureSubTab === 'global'
                              ? 'bg-surface-container-lowest text-primary shadow-sm font-semibold'
                              : 'text-on-surface-variant hover:text-on-surface'
                          }`}
                        >
                          Global Topology
                        </button>
                        <button
                          type="button"
                          onClick={() => setFeatureSubTab('nodes')}
                          className={`flex-1 py-1 px-1.5 text-center rounded-md text-[11px] transition-all cursor-pointer ${
                            featureSubTab === 'nodes'
                              ? 'bg-surface-container-lowest text-primary shadow-sm font-semibold'
                              : 'text-on-surface-variant hover:text-on-surface'
                          }`}
                        >
                          Nodes ({features?.nodes?.length || 0})
                        </button>
                        <button
                          type="button"
                          onClick={() => setFeatureSubTab('edges')}
                          className={`flex-1 py-1 px-1.5 text-center rounded-md text-[11px] transition-all cursor-pointer ${
                            featureSubTab === 'edges'
                              ? 'bg-surface-container-lowest text-primary shadow-sm font-semibold'
                              : 'text-on-surface-variant hover:text-on-surface'
                          }`}
                        >
                          Edges ({features?.edges?.length || 0})
                        </button>
                        <button
                          type="button"
                          onClick={() => setFeatureSubTab('logs')}
                          className={`flex-1 py-1 px-1.5 text-center rounded-md text-[11px] transition-all cursor-pointer ${
                            featureSubTab === 'logs'
                              ? 'bg-surface-container-lowest text-primary shadow-sm font-semibold'
                              : 'text-on-surface-variant hover:text-on-surface'
                          }`}
                        >
                          Logs
                        </button>
                      </div>

                      {/* SUBTAB 1: GLOBAL GRAPH FEATURES */}
                      {featureSubTab === 'global' && (
                        <div className="bg-surface-container-low/60 p-2.5 rounded-lg border border-outline-variant/40 space-y-2">
                          <span className="text-[10px] text-outline uppercase font-semibold font-sans block">
                            Global Graph Topology (G) &amp; Ising
                          </span>

                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div className="bg-surface-container-lowest p-2 rounded border border-outline-variant/30">
                              <span className="text-outline text-[10px] block">Variables (|V|):</span>
                              <span className="font-bold text-primary">
                                {features?.global?.num_variables_V ?? quboNodes} Qubits
                              </span>
                            </div>

                            <div className="bg-surface-container-lowest p-2 rounded border border-outline-variant/30">
                              <span className="text-outline text-[10px] block">Interactions (|E|):</span>
                              <span className="font-bold text-on-surface">
                                {features?.global?.num_interactions_E ?? 0} edges
                              </span>
                            </div>

                            <div className="bg-surface-container-lowest p-2 rounded border border-outline-variant/30">
                              <span className="text-outline text-[10px] block">Spectral Gap (λ₂):</span>
                              <span className="font-bold text-secondary">
                                {features?.global?.laplacian_spectral_gap_lambda2 ?? 0}
                              </span>
                              <span className="text-[9px] text-outline block">Quantum propagation</span>
                            </div>

                            <div className="bg-surface-container-lowest p-2 rounded border border-outline-variant/30">
                              <span className="text-outline text-[10px] block">Spectral Radius (λ_max):</span>
                              <span className="font-bold text-on-surface">
                                {features?.global?.laplacian_spectral_radius ?? 0}
                              </span>
                            </div>

                            <div className="bg-surface-container-lowest p-2 rounded border border-outline-variant/30">
                              <span className="text-outline text-[10px] block">Density (|E|/|V|):</span>
                              <span className="font-bold text-on-surface">
                                {features?.global?.clause_variable_ratio ?? 0}
                              </span>
                            </div>

                            <div className="bg-surface-container-lowest p-2 rounded border border-outline-variant/30">
                              <span className="text-outline text-[10px] block">Frustration Balance:</span>
                              <span className="font-bold text-tertiary">
                                {Math.round((features?.global?.global_frustration_index || 0) * 100)}%
                              </span>
                              <span className="text-[9px] text-outline block">
                                Extremal eigenvalue L_signed
                              </span>
                            </div>
                          </div>

                          {/* Statistics h_i and J_ij */}
                          <div className="bg-surface-container-lowest p-2 rounded border border-outline-variant/30 text-[10px] space-y-1">
                            <div className="flex justify-between">
                              <span className="text-outline">Linear Coefs h_i:</span>
                              <span className="text-on-surface">
                                μ={features?.global?.h_statistics?.mean ?? 0}, σ²={features?.global?.h_statistics?.variance ?? 0}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-outline">Couplings J_ij:</span>
                              <span className="text-on-surface">
                                μ={features?.global?.J_statistics?.mean ?? 0}, σ²={features?.global?.J_statistics?.variance ?? 0}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* SUBTAB 2: NODE FEATURES */}
                      {featureSubTab === 'nodes' && (
                        <div className="bg-surface-container-low/60 p-2 rounded-lg border border-outline-variant/40 max-h-48 overflow-y-auto">
                          <table className="w-full text-left text-[10px]">
                            <thead>
                              <tr className="border-b border-outline-variant/40 text-outline">
                                <th className="pb-1 font-semibold">Variable</th>
                                <th className="pb-1 font-semibold">h_i</th>
                                <th className="pb-1 font-semibold">Degree d_i</th>
                                <th className="pb-1 font-semibold">Clustering</th>
                                <th className="pb-1 font-semibold">Penalty</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant/20">
                              {(features?.nodes || []).map((n) => (
                                <tr key={n.index} className="hover:bg-surface-container-lowest">
                                  <td className="py-1 text-primary font-bold">{n.variable}</td>
                                  <td className="py-1">{n.h_i}</td>
                                  <td className="py-1">{n.degree}</td>
                                  <td className="py-1">
                                    {n.clustering_coefficient === 'GNN' ? (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary-container/60 text-primary font-medium" title="Omitted in preprocessing; learned by GNN layers">
                                        GNN
                                      </span>
                                    ) : (
                                      n.clustering_coefficient
                                    )}
                                  </td>
                                  <td className="py-1 text-outline">{n.constraint_multiplier}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* SUBTAB 3: EDGE FEATURES */}
                      {featureSubTab === 'edges' && (
                        <div className="bg-surface-container-low/60 p-2 rounded-lg border border-outline-variant/40 max-h-48 overflow-y-auto">
                          {(features?.edges || []).length > 0 ? (
                            <table className="w-full text-left text-[10px]">
                              <thead>
                                <tr className="border-b border-outline-variant/40 text-outline">
                                  <th className="pb-1 font-semibold">Edge (u, v)</th>
                                  <th className="pb-1 font-semibold">J_ij</th>
                                  <th className="pb-1 font-semibold">Type</th>
                                  <th className="pb-1 font-semibold">Frustration</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-outline-variant/20">
                                {(features?.edges || []).map((e, idx) => (
                                  <tr key={idx} className="hover:bg-surface-container-lowest">
                                    <td className="py-1 text-primary">{e.u_var} — {e.v_var}</td>
                                    <td className="py-1 font-bold">{e.J_ij}</td>
                                    <td className="py-1 text-[9px] uppercase">
                                      <span
                                        className={
                                          e.coupling_type === 'antiferromagnetic'
                                            ? 'text-tertiary'
                                            : 'text-secondary'
                                        }
                                      >
                                        {e.coupling_type === 'antiferromagnetic' ? 'Antiferro' : 'Ferro'}
                                      </span>
                                    </td>
                                    <td className="py-1">{e.local_frustration_index}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <span className="text-outline text-[11px] p-2 block text-center">
                              No quadratic couplings in the Hamiltonian.
                            </span>
                          )}
                        </div>
                      )}

                      {/* SUBTAB 4: LOGS */}
                      {featureSubTab === 'logs' && (
                        <div className="bg-surface-container-lowest p-2 rounded-lg border border-outline-variant/40 max-h-48 overflow-y-auto text-[10px] space-y-1 text-on-surface-variant font-mono">
                          {((details?.console_logs && details.console_logs.length > 0)
                            ? details.console_logs
                            : (features?.console_summary || [])
                          ).map((line, idx) => (
                            <div key={idx} className="leading-relaxed">
                              <span className="text-outline mr-1.5">&gt;</span>
                              {line}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-2 border-t border-outline-variant/30 flex items-center justify-between text-outline text-[11px]">
                  <span>FastAPI • /api/solve</span>
                  <span className={hasRun && isSuccess ? 'text-secondary font-medium' : ''}>
                    {hasRun && isSuccess ? 'QAOA completed' : 'Listening'}
                  </span>
                </div>
              </div>
            )}

            {/* ================= TAB 3: 3D VISUALIZATION ================= */}
            {currentTab === '3d' && (
              <div className="flex-1 flex flex-col min-h-[260px]">
                <div className="flex-1 rounded-lg overflow-hidden border border-outline-variant/40 relative bg-surface-container-lowest">
                  <Visualizer3D
                    qubits={quboNodes > 0 ? quboNodes : 6}
                    bitstring={details?.optimal_bitstring || '1001'}
                  />
                </div>
                <div className="mt-2 text-center text-[11px] text-outline font-mono">
                  Drag to rotate the 3D topology
                </div>
              </div>
            )}


            {/* ================= TAB 4: QAOA HYPERPARAMETERS ================= */}
            {currentTab === 'params' && (
              <div className="flex flex-col gap-3 pt-0.5">
                {/* Header Sub-bar */}
                <div className="flex items-center justify-between pb-1 border-b border-outline-variant/30">
                  <span className="text-xs font-semibold text-on-surface">QAOA Configuration</span>
                  <div className="flex items-center gap-1.5">
                    <span className="bg-primary/10 text-primary text-[10px] font-medium px-2 py-0.5 rounded-full">
                      Optional
                    </span>
                    <span className="text-[10px] text-outline">Active values</span>
                  </div>
                </div>

                {/* Row 1: p-steps Layers & Shots */}
                <div className="grid grid-cols-2 gap-2.5">
                  {/* p-steps Layers */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-medium text-on-surface">p-step Layers</label>
                      <span className="text-[10px] font-mono text-outline">
                        p = {hyperparams?.pSteps || 2}
                      </span>
                    </div>
                    <div className="flex items-center bg-surface-container-low rounded-lg px-2 py-1 border border-outline-variant/50">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateHyperparams({
                            ...hyperparams,
                            pSteps: Math.max(1, (hyperparams?.pSteps || 2) - 1)
                          })
                        }
                        className="w-6 h-6 flex items-center justify-center text-on-surface-variant hover:text-on-surface font-bold text-xs cursor-pointer hover:bg-surface-container-lowest rounded-md transition-colors select-none"
                        title="Decrease layers"
                      >
                        -
                      </button>
                      <span className="flex-1 text-center font-mono text-xs font-semibold text-on-surface">
                        {hyperparams?.pSteps || 2}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateHyperparams({
                            ...hyperparams,
                            pSteps: Math.min(10, (hyperparams?.pSteps || 2) + 1)
                          })
                        }
                        className="w-6 h-6 flex items-center justify-center text-on-surface-variant hover:text-on-surface font-bold text-xs cursor-pointer hover:bg-surface-container-lowest rounded-md transition-colors select-none"
                        title="Increase layers"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Shots */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-on-surface">Shots</label>
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

                {/* Row: Quantum Backend (Qiskit / Qollab) */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-medium text-on-surface">
                      Quantum Backend (Qiskit / Qollab)
                    </label>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-primary/10 text-primary font-medium">
                      Qollab Hackathon
                    </span>
                  </div>
                  <div className="relative">
                    <select
                      value={hyperparams?.backend || 'aer_simulator'}
                      onChange={(e) =>
                        onUpdateHyperparams({
                          ...hyperparams,
                          backend: e.target.value
                        })
                      }
                      className="w-full bg-surface-container-lowest border border-outline-variant/60 hover:border-primary/60 focus:border-primary rounded-lg px-2.5 py-1 text-on-surface font-mono text-xs appearance-none focus:outline-none focus:ring-1 focus:ring-primary/20 cursor-pointer pr-7 shadow-sm transition-colors"
                    >
                      <option value="aer_simulator">Qiskit AerSimulator (Local Optimal)</option>
                      <option value="ionq_simulator">Qollab / IonQ Simulator (Cloud / Emulated)</option>
                      <option value="ionq_qpu">Qollab / IonQ QPU (Physical / Emulated)</option>
                    </select>
                    <span className="material-symbols-outlined text-[16px] text-primary pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
                      unfold_more
                    </span>
                  </div>

                  {/* Optional API Key field when Qollab / IonQ is selected */}
                  {(hyperparams?.backend === 'ionq_simulator' || hyperparams?.backend === 'ionq_qpu') && (
                    <div className="flex flex-col gap-0.5 pt-0.5">
                      <div className="flex items-center justify-between text-[10px] font-mono text-outline">
                        <span>Qollab / IonQ API Key (Optional)</span>
                        <span className="text-[9px] opacity-75">or environment variable</span>
                      </div>
                      <div className="flex items-center bg-surface-container-lowest rounded-lg px-2 py-1 border border-outline-variant/60 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 shadow-sm">
                        <input
                          type="password"
                          value={hyperparams?.backendConfig?.apiKey || ''}
                          onChange={(e) =>
                            onUpdateHyperparams({
                              ...hyperparams,
                              backendConfig: {
                                ...(hyperparams?.backendConfig || {}),
                                apiKey: e.target.value,
                                api_key: e.target.value
                              }
                            })
                          }
                          className="w-full bg-transparent font-mono text-xs text-on-surface focus:outline-none"
                          placeholder="Access token (empty = native emulation)"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Row 2: Classical Optimizer */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-on-surface">Classical Optimizer</label>
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

                  {/* Row 3: Angle Initialization */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-medium text-on-surface">
                        Angle Initialization [γ₀, β₀]
                      </label>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-tertiary/10 text-tertiary font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
                        PINN Active
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1 bg-surface-container-low p-1 rounded-lg border border-outline-variant/50">
                      {['Automatic', 'Heuristic', 'Manual'].map((mode) => {
                        const isSelected = (hyperparams?.angleInit || 'Automatic') === mode;
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

                    {/* PINN Informative Capsule for Automatic */}
                    {hyperparams?.angleInit === 'Automatic' && (
                      <div className="p-2.5 rounded-xl bg-surface-container-low/70 border border-tertiary/30 shadow-sm flex flex-col gap-1.5 mt-0.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px] text-tertiary">neurology</span>
                            <span className="text-[11px] font-bold text-on-surface">PINN-Guided Selection</span>
                          </div>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-tertiary/15 text-tertiary font-semibold">
                            17-Feature Network
                          </span>
                        </div>

                        <p className="text-[10px] text-on-surface-variant leading-relaxed">
                          Optimal starting angles <strong className="text-tertiary font-mono">[γ₀, β₀]</strong> and quantum telemetry are automatically computed by the <strong>Physics-Informed Neural Network (PINN)</strong>, evaluating in real-time the Laplacian spectral gap (λ₂), spectral radius, and quantum frustration index to mitigate Barren Plateaus.
                        </p>
                      </div>
                    )}

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
