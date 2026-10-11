import logging
import numpy as np
import networkx as nx
from typing import Dict, Any, List, Tuple
from scipy.linalg import eigvalsh

logger = logging.getLogger("FeatureExtractor")


def extract_bip_features(qubo_problem: Any, original_qp: Any = None) -> Dict[str, Any]:
    """
    Extrae la representación y features de cualquier problema de Programación Entera Binaria (BIP)
    mapeado a un modelo QUBO y su correspondiente Hamiltoniano de Ising:
        H_C = sum_{i} h_i Z_i + sum_{i < j} J_{ij} Z_i Z_j

    Divide las features en tres niveles computacionalmente eficientes (baratos de calcular):
    1. Features de Nodos (V_i): Coeficiente lineal h_i, grado d_i, clustering local C_i, multiplicador de restricción.
    2. Features de Aristas (E_ij): Acoplamiento J_ij, índice de frustración local.
    3. Features Globales del Grafo (G): Gap espectral laplaciano lambda_2, radio espectral,
       densidad, relación cláusula/variable, índice de frustración global y estadísticos de {h_i} y {J_ij}.
    """
    logger.info("Iniciando extracción de features de la instancia BIP / QUBO...")

    var_names = [v.name for v in qubo_problem.variables]
    n_vars = len(var_names)

    if n_vars == 0:
        return _empty_features()

    # 1. Mapeo a Hamiltoniano de Ising (Pauli Z y ZZ)
    try:
        operator, offset = qubo_problem.to_ising()
    except Exception as e:
        logger.warning(f"Error convirtiendo a Ising con to_ising(): {e}. Usando coeficientes QUBO directos.")
        operator = None
        offset = 0.0

    # Extraer h_i y J_ij
    h = {i: 0.0 for i in range(n_vars)}
    J = {}

    if operator is not None:
        for pauli, coeff in zip(operator.paulis, operator.coeffs):
            # En Qiskit, el bit 0 de Pauli está en el extremo derecho (little-endian)
            z_indices = [i for i, bit in enumerate(reversed(pauli.z)) if bit]
            val = float(coeff.real)
            if len(z_indices) == 1:
                idx = z_indices[0]
                if idx < n_vars:
                    h[idx] += val
            elif len(z_indices) == 2:
                u, v = sorted(z_indices)
                if u < n_vars and v < n_vars:
                    J[(u, v)] = J.get((u, v), 0.0) + val
    else:
        # Fallback a partir de la matriz QUBO
        linear_dict = qubo_problem.objective.linear.to_dict()
        quad_dict = qubo_problem.objective.quadratic.to_dict()
        for idx in range(n_vars):
            h[idx] = float(linear_dict.get(idx, 0.0))
        for (u, v), w in quad_dict.items():
            if u != v:
                pair = tuple(sorted([u, v]))
                J[pair] = J.get(pair, 0.0) + float(w) / 4.0

    # 2. Construcción del Grafo de Interacciones G = (V, E)
    G = nx.Graph()
    G.add_nodes_from(range(n_vars))
    for (u, v), coupling in J.items():
        if abs(coupling) > 1e-9:
            G.add_edge(u, v, weight=abs(coupling), J=coupling)

    # 3. Multiplicador de Restricción Acumulado por Variable
    constraint_multipliers = {i: 0.0 for i in range(n_vars)}
    if original_qp is not None and hasattr(original_qp, 'linear_constraints'):
        penalty_base = 10.0  # Peso base de penalización
        for c in original_qp.linear_constraints:
            linear_terms = c.linear.to_dict()
            for var_idx_or_name, coeff in linear_terms.items():
                # Encontrar índice de la variable
                if isinstance(var_idx_or_name, str):
                    if var_idx_or_name in var_names:
                        v_idx = var_names.index(var_idx_or_name)
                        constraint_multipliers[v_idx] += abs(float(coeff)) * penalty_base
                elif isinstance(var_idx_or_name, int) and var_idx_or_name < n_vars:
                    constraint_multipliers[var_idx_or_name] += abs(float(coeff)) * penalty_base

    # 4. Features de Nodos (V_i)
    degrees = dict(G.degree())
    clustering_dict = nx.clustering(G)

    node_features = []
    for i in range(n_vars):
        node_features.append({
            "index": i,
            "variable": var_names[i],
            "h_i": round(float(h.get(i, 0.0)), 4),
            "degree": int(degrees.get(i, 0)),
            "clustering_coefficient": round(float(clustering_dict.get(i, 0.0)), 4),
            "constraint_multiplier": round(float(constraint_multipliers.get(i, 0.0)), 2)
        })

    # 5. Features de Aristas (E_ij) y Frustración Local
    # Un triángulo (u, v, w) en Ising es frustrado si no se pueden satisfacer todos los acoplamientos simultáneamente.
    # En convenio de acoplamiento antiferromagnético (J > 0), un ciclo con un número impar de enlaces J > 0 está frustrado.
    edge_features = []
    frustrated_triangles_count = 0
    total_triangles_count = 0

    triangles = [clq for clq in nx.enumerate_all_cliques(G) if len(clq) == 3]
    triangle_frustration = {}
    for tri in triangles:
        u, v, w = tri
        j_uv = G[u][v].get("J", 0.0)
        j_vw = G[v][w].get("J", 0.0)
        j_wu = G[w][u].get("J", 0.0)
        
        # Conteo de enlaces antiferromagnéticos (J > 0)
        antiferro_count = sum(1 for val in [j_uv, j_vw, j_wu] if val > 1e-9)
        # Es frustrado si el número de acoplamientos antiferro en el ciclo es impar
        is_frustrated = (antiferro_count % 2 == 1)
        triangle_frustration[tuple(sorted(tri))] = is_frustrated
        if is_frustrated:
            frustrated_triangles_count += 1
        total_triangles_count += 1

    for (u, v) in G.edges():
        j_val = float(G[u][v].get("J", 0.0))
        # Encontrar triángulos a los que pertenece la arista (u, v)
        common_neighbors = list(nx.common_neighbors(G, u, v))
        edge_triangles = len(common_neighbors)
        edge_frustrated = 0
        for w in common_neighbors:
            tri_key = tuple(sorted([u, v, w]))
            if triangle_frustration.get(tri_key, False):
                edge_frustrated += 1

        local_frustration = (edge_frustrated / edge_triangles) if edge_triangles > 0 else 0.0

        edge_features.append({
            "u": int(u),
            "v": int(v),
            "u_var": var_names[u],
            "v_var": var_names[v],
            "J_ij": round(j_val, 4),
            "coupling_type": "antiferromagnetic" if j_val > 1e-9 else ("ferromagnetic" if j_val < -1e-9 else "neutral"),
            "local_frustration_index": round(local_frustration, 4)
        })

    # 6. Features Globales del Grafo (G)
    num_edges = G.number_of_edges()
    density = (2.0 * num_edges) / (n_vars * (n_vars - 1)) if n_vars > 1 else 0.0
    clause_var_ratio = num_edges / n_vars if n_vars > 0 else 0.0

    # Propiedades Espectrales del Laplaciano L = D - A
    if n_vars > 1 and num_edges > 0:
        L = nx.laplacian_matrix(G).toarray().astype(float)
        eigenvalues = np.sort(eigvalsh(L))
        # lambda_2 es la conectividad algebraica / gap espectral
        lambda_2 = float(eigenvalues[1]) if len(eigenvalues) > 1 else 0.0
        lambda_max = float(eigenvalues[-1])
        spectral_gap = max(0.0, lambda_2)
    else:
        spectral_gap = 0.0
        lambda_max = 0.0
        eigenvalues = [0.0]

    # Índice de Frustración Global
    global_frustration = (frustrated_triangles_count / total_triangles_count) if total_triangles_count > 0 else 0.0

    # Estadísticos de {h_i} y {J_ij}
    h_vals = list(h.values())
    j_vals = [f["J_ij"] for f in edge_features] if edge_features else [0.0]

    h_stats = {
        "mean": round(float(np.mean(h_vals)), 4),
        "variance": round(float(np.var(h_vals)), 4),
        "min": round(float(np.min(h_vals)), 4),
        "max": round(float(np.max(h_vals)), 4)
    }

    j_stats = {
        "mean": round(float(np.mean(j_vals)), 4),
        "variance": round(float(np.var(j_vals)), 4),
        "min": round(float(np.min(j_vals)), 4),
        "max": round(float(np.max(j_vals)), 4)
    }

    global_features = {
        "num_variables_V": n_vars,
        "num_interactions_E": num_edges,
        "graph_density": round(float(density), 4),
        "clause_variable_ratio": round(float(clause_var_ratio), 4),
        "laplacian_spectral_gap_lambda2": round(float(spectral_gap), 4),
        "laplacian_spectral_radius": round(float(lambda_max), 4),
        "global_frustration_index": round(float(global_frustration), 4),
        "total_triangles": total_triangles_count,
        "frustrated_triangles": frustrated_triangles_count,
        "h_statistics": h_stats,
        "J_statistics": j_stats
    }

    # 7. Resumen Formateado para Consola
    console_summary = [
        f"[FEATURES BIP / QUBO - {n_vars} Qubits]",
        f" • Topología: |V| = {n_vars} variables, |E| = {num_edges} acoplamientos cuadráticos",
        f" • Densidad del Grafo (|E|/|V|): {round(clause_var_ratio, 2)} (Densidad combinatoria: {round(density*100, 1)}%)",
        f" • Gap Espectral Laplaciano (λ₂): {round(spectral_gap, 4)} (Propagación cuántica)",
        f" • Radio Espectral Laplaciano (λ_max): {round(lambda_max, 4)}",
        f" • Índice de Frustración Global: {round(global_frustration*100, 1)}% ({frustrated_triangles_count}/{total_triangles_count} ciclos frustrados)",
        f" • Coeficientes Lineales h_i: media={h_stats['mean']}, var={h_stats['variance']}, rango=[{h_stats['min']}, {h_stats['max']}]",
        f" • Acoplamientos J_ij: media={j_stats['mean']}, var={j_stats['variance']}, rango=[{j_stats['min']}, {j_stats['max']}]",
    ]

    return {
        "global": global_features,
        "nodes": node_features,
        "edges": edge_features,
        "console_summary": console_summary
    }


def _empty_features() -> Dict[str, Any]:
    return {
        "global": {
            "num_variables_V": 0,
            "num_interactions_E": 0,
            "graph_density": 0.0,
            "clause_variable_ratio": 0.0,
            "laplacian_spectral_gap_lambda2": 0.0,
            "laplacian_spectral_radius": 0.0,
            "global_frustration_index": 0.0,
            "total_triangles": 0,
            "frustrated_triangles": 0,
            "h_statistics": {"mean": 0.0, "variance": 0.0, "min": 0.0, "max": 0.0},
            "J_statistics": {"mean": 0.0, "variance": 0.0, "min": 0.0, "max": 0.0}
        },
        "nodes": [],
        "edges": [],
        "console_summary": ["[FEATURES] No hay variables binarias en el modelo."]
    }
