import * as THREE from 'three';

/**
 * Gestor de la malla de barras 3D:
 * - Cada barra representa un estado cuántico (ej. "00", "01", "10", "11", "1010").
 * - Cada bloque muestra claramente el estado que representa:
 *   1. Placa Neón Frontal en la base (|estado⟩) siempre visible desde el shot 1.
 *   2. Texto escrito verticalmente en el frente de la columna con caracteres apilados.
 *   3. Indicador flotante en la cima que sube con la barra mostrando estado y conteo.
 * - La animación se detiene al llegar al último shot coronando al estado ganador.
 */
export class BarManager {
  constructor(scene, config, estados = 4, options = {}) {
    this.scene = scene;
    this.config = config;
    this.optimalState = typeof options === 'string' ? options : (options?.optimalState || null);

    // Normalizar arreglo de estados
    if (Array.isArray(estados)) {
      this.estados = estados;
    } else if (typeof estados === 'number') {
      this.estados = Array.from({ length: estados }, (_, i) => `q${i}`);
    } else {
      this.estados = ["00", "01", "10", "11"];
    }

    this.numBarras = this.estados.length;

    this.bars = [];
    this.group = new THREE.Group();
    this.scene.add(this.group);

    // Control del barrido secuencial final hacia la solución óptima
    this.isSweepActive = false;
    this.isSweepComplete = false;
    this.sweepIndex = -1;
    this.sweepTimer = 0;
    this.sweepStepDuration = 0.20; // 200 ms por barra en el barrido secuencial
    this.optimalIndex = -1;

    // Colores base neón
    this.neonGreen = new THREE.Color(this.config.colors.neonGreen);
    this.neonGreenEmissive = new THREE.Color(this.config.colors.neonGreenEmissive);
    this.neonYellow = new THREE.Color(this.config.colors.neonYellow);
    this.neonYellowEmissive = new THREE.Color(this.config.colors.neonYellowEmissive);
    this.neonCyan = new THREE.Color(0x00f2fe);

    this.edgeGreen = new THREE.Color(this.config.edges?.greenColor ?? 0x39ff14);
    this.edgeYellow = new THREE.Color(this.config.edges?.yellowColor ?? 0xffff33);
    this.edgeCyan = new THREE.Color(0x38bdf8);

    // Luz puntual para el ganador
    this.winnerLight = null;
    if (this.config.effects?.winnerSpotlight) {
      this.winnerLight = new THREE.PointLight(this.neonYellow, 0, 25, 2);
      this.winnerLight.position.set(0, 6, 2);
      this.scene.add(this.winnerLight);
    }

    this.initBars();
  }

  /**
   * Crea la placa frontal en la base que muestra permanentemente el estado cuántico |x⟩
   */
  createBasePlaqueSprite(text, isWinner = false) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fondo oscuro translúcido con bordes redondeados
    ctx.fillStyle = isWinner ? 'rgba(35, 28, 5, 0.92)' : 'rgba(8, 14, 26, 0.90)';
    if (ctx.roundRect) ctx.roundRect(8, 8, 240, 80, 16);
    else ctx.fillRect(8, 8, 240, 80);
    ctx.fill();

    // Borde Neón
    ctx.strokeStyle = isWinner ? '#ffd700' : '#00ff88';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Texto del estado cuántico |x⟩
    ctx.font = 'bold 36px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isWinner ? '#ffea00' : '#00ff88';
    ctx.shadowColor = isWinner ? '#ffd700' : '#00ff88';
    ctx.shadowBlur = 10;
    ctx.fillText(`|${text}⟩`, 128, 48);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(1.4, 0.55, 1);
    return { sprite, texture, canvas };
  }

  /**
   * Crea la textura para el texto escrito de forma vertical en el frente de la columna
   */
  createVerticalTextTexture(text, isWinner = false) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Panel translúcido vertical
    ctx.fillStyle = isWinner ? 'rgba(30, 24, 4, 0.75)' : 'rgba(6, 12, 22, 0.70)';
    if (ctx.roundRect) ctx.roundRect(14, 10, 100, 492, 14);
    else ctx.fillRect(14, 10, 100, 492);
    ctx.fill();

    // Borde fino
    ctx.strokeStyle = isWinner ? '#ffd700' : 'rgba(0, 255, 136, 0.4)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Caracteres apilados verticalmente
    const chars = text.split('');
    ctx.font = 'bold 46px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isWinner ? '#fff566' : '#ffffff';
    ctx.shadowColor = isWinner ? '#ffd700' : '#00ff88';
    ctx.shadowBlur = 12;

    const count = chars.length;
    const startY = 70;
    const endY = 440;
    const stepY = count > 1 ? (endY - startY) / (count - 1) : 0;

    for (let c = 0; c < count; c++) {
      const y = count === 1 ? 256 : startY + c * stepY;
      ctx.fillText(chars[c], 64, y);
    }

    const texture = new THREE.CanvasTexture(canvas);
    return { texture, canvas };
  }

  /**
   * Crea el indicador flotante sobre la tapa superior que sube con la barra
   */
  createTopBadgeSprite(text, count = 0, status = 'normal') {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 80;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const isOptimal = status === 'optimal' || status === true;
    const isScanning = status === 'scanning';

    if (isOptimal) {
      // Estado Óptimo final: Dorado Neón Electrizante
      ctx.fillStyle = 'rgba(255, 215, 0, 0.98)';
      if (ctx.roundRect) ctx.roundRect(6, 6, 244, 68, 16);
      else ctx.fillRect(6, 6, 244, 68);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3.5;
      ctx.stroke();

      ctx.font = 'bold 24px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#0a0e17';
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 8;
      ctx.fillText(`👑 OPTIMAL |${text}⟩: ${count}`, 128, 40);
    } else if (isScanning) {
      // Estado durante el barrido visual: Cyan Neón Vibrante
      ctx.fillStyle = 'rgba(0, 242, 254, 0.95)';
      if (ctx.roundRect) ctx.roundRect(8, 8, 240, 64, 14);
      else ctx.fillRect(8, 8, 240, 64);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.font = 'bold 28px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#02131d';
      ctx.shadowBlur = 0;
      ctx.fillText(`⚡ |${text}⟩: ${count}`, 128, 40);
    } else {
      // Estado normal
      ctx.fillStyle = 'rgba(10, 20, 35, 0.85)';
      if (ctx.roundRect) ctx.roundRect(8, 8, 240, 64, 14);
      else ctx.fillRect(8, 8, 240, 64);
      ctx.fill();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.font = 'bold 28px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#e0f2fe';
      ctx.shadowBlur = 0;
      ctx.fillText(`|${text}⟩: ${count}`, 128, 40);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(1.28, 0.44, 1);
    sprite.renderOrder = 10;
    return { sprite, texture, canvas };
  }

  initBars() {
    const { width, depth, spacing, minHeight } = this.config.bar;
    const totalSpan = (this.numBarras - 1) * (width + spacing);
    const startX = -totalSpan / 2;

    const baseGeometry = new THREE.BoxGeometry(width, 1.0, depth);
    baseGeometry.translate(0, 0.5, 0);

    const pedestalGeo = new THREE.BoxGeometry(width * 1.25, 0.08, depth * 1.25);
    pedestalGeo.translate(0, 0.04, 0);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x060b14,
      metalness: 0.9,
      roughness: 0.15,
    });

    const topCapGeo = new THREE.BoxGeometry(width * 1.02, 0.06, depth * 1.02);
    topCapGeo.translate(0, 0.03, 0);

    const baseRingGeo = new THREE.BoxGeometry(width * 1.28, 0.02, depth * 1.28);
    baseRingGeo.translate(0, 0.01, 0);

    // Geometría para el texto vertical en el frente de la barra
    const verticalTextGeo = new THREE.PlaneGeometry(width * 0.72, 3.4);
    verticalTextGeo.translate(0, 1.7, 0); // Pivote en la base inferior

    for (let i = 0; i < this.numBarras; i++) {
      const posX = startX + i * (width + spacing);
      const stateName = this.estados[i] || `E${i}`;

      const material = new THREE.MeshStandardMaterial({
        color: this.neonGreen.clone(),
        emissive: this.neonGreenEmissive.clone(),
        emissiveIntensity: this.config.colors.emissiveIntensity,
        roughness: this.config.colors.roughness,
        metalness: this.config.colors.metalness,
        transparent: true,
        opacity: this.config.colors.opacity,
        depthWrite: true,
      });

      const barMesh = new THREE.Mesh(baseGeometry, material);
      barMesh.position.set(posX, 0, 0);
      barMesh.castShadow = true;
      barMesh.receiveShadow = true;
      barMesh.scale.set(1, minHeight, 1);

      // Bordes neón
      let wireframeMat = null;
      if (this.config.edges?.enabled !== false) {
        const wireframeGeo = new THREE.EdgesGeometry(baseGeometry);
        wireframeMat = new THREE.LineBasicMaterial({
          color: this.edgeGreen.clone(),
          transparent: (this.config.edges?.opacity ?? 1.0) < 1.0,
          opacity: this.config.edges?.opacity ?? 1.0,
          depthTest: true,
        });
        const edges = new THREE.LineSegments(wireframeGeo, wireframeMat);
        edges.renderOrder = 2;
        barMesh.add(edges);
      }

      // Tapa superior neón
      let topCapMesh = null;
      if (this.config.effects?.topCapGlow) {
        const topCapMat = new THREE.MeshStandardMaterial({
          color: this.edgeGreen.clone(),
          emissive: this.edgeGreen.clone(),
          emissiveIntensity: this.config.colors.emissiveIntensity * 1.2,
          transparent: true,
          opacity: this.config.effects?.topCapOpacity ?? 0.95,
          roughness: 0.1,
          metalness: 0.2,
        });
        topCapMesh = new THREE.Mesh(topCapGeo, topCapMat);
        topCapMesh.position.set(posX, minHeight, 0);
        this.group.add(topCapMesh);
      }

      // Anillo base
      let baseRingMesh = null;
      if (this.config.effects?.baseGlowRing) {
        const baseRingMat = new THREE.MeshStandardMaterial({
          color: this.edgeGreen.clone(),
          emissive: this.edgeGreen.clone(),
          emissiveIntensity: 0.8,
          roughness: 0.2,
          metalness: 0.5,
        });
        baseRingMesh = new THREE.Mesh(baseRingGeo, baseRingMat);
        baseRingMesh.position.set(posX, 0.08, 0);
        this.group.add(baseRingMesh);
      }

      // Pedestal
      const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
      pedestal.position.set(posX, 0, 0);
      pedestal.receiveShadow = true;
      this.group.add(pedestal);

      // 1. Placa Frontal de Base con el estado |x⟩ (siempre visible sobre el suelo)
      const basePlaqueObj = this.createBasePlaqueSprite(stateName);
      basePlaqueObj.sprite.position.set(posX, 0.38, depth / 2 + 0.85);
      this.group.add(basePlaqueObj.sprite);

      // 2. Texto vertical eliminado (reemplazado por la placa base y el badge flotante)

      // 3. Indicador flotante en la cima con estado y conteo en tiempo real
      const topBadgeObj = this.createTopBadgeSprite(stateName, 0);
      topBadgeObj.sprite.position.set(posX, minHeight + 0.55, 0);
      this.group.add(topBadgeObj.sprite);

      this.group.add(barMesh);

      this.bars.push({
        index: i,
        stateName: stateName,
        posX: posX,
        mesh: barMesh,
        material: material,
        wireframeMat: wireframeMat,
        topCapMesh: topCapMesh,
        baseRingMesh: baseRingMesh,
        basePlaqueObj: basePlaqueObj,
        verticalMesh: null,
        verticalTextObj: null,
        topBadgeObj: topBadgeObj,
        currentValue: 0.0,
        targetValue: 0.0,
        currentHeight: minHeight,
        count: 0,
        targetColor: this.neonGreen.clone(),
        targetEmissive: this.neonGreenEmissive.clone(),
        targetEmissiveIntensity: this.config.colors.emissiveIntensity,
        targetEdgeColor: this.edgeGreen.clone(),
        isWinner: false,
        isActiveShot: false,
      });
    }
  }

  /**
   * Actualiza el estado de las barras según el shot actual y el acumulado de conteos.
   */
  setEpochState(shotIndex, totalShots, currentShotState, countsPerState) {
    if (!countsPerState || countsPerState.length === 0) return;

    const isLastShot = shotIndex >= totalShots - 1;
    const maxCount = Math.max(...countsPerState, 1);

    // Identificar el índice del estado óptimo
    if (this.optimalState) {
      this.optimalIndex = this.estados.indexOf(this.optimalState);
    }
    if (this.optimalIndex === -1) {
      this.optimalIndex = countsPerState.indexOf(Math.max(...countsPerState));
    }

    if (!isLastShot) {
      // Mientras transcurren los disparos o si se reinició:
      this.isSweepActive = false;
      this.isSweepComplete = false;
      this.sweepIndex = -1;
      this.sweepTimer = 0;
      if (this.winnerLight) {
        this.winnerLight.targetIntensity = 0;
      }
    } else {
      // Llegó el último disparo: Iniciar el recorrido por todos los tops si no se ha iniciado
      if (!this.isSweepActive && !this.isSweepComplete) {
        this.isSweepActive = true;
        this.sweepTimer = 0;
        this.sweepIndex = -1;
      }
    }

    for (let i = 0; i < this.bars.length; i++) {
      const bar = this.bars[i];
      const count = countsPerState[i] || 0;
      const countChanged = bar.count !== count;
      bar.count = count;

      // Altura normalizada proporcional a la frecuencia del estado
      const normalizedValue = count / maxCount;
      bar.targetValue = normalizedValue;

      const isCurrentHit = bar.stateName === currentShotState;
      bar.isActiveShot = isCurrentHit;

      // Durante la acumulación regular de disparos:
      if (!this.isSweepActive && !this.isSweepComplete) {
        bar.isWinner = false;
        if (countChanged) {
          this.updateTopBadge(bar, 'normal');
        }

        if (isCurrentHit) {
          // Pulso Cyan Neón en el estado recién medido
          bar.targetColor.copy(this.neonCyan);
          bar.targetEmissive.copy(this.neonCyan);
          bar.targetEmissiveIntensity = 1.3;
          bar.targetEdgeColor.copy(this.edgeCyan);
        } else {
          bar.targetColor.copy(this.neonGreen);
          bar.targetEmissive.copy(this.neonGreenEmissive);
          bar.targetEmissiveIntensity = this.config.colors.emissiveIntensity;
          bar.targetEdgeColor.copy(this.edgeGreen);
        }
      }
    }
  }

  updateTopBadge(bar, status = 'normal') {
    const canvas = bar.topBadgeObj.canvas;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const isOptimal = status === 'optimal' || status === true;
    const isScanning = status === 'scanning';

    if (isOptimal) {
      // Alumbrar la solución óptima: Dorado Neón Electrizante con corona
      ctx.fillStyle = 'rgba(255, 215, 0, 0.98)';
      if (ctx.roundRect) ctx.roundRect(6, 6, 244, 68, 16);
      else ctx.fillRect(6, 6, 244, 68);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3.5;
      ctx.stroke();

      ctx.font = 'bold 24px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#0a0e17';
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 8;
      ctx.fillText(`👑 OPTIMAL |${bar.stateName}⟩: ${bar.count}`, 128, 40);
    } else if (isScanning) {
      // Durante el barrido por los tops: Cyan Neón con indicador de escaneo
      ctx.fillStyle = 'rgba(0, 242, 254, 0.95)';
      if (ctx.roundRect) ctx.roundRect(8, 8, 240, 64, 14);
      else ctx.fillRect(8, 8, 240, 64);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.font = 'bold 28px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#02131d';
      ctx.shadowBlur = 0;
      ctx.fillText(`⚡ |${bar.stateName}⟩: ${bar.count}`, 128, 40);
    } else {
      // Modo normal
      ctx.fillStyle = 'rgba(10, 20, 35, 0.85)';
      if (ctx.roundRect) ctx.roundRect(8, 8, 240, 64, 14);
      else ctx.fillRect(8, 8, 240, 64);
      ctx.fill();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.font = 'bold 28px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#e0f2fe';
      ctx.shadowBlur = 0;
      ctx.fillText(`|${bar.stateName}⟩: ${bar.count}`, 128, 40);
    }

    bar.topBadgeObj.texture.needsUpdate = true;
  }

  updateBasePlaque(bar, isWinner) {
    const canvas = bar.basePlaqueObj.canvas;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = isWinner ? 'rgba(35, 28, 5, 0.92)' : 'rgba(8, 14, 26, 0.90)';
    if (ctx.roundRect) ctx.roundRect(8, 8, 240, 80, 16);
    else ctx.fillRect(8, 8, 240, 80);
    ctx.fill();

    ctx.strokeStyle = isWinner ? '#ffd700' : '#00ff88';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.font = 'bold 36px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isWinner ? '#ffea00' : '#00ff88';
    ctx.shadowColor = isWinner ? '#ffd700' : '#00ff88';
    ctx.shadowBlur = 10;
    ctx.fillText(`|${bar.stateName}⟩`, 128, 48);

    bar.basePlaqueObj.texture.needsUpdate = true;
  }

  updateVerticalText(bar, isWinner) {
    const canvas = bar.verticalTextObj.canvas;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = isWinner ? 'rgba(30, 24, 4, 0.75)' : 'rgba(6, 12, 22, 0.70)';
    if (ctx.roundRect) ctx.roundRect(14, 10, 100, 492, 14);
    else ctx.fillRect(14, 10, 100, 492);
    ctx.fill();

    ctx.strokeStyle = isWinner ? '#ffd700' : 'rgba(0, 255, 136, 0.4)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    const chars = bar.stateName.split('');
    ctx.font = 'bold 46px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isWinner ? '#fff566' : '#ffffff';
    ctx.shadowColor = isWinner ? '#ffd700' : '#00ff88';
    ctx.shadowBlur = 12;

    const count = chars.length;
    const startY = 70;
    const endY = 440;
    const stepY = count > 1 ? (endY - startY) / (count - 1) : 0;

    for (let c = 0; c < count; c++) {
      const y = count === 1 ? 256 : startY + c * stepY;
      ctx.fillText(chars[c], 64, y);
    }

    bar.verticalTextObj.texture.needsUpdate = true;
  }

  update(lerpFactor = this.config.animation.lerpFactor, delta = 0.016) {
    const { maxHeight, minHeight } = this.config.bar;
    const colorLerp = Math.min(1.0, lerpFactor * 2.0);

    // Animación de recorrido secuencial por todos los tops al final de los shots
    if (this.isSweepActive) {
      this.sweepTimer += delta;
      const stepIdx = Math.floor(this.sweepTimer / this.sweepStepDuration);

      if (stepIdx < this.bars.length) {
        if (stepIdx !== this.sweepIndex) {
          this.sweepIndex = stepIdx;
          const currentScanningBar = this.bars[stepIdx];

          // Spotlight recorre cada columna en el barrido
          if (this.winnerLight && currentScanningBar) {
            this.winnerLight.position.set(currentScanningBar.posX, 6, 2);
            this.winnerLight.targetIntensity = 3.8;
          }

          for (let i = 0; i < this.bars.length; i++) {
            const bar = this.bars[i];
            if (i === stepIdx) {
              this.updateTopBadge(bar, 'scanning');
              bar.targetColor.copy(this.neonCyan);
              bar.targetEmissive.copy(this.neonCyan);
              bar.targetEmissiveIntensity = 1.6;
              bar.targetEdgeColor.copy(this.edgeCyan);
            } else {
              this.updateTopBadge(bar, 'normal');
              bar.targetColor.copy(this.neonGreen);
              bar.targetEmissive.copy(this.neonGreenEmissive);
              bar.targetEmissiveIntensity = this.config.colors.emissiveIntensity * 0.7;
              bar.targetEdgeColor.copy(this.edgeGreen);
            }
          }
        }
      } else {
        // Finaliza el recorrido: Ilumina fijamente y corona la solución óptima
        this.isSweepActive = false;
        this.isSweepComplete = true;
        this.sweepIndex = this.optimalIndex;

        const optimalBar = (this.optimalIndex >= 0 && this.bars[this.optimalIndex])
          ? this.bars[this.optimalIndex]
          : this.bars[0];

        if (this.winnerLight && optimalBar) {
          this.winnerLight.position.set(optimalBar.posX, 6, 2);
          this.winnerLight.targetIntensity = this.config.effects?.winnerSpotlightIntensity ?? 5.0;
        }

        for (let i = 0; i < this.bars.length; i++) {
          const bar = this.bars[i];
          const isOptimal = i === this.optimalIndex;
          bar.isWinner = isOptimal;

          if (isOptimal) {
            this.updateTopBadge(bar, 'optimal');
            this.updateBasePlaque(bar, true);
            bar.targetColor.copy(this.neonYellow);
            bar.targetEmissive.copy(this.neonYellowEmissive);
            bar.targetEmissiveIntensity = this.config.colors.winnerEmissiveIntensity ?? 2.0;
            bar.targetEdgeColor.copy(this.edgeYellow);
          } else {
            this.updateTopBadge(bar, 'normal');
            this.updateBasePlaque(bar, false);
            bar.targetColor.copy(this.neonGreen);
            bar.targetEmissive.copy(this.neonGreenEmissive);
            bar.targetEmissiveIntensity = this.config.colors.emissiveIntensity * 0.6;
            bar.targetEdgeColor.copy(this.edgeGreen);
          }
        }
      }
    }

    if (this.winnerLight && this.winnerLight.targetIntensity !== undefined) {
      this.winnerLight.intensity += (this.winnerLight.targetIntensity - this.winnerLight.intensity) * colorLerp;
    }

    for (let i = 0; i < this.bars.length; i++) {
      const bar = this.bars[i];

      // Interpolación de valor y altura
      bar.currentValue += (bar.targetValue - bar.currentValue) * lerpFactor;
      const targetHeight = minHeight + bar.currentValue * (maxHeight - minHeight);
      bar.currentHeight += (targetHeight - bar.currentHeight) * lerpFactor;

      bar.mesh.scale.y = bar.currentHeight;

      if (bar.topCapMesh) {
        bar.topCapMesh.position.y = bar.currentHeight;
      }
      if (bar.topBadgeObj && bar.topBadgeObj.sprite) {
        bar.topBadgeObj.sprite.position.y = bar.currentHeight + 0.55;
      }

      bar.material.color.lerp(bar.targetColor, colorLerp);
      bar.material.emissive.lerp(bar.targetEmissive, colorLerp);
      bar.material.emissiveIntensity += (bar.targetEmissiveIntensity - bar.material.emissiveIntensity) * colorLerp;

      if (bar.wireframeMat) {
        bar.wireframeMat.color.lerp(bar.targetEdgeColor, colorLerp);
      }

      if (bar.topCapMesh) {
        bar.topCapMesh.material.color.lerp(bar.targetEdgeColor, colorLerp);
        bar.topCapMesh.material.emissive.lerp(bar.targetEdgeColor, colorLerp);
        bar.topCapMesh.material.emissiveIntensity += ((bar.isWinner ? 1.6 : 1.0) - bar.topCapMesh.material.emissiveIntensity) * colorLerp;
      }

      if (bar.baseRingMesh) {
        bar.baseRingMesh.material.color.lerp(bar.targetEdgeColor, colorLerp);
        bar.baseRingMesh.material.emissive.lerp(bar.targetEdgeColor, colorLerp);
      }
    }
  }

  setOptimalState(optimalState) {
    this.optimalState = optimalState;
    if (this.optimalState) {
      this.optimalIndex = this.estados.indexOf(this.optimalState);
    }
  }

  reset() {
    this.isSweepActive = false;
    this.isSweepComplete = false;
    this.sweepIndex = -1;
    this.sweepTimer = 0;
    if (this.winnerLight) {
      this.winnerLight.targetIntensity = 0;
      this.winnerLight.intensity = 0;
    }
    for (const bar of this.bars) {
      bar.isWinner = false;
      bar.count = 0;
      bar.currentValue = 0;
      bar.targetValue = 0;
      bar.targetColor.copy(this.neonGreen);
      bar.targetEmissive.copy(this.neonGreenEmissive);
      bar.targetEmissiveIntensity = this.config.colors.emissiveIntensity;
      bar.targetEdgeColor.copy(this.edgeGreen);
      this.updateTopBadge(bar, 'normal');
      this.updateBasePlaque(bar, false);
    }
  }

  getCurrentValues() {
    return this.bars.map((b) => b.currentValue);
  }

  getWinnerInfo() {
    let optimalBar = null;
    if (this.optimalIndex >= 0 && this.bars[this.optimalIndex]) {
      optimalBar = this.bars[this.optimalIndex];
    } else {
      let maxCount = -1;
      for (const b of this.bars) {
        if (b.count > maxCount) {
          maxCount = b.count;
          optimalBar = b;
        }
      }
    }

    const currentSweepBar = (this.sweepIndex >= 0 && this.bars[this.sweepIndex])
      ? this.bars[this.sweepIndex]
      : null;

    return {
      index: optimalBar ? optimalBar.index : 0,
      state: optimalBar ? optimalBar.stateName : '',
      count: optimalBar ? optimalBar.count : 0,
      isOptimal: this.isSweepComplete,
      isSweeping: this.isSweepActive,
      sweepState: currentSweepBar ? currentSweepBar.stateName : null,
      sweepProgress: this.isSweepComplete ? 1.0 : (Math.max(0, this.sweepIndex) / Math.max(1, this.bars.length))
    };
  }

  dispose() {
    if (this.group && this.scene) {
      this.scene.remove(this.group);
    }
    if (this.winnerLight && this.scene) {
      this.scene.remove(this.winnerLight);
    }
    for (const bar of this.bars) {
      if (bar.mesh) {
        bar.mesh.geometry?.dispose();
        bar.mesh.material?.dispose();
      }
      if (bar.topCapMesh) {
        bar.topCapMesh.geometry?.dispose();
        bar.topCapMesh.material?.dispose();
      }
      if (bar.baseRingMesh) {
        bar.baseRingMesh.geometry?.dispose();
        bar.baseRingMesh.material?.dispose();
      }
      if (bar.verticalMesh) {
        bar.verticalMesh.geometry?.dispose();
        bar.verticalMesh.material?.dispose();
      }
      if (bar.basePlaqueObj) {
        bar.basePlaqueObj.texture?.dispose();
        bar.basePlaqueObj.sprite?.material?.dispose();
      }
      if (bar.topBadgeObj) {
        bar.topBadgeObj.texture?.dispose();
        bar.topBadgeObj.sprite?.material?.dispose();
      }
    }
  }
}
