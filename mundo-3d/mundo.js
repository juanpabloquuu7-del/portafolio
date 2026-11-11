import * as THREE from 'three';
import { buildAE86, tryLoadAE86Model, toonify, makeToonGradient, animateAE86, mergeMeshes, byMaterial } from '../ae86.js';

const $ = (id) => document.getElementById(id);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouch = matchMedia('(hover: none) and (pointer: coarse)').matches;
if (isTouch) document.body.classList.add('is-touch');
// Calidad reducida en celulares y equipos modestos (menos objetos, sin luces extra, resolución adaptable)
const LOW = isTouch || location.search.includes('low') || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
const AN = LOW ? 2 : 8;

/* ---------- Contenido ---------- */
const ZONES = [
  { id: 'hotel', num: '01 / 05', title: 'Hotel Chicamocha · Sitio con recorrido 3D', short: 'Hotel Chicamocha', color: 0x22d6a3, pos: [-66, -31], shape: 'tower',
    text: 'Un hotel que se recorre en 3D y se reserva por WhatsApp en un clic. Prototipo de demostración, individual.',
    tags: ['HTML5', 'CSS3', 'JavaScript', 'three.js', 'Service Worker'],
    links: [['Ver sitio en vivo', 'https://juanpabloquuu7-del.github.io/hotel-web/', true], ['GitHub', 'https://github.com/juanpabloquuu7-del/hotel-web']] },
  { id: 'ia', num: '02 / 05', title: 'Campus Guardian Access AI', short: 'Campus Guardian Access AI', color: 0xb3a8ff, pos: [0, -88], shape: 'octa',
    text: 'Agente de IA para engagement estudiantil que no se cae ni cuando la API falla. Hackathon en equipo: mi aporte fue todo el frontend (panel en Streamlit) y la integración con Gemini.',
    tags: ['Python', 'Streamlit', 'Gemini 2.0', 'Google GenAI SDK'],
    links: [['GitHub', 'https://github.com/alejandro-xoxo/HachatonCampuslans2026.git', true]] },
  { id: 'erp', num: '03 / 05', title: 'ERP Colegio Little Horizons', short: 'ERP Little Horizons', color: 0xffd95c, pos: [66, -31], shape: 'stack',
    text: 'Notas, clubes, inventario y facturación de un colegio de 500+ estudiantes en una sola base de datos.',
    tags: ['Java 17', 'MySQL 8', 'Maven', 'JDBC'],
    links: [['GitHub', 'https://github.com/juanpabloquuu7-del/little-horizons-erp-v2', true]] },
  { id: 'ecommerce', num: '04 / 05', title: 'E-commerce SPA de Moda', short: 'E-commerce LUMIÈRE', color: 0x8fd8d0, pos: [-73.7, 18.6], shape: 'knot',
    text: 'Velocidad de SPA moderna sin un solo framework de por medio.',
    tags: ['HTML5', 'CSS3', 'JavaScript ES6+', 'Web Components'],
    links: [['Ver sitio en vivo', 'https://juanpabloquuu7-del.github.io/Proyecto_E-commerce_quintanillajuan/#/', true], ['GitHub', 'https://github.com/juanpabloquuu7-del/Proyecto_E-commerce_quintanillajuan.git']] },
  { id: 'comunidad', num: '05 / 05', title: 'Sistema de Gestión Comunitaria', short: 'Gestión Comunitaria', color: 0xffa385, pos: [73.7, 18.6], shape: 'dodeca',
    text: 'Administra vecinos, inventario y préstamos de una comunidad, sin base de datos.',
    tags: ['Python', 'JSON', 'POO', 'Logging'],
    links: [['GitHub', 'https://github.com/juanpabloquuu7-del/python.git', true]] },
  { id: 'sobre-mi', num: 'SOBRE MÍ', title: 'Juan Pablo Quintanilla', short: 'Sobre mí', color: 0x7dffce, pos: [-34, 74], shape: 'sphere',
    text: 'Desarrollador frontend de Bucaramanga, Colombia. JavaScript vanilla, Web Components y three.js; también Python con IA y Java con MySQL. Busco mi primer rol junior y hago freelance para pymes.',
    tags: ['Frontend', 'three.js', 'Python / IA', 'Java'],
    links: [['Ver CV', '../cv.pdf', true], ['GitHub', 'https://github.com/juanpabloquuu7-del']] },
  { id: 'contacto', num: 'CONTACTO', title: 'Hablemos', short: 'Contacto', color: 0x22d6a3, pos: [34, 74], shape: 'mail',
    text: 'Si tienes un proyecto, una vacante junior o quieres una web para tu negocio, escríbeme.',
    tags: ['Disponible', 'Remoto / híbrido'],
    links: [['Escribir un correo', 'mailto:juanpabloquuu7@gmail.com?subject=Proyecto%20freelance', true], ['LinkedIn', 'https://www.linkedin.com/in/juan-quintanilla-6058a23a4/']] },
];

/* ---------- Lista accesible ---------- */
const listEl = $('list-items');
ZONES.forEach((z) => {
  const li = document.createElement('li');
  const s = document.createElement('strong'); s.textContent = z.title; li.appendChild(s);
  const p = document.createElement('span'); p.textContent = z.text; li.appendChild(p);
  const row = document.createElement('div'); row.style.marginTop = '6px';
  z.links.forEach(([label, href]) => {
    const a = document.createElement('a'); a.href = href; a.textContent = label;
    if (/^https?:/.test(href)) { a.target = '_blank'; a.rel = 'noopener'; }
    row.appendChild(a);
  });
  li.appendChild(row); listEl.appendChild(li);
});
const openOv = (id) => { $(id).classList.add('open'); $(id).querySelector('.close').focus(); };
const closeOvs = () => document.querySelectorAll('.overlay.open').forEach((o) => o.classList.remove('open'));
$('btn-list').addEventListener('click', () => openOv('ov-list'));
$('btn-help').addEventListener('click', () => openOv('ov-help'));
document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closeOvs));
document.querySelectorAll('.overlay').forEach((o) => o.addEventListener('pointerdown', (e) => { if (e.target === o) closeOvs(); }));

/* ---------- Render ---------- */
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: $('world'), antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  $('loading').classList.add('done');
  $('fallback').classList.add('show');
  throw e;
}
// Escritorio: supermuestreo (mínimo 1.5x) para que la imagen salga nítida; celular: ligero
// Estilo caricatura ligero por defecto (poca RAM/GPU). `?hq` activa el modo realista con postprocesado.
let PR_MAX = Math.min(devicePixelRatio, LOW ? 1.0 : 1.25);
let pr = PR_MAX;
renderer.setPixelRatio(pr);
let composerRef = null;
const applyPR = () => { renderer.setPixelRatio(pr); if (composerRef) composerRef.setPixelRatio(pr); };
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
const HQ = !LOW && location.search.includes('hq');
const TOON = !HQ;
const FX = HQ;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = HQ ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
renderer.toneMappingExposure = 1.05;

const BG = TOON ? 0xf6b27a : 0x2c5a60; // bruma azul-verdosa del atardecer
const scene = new THREE.Scene();
scene.background = new THREE.Color(BG);
scene.fog = new THREE.Fog(BG, LOW ? 70 : 90, LOW ? 520 : 620);

const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 1300);
let composer = null, baseFov = 58;
const resize = () => {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  if (composer) composer.setSize(w, h);
  camera.aspect = w / h;
  baseFov = w < h ? 72 : 58;
  camera.fov = baseFov;
  camera.updateProjectionMatrix();
};
addEventListener('resize', resize); resize();

/* Luces */
scene.add(TOON ? new THREE.HemisphereLight(0xffe6c4, 0x8e7cc0, 1.6) : new THREE.HemisphereLight(0x9fd4d8, 0x46535a, 1.1));
const sun = new THREE.DirectionalLight(TOON ? 0xfff1d6 : 0xffc592, TOON ? 2.4 : 3.0);
sun.position.set(-40, 34, -30);
sun.castShadow = true;
sun.shadow.mapSize.set(HQ ? 4096 : 1024, HQ ? 4096 : 1024);
Object.assign(sun.shadow.camera, { left: -38, right: 38, top: 38, bottom: -38, near: 1, far: 160 });
sun.shadow.normalBias = 0.02;
sun.shadow.bias = -0.0004;
scene.add(sun, sun.target);

/* ---------- Colisiones ---------- */
const statics = []; // círculos fijos {x,z,r}
const boxes = [];   // cajas fijas giradas {x,z,hw,hd,c,s} (edificios, catedral)
const props = [];   // {mesh,x,z,vx,vz,r,m,spin}

/* Suelo: mundo abierto. Pasto hasta el horizonte, un punto de partida y una avenida hacia cada proyecto */
const LIMIT = 345;                            // límite blando: no hay muro, el carro pierde impulso y sale un aviso
const ROAD_W = 7, LOT = 10, AVENUE_R = 110;   // ancho de vía, medio lado del lote de cada proyecto, radio donde empieza la avenida circular
let asphaltMat = null;
const rand = (() => { let t = 7; return () => ((t = (t * 16807) % 2147483647) - 1) / 2147483646; })();
ZONES.forEach((z, i) => { z.i = i; z.d = Math.hypot(z.pos[0], z.pos[1]); z.ux = z.pos[0] / z.d; z.uz = z.pos[1] / z.d; z.css = '#' + z.color.toString(16).padStart(6, '0'); });
// distancia de un punto a la avenida más cercana (para no sembrar árboles ni insignias encima)
const nearRoad = (x, z) => ZONES.reduce((best, zn) => { const t = Math.min(Math.max(x * zn.ux + z * zn.uz, 0), AVENUE_R); return Math.min(best, Math.hypot(x - zn.ux * t, z - zn.uz * t)); }, 1e9);
const nearZone = (x, z) => ZONES.reduce((best, zn) => Math.min(best, Math.hypot(x - zn.pos[0], z - zn.pos[1])), 1e9);
const SIGN_F = 30, SIGN_S = ROAD_W / 2 + 4.4;   // letrero de vía: a 30 m del inicio, al lado derecho
const signSpot = (zn) => [zn.ux * SIGN_F - zn.uz * SIGN_S, zn.uz * SIGN_F + zn.ux * SIGN_S];
const nearSign = (x, z) => ZONES.reduce((best, zn) => { const q = signSpot(zn); return Math.min(best, Math.hypot(x - q[0], z - q[1])); }, 1e9);
// Geometría plana (suelo) hecha a mano: todo lo pintado sobre el piso sale en una sola malla por material
const flatBuilder = () => {
  const P = [], C = [], I = [];
  const poly = (pts, y, c) => {   // polígono convexo [[x,z],...]; se orienta solo hacia arriba
    const n0 = P.length / 3; pts.forEach((p) => { P.push(p[0], y, p[1]); C.push(c.r, c.g, c.b); });
    const up = (pts[1][1] - pts[0][1]) * (pts[2][0] - pts[0][0]) - (pts[1][0] - pts[0][0]) * (pts[2][1] - pts[0][1]) > 0;
    for (let i = 1; i < pts.length - 1; i++) I.push(n0, n0 + (up ? i : i + 1), n0 + (up ? i + 1 : i));
  };
  const strip = (x0, z0, x1, z1, w, y, c) => {
    const l = Math.hypot(x1 - x0, z1 - z0) || 1, px = (-(z1 - z0) / l) * w / 2, pz = ((x1 - x0) / l) * w / 2;
    poly([[x0 + px, z0 + pz], [x1 + px, z1 + pz], [x1 - px, z1 - pz], [x0 - px, z0 - pz]], y, c);
  };
  const build = (uvScale) => {
    const g = new THREE.BufferGeometry(), n = P.length / 3, N = new Float32Array(n * 3), U = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) { N[i * 3 + 1] = 1; U[i * 2] = P[i * 3] * uvScale; U[i * 2 + 1] = P[i * 3 + 2] * uvScale; }
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(U, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setIndex(I);
    return g;
  };
  return { poly, strip, build };
};
{
  const noise = (w, base, spread) => {
    const c = document.createElement('canvas'); c.width = c.height = w;
    const g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, w, w);
    for (let i = 0; i < w * 14; i++) { const v = Math.floor(rand() * spread); g.fillStyle = `rgba(${v},${v},${v},0.09)`; g.fillRect(rand() * w, rand() * w, 1.6, 1.6); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = AN; return t;
  };
  const asphalt = noise(256, TOON ? '#4d5666' : '#3d4548', 255);
  const grassT = noise(256, TOON ? '#58bb5c' : '#2f5a36', 255); grassT.repeat.set(64, 64);
  // pasto hasta más allá de la niebla: no se ve ningún borde
  const grass = new THREE.Mesh(new THREE.CircleGeometry(840, LOW ? 40 : 64), new THREE.MeshStandardMaterial({ map: grassT, roughness: 1 }));
  grass.rotation.x = -Math.PI / 2; grass.position.y = -0.02; grass.receiveShadow = true; scene.add(grass);

  const white = new THREE.Color(1, 1, 1), soft = new THREE.Color(0.8, 0.8, 0.78), amber = new THREE.Color(0xe9b93a);
  const road = flatBuilder(), marks = flatBuilder();
  const RY = 0.04, MY = 0.058;
  // punto de partida: explanada rectangular con cajones de parqueo
  road.poly([[-13, -10], [13, -10], [13, 12], [-13, 12]], RY, white);
  [-1.75, 1.75].forEach((x) => marks.strip(x, 0.6, x, 7.6, 0.16, MY, white));
  marks.strip(-1.75, 7.6, 1.75, 7.6, 0.16, MY, white);
  [-5.25, 5.25, -8.75, 8.75].forEach((x) => marks.strip(x, 0.6, x, 7.6, 0.16, MY, soft));
  ZONES.forEach((z) => {
    const { ux, uz, d } = z, rx = -uz, rz = ux, col = new THREE.Color(z.color);
    const at = (f, sd = 0) => [ux * f + rx * sd, uz * f + rz * sd];
    // avenida: del punto de partida al proyecto y de ahí a la avenida circular de la ciudad
    road.strip(0, 0, ...at(AVENUE_R + 2), ROAD_W, RY, white);
    // lote del proyecto (cuadrado alineado con la vía) con borde del color del proyecto
    road.poly([at(d - LOT, -LOT), at(d + LOT, -LOT), at(d + LOT, LOT), at(d - LOT, LOT)], RY, white);
    [[-LOT, -LOT, LOT, -LOT], [LOT, -LOT, LOT, LOT], [LOT, LOT, -LOT, LOT], [-LOT, LOT, -LOT, -LOT]].forEach(([f0, s0, f1, s1]) => marks.strip(...at(d + f0, s0), ...at(d + f1, s1), 0.34, MY, col));
    // bordes blancos y línea central discontinua
    [[15, d - LOT], [d + LOT, AVENUE_R]].forEach(([f0, f1]) => [-1, 1].forEach((sd) => marks.strip(...at(f0, sd * (ROAD_W / 2 - 0.35)), ...at(f1, sd * (ROAD_W / 2 - 0.35)), 0.14, MY, soft)));
    for (let f = 15; f < AVENUE_R - 3; f += 6) { if (Math.abs(f + 1.2 - d) < LOT + 1.5) continue; marks.strip(...at(f), ...at(f + 2.4), 0.2, MY, amber); }
    // guía: flechas del color del proyecto pintadas en el carril de ida, apuntando hacia él
    for (let f = 18; f < d - LOT - 4; f += 12) {
      [0, 1.5].forEach((k) => {
        const p = (s, ff) => at(f + 3 + k + ff, s + ROAD_W / 4);
        marks.poly([p(0, 0.9), p(-1.1, -0.2), p(-1.1, -0.85), p(0, 0.25)], MY, col);
        marks.poly([p(0, 0.9), p(0, 0.25), p(1.1, -0.85), p(1.1, -0.2)], MY, col);
      });
    }
  });
  asphaltMat = new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.7 });
  const roadMesh = new THREE.Mesh(road.build(1 / 9), asphaltMat); roadMesh.receiveShadow = true; roadMesh.name = 'vias'; scene.add(roadMesh);
  const markMesh = new THREE.Mesh(marks.build(1), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.88, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
  markMesh.name = 'senales-piso'; markMesh.renderOrder = 0; scene.add(markMesh);
}

/* Cielo: cúpula con degradado de atardecer que sigue a la cámara */
const sky = (() => {
  const c = document.createElement('canvas'); c.width = 8; c.height = 512;
  const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 512);
  if (TOON) {
    gr.addColorStop(0.00, '#2d2a86'); gr.addColorStop(0.30, '#6a3fa6'); gr.addColorStop(0.46, '#e4608e'); gr.addColorStop(0.53, '#ff9a5a');
    gr.addColorStop(0.58, '#ffd37a'); gr.addColorStop(0.60, '#f6b27a'); gr.addColorStop(1.00, '#f6b27a');
  } else {
    gr.addColorStop(0.00, '#050d18'); gr.addColorStop(0.30, '#0c2535'); gr.addColorStop(0.48, '#1d4b5a');
    gr.addColorStop(0.54, '#3d7076'); gr.addColorStop(0.58, '#e6a768'); gr.addColorStop(0.60, '#2c5a60'); gr.addColorStop(1.00, '#2c5a60');
  }
  g.fillStyle = gr; g.fillRect(0, 0, 8, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 24), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false, depthWrite: false }));
  m.renderOrder = -1; scene.add(m); return m;
})();

/* Estrellas */
{
  const n = LOW ? 250 : 600, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, r = 120 + Math.random() * 60;
    pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = 20 + Math.random() * 90; pos[i * 3 + 2] = Math.sin(a) * r;
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xbfffe6, size: 0.9, sizeAttenuation: false, transparent: true, opacity: 0.7, fog: false })));
}

const bridgeCars = [];
let bridgeInst = null;
let welcomeBoard = null;
let cityTraffic = null;
/* ---------- Bucaramanga: montañas, ciudad, catedral y parques ---------- */
{
  const flat = (c, extra) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, flatShading: true, ...(extra || {}) });
  const far = new THREE.Group();
  const MN = LOW ? 18 : 34;
  for (let i = 0; i < MN; i++) {
    const a = (i / MN) * Math.PI * 2 + rand() * 0.1, r = 540 + rand() * 110, h = 100 + rand() * 160, rad = 110 + rand() * 90;
    const m = new THREE.Mesh(new THREE.ConeGeometry(rad, h, 7 + (i % 3)), flat(TOON ? (i % 2 ? 0x6a5cb8 : 0x7f70cc) : (i % 2 ? 0x1c4a45 : 0x22544c)));
    m.position.set(Math.cos(a) * r, h / 2 - 4, Math.sin(a) * r); m.rotation.y = rand() * 6; far.add(m);
  }
  // Cerros verdes que cierran el valle (más cerca que las montañas, se pierden en la bruma)
  const HN = LOW ? 12 : 22;
  for (let i = 0; i < HN; i++) {
    const a = (i / HN) * Math.PI * 2 + rand() * 0.2, r = 455 + rand() * 70, rad = 70 + rand() * 60, h = 34 + rand() * 60;
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), flat(TOON ? (i % 2 ? 0x4fb86a : 0x66c777) : (i % 2 ? 0x2c5c3c : 0x356a44)));
    m.scale.set(rad, h, rad * (0.8 + rand() * 0.5)); m.position.set(Math.cos(a) * r, -3, Math.sin(a) * r); m.rotation.y = rand() * 6; far.add(m);
  }
  // Cañón del Chicamocha: paredes rojizas escalonadas hacia un lado
  const canyonA = Math.PI * 0.78;
  for (let i = 0; i < 14; i++) {
    const a = canyonA + (i - 7) * 0.075, r = 395 + (i % 3) * 18, h = 70 + rand() * 70;
    const m = new THREE.Mesh(new THREE.BoxGeometry(64, h, 38), flat(TOON ? (i % 2 ? 0xd9824a : 0xeb9a5c) : (i % 2 ? 0x7a5039 : 0x8c5d3f)));
    m.position.set(Math.cos(a) * r, h / 2 - 2, Math.sin(a) * r); m.lookAt(0, h / 2, 0); far.add(m);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(66, 6, 40), flat(TOON ? 0x7ad05a : 0x6b7a45)); cap.position.copy(m.position); cap.position.y = h - 1; cap.quaternion.copy(m.quaternion); far.add(cap);
  }
  { const farMat = flat(0xffffff, { vertexColors: true }); mergeMeshes(THREE, far, (o) => ({ key: 'far', material: farMat, color: o.material.color }), far).forEach((m) => { m.frustumCulled = false; }); scene.add(far); }
  // Suelo de la ciudad: manzanas y calles
  {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    g.fillStyle = '#394042'; g.fillRect(0, 0, 256, 256);
    g.fillStyle = '#242a2c'; g.fillRect(0, 108, 256, 40); g.fillRect(108, 0, 40, 256);
    g.fillStyle = '#d9b43a'; for (let x = 0; x < 256; x += 32) { g.fillRect(x, 126, 16, 3); g.fillRect(126, x, 3, 16); }
    for (let i = 0; i < 3000; i++) { const v = Math.floor(rand() * 255); g.fillStyle = `rgba(${v},${v},${v},0.06)`; g.fillRect(rand() * 256, rand() * 256, 2, 2); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = AN; t.repeat.set(14, 14);
    const cf = new THREE.Mesh(new THREE.RingGeometry(108, 380, 128), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }));
    cf.rotation.x = -Math.PI / 2; cf.position.y = 0.01; cf.receiveShadow = true; scene.add(cf);
    // avenida circular alrededor del parque
    const road = new THREE.Mesh(new THREE.RingGeometry(108, 124, 160), new THREE.MeshStandardMaterial({ color: 0x23292b, roughness: 0.85 }));
    road.rotation.x = -Math.PI / 2; road.position.y = 0.03; road.receiveShadow = true; scene.add(road);
    const lineM = new THREE.MeshBasicMaterial({ color: 0xe9b93a });
    const ln = new THREE.Mesh(new THREE.RingGeometry(115.8, 116.2, 160), lineM); ln.rotation.x = -Math.PI / 2; ln.position.y = 0.05; scene.add(ln);
  }
  // Edificios: una sola malla instanciada; las ventanas se calculan por tamaño real (no se estiran)
  const winTex = (() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d');
    g.fillStyle = '#1a2023'; g.fillRect(0, 0, 64, 128);
    for (let y = 6; y < 124; y += 12) for (let x = 6; x < 60; x += 14) { g.fillStyle = rand() > 0.5 ? '#ffd58a' : '#2c3a40'; g.fillRect(x, y, 8, 7); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = AN; return t;
  })();
  const bMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, map: winTex, emissive: 0xffffff, emissiveMap: winTex, emissiveIntensity: 0.6 });
  bMat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vWin; varying float vRoof;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec3 sc = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
        vec3 lp = position * sc;
        vWin = abs(normal.x) > 0.5 ? vec2(lp.z, lp.y) : vec2(lp.x, lp.y);
        vRoof = abs(normal.y) > 0.5 ? 1.0 : 0.0;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vWin; varying float vRoof;')
      .replace('#include <map_fragment>', 'vec4 wt = texture2D(map, vWin / vec2(6.0, 9.0)); wt = mix(wt, vec4(0.32, 0.32, 0.32, 1.0), vRoof); diffuseColor *= wt;')
      .replace('#include <emissivemap_fragment>', 'vec4 em = texture2D(emissiveMap, vWin / vec2(6.0, 9.0)); totalEmissiveRadiance *= mix(em.rgb, vec3(0.0), vRoof);');
  };
  const tones = TOON ? [0xff9aa2, 0xffd166, 0x9be7c4, 0x8ec5ff, 0xc9a7ff, 0xffb88c, 0xf4f1de, 0x7fd1ae] : [0xb9b2a4, 0xa7a79f, 0xc7b79a, 0x9aa5a6, 0xb3a28a, 0x8f9a94, 0xc2b8a8, 0x7f8b8f];
  const NB = LOW ? 120 : 340;
  const bm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), bMat, NB);
  {
    const d = new THREE.Object3D(), col = new THREE.Color();
    for (let i = 0; i < NB; i++) {
      const a = rand() * Math.PI * 2, r = 130 + Math.pow(rand(), 0.85) * 195;
      const w = 9 + rand() * 17, dp = 9 + rand() * 17;
      const downtown = Math.max(0, 1 - Math.abs(r - 190) / 75);
      const h = 12 + rand() * 40 + downtown * rand() * 85 + (rand() > 0.965 ? 55 : 0);
      d.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r);
      d.rotation.set(0, -a + (rand() < 0.5 ? 0 : Math.PI / 2), 0);
      d.scale.set(w, h, dp); d.updateMatrix();
      boxes.push({ x: d.position.x, z: d.position.z, hw: w / 2, hd: dp / 2, c: Math.cos(d.rotation.y), s: Math.sin(d.rotation.y) });
      bm.setMatrixAt(i, d.matrix); col.setHex(tones[i % tones.length]); bm.setColorAt(i, col);
    }
  }
  bm.frustumCulled = false; scene.add(bm);
  // Tráfico por la avenida circular
  {
    const NCARS = LOW ? 14 : 36;
    const carsM = new THREE.InstancedMesh(new THREE.BoxGeometry(3.4, 1.2, 1.7), new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.3 }), NCARS);
    const lightsM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 0.25, 1.4), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.8, 2.2), toneMapped: false }), NCARS);
    const pal = [0xc0392b, 0x2f6fb5, 0xe9e4d8, 0xd9a21b, 0x3a7d44, 0x222222, 0x8e44ad];
    const col = new THREE.Color();
    const info = [];
    for (let i = 0; i < NCARS; i++) { col.setHex(pal[i % pal.length]); carsM.setColorAt(i, col); info.push({ a: rand() * Math.PI * 2, lane: i % 2 ? 1 : -1, speed: 0.05 + rand() * 0.04 }); }
    carsM.frustumCulled = lightsM.frustumCulled = false; scene.add(carsM, lightsM);
    const o = new THREE.Object3D();
    cityTraffic = (dt) => {
      for (let i = 0; i < NCARS; i++) {
        const c = info[i]; c.a += c.lane * c.speed * dt; const r = 116 + c.lane * 4;
        o.position.set(Math.cos(c.a) * r, 0.9, Math.sin(c.a) * r);
        o.rotation.set(0, -c.a + (c.lane > 0 ? Math.PI : 0), 0); o.updateMatrix(); carsM.setMatrixAt(i, o.matrix);
        o.translateX(1.65); o.updateMatrix(); lightsM.setMatrixAt(i, o.matrix);
      }
      carsM.instanceMatrix.needsUpdate = true; lightsM.instanceMatrix.needsUpdate = true;
    };
  }
  // Catedral de la Sagrada Familia (simplificada): nave crema, dos torres y cúpula verde
  {
    const g = new THREE.Group(); const cream = flat(0xe6d9b8), copper = flat(0x3f9c86);
    const nave = new THREE.Mesh(new THREE.BoxGeometry(16, 15, 26), cream); nave.position.y = 7.5; g.add(nave);
    [-6, 6].forEach((x) => {
      const t = new THREE.Mesh(new THREE.BoxGeometry(4, 26, 4), cream); t.position.set(x, 13, 11); g.add(t);
      const c = new THREE.Mesh(new THREE.ConeGeometry(3.1, 7, 4), copper); c.position.set(x, 29.5, 11); c.rotation.y = Math.PI / 4; g.add(c);
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(7, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), copper); dome.position.set(0, 15, -2); g.add(dome);
    const lant = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 4, 12), cream); lant.position.set(0, 22, -2); g.add(lant);
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    mergeMeshes(THREE, g, byMaterial, g);
    const ang = Math.PI * 1.25; g.position.set(Math.cos(ang) * 98, 0, Math.sin(ang) * 98); g.lookAt(0, 0, 0); scene.add(g);
    { const ry = Math.atan2(-g.position.x, -g.position.z); boxes.push({ x: g.position.x, z: g.position.z, hw: 8.4, hd: 13.4, c: Math.cos(ry), s: Math.sin(ry) }); }
  }
  // Árboles (ceibas y palmas) repartidos por el campo abierto, sin tapar vías, lotes ni monumentos
  const N = LOW ? 60 : 150;
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.35, 0.55, 5, 6), flat(0x5a3d29), N);
  const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(3.4, 0), flat(TOON ? 0x4fcf6e : 0x2f7a45), N);
  const palms = new THREE.InstancedMesh(new THREE.ConeGeometry(2.6, 4.5, 7), flat(TOON ? 0x7fe07a : 0x4d9a52), N);
  const dm = new THREE.Object3D(); let np = 0, nc = 0;
  const bridgeA = Math.PI * 0.95, bridgeC = [Math.cos(bridgeA) * 94, Math.sin(bridgeA) * 94], bridgeT = [-Math.sin(bridgeA), Math.cos(bridgeA)];
  const nearBridge = (x, z) => { const dx = x - bridgeC[0], dz = z - bridgeC[1], t = Math.min(Math.max(dx * bridgeT[0] + dz * bridgeT[1], -44), 44); return Math.hypot(dx - bridgeT[0] * t, dz - bridgeT[1] * t); };
  for (let i = 0; i < N; i++) {
    let x = 0, z = 0, ok = false;
    for (let k = 0; k < 40 && !ok; k++) {
      const a = rand() * Math.PI * 2, r = 24 + Math.sqrt(rand()) * 81; x = Math.cos(a) * r; z = Math.sin(a) * r;
      ok = nearRoad(x, z) > ROAD_W / 2 + 4 && nearZone(x, z) > LOT + 6 && !(Math.abs(x) < 18 && Math.abs(z) < 17) && Math.hypot(x + 69.3, z + 69.3) > 24 && nearBridge(x, z) > 10 && !(Math.abs(x) < 9 && z < -14 && z > -24) && nearSign(x, z) > 7;
    }
    const sc = 0.8 + rand() * 0.9, palm = rand() > 0.6;
    if (!ok) { x = 0; z = -900; }   // sin sitio libre: fuera del mapa
    else statics.push({ x, z, r: 0.5 * sc });
    dm.position.set(x, 2.5 * sc, z); dm.scale.set(sc, sc * (palm ? 1.5 : 1), sc); dm.rotation.set(0, rand() * 6, 0); dm.updateMatrix(); trunks.setMatrixAt(i, dm.matrix);
    dm.position.set(x, (palm ? 6.6 : 6.4) * sc, z); dm.scale.setScalar(sc); dm.updateMatrix();
    if (palm) palms.setMatrixAt(np++, dm.matrix); else crowns.setMatrixAt(nc++, dm.matrix);
  }
  palms.count = np; crowns.count = nc;
  [trunks, crowns, palms].forEach((m) => { m.castShadow = true; scene.add(m); });
  // Puente de la Novena (estilizado): tablero de concreto elevado sobre pilas, barandas, farolas y tráfico
  {
    const bg = new THREE.Group();
    const concrete = flat(0xb7b5ac), dark = flat(0x2b3033), rail = flat(0xd8d6cc);
    const L = 84, W = 11, Y = 10;
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe2a8 });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(L, 1.1, W), concrete); deck.position.y = Y; deck.castShadow = deck.receiveShadow = true; bg.add(deck);
    const road = new THREE.Mesh(new THREE.BoxGeometry(L, 0.06, W - 3), new THREE.MeshStandardMaterial({ color: 0x2f3537, roughness: 0.9 })); road.position.y = Y + 0.6; bg.add(road);
    const lane = new THREE.Mesh(new THREE.PlaneGeometry(L, 0.18), new THREE.MeshBasicMaterial({ color: 0xe9b93a })); lane.rotation.x = -Math.PI / 2; lane.position.y = Y + 0.65; bg.add(lane);
    [-1, 1].forEach((sd) => {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(L, 0.14, 0.14), rail); bar.position.set(0, Y + 1.75, sd * (W / 2 - 0.2)); bg.add(bar);
      const base = new THREE.Mesh(new THREE.BoxGeometry(L, 0.9, 0.25), concrete); base.position.set(0, Y + 1.0, sd * (W / 2 - 0.2)); bg.add(base);
      for (let x = -L / 2 + 3; x <= L / 2 - 3; x += 7) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 5.2, 6), dark); post.position.set(x, Y + 3.3, sd * (W / 2 - 0.2)); bg.add(post);
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.3), lampMat); lamp.position.set(x, Y + 5.9, sd * (W / 2 - 0.6)); bg.add(lamp);
      }
    });
    // pilas en forma de V invertida
    for (let x = -L / 2 + 8; x <= L / 2 - 8; x += 17) {
      const pier = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.9, Y - 0.4, 8), concrete); pier.position.set(x, (Y - 0.4) / 2, 0); pier.castShadow = true; bg.add(pier);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.9, W - 1.5), concrete); cap.position.set(x, Y - 0.9, 0); bg.add(cap);
    }
    // las ~75 piezas fijas del puente quedan en 5 mallas (una por material)
    mergeMeshes(THREE, bg, byMaterial, bg);
    // tráfico: carritos que cruzan el puente (una sola malla instanciada; el color de la carrocería va por instancia)
    const carMat = [0xc0392b, 0x2f6fb5, 0xe9e4d8, 0xd9a21b, 0x3a7d44];
    const toyMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.2 });
    const NC = LOW ? 4 : 8;
    {
      const c = new THREE.Group(), part = (geo, hex, x, y) => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: hex })); m.position.set(x, y, 0); c.add(m); };
      part(new THREE.BoxGeometry(3.2, 0.8, 1.5), 0xffffff, 0, 0.7); part(new THREE.BoxGeometry(1.7, 0.6, 1.3), 0x10181c, -0.2, 1.3); part(new THREE.BoxGeometry(0.06, 0.2, 1.1), 0xff3030, -1.62, 0.8);
      const geo = mergeMeshes(THREE, c, (o) => ({ key: 'toy', material: toyMat, color: o.material.color }), c)[0].geometry;
      bridgeInst = new THREE.InstancedMesh(geo, toyMat, NC); bridgeInst.frustumCulled = false; bg.add(bridgeInst);
      const col = new THREE.Color();
      for (let i = 0; i < NC; i++) {
        const dir = i % 2 ? 1 : -1, o = new THREE.Object3D();
        o.rotation.y = dir > 0 ? 0 : Math.PI; o.position.set(0, Y + 0.65, dir * 1.9);
        bridgeInst.setColorAt(i, col.setHex(carMat[i % carMat.length]));
        bridgeCars.push({ c: o, dir, x: -L / 2 + (i / NC) * L, lane: dir * 1.9, speed: 6 + (i % 4) * 1.4 });
      }
    }
    // letrero
    const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 160; const g2 = cv.getContext('2d');
    g2.fillStyle = '#0b1c17'; g2.fillRect(0, 0, 1024, 160); g2.strokeStyle = '#e9b93a'; g2.lineWidth = 8; g2.strokeRect(6, 6, 1012, 148);
    g2.fillStyle = '#f2f2ee'; g2.font = '700 86px system-ui, Segoe UI, sans-serif'; g2.textAlign = 'center'; g2.fillText('Puente de la Novena', 512, 108);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = AN;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(14, 2.2), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, side: THREE.DoubleSide })); sign.position.set(0, Y + 5.2, 0); bg.add(sign);
    [-6.6, 6.6].forEach((x) => { const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4.4, 8), dark); pl.position.set(x, Y + 3.2, 0); bg.add(pl); });
    // ubicación: sobre el parque, al costado izquierdo del inicio, mirando al centro de la plaza
    const ang = Math.PI * 0.95, R = 94;
    bg.position.set(Math.cos(ang) * R, 0, Math.sin(ang) * R); bg.rotation.y = -ang + Math.PI / 2;
    scene.add(bg);
    bg.userData.len = L;
    for (let x = -L / 2 + 8; x <= L / 2 - 8; x += 17) statics.push({ x: bg.position.x + x * Math.cos(bg.rotation.y), z: bg.position.z - x * Math.sin(bg.rotation.y), r: 1.7 });
    window.__bridge = bg;
  }
  // Farolas a lo largo de las avenidas, alternando de lado
  {
    const spots = [];
    ZONES.forEach((z, zi) => { for (let f = LOW ? 34 : 26, k = 0; f < z.d - LOT - 3; f += LOW ? 40 : 21, k++) spots.push([z, f, (k + zi) % 2 ? 1 : -1]); });
    const NL = spots.length;
    const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.14, 7, 8), flat(0x22302c), NL);
    const arms = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 0.1, 1.6), flat(0x22302c), NL);
    const heads = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.12, 0.9), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3, 1.8), toneMapped: false }), NL);
    const pools = new THREE.InstancedMesh(new THREE.CircleGeometry(3.3, 20), new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending }), NL);
    const o = new THREE.Object3D();
    spots.forEach(([zn, f, sd], i) => {
      const off = sd * (ROAD_W / 2 + 1.1), x = zn.ux * f - zn.uz * off, z = zn.uz * f + zn.ux * off, inX = zn.uz * sd, inZ = -zn.ux * sd;
      statics.push({ x, z, r: 0.25 });
      o.rotation.set(0, 0, 0); o.position.set(x, 3.5, z); o.updateMatrix(); poles.setMatrixAt(i, o.matrix);
      o.rotation.set(0, Math.atan2(inX, inZ), 0); o.position.set(x + inX * 0.8, 7.05, z + inZ * 0.8); o.updateMatrix(); arms.setMatrixAt(i, o.matrix);
      o.position.set(x + inX * 1.5, 6.95, z + inZ * 1.5); o.updateMatrix(); heads.setMatrixAt(i, o.matrix);
      o.rotation.set(-Math.PI / 2, 0, 0); o.position.set(x + inX * 4.6, 0.09, z + inZ * 4.6); o.scale.set(1, 1.7, 1); o.updateMatrix(); pools.setMatrixAt(i, o.matrix);
    });
    [poles, arms, heads, pools].forEach((m) => scene.add(m)); poles.castShadow = true;
  }
  // Cartel de bienvenida frente al inicio
  const c = document.createElement('canvas'); c.width = 1024; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#0b1c17'; g.fillRect(0, 0, 1024, 256); g.strokeStyle = '#22d6a3'; g.lineWidth = 8; g.strokeRect(6, 6, 1012, 244);
  g.fillStyle = '#e2f4ed'; g.font = '700 96px system-ui, Segoe UI, sans-serif'; g.textAlign = 'center'; g.fillText('BUCARAMANGA', 512, 128);
  g.fillStyle = '#7dffce'; g.font = '600 46px system-ui, Segoe UI, sans-serif'; g.fillText('Ciudad Bonita · Santander, Colombia', 512, 200);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = AN;
  const board = new THREE.Mesh(new THREE.PlaneGeometry(12, 3), new THREE.MeshBasicMaterial({ map: tx, toneMapped: false, transparent: true })); board.position.set(0, 5.4, -19); scene.add(board);
  welcomeBoard = board;
  { const pg = new THREE.Group(), pm = flat(0x2a3a35); [-5.4, 5.4].forEach((x) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 6.4, 8), pm); p.position.set(x, 3.2, -19.15); p.castShadow = true; pg.add(p); statics.push({ x, z: -19.15, r: 0.35 }); }); scene.add(pg); mergeMeshes(THREE, pg, byMaterial, pg); }
}

/* ---------- Zonas ---------- */
const zoneObjs = [];
// Varias piezas con textura distinta en un solo draw call: atlas + desplazamiento de UV por instancia (atributo uvOff)
const atlasMaterial = (mat, cols, rows) => {
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 uvOff;')
      .replace('#include <uv_vertex>', `#include <uv_vertex>\n#ifdef USE_MAP\n vMapUv = vMapUv * vec2(${(1 / cols).toFixed(6)}, ${(1 / rows).toFixed(6)}) + uvOff;\n#endif`);
  };
  return mat;
};
const atlasOffsets = (n, cols, rows) => { const a = new Float32Array(n * 2); for (let i = 0; i < n; i++) { a[i * 2] = (i % cols) / cols; a[i * 2 + 1] = 1 - (Math.floor(i / cols) + 1) / rows; } return new THREE.InstancedBufferAttribute(a, 2); };
const SIGN_W = 1024, SIGN_H = 400;
const signAtlas = document.createElement('canvas'); signAtlas.width = SIGN_W * 2; signAtlas.height = SIGN_H * 4;
const makeSign = (z) => {
  const g = signAtlas.getContext('2d'); g.save(); g.translate((z.i % 2) * SIGN_W, Math.floor(z.i / 2) * SIGN_H);
  const hex = z.css;
  g.fillStyle = 'rgb(8,24,18)'; g.fillRect(0, 0, 1024, 400);
  g.fillStyle = hex; g.fillRect(0, 0, 1024, 14);
  g.strokeStyle = 'rgba(213,239,230,0.3)'; g.lineWidth = 4; g.strokeRect(2, 2, 1020, 396);
  g.fillStyle = hex; g.font = '600 38px Consolas, monospace'; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText(z.num, 48, 84);
  g.fillStyle = '#e2f4ed'; g.font = '700 66px system-ui, Segoe UI, sans-serif';
  const words = z.title.split(' '); const lines = []; let cur = '';
  words.forEach((w) => { const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > 920 && cur) { lines.push(cur); cur = w; } else cur = t; });
  lines.push(cur);
  lines.slice(0, 3).forEach((l, i) => g.fillText(l, 48, 168 + i * 78));
  g.restore();
};

const shapeMesh = (z, mat) => {
  const grp = new THREE.Group();
  const add = (geo, y = 0) => { const m = new THREE.Mesh(geo, mat); m.position.y = y; m.castShadow = true; grp.add(m); return m; };
  switch (z.shape) {
    case 'tower': add(new THREE.BoxGeometry(2.2, 3, 2.2), 1.5); add(new THREE.BoxGeometry(1.6, 2, 1.6), 4); add(new THREE.BoxGeometry(1, 1.2, 1), 5.6); break;
    case 'octa': add(new THREE.OctahedronGeometry(1.8), 3); break;
    case 'stack': for (let i = 0; i < 4; i++) add(new THREE.CylinderGeometry(1.8 - i * 0.28, 1.8 - i * 0.28, 0.9, 28), 0.5 + i * 1); break;
    case 'knot': add(new THREE.TorusKnotGeometry(1.2, 0.38, 140, 18), 3); break;
    case 'dodeca': add(new THREE.DodecahedronGeometry(1.7), 3); break;
    case 'sphere': add(new THREE.SphereGeometry(1.7, 32, 24), 3); break;
    case 'mail': add(new THREE.BoxGeometry(3, 2, 1.8), 2.2); add(new THREE.BoxGeometry(0.2, 1.4, 0.2), 0.7); break;
  }
  return grp;
};

// Lotes, bases y carteles de los siete proyectos: tres mallas instanciadas (antes eran 21 draw calls)
const NZ = ZONES.length, zoneO = new THREE.Object3D(), zoneCol = new THREE.Color();
const zonePads = new THREE.InstancedMesh(new THREE.PlaneGeometry(LOT * 2 - 0.6, LOT * 2 - 0.6).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.2, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), NZ);
const zoneBases = new THREE.InstancedMesh(new THREE.CylinderGeometry(1.7, 2, 0.5, 6), new THREE.MeshStandardMaterial({ color: 0x0f2a22, roughness: 0.6 }), NZ);
zoneBases.castShadow = zoneBases.receiveShadow = true;
const signTex = new THREE.CanvasTexture(signAtlas); signTex.colorSpace = THREE.SRGBColorSpace; signTex.anisotropy = AN;
const signGeo = new THREE.PlaneGeometry(7.4, 2.9); signGeo.setAttribute('uvOff', atlasOffsets(NZ, 2, 4));
const zoneSigns = new THREE.InstancedMesh(signGeo, atlasMaterial(new THREE.MeshBasicMaterial({ map: signTex, toneMapped: false }), 2, 4), NZ);
ZONES.forEach((z) => {
  const col = new THREE.Color(z.color);
  const g = new THREE.Group(); g.position.set(z.pos[0], 0, z.pos[1]);
  makeSign(z);
  zoneO.position.set(z.pos[0], 0.05, z.pos[1]); zoneO.rotation.set(0, Math.atan2(z.ux, z.uz), 0); zoneO.scale.setScalar(1); zoneO.updateMatrix();
  zonePads.setMatrixAt(z.i, zoneO.matrix); zonePads.setColorAt(z.i, zoneCol.copy(col).multiplyScalar(0.5));
  zoneO.position.y = 0.25; zoneO.updateMatrix(); zoneBases.setMatrixAt(z.i, zoneO.matrix);
  // objeto
  const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.35, metalness: 0.2, emissive: col, emissiveIntensity: 0.28 });
  const obj = shapeMesh(z, mat); obj.position.set(0, 0, 0); g.add(obj);
  if (HQ) { const glow = new THREE.PointLight(col, 18, 16, 1.6); glow.position.set(0, 3, 0); g.add(glow); }
  scene.add(g);
  statics.push({ x: z.pos[0], z: z.pos[1], r: 2.2 });
  zoneObjs.push({ z, g, obj, col, glow: 0 });
});
[zonePads, zoneBases, zoneSigns].forEach((m) => { m.frustumCulled = false; scene.add(m); });
zonePads.renderOrder = 1;

/* ---------- Guías en el mundo: balizas de luz y letreros de vía ---------- */
// Balizas: un rayo de luz del color de cada proyecto, visible desde cualquier punto (no le afecta la niebla). 1 draw call
const beacons = (() => {
  const c = document.createElement('canvas'); c.width = 4; c.height = 128; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.3)'); gr.addColorStop(0.93, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0.35)');
  g.fillStyle = gr; g.fillRect(0, 0, 4, 128);
  const m = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.75, 1.25, 1, 12, 1, true).translate(0, 0.5, 0),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, fog: false, toneMapped: false }), ZONES.length);
  const col = new THREE.Color();
  ZONES.forEach((z, i) => m.setColorAt(i, col.setHex(z.color)));
  m.frustumCulled = false; m.renderOrder = 3; m.name = 'balizas'; scene.add(m); return m;
})();
// Letreros de vía: uno por avenida, a la derecha, con número, nombre y distancia (una textura y dos mallas para los siete)
{
  const c = document.createElement('canvas'); c.width = c.height = 1024; const g = c.getContext('2d'), RH = 128;
  ZONES.forEach((z, i) => {
    const y = i * RH;
    g.fillStyle = '#0b1c17'; g.fillRect(0, y, 1024, RH);
    g.fillStyle = z.css; g.fillRect(0, y, 118, RH); g.fillRect(0, y, 1024, 7); g.fillRect(0, y + RH - 7, 1024, 7);
    g.fillStyle = '#06140f'; g.font = '800 84px system-ui, Segoe UI, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(i + 1), 59, y + RH / 2 + 4);
    // flecha "siga derecho"
    g.fillStyle = z.css; g.beginPath(); const ax = 962, ay = y + RH / 2;
    g.moveTo(ax, ay - 40); g.lineTo(ax + 34, ay - 2); g.lineTo(ax + 13, ay - 2); g.lineTo(ax + 13, ay + 40); g.lineTo(ax - 13, ay + 40); g.lineTo(ax - 13, ay - 2); g.lineTo(ax - 34, ay - 2); g.closePath(); g.fill();
    g.font = '600 40px system-ui, Segoe UI, Arial, sans-serif'; g.textAlign = 'right'; g.fillText(`${Math.round((z.d - SIGN_F) / 5) * 5} m`, 912, y + RH / 2 + 4);
    const dw = g.measureText(`${Math.round((z.d - SIGN_F) / 5) * 5} m`).width;
    let size = 62; const maxW = 912 - dw - 30 - 144;
    do { g.font = `700 ${size}px system-ui, Segoe UI, Arial, sans-serif`; size -= 2; } while (g.measureText(z.short).width > maxW && size > 26);
    g.fillStyle = '#f2f2ee'; g.textAlign = 'left'; g.fillText(z.short, 144, y + RH / 2 + 4);
  });
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = AN;
  const faceMat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), dark = new THREE.MeshStandardMaterial({ color: 0x22302c, roughness: 0.8 });
  const grp = new THREE.Group(), SW = 7.2, SH = SW / 8;
  ZONES.forEach((z, i) => {
    const [x, zz] = signSpot(z), ry = Math.atan2(-z.ux, -z.uz), one = new THREE.Group();
    const geo = new THREE.PlaneGeometry(SW, SH), uv = geo.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setY(k, 1 - (i + 1 - uv.getY(k)) * RH / 1024);
    const face = new THREE.Mesh(geo, faceMat); face.position.y = 3.9; one.add(face);
    const back = new THREE.Mesh(new THREE.BoxGeometry(SW + 0.16, SH + 0.16, 0.1), dark); back.position.set(0, 3.9, -0.07); one.add(back);
    [-SW / 2 + 0.7, SW / 2 - 0.7].forEach((px) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 3.5, 6), dark); post.position.set(px, 1.75, -0.16); post.castShadow = true; one.add(post);
      statics.push({ x: x + px * Math.cos(ry), z: zz - px * Math.sin(ry), r: 0.22 });
    });
    one.position.set(x, 0, zz); one.rotation.y = ry; grp.add(one);
  });
  scene.add(grp); mergeMeshes(THREE, grp, byMaterial, grp);
}
boxes.forEach((b) => { b.rad = Math.hypot(b.hw, b.hd); });

/* ---------- Props empujables ---------- */
const crateMat = new THREE.MeshStandardMaterial({ color: 0x1d5a47, roughness: 0.55, metalness: 0.1 });
const crateEdge = new THREE.MeshStandardMaterial({ color: 0x22d6a3, roughness: 0.4, emissive: 0x22d6a3, emissiveIntensity: 0.2 });
const coneMat = new THREE.MeshStandardMaterial({ color: 0xffa385, roughness: 0.5 });
const ballMat = new THREE.MeshStandardMaterial({ color: 0xe2f4ed, roughness: 0.25, metalness: 0.1 });
const addProp = (kind, x, z) => {
  let mesh, r, m;
  if (kind === 'crate') {
    mesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), crateMat);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.52, 1.52, 1.52)), new THREE.LineBasicMaterial({ color: 0x22d6a3 }));
    mesh.add(e); mesh.position.y = 0.75; r = 1.05; m = 1.4;
  } else if (kind === 'cone') {
    mesh = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.4, 16), coneMat); mesh.position.y = 0.7; r = 0.6; m = 0.6;
  } else {
    mesh = new THREE.Mesh(new THREE.SphereGeometry(1.1, 24, 16), ballMat); mesh.position.y = 1.1; r = 1.1; m = 0.9;
  }
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.position.x = x; mesh.position.z = z; mesh.rotation.y = Math.random() * 6;
  scene.add(mesh);
  props.push({ mesh, x, z, vx: 0, vz: 0, r, m, kind, spin: 0 });
};
// Insignias de tecnologías: al chocarlas salen disparadas hacia el proyecto donde más se usan
const toastEl = document.createElement('div'); toastEl.id = 'toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl);
let toastTimer = 0;
const toast = (msg) => { toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2800); };
const BADGES = [   // [texto, logo (img/tech), proyecto al que viaja]
  ['JavaScript', 'javascript', 'hotel'], ['HTML5', 'html5', 'hotel'], ['CSS3', 'css3', 'ecommerce'], ['three.js', 'threejs', 'hotel'],
  ['JavaScript', 'javascript', 'ecommerce'], ['Python', 'python', 'ia'], ['Python', 'python', 'comunidad'], ['Streamlit', 'streamlit', 'ia'],
  ['Gemini', 'gemini', 'ia'], ['Java', 'java', 'erp'], ['MySQL', 'mysql', 'erp'], ['Maven', 'maven', 'erp'],
  ['JSON', 'json', 'comunidad'], ['Web Comp.', 'webcomponents', 'ecommerce'], ['PWA', 'pwa', 'hotel'],
];
const badgeGeo = new THREE.BoxGeometry(2.5, 2.5, 2.5);
const badgeAtlas = document.createElement('canvas'); badgeAtlas.width = badgeAtlas.height = 1024;
const badgeAtlasTex = new THREE.CanvasTexture(badgeAtlas); badgeAtlasTex.colorSpace = THREE.SRGBColorSpace; badgeAtlasTex.anisotropy = AN;
const badgeTex = (label, icon, i) => {   // pinta la celda i del atlas (4 x 4); el logo llega después
  const g = badgeAtlas.getContext('2d'), ox = (i % 4) * 256, oy = Math.floor(i / 4) * 256;
  const paint = (img) => {
    g.save(); g.translate(ox, oy);
    g.fillStyle = '#f6f1e7'; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = 'rgba(40,30,60,0.35)'; g.lineWidth = 14; g.strokeRect(7, 7, 242, 242);
    if (img) g.drawImage(img, 36, 22, 184, 184);
    let size = 38; g.font = `800 ${size}px system-ui, Segoe UI, Arial, sans-serif`;
    while (g.measureText(label).width > 200 && size > 16) { size -= 2; g.font = `800 ${size}px system-ui, Segoe UI, Arial, sans-serif`; }
    g.fillStyle = '#1d1633'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, 128, img ? 228 : 128);
    g.restore(); badgeAtlasTex.needsUpdate = true;
  };
  paint(null);
  const img = new Image(); img.onload = () => paint(img); img.src = `../img/tech/${icon}.svg`;
};
const rnd = (a, b) => a + Math.random() * (b - a);
BADGES.forEach(([label, icon, target], bi) => {
  let x, z, ok, tries = 0;
  do {
    x = rnd(-62, 62); z = rnd(-62, 62);
    ok = Math.hypot(x, z) < 66 && !(Math.abs(x) < 16 && Math.abs(z) < 15) && nearRoad(x, z) > ROAD_W / 2 + 2.6 && nearZone(x, z) > LOT + 4 && nearSign(x, z) > 6
      && statics.every((s) => Math.hypot(s.x - x, s.z - z) > s.r + 3) && props.every((q) => Math.hypot(q.x - x, q.z - z) > 5);
    tries++;
  } while (!ok && tries < 300);
  badgeTex(label, icon, bi);
  const mesh = new THREE.Object3D(); mesh.position.set(x, 1.25, z); mesh.rotation.y = Math.random() * 6;   // solo guarda la posición: se dibuja instanciada
  props.push({ mesh, x, z, vx: 0, vz: 0, r: 1.75, m: 1.1, kind: 'badge', spin: 0, label, target, home: { x, z }, launch: 0, launched: false, t: 0 });
});
const badgeGeoI = badgeGeo.clone(); badgeGeoI.setAttribute('uvOff', atlasOffsets(BADGES.length, 4, 4));
const badgeMesh = new THREE.InstancedMesh(badgeGeoI, atlasMaterial(new THREE.MeshStandardMaterial({ map: badgeAtlasTex, roughness: 0.6 }), 4, 4), BADGES.length);
badgeMesh.castShadow = badgeMesh.receiveShadow = true; badgeMesh.frustumCulled = false; badgeMesh.name = 'insignias'; scene.add(badgeMesh);
function launchBadge(p) {
  const zone = ZONES.find((zz) => zz.id === p.target); if (!zone) return;
  const dx = zone.pos[0] - p.x, dz = zone.pos[1] - p.z, d = Math.hypot(dx, dz) || 1;
  const sp = Math.min(34, Math.max(16, d * 0.55));
  p.vx = (dx / d) * sp; p.vz = (dz / d) * sp; p.launch = 4; p.t = 0;
  if (!p.launched) toast(`${p.label} → ${zone.title}`);
  p.launched = true;
}

/* ---------- Carro: Toyota AE86 ---------- */
const envMap = LOW ? null : (() => {
  const es = new THREE.Scene();
  es.add(new THREE.Mesh(new THREE.SphereGeometry(60, 48, 32), new THREE.MeshBasicMaterial({ map: sky.material.map, color: HQ ? 0xffffff : 0x8f8f8f, side: THREE.BackSide })));   // cielo atenuado: el blanco del carro no se tiñe de rosa
  const sunDot = new THREE.Mesh(new THREE.SphereGeometry(5, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(16, 10, 5) }));
  sunDot.position.set(-40, 34, -30).normalize().multiplyScalar(48); es.add(sunDot);
  [[0, 50, 0, 40, 10], [-30, 28, 28, 18, 6], [34, 20, -10, 12, 5]].forEach(([x, y, z, w, h]) => {
    const sb = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 3.4, 3.6), side: THREE.DoubleSide }));
    sb.position.set(x, y, z); sb.lookAt(0, 0, 0); es.add(sb);
  });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(80, 32), new THREE.MeshBasicMaterial({ color: 0x20262a })); floor.rotation.x = -Math.PI / 2; floor.position.y = -4; es.add(floor);
  const pm = new THREE.PMREMGenerator(renderer), tex = pm.fromScene(es, 0.012).texture; pm.dispose();
  es.traverse((o) => { if (o.geometry) { o.geometry.dispose(); o.material.dispose(); } });
  return tex;
})();
if (asphaltMat && envMap && HQ) { asphaltMat.envMap = envMap; asphaltMat.envMapIntensity = 0.5; }
// Mientras llega el GLB se muestra el carro procedural ligero (antes se construía el detallado y se escondía)
const USE_GLB = !LOW && !location.search.includes('procedural');
const ae86 = buildAE86(THREE, { envMap: HQ ? envMap : null, detail: !LOW && !USE_GLB });
const toonGrad = makeToonGradient(THREE);
if (TOON) toonify(THREE, ae86.group, toonGrad);
if (USE_GLB) tryLoadAE86Model(THREE, ae86, '../models/ae86-v2.glb', envMap, location.search.includes('flip'), TOON ? toonGrad : null, { clearcoat: HQ, hood: /capo=negro/.test(location.search) ? 'black' : 'white' });
const car = ae86.group, shell = ae86.shell, wheels = ae86.wheels;
// carro ligero: solo las piezas grandes de la carrocería proyectan sombra (las ruedas ya tienen la sombra de contacto)
if (!USE_GLB && TOON) {   // carro ligero: cada rueda queda en una sola malla con colores por vértice (12 draw calls menos)
  const wheelMat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonGrad });
  wheels.forEach((w) => { w.w.traverse((o) => { o.userData.merged = false; }); });   // ya venían unidas por material
  wheels.forEach((w) => mergeMeshes(THREE, w.w, (o) => ({ key: 'rueda', material: wheelMat, color: o.material.color }), w.w));
}
if (!USE_GLB) car.traverse((o) => { if (!o.isMesh || !o.castShadow) return; o.geometry.computeBoundingSphere(); o.castShadow = o.parent === shell && o.geometry.boundingSphere.radius > 0.9; });
const beam = new THREE.SpotLight(0xfff6d0, 60, 34, 0.5, 0.6, 1.4);
beam.position.set(0, 0.9, 1.9); beam.target.position.set(0, 0, 12); if (HQ) car.add(beam, beam.target);
scene.add(car);

/* Detalles vivos del carro (4 draw calls): sombra de contacto, luz de los faros en el piso, marcas de derrape y humo */
const fxTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
const flatFx = (w, d, mat, y, z = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.x = -Math.PI / 2; m.position.set(0, y, z); m.renderOrder = 1; car.add(m); return m; };
// sombra de contacto: mancha suave bajo el carro (también da piso al carro en calidad Eco, que no tiene sombras)
flatFx(2.7, 5.3, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 0.62, map: fxTex(64, 128, (g, w, h) => {
  g.translate(w / 2, h / 2); g.scale(1, h / w);
  const gr = g.createRadialGradient(0, 0, w * 0.16, 0, 0, w * 0.5); gr.addColorStop(0, 'rgba(8,6,20,1)'); gr.addColorStop(0.55, 'rgba(8,6,20,0.75)'); gr.addColorStop(1, 'rgba(8,6,20,0)');
  g.fillStyle = gr; g.fillRect(-w / 2, -w / 2, w, w);
}) }), 0.075);
// luz de los faros sobre el asfalto (mancha aditiva, no es una luz real)
const beamMat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 0, blending: THREE.AdditiveBlending, color: 0xfff0c8, map: fxTex(128, 256, (g, w, h) => {
  [0.38, 0.62].forEach((cx) => {   // dos manchas alargadas que se desvanecen hacia todos los bordes
    g.save(); g.translate(w * cx, h * 0.42); g.scale(1, 2.2);
    const gr = g.createRadialGradient(0, -h * 0.07, 0, 0, 0, w * 0.35); gr.addColorStop(0, 'rgba(255,255,255,0.85)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.3)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(-w, -h, w * 2, h * 2); g.restore();
  });
}) });
const beamFx = flatFx(5.2, 10, beamMat, 0.08, 6.2);
let lightsOn = true;
// marcas de derrape: 240 parches instanciados que se reutilizan en anillo
const SK = 240, skid = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.19, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x14121c, transparent: true, opacity: 0.42, depthWrite: false }), SK);
{ const z0 = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < SK; i++) skid.setMatrixAt(i, z0); }
skid.frustumCulled = false; skid.renderOrder = 1; scene.add(skid);
let skN = 0; const skLast = [null, null], skO = new THREE.Object3D();
function laySkid(i, x, z) {
  const a = skLast[i]; if (!a) { skLast[i] = { x, z }; return; }
  const dx = x - a.x, dz = z - a.z, d = Math.hypot(dx, dz); if (d < 0.45) return;
  skO.position.set((x + a.x) / 2, 0.066, (z + a.z) / 2); skO.rotation.set(0, Math.atan2(dx, dz), 0); skO.scale.set(1, 1, d + 0.06); skO.updateMatrix();
  skid.setMatrixAt(skN, skO.matrix); skN = (skN + 1) % SK; skid.instanceMatrix.needsUpdate = true; a.x = x; a.z = z;
}
// humo de llanta: 48 puntos con un shader mínimo (tamaño y transparencia según la vida)
const SM = 48, smPos = new Float32Array(SM * 3), smLife = new Float32Array(SM), smVel = new Float32Array(SM * 3);
const smGeo = new THREE.BufferGeometry(); smGeo.setAttribute('position', new THREE.BufferAttribute(smPos, 3)); smGeo.setAttribute('life', new THREE.BufferAttribute(smLife, 1));
const smoke = new THREE.Points(smGeo, new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, uniforms: { uSize: { value: 700 }, uColor: { value: new THREE.Color(TOON ? 0xfff3e6 : 0xb9c0c4) } },
  vertexShader: 'attribute float life; varying float vL; uniform float uSize; void main(){ vL = life; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = uSize * (1.7 - life) / -mv.z; gl_Position = projectionMatrix * mv; }',
  fragmentShader: 'varying float vL; uniform vec3 uColor; void main(){ float a = smoothstep(0.5, 0.12, length(gl_PointCoord - 0.5)) * vL * 0.42; if (a < 0.01) discard; gl_FragColor = vec4(uColor, a); }',
}));
smoke.frustumCulled = false; smoke.visible = false; scene.add(smoke);
let smN = 0, smAlive = 0, smAcc = 0;
function puff(x, z, vx, vz) {
  const i = smN; smN = (smN + 1) % SM;
  smPos[i * 3] = x; smPos[i * 3 + 1] = 0.25; smPos[i * 3 + 2] = z; smLife[i] = 1;
  smVel[i * 3] = vx * 0.12 + (Math.random() - 0.5) * 1.2; smVel[i * 3 + 1] = 0.7 + Math.random() * 0.6; smVel[i * 3 + 2] = vz * 0.12 + (Math.random() - 0.5) * 1.2;
}
function updateCarFx(dt, m) {
  // faros escamoteables y luz de freno
  const k = animateAE86(ae86, dt, { lights: lightsOn, brake: m.braking });
  beamMat.opacity = k * (TOON ? 0.4 : 0.5); beamFx.visible = k > 0.03;
  // derrape: marcas y humo desde las ruedas traseras
  const slide = !reduced && m.sp > 5 && (Math.abs(m.vl) > 2.6 || (m.braking && m.sp > 9));
  if (slide) {
    const fx = Math.sin(S.h), fz = Math.cos(S.h), rx = Math.cos(S.h), rz = -Math.sin(S.h);
    smAcc += dt;
    [-1, 1].forEach((sd, i) => {
      const x = S.x - fx * 1.19 + rx * sd * 0.7, z = S.z - fz * 1.19 + rz * sd * 0.7;
      laySkid(i, x, z);
      if (smAcc > 0.045) puff(x, z, S.vx, S.vz);
    });
    if (smAcc > 0.045) smAcc = 0;
  } else { skLast[0] = skLast[1] = null; }
  smAlive = 0;
  for (let i = 0; i < SM; i++) {
    if (smLife[i] <= 0) continue;
    smLife[i] = Math.max(0, smLife[i] - dt * 1.15); smAlive++;
    smPos[i * 3] += smVel[i * 3] * dt; smPos[i * 3 + 1] += smVel[i * 3 + 1] * dt; smPos[i * 3 + 2] += smVel[i * 3 + 2] * dt;
  }
  smoke.visible = smAlive > 0;
  if (smAlive || slide) { smGeo.attributes.position.needsUpdate = true; smGeo.attributes.life.needsUpdate = true; }
}

/* Estado del carro */
const S = { x: 0, z: 4, h: Math.PI, vx: 0, vz: 0, steer: 0, rollV: 0, pitchV: 0, vfPrev: 0, boost: 0 };
const START = { x: 0, z: 4, h: Math.PI };
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), tmp2 = new THREE.Vector3(); let camInit = false, idleT = 0, orbitA = 0;

/* ---------- Entrada ---------- */
const keys = new Set();
addEventListener('keydown', (e) => {
  if (e.target.closest && e.target.closest('.overlay.open') && e.key !== 'Escape') return;
  const k = e.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  if (k === 'escape') closeOvs();
  if (k === 'r') resetCar();
  if (k === 'q' && !e.repeat) nextTarget(true, e.shiftKey ? -1 : 1);
  if (/^[1-7]$/.test(k) && !e.repeat && !e.ctrlKey && !e.altKey && !e.metaKey) setTarget(+k - 1, true);
  if (k === 'l' && !e.repeat) { lightsOn = !lightsOn; toast(lightsOn ? 'Faros arriba' : 'Faros abajo'); }
  if (k === 'e' || k === 'enter') { if (!e.target.closest('a,button') && activeZone) openPrimary(activeZone); }
  keys.add(k); hideHint();
});
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());

const touch = { x: 0, y: 0, boost: false, drift: false };
{
  const stick = $('stick'), knob = $('knob'); let id = null;
  const set = (e) => {
    const r = stick.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, max = r.width / 2;
    let dx = (e.clientX - cx) / max, dy = (e.clientY - cy) / max; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
    touch.x = dx; touch.y = dy; knob.style.transform = `translate(${dx * max * 0.7}px, ${dy * max * 0.7}px)`;
  };
  stick.addEventListener('pointerdown', (e) => { id = e.pointerId; stick.setPointerCapture(id); set(e); hideHint(); });
  stick.addEventListener('pointermove', (e) => { if (e.pointerId === id) set(e); });
  const end = (e) => { if (e.pointerId !== id) return; id = null; touch.x = touch.y = 0; knob.style.transform = ''; };
  stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end);
  [['t-boost', 'boost'], ['t-drift', 'drift']].forEach(([bid, key]) => {
    const b = $(bid);
    b.addEventListener('pointerdown', (e) => { b.setPointerCapture(e.pointerId); touch[key] = true; b.classList.add('on'); });
    const up = () => { touch[key] = false; b.classList.remove('on'); };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
  });
}
let hintHidden = false;
const hideHint = () => { if (hintHidden) return; hintHidden = true; setTimeout(() => $('hint').classList.add('hide'), 2500); };

// Atajo: /mundo-3d/#puente deja el carro frente al Puente de la Novena
if (location.hash === '#puente') Object.assign(START, { x: -50, z: 15, h: -Math.PI / 2 });
function resetCar() { Object.assign(S, START, { vx: 0, vz: 0, steer: 0, vfPrev: 0 }); skLast[0] = skLast[1] = null; }

/* ---------- Panel de zona ---------- */
let activeZone = null;
const panel = $('panel');
const openPrimary = (z) => { const l = z.links.find((x) => x[2]) || z.links[0]; if (l) window.open(l[1], /^mailto:/.test(l[1]) ? '_self' : '_blank', 'noopener'); };
function showZone(z) {
  activeZone = z;
  if (!z) { panel.classList.remove('open'); return; }
  panel.style.setProperty('--zone', '#' + z.color.toString(16).padStart(6, '0'));
  $('p-num').textContent = z.num; $('p-title').textContent = z.title; $('p-text').textContent = z.text;
  const tags = $('p-tags'); tags.replaceChildren(...z.tags.map((t) => { const s = document.createElement('span'); s.textContent = t; return s; }));
  const links = $('p-links');
  links.replaceChildren(...z.links.map(([label, href, primary]) => {
    const a = document.createElement('a'); a.href = href; a.textContent = label; if (primary) a.className = 'primary';
    if (/^https?:/.test(href)) { a.target = '_blank'; a.rel = 'noopener'; }
    return a;
  }));
  panel.classList.add('open');
}

/* ---------- Guías en pantalla: destino, brújula y minimapa ---------- */
let target = 0;
const visited = new Set();
const nav = { name: $('nav-name'), dist: $('nav-dist'), arrow: $('nav-arrow'), btn: $('nav-target'), list: $('nav-list'), map: $('minimap'), root: $('nav') };
const navItems = ZONES.map((z, i) => {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'nav-item'; b.style.setProperty('--zone', z.css);
  const n = document.createElement('i'); n.textContent = String(i + 1); const s = document.createElement('span'); s.textContent = z.short;
  b.append(n, s); b.addEventListener('click', () => { setTarget(i, true); b.blur(); });
  const li = document.createElement('li'); li.appendChild(b); nav.list.appendChild(li);
  return b;
});
function setTarget(i, say) {
  target = (i + ZONES.length) % ZONES.length;
  const z = ZONES[target];
  nav.root.style.setProperty('--zone', z.css); nav.name.textContent = `${target + 1} · ${z.short}`;
  navItems.forEach((b, k) => { b.classList.toggle('on', k === target); b.setAttribute('aria-pressed', k === target ? 'true' : 'false'); });
  guideArrow.material.color.setHex(z.color);
  if (say) toast(`Destino: ${z.short}. Sigue la flecha.`);
}
function nextTarget(say, dir = 1) {   // siguiente proyecto sin visitar; si ya se vieron todos, el siguiente de la lista
  const n = ZONES.length; let pick = (target + dir + n) % n;
  for (let k = 1; k < n; k++) { const i = (target + dir * k + n * n) % n; if (!visited.has(i)) { pick = i; break; } }
  setTarget(pick, say);
}
function markVisited(z) {
  if (visited.has(z.i)) return;
  visited.add(z.i); navItems[z.i].classList.add('seen'); navItems[z.i].title = 'Visitado';
}
nav.btn.addEventListener('click', () => { nextTarget(true); nav.btn.blur(); });

// flecha en el piso, delante del carro, que apunta al destino elegido (1 draw call)
const guideArrow = (() => {
  const b = flatBuilder(), w = new THREE.Color(1, 1, 1);
  for (let k = 0; k < 3; k++) {
    const f = k * 1.15 - 1.15, sc = 1 - k * 0.14, p = (sx, ff) => [sx * sc, f + ff];
    b.poly([p(0, 0.75), p(-0.95, -0.15), p(-0.95, -0.7), p(0, 0.2)], 0, w);
    b.poly([p(0, 0.75), p(0, 0.2), p(0.95, -0.7), p(0.95, -0.15)], 0, w);
  }
  const m = new THREE.Mesh(b.build(1), new THREE.MeshBasicMaterial({ color: ZONES[0].color, transparent: true, opacity: 0.92, depthWrite: false, toneMapped: false }));
  m.renderOrder = 2; m.name = 'flecha-guia'; scene.add(m); return m;
})();

// minimapa: capa fija dibujada una vez; encima solo el carro, el destino y los visitados
const MM = 172, MAP_R = 128, MS = (MM / 2 - 9) / MAP_R, mmDpr = Math.min(devicePixelRatio || 1, 2);
const m2p = (x, z) => [MM / 2 + x * MS, MM / 2 + z * MS];
const mmBase = document.createElement('canvas');
{
  mmBase.width = mmBase.height = MM * mmDpr; const g = mmBase.getContext('2d'); g.scale(mmDpr, mmDpr);
  g.beginPath(); g.arc(MM / 2, MM / 2, MM / 2 - 1, 0, 7); g.fillStyle = 'rgba(16, 52, 34, 0.9)'; g.fill(); g.save(); g.clip();
  g.strokeStyle = '#56606c'; g.lineWidth = 16 * MS; g.beginPath(); g.arc(MM / 2, MM / 2, 116 * MS, 0, 7); g.stroke();   // avenida circular
  g.lineCap = 'butt'; g.lineWidth = Math.max(2.5, ROAD_W * MS);
  ZONES.forEach((z) => { g.beginPath(); g.moveTo(MM / 2, MM / 2); g.lineTo(...m2p(z.ux * AVENUE_R, z.uz * AVENUE_R)); g.stroke(); });
  g.fillStyle = '#56606c'; { const [x0, y0] = m2p(-13, -10), [x1, y1] = m2p(13, 12); g.fillRect(x0, y0, x1 - x0, y1 - y0); }
  // puente y catedral como referencias
  if (window.__bridge) { const bp = window.__bridge.position, ry = window.__bridge.rotation.y, tx = Math.cos(ry) * 42, tz = -Math.sin(ry) * 42; g.strokeStyle = '#d8d6cc'; g.lineWidth = 3; g.beginPath(); g.moveTo(...m2p(bp.x - tx, bp.z - tz)); g.lineTo(...m2p(bp.x + tx, bp.z + tz)); g.stroke(); }
  { const [x, y] = m2p(-69.3, -69.3); g.fillStyle = '#e6d9b8'; g.fillRect(x - 4, y - 4, 8, 8); g.fillStyle = '#3f9c86'; g.beginPath(); g.arc(x, y, 2.4, 0, 7); g.fill(); }
  g.restore();
  g.strokeStyle = 'rgba(213, 239, 230, 0.45)'; g.lineWidth = 1.5; g.beginPath(); g.arc(MM / 2, MM / 2, MM / 2 - 1.5, 0, 7); g.stroke();
  g.fillStyle = '#e2f4ed'; g.font = '700 10px system-ui, Segoe UI, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('N', MM / 2, 9);
  ZONES.forEach((z, i) => {
    const [x, y] = m2p(z.pos[0], z.pos[1]);
    g.beginPath(); g.arc(x, y, 8.5, 0, 7); g.fillStyle = z.css; g.fill(); g.strokeStyle = '#06140f'; g.lineWidth = 1.5; g.stroke();
    g.fillStyle = '#06140f'; g.font = '800 11px system-ui, Segoe UI, sans-serif'; g.fillText(String(i + 1), x, y + 0.5);
  });
}
nav.map.width = nav.map.height = MM * mmDpr;
const mmG = nav.map.getContext('2d');
function drawMinimap(t) {
  const g = mmG; g.setTransform(mmDpr, 0, 0, mmDpr, 0, 0); g.clearRect(0, 0, MM, MM); g.drawImage(mmBase, 0, 0, MM, MM);
  const z = ZONES[target], [tx, ty] = m2p(z.pos[0], z.pos[1]);
  let cx = S.x, cz = S.z; const cd = Math.hypot(cx, cz); if (cd > MAP_R) { cx *= MAP_R / cd; cz *= MAP_R / cd; }
  const [px, py] = m2p(cx, cz);
  g.strokeStyle = z.css; g.lineWidth = 2; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(px, py); g.lineTo(tx, ty); g.stroke(); g.setLineDash([]);
  g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.beginPath(); g.arc(tx, ty, 11.5 + (reduced ? 0 : Math.sin(t * 4) * 1.5), 0, 7); g.stroke();
  visited.forEach((i) => { const [x, y] = m2p(ZONES[i].pos[0], ZONES[i].pos[1]); g.fillStyle = '#06140f'; g.beginPath(); g.arc(x + 7, y - 7, 5, 0, 7); g.fill(); g.strokeStyle = '#7dffce'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x + 4.6, y - 7); g.lineTo(x + 6.4, y - 5.2); g.lineTo(x + 9.4, y - 8.8); g.stroke(); });
  g.save(); g.translate(px, py); g.rotate(Math.PI - S.h);
  g.beginPath(); g.moveTo(0, -8); g.lineTo(5.5, 6); g.lineTo(0, 3); g.lineTo(-5.5, 6); g.closePath(); g.fillStyle = '#ffffff'; g.fill(); g.strokeStyle = '#06140f'; g.lineWidth = 1.5; g.stroke();
  g.restore();
}
nav.map.addEventListener('click', (e) => {
  const r = nav.map.getBoundingClientRect(), k = MM / r.width, x = (e.clientX - r.left) * k, y = (e.clientY - r.top) * k;
  let best = -1, bd = 22; ZONES.forEach((z, i) => { const [zx, zy] = m2p(z.pos[0], z.pos[1]), d = Math.hypot(zx - x, zy - y); if (d < bd) { bd = d; best = i; } });
  if (best >= 0) setTarget(best, true);
});
let navN = 0, navDistTxt = '';
const beaconO = new THREE.Object3D();
function updateGuides(dt, t, showcase) {
  const z = ZONES[target], dx = z.pos[0] - S.x, dz = z.pos[1] - S.z, d = Math.hypot(dx, dz) || 1, a = Math.atan2(dx, dz);
  // flecha del piso
  guideArrow.visible = d > LOT + 5 && !showcase && !activeZone;
  if (guideArrow.visible) {
    const off = 5.6 + (reduced ? 0 : Math.sin(t * 3.2) * 0.35);
    guideArrow.position.set(S.x + (dx / d) * off, 0.1, S.z + (dz / d) * off); guideArrow.rotation.y = a;
  }
  // balizas: la del destino es más ancha y late
  ZONES.forEach((zn, i) => {
    const k = i === target ? 1.5 + (reduced ? 0 : Math.sin(t * 3) * 0.25) : 1;
    beaconO.position.set(zn.pos[0], 0, zn.pos[1]); beaconO.scale.set(k, i === target ? 120 : 80, k); beaconO.updateMatrix(); beacons.setMatrixAt(i, beaconO.matrix);
  });
  beacons.instanceMatrix.needsUpdate = true;
  // brújula y minimapa (3 de cada 4 cuadros se saltan: es DOM y canvas 2D)
  if (navN++ % 4) return;
  nav.arrow.style.transform = `rotate(${(-(a - S.h) * 180 / Math.PI).toFixed(1)}deg)`;
  const txt = activeZone === z ? 'Llegaste' : `${Math.round(Math.max(0, d - LOT) / 5) * 5} m`;
  if (txt !== navDistTxt) { navDistTxt = txt; nav.dist.textContent = txt; }
  drawMinimap(t);
}
setTarget(0, false);

/* ---------- Bucle ---------- */
const clock = new THREE.Clock();
const fwd = new THREE.Vector3(), tmp = new THREE.Vector3();
const MAX_V = 24, BOOST_V = 36;

let edgeT = -1e9;
// círculo contra las cajas giradas (edificios, catedral): saca al objeto y le devuelve parte del impulso
function hitBoxes(o, r, bounce) {
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i], dx = o.x - b.x, dz = o.z - b.z;
    if (Math.abs(dx) > b.rad + r || Math.abs(dz) > b.rad + r) continue;
    const lx = dx * b.c - dz * b.s, lz = dx * b.s + dz * b.c;
    let nx = lx - Math.min(Math.max(lx, -b.hw), b.hw), nz = lz - Math.min(Math.max(lz, -b.hd), b.hd), pen;
    const dist = Math.hypot(nx, nz);
    if (dist > r) continue;
    if (dist < 1e-4) {   // el centro quedó dentro: sale por la cara más cercana
      const px = b.hw - Math.abs(lx), pz = b.hd - Math.abs(lz);
      if (px < pz) { nx = Math.sign(lx) || 1; nz = 0; pen = px + r; } else { nx = 0; nz = Math.sign(lz) || 1; pen = pz + r; }
    } else { nx /= dist; nz /= dist; pen = r - dist; }
    const wx = nx * b.c + nz * b.s, wz = -nx * b.s + nz * b.c;
    o.x += wx * pen; o.z += wz * pen;
    const vn = o.vx * wx + o.vz * wz; if (vn < 0) { o.vx -= bounce * vn * wx; o.vz -= bounce * vn * wz; }
  }
}

function step(dt) {
  // entrada
  let thr = 0, str = 0;
  if (keys.has('w') || keys.has('arrowup')) thr += 1;
  if (keys.has('s') || keys.has('arrowdown')) thr -= 1;
  if (keys.has('a') || keys.has('arrowleft')) str += 1;
  if (keys.has('d') || keys.has('arrowright')) str -= 1;
  let drift = keys.has(' '), boost = keys.has('shift');
  if (touch.x || touch.y) { thr = THREE.MathUtils.clamp(-touch.y * 1.4, -1, 1); str = -THREE.MathUtils.clamp(touch.x * 1.4, -1, 1); }
  drift = drift || touch.drift; boost = boost || touch.boost;

  const fx = Math.sin(S.h), fz = Math.cos(S.h);       // adelante
  const rx = Math.cos(S.h), rz = -Math.sin(S.h);      // izquierda del carro
  let vf = S.vx * fx + S.vz * fz, vl = S.vx * rx + S.vz * rz;

  const top = boost ? BOOST_V : MAX_V;
  if (thr > 0) vf += (vf < 0 ? 40 : 22 + (boost ? 18 : 0)) * thr * dt;
  else if (thr < 0) vf += (vf > 0 ? -36 : -14) * -thr * dt;
  if (thr === 0) vf *= Math.exp(-0.9 * dt);
  vf = THREE.MathUtils.clamp(vf, -9, top);
  vl *= Math.exp(-(drift ? 1.6 : 7.5) * dt);
  vf *= Math.exp(-0.12 * dt);

  const sp = Math.abs(vf);
  const steerPower = THREE.MathUtils.clamp(sp / 5, 0, 1) * (1 - Math.min(sp / 90, 0.3));
  const rate = (drift ? 2.7 : 1.9) * steerPower * Math.sign(vf || 1);
  S.steer += (str - S.steer) * Math.min(1, dt * 9);
  S.h += S.steer * rate * dt;

  const nfx = Math.sin(S.h), nfz = Math.cos(S.h), nrx = Math.cos(S.h), nrz = -Math.sin(S.h);
  S.vx = nfx * vf + nrx * vl; S.vz = nfz * vf + nrz * vl;
  S.x += S.vx * dt; S.z += S.vz * dt;

  // límite blando del mapa: sin muro, el carro deja de avanzar hacia afuera
  const d = Math.hypot(S.x, S.z);
  if (d > LIMIT) {
    const nx = S.x / d, nz = S.z / d, vn = S.vx * nx + S.vz * nz;
    if (vn > 0) { const k = Math.min(1, (d - LIMIT) / 22); S.vx -= vn * nx * k; S.vz -= vn * nz * k; }
    if (d > LIMIT + 24) { S.x = nx * (LIMIT + 24); S.z = nz * (LIMIT + 24); }
    if (performance.now() - edgeT > 7000) { edgeT = performance.now(); toast('Aquí termina el mapa. Pulsa R para volver al punto de partida.'); }
  }
  if (d > 76) hitBoxes(S, 1.55, 1.4);   // edificios y catedral

  // colisiones carro ↔ estáticos y props
  const CR = 1.55;
  statics.forEach((s) => {
    const dx = S.x - s.x, dz = S.z - s.z, dist = Math.hypot(dx, dz), min = CR + s.r;
    if (dist < min && dist > 0.0001) {
      const nx = dx / dist, nz = dz / dist; S.x += nx * (min - dist); S.z += nz * (min - dist);
      const vn = S.vx * nx + S.vz * nz; if (vn < 0) { S.vx -= 1.5 * vn * nx; S.vz -= 1.5 * vn * nz; }
    }
  });
  props.forEach((p) => {
    const dx = p.x - S.x, dz = p.z - S.z, dist = Math.hypot(dx, dz), min = CR + p.r;
    if (dist < min && dist > 0.0001) {
      const nx = dx / dist, nz = dz / dist, push = min - dist;
      p.x += nx * push * 0.85; p.z += nz * push * 0.85; S.x -= nx * push * 0.15; S.z -= nz * push * 0.15;
      const rel = (S.vx - p.vx) * nx + (S.vz - p.vz) * nz;
      if (rel > 0) {
        const j = (1.45 * rel) / (1 + 1 / (p.m * 3));
        p.vx += nx * j; p.vz += nz * j; S.vx -= nx * j * (p.m * 0.12); S.vz -= nz * j * (p.m * 0.12);
        p.spin = (Math.random() - 0.5) * 8;
        if (p.target) launchBadge(p);
      }
    }
  });
  // props: movimiento, fricción, bordes y choques
  props.forEach((p, i) => {
    p.x += p.vx * dt; p.z += p.vz * dt;
    if (p.target) {
      if (p.launch > 0) p.launch -= dt;
      if (p.launched) { p.t += dt; if (p.t > 10) { p.x = p.home.x; p.z = p.home.z; p.vx = p.vz = 0; p.launched = false; p.launch = 0; } }
    }
    const f = Math.exp(-(p.launch > 0 ? 0.45 : 1.7) * dt); p.vx *= f; p.vz *= f; p.spin *= f;
    const pd = Math.hypot(p.x, p.z); if (pd > LIMIT) { const nx = p.x / pd, nz = p.z / pd; p.x = nx * LIMIT; p.z = nz * LIMIT; const vn = p.vx * nx + p.vz * nz; if (vn > 0) { p.vx -= 1.8 * vn * nx; p.vz -= 1.8 * vn * nz; } }
    statics.forEach((s) => { const dx = p.x - s.x, dz = p.z - s.z, dist = Math.hypot(dx, dz), min = p.r + s.r; if (dist < min && dist > 0.0001) { const nx = dx / dist, nz = dz / dist; p.x += nx * (min - dist); p.z += nz * (min - dist); const vn = p.vx * nx + p.vz * nz; if (vn < 0) { p.vx -= 1.6 * vn * nx; p.vz -= 1.6 * vn * nz; } } });
    for (let j = i + 1; j < props.length; j++) {
      const q = props[j], dx = q.x - p.x, dz = q.z - p.z, dist = Math.hypot(dx, dz), min = p.r + q.r;
      if (dist < min && dist > 0.0001) {
        const nx = dx / dist, nz = dz / dist, ov = (min - dist) / 2;
        p.x -= nx * ov; p.z -= nz * ov; q.x += nx * ov; q.z += nz * ov;
        const rel = (p.vx - q.vx) * nx + (p.vz - q.vz) * nz;
        if (rel > 0) { const tot = p.m + q.m, jj = (1.6 * rel); p.vx -= nx * jj * (q.m / tot); p.vz -= nz * jj * (q.m / tot); q.vx += nx * jj * (p.m / tot); q.vz += nz * jj * (p.m / tot); }
      }
    }
    p.mesh.position.x = p.x; p.mesh.position.z = p.z;
    if (p.kind === 'ball') { p.mesh.rotation.x += (p.vz * dt) / p.r; p.mesh.rotation.z -= (p.vx * dt) / p.r; }
    else p.mesh.rotation.y += p.spin * dt;
  });

  // modelo del carro
  car.position.set(S.x, 0, S.z);
  S.rollV += (-vl * 0.012 - S.rollV) * Math.min(1, dt * 6);
  // suspensión: la nariz baja al frenar y sube al acelerar
  const acc = dt > 0 ? (vf - S.vfPrev) / dt : 0; S.vfPrev = vf;
  S.pitchV += (THREE.MathUtils.clamp(-acc * 0.0016, -0.03, 0.04) - S.pitchV) * Math.min(1, dt * 5);
  car.rotation.set(0, S.h, 0);
  shell.rotation.z = S.rollV; shell.rotation.x = reduced ? 0 : S.pitchV;
  const spin = (vf * dt) / 0.31;
  wheels.forEach((w) => { w.w.rotation.x += spin; if (w.front) w.piv.rotation.y = S.steer * 0.5; });
  return { vf, vl, sp, thr, braking: (thr < 0 && vf > 0.6) || (drift && sp > 2) };
}

function updateZones(t) {
  let found = null;
  const cx = camera.position.x, cz = camera.position.z;
  zoneObjs.forEach((zo) => {
    const z = zo.z;
    zo.obj.rotation.y = reduced ? 0 : t * 0.5; zo.obj.position.y = reduced ? 0 : Math.sin(t * 1.4 + z.pos[0]) * 0.25;
    const inside = Math.hypot(S.x - z.pos[0], S.z - z.pos[1]) < LOT + 0.5;
    if (inside) found = z;
    // el lote se ilumina al entrar
    zo.glow += ((inside ? 1 : 0) - zo.glow) * 0.15; zonePads.setColorAt(z.i, zoneCol.copy(zo.col).multiplyScalar(0.5 + zo.glow));
    // cartel: siempre de frente y más grande cuanto más lejos (se lee desde el punto de partida)
    const dc = Math.hypot(cx - z.pos[0], cz - z.pos[1]), k = THREE.MathUtils.clamp(dc / 30, 0.9, 3.2);
    zoneO.position.set(z.pos[0], 4.6 + k * 2.9, z.pos[1]); zoneO.rotation.set(0, Math.atan2(cx - z.pos[0], cz - z.pos[1]), 0); zoneO.scale.setScalar(k); zoneO.updateMatrix();
    zoneSigns.setMatrixAt(z.i, zoneO.matrix);
  });
  zoneSigns.instanceMatrix.needsUpdate = true; zonePads.instanceColor.needsUpdate = true;
  if (found !== activeZone) {
    const prev = activeZone; showZone(found);
    if (found) markVisited(found);
    else if (prev && prev.i === target) nextTarget(false);   // al salir del destino, la guía pasa al siguiente sin visitar
  }
}

const QUALITY = {
  eco:    { label: 'Eco',    pr: 0.7,  cap: 30, shadows: false, shEvery: 3 },
  normal: { label: 'Normal', pr: 1.0,  cap: 60, shadows: true,  shEvery: 2 },
  alta:   { label: 'Alta',   pr: 1.25, cap: 0,  shadows: true,  shEvery: 1 },
};
let qKey = LOW ? 'eco' : 'normal';
try { qKey = localStorage.getItem('mundoQ') || qKey; } catch (e) {}
if (!QUALITY[qKey]) qKey = 'normal';
if (HQ) qKey = 'alta';
let capMs = 0, shEvery = 2, frameN = 0, fpsAcc = 0, fpsCount = 0, lastDraw = 0, fpsText = '';
const btnQ = $('btn-q');
function applyQuality() {
  const q = QUALITY[qKey];
  PR_MAX = q.pr; pr = PR_MAX; applyPR();
  capMs = q.cap ? 1000 / q.cap : 0; shEvery = q.shEvery;
  sun.castShadow = q.shadows; renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;
  if (btnQ) btnQ.textContent = `Calidad: ${q.label}${fpsText}`;
}
if (btnQ) btnQ.addEventListener('click', () => {
  const keys = Object.keys(QUALITY); qKey = keys[(keys.indexOf(qKey) + 1) % keys.length];
  try { localStorage.setItem('mundoQ', qKey); } catch (e) {}
  applyQuality(); toast(`Calidad ${QUALITY[qKey].label}: ${qKey === 'eco' ? '30 fps, sin sombras, resolución baja' : qKey === 'normal' ? '60 fps, sombras suaves' : 'máxima nitidez, sin límite de fps'}`);
});
let ftAvg = 16, ftCount = 0, badgeOutline = null;
const badgeProps = props.filter((p) => p.kind === 'badge'), badgeSc = new THREE.Matrix4().makeScale(1.07, 1.07, 1.07), badgeM = new THREE.Matrix4();
function syncBadges() {
  badgeProps.forEach((p, i) => { p.mesh.updateMatrix(); badgeMesh.setMatrixAt(i, p.mesh.matrix); if (badgeOutline) badgeOutline.setMatrixAt(i, badgeM.multiplyMatrices(p.mesh.matrix, badgeSc)); });
  badgeMesh.instanceMatrix.needsUpdate = true; if (badgeOutline) badgeOutline.instanceMatrix.needsUpdate = true;
}
function adaptResolution(rawDt) {
  ftAvg += (rawDt * 1000 - ftAvg) * 0.08; ftCount++;
  if (ftCount < 90 || ftCount % 45) return;
  // En escritorio solo se baja la resolución si de verdad va mal (<20 fps) y nunca bajo 1x
  const slow = LOW ? 26 : 34, floor = 0.6, fast = LOW ? 15 : 18;
  if (ftAvg > slow && pr > floor) { pr = Math.max(floor, pr - 0.15); applyPR(); }
  else if (ftAvg < fast && pr < PR_MAX) { pr = Math.min(PR_MAX, pr + 0.1); applyPR(); }
}

function frame() {
  const nowMs = performance.now();
  if (capMs && nowMs - lastDraw < capMs - 2) { requestAnimationFrame(frame); return; }
  lastDraw = nowMs;
  const rawDt = clock.getDelta();
  frameN++; fpsAcc += rawDt; fpsCount++;
  if (fpsAcc >= 0.7) { fpsText = ` · ${Math.round(fpsCount / fpsAcc)} fps`; if (btnQ) btnQ.textContent = `Calidad: ${QUALITY[qKey].label}${fpsText}`; fpsAcc = 0; fpsCount = 0; }
  if (frameN % shEvery === 0) renderer.shadowMap.needsUpdate = true;
  const dt = Math.min(rawDt, 0.05), t = clock.elapsedTime;
  adaptResolution(rawDt);
  const m = step(dt);
  updateZones(t);

  // cámara
  const fxx = Math.sin(S.h), fzz = Math.cos(S.h);
  const back = 9.8 + Math.min(m.sp, 30) * 0.14;
  tmp.set(S.x - fxx * back, 5.4 + Math.min(m.sp, 30) * 0.06, S.z - fzz * back);
  // carro quieto unos segundos: la cámara baja y le da la vuelta despacio (se cancela al conducir)
  idleT = (m.sp > 0.5 || m.thr !== 0) ? 0 : idleT + dt;
  const showcase = !reduced && idleT > 6 && !activeZone && !document.querySelector('.overlay.open');
  if (showcase) { orbitA += dt * 0.2; const a = S.h + Math.PI + orbitA; tmp.set(S.x + Math.sin(a) * 7.4, 2.2, S.z + Math.cos(a) * 7.4); tmp2.set(S.x, 0.75, S.z); }
  else { orbitA = 0; tmp2.set(S.x + fxx * 4.5, 1.2, S.z + fzz * 4.5); }
  if (!camInit) { camPos.copy(tmp); camLook.copy(tmp2); camInit = true; }
  camPos.lerp(tmp, 1 - Math.exp(-(showcase ? 1.6 : 4.2) * dt));
  camLook.lerp(tmp2, 1 - Math.exp(-(showcase ? 2.5 : 14) * dt));
  camera.position.copy(camPos);
  camera.lookAt(camLook);
  updateCarFx(dt, m);
  updateGuides(dt, t, showcase);
  // el cartel de bienvenida se vuelve transparente si la cámara lo va a atravesar
  if (welcomeBoard) { const o = THREE.MathUtils.clamp((camPos.distanceTo(welcomeBoard.position) - 5) / 7, 0, 1); welcomeBoard.material.opacity = o; welcomeBoard.visible = o > 0.02; }

  sun.position.set(S.x - 40, 34, S.z - 30); sun.target.position.set(S.x, 0, S.z);
  sky.position.copy(camera.position);
  syncBadges();
  if (cityTraffic) cityTraffic(dt);
  bridgeCars.forEach((b, i) => { b.x += b.dir * b.speed * dt; if (b.x > 42) b.x = -42; if (b.x < -42) b.x = 42; b.c.position.x = b.x; b.c.updateMatrix(); bridgeInst.setMatrixAt(i, b.c.matrix); });
  if (bridgeInst) bridgeInst.instanceMatrix.needsUpdate = true;

  camera.fov += (baseFov + Math.min(m.sp, 36) * 0.22 - camera.fov) * Math.min(1, dt * 4); camera.updateProjectionMatrix();
  if (composer) composer.render(); else renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

if (TOON) {
  // todos los materiales físicos pasan a toon (3 bandas) y los objetos "juguete" reciben contorno oscuro
  toonify(THREE, scene, toonGrad);
  const outlineMat = new THREE.MeshBasicMaterial({ color: 0x1d1636, side: THREE.BackSide });
  const outline = (mesh, k = 1.07) => { const o = new THREE.Mesh(mesh.geometry, outlineMat); o.scale.setScalar(k); mesh.add(o); };
  props.forEach((p) => { if (p.kind !== 'badge') outline(p.mesh, p.kind === 'cone' ? 1.12 : 1.07); });
  // contorno de las 15 insignias: otra malla instanciada que sigue a cada cubo
  badgeOutline = new THREE.InstancedMesh(badgeGeo, outlineMat, BADGES.length); badgeOutline.frustumCulled = false; scene.add(badgeOutline);
  zoneObjs.forEach((zo) => { const list = []; zo.obj.traverse((o) => { if (o.isMesh) list.push(o); }); list.forEach((o) => outline(o, 1.06)); });
}
// cada figura de zona (y su contorno) queda en una malla por material
zoneObjs.forEach((zo) => mergeMeshes(THREE, zo.obj, byMaterial, zo.obj));
applyQuality();
resetCar();
window.__mundo = { renderer, scene, camera, ae86, S, ZONES, statics, boxes, setTarget };
if (FX) {
  try {
    const base = 'three/addons/';
    const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }, { GTAOPass }] = await Promise.all([
      import(base + 'postprocessing/EffectComposer.js'), import(base + 'postprocessing/RenderPass.js'),
      import(base + 'postprocessing/UnrealBloomPass.js'), import(base + 'postprocessing/OutputPass.js'), import(base + 'postprocessing/GTAOPass.js'),
    ]);
    const w = innerWidth, h = innerHeight;
    const rt = new THREE.WebGLRenderTarget(w * pr, h * pr, { type: THREE.HalfFloatType, samples: 4 });
    composer = new EffectComposer(renderer, rt);
    composer.setPixelRatio(pr); composer.setSize(w, h);
    composer.addPass(new RenderPass(scene, camera));
    try {
      const ao = new GTAOPass(scene, camera, w, h);
      ao.updateGtaoMaterial({ radius: 0.9, distanceExponent: 1.4, thickness: 1.2, scale: 1.0, samples: 12, distanceFallOff: 1, screenSpaceRadius: false });
      ao.blendIntensity = 0.85;
      composer.addPass(ao);
    } catch (e) { console.warn('GTAO no disponible', e); }
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(w, h), 0.55, 0.65, 0.92));
    composer.addPass(new OutputPass());
    composerRef = composer;
  } catch (e) { console.warn('Postprocesado desactivado', e); composer = null; }
}
requestAnimationFrame(() => { frame(); $('loading').classList.add('done'); });
