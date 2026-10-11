import logging
import asyncio
from concurrent.futures import ThreadPoolExecutor
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

# Thread pool para paralelizar tareas CPU-intensivas simultáneamente
thread_pool = ThreadPoolExecutor(max_workers=4)


class ProblemRequest(BaseModel):
    code: str
    solver: Optional[str] = "qaoa"
    shots: Optional[int] = 8192
    p_steps: Optional[int] = 2
    optimizer: Optional[str] = "COBYLA"
    angle_init: Optional[str] = "Automática"
    gamma0: Optional[float] = None
    beta0: Optional[float] = None
    backend: Optional[Any] = None
    backend_config: Optional[Dict[str, Any]] = None


@router.post("/solve")
async def solve_problem(request: ProblemRequest):
    """
    Endpoint principal que recibe el problema declarativo.
    El flujo consiste en:
    1. Parsear el problema declarativo a programación entera binaria y QUBO.
    2. Ejecutar en paralelo mediante hilos la extracción de features y la simulación cuántica QAOA con Qiskit.
    3. Retornar inmediatamente los resultados consolidados en milisegundos.
    """
    logger.info(f"Recibida petición de resolución con solver: {request.solver} | Backend: {request.backend}")

    # 1. Parsing a Programación Entera Binaria y QUBO
    try:
        binary_problem = parse_problem(request.code)
    except Exception as e:
        logger.error(f"Error al parsear el modelo MiniZinc: {e}")
        raise HTTPException(status_code=400, detail=f"Error de sintaxis o parseo MiniZinc: {str(e)}")

    qubo_problem = binary_problem.topology.get("qubo_problem")
    original_qp = binary_problem.topology.get("original_qp")

    # 2. Empaquetar hiperparámetros y backend
    hyperparams = {
        "shots": request.shots or 8192,
        "p_steps": request.p_steps or 2,
        "optimizer": request.optimizer or "COBYLA",
        "angle_init": request.angle_init or "Automática",
        "gamma0": request.gamma0,
        "beta0": request.beta0,
        "backend": request.backend,
        "backend_config": request.backend_config
    }

    # 3. Paralelización de Extracción de Features y Resolución QAOA con Hilos
    loop = asyncio.get_running_loop()

    def run_feature_extraction():
        try:
            return extract_bip_features(qubo_problem, original_qp)
        except Exception as ex:
            logger.warning(f"Error al extraer features del grafo: {ex}")
            return {
                "global": {},
                "nodes": [],
                "edges": [],
                "console_summary": [f"[FEATURES] Extracción omitida: {str(ex)}"]
            }

    def run_quantum():
        try:
            return run_qaoa(binary_problem, hyperparams, backend=request.backend)
        except Exception as ex:
            logger.error(f"Error ejecutando QAOA: {ex}", exc_info=True)
            raise ex

    # Ejecución simultánea en hilos dedicados
    feat_task = loop.run_in_executor(thread_pool, run_feature_extraction)
    qaoa_task = loop.run_in_executor(thread_pool, run_quantum)

    try:
        features, qaoa_results = await asyncio.gather(feat_task, qaoa_task)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error durante simulación QAOA: {str(e)}")

    # 4. Inferencia de Hiperparámetros PINN basados en la topología real
    try:
        pinn_input = {
            **(binary_problem.topology or {}),
            "global": features.get("global", {}),
            "problem_type": "Knapsack" if "capacity" in request.code.lower() else "MaxCut_Reg"
        }
        pinn_results = get_hyperparameters(pinn_input)
    except Exception as err:
        logger.warning(f"Aviso al ejecutar inferencia PINN: {err}")
        pinn_results = {
            "p1": {"gamma": [0.6508], "beta": [2.5938]},
            "p2": {"gamma": [0.6508, 0.5092], "beta": [2.5938, -0.0585]},
            "gamma": [0.6508],
            "beta": [2.5938],
            "telemetry": {"recommended_shots": 1024, "recommended_lr_eta": 0.02, "target_depth_p_star": 1}
        }

    return {
        "status": "success",
        "message": "Problema parseado y resuelto exitosamente con QAOA ejecutado en Qiskit.",
        "parsed_summary": {
            "variables_count": len(binary_problem.parsed_model.variables),
            "variables": list(binary_problem.parsed_model.variables.keys()),
            "constraints_count": len(binary_problem.parsed_model.constraints),
            "qubo_nodes": binary_problem.topology.get("nodes", 0),
            "qubo_variables": binary_problem.topology.get("variables", []),
            "objective": binary_problem.parsed_model.objective
        },
        "features": features,
        "pinn": pinn_results,
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
            "circuit_depth": qaoa_results.get("circuit_depth", 0),
            "hardware": qaoa_results.get("hardware", "Qiskit AerSimulator (Statevector Acelerado)"),
            "qasm": qaoa_results.get("qasm", ""),
            "console_logs": qaoa_results.get("console_logs", [])
        }
    }


class PinnPredictRequest(BaseModel):
    code: str


@router.post("/pinn/predict")
async def predict_pinn_hyperparameters(request: PinnPredictRequest):
    """
    Endpoint rápido y dedicado para obtener únicamente los hiperparámetros y ángulos
    sugeridos por la PINN en milisegundos sin necesidad de ejecutar la simulación completa.
    """
    try:
        binary_problem = parse_problem(request.code)
        qubo_problem = binary_problem.topology.get("qubo_problem")
        original_qp = binary_problem.topology.get("original_qp")
        features = extract_bip_features(qubo_problem, original_qp)
        
        pinn_input = {
            **(binary_problem.topology or {}),
            "global": features.get("global", {}),
            "problem_type": "Knapsack" if "capacity" in request.code.lower() else "MaxCut_Reg"
        }
        pinn_result = get_hyperparameters(pinn_input)
        return {
            "status": "success",
            "pinn": pinn_result,
            "features": features
        }
    except Exception as e:
        logger.error(f"Error en inferencia dedicada PINN: {e}")
        raise HTTPException(status_code=400, detail=str(e))

