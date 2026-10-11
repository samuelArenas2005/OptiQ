import * as THREE from 'three';
import { config } from '../config/config.js';
import { data as mockDataFromEntradas } from '../../entradas/data.js';
import { SceneManager } from './sceneManager.js';
import { BarManager } from './barManager.js';
import { AnimationController } from './animationController.js';

// Dataset predeterminado (por defecto usa mockDataFromEntradas o fallback seguro)
export const defaultData = mockDataFromEntradas || {
  nombre: "Mock 1: 2 Qubits (4 estados - 25 shots)",
  num_estados: 4,
  estados: ["00", "01", "10", "11"],
  shots: [
    "00", "01", "11", "10", "11",
    "01", "11", "11", "10", "11",
    "11", "00", "11", "01", "11",
    "10", "11", "11", "01", "11",
    "11", "10", "11", "01", "11"
  ]
};

/**
 * Módulo principal que orquesta la escena, los datos por shots, las barras y el bucle de animación.
 */
export class BarVisualizationApp {
  constructor(containerId = 'canvas-container', initialData = null) {
    this.container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!this.container) {
      console.error(`Contenedor #${containerId} no encontrado.`);
      return;
    }

    this.currentData = initialData || defaultData;
    this.clock = new THREE.Clock();
    this.isRunning = true;
    this.animationFrameId = null;

    // 1. Inicializar escena 3D y controles
    this.sceneManager = new SceneManager(this.container, config);

    // 2. Inicializar barras 3D según la cantidad de estados
    this.barManager = new BarManager(
      this.sceneManager.scene,
      config,
      this.currentData.estados
    );

    // 3. Inicializar controlador de shots y transiciones
    this.animationController = new AnimationController(
      this.currentData,
      config,
      (shotIndex, totalShots, currentShotState, counts) => {
        this.barManager.setEpochState(shotIndex, totalShots, currentShotState, counts);
        this.onShotChangeCallback(shotIndex, totalShots, currentShotState, counts);
      }
    );

    // Disparar estado inicial
    const initialCounts = this.animationController.getAccumulatedCounts(0);
    const initialShot = this.animationController.getCurrentShotState();
    this.barManager.setEpochState(
      0,
      this.currentData.shots.length,
      initialShot,
      initialCounts
    );

    this.uiUpdateCallback = null;

    this.animate = this.animate.bind(this);
    this.animationFrameId = requestAnimationFrame(this.animate);
  }

  loadData(newData) {
    if (!newData || !newData.estados || !newData.shots) return;
    this.currentData = newData;

    // Recrear grupo de barras si cambiaron los estados
    this.barManager.dispose();
    this.barManager = new BarManager(
      this.sceneManager.scene,
      config,
      newData.estados
    );

    this.animationController.setData(newData);

    const initialCounts = this.animationController.getAccumulatedCounts(0);
    const initialShot = this.animationController.getCurrentShotState();
    this.barManager.setEpochState(
      0,
      newData.shots.length,
      initialShot,
      initialCounts
    );
  }

  onShotChangeCallback(shotIndex, totalShots, currentShotState, counts) {
    if (this.uiUpdateCallback) {
      this.uiUpdateCallback({
        type: 'shot-change',
        shotIndex,
        totalShots,
        currentShotState,
        counts,
        winner: this.barManager.getWinnerInfo(),
      });
    }
  }

  setUIListener(callback) {
    this.uiUpdateCallback = callback;
  }

  animate() {
    if (!this.isRunning) return;

    this.animationFrameId = requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();

    this.animationController.update(delta);
    this.barManager.update(config.animation.lerpFactor);
    this.sceneManager.update();

    if (this.uiUpdateCallback) {
      this.uiUpdateCallback({
        type: 'tick',
        progress: this.animationController.getProgress(),
        shotIndex: this.animationController.currentShot,
        totalShots: this.animationController.numShots,
        currentShotState: this.animationController.getCurrentShotState(),
        counts: this.animationController.getAccumulatedCounts(),
        winner: this.barManager.getWinnerInfo(),
        isPlaying: this.animationController.isPlaying,
      });
    }

    this.sceneManager.render();
  }

  onResize() {
    if (this.sceneManager) {
      this.sceneManager.onWindowResize();
    }
  }

  dispose() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.barManager) {
      this.barManager.dispose();
    }
    if (this.sceneManager) {
      this.sceneManager.dispose();
    }
  }
}

export const App = BarVisualizationApp;
