import * as THREE from 'three';
import { buildAE86, tryLoadAE86Model, toonify, makeToonGradient, makeStudioEnv, animateAE86, mergeMeshes } from './ae86.js';

// Adelanto del mundo 3D en la portada: el AE86 parqueado en una avenida del mundo abierto, con el
// atardecer de Bucaramanga al fondo, un rayo de luz por cada proyecto y un poste que señala hacia ellos.
// La cámara da la vuelta al carro (se puede arrastrar). Se carga al acercarse a la sección y se pausa fuera de pantalla.
// Equipos normales: carro de Blender con reflejos. Celulares y equipos modestos: carro procedural en estilo caricatura.
const view = document.getElementById('car-view');
const canvas = document.getElementById('car-canvas');
const GUIDES = [   // mismos nombres, colores y orden que en el mundo
  ['Hotel Chicamocha', 0x22d6a3], ['Campus Guardian Access AI', 0xb3a8ff], ['ERP Little Horizons', 0xffd95c], ['E-commerce LUMIÈRE', 0x8fd8d0],
  ['Gestión Comunitaria', 0xffa385], ['Sobre mí', 0x7dffce], ['Contacto', 0x22d6a3],
];
if (view && canvas) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let started = false;

  const start = () => {
    if (started) return; started = true;
    const coarse = matchMedia('(hover: none) and (pointer: coarse)').matches;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: !coarse, alpha: true }); }
    catch { view.hidden = true; return; }
    const lowEnd = coarse || (navigator.hardwareConcurrency || 8) <= 4;
    renderer.setPixelRatio(Math.min(devicePixelRatio, lowEnd ? 1.25 : 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    const HORIZON = 0xf6b27a;
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(HORIZON, 60, 430);
    const camera = new THREE.PerspectiveCamera(36, 1.6, 0.1, 600);
    scene.add(new THREE.HemisphereLight(0xffe6c4, 0x8e7cc0, lowEnd ? 1.3 : 0.9));
    const key = new THREE.DirectionalLight(0xfff1d6, lowEnd ? 2.4 : 2.0); key.position.set(-6, 7, 5); scene.add(key);

    // el paisaje no usa luces: colores planos (por vértice o por instancia), sin pasar por el mapeo de tonos
    const flatMat = (p = {}) => new THREE.MeshBasicMaterial({ toneMapped: false, ...p });
    const rand = (() => { let t = 11; return () => ((t = (t * 16807) % 2147483647) - 1) / 2147483646; })();
    const col = new THREE.Color();

    // ----- Cielo de atardecer (mismo degradado del mundo) -----
    {
      const c = document.createElement('canvas'); c.width = 4; c.height = 256; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
      [[0, '#2d2a86'], [0.3, '#6a3fa6'], [0.44, '#e4608e'], [0.5, '#ff9a5a'], [0.535, '#ffd37a'], [0.56, '#f6b27a'], [1, '#f6b27a']].forEach(([s, k]) => gr.addColorStop(s, k));
      g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      const sky = new THREE.Mesh(new THREE.SphereGeometry(480, 24, 16), flatMat({ map: t, side: THREE.BackSide, fog: false, depthWrite: false }));
      sky.renderOrder = -2; scene.add(sky);
    }

    // ----- Suelo: pasto hasta la bruma, avenida con sus líneas (una malla) -----
    const ground = new THREE.Mesh(new THREE.CircleGeometry(520, 40), flatMat({ color: 0x58bb5c })); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.03; scene.add(ground);
    {
      const P = [], C = [], I = [];
      const quad = (x0, z0, x1, z1, y, hex) => { const n = P.length / 3; col.setHex(hex); P.push(x0, y, z0, x0, y, z1, x1, y, z1, x1, y, z0); for (let i = 0; i < 4; i++) C.push(col.r, col.g, col.b); I.push(n, n + 1, n + 2, n, n + 2, n + 3); };
      quad(-3.5, -260, 3.5, 260, 0, 0x4d5666);                                         // avenida
      quad(3.5, -4.5, 7.2, 5.5, 0, 0x4d5666);                                          // bahía donde está parqueado el carro
      [-3.15, 3.15].forEach((x) => { quad(x - 0.07, -260, x + 0.07, x > 0 ? -4.5 : 260, 0.012, 0xd9d9d2); if (x > 0) quad(x - 0.07, 5.5, x + 0.07, 260, 0.012, 0xd9d9d2); });
      for (let z = -258; z < 258; z += 6) quad(-0.1, z, 0.1, z + 2.4, 0.012, 0xe9b93a);  // línea central
      [-4.5, 5.5].forEach((z) => quad(3.5, z - 0.07, 7.2, z + 0.07, 0.012, 0xd9d9d2));
      quad(7.13, -4.5, 7.27, 5.5, 0.012, 0xd9d9d2);
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setIndex(I);
      scene.add(new THREE.Mesh(g, flatMat({ vertexColors: true })));
    }

    // ----- Horizonte: cerros verdes y montañas moradas (una malla), edificios y árboles instanciados -----
    {
      const far = new THREE.Group(), white = flatMat({ vertexColors: true });
      for (let i = 0; i < 26; i++) {
        const hill = i % 2 === 0, a = (i / 26) * Math.PI * 2 + rand() * 0.2, r = hill ? 190 + rand() * 40 : 300 + rand() * 60, rad = hill ? 40 + rand() * 40 : 70 + rand() * 60, h = hill ? 16 + rand() * 26 : 60 + rand() * 80;
        const m = new THREE.Mesh(hill ? new THREE.SphereGeometry(1, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2) : new THREE.ConeGeometry(1, 1, 7), new THREE.MeshBasicMaterial({ color: hill ? (i % 4 ? 0x4fb86a : 0x66c777) : (i % 4 === 1 ? 0x6a5cb8 : 0x7f70cc) }));
        m.scale.set(rad, h, rad); m.position.set(Math.cos(a) * r, hill ? -1 : h / 2 - 2, Math.sin(a) * r); far.add(m);
      }
      mergeMeshes(THREE, far, (o) => ({ key: 'far', material: white, color: o.material.color }), far); scene.add(far);
      const o = new THREE.Object3D();
      const NB = lowEnd ? 26 : 46, city = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), flatMat(), NB), tones = [0xff9aa2, 0xffd166, 0x9be7c4, 0x8ec5ff, 0xc9a7ff, 0xffb88c, 0xf4f1de];
      for (let i = 0; i < NB; i++) {
        const a = rand() * Math.PI * 2, r = 105 + rand() * 60, h = 10 + rand() * 34;
        o.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r); o.rotation.set(0, rand() * 3, 0); o.scale.set(8 + rand() * 10, h, 8 + rand() * 10); o.updateMatrix();
        city.setMatrixAt(i, o.matrix); city.setColorAt(i, col.setHex(tones[i % tones.length]).multiplyScalar(0.82));
      }
      scene.add(city);
      const NT = lowEnd ? 18 : 34, trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3, 0.45, 4, 6), flatMat({ color: 0x5a3d29 }), NT), crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(2.8, 0), flatMat(), NT);
      for (let i = 0; i < NT; i++) {
        let x = 0, z = 0; do { const a = rand() * Math.PI * 2, r = 14 + rand() * 70; x = Math.cos(a) * r; z = Math.sin(a) * r; } while (Math.abs(x) < 9);
        const s = 0.8 + rand() * 0.8;
        o.rotation.set(0, rand() * 6, 0); o.scale.setScalar(s); o.position.set(x, 2 * s, z); o.updateMatrix(); trunks.setMatrixAt(i, o.matrix);
        o.position.y = 5.2 * s; o.updateMatrix(); crowns.setMatrixAt(i, o.matrix); crowns.setColorAt(i, col.setHex(i % 3 ? 0x4fcf6e : 0x3fb85f));
      }
      scene.add(trunks, crowns);
    }

    // ----- Guías: un rayo de luz por proyecto y un poste con una flecha hacia cada uno -----
    {
      const N = GUIDES.length, spots = GUIDES.map((_, i) => { const a = -2.5 + (i / (N - 1)) * 5.0 + (i % 2 ? 0.12 : -0.08), r = 44 + (i % 3) * 13; return [Math.sin(a) * r, Math.cos(a) * r]; });
      const c = document.createElement('canvas'); c.width = 4; c.height = 128; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 128);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0.95)'); g.fillStyle = gr; g.fillRect(0, 0, 4, 128);
      const beams = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.6, 1.1, 1, 10, 1, true).translate(0, 0.5, 0), flatMat({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, fog: false }), N);
      const o = new THREE.Object3D();
      spots.forEach(([x, z], i) => { o.position.set(x, 0, z); o.scale.set(1.6, 46, 1.6); o.updateMatrix(); beams.setMatrixAt(i, o.matrix); beams.setColorAt(i, col.setHex(GUIDES[i][1])); });
      beams.renderOrder = 2; scene.add(beams);

      // poste de direcciones: tablas con el nombre de cada proyecto, legibles por los dos lados
      const tc = document.createElement('canvas'); tc.width = tc.height = 512; const tg = tc.getContext('2d'), RH = 64;
      GUIDES.forEach(([name, hex], i) => {
        const y = i * RH, css = '#' + hex.toString(16).padStart(6, '0');
        tg.fillStyle = '#0b1c17'; tg.fillRect(0, y, 512, RH); tg.fillStyle = css; tg.fillRect(0, y, 58, RH); tg.fillRect(0, y, 512, 4); tg.fillRect(0, y + RH - 4, 512, 4);
        tg.fillStyle = '#06140f'; tg.font = '800 40px system-ui, Segoe UI, Arial, sans-serif'; tg.textAlign = 'center'; tg.textBaseline = 'middle'; tg.fillText(String(i + 1), 29, y + RH / 2 + 2);
        let size = 36; do { tg.font = `700 ${size}px system-ui, Segoe UI, Arial, sans-serif`; size -= 2; } while (tg.measureText(name).width > 430 && size > 16);
        tg.fillStyle = '#f2f2ee'; tg.textAlign = 'left'; tg.fillText(name, 70, y + RH / 2 + 2);
      });
      tg.fillStyle = '#ffffff'; tg.fillRect(0, 448, 512, 64);
      const tex = new THREE.CanvasTexture(tc); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
      const PX = 8.4, PZ = 3.2, P = [], U = [], C = [], I = [], X0 = 0.12, X1 = 2.75, XT = 3.05, H = 0.36;
      GUIDES.forEach(([, hex], i) => {
        const [bx, bz] = spots[i], th = Math.atan2(bx - PX, bz - PZ), dx = Math.sin(th), dz = Math.cos(th), nx = dz, nz = -dx, y0 = 3.3 - i * 0.41, y1 = y0 + H;
        col.setHex(hex);
        [1, -1].forEach((sd) => {   // dos caras: el texto se lee desde ambos lados
          const n = P.length / 3, ox = nx * 0.03 * sd, oz = nz * 0.03 * sd, v0 = 1 - (i + 1) * RH / 512, v1 = 1 - i * RH / 512;
          [[X0, y0, 0, v0], [X1, y0, 1, v0], [X1, y1, 1, v1], [X0, y1, 0, v1], [X1, y0, 0.5, 0.06], [XT, (y0 + y1) / 2, 0.5, 0.06], [X1, y1, 0.5, 0.06]].forEach(([l, y, u, v], k) => {
            P.push(PX + dx * l + ox, y, PZ + dz * l + oz); U.push(sd > 0 ? 1 - u : u, v);
            if (k < 4) C.push(1, 1, 1); else C.push(col.r, col.g, col.b);
          });
          if (sd > 0) I.push(n, n + 2, n + 1, n, n + 3, n + 2, n + 4, n + 6, n + 5); else I.push(n, n + 1, n + 2, n, n + 2, n + 3, n + 4, n + 5, n + 6);
        });
      });
      const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); sg.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); sg.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); sg.setIndex(I);
      scene.add(new THREE.Mesh(sg, flatMat({ map: tex, vertexColors: true })));
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 3.9, 8), flatMat({ color: 0x22302c })); pole.position.set(PX, 1.95, PZ); scene.add(pole);
    }

    // ----- Carro -----
    const envMap = lowEnd ? null : makeStudioEnv(THREE, renderer, { accent: 0xff9a5a, base: 0x2a2748 });
    const toonGrad = makeToonGradient(THREE);
    const built = buildAE86(THREE, { detail: false });   // ligero: es el carro final en equipos modestos y el provisional en los demás
    const car = built.group; car.position.set(5.3, 0, 0.4);
    toonify(THREE, car, toonGrad);
    scene.add(car);
    // sombra de contacto bajo el carro
    const sc = document.createElement('canvas'); sc.width = 64; sc.height = 128; const sg2 = sc.getContext('2d');
    sg2.translate(32, 64); sg2.scale(1, 2);
    const sgr = sg2.createRadialGradient(0, 0, 9, 0, 0, 32); sgr.addColorStop(0, 'rgba(8,6,20,0.95)'); sgr.addColorStop(0.6, 'rgba(8,6,20,0.6)'); sgr.addColorStop(1, 'rgba(8,6,20,0)');
    sg2.fillStyle = sgr; sg2.fillRect(-32, -32, 64, 64);
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 5.3), flatMat({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false, opacity: 0.7 }));
    blob.rotation.x = -Math.PI / 2; blob.position.set(car.position.x, 0.03, car.position.z); blob.renderOrder = 1; scene.add(blob);

    let lightsOn = false;
    if (!lowEnd) tryLoadAE86Model(THREE, built, './models/ae86-v2.glb', envMap, false, toonGrad).then((ok) => { if (ok) setTimeout(() => { lightsOn = true; }, 700); });   // los faros suben al terminar de cargar

    // arrastrar para dar la vuelta al carro
    let drag = null, yaw = -1.6, vel = 0, swing = 0;   // la cámara se queda del lado de la avenida: el poste nunca tapa el carro
    view.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, yaw }; view.setPointerCapture(e.pointerId); });
    view.addEventListener('pointermove', (e) => { if (drag) { const nyaw = drag.yaw - (e.clientX - drag.x) * 0.012; vel = nyaw - yaw; yaw = nyaw; } });
    const end = () => { drag = null; };
    view.addEventListener('pointerup', end); view.addEventListener('pointercancel', end);

    const resize = () => {
      const w = view.clientWidth, h = view.clientHeight; if (!w || !h) return;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    new ResizeObserver(resize).observe(view); resize();

    let visible = true, last = performance.now(), running = false;
    const loop = () => {
      if (!visible) { running = false; return; }
      const now = performance.now(), dt = Math.min((now - last) / 1000, 0.05); last = now;
      if (!drag) { vel *= Math.exp(-3 * dt); yaw += vel; if (!reduced) swing += dt; }
      const a = yaw + Math.sin(swing * 0.24) * 0.7;
      const cx = car.position.x, cz = car.position.z;
      camera.position.set(cx + Math.sin(a) * 7.8, 1.95, cz + Math.cos(a) * 7.8); camera.lookAt(cx, 1.15, cz);
      animateAE86(built, dt, { lights: lightsOn });
      renderer.render(scene, camera);
      requestAnimationFrame(loop);
    };
    new IntersectionObserver((list) => { visible = list[list.length - 1].isIntersecting;   // la última entrada es la vigente
       if (visible && !running) { running = true; last = performance.now(); loop(); } }).observe(view);
    window.__teaser = { renderer, scene, built, camera };
  };

  new IntersectionObserver((en, obs) => { if (en.some((e) => e.isIntersecting)) { obs.disconnect(); start(); } }, { rootMargin: '200px' }).observe(view);
}
