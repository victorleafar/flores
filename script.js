let scene, camera, renderer, controls;
let sunflowerGroup, petalsGroup, centerMesh;
let particlesMesh, pointLight;
let bloomProgress = 0;
let isBlooming = true;

const container = document.getElementById('webgl-container');

function init() {
  // 1. Scene Setup
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0d0b07, 0.035);

  // 2. Camera Setup
  camera = new THREE.PerspectiveCamera(45, getAspect(), 0.1, 1000);
  
  // 3. Renderer Setup
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  container.appendChild(renderer.domElement);

  // 4. Orbit Controls
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxPolarAngle = Math.PI / 1.8;
  controls.minPolarAngle = Math.PI / 4;
  controls.enablePan = false;
  controls.minDistance = 6;
  controls.maxDistance = 14;

  // 5. Lighting
  setupLighting();

  // 6. Build Sunflower & Particles
  buildSunflower();
  buildParticles();

  // 7. Adjust Initial Position & Camera Fit
  updateCameraAndPosition();

  // 8. Event Listeners
  window.addEventListener('resize', onWindowResize);
  document.getElementById('bloom-btn').addEventListener('click', triggerBloomAnimation);
  document.getElementById('light-btn').addEventListener('click', toggleSolarGlow);

  // Hide hint on drag
  controls.addEventListener('start', () => {
    const hint = document.querySelector('.drag-hint');
    if (hint) hint.style.opacity = '0';
  });

  // Animation Loop
  animate();
}

function getAspect() {
  return container.clientWidth / container.clientHeight;
}

function setupLighting() {
  const ambientLight = new THREE.AmbientLight(0xfff5ea, 0.85);
  scene.add(ambientLight);

  const mainLight = new THREE.DirectionalLight(0xfff0cc, 2.2);
  mainLight.position.set(5, 8, 5);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.width = 1024;
  mainLight.shadow.mapSize.height = 1024;
  scene.add(mainLight);

  const fillLight = new THREE.DirectionalLight(0xffa500, 1.0);
  fillLight.position.set(-5, -2, -3);
  scene.add(fillLight);

  pointLight = new THREE.PointLight(0xffd700, 2.5, 12);
  pointLight.position.set(0, 1.2, 2);
  scene.add(pointLight);
}

function buildSunflower() {
  sunflowerGroup = new THREE.Group();

  // --- STEM ---
  const stemCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -5.5, 0),
    new THREE.Vector3(0.15, -3.5, 0.1),
    new THREE.Vector3(-0.1, -1.8, 0),
    new THREE.Vector3(0, 0, 0)
  ]);
  const stemGeo = new THREE.TubeGeometry(stemCurve, 32, 0.15, 12, false);
  const stemMat = new THREE.MeshStandardMaterial({
    color: 0x3d6b1e,
    roughness: 0.6,
    metalness: 0.1
  });
  const stemMesh = new THREE.Mesh(stemGeo, stemMat);
  stemMesh.castShadow = true;
  sunflowerGroup.add(stemMesh);

  // --- LEAVES ---
  createLeaf(sunflowerGroup, new THREE.Vector3(0.08, -2.8, 0.05), 1.1, Math.PI / 5, -Math.PI / 4);
  createLeaf(sunflowerGroup, new THREE.Vector3(-0.05, -3.8, -0.05), 1.3, -Math.PI / 4, Math.PI / 3);

  // --- SUNFLOWER HEAD ---
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0, 0);
  headGroup.rotation.x = Math.PI * 0.18; // Slight tilt towards camera

  // Receptacle (Backing)
  const backGeo = new THREE.ConeGeometry(1.25, 0.6, 32);
  const backMat = new THREE.MeshStandardMaterial({ color: 0x2e4f15, roughness: 0.7 });
  const backMesh = new THREE.Mesh(backGeo, backMat);
  backMesh.rotation.x = -Math.PI / 2;
  backMesh.position.z = -0.28;
  headGroup.add(backMesh);

  // Core Seeds Center (Fibonacci Spiral pattern geometry)
  const centerGeo = new THREE.CylinderGeometry(1.25, 1.2, 0.22, 64);
  const centerMat = new THREE.MeshStandardMaterial({
    color: 0x2b1704,
    roughness: 0.85,
    bumpScale: 0.05
  });
  centerMesh = new THREE.Mesh(centerGeo, centerMat);
  centerMesh.rotation.x = Math.PI / 2;
  headGroup.add(centerMesh);

  // Outer Seed Ring Glow
  const ringGeo = new THREE.RingGeometry(1.05, 1.25, 48);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x6e3d08, side: THREE.DoubleSide });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.position.z = 0.12;
  headGroup.add(ringMesh);

  // --- PETALS ---
  petalsGroup = new THREE.Group();
  petalsGroup.position.z = 0.02;

  const createPetalShape = () => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(0.28, 0.8, 0.22, 1.9);
    shape.quadraticCurveTo(0.12, 2.35, 0, 2.6);
    shape.quadraticCurveTo(-0.12, 2.35, -0.22, 1.9);
    shape.quadraticCurveTo(-0.28, 0.8, 0, 0);
    return shape;
  };

  const petalGeo = new THREE.ExtrudeGeometry(createPetalShape(), {
    depth: 0.03,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.02,
    bevelThickness: 0.02
  });
  petalGeo.center();
  petalGeo.translate(0, 1.3, 0);

  const petalMatInner = new THREE.MeshStandardMaterial({
    color: 0xffcc00,
    roughness: 0.35,
    metalness: 0.05,
    side: THREE.DoubleSide
  });

  const petalMatOuter = new THREE.MeshStandardMaterial({
    color: 0xffb700,
    roughness: 0.4,
    side: THREE.DoubleSide
  });

  // Layer 1 (Inner Petals)
  const countInner = 28;
  for (let i = 0; i < countInner; i++) {
    const angle = (i / countInner) * Math.PI * 2;
    const pMesh = new THREE.Mesh(petalGeo, petalMatInner);
    pMesh.scale.set(0.72, 0.82, 0.72);

    const pivot = new THREE.Group();
    pivot.rotation.z = angle;
    
    pMesh.position.y = 1.05;
    pMesh.userData = {
      baseRotX: 0.18,
      bloomRotX: 0,
      angle: angle,
      layer: 'inner'
    };
    
    pivot.add(pMesh);
    petalsGroup.add(pivot);
  }

  // Layer 2 (Outer Petals)
  const countOuter = 34;
  for (let i = 0; i < countOuter; i++) {
    const angle = ((i + 0.5) / countOuter) * Math.PI * 2;
    const pMesh = new THREE.Mesh(petalGeo, petalMatOuter);
    pMesh.scale.set(0.85, 0.95, 0.85);

    const pivot = new THREE.Group();
    pivot.rotation.z = angle;
    
    pMesh.position.y = 1.15;
    pMesh.userData = {
      baseRotX: 0.32,
      bloomRotX: 0.08,
      angle: angle,
      layer: 'outer'
    };
    
    pivot.add(pMesh);
    petalsGroup.add(pivot);
  }

  headGroup.add(petalsGroup);
  sunflowerGroup.add(headGroup);

  scene.add(sunflowerGroup);
}

function createLeaf(parent, position, scale, rotZ, rotY) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(0.4, 0.5, 0.5, 1.2);
  shape.quadraticCurveTo(0.2, 1.8, 0, 2.2);
  shape.quadraticCurveTo(-0.2, 1.8, -0.5, 1.2);
  shape.quadraticCurveTo(-0.4, 0.5, 0, 0);

  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: true, bevelSize: 0.01 });
  const mat = new THREE.MeshStandardMaterial({ color: 0x335918, roughness: 0.5 });
  const mesh = new THREE.Mesh(geo, mat);

  mesh.position.copy(position);
  mesh.scale.setScalar(scale * 0.6);
  mesh.rotation.z = rotZ;
  mesh.rotation.y = rotY;
  mesh.rotation.x = 0.3;

  parent.add(mesh);
}

function buildParticles() {
  const pCount = 120;
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(pCount * 3);
  const scales = new Float32Array(pCount);

  for (let i = 0; i < pCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 12;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 10 - 1;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 12;
    scales[i] = Math.random() * 0.08 + 0.03;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const pMat = new THREE.PointsMaterial({
    color: 0xffd700,
    size: 0.12,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending
  });

  particlesMesh = new THREE.Points(geo, pMat);
  scene.add(particlesMesh);
}

// Adapts camera distance & sunflower vertical center according to current visible bounds
function updateCameraAndPosition() {
  const aspect = getAspect();
  
  if (aspect < 0.8) {
    // Mobile Devices (Vertical Screen)
    camera.position.set(0, 0.2, 10.5);
    sunflowerGroup.position.set(0, -0.6, 0);
    sunflowerGroup.scale.setScalar(0.85);
  } else if (aspect < 1.2) {
    // Tablets / Square screens
    camera.position.set(0, 0.2, 9.2);
    sunflowerGroup.position.set(0, -0.7, 0);
    sunflowerGroup.scale.setScalar(0.92);
  } else {
    // Desktop Wide Screens
    camera.position.set(0, 0.1, 8.2);
    sunflowerGroup.position.set(0, -0.85, 0);
    sunflowerGroup.scale.setScalar(1.0);
  }

  controls.target.set(0, 0.1, 0);
  controls.update();
}

function triggerBloomAnimation() {
  bloomProgress = 0;
  isBlooming = true;
}

function toggleSolarGlow() {
  const targetIntensity = pointLight.intensity > 3 ? 2.5 : 5.5;
  let current = pointLight.intensity;
  
  const step = () => {
    current += (targetIntensity - current) * 0.1;
    pointLight.intensity = current;
    if (Math.abs(targetIntensity - current) > 0.05) {
      requestAnimationFrame(step);
    }
  };
  step();
}

function onWindowResize() {
  const width = container.clientWidth;
  const height = container.clientHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  updateCameraAndPosition();
}

function animate() {
  requestAnimationFrame(animate);

  // Bloom animation Interpolation
  if (isBlooming) {
    bloomProgress += 0.018;
    if (bloomProgress >= 1) {
      bloomProgress = 1;
      isBlooming = false;
    }

    // Ease Out Back
    const ease = 1 + 2.70158 * Math.pow(bloomProgress - 1, 3) + 1.70158 * Math.pow(bloomProgress - 1, 2);

    petalsGroup.children.forEach((pivot) => {
      const pMesh = pivot.children[0];
      const { baseRotX, bloomRotX } = pMesh.userData;
      
      const targetScale = THREE.MathUtils.lerp(0.05, 1, Math.max(0, ease));
      pMesh.scale.setScalar(targetScale * (pMesh.userData.layer === 'outer' ? 0.85 : 0.72));
      pMesh.rotation.x = THREE.MathUtils.lerp(1.4, bloomRotX, Math.max(0, ease));
    });
  }

  // Gentle idle animation
  const time = Date.now() * 0.0012;
  if (sunflowerGroup) {
    sunflowerGroup.rotation.y = Math.sin(time * 0.5) * 0.08;
    sunflowerGroup.rotation.z = Math.cos(time * 0.3) * 0.03;
  }

  if (particlesMesh) {
    particlesMesh.rotation.y = time * 0.05;
    const pos = particlesMesh.geometry.attributes.position.array;
    for (let i = 1; i < pos.length; i += 3) {
      pos[i] += Math.sin(time + i) * 0.002;
    }
    particlesMesh.geometry.attributes.position.needsUpdate = true;
  }

  controls.update();
  renderer.render(scene, camera);
}

// Start app on load
window.addEventListener('DOMContentLoaded', init);
