import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { addPlanets, showPlanetInfo, hidePlanetInfo, setupExploreButton } from './dynamicPlanets';
import { FlameParticleSystem } from './flameParticleSystem';

// DOM Elements and Raycaster
const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Scene Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 350, 700);
camera.lookAt(new THREE.Vector3(0, 0, 0));
scene.add(camera);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ReinhardToneMapping;
renderer.toneMappingExposure = 1;

// Post-Processing
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5,
    0.4,
    0.85
);
composer.addPass(renderPass);
composer.addPass(bloomPass);

// Lighting
const ambientLight = new THREE.AmbientLight(0x222222, 6);
scene.add(ambientLight);
const pointLight = new THREE.PointLight(0xFDFFD3, 1200, 400, 1.4);
scene.add(pointLight);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.15;
controls.enableZoom = true;
controls.enablePan = true;
controls.minPolarAngle = Math.PI / 6;
controls.maxPolarAngle = Math.PI / 2;
controls.minDistance = 50;
controls.maxDistance = 200;

// Model and Objects
let spaceship: THREE.Object3D | null = null;
let pivot: THREE.Object3D | null = null;
let isPlanetInfoVisible = false;
const planets: THREE.Object3D[] = [];
let flameParticles: FlameParticleSystem;
const clock = new THREE.Clock();

// Initialize FlameParticleSystem
flameParticles = new FlameParticleSystem(scene);

// Load Spaceship Model
const loader = new GLTFLoader();
loader.load(
    '/models/thor.glb',
    (gltf) => {
        spaceship = gltf.scene;
        spaceship.position.set(0, 0, 50);
        spaceship.scale.set(16, 16, 16);
        scene.add(spaceship);
        console.log('Spaceship loaded successfully');

        // Disable frustum culling for the spaceship and its children
        spaceship.traverse((object) => {
            object.frustumCulled = false;
        });

        // Add engine glow
        const engineGlow = new THREE.PointLight(0x00ffff, 2, 10);
        engineGlow.position.set(0, -5, -5);
        spaceship.add(engineGlow);

        // Start flame particles
        flameParticles.start();
    },
    undefined,
    (error) => {
        console.error('Error loading spaceship model:', error);
    }
);

// Sun Setup
const sunSize = 30;
const sunGeom = new THREE.SphereGeometry(sunSize, 32, 20);
const sunMat = new THREE.MeshStandardMaterial({
    emissive: 0xFFF88F,
    emissiveMap: new THREE.TextureLoader().load('/models/sun.jpg'),
    emissiveIntensity: 2
});
const sun = new THREE.Mesh(sunGeom, sunMat);
scene.add(sun);

// Create Pivot for Planet Orbit
pivot = new THREE.Object3D();
scene.add(pivot);

// Add Planets
addPlanets(scene, pivot, planets);

// Create Stars
function createStars(count: number) {
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.PointsMaterial({
        color: 0x888888,
        size: 0.5,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const starVertices = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = (Math.random() - 0.5) * 2000;
        const z = (Math.random() - 0.5) * 2000;
        starVertices.set([x, y, z], i * 3);
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(starVertices, 3));
    return { points: new THREE.Points(geometry, material), geometry };
}

const { points: stars, geometry: starsGeometry } = createStars(10000);
scene.add(stars);

// Event Listeners
function setupEventListeners() {
    window.addEventListener('mousemove', onMouseMove, false);
    window.addEventListener('click', onClick, false);
    window.addEventListener('resize', onWindowResize, false);
    setupExploreButton();

    const closeButton = document.querySelector('.close-btn') as HTMLElement;
    if (closeButton) {
        closeButton.addEventListener('click', () => hidePlanetInfo(controls), false);
    } else {
        console.error("Close button not found in the DOM.");
    }

    // Flame particle toggle
// Flame particle toggle
window.addEventListener('keydown', (event) => {
  if (event.key === 'f' || event.key === 'F') {
    if (flameParticles.getParticles().visible) {
      flameParticles.stop();
    } else {
      flameParticles.start();
    }
  }
});
}

let lastMousePosition = new THREE.Vector2();
const spaceshipTargetPosition = new THREE.Vector3();
const spaceshipTargetRotation = new THREE.Euler();

function onMouseMove(event: MouseEvent) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    if (!mouse.equals(lastMousePosition)) {
        updateSpaceshipTarget();
        lastMousePosition.copy(mouse);
    }
}

const spaceshipPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -10);
const planeIntersectPoint = new THREE.Vector3();

function updateSpaceshipTarget() {
    if (spaceship) {
        const ray = new THREE.Ray();
        ray.origin.setFromMatrixPosition(camera.matrixWorld);
        ray.direction.set(mouse.x, mouse.y, 0.5).unproject(camera).sub(ray.origin).normalize();
        if (ray.intersectPlane(spaceshipPlane, planeIntersectPoint)) {
            spaceshipTargetPosition.copy(planeIntersectPoint);
            // Calculate target rotation
            const direction = new THREE.Vector3().subVectors(spaceshipTargetPosition, spaceship.position).normalize();
            spaceshipTargetRotation.setFromRotationMatrix(
                new THREE.Matrix4().lookAt(spaceship.position, spaceshipTargetPosition, new THREE.Vector3(0, 1, 0))
            );
        }
    }
}

const initialScale = new THREE.Vector3(16, 16, 16);
const baseDistance = 100;

function updateSpaceshipSize() {
    if (spaceship) {
        const distance = camera.position.distanceTo(spaceship.position);
        const scale = Math.max(0.5, Math.min(2, distance / baseDistance));
        spaceship.scale.copy(initialScale).multiplyScalar(scale);
    }
}

function updateSpaceship() {
    if (spaceship) {
        spaceship.position.lerp(spaceshipTargetPosition, 0.05);
        spaceship.quaternion.slerp(new THREE.Quaternion().setFromEuler(spaceshipTargetRotation), 0.05);

        // Add boundaries
        const maxX = 300;
        const maxY = 350;
        const maxZ = 350;
        spaceship.position.x = THREE.MathUtils.clamp(spaceship.position.x, -maxX, maxX);
        spaceship.position.y = THREE.MathUtils.clamp(spaceship.position.y, -maxY, maxY);
        spaceship.position.z = THREE.MathUtils.clamp(spaceship.position.z, -maxZ, maxZ);

        // Add slight oscillation
        spaceship.position.y += Math.sin(Date.now() * 0.003) * 0.1;
    }
}

function onClick(event: MouseEvent) {
  event.preventDefault();
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(planets, true);
  if (intersects.length > 0) {
      const clickedPlanet = identifyPlanet(intersects[0].object);
      if (clickedPlanet && pivot) {  // Add null check for pivot
          const planetName = clickedPlanet.name;
          if (isPlanetInfoVisible) {
              hidePlanetInfo(controls);
          } else {
              showPlanetInfo(planetName, camera, controls, planets, pivot);
          }
          isPlanetInfoVisible = !isPlanetInfoVisible;
      }
  } else if (isPlanetInfoVisible) {
      hidePlanetInfo(controls);
      isPlanetInfoVisible = false;
  }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}

// Helper Functions
function identifyPlanet(clickedObject: THREE.Object3D): THREE.Object3D | null {
    let current: THREE.Object3D | null = clickedObject;
    while (current) {
        if (planets.includes(current)) {
            return current;
        }
        current = current.parent;
    }
    return null;
}

function updateStars() {
    const positions = starsGeometry.attributes.position.array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
        positions[i] -= 0.1;
        if (positions[i] < -1000) {
            positions[i] = 1000;
        }
    }
    starsGeometry.attributes.position.needsUpdate = true;
}

// Animation Loop
function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();
    controls.update();

    if (pivot && !isPlanetInfoVisible) {
        pivot.rotation.y += 0.001;
    }

    if (!isPlanetInfoVisible) {
        planets.forEach(planet => {
            planet.rotation.y += 0.003;
        });
    }

    updateSpaceship();
    updateSpaceshipSize();

    // Update flame particles
    if (spaceship) {
        const flamePosition = new THREE.Vector3();
        spaceship.getWorldPosition(flamePosition);
        flamePosition.y -= 5; // Adjust this value to position the flames correctly
        flameParticles.update(deltaTime, flamePosition);
    }

    updateStars();
    composer.render();
}

// Initialize
function init() {
    setupEventListeners();
    animate();
}

init();