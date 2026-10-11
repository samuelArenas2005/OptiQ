import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * Gestor de la escena Three.js: Cámara, Renderizador, Luces y OrbitControls.
 */
export class SceneManager {
  constructor(canvasContainer, config) {
    this.container = canvasContainer;
    this.config = config;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.resizeObserver = null;

    this.init();
  }

  init() {
    // 1. Escena
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.config.colors.background);
    this.scene.fog = new THREE.FogExp2(this.config.colors.background, 0.015);

    // 2. Cámara
    const width = this.container.clientWidth || 400;
    const height = this.container.clientHeight || 300;
    const aspect = width / height;
    this.camera = new THREE.PerspectiveCamera(
      this.config.camera.fov,
      aspect,
      this.config.camera.near,
      this.config.camera.far
    );
    this.camera.position.set(
      this.config.camera.initialPosition.x,
      this.config.camera.initialPosition.y,
      this.config.camera.initialPosition.z
    );

    // 3. Renderizador WebGL con Antialiasing y Tone Mapping
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.container.appendChild(this.renderer.domElement);

    // 4. OrbitControls para rotación y zoom interactivo
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.02;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 60;
    this.controls.target.set(
      this.config.camera.target.x,
      this.config.camera.target.y,
      this.config.camera.target.z
    );
    this.controls.update();

    // 5. Iluminación y Suelo
    this.setupLighting();
    this.setupEnvironment();

    // 6. Responsive Resize via ResizeObserver
    this.resizeObserver = new ResizeObserver(() => {
      this.onWindowResize();
    });
    this.resizeObserver.observe(this.container);
  }

  setupLighting() {
    // Luz Ambiental
    const ambientLight = new THREE.AmbientLight(
      this.config.lighting.ambientColor,
      this.config.lighting.ambientIntensity
    );
    this.scene.add(ambientLight);

    // Luz Direccional Principal
    const dirLight = new THREE.DirectionalLight(
      this.config.lighting.directionalColor,
      this.config.lighting.directionalIntensity
    );
    dirLight.position.set(
      this.config.lighting.directionalPosition.x,
      this.config.lighting.directionalPosition.y,
      this.config.lighting.directionalPosition.z
    );
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 80;
    dirLight.shadow.camera.left = -20;
    dirLight.shadow.camera.right = 20;
    dirLight.shadow.camera.top = 20;
    dirLight.shadow.camera.bottom = -20;
    dirLight.shadow.bias = -0.0005;
    this.scene.add(dirLight);

    // Luz de recorte
    const rimLight = new THREE.DirectionalLight(
      this.config.lighting.rimLightColor,
      this.config.lighting.rimLightIntensity
    );
    rimLight.position.set(
      this.config.lighting.rimLightPosition.x,
      this.config.lighting.rimLightPosition.y,
      this.config.lighting.rimLightPosition.z
    );
    this.scene.add(rimLight);

    // Luz puntual de acento
    const accentColor = this.config.lighting.accentLightColor ?? 0x00ff88;
    const accentIntensity = this.config.lighting.accentLightIntensity ?? 0.6;
    const pointLight = new THREE.PointLight(accentColor, accentIntensity, 30);
    pointLight.position.set(0, 1, 10);
    this.scene.add(pointLight);
  }

  setupEnvironment() {
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: this.config.colors.ground,
      roughness: 0.8,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const gridHelper = new THREE.GridHelper(50, 50, 0x38bdf8, this.config.colors.grid);
    gridHelper.position.y = 0.001;
    this.scene.add(gridHelper);
  }

  onWindowResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  update() {
    if (this.controls) {
      this.controls.update();
    }
  }

  render() {
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  dispose() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.controls) {
      this.controls.dispose();
    }
    if (this.renderer && this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      this.renderer.dispose();
    }
  }
}
