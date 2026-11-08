// Toyota Sprinter Trueno AE86 (hatchback clásico, "panda") hecho con geometría procedural.
// Se usa tanto en el mundo 3D como en la sección de la portada.
// Ejes: +z = frente del carro, +x = izquierda, +y = arriba. Largo ≈ 4.2, ancho ≈ 1.65.
// opts.envMap: textura de entorno para los reflejos de pintura, vidrio y cromo.

export function buildAE86(THREE, opts = {}) {
  const group = new THREE.Group();   // todo el carro
  const shell = new THREE.Group();   // carrocería (se puede inclinar sin mover las ruedas)
  group.add(shell);
  const env = opts.envMap || null;

  const mat = (Cls, p, k = 1) => { const m = new Cls(p); if (env) { m.envMap = env; m.envMapIntensity = k; } return m; };
  const white = mat(THREE.MeshPhysicalMaterial, { color: opts.paint ?? 0xeef2f0, roughness: 0.28, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.06 }, 0.9);
  const black = mat(THREE.MeshPhysicalMaterial, { color: 0x060707, roughness: 0.38, metalness: 0.1, clearcoat: 0.6, clearcoatRoughness: 0.2 }, 0.6);
  const plastic = mat(THREE.MeshStandardMaterial, { color: 0x0b0c0c, roughness: 0.75, metalness: 0.05 }, 0.3);
  const glass = mat(THREE.MeshPhysicalMaterial, { color: 0x04080b, roughness: 0.04, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0 }, 1.6);
  const chrome = mat(THREE.MeshStandardMaterial, { color: 0xdfe5e2, roughness: 0.12, metalness: 1 }, 1.2);
  const rimMat = mat(THREE.MeshStandardMaterial, { color: 0xc9d0cd, roughness: 0.22, metalness: 0.95 }, 1.1);
  const rubber = mat(THREE.MeshStandardMaterial, { color: 0x080808, roughness: 0.92, metalness: 0 }, 0.15);
  const discMat = mat(THREE.MeshStandardMaterial, { color: 0x6b6f70, roughness: 0.45, metalness: 0.85 }, 0.8);
  const caliper = new THREE.MeshStandardMaterial({ color: 0xc8261f, roughness: 0.5, metalness: 0.3 });
  const lampOn = new THREE.MeshBasicMaterial({ color: 0xfff4cf });
  const lampLens = mat(THREE.MeshPhysicalMaterial, { color: 0xe9eee9, roughness: 0.05, metalness: 0, clearcoat: 1, transparent: true, opacity: 0.55 }, 1.4);
  const tail = new THREE.MeshStandardMaterial({ color: 0xc41414, emissive: 0xff1a1a, emissiveIntensity: 0.9, roughness: 0.25 });
  const amber = new THREE.MeshStandardMaterial({ color: 0xffa530, emissive: 0xff8c10, emissiveIntensity: 0.6, roughness: 0.3 });
  const plate = new THREE.MeshStandardMaterial({ color: 0xececec, roughness: 0.5 });

  const part = (geo, m, x, y, z, parent = shell) => {
    const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o;
  };

  // Extruye una silueta lateral (z, y) a lo ancho del carro
  const extrudeSide = (pts, depth, bevel) => {
    const sh = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y)));
    const geo = new THREE.ExtrudeGeometry(sh, bevel
      ? { depth, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel * 1.2, bevelSegments: 6, curveSegments: 6 }
      : { depth, bevelEnabled: false });
    geo.translate(0, 0, -depth / 2);
    geo.rotateY(-Math.PI / 2);
    geo.computeVertexNormals();
    return geo;
  };

  // Carrocería: capó bajo y recto, techo corto, ventana trasera muy inclinada (hatchback)
  const profile = [
    [-2.06, 0.36], [2.06, 0.36], [2.09, 0.52], [2.08, 0.68],
    [1.92, 0.755], [0.90, 0.845], [0.40, 1.265], [-0.82, 1.285],
    [-1.72, 0.96], [-2.04, 0.895], [-2.08, 0.60],
  ];
  part(extrudeSide(profile, 1.46, 0.07), white, 0, 0, 0);
  // Falda inferior oscura (rellena el hueco bajo la carrocería)
  part(new THREE.BoxGeometry(1.5, 0.12, 3.9), plastic, 0, 0.33, 0);

  // Ventanas laterales con marco
  part(extrudeSide([[0.80, 0.93], [0.43, 1.225], [-0.80, 1.245], [-1.50, 0.97]], 1.64, 0), glass, 0, 0, 0);
  [-1, 1].forEach((s) => part(new THREE.BoxGeometry(0.02, 0.025, 1.7), black, s * 0.825, 0.935, -0.34));
  // Parabrisas y luneta (planos orientados según la pendiente)
  const slab = (w, h, cz, cy, nz, ny, m) => {
    const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
    const n = new THREE.Vector3(0, ny, nz).normalize();
    o.position.set(0, cy + n.y * 0.085, cz + n.z * 0.085);
    o.lookAt(o.position.clone().add(n));
    shell.add(o); return o;
  };
  slab(1.28, 0.54, 0.62, 1.07, 0.40, 0.49, glass);
  slab(1.28, 0.78, -1.27, 1.12, -0.34, 0.85, glass);
  part(new THREE.BoxGeometry(0.62, 0.012, 0.02), black, -0.1, 0.95, 0.93);   // limpiaparabrisas

  // Capó negro con nervio central, rejilla y parachoques
  part(new THREE.BoxGeometry(1.44, 0.03, 1.06), black, 0, 0.92, 1.42).rotation.x = 0.078;
  part(new THREE.BoxGeometry(0.34, 0.012, 0.9), plastic, 0, 0.94, 1.42).rotation.x = 0.078;
  part(new THREE.BoxGeometry(1.46, 0.05, 0.03), black, 0, 0.775, 2.135);
  part(new THREE.BoxGeometry(0.62, 0.1, 0.03), plastic, 0, 0.7, 2.16);        // rejilla
  part(new THREE.BoxGeometry(1.64, 0.2, 0.12), black, 0, 0.5, 2.1);
  part(new THREE.BoxGeometry(0.86, 0.07, 0.14), plastic, 0, 0.38, 2.135);     // spoiler delantero
  part(new THREE.BoxGeometry(1.64, 0.2, 0.12), black, 0, 0.46, -2.1);
  part(new THREE.BoxGeometry(0.5, 0.012, 0.03), chrome, 0, 0.58, 2.17);       // moldura
  // Faros: carcasa, aro cromado, lente y bombillo
  [-0.56, 0.56].forEach((x) => {
    part(new THREE.CylinderGeometry(0.19, 0.19, 0.08, 28).rotateX(Math.PI / 2), black, x, 0.86, 1.95);
    part(new THREE.CylinderGeometry(0.175, 0.175, 0.07, 28).rotateX(Math.PI / 2), chrome, x, 0.86, 1.98);
    part(new THREE.CylinderGeometry(0.15, 0.15, 0.06, 28).rotateX(Math.PI / 2), lampLens, x, 0.86, 2.02);
    part(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 16).rotateX(Math.PI / 2), lampOn, x, 0.86, 2.0);
    part(new THREE.BoxGeometry(0.2, 0.08, 0.05), amber, x * 1.42, 0.5, 2.165);
    part(new THREE.BoxGeometry(0.16, 0.06, 0.04), lampOn, x * 0.84, 0.43, 2.17);   // faro auxiliar
  });
  // Parte trasera: panel negro, calaveras, reversa, placa y escape
  part(new THREE.BoxGeometry(1.5, 0.2, 0.04), black, 0, 0.73, -2.115);
  [-1, 1].forEach((s) => {
    part(new THREE.BoxGeometry(0.46, 0.17, 0.05), tail, s * 0.58, 0.73, -2.125);
    part(new THREE.BoxGeometry(0.14, 0.15, 0.05), tail, s * 0.9, 0.73, -2.11);
    part(new THREE.BoxGeometry(0.1, 0.05, 0.04), lampOn, s * 0.3, 0.66, -2.13);
  });
  part(new THREE.BoxGeometry(0.4, 0.1, 0.03), plate, 0, 0.5, -2.165);
  part(new THREE.CylinderGeometry(0.045, 0.045, 0.14, 16).rotateX(Math.PI / 2), chrome, 0.55, 0.38, -2.16);
  // Laterales: zócalos, manijas, cortes de puerta, retrovisores, antena
  [-1, 1].forEach((s) => {
    part(new THREE.BoxGeometry(0.035, 0.1, 3.0), black, s * 0.8, 0.43, 0);
    part(new THREE.BoxGeometry(0.03, 0.03, 0.22), chrome, s * 0.8, 0.85, 0.05);
    part(new THREE.BoxGeometry(0.012, 0.5, 0.012), black, s * 0.815, 0.68, 0.8);     // corte puerta delantero
    part(new THREE.BoxGeometry(0.012, 0.5, 0.012), black, s * 0.815, 0.68, -0.36);   // corte puerta trasero
    part(new THREE.BoxGeometry(0.012, 0.012, 1.16), black, s * 0.815, 0.44, 0.22);   // corte inferior
    part(new THREE.BoxGeometry(0.1, 0.03, 0.04), black, s * 0.87, 0.97, 0.78).rotation.y = s * 0.2;
    part(new THREE.BoxGeometry(0.06, 0.1, 0.17), white, s * 0.95, 1.0, 0.76);
    part(new THREE.BoxGeometry(0.012, 0.085, 0.14), glass, s * 0.98, 1.0, 0.76);
  });
  part(new THREE.CylinderGeometry(0.006, 0.006, 0.7, 6), black, -0.62, 1.02, 0.55);   // antena
  // Spoiler pequeño sobre la luneta
  part(new THREE.BoxGeometry(1.4, 0.035, 0.2), black, 0, 1.01, -1.98);
  part(new THREE.BoxGeometry(0.025, 0.07, 0.16), black, 0.62, 0.98, -1.98);
  part(new THREE.BoxGeometry(0.025, 0.07, 0.16), black, -0.62, 0.98, -1.98);

  // Ruedas: neumático con hombros redondeados, llanta de 8 rayos, disco y pinza
  const lathe = (pts, seg = 40) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg).rotateZ(Math.PI / 2);
  const tireGeo = lathe([[0.2, -0.1], [0.27, -0.105], [0.305, -0.085], [0.318, -0.04], [0.318, 0.04], [0.305, 0.085], [0.27, 0.105], [0.2, 0.1]]);
  const rimGeo = lathe([[0.0, 0.085], [0.2, 0.085], [0.225, 0.1], [0.23, 0.07], [0.205, 0.06], [0.0, 0.06]]);
  const spokeGeo = new THREE.BoxGeometry(0.02, 0.4, 0.034);
  const capGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.03, 20).rotateZ(Math.PI / 2);
  const discGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.02, 32).rotateZ(Math.PI / 2);
  const wheels = [];
  [[-0.8, 1.2], [0.8, 1.2], [-0.8, -1.2], [0.8, -1.2]].forEach(([x, z], i) => {
    const side = Math.sign(x);
    const piv = new THREE.Group(); piv.position.set(x, 0.318, z);
    const w = new THREE.Mesh(tireGeo, rubber); w.castShadow = true; piv.add(w);
    const rim = new THREE.Mesh(rimGeo, rimMat); rim.position.x = side * 0.01; w.add(rim);
    for (let k = 0; k < 4; k++) {
      const sp = new THREE.Mesh(spokeGeo, rimMat);
      sp.rotation.x = (k / 4) * Math.PI; sp.position.x = side * 0.09; w.add(sp);
    }
    const cap = new THREE.Mesh(capGeo, chrome); cap.position.x = side * 0.1; w.add(cap);
    w.add(new THREE.Mesh(discGeo, discMat));
    const cal = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.12), caliper); cal.position.set(0, 0.12, 0.09); piv.add(cal);
    group.add(piv);
    wheels.push({ piv, w, front: i < 2 });
    // paso de rueda: fondo oscuro y labio de la carrocería
    const arch = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.02, 32).rotateZ(Math.PI / 2), plastic);
    arch.position.set(side * 0.795, 0.318, z); group.add(arch);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.405, 0.022, 10, 36, Math.PI).rotateY(Math.PI / 2), white);
    lip.position.set(side * 0.81, 0.318, z); lip.castShadow = true; group.add(lip);
  });

  return { group, shell, wheels };
}
