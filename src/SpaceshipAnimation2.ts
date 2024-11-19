import * as THREE from 'three';

interface AnimationPath {
    points: THREE.Vector3[];
    controlPoints?: THREE.Vector3[];
}

export class SpaceshipAnimation {
    private spaceship: THREE.Object3D;
    private targetPosition: THREE.Vector3;
    private targetRotation: THREE.Quaternion;
    private isAnimating: boolean;
    private animationDuration: number;
    private animationStartTime: number;
    private initialPosition: THREE.Vector3;
    private initialRotation: THREE.Quaternion;
    private engineParticles: THREE.Points;
    private curve: THREE.CatmullRomCurve3;
    private thrusterLight: THREE.PointLight;
    private warpEffect: THREE.Mesh;
    private animationState: 'idle' | 'preparing' | 'warping' | 'arriving';
    
    constructor(spaceship: THREE.Object3D, scene: THREE.Scene) {
        this.spaceship = spaceship;
        this.targetPosition = new THREE.Vector3();
        this.targetRotation = new THREE.Quaternion();
        this.isAnimating = false;
        this.animationDuration = 2000;
        this.animationStartTime = 0;
        this.initialPosition = new THREE.Vector3();
        this.initialRotation = new THREE.Quaternion();
        this.animationState = 'idle';
        
        // Initialize particle system for engine effects
        this.engineParticles = this.createEngineParticles();
        scene.add(this.engineParticles);
        
        // Add thruster light
        this.thrusterLight = new THREE.PointLight(0x00ffff, 2, 10);
        this.spaceship.add(this.thrusterLight);
        
        // Create warp effect mesh
        this.warpEffect = this.createWarpEffect();
        scene.add(this.warpEffect);
    }
    
    private createEngineParticles(): THREE.Points {
        const particleCount = 1000;
        const particles = new Float32Array(particleCount * 3);
        const geometry = new THREE.BufferGeometry();
        const material = new THREE.PointsMaterial({
            size: 0.05,
            color: 0x00ffff,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        for (let i = 0; i < particleCount; i++) {
            particles[i * 3] = (Math.random() - 0.5) * 0.5;
            particles[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
            particles[i * 3 + 2] = (Math.random() - 0.5) * 2;
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(particles, 3));
        return new THREE.Points(geometry, material);
    }
    
    private createWarpEffect(): THREE.Mesh {
        const geometry = new THREE.CylinderGeometry(0.5, 0.5, 4, 32, 1, true);
        const material = new THREE.ShaderMaterial({
            transparent: true,
            uniforms: {
                time: { value: 0 },
                intensity: { value: 0 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform float intensity;
                varying vec2 vUv;
                void main() {
                    float stripe = sin(vUv.x * 50.0 + time * 2.0) * 0.5 + 0.5;
                    vec3 color = vec3(0.0, 1.0, 1.0);
                    gl_FragColor = vec4(color, stripe * intensity);
                }
            `
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.visible = false;
        return mesh;
    }
    
    startAnimation(targetPlanet: THREE.Object3D) {
        this.isAnimating = true;
        this.animationStartTime = Date.now();
        this.animationState = 'preparing';
        
        // Generate a curved path to the target
        this.generatePath(targetPlanet);
        
        // Store initial states
        this.initialPosition.copy(this.spaceship.position);
        this.initialRotation.copy(this.spaceship.quaternion);
        
        // Show warp effect
        this.warpEffect.visible = true;
    }
    
    private generatePath(targetPlanet: THREE.Object3D): void {
        const start = this.spaceship.position.clone();
        const end = targetPlanet.position.clone();
        const distance = start.distanceTo(end);
        
        // Generate control points for a more interesting path
        const midPoint = new THREE.Vector3().lerpVectors(start, end, 0.5);
        const upOffset = new THREE.Vector3(0, distance * 0.2, 0);
        midPoint.add(upOffset);
        
        // Create a curved path
        const points = [
            start,
            midPoint,
            end
        ];
        
        this.curve = new THREE.CatmullRomCurve3(points);
    }
    
    update() {
        if (!this.isAnimating) return;
        
        const currentTime = Date.now();
        const elapsedTime = currentTime - this.animationStartTime;
        const progress = Math.min(elapsedTime / this.animationDuration, 1);
        
        // Update animation based on current state
        switch (this.animationState) {
            case 'preparing':
                this.updatePreparingPhase(progress);
                break;
            case 'warping':
                this.updateWarpingPhase(progress);
                break;
            case 'arriving':
                this.updateArrivingPhase(progress);
                break;
        }
        
        // Update engine particles
        this.updateEngineParticles(currentTime);
        
        // Update warp effect
        this.updateWarpEffect(currentTime, progress);
        
        if (progress >= 1) {
            this.completeAnimation();
        }
    }
    
    private updatePreparingPhase(progress: number) {
        if (progress < 0.2) {
            // Power up phase
            const powerupProgress = progress / 0.2;
            this.thrusterLight.intensity = powerupProgress * 5;
            
            // Add slight shake
            this.spaceship.position.x += Math.sin(Date.now() * 0.1) * 0.01;
        } else {
            this.animationState = 'warping';
        }
    }
    
    private updateWarpingPhase(progress: number) {
        const normalizedProgress = (progress - 0.2) / 0.6; // Main flight phase
        
        if (normalizedProgress <= 1) {
            // Follow the curved path
            const point = this.curve.getPoint(this.easeInOutCubic(normalizedProgress));
            this.spaceship.position.copy(point);
            
            // Calculate and set rotation to follow path tangent
            const tangent = this.curve.getTangent(normalizedProgress);
            const lookAtMatrix = new THREE.Matrix4().lookAt(
                point,
                point.clone().add(tangent),
                new THREE.Vector3(0, 1, 0)
            );
            this.spaceship.quaternion.setFromRotationMatrix(lookAtMatrix);
        }
        
        if (progress > 0.8) {
            this.animationState = 'arriving';
        }
    }
    
    private updateArrivingPhase(progress: number) {
        // Slow down and stabilize
        const decelerationProgress = (progress - 0.8) / 0.2;
        this.thrusterLight.intensity = (1 - decelerationProgress) * 5;
    }
    
    private updateEngineParticles(currentTime: number) {
        const positions = this.engineParticles.geometry.attributes.position.array as Float32Array;
        
        for (let i = 0; i < positions.length; i += 3) {
            positions[i + 2] -= 0.1; // Move particles backward
            
            // Reset particles that have moved too far back
            if (positions[i + 2] < -2) {
                positions[i] = (Math.random() - 0.5) * 0.5;
                positions[i + 1] = (Math.random() - 0.5) * 0.5;
                positions[i + 2] = 2;
            }
        }
        
        this.engineParticles.geometry.attributes.position.needsUpdate = true;
        this.engineParticles.position.copy(this.spaceship.position);
        this.engineParticles.quaternion.copy(this.spaceship.quaternion);
    }
    
    private updateWarpEffect(currentTime: number, progress: number) {
        const material = this.warpEffect.material as THREE.ShaderMaterial;
        material.uniforms.time.value = currentTime * 0.001;
        material.uniforms.intensity.value = this.animationState === 'warping' ? 1.0 : 0.0;
        
        this.warpEffect.position.copy(this.spaceship.position);
        this.warpEffect.quaternion.copy(this.spaceship.quaternion);
    }
    
    private completeAnimation() {
        this.isAnimating = false;
        this.animationState = 'idle';
        this.warpEffect.visible = false;
        this.thrusterLight.intensity = 0;
    }
    
    private easeInOutCubic(t: number): number {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
}