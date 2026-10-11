# Documentación de la Arquitectura PINN para OptiQ

Este documento detalla la arquitectura, fundamentos físicos, formulación matemática y portabilidad de la **Red Neuronal Informada por la Física (PINN)** diseñada para predecir los hiperparámetros y ángulos variacionales de **QAOA** (Quantum Approximate Optimization Algorithm) en **OptiQ**.

---

## 1. Motivación y Mitigación de Barren Plateaus

En algoritmos cuánticos variacionales (VQA) como QAOA:
1. **Mesetas Estériles (Barren Plateaus):** A medida que crece el número de qubits ($n$) o la profundidad ($p$), la inicialización aleatoria de ángulos provoca que el gradiente de la función de coste decaiga exponencialmente ($\text{Var}[\partial \langle H_C \rangle / \partial \theta] \in \mathcal{O}(2^{-n})$).
2. **Dependencia de la Estructura del Grafo:** Los ángulos óptimos $\boldsymbol{\gamma}^*$ y $\boldsymbol{\beta}^*$ dependen fuertemente de propiedades topológicas y espectrales del Hamiltoniano de Ising:
   - Densidad del grafo y gap espectral del Laplaciano ($\lambda_2$).
   - Radio espectral ($\lambda_{\max}$) y balance de frustración de ciclos.
   - Distribución estadística de coeficientes lineales $h_i$ y cuadráticos $J_{ij}$.

Nuestra **PINN** mapea directamente el vector de métricas topológicas hacia los ángulos óptimos $(\boldsymbol{\gamma}, \boldsymbol{\beta})$, proporcionando una inicialización en una "cuenca de atracción" (*basin of attraction*) cercana al mínimo global, evitando búsquedas a ciegas.

---

## 2. Definición de Entradas y Salidas

### Vector de Entrada $\mathbf{x} \in \mathbb{R}^{17}$
Métricas calculadas por `feature_extractor.py` junto con la codificación de contexto:
* **Features Topológicas y Espectrales Continuas (11):**
  1. `num_qubits_n`: Número de variables binarias / qubits $|V|$.
  2. `num_couplings_m`: Número de acoplamientos cuadráticos $|E|$.
  3. `graph_density`: Densidad del grafo $2|E| / (|V|(|V|-1))$.
  4. `spectral_gap_lambda2`: Segundo menor autovalor del Laplaciano ($L = D - A$).
  5. `spectral_radius_lambda_max`: Máximo autovalor del Laplaciano.
  6. `global_frustration_index`: Medida de frustración de ciclos en grafos con signos $J_{ij}$.
  7. `h_mean`: Media de los campos lineales $h_i$.
  8. `h_std`: Desviación estándar de $h_i$.
  9. `J_mean`: Media de los acoplamientos cuadráticos $J_{ij}$.
  10. `J_std`: Desviación estándar de $J_{ij}$.
  11. `optimal_penalty_lambda`: Multiplicador de penalización de restricciones QUBO.
* **Codificación de Familia de Problema (6 One-Hot):**
  `problem_type_{FrustratedIsing, Knapsack, MaxCut_BA, MaxCut_ER, MaxCut_Reg, VertexCover}` para eliminar la ambigüedad entre tipos de problemas con paisajes de energía contrastantes.

### Vector de Salida $\hat{\mathbf{y}}$ (Multi-Head)
* **Head de Ángulos QAOA $\hat{\boldsymbol{\theta}} \in \mathbb{R}^{6}$:**
  - $p=1$: $\gamma_{1,0}, \beta_{1,0}$
  - $p=2$: $\gamma_{2,0}, \gamma_{2,1}, \beta_{2,0}, \beta_{2,1}$
* **Head de Telemetría $\hat{\boldsymbol{\tau}} \in \mathbb{R}^{3}$:**
  - `recommended_shots`: Disparos recomendados para convergencia muestral.
  - `recommended_lr_eta`: Tasa de aprendizaje óptima para optimizadores clásicos (e.g. SPSA/Adam).
  - `target_depth_p_star`: Profundidad óptima recomendada.

---

## 3. Función de Pérdida con Simetría Cuántica y Regularización Fisiológica ($\mathcal{L}_{\text{PINN}}$)

En algoritmos cuánticos variacionales como QAOA, rotaciones del operador mezclador $e^{-i\beta X}$ poseen simetría periódica respecto a $\pi$. Dos parámetros $\beta$ y $\beta \pm \pi$ representan estados físicos idénticos. Tratar esta diferencia como error euclidiano clásico provoca que la red prediga el punto medio artificialmente.

$$\mathcal{L}_{\text{total}} = \frac{1}{6} \left(\sum \mathcal{L}_{\gamma} + \sum \mathcal{L}_{\beta}^{\text{sym}}\right) + \lambda_{\text{adiab}} \mathcal{L}_{\text{adiab}} + \lambda_{\text{bound}} \mathcal{L}_{\text{bound}}$$

*Nota de escala:* Al promediar entre los 6 ángulos, la pérdida se sitúa en la escala estándar de $\sim 0.27$, directamente comparable con funciones de costo continuas.

### Componentes de la Pérdida:
1. **Pérdida de Fase de Coste ($\mathcal{L}_{\gamma}$):**
   Utiliza Huber Loss (`SmoothL1Loss` con $\beta=0.1$) sobre los ángulos $\gamma_{1,0}, \gamma_{2,0}, \gamma_{2,1}$.
2. **Pérdida con Simetría Periódica de Mezcla ($\mathcal{L}_{\beta}^{\text{sym}}$):**
   Calcula la distancia geodésica mínima en el toro cuántico:
   $$\Delta_{\beta} = \min\big(|\hat{\beta} - \beta^*|,\; |\hat{\beta} - (\beta^* - \pi)|,\; |\hat{\beta} - (\beta^* + \pi)|\big)$$
   Aplicando `SmoothL1` sobre $\Delta_{\beta}$. Esto previene errores espurios por alternancia de signo o saltos de paridad.
3. **Inyección de Ruido Gaussiano (Quantum Jittering):**
   Capa de perturbación estocástica $\mathcal{N}(0, \sigma=0.015)$ activa en features continuas durante el entrenamiento para suavizar la variedad energética y prevenir sobreajuste a instancias particulares de grafos.
4. **Consistencia Adiabática en Mezcla ($\mathcal{L}_{\text{adiab}}$):**
   Monotonicidad física en $\beta$: $\text{ReLU}(\hat{\beta}_{2,1} - \hat{\beta}_{2,0})$ con $\lambda_{\text{adiab}} = 0.01$.
5. **Regularización Periódica de Frontera ($\mathcal{L}_{\text{bound}}$):**
   Penalización suave si los ángulos escapan del rango $[-\pi, 2\pi]$.
6. **Model Checkpointing con Deepcopy:**
   Se almacena en memoria y disco el mejor estado (`best_val_loss`) evitando usar épocas subóptimas o sobreentrenadas.

---

## 4. Protocolo de Validación Cruzada (Stratified 5-Fold Cross Validation)

Para certificar que el modelo generaliza uniformemente y descartar sesgo muestral:
* El dataset de 10,000 instancias se particiona en 5 pliegues estratificados según la familia del problema (`problem_type`).
* Cada fold normaliza sus features independientemente con su propio `StandardScaler` evitando fuga de información (*data leakage*).
* Se evalúa el error absoluto angular medio físico ($\text{MAE}_{\text{físico}}$ en radianes), reportando:
  $$\text{MAE}_{\text{CV}} = \mu_{\text{folds}} \pm \sigma_{\text{folds}}$$
  demostrando estabilidad y solidez estadística en todas las clases de problemas combinatorios.



---

## 4. Portabilidad y Despliegue en Repositorios

Para que el modelo sea 100% portable y no requiera frameworks pesados en entornos ligeros:
1. **Pesos PyTorch Compactos (`.pt`):** Se guarda el `state_dict` (ocupando <200 KB).
2. **Parámetros del Scaler en JSON (`scaler_params.json`):** Almacena las medias ($\mu$) y desviaciones ($\sigma$) de las 11 features para normalizar en tiempo real sin requerir `scikit-learn` en producción si se busca máxima ligereza.
3. **Módulo de Inferencia Autónomo (`pinn_model.py`):** Carga los pesos entrenados y devuelve los ángulos en milisegundos cuando la UI solicita la estrategia `"pinn"`.
