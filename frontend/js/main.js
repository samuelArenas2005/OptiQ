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
            const response = await fetch('http://localhost:8000/api/solve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: problemCode, solver: solverType })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || 'Error en el servidor al parsear');
            }

            const data = await response.json();
            const summary = data.parsed_summary;

            statusText.innerText = `[Parseo Exitoso] ${summary.variables_count} variables (${summary.variables.join(', ')}), ${summary.constraints_count} restricciones. QUBO: ${summary.qubo_nodes} nodos.`;

            // Transiciones visuales con los datos reales
            setTimeout(() => {
                statusText.innerText = 'Ejecutando Red Neuronal (PINN) para hallar los hiperparámetros iniciales...';
                visualizer.triggerState('pinn');
            }, 1500);

            setTimeout(() => {
                statusText.innerText = 'Hiperparámetros hallados, ejecutando circuito QAOA...';
                visualizer.triggerState('qaoa');
            }, 3500);

            setTimeout(() => {
                statusText.innerText = `¡Éxito! Solución: ${data.details.solution} | Energía: ${data.details.energy}`;
                visualizer.triggerState('success');
            }, 6000);

        } catch (error) {
            console.error(error);
            statusText.innerText = `Error: ${error.message}`;
            visualizer.triggerState('error');
        }
    });

    // Ajuste de responsive para el canvas 3D
    window.addEventListener('resize', () => {
        visualizer.onWindowResize();
    });
});
