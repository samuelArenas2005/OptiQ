import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

try:
    from backend.parser.problem_parser import parse_problem
    from backend.ml.pinn_model import get_hyperparameters
    from backend.quantum.qaoa_solver import run_qaoa
except ModuleNotFoundError:
    from parser.problem_parser import parse_problem
    from ml.pinn_model import get_hyperparameters
    from quantum.qaoa_solver import run_qaoa

logger = logging.getLogger("Router")
router = APIRouter()

class ProblemRequest(BaseModel):
    code: str
    solver: str

@router.post("/solve")
async def solve_problem(request: ProblemRequest):
    """
    Endpoint principal que recibe el problema declarativo.
    El flujo consiste en:
    1. Parsear el problema declarativo a programación entera binaria.
    2. Usar PINN para extraer los hiperparámetros de la topología.
    3. Resolver con QAOA usando los hiperparámetros.
    """
    logger.info(f"Recibida petición de resolución con solver: {request.solver}")
    
    # 1. Parsing
    try:
        binary_problem = parse_problem(request.code)
    except Exception as e:
        logger.error(f"Error al parsear el modelo: {e}")
        raise HTTPException(status_code=400, detail=f"Error de sintaxis o parseo MiniZinc: {str(e)}")

    # 2. PINN Prediction (simulado / stub)
    hyperparams = get_hyperparameters(binary_problem.topology)

    # 3. Quantum QAOA Execution (simulado / stub)
    results = run_qaoa(binary_problem, hyperparams)

    return {
        "status": "success",
        "message": "Problema parseado y analizado con éxito.",
        "parsed_summary": {
            "variables_count": len(binary_problem.parsed_model.variables),
            "variables": list(binary_problem.parsed_model.variables.keys()),
            "constraints_count": len(binary_problem.parsed_model.constraints),
            "qubo_nodes": binary_problem.topology.get("nodes", 0),
            "qubo_variables": binary_problem.topology.get("variables", []),
            "objective": binary_problem.parsed_model.objective
        },
        "details": {
            "solver_used": request.solver,
            "qaoa_hyperparameters_used": hyperparams,
            "solution": results.get("solution", "1011"),
            "energy": results.get("energy", -1.0)
        }
    }
