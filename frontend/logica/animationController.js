/**
 * Controlador de tiempo y transición entre shots cuánticos.
 * Cada paso en el tiempo corresponde a un shot que arroja un estado (ej. "11" o "1001").
 */
export class AnimationController {
  constructor(data, config, onEpochChange = null) {
    this.config = config;
    this.onEpochChange = onEpochChange;
    this.isPlaying = this.config.animation?.autoPlay ?? true;
    this.speedMultiplier = 1.0;
    this.elapsedTimeInEpoch = 0;
    this.setData(data);
  }

  setData(data) {
    this.data = data;
    this.estados = data?.estados || ["00", "01", "10", "11"];
    this.shots = data?.shots || [];
    this.numShots = this.shots.length || 1;
    this.currentShot = 0;
    this.elapsedTimeInEpoch = 0;

    // Duración adaptativa por época:
    // A 1x de velocidad, la simulación completa toma ~12 segundos (ritmo pausado y nítido, la mitad de rápido).
    // Con velocidades 2x, 5x, 10x la animación avanza proporcionalmente.
    const targetTotalSeconds = 12.0;
    this.epochDuration = Math.min(0.08, targetTotalSeconds / Math.max(1, this.numShots));

    // Precomputar mapa de estados e índices para O(1)
    const stateMap = new Map(this.estados.map((s, i) => [s, i]));

    // Precomputar conteos acumulados prefixCounts[shotIndex] en O(N)
    // Elimina la iteración repetida en cada frame, acelerando drásticamente el renderizado 3D.
    this.prefixCounts = [];
    const runningCounts = new Array(this.estados.length).fill(0);
    for (let i = 0; i < this.shots.length; i++) {
      const idx = stateMap.get(this.shots[i]);
      if (idx !== undefined) {
        runningCounts[idx]++;
      }
      this.prefixCounts.push([...runningCounts]);
    }

    if (this.onEpochChange) {
      this.triggerShotChange();
    }
  }

  /**
   * Obtiene los conteos acumulados en O(1) usando la tabla prefijada.
   */
  getAccumulatedCounts(shotIndex = this.currentShot) {
    if (!this.prefixCounts || this.prefixCounts.length === 0) {
      return new Array(this.estados.length).fill(0);
    }
    const idx = Math.max(0, Math.min(shotIndex, this.prefixCounts.length - 1));
    return this.prefixCounts[idx];
  }

  getCurrentShotState() {
    return this.shots[this.currentShot] || "";
  }

  triggerShotChange() {
    if (this.onEpochChange) {
      const counts = this.getAccumulatedCounts(this.currentShot);
      const currentShotState = this.getCurrentShotState();
      this.onEpochChange(this.currentShot, this.numShots, currentShotState, counts);
    }
  }

  update(delta) {
    if (!this.isPlaying) return;

    this.elapsedTimeInEpoch += delta * this.speedMultiplier;

    if (this.elapsedTimeInEpoch >= this.epochDuration) {
      // Calcular exactamente cuántos disparos avanzaron según delta y la velocidad
      const steps = Math.floor(this.elapsedTimeInEpoch / this.epochDuration);
      this.elapsedTimeInEpoch -= steps * this.epochDuration;

      this.advanceShots(steps);
    }
  }

  advanceShots(steps) {
    if (this.currentShot >= this.numShots - 1) {
      if (this.config.animation?.loop) {
        this.currentShot = 0;
        this.triggerShotChange();
      } else {
        this.isPlaying = false;
      }
      return;
    }

    const nextShot = Math.min(this.numShots - 1, this.currentShot + steps);
    this.currentShot = nextShot;
    this.triggerShotChange();

    if (this.currentShot >= this.numShots - 1 && !this.config.animation?.loop) {
      this.isPlaying = false;
    }
  }

  nextEpoch() {
    this.advanceShots(1);
  }

  prevEpoch() {
    if (this.currentShot > 0) {
      this.currentShot--;
    } else if (this.config.animation?.loop) {
      this.currentShot = this.numShots - 1;
    }

    this.elapsedTimeInEpoch = 0;
    this.triggerShotChange();
  }

  setEpoch(index) {
    if (index >= 0 && index < this.numShots) {
      this.currentShot = index;
      this.elapsedTimeInEpoch = 0;
      this.triggerShotChange();
    }
  }

  reset() {
    this.currentShot = 0;
    this.elapsedTimeInEpoch = 0;
    this.isPlaying = true;
    this.triggerShotChange();
  }

  togglePlay() {
    this.isPlaying = !this.isPlaying;
    return this.isPlaying;
  }

  setSpeed(multiplier) {
    this.speedMultiplier = Math.max(0.1, multiplier);
  }

  getProgress() {
    return Math.min(1.0, this.elapsedTimeInEpoch / this.epochDuration);
  }
}
