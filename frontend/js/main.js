/**
 * main.js - Archivo principal que orquesta el envío de los datos del IDE 
 * y sincroniza la respuesta del backend con las animaciones en Three.js.
 */

document.addEventListener('DOMContentLoaded', () => {
    const runBtn = document.getElementById('run-btn');
    const codeEditor = document.getElementById('code-editor');
    const statusText = document.getElementById('status-text');
    const solverSelect = document.getElementById('solver-select');

    // Instancia de visualizador 3D
    const visualizer = new QuantumVisualizer('visualization-panel');
    visualizer.init();
    visualizer.animate();

    runBtn.addEventListener('click', async () => {
        const problemCode = codeEditor.value;
        const solverType = solverSelect.value;
        
        statusText.innerText = 'Analizando código y parseando a forma binaria...';
        visualizer.triggerState('parsing');

        try {
            // Simulando petición al backend en FastAPI : POST /api/solve
            /*
            const response = await fetch('http://localhost:8000/api/solve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: problemCode, solver: solverType })
            });
            const data = await response.json();
            */

            // Simulamos la respuesta escalonada para observar la animación
            setTimeout(() => {
                statusText.innerText = 'Ejecutando Física (PINN) para hallar los hiperparámetros...';
                visualizer.triggerState('pinn');
            }, 2000);

            setTimeout(() => {
                statusText.innerText = 'Hiperparámetros hallados, ejecutando circuito QAOA...';
                visualizer.triggerState('qaoa');
            }, 5000);

            setTimeout(() => {
                statusText.innerText = '¡Toma de muestras lista! Resultados obtenidos con éxito.';
                visualizer.triggerState('success');
            }, 9000);

        } catch (error) {
            console.error(error);
            statusText.innerText = 'Hubo un error al contactar al backend.';
            visualizer.triggerState('error');
        }
    });

    // Ajuste de responsive para el canvas 3D
    window.addEventListener('resize', () => {
        visualizer.onWindowResize();
    });
});
