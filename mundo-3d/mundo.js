import * as THREE from 'three';

const $ = (id) => document.getElementById(id);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouch = matchMedia('(hover: none) and (pointer: coarse)').matches;
if (isTouch) document.body.classList.add('is-touch');

/* ---------- Contenido ---------- */
const ZONES = [
  { id: 'hotel', num: '01 / 05', title: 'Hotel Chicamocha · Sitio con recorrido 3D', color: 0x22d6a3, pos: [-26, -22], shape: 'tower',
    text: 'Un hotel que se recorre en 3D y se reserva por WhatsApp en un clic. Prototipo de demostración, individual.',
    tags: ['HTML5', 'CSS3', 'JavaScript', 'three.js', 'Service Worker'],
    links: [['Ver sitio en vivo', 'https://juanpabloquuu7-del.github.io/hotel-web/', true], ['GitHub', 'https://github.com/juanpabloquuu7-del/hotel-web']] },
  { id: 'ia', num: '02 / 05', title: 'Campus Guardian Access AI', color: 0xb3a8ff, pos: [0, -36], shape: 'octa',
    text: 'Agente de IA para engagement estudiantil que no se cae ni cuando la API falla. Hackathon en equipo: mi aporte fue todo el frontend (panel en Streamlit) y la integración con Gemini.',
    tags: ['Python', 'Streamlit', 'Gemini 2.0', 'Google GenAI SDK'],
    links: [['GitHub', 'https://github.com/alejandro-xoxo/HachatonCampuslans2026.git', true]] },
  { id: 'erp', num: '03 / 05', title: 'ERP Colegio Little Horizons', color: 0xffd95c, pos: [26, -22], shape: 'stack',
    text: 'Notas, clubes, inventario y facturación de un colegio de 500+ estudiantes en una sola base de datos.',
    tags: ['Java 17', 'MySQL 8', 'Maven', 'JDBC'],
    links: [['GitHub', 'https://github.com/juanpabloquuu7-del/little-horizons-erp-v2', true]] },
  { id: 'ecommerce', num: '04 / 05', title: 'E-commerce SPA de Moda', color: 0x8fd8d0, pos: [-34, 8], shape: 'knot',
    text: 'Velocidad de SPA moderna sin un solo framework de por medio.',
    tags: ['HTML5', 'CSS3', 'JavaScript ES6+', 'Web Components'],
    links: [['Ver sitio en vivo', 'https://juanpabloquuu7-del.github.io/Proyecto_E-commerce_quintanillajuan/#/', true], ['GitHub', 'https://github.com/juanpabloquuu7-del/Proyecto_E-commerce_quintanillajuan.git']] },
  { id: 'comunidad', num: '05 / 05', title: 'Sistema de Gestión Comunitaria', color: 0xffa385, pos: [34, 8], shape: 'dodeca',
    text: 'Administra vecinos, inventario y préstamos de una comunidad, sin base de datos.',
    tags: ['Python', 'JSON', 'POO', 'Logging'],
    links: [['GitHub', 'https://github.com/juanpabloquuu7-del/python.git', true]] },
  { id: 'sobre-mi', num: 'SOBRE MÍ', title: 'Juan Pablo Quintanilla', color: 0x7dffce, pos: [-18, 34], shape: 'sphere',
    text: 'Desarrollador frontend de Bucaramanga, Colombia. JavaScript vanilla, Web Components y three.js; también Python con IA y Java con MySQL. Busco mi primer rol junior y hago freelance para pymes.',
    tags: ['Frontend', 'three.js', 'Python / IA', 'Java'],
    links: [['Ver CV', '../cv.pdf', true], ['GitHub', 'https://github.com/juanpabloquuu7-del']] },
  { id: 'contacto', num: 'CONTACTO', title: 'Hablemos', color: 0x22d6a3, pos: [18, 34], shape: 'mail',
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
renderer.setPixelRatio(Math.min(devicePixelRatio, isTouch ? 1.5 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const BG = 0x07110d;
const scene = new THREE.Scene();
scene.background = new THREE.Color(BG);
scene.fog = new THREE.Fog(BG, 45, 150);

const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 400);
const resize = () => {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w < h ? 72 : 58;
  camera.updateProjectionMatrix();
};
addEventListener('resize', resize); resize();

/* Luces */
scene.add(new THREE.HemisphereLight(0xbfffe6, 0x0b2a20, 1.1));
const sun = new THREE.DirectionalLight(0xe8fff6, 2.2);
sun.position.set(30, 50, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 140 });
sun.shadow.bias = -0.0004;
scene.add(sun, sun.target);

/* Suelo con cuadrícula */
const WORLD_R = 62;
{
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#0c2219'; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = 'rgba(34,214,163,0.20)'; g.lineWidth = 2;
  g.strokeRect(1, 1, 510, 510);
  g.strokeStyle = 'rgba(34,214,163,0.07)'; g.lineWidth = 1;
  for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, 512); g.moveTo(0, i * 128); g.lineTo(512, i * 128); g.stroke(); }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(40, 40);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const ground = new THREE.Mesh(new THREE.CircleGeometry(WORLD_R + 18, 96), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0.0 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  scene.add(ground);
  // borde luminoso
  const ring = new THREE.Mesh(new THREE.RingGeometry(WORLD_R, WORLD_R + 0.35, 128), new THREE.MeshBasicMaterial({ color: 0x22d6a3, transparent: true, opacity: 0.55 }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; scene.add(ring);
}

/* Estrellas */
{
  const n = 600, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, r = 120 + Math.random() * 60;
    pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = 20 + Math.random() * 90; pos[i * 3 + 2] = Math.sin(a) * r;
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xbfffe6, size: 0.9, sizeAttenuation: false, transparent: true, opacity: 0.7, fog: false })));
}

/* ---------- Colisiones (círculos) ---------- */
const statics = []; // {x,z,r}
const props = [];   // {mesh,x,z,vx,vz,r,m,spin}

/* ---------- Zonas ---------- */
const zoneObjs = [];
const makeSign = (z) => {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 400;
  const g = c.getContext('2d');
  const hex = '#' + z.color.toString(16).padStart(6, '0');
  g.fillStyle = 'rgba(8,24,18,0.94)'; g.fillRect(0, 0, 1024, 400);
  g.fillStyle = hex; g.fillRect(0, 0, 1024, 14);
  g.strokeStyle = 'rgba(213,239,230,0.3)'; g.lineWidth = 4; g.strokeRect(2, 2, 1020, 396);
  g.fillStyle = hex; g.font = '600 38px Consolas, monospace'; g.fillText(z.num, 48, 84);
  g.fillStyle = '#e2f4ed'; g.font = '700 66px system-ui, Segoe UI, sans-serif';
  const words = z.title.split(' '); const lines = []; let cur = '';
  words.forEach((w) => { const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > 920 && cur) { lines.push(cur); cur = w; } else cur = t; });
  lines.push(cur);
  lines.slice(0, 3).forEach((l, i) => g.fillText(l, 48, 168 + i * 78));
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return tex;
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

ZONES.forEach((z) => {
  const col = new THREE.Color(z.color);
  const g = new THREE.Group(); g.position.set(z.pos[0], 0, z.pos[1]);
  // pad
  const pad = new THREE.Mesh(new THREE.CircleGeometry(7, 64), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.1, depthWrite: false }));
  pad.rotation.x = -Math.PI / 2; pad.position.y = 0.03; g.add(pad);
  const ring = new THREE.Mesh(new THREE.RingGeometry(6.7, 7, 64), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.85, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04; g.add(ring);
  // objeto
  const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.35, metalness: 0.2, emissive: col, emissiveIntensity: 0.28 });
  const obj = shapeMesh(z, mat); obj.position.set(0, 0, 0); g.add(obj);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 2, 0.5, 6), new THREE.MeshStandardMaterial({ color: 0x0f2a22, roughness: 0.6 }));
  base.position.y = 0.25; base.castShadow = base.receiveShadow = true; g.add(base);
  // cartel (mira al centro del mundo)
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 2.9), new THREE.MeshBasicMaterial({ map: makeSign(z), toneMapped: false }));
  sign.position.set(0, 8.8, 0);
  sign.scale.setScalar(1.4); sign.position.y = 9.6;
  g.add(sign);
  const glow = new THREE.PointLight(col, 18, 16, 1.6); glow.position.set(0, 3, 0); g.add(glow);
  scene.add(g);
  g.lookAt(0, 0, 0); // el cartel (cara +z) mira al centro del mundo
  statics.push({ x: z.pos[0], z: z.pos[1], r: 2.2 });
  zoneObjs.push({ z, g, obj, pad, ring });
});

/* Senderos desde el inicio */
ZONES.forEach((z) => {
  const len = Math.hypot(z.pos[0], z.pos[1]) - 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.35, len), new THREE.MeshBasicMaterial({ color: new THREE.Color(z.color), transparent: true, opacity: 0.18, depthWrite: false }));
  const ang = Math.atan2(z.pos[0], z.pos[1]);
  m.rotation.order = 'YXZ'; m.rotation.set(-Math.PI / 2, ang, 0);
  m.position.set(Math.sin(ang) * (len / 2 + 2), 0.025, Math.cos(ang) * (len / 2 + 2));
  scene.add(m);
});

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
const rnd = (a, b) => a + Math.random() * (b - a);
// pila de cajas frente al inicio y conos en arco
for (let i = 0; i < 3; i++) for (let j = 0; j < 3 - i; j++) addProp('crate', -2.7 + i * 1.8 + j * 0.9, -11 - j * 1.8);
for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; addProp('cone', Math.sin(a) * 12, Math.cos(a) * 12 - 2); }
for (let i = 0; i < 6; i++) addProp('ball', rnd(-18, 18), rnd(2, 24));
for (let i = 0; i < 14; i++) {
  let x, z, ok;
  do { x = rnd(-50, 50); z = rnd(-45, 45); ok = Math.hypot(x, z) < WORLD_R - 4 && statics.every((s) => Math.hypot(s.x - x, s.z - z) > 9) && Math.hypot(x, z) > 7; } while (!ok);
  addProp('crate', x, z);
}

/* ---------- Carro ---------- */
const car = new THREE.Group();
const bodyMat = new THREE.MeshStandardMaterial({ color: 0x22d6a3, roughness: 0.3, metalness: 0.45 });
const darkMat = new THREE.MeshStandardMaterial({ color: 0x0a1511, roughness: 0.4, metalness: 0.3 });
const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.6, 3.4), bodyMat); body.position.y = 0.75; body.castShadow = true;
const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 1.6), darkMat); cabin.position.set(0, 1.28, -0.2); cabin.castShadow = true;
const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.5), darkMat); spoiler.position.set(0, 1.35, -1.6);
const hood = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.12, 0.9), bodyMat); hood.position.set(0, 1.08, 1.05);
car.add(body, cabin, spoiler, hood);
const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff6d0 });
const tailMat = new THREE.MeshBasicMaterial({ color: 0xff4d4d });
[-0.6, 0.6].forEach((x) => {
  const hl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.08), lightMat); hl.position.set(x, 0.8, 1.72); car.add(hl);
  const tl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.08), tailMat); tl.position.set(x, 0.85, -1.72); car.add(tl);
});
const beam = new THREE.SpotLight(0xfff6d0, 60, 34, 0.5, 0.6, 1.4);
beam.position.set(0, 1, 1.5); beam.target.position.set(0, 0, 10); car.add(beam, beam.target);
const wheels = [];
const wheelGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.38, 20); wheelGeo.rotateZ(Math.PI / 2);
[[-1.05, 1.1], [1.05, 1.1], [-1.05, -1.1], [1.05, -1.1]].forEach(([x, z], i) => {
  const piv = new THREE.Group(); piv.position.set(x, 0.46, z);
  const w = new THREE.Mesh(wheelGeo, darkMat); w.castShadow = true; piv.add(w);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.4, 10).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x7dffce, metalness: 0.7, roughness: 0.3 })); w.add(hub);
  car.add(piv); wheels.push({ piv, w, front: i < 2 });
});
scene.add(car);

/* Estado del carro */
const S = { x: 0, z: 4, h: Math.PI, vx: 0, vz: 0, steer: 0, rollV: 0, boost: 0 };
const START = { x: 0, z: 4, h: Math.PI };
const camPos = new THREE.Vector3(); let camInit = false;

/* ---------- Entrada ---------- */
const keys = new Set();
addEventListener('keydown', (e) => {
  if (e.target.closest && e.target.closest('.overlay.open') && e.key !== 'Escape') return;
  const k = e.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  if (k === 'escape') closeOvs();
  if (k === 'r') resetCar();
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

function resetCar() { Object.assign(S, START, { vx: 0, vz: 0, steer: 0 }); }

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

/* ---------- Bucle ---------- */
const clock = new THREE.Clock();
const fwd = new THREE.Vector3(), tmp = new THREE.Vector3();
const MAX_V = 24, BOOST_V = 36;

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

  // límite del mundo
  const d = Math.hypot(S.x, S.z);
  if (d > WORLD_R - 1.5) {
    const nx = S.x / d, nz = S.z / d; S.x = nx * (WORLD_R - 1.5); S.z = nz * (WORLD_R - 1.5);
    const vn = S.vx * nx + S.vz * nz; if (vn > 0) { S.vx -= 1.6 * vn * nx; S.vz -= 1.6 * vn * nz; }
  }

  // colisiones carro ↔ estáticos y props
  const CR = 1.35;
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
      }
    }
  });
  // props: movimiento, fricción, bordes y choques
  props.forEach((p, i) => {
    p.x += p.vx * dt; p.z += p.vz * dt;
    const f = Math.exp(-1.7 * dt); p.vx *= f; p.vz *= f; p.spin *= f;
    const pd = Math.hypot(p.x, p.z); if (pd > WORLD_R - 1) { const nx = p.x / pd, nz = p.z / pd; p.x = nx * (WORLD_R - 1); p.z = nz * (WORLD_R - 1); const vn = p.vx * nx + p.vz * nz; if (vn > 0) { p.vx -= 1.8 * vn * nx; p.vz -= 1.8 * vn * nz; } }
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
  car.rotation.set(0, S.h, 0);
  body.rotation.z = S.rollV; cabin.rotation.z = S.rollV;
  const spin = (vf * dt) / 0.46;
  wheels.forEach((w) => { w.w.rotation.x += spin; if (w.front) w.piv.rotation.y = S.steer * 0.5; });
  return { vf, sp, thr };
}

function updateZones(t) {
  let found = null;
  zoneObjs.forEach((zo) => {
    zo.obj.rotation.y = reduced ? 0 : t * 0.5; zo.obj.position.y = reduced ? 0 : Math.sin(t * 1.4 + zo.z.pos[0]) * 0.25;
    const d = Math.hypot(S.x - zo.z.pos[0], S.z - zo.z.pos[1]);
    const inside = d < 7.2;
    zo.pad.material.opacity += ((inside ? 0.28 : 0.1) - zo.pad.material.opacity) * 0.15;
    if (inside) found = zo.z;
  });
  if (found !== activeZone) showZone(found);
}

function frame() {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  const m = step(dt);
  updateZones(t);

  // cámara
  const fxx = Math.sin(S.h), fzz = Math.cos(S.h);
  const back = 11 + Math.min(m.sp, 30) * 0.12;
  tmp.set(S.x - fxx * back, 6.2 + Math.min(m.sp, 30) * 0.05, S.z - fzz * back);
  if (!camInit) { camPos.copy(tmp); camInit = true; }
  camPos.lerp(tmp, 1 - Math.exp(-4.2 * dt));
  camera.position.copy(camPos);
  camera.lookAt(S.x + fxx * 4.5, 1.2, S.z + fzz * 4.5);

  sun.position.set(S.x + 30, 50, S.z + 20); sun.target.position.set(S.x, 0, S.z);

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

resetCar();
requestAnimationFrame(() => { frame(); $('loading').classList.add('done'); });
