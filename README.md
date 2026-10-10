# Quantum IDE & Solver Project - Hackathon

Este proyecto es una plataforma interactiva que combina un **IDE en línea** para problemas de programación entera binaria, **Machine Learning**, y **Computación Cuántica** para la resolución de dichos problemas, todo acompañado de **animaciones 3D épicas** e interactivas.

## Arquitectura del Proyecto

### 1. Frontend (IDE & Animación 3D)
- **HTML/CSS/JS**: La interfaz principal incluye un editor de código en línea donde los usuarios pueden declarar problemas (con una sintaxis similar a MiniZinc).
- **Three.js**: Se encarga de la visualización épica, colorida y dinámica en 3D del flujo de información:
  - Envío del problema desde el IDE.
  - Procesamiento del PINN (Physics-Informed Neural Network).
  - Optimización de hiperparámetros.
  - Ejecución del Algoritmo Cuántico (QAOA y compuertas).

### 2. Backend (FastAPI & Python)
- **FastAPI**: Actúa como el puente de comunicación entre el frontend y los motores de ejecución.
- **Parser**: Convierte el problema declarativo en una formulación de Programación Entera Binaria.
- **Machine Learning (PINN)**: Una Red Neuronal Informada por la Física (Topología del problema) se ejecuta para determinar los mejores hiperparámetros para el QAOA inicial.
- **Computación Cuántica (Qiskit)**: Implementación de algoritmos variacionales como el QAOA (Quantum Approximate Optimization Algorithm), que utilizan los hiperparámetros de la red neuronal para ejecutarse de manera más rápida, con menor error y requiriendo menos qubits.

## Estructura de Directorios

```
HACKATONQ/
├── frontend/
│   ├── index.html               # Interfaz principal, contenedor del IDE y el canvas 3D
│   ├── css/
│   │   └── style.css            # Estilos épicos de la aplicación
│   └── js/
│       ├── main.js              # Controlador principal y conexiones de los módulos frontend
│       ├── ide.js               # Lógica del editor de texto y preparación para el envío de código
│       └── visualization.js     # Animaciones épicas y coloridas en 3D usando Three.js
├── backend/
│   ├── main.py                  # Servidor de FastAPI principal que orquesta las rutas
│   ├── requirements.txt         # Dependencias de Python (fastapi, uvicorn, qiskit, torch, etc.)
│   ├── api/
│   │   └── router.py            # Endpoints de la API (e.g. /solve, /status)
│   ├── parser/
│   │   └── problem_parser.py    # Transformación del lenguaje declarativo a problemas binarios
│   ├── ml/
│   │   └── pinn_model.py        # Modelo de Red Neuronal informada por la física
│   └── quantum/
│       └── qaoa_solver.py       # Algoritmos cuánticos usando Qiskit con hiperparámetros del PINN
├── LICENSE
└── README.md
```

## Flujo de Trabajo (Cómo Ejecutar)
1. Instalar las dependencias de Python: `pip install -r backend/requirements.txt`.
2. Iniciar el servidor backend: `uvicorn backend.main:app --reload`.
3. Abrir `frontend/index.html` en cualquier navegador web moderno, o usar un servidor estático como Live Server.
4. Escribe el problema en el panel del IDE, selecciona el solver y dale a "Run & Visualize".
5. ¡Disfruta de la magia cuántica y visual 3D épica!
