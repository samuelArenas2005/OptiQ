/**
 * Controlador de tiempo y transición entre shots cuánticos.
 * Cada paso en el tiempo corresponde a un shot que arroja un estado (ej. "11" o "1001").
 */
export class AnimationController {
  constructor(data, config, onEpochChange = null) {
    this.config = config;
    this.onEpochChange = onEpochChange;
    this.setData(data);

    this.isPlaying = this.config.animation.autoPlay ?? true;
    this.speedMultiplier = 1.0;
    this.elapsedTimeInEpoch = 0;
    this.epochDuration = this.config.animation.epochDuration || 0.8;
  }

  setData(data) {
    this.data = data;
    this.estados = data?.estados || ["00", "01", "10", "11"];
    this.shots = data?.shots || [];
    this.numShots = this.shots.length || 1;
    this.currentShot = 0;
    this.elapsedTimeInEpoch = 0;

    if (this.onEpochChange) {
      this.triggerShotChange();
    }
  }

  /**
   * Obtiene la cantidad acumulada de apariciones para cada estado hasta el shot especificado.
   */
  getAccumulatedCounts(shotIndex = this.currentShot) {
    const counts = new Array(this.estados.length).fill(0);
    const limit = Math.min(shotIndex, this.shots.length - 1);
    for (let i = 0; i <= limit; i++) {
      const state = this.shots[i];
      const idx = this.estados.indexOf(state);
      if (idx !== -1) {
        counts[idx]++;
      }
    }
    return counts;
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
      this.elapsedTimeInEpoch = 0;
      this.nextEpoch();
    }
  }

  nextEpoch() {
    if (this.currentShot < this.numShots - 1) {
      this.currentShot++;
      this.triggerShotChange();
    } else if (this.config.animation.loop) {
      this.currentShot = 0;
      this.triggerShotChange();
    } else {
      this.isPlaying = false;
    }
  }

  prevEpoch() {
    if (this.currentShot > 0) {
      this.currentShot--;
    } else if (this.config.animation.loop) {
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
