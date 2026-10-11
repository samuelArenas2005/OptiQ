import logging
import numpy as np
import scipy.sparse as sp
from typing import Dict, Any, List

logger = logging.getLogger("FeatureExtractor")


def extract_bip_features(qubo_problem: Any, original_qp: Any = None) -> Dict[str, Any]:
    """
    Extracción ultrarrápida O(|V| + |E|) y O(k*|E|) de features esenciales de problemas BIP/QUBO:
    - h_i, J_ij, Grados: Extracción directa de la matriz dispersa
    - Densidad, sigma_h, sigma_J: Reducción vectorial (numpy mean, std)
    - Gap Espectral (lambda_2) y Radio Espectral: Laplaciano L = D - A
    - Balance de Frustración: Autovalor extremal del Laplaciano con signo L_signed = D_|J| - J
    - Clustering / Centralidad: Omitidos en preprocesamiento (delegados al aprendizaje de la GNN)
    """
    if qubo_problem is None:
        return _empty_features()

    var_names = [v.name for v in qubo_problem.variables]
    n_vars = len(var_names)

    if n_vars == 0:
        return _empty_features()

    # 1. Extracción O(|E|) directa de h_i y J_ij a partir del operador de Ising
    h = np.zeros(n_vars, dtype=float)
    J_dict = {}

    try:
        operator, offset = qubo_problem.to_ising()
        for pauli, coeff in zip(operator.paulis, operator.coeffs):
            # En Qiskit, bit 0 está en el extremo derecho
            z_indices = [i for i, bit in enumerate(reversed(pauli.z)) if bit]
            val = float(coeff.real)
            if len(z_indices) == 1:
                idx = z_indices[0]
                if idx < n_vars:
                    h[idx] += val
            elif len(z_indices) == 2:
                u, v = sorted(z_indices)
                if u < n_vars and v < n_vars:
                    J_dict[(u, v)] = J_dict.get((u, v), 0.0) + val
    except Exception as e:
        logger.warning(f"Extracción fallback desde objetivo QUBO: {e}")
        linear_dict = qubo_problem.objective.linear.to_dict()
        quad_dict = qubo_problem.objective.quadratic.to_dict()
        for idx in range(n_vars):
            h[idx] = float(linear_dict.get(idx, 0.0))
        for (u, v), w in quad_dict.items():
            if u != v:
                pair = tuple(sorted([u, v]))
                J_dict[pair] = J_dict.get(pair, 0.0) + float(w) / 4.0

    # 2. Grados d_i y enlaces O(|E|)
    degrees = np.zeros(n_vars, dtype=int)
    num_edges = len(J_dict)
    rows, cols, weights, signed_weights = [], [], [], []

    for (u, v), j_val in J_dict.items():
        if abs(j_val) > 1e-9:
            degrees[u] += 1
            degrees[v] += 1
            rows.extend([u, v])
            cols.extend([v, u])
            weights.extend([abs(j_val), abs(j_val)])
            signed_weights.extend([j_val, j_val])

    # 3. Penalizaciones por restricción lineal en O(|constraints| * vars)
    constraint_multipliers = np.zeros(n_vars, dtype=float)
    if original_qp is not None and hasattr(original_qp, 'linear_constraints'):
        penalty_base = 10.0
        for c in original_qp.linear_constraints:
            for var_k, coeff in c.linear.to_dict().items():
                if isinstance(var_k, str) and var_k in var_names:
                    idx = var_names.index(var_k)
                    constraint_multipliers[idx] += abs(float(coeff)) * penalty_base
                elif isinstance(var_k, int) and var_k < n_vars:
                    constraint_multipliers[var_k] += abs(float(coeff)) * penalty_base

    # 4. Propiedades Espectrales O(k * |E|)
    density = (2.0 * num_edges) / (n_vars * (n_vars - 1)) if n_vars > 1 else 0.0
    clause_var_ratio = num_edges / n_vars if n_vars > 0 else 0.0

    if num_edges > 0 and n_vars > 1:
        # Laplaciano estándar L = D - A
        A_binary = sp.csr_matrix(([1.0] * len(rows), (rows, cols)), shape=(n_vars, n_vars))
        D = sp.diags(degrees)
        L = D - A_binary

        if n_vars <= 30:
            eigs = np.sort(np.linalg.eigvalsh(L.toarray()))
            lambda_2 = float(eigs[1]) if len(eigs) > 1 else 0.0
            lambda_max = float(eigs[-1])
        else:
            try:
                from scipy.sparse.linalg import eigsh
                eigs = eigsh(L.astype(float), k=min(2, n_vars - 1), which='SM', return_eigenvectors=False)
                lambda_2 = float(np.sort(eigs)[-1])
                lambda_max_arr = eigsh(L.astype(float), k=1, which='LM', return_eigenvectors=False)
                lambda_max = float(lambda_max_arr[0])
            except Exception:
                lambda_2 = 0.0
                lambda_max = 0.0

        # Balance de Frustración: Autovalor extremal del Laplaciano con signo L_signed = D_|J| - J
        J_mat = sp.csr_matrix((signed_weights, (rows, cols)), shape=(n_vars, n_vars))
        abs_degrees = np.array(np.abs(J_mat).sum(axis=1)).flatten()
        L_signed = sp.diags(abs_degrees) - J_mat

        if n_vars <= 30:
            eigs_signed = np.sort(np.linalg.eigvalsh(L_signed.toarray()))
            lambda_min_s = max(0.0, float(eigs_signed[0]))
            lambda_max_s = max(1e-9, float(eigs_signed[-1]))
            frustration_index = lambda_min_s / lambda_max_s
        else:
            try:
                from scipy.sparse.linalg import eigsh
                e_min = eigsh(L_signed.astype(float), k=1, which='SA', return_eigenvectors=False)
                e_max = eigsh(L_signed.astype(float), k=1, which='LA', return_eigenvectors=False)
                frustration_index = max(0.0, float(e_min[0])) / max(1e-9, float(e_max[0]))
            except Exception:
                frustration_index = 0.0
    else:
        lambda_2 = 0.0
        lambda_max = 0.0
        frustration_index = 0.0

    # 5. Reducción Vectorial O(|V| + |E|) para Estadísticos
    h_mean = float(np.mean(h))
    h_var = float(np.var(h))
    h_min = float(np.min(h))
    h_max = float(np.max(h))

    j_vals = list(J_dict.values()) if J_dict else [0.0]
    j_arr = np.array(j_vals)
    j_mean = float(np.mean(j_arr))
    j_var = float(np.var(j_arr))
    j_min = float(np.min(j_arr))
    j_max = float(np.max(j_arr))

    # 6. Estructuras para Telemetría y Tabla UI
    node_features = []
    for i in range(n_vars):
        node_features.append({
            "index": i,
            "variable": var_names[i],
            "h_i": round(float(h[i]), 4),
            "degree": int(degrees[i]),
            "clustering_coefficient": "GNN",  # Omitido en preprocesamiento; aprendido por la GNN
            "constraint_multiplier": round(float(constraint_multipliers[i]), 2)
        })

    edge_features = []
    for (u, v), j_val in J_dict.items():
        edge_features.append({
            "u": int(u),
            "v": int(v),
            "u_var": var_names[u],
            "v_var": var_names[v],
            "J_ij": round(float(j_val), 4),
            "coupling_type": "antiferromagnetic" if j_val > 1e-9 else ("ferromagnetic" if j_val < -1e-9 else "neutral"),
            "local_frustration_index": round(float(frustration_index), 4)
        })

    global_features = {
        "num_variables_V": n_vars,
        "num_interactions_E": num_edges,
        "graph_density": round(float(density), 4),
        "clause_variable_ratio": round(float(clause_var_ratio), 4),
        "laplacian_spectral_gap_lambda2": round(float(lambda_2), 4),
        "laplacian_spectral_radius": round(float(lambda_max), 4),
        "global_frustration_index": round(float(frustration_index), 4),
        "h_statistics": {
            "mean": round(h_mean, 4),
            "variance": round(h_var, 4),
            "min": round(h_min, 4),
            "max": round(h_max, 4)
        },
        "J_statistics": {
            "mean": round(j_mean, 4),
            "variance": round(j_var, 4),
            "min": round(j_min, 4),
            "max": round(j_max, 4)
        }
    }

    console_summary = [
        f"[FEATURES BIP / QUBO - {n_vars} Qubits]",
        f" • Topología: |V| = {n_vars} variables, |E| = {num_edges} acoplamientos cuadráticos",
        f" • Densidad del Grafo (|E|/|V|): {round(clause_var_ratio, 2)} (Densidad: {round(density*100, 1)}%)",
        f" • Gap Espectral Laplaciano (λ₂): {round(lambda_2, 4)} (Propagación cuántica)",
        f" • Radio Espectral Laplaciano (λ_max): {round(lambda_max, 4)}",
        f" • Balance de Frustración Espectral: {round(frustration_index*100, 1)}% (Autovalor extremal L_signed)",
        f" • Coeficientes h_i: μ = {round(h_mean, 2)}, σ² = {round(h_var, 2)}",
        f" • Acoplamientos J_ij: μ = {round(j_mean, 2)}, σ² = {round(j_var, 2)}"
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
            "h_statistics": {"mean": 0.0, "variance": 0.0, "min": 0.0, "max": 0.0},
            "J_statistics": {"mean": 0.0, "variance": 0.0, "min": 0.0, "max": 0.0}
        },
        "nodes": [],
        "edges": [],
        "console_summary": ["[FEATURES] No hay variables binarias en el modelo."]
    }
