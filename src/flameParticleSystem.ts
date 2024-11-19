import * as THREE from 'three';

export class FlameParticleSystem {
  private scene: THREE.Scene;
  private particles: THREE.Points;
  public getParticles(): THREE.Points {
    return this.particles;
  }
  private particleGeometry: THREE.BufferGeometry;
  private positions: Float32Array;
  private velocities: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private lifespans: Float32Array;
  private maxParticles: number;

  constructor(scene: THREE.Scene, maxParticles: number = 500) {
    this.scene = scene;
    this.maxParticles = maxParticles;

    // Initialize arrays with more comprehensive data
    this.positions = new Float32Array(maxParticles * 3);
    this.velocities = new Float32Array(maxParticles * 3);
    this.colors = new Float32Array(maxParticles * 3);
    this.sizes = new Float32Array(maxParticles);
    this.lifespans = new Float32Array(maxParticles);

    // Create advanced particle texture
    const texture = this.createAdvancedParticleTexture();

    // Create geometry with multiple attributes
    this.particleGeometry = new THREE.BufferGeometry();
    this.initializeParticles();

    // Create material with enhanced rendering
    const material = new THREE.PointsMaterial({
      size: 0.5,
      map: texture,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      vertexColors: true,
      sizeAttenuation: true
    });

    // Create particle system with improved performance
    this.particles = new THREE.Points(this.particleGeometry, material);
    this.particles.frustumCulled = false;
    this.particles.visible = false;
    
    // Add to scene with optional optimization
    this.scene.add(this.particles);
  }

  private createAdvancedParticleTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128; // Increased resolution
    const ctx = canvas.getContext('2d')!;

    // More complex flame gradient
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255, 150, 0, 1)');     // Bright yellow-orange core
    gradient.addColorStop(0.3, 'rgba(255, 100, 0, 0.8)'); // Orange mid-section
    gradient.addColorStop(0.6, 'rgba(255, 50, 0, 0.5)');  // Dark orange edges
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');         // Transparent outer edge

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(64, 64, 64, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private initializeParticles(): void {
    for (let i = 0; i < this.maxParticles; i++) {
      const i3 = i * 3;
      
      // Enhanced particle initialization
      this.positions[i3] = (Math.random() - 0.5) * 0.3;     // Wider spread
      this.positions[i3 + 1] = Math.random() * -0.5;        // Downward initial position
      this.positions[i3 + 2] = (Math.random() - 0.5) * 0.3; // Wider spread

      // Dynamic velocity with more variation
      this.velocities[i3] = (Math.random() - 0.5) * 0.2;
      this.velocities[i3 + 1] = -2 - Math.random() * 1.5;  // More varied upward velocity
      this.velocities[i3 + 2] = (Math.random() - 0.5) * 0.2;

      // Color dynamics
      this.colors[i3] = 1;     // Red component
      this.colors[i3 + 1] = 0.5 + Math.random() * 0.5; // Variable green
      this.colors[i3 + 2] = 0; // Blue component

      // Dynamic particle sizes
      this.sizes[i] = 0.3 + Math.random() * 0.4;

      // Randomized lifespan with more variation
      this.lifespans[i] = 0.5 + Math.random();
    }

    // Set multiple attributes for more complex rendering
    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.particleGeometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
  }

  public update(deltaTime: number, rocketPosition: THREE.Vector3): void {
    if (!this.particles.visible) return;

    const positions = this.particleGeometry.attributes.position.array as Float32Array;
    const colors = this.particleGeometry.attributes.color.array as Float32Array;
    const sizes = this.particleGeometry.attributes.size.array as Float32Array;

    for (let i = 0; i < this.maxParticles; i++) {
      const i3 = i * 3;

      // Advanced particle physics
      positions[i3] += this.velocities[i3] * deltaTime;
      positions[i3 + 1] += this.velocities[i3 + 1] * deltaTime;
      positions[i3 + 2] += this.velocities[i3 + 2] * deltaTime;

      // Gravity and wind effects
      this.velocities[i3 + 1] += deltaTime * 3;  // Enhanced gravity
      this.velocities[i3] += (Math.random() - 0.5) * 0.2; // Wind variation

      // Color and size dynamics
      colors[i3 + 1] -= deltaTime; // Fade green component
      sizes[i] -= deltaTime * 0.5; // Shrink particle

      // Lifespan management
      this.lifespans[i] -= deltaTime;

      // Particle reset
      if (this.lifespans[i] <= 0) {
        this.resetParticle(i);
      }
    }

    // Update geometry attributes
    this.particleGeometry.attributes.position.needsUpdate = true;
    this.particleGeometry.attributes.color.needsUpdate = true;
    this.particleGeometry.attributes.size.needsUpdate = true;

    // Update particle system position
    this.particles.position.copy(rocketPosition);
  }

  private resetParticle(index: number): void {
    const i3 = index * 3;

    // Reinitialize particle properties
    this.positions[i3] = (Math.random() - 0.5) * 0.3;
    this.positions[i3 + 1] = 0;
    this.positions[i3 + 2] = (Math.random() - 0.5) * 0.3;

    this.velocities[i3] = (Math.random() - 0.5) * 0.2;
    this.velocities[i3 + 1] = -2 - Math.random();
    this.velocities[i3 + 2] = (Math.random() - 0.5) * 0.2;

    this.colors[i3] = 1;
    this.colors[i3 + 1] = 0.5 + Math.random() * 0.5;
    this.colors[i3 + 2] = 0;

    this.sizes[index] = 0.3 + Math.random() * 0.4;
    this.lifespans[index] = 0.5 + Math.random();
  }

  public start(): void {
    console.log('Starting advanced flame particles');
    this.particles.visible = true;
  }

  public stop(): void {
    console.log('Stopping advanced flame particles');
    this.particles.visible = false;
  }
}