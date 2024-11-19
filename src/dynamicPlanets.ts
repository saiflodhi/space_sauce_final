import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import gsap from 'gsap';

// Planet Data Interface
interface PlanetData {
  logo: string;
  name: string;
  radius: string;
  tilt: string;
  rotation: string;
  orbit: string;
  distance: string;
  moons: string;
  description: string;
  rotationSpeed: number;
  zoomDistance: number;
}

// Planet Data
const planetData: { [key: string]: PlanetData } = {
  earth: {
    logo: "/bubbleseed_logo.png",
    name: "Earth",
    radius: "6,371 km",
    tilt: "23.5°",
    rotation: "24 hours",
    orbit: "365.25 days",
    distance: "149.6 million km",
    moons: "1",
    description: "Our home planet, the only known planet to harbor life.",
    rotationSpeed: 0.001,
    zoomDistance: 30
  },
  mars: {
    logo: "/3DSTORE.png",
    name: "Mars",
    radius: "3,389.5 km",
    tilt: "25.2°",
    rotation: "24.6 hours",
    orbit: "687 days",
    distance: "227.9 million km",
    moons: "2",
    description: "The Red Planet, known for its rusty surface and potential for future human exploration.",
    rotationSpeed: 0.0009,
    zoomDistance: 25
  },
  venus: {
    logo: "/Singularspace_logo.png",
    name: "Venus",
    radius: "6,051.8 km",
    tilt: "177.4°",
    rotation: "243 days (retrograde)",
    orbit: "225 days",
    distance: "108.2 million km",
    moons: "0",
    description: "Often called Earth's sister planet due to similar size, but with extreme surface conditions.",
    rotationSpeed: -0.0004,
    zoomDistance: 28
  }
};

// Adding Planets
export function addPlanets(scene: THREE.Scene, pivot: THREE.Object3D, planets: THREE.Object3D[]) {
  const loader = new GLTFLoader();
  const textureLoader = new THREE.TextureLoader();

  loader.load(
    '/models/low_poly_planet/scene.gltf',
    (gltf) => {
      // Earth
      const planet = gltf.scene;
      planet.position.set(100, 0, 0);
      planet.scale.set(15, 15, 15);
      planet.name = 'Earth';
      pivot.add(planet);
      planets.push(planet);

      // Mars
      const marsGeom = new THREE.SphereGeometry(12.5, 64, 64);
      const marsTexture = textureLoader.load('/models/marsmap.jpg');
      const marsBumpMap = textureLoader.load('/models/marsbump.jpg');
      const marsMat = new THREE.MeshStandardMaterial({
        map: marsTexture,
        bumpMap: marsBumpMap,
        bumpScale: 0.5,
        metalness: 0.0,
        roughness: 1.0
      });
      const mars = new THREE.Mesh(marsGeom, marsMat);
      mars.position.set(150, 17, 40);
      mars.name = 'Mars';
      pivot.add(mars);
      planets.push(mars);

      // Venus
      const venusGeom = new THREE.SphereGeometry(12, 64, 64);
      const venusTexture = textureLoader.load('/models/venusmap.jpg');
      const venusBumpMap = textureLoader.load('/models/venusbump.jpg');
      const venusMat = new THREE.MeshStandardMaterial({
        map: venusTexture,
        bumpMap: venusBumpMap,
        bumpScale: 0.5,
        metalness: 0.1,
        roughness: 1.0
      });
      const venus = new THREE.Mesh(venusGeom, venusMat);
      venus.position.set(120, 17, -40);
      venus.name = 'Venus';
      pivot.add(venus);
      planets.push(venus);

      // Add Orbit Rings
      [101.5, 125.5, 150.5].forEach((radius) => {
        const orbitGeometry = new THREE.RingGeometry(radius, radius + 1, 128);
        const orbitMaterial = new THREE.MeshBasicMaterial({
          color: 0x808080,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.2
        });
        const orbitRing = new THREE.Mesh(orbitGeometry, orbitMaterial);
        orbitRing.rotation.x = -Math.PI / 2;
        orbitRing.position.y = 18;
        pivot.add(orbitRing);
      });

      // Add Venus Atmosphere
      const atmosphereGeom = new THREE.SphereGeometry(12.5, 64, 64);
      const atmosphereMap = textureLoader.load('/models/venus_atmosphere.jpg');
      const atmosphereMat = new THREE.MeshBasicMaterial({
        map: atmosphereMap,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.01,
        blending: THREE.AdditiveBlending
      });
      const atmosphereMesh = new THREE.Mesh(atmosphereGeom, atmosphereMat);
      venus.add(atmosphereMesh);
    }
  );
// Add logos to planets
Object.entries(planetData).forEach(([planetName, data]) => {
  const logoTexture = textureLoader.load(data.logo, 
    (texture) => {
      console.log(`Logo loaded successfully for ${planetName}`);
      const logoMaterial = new THREE.SpriteMaterial({ map: texture });
      const logoSprite = new THREE.Sprite(logoMaterial);
      logoSprite.scale.set(20, 20, 1); // Increased size for visibility
      const planet = planets.find(p => p.name.toLowerCase() === planetName);
      if (planet) {
        logoSprite.position.set(0, planet.scale.y * 2, 0); // Adjusted position
        planet.add(logoSprite);
        console.log(`Logo added to ${planetName}`);
      } else {
        console.error(`Planet ${planetName} not found`);
      }
    },
    undefined,
    (error) => {
      console.error(`Error loading logo for ${planetName}:`, error);
    }
  );
});

}

// Show Planet Info
export function showPlanetInfo(
  planetName: string,
  camera: THREE.PerspectiveCamera,
  controls: any,
  planets: THREE.Object3D[],
  pivot: THREE.Object3D
) {
  const logoElem = document.getElementById('planetLogo') as HTMLImageElement;
  const info = document.getElementById('planetInfo');
  const nameElem = document.getElementById('planetName');
  const radiusElem = document.getElementById('planetRadius');
  const tiltElem = document.getElementById('planetTilt');
  const rotationElem = document.getElementById('planetRotation');
  const orbitElem = document.getElementById('planetOrbit');
  const distanceElem = document.getElementById('planetDistance');
  const moonsElem = document.getElementById('planetMoons');
  const descriptionElem = document.getElementById('planetDescription');
  const exploreBtn = document.querySelector('.explore-btn') as HTMLAnchorElement;

  if (!info || !nameElem || !radiusElem || !tiltElem || !rotationElem || !orbitElem || !distanceElem || !moonsElem || !descriptionElem || !exploreBtn || !planets.length || !logoElem) {
    console.error("Required DOM elements are missing.");
    return;
  }

  const planetInfo = planetData[planetName.toLowerCase()];
  if (!planetInfo) {
    console.error(`No data found for planet: ${planetName}`);
    return;
  }

  // Update modal content
  logoElem.src = planetInfo.logo;
  nameElem.textContent = planetInfo.name;
  radiusElem.textContent = planetInfo.radius;
  tiltElem.textContent = planetInfo.tilt;
  rotationElem.textContent = planetInfo.rotation;
  orbitElem.textContent = planetInfo.orbit;
  distanceElem.textContent = planetInfo.distance;
  moonsElem.textContent = planetInfo.moons;
  descriptionElem.textContent = planetInfo.description;

  // Display modal
  info.style.display = 'block';

  // Set explore button link
  const exploreLinks: { [key: string]: string } = {
    Earth: 'https://boatsauce.netlify.app',
    Mars: 'https://storesauce.netlify.app/',
    Venus: 'https://shootersauce.netlify.app'
  };
  exploreBtn.href = exploreLinks[planetName] || 'https://boatsauce.netlify.app';
  exploreBtn.target = '_blank';

  // Apply zoom effect
  const selectedPlanet = planets.find(p => p.name === planetName);
  if (selectedPlanet) {
    const planetPosition = new THREE.Vector3();
    selectedPlanet.getWorldPosition(planetPosition);

    gsap.to(camera.position, {
      x: planetPosition.x,
      y: planetPosition.y + 50,
      z: planetPosition.z + 80,
      duration: 2,
      ease: "power2.out",
      onUpdate: () => {
        camera.lookAt(planetPosition);
      },
      onComplete: () => {
        controls.target.copy(planetPosition);
        controls.update();
        pivot.rotation.y = 0; // Stop orbital rotation
        rotatePlanetAxially(selectedPlanet);
      }
    });
  }
}

// Rotate Planet Axially
function rotatePlanetAxially(planet: THREE.Object3D) {
  function rotate() {
    planet.rotation.y += 0.003;
    requestAnimationFrame(rotate);
  }
  rotate();
}

// Hide Planet Info
export function hidePlanetInfo(controls: any) {
  const info = document.getElementById('planetInfo');
  if (info) {
    info.style.display = 'none';
  }
  controls.reset();
  controls.update();
}

// Explore Button Event Listener
export function setupExploreButton() {
  const exploreButton = document.querySelector('.explore-btn') as HTMLAnchorElement;
  if (exploreButton) {
    exploreButton.addEventListener('click', (event: MouseEvent) => {
      event.preventDefault();
      const exploreLink = exploreButton.getAttribute('href');
      if (exploreLink) {
        window.open(exploreLink, '_blank');
      }
    }, false);
  } else {
    console.error("Explore button not found in the DOM.");
  }
}

