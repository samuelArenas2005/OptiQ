import React, { useState } from 'react';
import Header from './components/Header';
import MiniZincEditor from './components/MiniZincEditor';
import RightTelemetryPanel from './components/RightTelemetryPanel';
import { runQuantumSolver } from './services/quantumApi';
import PipelineModal from './pipeline-visualizer/PipelineModal';
import SubtleParticles from './components/SubtleParticles';
const DEFAULT_CODE = `int: n = 4;
int: capacity = 7;
array[1..4] of int: weights = [2, 3, 4, 5];
array[1..4] of int: profits = [3, 4, 5, 8];

array[1..4] of var 0..1: x;

constraint sum(i in 1..n)(weights[i] * x[i]) <= capacity;

solve maximize sum(i in 1..n)(profits[i] * x[i]);
`;

export default function App() {
  // Tabs management (up to 5 tabs)
  const [tabs, setTabs] = useState([
    { id: 'tab-1', name: 'qaoa_problem.mzn', content: DEFAULT_CODE }
  ]);
  const [activeTabId, setActiveTabId] = useState('tab-1');

  // Real attached processing files (.dzn, .json, .csv)
  const [attachedFiles, setAttachedFiles] = useState([]);

  // Execution states
  const [hasRun, setHasRun] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(1);
  const [loadingMessage, setLoadingMessage] = useState('Starting quantum compilation...');
  const [result, setResult] = useState(null);

  // Active right panel tab to trigger view on run
  const [activeRightTab, setActiveRightTab] = useState('params'); // 'params', 'solution', 'console', '3d'
  const [isPipelineModalOpen, setIsPipelineModalOpen] = useState(false);
  const [pipelineInitialStage, setPipelineInitialStage] = useState(null);

  // QAOA Hyperparameters with manual seed angles and Qiskit/Qollab backend support
  const [hyperparams, setHyperparams] = useState({
    pSteps: 3,
    shots: 8192,
    optimizer: 'COBYLA',
    angleInit: 'Automatic', // 'Automatic', 'Heuristic', 'Manual'
    gamma0: 0.39,
    beta0: 0.78,
    backend: 'aer_simulator', // 'aer_simulator', 'ionq_simulator', 'ionq_qpu'
    backendConfig: null
  });

  // Tab Handlers
  const handleAddTab = () => {
    if (tabs.length >= 5) return;
    const newId = `tab-${Date.now()}`;
    const newTab = {
      id: newId,
      name: `file_${tabs.length + 1}.mzn`,
      content: ''
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
  };

  const handleAddExampleTab = (example) => {
    if (tabs.length >= 5) {
      // If there are already 5 tabs, replace the active one with the example
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId
            ? { ...t, name: example.name, content: example.code }
            : t
        )
      );
      return;
    }
    const newId = `tab-${Date.now()}`;
    const newTab = {
      id: newId,
      name: example.name,
      content: example.code
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
  };

  const handleCloseTab = (id) => {
    if (tabs.length <= 1) return;
    const newTabs = tabs.filter((t) => t.id !== id);
    setTabs(newTabs);
    if (activeTabId === id) {
      setActiveTabId(newTabs[0].id);
    }
  };

  const handleUpdateCode = (newCode, optionalName) => {
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id === activeTabId) {
          return {
            ...t,
            content: newCode,
            name: optionalName || t.name
          };
        }
        return t;
      })
    );
  };

  // Processing files handlers
  const handleAddAttachedFiles = (files) => {
    const newItems = files.map((f, idx) => ({
      id: `file-${Date.now()}-${idx}`,
      name: f.name,
      size: `${(f.size / 1024).toFixed(1)} KB`,
      type: f.name.split('.').pop()
    }));
    setAttachedFiles((prev) => [...prev, ...newItems]);
  };

  const handleRemoveAttachedFile = (id) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Quantum / Backend Execution Handler
  const handleRunExecution = async (targetView = 'solution', targetStage = null) => {
    const activeTab = tabs.find((t) => t.id === activeTabId);
    const codeToRun = activeTab ? activeTab.content : '';

    if (targetView === '3d' || targetStage) {
      setPipelineInitialStage(targetStage || null);
      setIsPipelineModalOpen(true);
    }

    setIsLoading(true);
    setLoadingStep(1);
    setLoadingMessage('Sending MiniZinc model to FastAPI backend...');

    try {
      const backendResponse = await runQuantumSolver(
        codeToRun,
        hyperparams,
        (prog) => {
          if (prog && typeof prog === 'object') {
            setLoadingStep(prog.step || 1);
            setLoadingMessage(prog.message || '');
          }
        }
      );

      setResult(backendResponse);
      setHasRun(true);
      setActiveRightTab(targetView);
    } catch (err) {
      setResult({
        success: false,
        error: err.message || 'Unexpected error during execution'
      });
      setHasRun(true);
      setActiveRightTab('console');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-screen max-h-screen bg-surface-container-lowest flex flex-col overflow-hidden select-none relative">
      {/* Background Particles */}
      <SubtleParticles />
      
      {/* Top Application Header - Full width */}
      <Header />

      {/* Main Workspace Stage - Fixed viewport height */}
      <main className="flex-1 min-h-0 w-full px-4 sm:px-6 py-2.5 flex flex-col overflow-hidden">
        <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0 w-full overflow-hidden">
          {/* Left Workspace (2/3 width) - Pure Code Editor maximizing vertical space */}
          <div className="w-full lg:w-2/3 flex flex-col h-full min-h-0 overflow-hidden">
            <MiniZincEditor
              tabs={tabs}
              activeTabId={activeTabId}
              onSelectTab={setActiveTabId}
              onAddTab={handleAddTab}
              onAddExampleTab={handleAddExampleTab}
              onCloseTab={handleCloseTab}
              onUpdateCode={handleUpdateCode}
              attachedFiles={attachedFiles}
              onAddAttachedFiles={handleAddAttachedFiles}
              onRemoveAttachedFile={handleRemoveAttachedFile}
            />
          </div>

          {/* Right Telemetry & Results Panel (1/3 width) */}
          <div className="w-full lg:w-1/3 flex flex-col h-full min-h-0 overflow-hidden">
            <RightTelemetryPanel
              onRun={() => handleRunExecution('solution')}
              onRunWith3D={() => handleRunExecution('3d')}
              isLoading={isLoading}
              loadingStep={loadingStep}
              loadingMessage={loadingMessage}
              hasRun={hasRun}
              result={result}
              hyperparams={hyperparams}
              onUpdateHyperparams={setHyperparams}
              activeTab={activeRightTab}
              onSelectTab={setActiveRightTab}
            />
          </div>
        </div>
      </main>

      {/* Slim IDE Status Bar */}
      <footer className="w-full px-4 sm:px-6 py-1 bg-surface-container-lowest border-t border-outline-variant/40 flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-outline shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-on-surface-variant/80 font-medium">OptiQ IDE</span>
        </div>
        <div className="opacity-80">
          This effort is supported by Qollab &amp; IonQ
        </div>
        <div className="hidden sm:flex items-center gap-3 opacity-60">
          <span>Qiskit • IonQ • Qollab</span>
        </div>
      </footer>

      {/* End-to-End Quantum Pipeline Visualizer */}
      <PipelineModal
        isOpen={isPipelineModalOpen}
        onClose={() => {
          setIsPipelineModalOpen(false);
          setPipelineInitialStage(null);
        }}
        initialCode={tabs.find((t) => t.id === activeTabId)?.content || DEFAULT_CODE}
        result={result}
        isLoading={isLoading}
        loadingStep={loadingStep}
        loadingMessage={loadingMessage}
        hyperparams={hyperparams}
        initialStageId={pipelineInitialStage}
      />
    </div>
  );
}

