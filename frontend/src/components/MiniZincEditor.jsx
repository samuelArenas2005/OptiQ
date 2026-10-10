import React, { useRef, useMemo, useState, useEffect } from 'react';
import { BIP_EXAMPLES } from '../constants/bipExamples';

export default function MiniZincEditor({
  tabs,
  activeTabId,
  onSelectTab,
  onAddTab,
  onAddExampleTab,
  onCloseTab,
  onUpdateCode,
  attachedFiles,
  onAddAttachedFiles,
  onRemoveAttachedFile
}) {
  const textareaRef = useRef(null);
  const preRef = useRef(null);
  const lineNumbersRef = useRef(null);
  const fileInputRef = useRef(null);
  const paramFileInputRef = useRef(null);
  const examplesMenuRef = useRef(null);

  const [showExamplesMenu, setShowExamplesMenu] = useState(false);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const code = activeTab ? activeTab.content : '';

  const lines = useMemo(() => code.split('\n'), [code]);

  // Close examples menu on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (examplesMenuRef.current && !examplesMenuRef.current.contains(event.target)) {
        setShowExamplesMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Synchronize scroll between textarea, syntax highlighting layer, and line numbers gutter
  const handleScroll = (e) => {
    const { scrollTop, scrollLeft } = e.target;
    if (preRef.current) {
      preRef.current.scrollTop = scrollTop;
      preRef.current.scrollLeft = scrollLeft;
    }
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = scrollTop;
    }
  };

  const handleKeyDown = (e) => {
    // Handle indentation with Tab key cleanly (inserts 2 spaces)
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newCode = code.substring(0, start) + '  ' + code.substring(end);
      onUpdateCode(newCode);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  // File upload and download actions
  const handleUploadCodeFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      onUpdateCode(content, file.name);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSaveFile = () => {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = activeTab?.name || 'modelo.mzn';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleAttachParamFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onAddAttachedFiles(files);
    }
    e.target.value = '';
  };

  return (
    <div className="w-full h-full flex flex-col bg-surface-container-lowest border border-outline-variant/60 rounded-xl shadow-sm relative">
      {/* File Tab Bar with support for up to 5 tabs + BIP Examples Dropdown */}
      <div className="flex items-center justify-between bg-surface-container-low border-b border-outline-variant/40 px-3 pt-2 relative z-30">
        {/* Left: Scrollable Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto min-w-0 pr-2">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-t-lg transition-colors cursor-pointer text-xs font-mono select-none shrink-0 ${
                  isActive
                    ? 'bg-surface-container-lowest border-t-2 border-primary text-on-surface font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low/70'
                }`}
              >
                <span className="material-symbols-outlined text-[16px] text-primary">
                  description
                </span>
                <span>{tab.name}</span>
                {tabs.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseTab(tab.id);
                    }}
                    className="w-4 h-4 rounded hover:bg-surface-container flex items-center justify-center text-outline hover:text-error transition-colors ml-1"
                    title="Cerrar pestaña"
                  >
                    <span className="material-symbols-outlined text-[12px]">close</span>
                  </button>
                )}
              </div>
            );
          })}

          {/* Add Empty Tab Button (up to 5 tabs) */}
          {tabs.length < 5 && (
            <button
              onClick={onAddTab}
              className="w-6 h-6 rounded hover:bg-surface-container flex items-center justify-center text-outline hover:text-primary transition-colors cursor-pointer ml-1 mb-1 shrink-0"
              title="Nueva pestaña vacía (máx 5)"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
            </button>
          )}
        </div>

        {/* Right: BIP Examples Dropdown + Clean Toolbar */}
        <div className="flex items-center gap-2 pb-1 shrink-0">
          {/* Minimalist BIP Examples Menu Dropdown */}
          <div className="relative inline-block" ref={examplesMenuRef}>
            <button
              type="button"
              onClick={() => setShowExamplesMenu((prev) => !prev)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-sans font-medium text-primary hover:bg-primary/10 bg-surface-container-lowest border border-outline-variant/70 shadow-sm transition-all cursor-pointer select-none"
              title="Añadir archivo con código de ejemplo de Programación Entera Binaria"
            >
              <span className="material-symbols-outlined text-[15px]">code_blocks</span>
              <span>+ Ejemplo BIP</span>
              <span className="material-symbols-outlined text-[13px] opacity-70">
                {showExamplesMenu ? 'expand_less' : 'expand_more'}
              </span>
            </button>

            {/* Dropdown Menu listing 5 BIP problems */}
            {showExamplesMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-72 bg-surface-container-lowest border border-outline-variant/80 rounded-xl shadow-xl z-50 py-1.5 overflow-hidden animate-in fade-in duration-150">
                <div className="px-3 py-1.5 text-[10px] uppercase font-semibold text-outline tracking-wider border-b border-outline-variant/40 flex items-center justify-between">
                  <span>Modelos BIP (0/1 Binarios)</span>
                  <span className="font-mono text-primary font-normal">5 problemas</span>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {BIP_EXAMPLES.map((example) => (
                    <button
                      key={example.id}
                      type="button"
                      onClick={() => {
                        if (onAddExampleTab) {
                          onAddExampleTab(example);
                        }
                        setShowExamplesMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-surface-container-low transition-colors flex flex-col gap-0.5 cursor-pointer group border-b border-outline-variant/20 last:border-0"
                    >
                      <div className="flex items-center justify-between text-xs font-semibold text-on-surface group-hover:text-primary">
                        <span>{example.title}</span>
                        <span className="text-[10px] font-mono font-normal text-outline">.mzn</span>
                      </div>
                      <div className="text-[11px] text-outline line-clamp-1">
                        {example.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="w-px h-4 bg-outline-variant/60"></div>

          {/* Clean Functional Toolbar Actions (Remaining file_open and save) */}
          <label
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
            title="Abrir archivo (.mzn, .dzn, .txt)"
          >
            <span className="material-symbols-outlined text-[17px]">file_open</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".mzn,.dzn,.txt,.qasm"
              className="hidden"
              onChange={handleUploadCodeFile}
            />
          </label>
          <button
            onClick={handleSaveFile}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
            title="Guardar archivo en disco"
          >
            <span className="material-symbols-outlined text-[17px]">save</span>
          </button>
        </div>
      </div>

      {/* Parameter Entry Sub-bar: Real Dynamic File Attachments */}
      <div className="bg-surface-container-low/60 border-b border-outline-variant/40 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-on-surface-variant font-label-sm text-xs">
            <span className="material-symbols-outlined text-[15px] text-primary">attachment</span>
            <span className="font-medium">Archivos de Procesamiento:</span>
          </div>

          {attachedFiles.length === 0 ? (
            <span className="text-xs text-outline italic">
              Sin archivos vinculados (.dzn, .json, .csv)
            </span>
          ) : (
            attachedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-1.5 bg-surface-container-lowest border border-outline-variant/60 rounded-md px-2 py-0.5 shadow-sm text-xs font-mono"
              >
                <span className="material-symbols-outlined text-[14px] text-secondary">
                  description
                </span>
                <span className="text-on-surface font-medium">{file.name}</span>
                <span className="text-[10px] bg-surface-container text-on-surface-variant px-1 rounded">
                  {file.size}
                </span>
                <button
                  onClick={() => onRemoveAttachedFile(file.id)}
                  className="w-4 h-4 flex items-center justify-center text-outline hover:text-error transition-colors cursor-pointer ml-0.5"
                  title="Desvincular archivo"
                >
                  <span className="material-symbols-outlined text-[12px]">close</span>
                </button>
              </div>
            ))
          )}
        </div>

        <div>
          <label className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-surface-container-lowest hover:bg-surface-container border border-outline-variant/60 text-on-surface hover:text-primary text-xs font-medium transition-colors cursor-pointer shadow-sm">
            <span className="material-symbols-outlined text-[15px] text-primary">add</span>
            <span>Adjuntar archivo</span>
            <input
              ref={paramFileInputRef}
              type="file"
              multiple
              accept=".dzn,.json,.csv"
              className="hidden"
              onChange={handleAttachParamFiles}
            />
          </label>
        </div>
      </div>

      {/* Code Editor Surface - Adapts to available height smoothly */}
      <div className="relative bg-surface-container-lowest flex-1 min-h-[140px] flex overflow-hidden">
        {/* Line Numbers Gutter */}
        <div
          ref={lineNumbersRef}
          className="select-none text-right pr-3 pl-3 text-outline-variant/90 flex flex-col font-mono text-[13px] leading-[22px] pt-[12px] border-r border-outline-variant/30 shrink-0 w-11 overflow-hidden bg-surface-container-lowest"
        >
          {lines.map((_, i) => (
            <span key={i} className="h-[22px] leading-[22px]">
              {i + 1}
            </span>
          ))}
        </div>

        {/* Editor Code Area with Highlighting & Native Typing Overlay */}
        <div className="flex-1 h-full relative overflow-hidden">
          {/* Syntax Highlighted Visual Layer (Rendered below textarea) */}
          <pre
            ref={preRef}
            className="absolute inset-0 editor-font-sync editor-pre-sync"
            aria-hidden="true"
          >
            <code>
              {lines.map((lineText, idx) => (
                <div key={idx}>
                  {lineText === '' ? ' ' : formatSyntaxLine(lineText)}
                </div>
              ))}
            </code>
          </pre>

          {/* Transparent Input Textarea (Transparent text, translucent selection, aligned caret) */}
          <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => onUpdateCode(e.target.value)}
            onKeyDown={handleKeyDown}
            onScroll={handleScroll}
            wrap="off"
            placeholder="% Escribe tu modelo declarativo MiniZinc aquí..."
            className="absolute inset-0 w-full h-full editor-font-sync editor-textarea-sync overflow-auto z-10"
            spellCheck="false"
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
          />
        </div>
      </div>
    </div>
  );
}

// MiniZinc syntax highlighter with 100% uniform character advance metrics
function formatSyntaxLine(line) {
  if (!line && line !== '') return null;
  if (line === '') return ' ';

  // Whole line comments
  const trimmed = line.trimStart();
  if (trimmed.startsWith('%') || trimmed.startsWith('//')) {
    return <span style={{ color: '#64748b', fontStyle: 'italic' }}>{line}</span>;
  }

  // Token regex capturing MiniZinc keywords, types, numbers, strings, comments and operators
  const TOKEN_REGEX = /(\b(?:int|float|bool|set|array|of|var|par|qreg|solve|maximize|minimize|satisfy|constraint|include|output|sum|q_sum|forall|exists|in|QAOA|quantum_ansatz|cost_hamiltonian|mixer)\b|\b\d+(?:\.\d+)?\b|%[^\n]*|\/\/[^\n]*|"(?:[^"\\]|\\.)*"|\.\.|[=;:,+\-*/()[\]{}<>.&|^~]+|\s+)/g;

  const parts = line.split(TOKEN_REGEX);

  return parts.map((token, idx) => {
    if (!token) return null;

    // Inline comments
    if (token.startsWith('%') || token.startsWith('//')) {
      return (
        <span key={idx} style={{ color: '#64748b', fontStyle: 'italic' }}>
          {token}
        </span>
      );
    }

    // Strings
    if (token.startsWith('"') && token.endsWith('"')) {
      return (
        <span key={idx} style={{ color: '#16a34a' }}>
          {token}
        </span>
      );
    }

    // Solve / Maximize / Minimize / Satisfy
    if (['solve', 'maximize', 'minimize', 'satisfy'].includes(token)) {
      return (
        <span key={idx} style={{ color: '#6a1edb' }}>
          {token}
        </span>
      );
    }

    // Constraints & Declaratives
    if (['constraint', 'include', 'output'].includes(token)) {
      return (
        <span key={idx} style={{ color: '#004ac6' }}>
          {token}
        </span>
      );
    }

    // Types
    if (['int', 'float', 'bool', 'set', 'array', 'of', 'var', 'par', 'qreg'].includes(token)) {
      return (
        <span key={idx} style={{ color: '#006a61' }}>
          {token}
        </span>
      );
    }

    // Aggregations / iterators
    if (['sum', 'q_sum', 'forall', 'exists', 'in'].includes(token)) {
      return (
        <span key={idx} style={{ color: '#0284c7' }}>
          {token}
        </span>
      );
    }

    // Quantum primitives
    if (['QAOA', 'quantum_ansatz', 'cost_hamiltonian', 'mixer'].includes(token)) {
      return (
        <span key={idx} style={{ color: '#d946ef' }}>
          {token}
        </span>
      );
    }

    // Numbers
    if (/^\d+(\.\d+)?$/.test(token)) {
      return (
        <span key={idx} style={{ color: '#d97706' }}>
          {token}
        </span>
      );
    }

    // Range '..' or Operators
    if (token === '..' || /^[=;:,+\-*/()[\]{}<>.&|^~]+$/.test(token)) {
      return (
        <span key={idx} style={{ color: '#334155' }}>
          {token}
        </span>
      );
    }

    // Variables / identifiers or whitespace
    return (
      <span key={idx} style={{ color: '#0b1c30' }}>
        {token}
      </span>
    );
  });
}
