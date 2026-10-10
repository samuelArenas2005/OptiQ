import React, { useState } from 'react';

export default function BottomOutputCards({
  hasRun,
  result,
  isConsoleOpen,
  setIsConsoleOpen,
  isSolutionOpen,
  setIsSolutionOpen
}) {

  const parsedSummary = result?.parsedSummary;
  const details = result?.details;
  const isSuccess = result?.success;

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-2.5 shrink-0 mt-1.5">
      {/* Console Output Card - Collapsible */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/60 overflow-hidden transition-all duration-200">
        {/* Clickable Header */}
        <div
          onClick={() => setIsConsoleOpen(!isConsoleOpen)}
          className="flex items-center justify-between px-3 py-2 bg-surface-container-low/50 hover:bg-surface-container-low cursor-pointer transition-colors select-none"
          title={isConsoleOpen ? 'Haga clic para contraer' : 'Haga clic para ampliar'}
        >
          <div className="flex items-center gap-2 text-on-surface text-xs font-semibold">
            <span className="material-symbols-outlined text-[16px] text-primary">terminal</span>
            <span>Console Output</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-normal ${
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

          <div className="flex items-center gap-2">
            {hasRun && (
              <span className="text-[10px] font-mono text-outline hidden sm:inline">
                {result?.timestamp || ''}
              </span>
            )}
            <span className="text-outline text-xs flex items-center hover:text-on-surface">
              <span className="material-symbols-outlined text-[18px]">
                {isConsoleOpen ? 'expand_less' : 'expand_more'}
              </span>
            </span>
          </div>
        </div>

        {/* Collapsible Content */}
        {isConsoleOpen && (
          <div className="p-3 border-t border-outline-variant/30 flex flex-col justify-between min-h-[125px] max-h-[160px] overflow-y-auto">
            <div>
              {!hasRun ? (
                /* Empty State */
                <div className="flex flex-col items-center justify-center py-5 text-center text-outline">
                  <span className="material-symbols-outlined text-[24px] opacity-40 mb-1">
                    code_blocks
                  </span>
                  <p className="text-xs font-medium text-on-surface-variant">Consola en espera</p>
                  <p className="text-[11px] max-w-xs mt-0.5 text-outline">
                    Haz clic en <strong className="text-primary">RUN</strong> para parsear el modelo declarativo en FastAPI.
                  </p>
                </div>
              ) : !isSuccess ? (
                /* Error State from Backend */
                <div className="space-y-1 font-mono text-xs text-error bg-error/5 p-2.5 rounded-lg border border-error/20">
                  <div className="flex items-center gap-1 font-semibold">
                    <span className="material-symbols-outlined text-[16px]">error</span>
                    <span>Error en el Backend / Parser:</span>
                  </div>
                  <p className="text-[11px] text-on-surface break-words">{result?.error}</p>
                </div>
              ) : (
                /* Real Parsed Summary from Backend */
                <div className="space-y-1.5 font-mono text-xs text-on-surface-variant">
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
                      {parsedSummary?.qubo_nodes ?? 0} nodos
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-outline">Función Objetivo:</span>
                    <span className="font-medium text-on-surface truncate max-w-[200px]">
                      {parsedSummary?.objective?.sense || 'Sin objetivo'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-3 pt-2 border-t border-outline-variant/30 flex items-center justify-between text-outline text-[11px]">
              <span>FastAPI Backend • /api/solve</span>
              <span className="flex items-center gap-1">
                {hasRun && isSuccess ? (
                  <span className="text-secondary font-medium">Parseo verificado</span>
                ) : (
                  <span>Modo escucha</span>
                )}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Solution Result Card - Collapsible */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/60 overflow-hidden transition-all duration-200">
        {/* Clickable Header */}
        <div
          onClick={() => setIsSolutionOpen(!isSolutionOpen)}
          className="flex items-center justify-between px-3 py-2 bg-surface-container-low/50 hover:bg-surface-container-low cursor-pointer transition-colors select-none"
          title={isSolutionOpen ? 'Haga clic para contraer' : 'Haga clic para ampliar'}
        >
          <div className="flex items-center gap-2 text-on-surface text-xs font-semibold">
            <span className="material-symbols-outlined text-[16px] text-tertiary">flare</span>
            <span>Solution - Quantum Result</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-normal ${
                !hasRun
                  ? 'bg-surface-container text-outline'
                  : isSuccess
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'bg-error/10 text-error font-medium'
              }`}
            >
              {!hasRun ? 'Sin solución' : isSuccess ? `${parsedSummary?.qubo_nodes ?? 0} Qubits` : 'Error'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-outline text-xs flex items-center hover:text-on-surface">
              <span className="material-symbols-outlined text-[18px]">
                {isSolutionOpen ? 'expand_less' : 'expand_more'}
              </span>
            </span>
          </div>
        </div>

        {/* Collapsible Content */}
        {isSolutionOpen && (
          <div className="p-3 border-t border-outline-variant/30 flex flex-col justify-between min-h-[125px] max-h-[160px] overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-outline-variant/30">
                <span className="text-xs text-on-surface-variant font-medium">Resultados del Algoritmo</span>
                {hasRun && isSuccess && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.print();
                    }}
                    className="flex items-center gap-1 px-2 py-0.5 rounded border border-outline-variant/60 bg-surface-container-low hover:bg-surface-container hover:text-primary text-on-surface-variant text-[11px] transition-colors cursor-pointer"
                    title="Imprimir o exportar solución"
                  >
                    <span className="material-symbols-outlined text-[13px]">print</span>
                    <span>Imprimir</span>
                  </button>
                )}
              </div>

              {!hasRun ? (
                /* Empty State */
                <div className="flex flex-col items-center justify-center py-5 text-center text-outline">
                  <span className="material-symbols-outlined text-[24px] opacity-40 mb-1">
                    biotech
                  </span>
                  <p className="text-xs font-medium text-on-surface-variant">Sin solución calculada</p>
                  <p className="text-[11px] max-w-xs mt-0.5 text-outline">
                    Los resultados preliminares del backend aparecerán aquí tras enviar el modelo.
                  </p>
                </div>
              ) : !isSuccess ? (
                /* Error State */
                <div className="py-4 text-center text-outline text-xs">
                  <p>No se generaron resultados debido al error en el parseo del modelo.</p>
                </div>
              ) : (
                /* Real Info from backend */
                <div className="space-y-2">
                  <div className="py-2 px-3 rounded-lg bg-surface-container-low border border-outline-variant/40 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[11px] text-on-surface-variant font-medium">
                        Fase Preliminar
                      </span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-base font-bold font-headline-sm text-primary tracking-tight">
                          Parseo Exitoso
                        </span>
                      </div>
                    </div>
                    <div className="h-6 w-px bg-outline-variant/40"></div>
                    <div className="flex flex-col text-right">
                      <span className="text-[11px] text-on-surface-variant font-medium">
                        Nodos Binarios
                      </span>
                      <div className="font-mono text-xs font-semibold text-on-surface mt-0.5">
                        {parsedSummary?.qubo_nodes ?? 0} Qubits
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-on-surface-variant bg-surface-container-low/50 p-2 rounded-lg border border-outline-variant/30">
                    <p>
                      <strong>Variables QUBO:</strong>{' '}
                      {(parsedSummary?.qubo_variables || []).join(', ') || 'Sin variables asignadas'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-2 text-outline text-[11px] flex items-center justify-between">
              <span>
                {hasRun && isSuccess ? 'Estructura binaria construida' : 'Esperando datos...'}
              </span>
              <span className="text-primary font-medium">
                {hasRun && isSuccess ? `Solver: ${details?.solver_used || 'qaoa'}` : ''}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
