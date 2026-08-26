import * as THREE from "three";

const canvas = document.getElementById("bg3d");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 14;

// Colores de la paleta
const JADE = 0x1f7a63;
const FOREST = 0x124136;
const MINT = 0xd5efe6;

// --- Campo de partículas (grano flotante) ---
const PARTICLE_COUNT = 900;
const positions = new Float32Array(PARTICLE_COUNT * 3);
for (let i = 0; i < PARTICLE_COUNT; i++) {
  positions[i * 3] = (Math.random() - 0.5) * 40;
  positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
  positions[i * 3 + 2] = (Math.random() - 0.5) * 30 - 5;
}
const particlesGeo = new THREE.BufferGeometry();
particlesGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
const particlesMat = new THREE.PointsMaterial({
  color: MINT,
  size: 0.05,
  transparent: true,
  opacity: 0.45,
  depthWrite: false,
});
const particles = new THREE.Points(particlesGeo, particlesMat);
scene.add(particles);

// --- Formas 3D flotantes ---
const shapes = [];
const geometries = [
  new THREE.IcosahedronGeometry(1.6, 0),
  new THREE.TorusGeometry(1.1, 0.35, 16, 60),
  new THREE.OctahedronGeometry(1.3, 0),
];
const positionsShapes = [
  { x: 5.5, y: 1.5, z: 0 },
  { x: -6, y: -2, z: -3 },
  { x: 3, y: -3.5, z: -2 },
];

geometries.forEach((geo, i) => {
  const wire = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({
      color: i === 1 ? FOREST : JADE,
      wireframe: true,
      transparent: true,
      opacity: 0.55,
    })
  );
  const p = positionsShapes[i];
  wire.position.set(p.x, p.y, p.z);
  wire.userData.speed = 0.15 + Math.random() * 0.2;
  wire.userData.axis = new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize();
  scene.add(wire);
  shapes.push(wire);
});

// Luz ambiental sutil (no afecta wireframes pero deja el setup listo para mallas sólidas futuras)
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
});

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", onResize);

const clock = new THREE.Clock();

function animate() {
  const t = clock.getElapsedTime();

  particles.rotation.y = t * 0.015;
  particles.rotation.x = t * 0.008;

  shapes.forEach((mesh) => {
    mesh.rotation.x += 0.002 * mesh.userData.speed * 10 * 0.01;
    mesh.rotateOnAxis(mesh.userData.axis, 0.004 * mesh.userData.speed);
    mesh.position.y += Math.sin(t * mesh.userData.speed) * 0.001;
  });

  // Parallax cámara según mouse
  camera.position.x += (mouse.x * 1.4 - camera.position.x) * 0.03;
  camera.position.y += (-mouse.y * 1.4 - camera.position.y) * 0.03;
  camera.lookAt(0, 0, 0);

  // Leve desplazamiento con el scroll
  scene.position.y = scrollY * 0.0015;

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
