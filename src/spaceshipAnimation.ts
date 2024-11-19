import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { FlameParticleSystem } from './flameParticleSystem';

type AnimationStage = 'idle' | 'flame-buildup' | 'launching' | 'completed';

export class SpaceshipAnimation {
  private static readonly LAUNCH_DURATION = 4000;
  private static readonly FLAME_BUILDUP_DURATION = 1500;
  private static readonly LAUNCH_HEIGHT = 500;

  private animationState = {
    isAnimating: false,
    stage: 'idle' as AnimationStage,
    startTime: 0,
    startPosition: new THREE.Vector3(),
    targetPosition: new THREE.Vector3()
  };

  private rotationParams = {
    roll: { speed: 2.5, amplitude: 0.15 },
    pitch: { speed: 1.8, amplitude: 0.08 },
    yaw: { speed: 1.2, amplitude: 0.12 }
  };

  private rafId: number | null = null;

  constructor(
    private spaceship: THREE.Object3D,
    private camera: THREE.PerspectiveCamera,
    private composer: EffectComposer,
    private warpTunnel: THREE.Mesh,
    private controls: OrbitControls,
    private flameParticleSystem: FlameParticleSystem,
    private onComplete?: () => void
  ) {}

  public startAnimation(): void {
    if (this.animationState.isAnimating) return;

    this.initializeAnimation();
    this.animate();
  }

  private initializeAnimation(): void {
    this.animationState.isAnimating = true;
    this.animationState.stage = 'flame-buildup';
    this.animationState.startTime = performance.now();
    this.animationState.startPosition = this.spaceship.position.clone();

    const randomOffset = new THREE.Vector3(
      (Math.random() - 0.5) * 10, 
      0, 
      (Math.random() - 0.5) * 10
    );

    this.animationState.targetPosition = new THREE.Vector3(
      this.spaceship.position.x,
      this.spaceship.position.y + SpaceshipAnimation.LAUNCH_HEIGHT,
      this.spaceship.position.z - 100
    ).add(randomOffset);

    this.controls.enabled = false;
    this.warpTunnel.visible = true;
    this.warpTunnel.position.copy(this.spaceship.position);
    this.flameParticleSystem.start();
  }

  private animate(currentTime: number = performance.now()): void {
    if (!this.animationState.isAnimating) return;

    const elapsed = currentTime - this.animationState.startTime;

    switch (this.animationState.stage) {
      case 'flame-buildup':
        this.handleFlameBuildup(elapsed);
        break;
      case 'launching':
        this.handleLaunching(elapsed);
        break;
    }

    this.composer.render();
    this.rafId = requestAnimationFrame((time) => this.animate(time));
  }

  private handleFlameBuildup(elapsed: number): void {
    const progress = Math.min(elapsed / SpaceshipAnimation.FLAME_BUILDUP_DURATION, 1);
    this.applyComplexRotation(progress);

    if (progress >= 1) {
      this.animationState.stage = 'launching';
      this.animationState.startTime = performance.now();
    }
  }

  private handleLaunching(elapsed: number): void {
    const progress = Math.min(elapsed / SpaceshipAnimation.LAUNCH_DURATION, 1);
    const eased = this.customEase(progress);

    this.spaceship.position.lerpVectors(
      this.animationState.startPosition, 
      this.animationState.targetPosition, 
      eased
    );

    this.applyAdvancedRotation(progress);
    this.updateWarpTunnel(elapsed, progress);
    this.updateCameraAnimation(progress);
    this.updateEffects(progress);

    if (progress >= 1) {
      this.completeAnimation();
    }
  }

  private applyComplexRotation(progress: number): void {
    const oscillation = Math.sin(progress * Math.PI * 2);
    const damping = 1 - progress;

    this.spaceship.rotation.x = oscillation * this.rotationParams.pitch.amplitude * damping;
    this.spaceship.rotation.y = oscillation * this.rotationParams.yaw.amplitude * damping;
    this.spaceship.rotation.z = oscillation * this.rotationParams.roll.amplitude * damping;
  }

  private applyAdvancedRotation(progress: number): void {
    const time = performance.now() * 0.001;
    const damping = Math.sin(progress * Math.PI * 0.5);

    Object.entries(this.rotationParams).forEach(([axis, params]) => {
      const value = Math.sin(time * params.speed) * params.amplitude * damping;
      this.spaceship.rotation[axis as 'x' | 'y' | 'z'] = value;
    });
  }

  private updateWarpTunnel(elapsed: number, progress: number): void {
    const warpMaterial = this.warpTunnel.material as THREE.ShaderMaterial;
    warpMaterial.uniforms.time.value = elapsed * 0.001;
    warpMaterial.uniforms.active.value = Math.min(progress * 2, 1);
    
    this.warpTunnel.position.copy(this.spaceship.position);
    this.warpTunnel.scale.setScalar(1 + progress * 0.5);
  }

  private updateCameraAnimation(progress: number): void {
    const eased = this.customEase(progress);
    const cameraOffsetY = 50 * eased;
    const cameraOffsetZ = 100 - eased * 75;

    this.camera.position.lerp(
      new THREE.Vector3(
        this.spaceship.position.x,
        this.spaceship.position.y + cameraOffsetY,
        this.spaceship.position.z + cameraOffsetZ
      ),
      0.1
    );
    this.camera.lookAt(this.spaceship.position);
  }

  private updateEffects(progress: number): void {
    const bloomPass = this.composer.passes[1] as UnrealBloomPass;
    bloomPass.strength = 1 + progress * 3;
  }

  private completeAnimation(): void {
    this.cleanup();
    this.fadeOutAndTransition();
  }

  private cleanup(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.flameParticleSystem.stop();
    this.warpTunnel.visible = false;
    this.controls.enabled = true;
    this.animationState.isAnimating = false;
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
      transition: 'opacity 1s ease-in-out',
      zIndex: '1000'
    });

    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      setTimeout(() => {
        window.location.href = '/scene2.html';
      }, 1000);
    });
  }

  private customEase(t: number): number {
    return t < 0.5 
      ? 4 * t * t * t 
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
}