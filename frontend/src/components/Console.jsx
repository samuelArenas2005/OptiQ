import React, { useState } from 'react';
import { Terminal, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

export default function Console({ logs = [], onClear }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={`console-pane ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="console-bar" onClick={() => setIsCollapsed(!isCollapsed)}>
        <div className="flex items-center gap-2">
          <Terminal size={13} className="text-blue" />
          <span className="console-title-text">Terminal Output</span>
          <span className="console-count">({logs.length})</span>
        </div>

        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onClear}
            className="btn-icon-tiny"
            title="Limpiar consola"
          >
            <Trash2 size={11} />
          </button>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="btn-icon-tiny"
            title={isCollapsed ? 'Expandir consola' : 'Minimizar consola'}
          >
            {isCollapsed ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="console-logs">
          {logs.length === 0 ? (
            <div className="console-empty">En espera de ejecución de modelo...</div>
          ) : (
            logs.map((log, idx) => (
              <div key={idx} className={`console-line ${log.type || 'info'}`}>
                <span className="log-time">[{log.time}]</span>
                <span className="log-text">{log.text}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
