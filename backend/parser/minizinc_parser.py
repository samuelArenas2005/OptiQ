import re
import logging
from typing import Dict, List, Any, Optional, Tuple

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("MiniZincParser")


class ParsedModel:
    """
    Estructura intermedia que contiene los componentes analizados de un modelo MiniZinc:
    - variables: diccionario de {nombre_var: {'type': 'binary', 'lower': 0, 'upper': 1}}
    - parameters: constantes declaradas (ej. n = 4, weights = [2, 3, 1])
    - constraints: lista de diccionarios con restricciones lineales analizadas
    - objective: información del objetivo (minimize / maximize / satisfy)
    """
    def __init__(self):
        self.variables: Dict[str, Dict[str, Any]] = {}
        self.parameters: Dict[str, Any] = {}
        self.constraints: List[Dict[str, Any]] = []
        self.objective: Optional[Dict[str, Any]] = None

    def __repr__(self):
        return (
            f"<ParsedModel vars={list(self.variables.keys())}, "
            f"constraints={len(self.constraints)}, "
            f"objective={self.objective}>"
        )


class MiniZincParser:
    """
    Parser ligero para el subconjunto de MiniZinc orientado a optimización binaria.
    Soporta:
    - Comentarios (% ...)
    - Parámetros: int: n = 4; array[...] of int: w = [2, 3, 4];
    - Variables binarias: var 0..1: x; var bool: y;
    - Arrays de variables binarias: array[1..N] of var 0..1: x;
    - Restricciones con sum y forall:
        - constraint x1 + x2 <= 1;
        - constraint sum(i in 1..n)(w[i] * x[i]) <= C;
        - constraint forall(i in 1..n)(x[i] + y[i] <= 1);
    - Objetivo:
        - solve maximize sum(i in 1..n)(p[i] * x[i]);
        - solve minimize 3*x1 + 2*x2;
        - solve satisfy;
    """

    def __init__(self):
        pass

    def parse(self, code: str) -> ParsedModel:
        model = ParsedModel()
        clean_code = self._clean_code(code)
        statements = self._split_statements(clean_code)

        for stmt in statements:
            stmt = stmt.strip()
            if not stmt:
                continue
            self._process_statement(stmt, model)

        if not model.variables:
            raise ValueError("El modelo no contiene ninguna variable de decisión válida declarada (ej. 'var 0..1: x;').")

        if not model.objective:
            # Si no se especificó solve, asumir solve satisfy por defecto
            model.objective = {"sense": "satisfy", "linear": {}, "constant": 0.0}

        logger.info(f"== [MiniZincParser] Parseo exitoso ==")
        logger.info(f"-> Variables detectadas ({len(model.variables)}): {list(model.variables.keys())}")
        logger.info(f"-> Restricciones parseadas ({len(model.constraints)}):")
        for idx, c in enumerate(model.constraints, 1):
            logger.info(f"   [{idx}] {c['linear']} {c['sense']} {c['rhs']}")
        logger.info(f"-> Objetivo: {model.objective}")

        return model

    def _clean_code(self, code: str) -> str:
        # Eliminar comentarios de línea tipo %
        lines = []
        for line in code.splitlines():
            comment_idx = line.find("%")
            if comment_idx != -1:
                line = line[:comment_idx]
            lines.append(line)
        return "\n".join(lines)

    def _split_statements(self, code: str) -> List[str]:
        # Dividir por punto y coma ';'
        parts = code.split(";")
        return [p.strip() for p in parts if p.strip()]

    def _process_statement(self, stmt: str, model: ParsedModel):
        # 1. Parámetros (ej. int: n = 4; array[1..3] of int: c = [1, 2, 3]; o n = 4;)
        if self._try_parse_parameter(stmt, model):
            return

        # 2. Arrays de variables (ej. array[1..n] of var 0..1: x;)
        if self._try_parse_var_array(stmt, model):
            return

        # 3. Variable escalar (ej. var 0..1: x; o var bool: x;)
        if self._try_parse_scalar_var(stmt, model):
            return

        # 4. Restricción (constraint ...)
        if stmt.startswith("constraint"):
            self._parse_constraint(stmt, model)
            return

        # 5. Objetivo (solve ...)
        if stmt.startswith("solve"):
            self._parse_solve(stmt, model)
            return

        raise SyntaxError(f"Sentencia no reconocida o error de sintaxis en: '{stmt}'")

    def _eval_int_expr(self, expr_str: str, env: Dict[str, Any]) -> int:
        """Evalúa expresiones aritméticas simples para rangos y parámetros."""
        expr_str = expr_str.strip()
        safe_env = {**env}
        try:
            return int(eval(expr_str, {"__builtins__": None}, safe_env))
        except Exception as e:
            raise ValueError(f"No se pudo evaluar la expresión entera '{expr_str}': {e}")

    def _try_parse_parameter(self, stmt: str, model: ParsedModel) -> bool:
        # Array de ints: array[1..N] of int: name = [1, 2, 3]
        m_arr = re.match(r"(?:array\s*\[\s*([^\]]+)\s*\]\s*of\s+int\s*:\s*)?([a-zA-Z_]\w*)\s*=\s*\[([^\]]*)\]", stmt)
        if m_arr:
            name = m_arr.group(2)
            raw_vals = m_arr.group(3).split(",")
            vals = [self._eval_int_expr(v, model.parameters) for v in raw_vals if v.strip()]
            model.parameters[name] = vals
            logger.debug(f"Parámetro array detectado: {name} = {vals}")
            return True

        # Escalar int: int: name = 5; o simplemente name = 5;
        m_scalar = re.match(r"(?:int\s*:\s*)?([a-zA-Z_]\w*)\s*=\s*([^;]+)", stmt)
        if m_scalar and not stmt.startswith("var") and not stmt.startswith("constraint") and not stmt.startswith("solve"):
            name = m_scalar.group(1)
            val_expr = m_scalar.group(2)
            try:
                val = self._eval_int_expr(val_expr, model.parameters)
                model.parameters[name] = val
                logger.debug(f"Parámetro detectado: {name} = {val}")
                return True
            except Exception:
                return False
        return False

    def _try_parse_var_array(self, stmt: str, model: ParsedModel) -> bool:
        # array[1..N] of var 0..1: x; o array[1..N] of var bool: x;
        pattern = r"array\s*\[\s*([^\.]+)\.\.([^\]]+)\s*\]\s*of\s+var\s+(?:0\.\.1|bool)\s*:\s*([a-zA-Z_]\w*)"
        m = re.match(pattern, stmt)
        if m:
            start_str, end_str, arr_name = m.groups()
            start_idx = self._eval_int_expr(start_str, model.parameters)
            end_idx = self._eval_int_expr(end_str, model.parameters)

            for i in range(start_idx, end_idx + 1):
                var_name = f"{arr_name}_{i}"
                model.variables[var_name] = {
                    "type": "binary",
                    "base_name": arr_name,
                    "index": i,
                    "lower": 0,
                    "upper": 1
                }
            logger.debug(f"Array de variables binarias detectado: {arr_name}[{start_idx}..{end_idx}]")
            return True
        return False

    def _try_parse_scalar_var(self, stmt: str, model: ParsedModel) -> bool:
        # var 0..1: x; o var bool: x;
        pattern = r"var\s+(?:0\.\.1|bool)\s*:\s*([a-zA-Z_]\w*)"
        m = re.match(pattern, stmt)
        if m:
            var_name = m.group(1)
            model.variables[var_name] = {
                "type": "binary",
                "base_name": var_name,
                "index": None,
                "lower": 0,
                "upper": 1
            }
            logger.debug(f"Variable binaria escalar detectada: {var_name}")
            return True
        return False

    def _parse_constraint(self, stmt: str, model: ParsedModel):
        # Eliminar el prefijo 'constraint'
        content = stmt[len("constraint"):].strip()

        # Chequear si es un forall(...)
        m_forall = re.match(r"forall\s*\(\s*([a-zA-Z_]\w*)\s+in\s+([^\.]+)\.\.([^)]+)\)\s*\((.*)\)$", content)
        if m_forall:
            iter_var, start_str, end_str, inner_expr = m_forall.groups()
            start_val = self._eval_int_expr(start_str, model.parameters)
            end_val = self._eval_int_expr(end_str, model.parameters)

            for i in range(start_val, end_val + 1):
                local_env = {**model.parameters, iter_var: i}
                # Reemplazar la variable de iteración en la expresión interna
                unrolled_expr = self._substitute_iter_var(inner_expr, iter_var, i)
                self._parse_single_relational_constraint(unrolled_expr, model, local_env)
            return

        # Restricción individual (puede contener sum)
        self._parse_single_relational_constraint(content, model, model.parameters)

    def _substitute_iter_var(self, expr: str, var_name: str, val: int) -> str:
        # Reemplazar iter_var cuando esté entre corchetes o como identificador aislado
        # ej: x[i] -> x[1], i + 1 -> 1 + 1
        return re.sub(rf"\b{var_name}\b", str(val), expr)

    def _parse_single_relational_constraint(self, expr: str, model: ParsedModel, env: Dict[str, Any]):
        # Identificar operador relacional: <=, >=, =, ==, <, >
        op_match = re.search(r"(<=|>=|==|=)", expr)
        if not op_match:
            raise ValueError(f"Restricción sin operador relacional soportado (<=, >=, ==, =): '{expr}'")

        op = op_match.group(1)
        lhs_str = expr[:op_match.start()].strip()
        rhs_str = expr[op_match.end():].strip()

        # Normalizar operador
        sense = "<=" if op == "<=" else (">=" if op == ">=" else "==")

        # Parsear lado izquierdo (lhs) y lado derecho (rhs)
        linear_terms, const_val = self._parse_linear_expression(lhs_str, model, env)
        rhs_val = self._eval_int_expr(rhs_str, env)

        # Reajustar constante si lhs tenía términos numéricos (lhs <= rhs => linear <= rhs - const_val)
        final_rhs = rhs_val - const_val

        model.constraints.append({
            "linear": linear_terms,
            "sense": sense,
            "rhs": final_rhs
        })

    def _parse_solve(self, stmt: str, model: ParsedModel):
        # solve maximize ..., solve minimize ..., solve satisfy;
        m = re.match(r"solve\s+(maximize|minimize|satisfy)(?:\s+(.*))?", stmt)
        if not m:
            raise ValueError(f"Declaración solve no válida: '{stmt}'")

        sense = m.group(1)
        expr_str = m.group(2)

        if sense == "satisfy" or not expr_str:
            model.objective = {"sense": "satisfy", "linear": {}, "constant": 0}
            return

        linear_terms, const_val = self._parse_linear_expression(expr_str, model, model.parameters)
        model.objective = {
            "sense": sense,
            "linear": linear_terms,
            "constant": const_val
        }

    def _expand_sum(self, expr: str, model: ParsedModel, env: Dict[str, Any]) -> str:
        """
        Expande sum(i in 1..n)(w[i] * x[i]) a:
        (w[1] * x[1] + w[2] * x[2] + ...)
        """
        def replace_sum(match):
            iter_var = match.group(1).strip()
            start_str = match.group(2).strip()
            end_str = match.group(3).strip()
            body = match.group(4).strip()

            start_val = self._eval_int_expr(start_str, env)
            end_val = self._eval_int_expr(end_str, env)

            terms = []
            for i in range(start_val, end_val + 1):
                term = self._substitute_iter_var(body, iter_var, i)
                terms.append(f"({term})")

            return " + ".join(terms) if terms else "0"

        pattern = r"sum\s*\(\s*([a-zA-Z_]\w*)\s+in\s+([^\.]+)\.\.([^)]+)\)\s*\(([^)]+)\)"
        while re.search(pattern, expr):
            expr = re.sub(pattern, replace_sum, expr)
        return expr

    def _parse_linear_expression(self, expr: str, model: ParsedModel, env: Dict[str, Any]) -> Tuple[Dict[str, float], float]:
        """
        Convierte una expresión como:
        '3*x[1] + 2*x[2] - x3 + 5'
        en ({'x_1': 3.0, 'x_2': 2.0, 'x3': -1.0}, 5.0)
        """
        # Primero expandir cualquier función sum(...)
        expr = self._expand_sum(expr, model, env)

        # Convertir indexaciones de array x[i] a x_i para homogeneizar
        def replace_indexer(match):
            arr = match.group(1)
            idx_expr = match.group(2)
            eval_idx = self._eval_int_expr(idx_expr, env)
            return f"{arr}_{eval_idx}"

        expr = re.sub(r"([a-zA-Z_]\w*)\s*\[\s*([^\]]+)\s*\]", replace_indexer, expr)

        # Quitar paréntesis redundantes manteniendo los signos
        expr = expr.replace("(", " ").replace(")", " ")

        # Eliminar espacios alrededor de multiplicaciones: "3 * x" -> "3*x"
        expr = re.sub(r"\s*\*\s*", "*", expr)

        # Normalizar espacios antes de '+' y '-' para poder separar en términos
        expr = re.sub(r"\s*([+-])\s*", r" \1", expr)

        tokens = expr.split()

        linear_terms: Dict[str, float] = {}
        constant_val: float = 0.0

        for token in tokens:
            token = token.strip()
            if not token or token in ("+", "-"):
                continue

            sign = 1.0
            if token.startswith("+"):
                token = token[1:].strip()
            elif token.startswith("-"):
                sign = -1.0
                token = token[1:].strip()

            if not token:
                continue

            # Chequear si es multiplicación 'coef*var' o 'var*coef'
            if "*" in token:
                parts = token.split("*")
                if len(parts) != 2:
                    raise ValueError(f"Expresión multiplicativa no soportada: '{token}'")
                p1, p2 = parts[0].strip(), parts[1].strip()

                # Caso 1: p1 es número/parámetro, p2 es variable
                if p2 in model.variables or self._is_possible_var(p2, model):
                    coeff = sign * self._eval_number_or_param(p1, env)
                    var_name = self._resolve_var_name(p2, model)
                    linear_terms[var_name] = linear_terms.get(var_name, 0.0) + coeff
                # Caso 2: p2 es número/parámetro, p1 es variable
                elif p1 in model.variables or self._is_possible_var(p1, model):
                    coeff = sign * self._eval_number_or_param(p2, env)
                    var_name = self._resolve_var_name(p1, model)
                    linear_terms[var_name] = linear_terms.get(var_name, 0.0) + coeff
                else:
                    # Producto de dos constantes
                    val = sign * self._eval_number_or_param(p1, env) * self._eval_number_or_param(p2, env)
                    constant_val += val
            else:
                # Es solo variable o solo constante
                if token in model.variables or self._is_possible_var(token, model):
                    var_name = self._resolve_var_name(token, model)
                    linear_terms[var_name] = linear_terms.get(var_name, 0.0) + (1.0 * sign)
                else:
                    # Constante
                    val = sign * self._eval_number_or_param(token, env)
                    constant_val += val

        return linear_terms, constant_val

    def _is_possible_var(self, name: str, model: ParsedModel) -> bool:
        return name in model.variables

    def _resolve_var_name(self, name: str, model: ParsedModel) -> str:
        if name in model.variables:
            return name
        raise ValueError(f"Variable '{name}' no declarada en el modelo.")

    def _eval_number_or_param(self, token: str, env: Dict[str, Any]) -> float:
        token = token.strip()
        # Verificar si es un acceso a parámetro array ej: w_1 o w[1]
        m_arr_param = re.match(r"([a-zA-Z_]\w*)_(\d+)", token)
        if m_arr_param:
            p_name = m_arr_param.group(1)
            p_idx = int(m_arr_param.group(2))
            if p_name in env and isinstance(env[p_name], list):
                # MiniZinc es 1-indexed por convención estándar
                return float(env[p_name][p_idx - 1])

        if token in env:
            return float(env[token])
        try:
            return float(token)
        except ValueError:
            raise ValueError(f"No se pudo resolver el valor o parámetro numérico: '{token}'")
