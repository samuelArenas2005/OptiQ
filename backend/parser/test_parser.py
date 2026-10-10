"""
Conjunto exhaustivo de pruebas unitarias para el MiniZincParser y la conversión a programación binaria.
Verifica:
1. Variables escalares (var 0..1, var bool)
2. Arrays de variables (array[1..n] of var 0..1)
3. Parámetros enteros y arrays de parámetros
4. Restricciones lineales simples y combinadas (<=, >=, ==)
5. Función sum(...) con variables y parámetros
6. Función forall(...) para generación automática de restricciones
7. Sentencia solve (maximize, minimize, satisfy)
8. Construcción completa de QuadraticProgram y QUBO (Qiskit)
"""

import sys
import os

# Asegurar que la raíz del proyecto esté en el path para las pruebas
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, "..", ".."))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from backend.parser.minizinc_parser import MiniZincParser
from backend.parser.problem_parser import parse_problem


def test_scalar_variables_and_simple_constraint():
    code = """
    % Modelo de prueba con variables individuales
    var 0..1: x1;
    var 0..1: x2;
    var bool: x3;

    constraint x1 + 2*x2 + x3 <= 2;
    constraint x1 + x2 >= 1;

    solve maximize 5*x1 + 4*x2 + 2*x3;
    """
    parser = MiniZincParser()
    model = parser.parse(code)

    assert "x1" in model.variables
    assert "x2" in model.variables
    assert "x3" in model.variables
    assert len(model.variables) == 3

    assert len(model.constraints) == 2
    c1 = model.constraints[0]
    assert c1["sense"] == "<="
    assert c1["rhs"] == 2.0
    assert c1["linear"] == {"x1": 1.0, "x2": 2.0, "x3": 1.0}

    c2 = model.constraints[1]
    assert c2["sense"] == ">="
    assert c2["rhs"] == 1.0
    assert c2["linear"] == {"x1": 1.0, "x2": 1.0}

    assert model.objective["sense"] == "maximize"
    assert model.objective["linear"] == {"x1": 5.0, "x2": 4.0, "x3": 2.0}
    print("[OK] test_scalar_variables_and_simple_constraint PASO")


def test_arrays_and_sum():
    code = """
    int: n = 4;
    int: capacity = 7;
    array[1..4] of int: weights = [2, 3, 4, 5];
    array[1..4] of int: values = [3, 4, 5, 8];

    array[1..4] of var 0..1: x;

    constraint sum(i in 1..n)(weights[i] * x[i]) <= capacity;

    solve maximize sum(i in 1..n)(values[i] * x[i]);
    """
    parser = MiniZincParser()
    model = parser.parse(code)

    assert len(model.variables) == 4
    for i in range(1, 5):
        assert f"x_{i}" in model.variables

    assert len(model.constraints) == 1
    c = model.constraints[0]
    assert c["sense"] == "<="
    assert c["rhs"] == 7.0
    assert c["linear"] == {"x_1": 2.0, "x_2": 3.0, "x_3": 4.0, "x_4": 5.0}

    assert model.objective["sense"] == "maximize"
    assert model.objective["linear"] == {"x_1": 3.0, "x_2": 4.0, "x_3": 5.0, "x_4": 8.0}
    print("[OK] test_arrays_and_sum PASO")


def test_forall_constraints():
    code = """
    int: n = 3;
    array[1..3] of var 0..1: a;
    array[1..3] of var 0..1: b;

    % Cada a[i] + b[i] no puede superar 1
    constraint forall(i in 1..n)(a[i] + b[i] <= 1);

    solve minimize a[1] + b[2];
    """
    parser = MiniZincParser()
    model = parser.parse(code)

    assert len(model.variables) == 6  # a_1, a_2, a_3, b_1, b_2, b_3
    assert len(model.constraints) == 3

    for idx, i in enumerate(range(1, 4)):
        c = model.constraints[idx]
        assert c["linear"] == {f"a_{i}": 1.0, f"b_{i}": 1.0}
        assert c["sense"] == "<="
        assert c["rhs"] == 1.0

    print("[OK] test_forall_constraints PASO")


def test_qiskit_qubo_conversion():
    code = """
    var 0..1: x1;
    var 0..1: x2;
    var 0..1: x3;

    constraint x1 + x2 + x3 <= 2;
    solve maximize 3*x1 + 2*x2 + 4*x3;
    """
    result = parse_problem(code)

    assert result is not None
    assert "nodes" in result.topology
    assert "variables" in result.topology
    assert result.topology["nodes"] >= 3
    print(f"[OK] test_qiskit_qubo_conversion PASO (Nodos generados: {result.topology['nodes']}, variables QUBO: {result.topology['variables']})")


def test_syntax_errors_handling():
    parser = MiniZincParser()

    # Caso 1: Variable no declarada en restricción
    try:
        parser.parse("var 0..1: x1; constraint x1 + variable_fantasma <= 2; solve satisfy;")
        assert False, "Debió fallar por variable no declarada"
    except Exception as e:
        assert "variable_fantasma" in str(e) or "No se pudo resolver" in str(e)

    # Caso 2: Sentencia completamente inválida
    try:
        parser.parse("esta sentencia no es valida;")
        assert False, "Debió fallar por sentencia no reconocida"
    except SyntaxError as e:
        assert "Sentencia no reconocida" in str(e)

    # Caso 3: Restricción sin operador relacional
    try:
        parser.parse("var 0..1: x1; constraint x1 + 5; solve satisfy;")
        assert False, "Debió fallar por falta de operador relacional"
    except ValueError as e:
        assert "operador relacional" in str(e)

    # Caso 4: Sin variables declaradas
    try:
        parser.parse("int: n = 4; solve satisfy;")
        assert False, "Debió fallar por no tener variables"
    except ValueError as e:
        assert "no contiene ninguna variable" in str(e)

    print("[OK] test_syntax_errors_handling PASO (Manejo robusto de errores de sintaxis)")


if __name__ == "__main__":
    print("\n--- Ejecutando Bateria de Pruebas del Parser MiniZinc ---")
    test_scalar_variables_and_simple_constraint()
    test_arrays_and_sum()
    test_forall_constraints()
    test_qiskit_qubo_conversion()
    test_syntax_errors_handling()
    print("\n[EXITO] TODAS LAS PRUEBAS PASARON CON EXITO!\n")
