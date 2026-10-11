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
  constructor(scene, config, estados = 4) {
    this.scene = scene;
    this.config = config;

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
  createTopBadgeSprite(text, count = 0, isWinner = false) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 80;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = isWinner ? 'rgba(255, 234, 0, 0.95)' : 'rgba(10, 20, 35, 0.85)';
    if (ctx.roundRect) ctx.roundRect(8, 8, 240, 64, 14);
    else ctx.fillRect(8, 8, 240, 64);
    ctx.fill();

    ctx.strokeStyle = isWinner ? '#ffffff' : '#38bdf8';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.font = 'bold 30px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isWinner ? '#060b14' : '#e0f2fe';
    ctx.fillText(isWinner ? `👑 |${text}⟩: ${count}` : `|${text}⟩: ${count}`, 128, 40);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(1.25, 0.42, 1);
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

    const isLastShot = shotIndex === totalShots - 1;
    const maxCount = Math.max(...countsPerState, 1);

    // Identificar el ganador acumulado
    let winnerIndex = countsPerState.indexOf(Math.max(...countsPerState));

    if (this.winnerLight) {
      if (isLastShot && winnerIndex >= 0 && this.bars[winnerIndex]) {
        const winningBar = this.bars[winnerIndex];
        this.winnerLight.position.set(winningBar.posX, 6, 2);
        this.winnerLight.targetIntensity = this.config.effects?.winnerSpotlightIntensity ?? 4.5;
      } else {
        this.winnerLight.targetIntensity = 0;
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

      const isWinnerNow = isLastShot && i === winnerIndex;

      // Actualizar el sprite superior si cambió el conteo o si es el ganador
      if (countChanged || isWinnerNow !== bar.isWinner) {
        this.updateTopBadge(bar, isWinnerNow);
      }

      if (isWinnerNow) {
        // Estado Ganador en el shot final: Amarillo Neón Eléctrico
        bar.isWinner = true;
        bar.targetColor.copy(this.neonYellow);
        bar.targetEmissive.copy(this.neonYellowEmissive);
        bar.targetEmissiveIntensity = this.config.colors.winnerEmissiveIntensity;
        bar.targetEdgeColor.copy(this.edgeYellow);

        this.updateBasePlaque(bar, true);
        this.updateVerticalText(bar, true);
      } else if (isCurrentHit) {
        // Estado que acaba de salir en este disparo: Pulso Cyan Neón
        bar.isWinner = false;
        bar.targetColor.copy(this.neonCyan);
        bar.targetEmissive.copy(this.neonCyan);
        bar.targetEmissiveIntensity = 1.3;
        bar.targetEdgeColor.copy(this.edgeCyan);

        if (bar.isWinner) {
          this.updateBasePlaque(bar, false);
          this.updateVerticalText(bar, false);
        }
      } else {
        // Estado regular
        if (bar.isWinner) {
          this.updateBasePlaque(bar, false);
          this.updateVerticalText(bar, false);
        }
        bar.isWinner = false;
        bar.targetColor.copy(this.neonGreen);
        bar.targetEmissive.copy(this.neonGreenEmissive);
        bar.targetEmissiveIntensity = isLastShot
          ? this.config.colors.emissiveIntensity * 0.70
          : this.config.colors.emissiveIntensity;
        bar.targetEdgeColor.copy(this.edgeGreen);
      }
    }
  }

  updateTopBadge(bar, isWinner) {
    const canvas = bar.topBadgeObj.canvas;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = isWinner ? 'rgba(255, 234, 0, 0.95)' : 'rgba(10, 20, 35, 0.85)';
    if (ctx.roundRect) ctx.roundRect(8, 8, 240, 64, 14);
    else ctx.fillRect(8, 8, 240, 64);
    ctx.fill();

    ctx.strokeStyle = isWinner ? '#ffffff' : '#38bdf8';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.font = 'bold 30px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isWinner ? '#060b14' : '#e0f2fe';
    ctx.fillText(isWinner ? `👑 |${bar.stateName}⟩: ${bar.count}` : `|${bar.stateName}⟩: ${bar.count}`, 128, 40);

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

  update(lerpFactor = this.config.animation.lerpFactor) {
    const { maxHeight, minHeight } = this.config.bar;
    const colorLerp = Math.min(1.0, lerpFactor * 2.0);

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

      // La tapa superior y el indicador flotante siguen la altura de la columna
      if (bar.topCapMesh) {
        bar.topCapMesh.position.y = bar.currentHeight;
      }
      if (bar.topBadgeObj && bar.topBadgeObj.sprite) {
        bar.topBadgeObj.sprite.position.y = bar.currentHeight + 0.55;
      }

      // (Texto vertical removido del update loop)

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

  getCurrentValues() {
    return this.bars.map((b) => b.currentValue);
  }

  getWinnerInfo() {
    let maxCount = -1;
    let winnerBar = null;
    for (const b of this.bars) {
      if (b.count > maxCount) {
        maxCount = b.count;
        winnerBar = b;
      }
    }
    return winnerBar ? { index: winnerBar.index, state: winnerBar.stateName, count: maxCount } : null;
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
