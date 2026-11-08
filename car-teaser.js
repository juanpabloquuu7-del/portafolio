import * as THREE from 'three';
import { buildAE86 } from './ae86.js';

// Carro del mundo 3D girando sobre una plataforma. Se carga solo al acercarse
// a la sección y se pausa cuando no está visible.
const view = document.getElementById('car-view');
const canvas = document.getElementById('car-canvas');
if (view && canvas) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let started = false;

  const start = () => {
    if (started) return; started = true;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); }
    catch { view.hidden = true; return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1.6, 0.1, 100);
    camera.position.set(5.2, 2.6, 6.0); camera.lookAt(0, 0.6, 0);
    scene.add(new THREE.HemisphereLight(0xbfffe6, 0x0b2a20, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(4, 7, 5); scene.add(key);
    const rim = new THREE.PointLight(0x22d6a3, 40, 14); rim.position.set(-4, 2, -3); scene.add(rim);

    const car = buildAE86(THREE).group;
    scene.add(car);

    const disc = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.6, 0.2, 64), new THREE.MeshStandardMaterial({ color: 0x0f2a22, roughness: 0.5, metalness: 0.3 }));
    disc.position.y = -0.1; scene.add(disc);
    const ring = new THREE.Mesh(new THREE.RingGeometry(3.2, 3.35, 64), new THREE.MeshBasicMaterial({ color: 0x22d6a3 }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.01; scene.add(ring);

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

    let visible = true, last = performance.now();
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) { last = performance.now(); loop(); } }).observe(view);
    const loop = () => {
      if (!visible) return;
      const now = performance.now(), dt = Math.min((now - last) / 1000, 0.05); last = now;
      if (!drag) { vel *= Math.exp(-3 * dt); yaw += vel + (reduced ? 0 : dt * 0.45); }
      car.rotation.y = yaw; disc.rotation.y = yaw;
      renderer.render(scene, camera);
      requestAnimationFrame(loop);
    };
    loop();
  };

  new IntersectionObserver((en, obs) => { if (en[0].isIntersecting) { obs.disconnect(); start(); } }, { rootMargin: '200px' }).observe(view);
}
