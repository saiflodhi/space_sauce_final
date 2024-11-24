import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { FlameParticleSystem } from './flameParticleSystem';
import { SpaceshipAnimation } from './spaceshipAnimation';

// Constants
const STAR_COUNT = 10000;
const ANIMATION_DURATION = 3000;

class SpaceScene {
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly composer: EffectComposer;
  private readonly controls: OrbitControls;
  private readonly warpTunnel: THREE.Mesh;
  private readonly raycaster: THREE.Raycaster;
  private readonly mouse: THREE.Vector2;

  private spaceship: THREE.Object3D | null = null;
  private spaceStation: THREE.Object3D | null = null;
  private flameParticleSystem: FlameParticleSystem | null = null;

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.composer = this.createComposer();
    this.controls = this.createControls();
    this.warpTunnel = this.createWarpTunnel();
    
    // Raycaster setup
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.setupLights();
    this.setupStars();
    this.loadModels();
    this.setupEventListeners();
    this.animate();
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      75, 
      window.innerWidth / window.innerHeight, 
      0.1, 
      1000
    );
    camera.position.set(0,0, 200);
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      powerPreference: 'high-performance' 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.body.appendChild(renderer.domElement);
    return renderer;
  }

  private createComposer(): EffectComposer {
    const composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight), 
      1.0, 
      0.4, 
      0.85
    );
    
    composer.addPass(renderPass);
    composer.addPass(bloomPass);
    
    return composer;
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 200;
    controls.minDistance = 10;
    return controls;
  }

  private setupLights(): void {
    const lights = [
      new THREE.AmbientLight(0xffffff, 0.5),
      new THREE.DirectionalLight(0xffffff, 1),
      new THREE.DirectionalLight(0xffffff, 1.5),
      new THREE.DirectionalLight(0x0066ff, 0.7)
    ];

    lights[1].position.set(5, 10, 7.5);
    lights[2].position.set(0, 10, 20);
    lights[3].position.set(-10, 5, -10);

    lights.forEach(light => this.scene.add(light));
  }

  private setupStars(): void {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(STAR_COUNT * 3);
    const colors = new Float32Array(STAR_COUNT * 3);

    for (let i = 0; i < STAR_COUNT; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 2000;
      positions[i3 + 1] = (Math.random() - 0.5) * 2000;
      positions[i3 + 2] = (Math.random() - 0.5) * 2000;

      const color = new THREE.Color();
      color.setHSL(Math.random(), 0.2, 0.8);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const stars = new THREE.Points(geometry, material);
    this.scene.add(stars);
  }

  private createWarpTunnel(): THREE.Mesh {
    const geometry = new THREE.CylinderGeometry(20, 1, 100, 50, 50, true);
    const material = new THREE.ShaderMaterial({
      uniforms: { 
        time: { value: 0 }, 
        active: { value: 0 } 
      },
      vertexShader: `
        varying vec2 vUv;
        varying float vDistance;
        uniform float time;
        uniform float active;
        
        void main() {
          vUv = uv;
          vec3 pos = position;
          
          // Add wave effect when active
          float wave = sin(pos.z * 0.1 + time * 5.0) * active;
          pos.x += wave * 2.0;
          pos.y += wave * 2.0;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          vDistance = -mvPosition.z;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        varying float vDistance;
        uniform float time;
        uniform float active;
        
        void main() {
          vec3 baseColor = vec3(0.1, 0.3, 1.0);
          float opacity = smoothstep(0.0, 100.0, vDistance) * active;
          float stripe = sin(vUv.y * 50.0 + time * 2.0) * 0.5 + 0.5;
          vec3 color = baseColor + vec3(stripe * 0.2);
          
          // Add energy pulse effect
          float pulse = sin(time * 3.0) * 0.5 + 0.5;
          color += vec3(0.1, 0.2, 0.3) * pulse * active;
          
          gl_FragColor = vec4(color, opacity * 0.5);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = Math.PI / 2;
    mesh.visible = false;
    this.scene.add(mesh);
    return mesh;
  }

  
// Inside your loadModels method
private spaceshipAnimation: SpaceshipAnimation | null = null;

  private loadModels(): void {
    const loader = new GLTFLoader();

    // Load spaceship
    loader.load(
      '/models/thor.glb', 
      (gltf) => {
        this.spaceship = gltf.scene;
        this.spaceship.position.set(0,-40, 60);
        this.spaceship.scale.set(25, 25, 30);
        this.scene.add(this.spaceship);
        
        // Create flame particle system
        this.flameParticleSystem = new FlameParticleSystem(this.scene);

        // Create SpaceshipAnimation
      this.spaceshipAnimation = new SpaceshipAnimation(
        this.spaceship,
        this.camera,
        this.composer,
        this.warpTunnel,
        this.controls,
        this.flameParticleSystem
      );
      },
      undefined, 
      (error) => console.error('Error loading spaceship:', error)
    );

    // Load space station
    loader.load(
      '/models/spacesation.glb', 
      (gltf) => {
        this.spaceStation = gltf.scene;
        this.spaceStation.position.set(0, -40, -50);
        this.spaceStation.scale.set(30, 20, 15);
        this.scene.add(this.spaceStation);
      },
      undefined, 
      (error) => console.error('Error loading space station:', error)
    );
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));
    window.addEventListener('click', this.onSpaceshipClick.bind(this));
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  private onSpaceshipClick(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
  
    if (this.spaceship && this.spaceshipAnimation) {
      const intersects = this.raycaster.intersectObject(this.spaceship, true);
      if (intersects.length > 0) {
        this.spaceshipAnimation.startAnimation();
      }
    }
  }
  
  private animateSpaceship(): void {
    if (!this.spaceship || !this.flameParticleSystem) return;

    const startPosition = this.spaceship.position.clone();
    const targetPosition = new THREE.Vector3(0, 0, -200);
    const startTime = performance.now();

    this.controls.enabled = false;
    this.flameParticleSystem.start();
    this.warpTunnel.visible = true;
    this.warpTunnel.position.copy(this.spaceship.position);

    const animate = () => {
      const currentTime = performance.now();
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / ANIMATION_DURATION, 1);

      // Easing function
      const eased = 1 - Math.pow(1 - progress, 4);

      // Update spaceship position
      this.spaceship!.position.lerpVectors(startPosition, targetPosition, eased);

      // Rotation effects
      this.spaceship!.rotation.z = Math.sin(progress * Math.PI * 2) * 0.1;
      this.spaceship!.rotation.x = Math.sin(progress * Math.PI) * 0.05;

      // Update warp tunnel
      const warpMaterial = this.warpTunnel.material as THREE.ShaderMaterial;
      warpMaterial.uniforms.time.value = elapsed * 0.001;
      warpMaterial.uniforms.active.value = Math.min(progress * 2, 1);
      
      this.warpTunnel.position.copy(this.spaceship!.position);
      this.warpTunnel.scale.setScalar(1 + progress * 0.5);

      // Camera movement
      this.camera.position.z = 100 - progress * 50;
      this.camera.position.y = Math.sin(progress * Math.PI) * 10;
      this.camera.lookAt(this.spaceship!.position);

      // Bloom intensity
      const bloomPass = this.composer.passes[1] as UnrealBloomPass;
      bloomPass.strength = 1 + progress * 2;

      if (progress < 1) {
        this.flameParticleSystem!.update(1/60, this.spaceship!.position);
        this.composer.render();
        requestAnimationFrame(animate);
      } else {
        this.completeAnimation();
      }
    };

    requestAnimationFrame(animate);
  }

  private completeAnimation(): void {
    if (!this.flameParticleSystem) return;

    this.flameParticleSystem.stop();
    this.warpTunnel.visible = false;
    this.controls.enabled = true;
    this.fadeOutAndTransition();
  }

  private fadeOutAndTransition(): void {
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundColor: 'black',
      opacity: '0',
      transition: 'opacity 1s',
      zIndex: '1000'
    });
    
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      setTimeout(() => {
        window.location.href = 'scene2.html';
      }, 1000);
    });
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    // Update controls
    this.controls.update();

    // Update flame particles
    if (this.flameParticleSystem && this.spaceship) {
      this.flameParticleSystem.update(1/60, this.spaceship.position);
    }

    // Update warp tunnel shader
    if (this.warpTunnel.visible) {
      const material = this.warpTunnel.material as THREE.ShaderMaterial;
      material.uniforms.time.value += 1/60;
    }

    // Render with post-processing
    this.composer.render();
  }
}

// Initialize the scene
const spaceScene = new SpaceScene();

