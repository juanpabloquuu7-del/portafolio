import * as THREE from "three";

const canvas = document.getElementById("bg3d");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// Móvil / pantallas pequeñas: escena más ligera
const isLowPower =
  window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768;

if (canvas && !reducedMotion) initScene();

function initScene() {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !isLowPower,
    alpha: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isLowPower ? 1.25 : 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight, false);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.z = 14;

  // Colores de la paleta — versión luminosa
  const JADE = 0x22d6a3;
  const JADE_BRIGHT = 0x5cffce;
  const FOREST = 0x1f7a63;
  const MINT = 0xd5efe6;
  const MINT_GLOW = 0xaaffe0;

  // --- Campo de partículas (grano flotante, con brillo aditivo) ---
  const PARTICLE_COUNT = isLowPower ? 600 : 1400;
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const sizes = new Float32Array(PARTICLE_COUNT);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 42;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 42;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 30 - 5;
    sizes[i] = Math.random();
  }
  const particlesGeo = new THREE.BufferGeometry();
  particlesGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const particlesMat = new THREE.PointsMaterial({
    color: MINT_GLOW,
    size: 0.07,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const particles = new THREE.Points(particlesGeo, particlesMat);
  scene.add(particles);

  // --- Constelación: líneas entre partículas cercanas (efecto "red neuronal") ---
  const HUB_COUNT = isLowPower ? 90 : 160;
  const hubPositions = [];
  for (let i = 0; i < HUB_COUNT; i++) {
    hubPositions.push(
      new THREE.Vector3(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2])
    );
  }
  const linePoints = [];
  const LINK_DIST = 6.5;
  for (let i = 0; i < hubPositions.length; i++) {
    for (let j = i + 1; j < hubPositions.length; j++) {
      if (hubPositions[i].distanceTo(hubPositions[j]) < LINK_DIST) {
        linePoints.push(hubPositions[i], hubPositions[j]);
      }
    }
  }
  const linesGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
  const linesMat = new THREE.LineBasicMaterial({
    color: JADE,
    transparent: true,
    opacity: 0.18,
    blending: THREE.AdditiveBlending,
  });
  const constellation = new THREE.LineSegments(linesGeo, linesMat);
  particles.add(constellation);

  // --- Formas 3D flotantes (más brillantes) ---
  const shapes = [];
  const geometries = [
    new THREE.IcosahedronGeometry(1.7, 0),
    new THREE.TorusGeometry(1.15, 0.38, 16, 60),
    new THREE.OctahedronGeometry(1.4, 0),
    new THREE.TorusKnotGeometry(0.9, 0.25, 100, 16),
  ];
  const positionsShapes = [
    { x: 5.5, y: 1.5, z: 0 },
    { x: -6, y: -2, z: -3 },
    { x: 3, y: -3.5, z: -2 },
    { x: -4, y: 3, z: -4 },
  ];

  geometries.forEach((geo, i) => {
    const wire = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? JADE_BRIGHT : FOREST,
        wireframe: true,
        transparent: true,
        // Más tenues: pasan por detrás de los títulos y competían con el texto
        opacity: 0.4,
      })
    );
    const p = positionsShapes[i];
    wire.position.set(p.x, p.y, p.z);
    wire.userData.speed = 0.15 + Math.random() * 0.2;
    wire.userData.axis = new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize();
    scene.add(wire);
    shapes.push(wire);
  });

  scene.add(new THREE.AmbientLight(MINT, 0.4));

  // --- Interactividad: parallax con el mouse ---
  const mouse = { x: 0, y: 0 };
  window.addEventListener("mousemove", (e) => {
    mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
    mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  // --- Scroll: rota y desplaza la escena ---
  let scrollY = 0;
  window.addEventListener("scroll", () => {
    scrollY = window.scrollY;
  }, { passive: true });

  // --- Clic: destello expansivo que nace desde el centro de la escena ---
  const bursts = [];
  const raycastPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -4);
  const raycaster = new THREE.Raycaster();
  window.addEventListener("pointerdown", (e) => {
    const ndc = new THREE.Vector2(
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1
    );
    raycaster.setFromCamera(ndc, camera);
    const point = new THREE.Vector3();
    raycaster.ray.intersectPlane(raycastPlane, point);

    const geo = new THREE.RingGeometry(0.05, 0.09, 48);
    const mat = new THREE.MeshBasicMaterial({
      color: JADE_BRIGHT,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const ring = new THREE.Mesh(geo, mat);
    ring.position.copy(point || new THREE.Vector3(0, 0, 4));
    ring.lookAt(camera.position);
    ring.userData.life = 0;
    scene.add(ring);
    bursts.push(ring);
  });

  let resizeRaf = 0;
  function onResize() {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight, false);
    });
  }
  window.addEventListener("resize", onResize);

  const clock = new THREE.Clock();
  let rafId = 0;
  let t = 0;

  // Pausa el render cuando la pestaña no está visible
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
      rafId = 0;
      clock.stop();
    } else if (!rafId) {
      clock.start();
      rafId = requestAnimationFrame(animate);
    }
  });

  function animate() {
    // getDelta antes que el tiempo total (getElapsedTime reinicia el delta)
    const dt = Math.min(clock.getDelta(), 0.1);
    t += dt;

    particles.rotation.y = t * 0.02;
    particles.rotation.x = t * 0.01;

    // Pulso sutil de brillo en las partículas
    particlesMat.opacity = 0.55 + Math.sin(t * 0.8) * 0.15;

    shapes.forEach((mesh) => {
      mesh.rotation.x += 0.002 * mesh.userData.speed * 10 * 0.01;
      mesh.rotateOnAxis(mesh.userData.axis, 0.005 * mesh.userData.speed);
      mesh.position.y += Math.sin(t * mesh.userData.speed) * 0.001;
    });

    for (let i = bursts.length - 1; i >= 0; i--) {
      const ring = bursts[i];
      ring.userData.life += dt;
      const p = ring.userData.life / 1.1;
      ring.scale.setScalar(1 + p * 26);
      ring.material.opacity = Math.max(0, 0.9 * (1 - p));
      if (p >= 1) {
        scene.remove(ring);
        ring.geometry.dispose();
        ring.material.dispose();
        bursts.splice(i, 1);
      }
    }

    // Parallax cámara según mouse
    camera.position.x += (mouse.x * 1.6 - camera.position.x) * 0.03;
    camera.position.y += (-mouse.y * 1.6 - camera.position.y) * 0.03;
    camera.lookAt(0, 0, 0);

    // Leve desplazamiento con el scroll
    scene.position.y = scrollY * 0.0015;

    renderer.render(scene, camera);
    rafId = requestAnimationFrame(animate);
  }

  rafId = requestAnimationFrame(animate);
}
