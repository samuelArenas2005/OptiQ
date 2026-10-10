import logging
from typing import Dict, Any
from backend.parser.minizinc_parser import MiniZincParser, ParsedModel

logger = logging.getLogger("ProblemParser")

try:
    from qiskit_optimization import QuadraticProgram
    from qiskit_optimization.converters import QuadraticProgramToQubo
    QISKIT_OPT_AVAILABLE = True
except ImportError:
    QISKIT_OPT_AVAILABLE = False


def build_quadratic_program(parsed_model: ParsedModel) -> Any:
    """
    Construye un objeto QuadraticProgram de Qiskit Optimization a partir del ParsedModel.
    """
    if not QISKIT_OPT_AVAILABLE:
        raise RuntimeError("qiskit_optimization no está instalado en el entorno.")

    qp = QuadraticProgram(name="MiniZincProblem")

    # 1. Agregar variables binarias
    for var_name, var_info in parsed_model.variables.items():
        qp.binary_var(name=var_name)

    # 2. Agregar restricciones lineales
    for idx, c in enumerate(parsed_model.constraints):
        c_name = f"c_{idx}"
        linear_terms = c["linear"]
        sense = c["sense"]
        rhs = c["rhs"]

        # Filtrar solo variables que existen en el modelo
        valid_linear = {k: v for k, v in linear_terms.items() if k in parsed_model.variables}

        if sense == "<=":
            qp.linear_constraint(linear=valid_linear, sense="<=", rhs=rhs, name=c_name)
        elif sense == ">=":
            qp.linear_constraint(linear=valid_linear, sense=">=", rhs=rhs, name=c_name)
        elif sense == "==":
            qp.linear_constraint(linear=valid_linear, sense="==", rhs=rhs, name=c_name)

    # 3. Función objetivo
    if parsed_model.objective:
        sense = parsed_model.objective["sense"]
        linear_obj = parsed_model.objective.get("linear", {})
        const_obj = parsed_model.objective.get("constant", 0.0)

        valid_obj_linear = {k: v for k, v in linear_obj.items() if k in parsed_model.variables}

        if sense == "maximize":
            qp.maximize(constant=const_obj, linear=valid_obj_linear)
        elif sense == "minimize":
            qp.minimize(constant=const_obj, linear=valid_obj_linear)

    return qp


def extract_qubo_topology(qp: Any) -> Dict[str, Any]:
    """
    Convierte el QuadraticProgram a QUBO sin restricciones (mediante variables slack y penalización)
    y extrae la topología (nodos, aristas y pesos) para la red neuronal PINN y QAOA.
    """
    converter = QuadraticProgramToQubo()
    qubo = converter.convert(qp)

    variables = [v.name for v in qubo.variables]
    num_nodes = len(variables)
    var_to_idx = {name: i for i, name in enumerate(variables)}

    # Obtener matriz cuadrática y lineal
    linear_coeffs = qubo.objective.linear.to_dict()
    quadratic_coeffs = qubo.objective.quadratic.to_dict()

    edges = []
    weights = []

    for (u_name, v_name), coeff in quadratic_coeffs.items():
        if coeff != 0:
            u_idx = var_to_idx[u_name] if isinstance(u_name, str) else u_name
            v_idx = var_to_idx[v_name] if isinstance(v_name, str) else v_name
            edges.append((u_idx, v_idx))
            weights.append(float(coeff))

    return {
        "nodes": num_nodes,
        "variables": variables,
        "edges": edges,
        "weights": weights,
        "qubo_problem": qubo,
        "original_qp": qp
    }


def parse_problem(declarative_code: str) -> Any:
    """
    Punto de entrada principal del parser:
    1. Procesa la sintaxis MiniZinc.
    2. Construye el problema de programación binaria (QuadraticProgram).
    3. Retorna el objeto con la topología extraída para PINN y QAOA.
    """
    logger.info("=== Iniciando proceso de parseo MiniZinc -> Binario ===")
    parser = MiniZincParser()
    parsed_model = parser.parse(declarative_code)

    if QISKIT_OPT_AVAILABLE:
        qp = build_quadratic_program(parsed_model)
        topology_info = extract_qubo_topology(qp)
    else:
        # Modo fallback para cuando no esté Qiskit cargado
        var_names = list(parsed_model.variables.keys())
        topology_info = {
            "nodes": len(var_names),
            "variables": var_names,
            "edges": [],
            "weights": []
        }

    class BinaryProblemResult:
        def __init__(self, model, topology):
            self.parsed_model = model
            self.topology = topology

    return BinaryProblemResult(parsed_model, topology_info)
