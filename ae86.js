// Toyota Sprinter Trueno AE86 (hatchback clásico, "panda") hecho con geometría procedural.
// Se usa tanto en el mundo 3D como en la sección de la portada.
// Ejes: +z = frente del carro, +x = izquierda, +y = arriba. Largo ≈ 4.2, ancho ≈ 1.65.

export function buildAE86(THREE, opts = {}) {
  const group = new THREE.Group();   // todo el carro
  const shell = new THREE.Group();   // carrocería (se puede inclinar sin mover las ruedas)
  group.add(shell);

  const white = new THREE.MeshStandardMaterial({ color: opts.paint ?? 0xe9eeeb, roughness: 0.3, metalness: 0.2 });
  const black = new THREE.MeshStandardMaterial({ color: 0x050606, roughness: 0.6, metalness: 0.1 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x05090c, roughness: 0.35, metalness: 0.15 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xcfd6d3, roughness: 0.2, metalness: 0.9 });
  const lampOn = new THREE.MeshBasicMaterial({ color: 0xfff4cf });
  const tail = new THREE.MeshBasicMaterial({ color: 0xff2b2b });
  const amber = new THREE.MeshBasicMaterial({ color: 0xffb347 });

  const part = (geo, mat, x, y, z, parent = shell) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m;
  };

  // Extruye una silueta lateral (z, y) a lo ancho del carro
  const extrudeSide = (pts, depth, bevel) => {
    const sh = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y)));
    const geo = new THREE.ExtrudeGeometry(sh, bevel
      ? { depth, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: 4 }
      : { depth, bevelEnabled: false });
    geo.translate(0, 0, -depth / 2);
    geo.rotateY(-Math.PI / 2);
    return geo;
  };

  // Carrocería: capó bajo y recto, techo corto, ventana trasera muy inclinada (hatchback)
  const profile = [
    [-2.08, 0.34], [2.08, 0.34], [2.1, 0.55], [2.08, 0.70],
    [1.90, 0.77], [0.88, 0.86], [0.38, 1.27], [-0.82, 1.29],
    [-1.72, 0.96], [-2.06, 0.90], [-2.1, 0.60],
  ];
  part(extrudeSide(profile, 1.5, 0.05), white, 0, 0, 0);

  // Ventanas laterales
  part(extrudeSide([[0.80, 0.93], [0.42, 1.225], [-0.80, 1.245], [-1.50, 0.97]], 1.64, 0), glass, 0, 0, 0);
  // Parabrisas y luneta (planos orientados según la pendiente)
  const slab = (w, h, cz, cy, nz, ny, mat) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    const n = new THREE.Vector3(0, ny, nz).normalize();
    m.position.set(0, cy + n.y * 0.075, cz + n.z * 0.075);
    m.lookAt(m.position.clone().add(n));
    shell.add(m); return m;
  };
  slab(1.28, 0.54, 0.62, 1.07, 0.40, 0.49, glass);
  slab(1.28, 0.78, -1.27, 1.12, -0.34, 0.85, glass);

  // Capó negro, rejilla y parachoques
  const hood = part(new THREE.BoxGeometry(1.46, 0.03, 1.06), black, 0, 0.9, 1.42);
  hood.rotation.x = 0.078;
  part(new THREE.BoxGeometry(1.5, 0.06, 0.02), black, 0, 0.77, 2.13);
  part(new THREE.BoxGeometry(1.62, 0.2, 0.12), black, 0, 0.5, 2.1);
  part(new THREE.BoxGeometry(0.9, 0.08, 0.14), black, 0, 0.36, 2.13);
  part(new THREE.BoxGeometry(1.62, 0.2, 0.12), black, 0, 0.46, -2.1);
  // Faros escamoteables (abiertos a medias) y luces
  [-0.56, 0.56].forEach((x) => {
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.1, 20), lampOn);
    lamp.rotation.x = Math.PI / 2; lamp.position.set(x, 0.86, 1.98); shell.add(lamp);
    part(new THREE.CylinderGeometry(0.175, 0.175, 0.07, 20).rotateX(Math.PI / 2), chrome, x, 0.86, 1.93);
    part(new THREE.BoxGeometry(0.2, 0.08, 0.05), amber, x * 1.42, 0.5, 2.165);
  });
  // Calaveras traseras y placa
  [-1, 1].forEach((s) => {
    part(new THREE.BoxGeometry(0.5, 0.16, 0.04), tail, s * 0.56, 0.72, -2.11);
    part(new THREE.BoxGeometry(0.16, 0.16, 0.04), tail, s * 0.88, 0.72, -2.1);
  });
  part(new THREE.BoxGeometry(0.4, 0.1, 0.03), new THREE.MeshStandardMaterial({ color: 0xe8e8e8 }), 0, 0.5, -2.17);
  // Zócalos laterales negros, retrovisores y manijas
  [-1, 1].forEach((s) => {
    part(new THREE.BoxGeometry(0.03, 0.1, 3.0), black, s * 0.8, 0.4, 0);
    part(new THREE.BoxGeometry(0.1, 0.1, 0.16), black, s * 0.86, 1.0, 0.72);
    part(new THREE.BoxGeometry(0.03, 0.03, 0.22), chrome, s * 0.795, 0.9, 0.05);
  });
  // Spoiler pequeño sobre la luneta
  part(new THREE.BoxGeometry(1.4, 0.04, 0.22), black, 0, 1.0, -1.98);

  // Ruedas (llanta con 6 rayos) y pasos de rueda oscuros
  const tireGeo = new THREE.CylinderGeometry(0.31, 0.31, 0.2, 28).rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.215, 24).rotateZ(Math.PI / 2);
  const spokeGeo = new THREE.BoxGeometry(0.03, 0.42, 0.05);
  const wheels = [];
  [[-0.8, 1.2], [0.8, 1.2], [-0.8, -1.2], [0.8, -1.2]].forEach(([x, z], i) => {
    const piv = new THREE.Group(); piv.position.set(x, 0.31, z);
    const w = new THREE.Mesh(tireGeo, black); w.castShadow = true; piv.add(w);
    w.add(new THREE.Mesh(rimGeo, chrome));
    for (let k = 0; k < 6; k++) {
      const sp = new THREE.Mesh(spokeGeo, chrome);
      sp.rotation.x = (k / 6) * Math.PI;
      sp.position.x = Math.sign(x) * 0.105;
      w.add(sp);
    }
    group.add(piv);
    wheels.push({ piv, w, front: i < 2 });
    const arch = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.02, 24).rotateZ(Math.PI / 2), black);
    arch.position.set(Math.sign(x) * 0.795, 0.31, z); group.add(arch);
  });

  return { group, shell, wheels };
}
