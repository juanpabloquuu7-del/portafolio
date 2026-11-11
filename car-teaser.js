import * as THREE from 'three';
import { buildAE86, tryLoadAE86Model, toonify, makeToonGradient, makeStudioEnv, animateAE86 } from './ae86.js';

// Carro del mundo 3D girando sobre una plataforma de estudio. Se carga solo al acercarse
// a la sección y se pausa cuando no está visible.
// Equipos normales: carro de Blender con reflejos de estudio y piso que lo refleja.
// Celulares y equipos modestos: carro procedural en estilo caricatura, sin reflejos.
const view = document.getElementById('car-view');
const canvas = document.getElementById('car-canvas');
if (view && canvas) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let started = false;

  const start = () => {
    if (started) return; started = true;
    const coarse = matchMedia('(hover: none) and (pointer: coarse)').matches;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: !coarse, alpha: true, stencil: true }); }
    catch { view.hidden = true; return; }
    const lowEnd = coarse || (navigator.hardwareConcurrency || 8) <= 4;
    renderer.setPixelRatio(Math.min(devicePixelRatio, lowEnd ? 1.25 : 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1.6, 0.1, 100);
    camera.position.set(4.8, 2.45, 5.55); camera.lookAt(0, 0.5, 0);
    scene.add(new THREE.HemisphereLight(0xdff5ee, 0x0b2a20, lowEnd ? 0.9 : 0.7));
    const key = new THREE.DirectionalLight(0xffffff, lowEnd ? 2.4 : 2.0); key.position.set(4, 7, 5); scene.add(key);
    const rim = new THREE.PointLight(0x22d6a3, 40, 14); rim.position.set(-4, 2, -3); scene.add(rim);   // contraluz verde de la marca

    const envMap = lowEnd ? null : makeStudioEnv(THREE, renderer);
    const toonGrad = makeToonGradient(THREE);
    const built = buildAE86(THREE, { detail: false });   // ligero: es el carro final en equipos modestos y el provisional en los demás
    const car = built.group;
    toonify(THREE, car, toonGrad);
    scene.add(car);

    // ----- Plataforma -----
    const R = 3.4;
    const side = new THREE.Mesh(new THREE.CylinderGeometry(R, R + 0.2, 0.2, 64, 1, true), new THREE.MeshStandardMaterial({ color: 0x0f2a22, roughness: 0.5, metalness: 0.3 }));
    side.position.y = -0.1; scene.add(side);
    const ring = new THREE.Mesh(new THREE.RingGeometry(R - 0.2, R - 0.05, 64), new THREE.MeshBasicMaterial({ color: 0x22d6a3 }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.012; scene.add(ring);
    // piso: degradado oscuro con brillo central; semitransparente para dejar ver el reflejo del carro
    const fc = document.createElement('canvas'); fc.width = fc.height = 256; const fg = fc.getContext('2d');
    const gr = fg.createRadialGradient(128, 128, 10, 128, 128, 128); gr.addColorStop(0, '#1d4638'); gr.addColorStop(0.55, '#10291f'); gr.addColorStop(1, '#0a1b15');
    fg.fillStyle = gr; fg.fillRect(0, 0, 256, 256);
    const ft = new THREE.CanvasTexture(fc); ft.colorSpace = THREE.SRGBColorSpace;
    const floor = new THREE.Mesh(new THREE.CircleGeometry(R, 64), new THREE.MeshBasicMaterial({ map: ft, transparent: !lowEnd, opacity: lowEnd ? 1 : 0.8, depthWrite: lowEnd }));
    floor.rotation.x = -Math.PI / 2; scene.add(floor);
    // sombra de contacto bajo el carro (gira con él)
    const sc = document.createElement('canvas'); sc.width = 64; sc.height = 128; const sg = sc.getContext('2d');
    sg.translate(32, 64); sg.scale(1, 2);
    const sgr = sg.createRadialGradient(0, 0, 9, 0, 0, 32); sgr.addColorStop(0, 'rgba(0,0,0,0.95)'); sgr.addColorStop(0.6, 'rgba(0,0,0,0.6)'); sgr.addColorStop(1, 'rgba(0,0,0,0)');
    sg.fillStyle = sgr; sg.fillRect(-32, -32, 64, 64);
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 5.3), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false, opacity: 0.8 }));
    blob.rotation.x = -Math.PI / 2; blob.position.y = 0.02; blob.renderOrder = 1; scene.add(blob);

    // ----- Carro de Blender con reflejo en el piso -----
    let mirror = null, mirrorPop = null, mirrorMats = null, lightsOn = false;
    if (!lowEnd) {
      // máscara: el reflejo solo se dibuja donde hay piso
      const mask = new THREE.Mesh(floor.geometry, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp }));
      mask.rotation.x = -Math.PI / 2; mask.renderOrder = -2; scene.add(mask);
      tryLoadAE86Model(THREE, built, './models/ae86.glb', envMap, false, toonGrad).then((ok) => {
        if (!ok) return;
        // reflejo: copia del carro volteada bajo el piso (comparte geometría; solo las piezas opacas)
        mirror = car.clone(true); mirror.scale.y = -1;
        const cache = new Map(), drop = [];
        mirror.traverse((o) => {
          if (!o.isMesh) return;
          if (o.material.transparent) { drop.push(o); return; }
          let m = cache.get(o.material);
          if (!m) {
            m = o.material.clone(); m.onBeforeCompile = o.material.onBeforeCompile;
            m.stencilWrite = true; m.stencilRef = 1; m.stencilFunc = THREE.EqualStencilFunc;
            m.stencilFail = m.stencilZFail = m.stencilZPass = THREE.KeepStencilOp;
            cache.set(o.material, m);
          }
          o.material = m; o.renderOrder = -1; o.castShadow = false;
        });
        drop.forEach((o) => o.removeFromParent());
        mirrorMats = [...cache].filter(([orig]) => orig.isMeshBasicMaterial);   // luces: su color cambia y hay que copiarlo
        mirrorPop = mirror.getObjectByName('faros-escamoteables');
        scene.add(mirror);
        setTimeout(() => { lightsOn = true; }, 700);   // los faros suben al terminar de cargar
      });
    }

    // arrastrar para rotar
    let drag = null, yaw = -0.6, vel = 0;
    view.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, yaw }; view.setPointerCapture(e.pointerId); });
    view.addEventListener('pointermove', (e) => { if (drag) { const nyaw = drag.yaw + (e.clientX - drag.x) * 0.012; vel = nyaw - yaw; yaw = nyaw; } });
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
      if (!drag) { vel *= Math.exp(-3 * dt); yaw += vel + (reduced ? 0 : dt * 0.45); }
      car.rotation.y = yaw; blob.rotation.z = yaw; side.rotation.y = yaw;
      animateAE86(built, dt, { lights: lightsOn });
      if (mirror) { mirror.rotation.y = yaw; if (mirrorPop && built.fx.pop) { mirrorPop.position.y = built.fx.pop.position.y; mirrorPop.visible = built.fx.pop.visible; } mirrorMats.forEach(([orig, cl]) => cl.color.copy(orig.color)); }
      renderer.render(scene, camera);
      requestAnimationFrame(loop);
    };
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible && !running) { running = true; last = performance.now(); loop(); } }).observe(view);
    window.__teaser = { renderer, scene, built };
  };

  new IntersectionObserver((en, obs) => { if (en[0].isIntersecting) { obs.disconnect(); start(); } }, { rootMargin: '200px' }).observe(view);
}
