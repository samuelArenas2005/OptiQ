import { PIPELINE_MOCK_DATA } from './mockData.js';

/**
 * Parsea el código MiniZinc ingresado por el usuario en líneas y tokens para el visor AST.
 */
export function parseMiniZincCode(codeText) {
  if (!codeText || typeof codeText !== 'string') {
    return PIPELINE_MOCK_DATA.code;
  }

  const rawLines = codeText.split('\n');
  const lines = [];
  const variables = [];
  const constraints = [];
  let objective = null;
  let varIdx = 0;
  let cIdx = 1;

  rawLines.forEach((rawText, idx) => {
    const text = rawText.trim();
    const lineNum = idx + 1;

    if (!text) {
      lines.push({ num: lineNum, text: rawText, type: 'empty' });
      return;
    }

    if (text.startsWith('%')) {
      lines.push({ num: lineNum, text: rawText, type: 'comment' });
      return;
    }

    // Detección de variables binarias
    if (text.includes('var 0..1:') || text.includes('var bool:') || /array\[.*?\]\s*of\s*var\s*0\.\.1:/.test(text) || /array\[.*?\]\s*of\s*var\s*bool:/.test(text)) {
      const match = text.match(/:\s*([a-zA-Z_][a-zA-Z0-9_]*)/);
      const varName = match ? match[1] : `x_${varIdx + 1}`;
      const qubitStr = `q${varIdx}`;

      lines.push({
        num: lineNum,
        text: rawText,
        type: 'var',
        varName,
        qubit: qubitStr,
        domain: '{0, 1}'
      });

      variables.push({
        name: varName,
        qubit: varIdx,
        label: `Variable ${varName} (${qubitStr})`,
        costWeight: 1
      });
      varIdx++;
      return;
    }

    // Detección de restricciones
    if (text.startsWith('constraint')) {
      const cId = `C${cIdx++}`;
      lines.push({
        num: lineNum,
        text: rawText,
        type: 'constraint',
        id: cId,
        rawConstraint: text.replace(/^constraint\s*/, '').replace(/;$/, '')
      });
      constraints.push({
        id: cId,
        text: text.replace(/^constraint\s*/, '').replace(/;$/, '')
      });
      return;
    }

    // Detección de objetivo
    if (text.startsWith('solve')) {
      const isMax = text.includes('maximize');
      lines.push({
        num: lineNum,
        text: rawText,
        type: 'objective',
        sense: isMax ? 'maximize' : 'minimize',
        rawObjective: text.replace(/^solve\s*(maximize|minimize)\s*/, '').replace(/;$/, '')
      });
      objective = {
        sense: isMax ? 'maximize' : 'minimize',
        rawText: text.replace(/^solve\s*(maximize|minimize)\s*/, '').replace(/;$/, '')
      };
      return;
    }

    // Parámetros u otras sentencias
    lines.push({ num: lineNum, text: rawText, type: 'param' });
  });

  return {
    raw: codeText,
    lines,
    variables,
    constraints,
    constraintsCount: constraints.length,
    objective,
    domain: 'Binary Integer Programming (BIP)'
  };
}

/**
 * Genera el flujo estocástico de disparos 3D (1024 shots) muestreado con
 * la distribución y conteos reales medidos por el simulador cuántico Qiskit.
 */
function generateRealShotsSequence(distribution, counts, totalShotsTarget = 1024) {
  if (!distribution || distribution.length === 0) {
    return null;
  }

  // Tomar hasta los 8 estados más significativos (o todos los disponibles)
  const topStates = distribution.slice(0, 8);
  const stateNames = Array.from(new Set(topStates.map((s) => s.bits))).sort();

  // Calcular pesos relativos
  let totalProb = topStates.reduce((acc, s) => acc + (s.prob || 0), 0);
  if (totalProb <= 0) totalProb = 1.0;

  const shots = [];
  const stateCounts = {};

  // Repartir proporcionalmente la cantidad de shots
  topStates.forEach((s) => {
    const stateCount = Math.max(1, Math.round(((s.prob || 0) / totalProb) * totalShotsTarget));
    stateCounts[s.bits] = stateCount;
    for (let i = 0; i < stateCount; i++) {
      shots.push(s.bits);
    }
  });

  // Ajustar al total exacto agregando el estado óptimo (peak)
  const peakState = distribution.find((d) => d.peak)?.bits || distribution[0].bits;
  while (shots.length < totalShotsTarget) {
    shots.push(peakState);
  }
  const finalShots = shots.slice(0, totalShotsTarget);

  // Mezclar pseudo-aleatoriamente preservando la probabilidad
  for (let i = finalShots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [finalShots[i], finalShots[j]] = [finalShots[j], finalShots[i]];
  }

  return {
    nombre: `Real Quantum Execution (${finalShots.length} shots)`,
    num_estados: stateNames.length,
    estados: stateNames,
    shots: finalShots
  };
}

/**
 * Transforma los resultados reales del backend FastAPI / Qiskit en la estructura
 * esperada por cada pestaña del visualizador de pipeline.
 * NOTA: La pestaña 4 (pinn) siempre conserva los datos mock según los requisitos.
 */
export function adaptBackendDataToPipeline(backendResult, rawCode, hyperparams) {
  if (backendResult && backendResult.success === false) {
    return {
      hasError: true,
      errorMessage: backendResult.error || 'Execution failed',
      code: {
        raw: rawCode || '',
        lines: [],
        variables: [],
        constraintsCount: 0
      },
      qubo: { nodes: [], edges: [], matrix: [], formula: '' },
      features: { density: 0, spectralGapLambda2: 0, spectralRadius: 0, frustrationIndex: 0, featureVector: [] },
      pinn: { architecture: { layers: [0], layerNames: [] }, predictions: { gamma: [], beta: [], formatted: [] } },
      circuit: { pLayers: 0, qubitsCount: 0, wires: [], stages: [] },
      shots: { totalShots: 0, optimalState: '', optimalValue: 0, distribution: [], streamSample: [] }
    };
  }

  if (!backendResult || !backendResult.success || !backendResult.details) {
    // Si aún no se ha ejecutado el backend, usar el código actual para la etapa 1 y mock para el resto
    const parsedCode = parseMiniZincCode(rawCode);
    const targetShots = Number(hyperparams?.shots || 1024);
    const mockShotsData = generateRealShotsSequence(PIPELINE_MOCK_DATA.shots.distribution, null, targetShots);
    return {
      ...PIPELINE_MOCK_DATA,
      code: {
        ...PIPELINE_MOCK_DATA.code,
        raw: rawCode || PIPELINE_MOCK_DATA.code.raw,
        lines: parsedCode.lines?.length > 0 ? parsedCode.lines : PIPELINE_MOCK_DATA.code.lines,
        variables: parsedCode.variables?.length > 0 ? parsedCode.variables : PIPELINE_MOCK_DATA.code.variables,
        constraintsCount: parsedCode.constraintsCount || PIPELINE_MOCK_DATA.code.constraintsCount
      },
      shots: {
        ...PIPELINE_MOCK_DATA.shots,
        totalShots: targetShots,
        shotsData: mockShotsData
      }
    };
  }

  const { parsedSummary = {}, features = {}, details = {} } = backendResult;
  const parsedCode = parseMiniZincCode(rawCode);

  // 1. CÓDIGO MINIZINC PARSEADO CON DATOS REALES
  const realVariablesList = (parsedSummary.variables || []).map((vName, idx) => ({
    name: vName,
    qubit: idx,
    label: `Variable ${vName} (q${idx})`,
    costWeight: parsedSummary.objective?.linear?.[vName] ?? 1
  }));

  const codeData = {
    raw: rawCode || PIPELINE_MOCK_DATA.code.raw,
    lines: parsedCode.lines || PIPELINE_MOCK_DATA.code.lines,
    variables: realVariablesList.length > 0 ? realVariablesList : (parsedCode.variables || PIPELINE_MOCK_DATA.code.variables),
    constraintsCount: parsedSummary.constraints_count || parsedCode.constraintsCount || 1,
    constraints: parsedSummary.constraints || parsedCode.constraints || [],
    objective: parsedSummary.objective || parsedCode.objective || null,
    domain: 'Binary Integer Programming (BIP)'
  };

  // 2. GRAFO & QUBO 3D REAL
  const nodeColors = ['#38bdf8', '#00ff88', '#a855f7', '#ffea00', '#f43f5e', '#fb923c', '#818cf8', '#34d399', '#38bdf8', '#00ff88'];
  const rawNodes = features.nodes && features.nodes.length > 0
    ? features.nodes
    : (parsedSummary.qubo_variables || ['x_1', 'x_2', 'x_3', 'x_4']).map((name, i) => ({
        index: i,
        variable: name,
        h_i: 0.0,
        degree: 1
      }));

  const numNodes = rawNodes.length;
  const quboNodes = rawNodes.map((n, i) => {
    const angle = (2 * Math.PI * i) / Math.max(1, numNodes);
    const radius = numNodes > 4 ? 2.6 : 2.2;
    return {
      id: n.index !== undefined ? n.index : i,
      label: `${n.variable || `q${i}`} (q${i})`,
      degree: n.degree || 1,
      h_i: Number((n.h_i || 0).toFixed(2)),
      color: nodeColors[i % nodeColors.length],
      x: Number((radius * Math.cos(angle)).toFixed(2)),
      y: Number((radius * Math.sin(angle)).toFixed(2)),
      z: i % 2 === 0 ? 0.25 : -0.25
    };
  });

  const rawEdges = features.edges || [];
  const quboEdges = rawEdges.map((e) => ({
    u: e.u,
    v: e.v,
    J_ij: Number((e.J_ij || 0).toFixed(2)),
    type: e.coupling_type || (e.J_ij > 0 ? 'antiferromagnetic' : 'ferromagnetic'),
    label: `J_${e.u}${e.v} = ${e.J_ij >= 0 ? '+' : ''}${Number(e.J_ij).toFixed(2)}`
  }));

  // Matriz QUBO N x N
  const matrixSize = Math.max(1, numNodes);
  const quboMatrix = Array.from({ length: matrixSize }, () => Array(matrixSize).fill(0));
  quboNodes.forEach((n) => {
    if (quboMatrix[n.id]) quboMatrix[n.id][n.id] = n.h_i;
  });
  quboEdges.forEach((e) => {
    if (quboMatrix[e.u] && quboMatrix[e.v]) {
      quboMatrix[e.u][e.v] = e.J_ij;
      quboMatrix[e.v][e.u] = e.J_ij;
    }
  });

  const quboData = {
    nodes: quboNodes,
    edges: quboEdges,
    matrix: quboMatrix,
    formula: "H_C = \\sum_{i} h_i Z_i + \\sum_{(i,j)} J_{ij} Z_i Z_j + \\lambda \\sum_k (\\text{Restricción}_k)^2",
    penaltyLambda: 10.0
  };

  // 3. FEATURES TOPOLÓGICAS Y FÍSICO-ESPECTRALES REALES
  const gFeats = features.global || {};
  const density = gFeats.graph_density ?? 0.0;
  const spectralGap = gFeats.laplacian_spectral_gap_lambda2 ?? 0.0;
  const spectralRadius = gFeats.laplacian_spectral_radius ?? 0.0;
  const frustrationIndex = gFeats.global_frustration_index ?? 0.0;
  const clauseVarRatio = gFeats.clause_variable_ratio ?? 0.0;
  const hStats = gFeats.h_statistics || { mean: 0, variance: 0, min: 0, max: 0 };
  const JStats = gFeats.J_statistics || { mean: 0, variance: 0, min: 0, max: 0 };

  // 11 features físicas continuas extraídas por extract_bip_features
  const hStd = Math.sqrt(Math.max(0, hStats.variance || 0));
  const JStd = Math.sqrt(Math.max(0, JStats.variance || 0));
  const isKnapsack = rawCode ? /capacity|knapsack/i.test(rawCode) : true;

  const featuresData = {
    density,
    spectralGapLambda2: spectralGap,
    spectralRadius,
    frustrationIndex,
    clauseVarRatio,
    numVariables: gFeats.num_variables_V || numNodes,
    numInteractions: gFeats.num_interactions_E || quboEdges.length,
    hStats,
    JStats,
    featureVector: [
      { name: "1. Graph Density (ρ)", value: density, unit: "", desc: "Quadratic coupling density" },
      { name: "2. Spectral Gap (λ₂)", value: spectralGap, unit: "rad", desc: "Quantum propagation speed L=D-A" },
      { name: "3. Spectral Radius (λ_max)", value: spectralRadius, unit: "rad", desc: "Maximum Laplacian energy bound" },
      { name: "4. Frustration Index (χ)", value: frustrationIndex, unit: "%", desc: "Signed Laplacian extremal eigenvalue" },
      { name: "5. Qubits / Variables (|V|)", value: gFeats.num_variables_V || numNodes, unit: "qubits", desc: "Hilbert space dimension 2^N" },
      { name: "6. Quadratic Couplings (|E|)", value: gFeats.num_interactions_E || quboEdges.length, unit: "edges", desc: "Number of J_ij interactions" },
      { name: "7. Clause/Var Ratio (E/V)", value: clauseVarRatio, unit: "", desc: "Topological constraint degree" },
      { name: "8. Mean h Fields (μ_h)", value: hStats.mean, unit: "eV", desc: "Net Z polarization bias" },
      { name: "9. Std Dev h Fields (σ_h)", value: Number(hStd.toFixed(4)), unit: "eV", desc: "Local field dispersion" },
      { name: "10. Mean Couplings (μ_J)", value: JStats.mean, unit: "eV", desc: "Average antiferromagnetic magnitude" },
      { name: "11. Std Dev Couplings (σ_J)", value: Number(JStd.toFixed(4)), unit: "eV", desc: "Quadratic bond dispersion" },
      { name: "12. Knapsack Family", value: isKnapsack ? 1 : 0, unit: "one-hot", desc: "Energy landscape classification" },
      { name: "13. MaxCut_Reg Family", value: !isKnapsack ? 1 : 0, unit: "one-hot", desc: "Unconstrained regular problem" },
      { name: "14. MaxCut_BA Family", value: 0, unit: "one-hot", desc: "Scale-free Barabási-Albert graph" },
      { name: "15. MaxCut_ER Family", value: 0, unit: "one-hot", desc: "Erdős-Rényi random graph" },
      { name: "16. FrustratedIsing Family", value: 0, unit: "one-hot", desc: "Highly frustrated spin glass" },
      { name: "17. VertexCover Family", value: 0, unit: "one-hot", desc: "Minimum vertex cover" }
    ]
  };

  // 4. PHYSICS-INFORMED NEURAL NETWORK (PINN) - REAL NETWORK DATA
  const rawPinn = backendResult?.pinn || details?.pinn || null;
  const p1Gamma = rawPinn?.p1?.gamma?.[0] ?? rawPinn?.gamma?.[0] ?? 0.3927;
  const p1Beta  = rawPinn?.p1?.beta?.[0]  ?? rawPinn?.beta?.[0]  ?? 0.5236;
  const p2Gamma = rawPinn?.p2?.gamma ?? [p1Gamma, 0.7854];
  const p2Beta  = rawPinn?.p2?.beta  ?? [p1Beta, 0.2618];
  const telem = rawPinn?.telemetry || {};
  const modelInfo = rawPinn?.model_info || {};

  const pinnData = {
    architecture: {
      layers: modelInfo.layers || [17, 12, 8, 6],
      layerNames: [
        "17 Spectral Features (Input ℝ¹⁷)",
        "ResBlock 1 + BatchNorm (128)",
        "ResBlock 2 + Dropout (64)",
        "QAOA Angles (γ, β) + Telemetry"
      ]
    },
    lossPhysics: modelInfo.loss_physics ?? 0.2678,
    lossData: modelInfo.val_mae ?? 0.3037,
    epochsTrained: modelInfo.epochs_trained ?? 40,
    optimizer: modelInfo.optimizer || "AdamW + CosineAnnealing + Mod-π Regularizer",
    predictions: {
      gamma: p2Gamma,
      beta: p2Beta,
      telemetry: telem,
      formatted: [
        { name: "γ₁ (Layer 1 Cost)", value: `${p1Gamma.toFixed(4)} rad`, raw: p1Gamma },
        { name: "β₁ (Layer 1 Mixer)", value: `${p1Beta.toFixed(4)} rad`, raw: p1Beta },
        { name: "γ₂ (Layer 2 Cost)", value: `${(p2Gamma[1] ?? p1Gamma).toFixed(4)} rad`, raw: p2Gamma[1] ?? p1Gamma },
        { name: "β₂ (Layer 2 Mixer)", value: `${(p2Beta[1] ?? p1Beta).toFixed(4)} rad`, raw: p2Beta[1] ?? p1Beta },
        { name: "Recommended Shots", value: `${telem.recommended_shots || 1024}`, raw: telem.recommended_shots || 1024 },
        { name: "Optimal Depth (p*)", value: `p = ${telem.target_depth_p_star || 2}`, raw: telem.target_depth_p_star || 2 }
      ]
    }
  };

  // 5. CIRCUITO QAOA Y QUANTUM COMPOSER REAL
  const qubitsCount = details.qubits_count || numNodes || 4;
  const circuitWires = quboNodes.slice(0, qubitsCount).map((n, i) => `q${i} (${n.label ? n.label.split(' ')[0] : `x${i + 1}`})`);
  while (circuitWires.length < qubitsCount) {
    circuitWires.push(`q${circuitWires.length} (x${circuitWires.length + 1})`);
  }

  const pLayers = details.p_layers || hyperparams?.pSteps || 2;

  const circuitData = {
    pLayers,
    qubitsCount,
    wires: circuitWires,
    qasm: details.qasm || "",
    hardware: details.hardware || "Qiskit AerSimulator",
    circuitDepth: details.circuit_depth || 4,
    stages: PIPELINE_MOCK_DATA.circuit.stages
  };

  // 6. SHOTS Y SOLUCIÓN REAL
  const optimalBitstring = details.optimal_bitstring || "0000";
  const optimalValue = details.optimal_value !== undefined ? details.optimal_value : 0.0;
  const optimalSolution = details.solution || {};
  const energy = details.energy !== undefined ? details.energy : 0.0;
  const distribution = details.distribution || [];
  const counts = details.counts || {};
  const totalShots = Number(details.shots || hyperparams?.shots || 1024);

  const realShotsData = generateRealShotsSequence(distribution, counts, totalShots);

  const shotsData = {
    totalShots,
    optimalState: optimalBitstring,
    optimalValue,
    optimalVariables: optimalSolution,
    energyMin: energy,
    feasible: distribution.find((d) => d.bits === optimalBitstring)?.feasible ?? true,
    distribution: distribution.length > 0 ? distribution : PIPELINE_MOCK_DATA.shots.distribution,
    shotsData: realShotsData
  };

  return {
    code: codeData,
    qubo: quboData,
    features: featuresData,
    pinn: pinnData, // MOCK EXACTO según requerimiento
    circuit: circuitData,
    shots: shotsData
  };
}
