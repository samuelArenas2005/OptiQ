import logging
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

try:
    from backend.parser.problem_parser import parse_problem
    from backend.ml.pinn_model import get_hyperparameters
    from backend.quantum.qaoa_solver import run_qaoa
    from backend.quantum.feature_extractor import extract_bip_features
except ModuleNotFoundError:
    from parser.problem_parser import parse_problem
    from ml.pinn_model import get_hyperparameters
    from quantum.qaoa_solver import run_qaoa
    from quantum.feature_extractor import extract_bip_features

logger = logging.getLogger("Router")
router = APIRouter()


class ProblemRequest(BaseModel):
    code: str
    solver: Optional[str] = "qaoa"
    shots: Optional[int] = 8192
    p_steps: Optional[int] = 2
    optimizer: Optional[str] = "COBYLA"
    angle_init: Optional[str] = "Automática"
    gamma0: Optional[float] = None
    beta0: Optional[float] = None


@router.post("/solve")
async def solve_problem(request: ProblemRequest):
    """
    Endpoint principal que recibe el problema declarativo.
    El flujo consiste en:
    1. Parsear el problema declarativo a programación entera binaria y QUBO.
    2. Extraer features de la topología (nodos, aristas, global/laplaciano).
    3. Resolver con QAOA simulado en Qiskit usando la configuración y ángulos.
    4. Retornar la solución de variables, valor objetivo, histograma de estados y métricas.
    """
    logger.info(f"Recibida petición de resolución con solver: {request.solver}")

    # 1. Parsing a Programación Entera Binaria y QUBO
    try:
        binary_problem = parse_problem(request.code)
    except Exception as e:
        logger.error(f"Error al parsear el modelo MiniZinc: {e}")
        raise HTTPException(status_code=400, detail=f"Error de sintaxis o parseo MiniZinc: {str(e)}")

    # 2. Extracción de Features del Problema (Nodos, Aristas, Topología Global)
    qubo_problem = binary_problem.topology.get("qubo_problem")
    original_qp = binary_problem.topology.get("original_qp")
    try:
        features = extract_bip_features(qubo_problem, original_qp)
    except Exception as e:
        logger.warning(f"Error al extraer features del grafo: {e}")
        features = {
            "global": {},
            "nodes": [],
            "edges": [],
            "console_summary": [f"[FEATURES] Extracción omitida: {str(e)}"]
        }

    # 3. Empaquetar hiperparámetros
    hyperparams = {
        "shots": request.shots or 8192,
        "p_steps": request.p_steps or 2,
        "optimizer": request.optimizer or "COBYLA",
        "angle_init": request.angle_init or "Automática",
        "gamma0": request.gamma0,
        "beta0": request.beta0
    }

    # 4. Ejecución del Solver Cuántico QAOA en Qiskit
    try:
        qaoa_results = run_qaoa(binary_problem, hyperparams)
    except Exception as e:
        logger.error(f"Error ejecutando QAOA: {e}")
        raise HTTPException(status_code=500, detail=f"Error durante simulación QAOA: {str(e)}")

    return {
        "status": "success",
        "message": "Problema parseado y resuelto exitosamente con QAOA simulado en Qiskit.",
        "parsed_summary": {
            "variables_count": len(binary_problem.parsed_model.variables),
            "variables": list(binary_problem.parsed_model.variables.keys()),
            "constraints_count": len(binary_problem.parsed_model.constraints),
            "qubo_nodes": binary_problem.topology.get("nodes", 0),
            "qubo_variables": binary_problem.topology.get("variables", []),
            "objective": binary_problem.parsed_model.objective
        },
        "features": features,
        "details": {
            "solver_used": request.solver,
            "qaoa_hyperparameters_used": hyperparams,
            "solution": qaoa_results.get("solution", {}),
            "optimal_bitstring": qaoa_results.get("optimal_bitstring", ""),
            "optimal_value": qaoa_results.get("optimal_value", 0.0),
            "energy": qaoa_results.get("energy", 0.0),
            "state_probability": qaoa_results.get("state_probability", "0%"),
            "distribution": qaoa_results.get("distribution", []),
            "execution_time_ms": qaoa_results.get("execution_time_ms", 0.0),
            "qubits_count": qaoa_results.get("qubits_count", 0),
            "hardware": qaoa_results.get("hardware", "Qiskit Simulator"),
            "console_logs": qaoa_results.get("console_logs", [])
        }
    }
