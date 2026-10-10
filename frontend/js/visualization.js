/**
 * visualization.js - Lógica épica 3D usando Three.js
 */

class QuantumVisualizer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.particles = null;
        this.time = 0;
        this.currentState = 'idle'; // idle | parsing | pinn | qaoa | success | error
    }

    init() {
        // Escena
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x0f0c29, 0.002);

        // Cámara
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        this.camera.position.z = 50;

        // Renderizador
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        // Crear partículas cuánticas coloridas
        this.createQuantumParticles();

        // Luces
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0xff00ff, 2, 100);
        pointLight.position.set(0, 0, 10);
        this.scene.add(pointLight);
    }

    createQuantumParticles() {
        const geometry = new THREE.BufferGeometry();
        const particlesCount = 2000;
        
        const posArray = new Float32Array(particlesCount * 3);
        const colorsArray = new Float32Array(particlesCount * 3);

        for(let i = 0; i < particlesCount * 3; i++) {
            // Posiciones aleatorias en forma de esfera o nube
            posArray[i] = (Math.random() - 0.5) * 100;
            
            // Colores vibrantes (cyan, magenta)
            colorsArray[i] = Math.random(); 
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colorsArray, 3));

        const material = new THREE.PointsMaterial({
            size: 0.5,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            transparent: true,
            opacity: 0.8
        });

        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
    }

    triggerState(state) {
        this.currentState = state;
        // Dependiendo del estado, cambias colores de luces o velocidades
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        this.time += 0.01;

        if (this.particles) {
            // Animación base suave
            this.particles.rotation.y = this.time * 0.1;
            this.particles.rotation.x = this.time * 0.05;

            // Lógica según el estado del flujo
            if (this.currentState === 'parsing') {
                this.particles.rotation.y += 0.02; // Más rápido
            } else if (this.currentState === 'pinn') {
                this.particles.rotation.y += 0.05; // Locura neuronal
                this.particles.rotation.x += 0.02;
                // Efecto de pulso en scale
                const scale = 1 + Math.sin(this.time * 5) * 0.2;
                this.particles.scale.set(scale, scale, scale);
            } else if (this.currentState === 'qaoa') {
                this.particles.scale.set(1, 1, 1);
                this.particles.rotation.y += 0.1; // Cierre a hipervelocidad
                this.particles.rotation.z += 0.05;
            } else if (this.currentState === 'success') {
                this.particles.rotation.y = this.time * 0.02; // Vuelve a lento, colores dorados tal vez (lógica a añadir)
            }
        }

        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        if (!this.container) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
}
