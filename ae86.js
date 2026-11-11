// Toyota Sprinter Trueno AE86 (hatchback clásico, "panda") hecho con geometría procedural.
// Se usa tanto en el mundo 3D como en la sección de la portada.
// Ejes: +z = frente del carro, +x = izquierda, +y = arriba. Largo ≈ 4.2, ancho ≈ 1.65.
// opts.envMap: textura de entorno para reflejos de pintura, vidrio y cromo.
// opts.detail: false = versión ligera (celulares); por defecto alta calidad con miles de polígonos.

export function buildAE86(THREE, opts = {}) {
  const hq = opts.detail !== false;
  const group = new THREE.Group();   // todo el carro
  const shell = new THREE.Group();   // carrocería (se puede inclinar sin mover las ruedas)
  group.add(shell);
  const env = opts.envMap || null;

  const mat = (Cls, p, k = 1) => { const m = new Cls(p); if (env) { m.envMap = env; m.envMapIntensity = k; } return m; };
  const hdr = (r, g, b) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), toneMapped: false });

  // Materiales
  const white = mat(THREE.MeshPhysicalMaterial, { color: opts.paint ?? 0xf1f4f2, roughness: 0.24, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.04, sheen: 0.3, sheenColor: new THREE.Color(0xdfeaff) }, 1.0);
  const black = mat(THREE.MeshPhysicalMaterial, { color: 0x060707, roughness: 0.34, metalness: 0.1, clearcoat: 0.7, clearcoatRoughness: 0.15 }, 0.7);
  const plastic = mat(THREE.MeshStandardMaterial, { color: 0x0c0d0d, roughness: 0.78, metalness: 0.05 }, 0.3);
  const rubberTrim = mat(THREE.MeshStandardMaterial, { color: 0x070808, roughness: 0.85, metalness: 0 }, 0.2);
  const glass = mat(THREE.MeshPhysicalMaterial, { color: 0x03070a, roughness: 0.02, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0 }, 2.0);
  const chrome = mat(THREE.MeshStandardMaterial, { color: 0xe4eae7, roughness: 0.08, metalness: 1 }, 1.4);
  const rimMat = mat(THREE.MeshStandardMaterial, { color: 0xd2d9d6, roughness: 0.16, metalness: 1 }, 1.3);
  const rubber = mat(THREE.MeshStandardMaterial, { color: 0x090909, roughness: 0.95, metalness: 0 }, 0.12);
  const discMat = mat(THREE.MeshStandardMaterial, { color: 0x6f7374, roughness: 0.4, metalness: 0.9 }, 0.9);
  const caliper = new THREE.MeshStandardMaterial({ color: 0xc8261f, roughness: 0.45, metalness: 0.35 });
  const lampOn = hdr(3.0, 2.8, 2.3);
  const lampLens = mat(THREE.MeshPhysicalMaterial, { color: 0xeef3ee, roughness: 0.03, metalness: 0, clearcoat: 1, transparent: true, opacity: 0.45 }, 1.6);
  const reflector = mat(THREE.MeshStandardMaterial, { color: 0xbfc5c3, roughness: 0.15, metalness: 1 }, 1.2);
  const tail = new THREE.MeshStandardMaterial({ color: 0xb91212, emissive: 0xff1a1a, emissiveIntensity: 1.6, roughness: 0.2 });
  const amber = new THREE.MeshStandardMaterial({ color: 0xffa530, emissive: 0xff8c10, emissiveIntensity: 1.0, roughness: 0.3 });

  const part = (geo, m, x, y, z, parent = shell) => {
    const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o;
  };

  // Suaviza una silueta cerrada cortando esquinas (Chaikin)
  const chaikin = (pts, it) => {
    let p = pts;
    for (let k = 0; k < it; k++) {
      const q = [];
      for (let i = 0; i < p.length; i++) {
        const a = p[i], b = p[(i + 1) % p.length];
        q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
      }
      p = q;
    }
    return p;
  };
  // El techo es más angosto que la base (tumblehome), como en un carro real
  const taper = (geo, amount = 0.13) => {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i), t = Math.min(Math.max((y - 0.72) / 0.58, 0), 1), s = 1 - amount * t * t * (3 - 2 * t);
      pos.setX(i, pos.getX(i) * s);
    }
    geo.computeVertexNormals();
    return geo;
  };
  // Extruye una silueta lateral (z, y) a lo ancho del carro
  const extrudeSide = (pts, depth, bevel, smooth = 0) => {
    const pp = smooth ? chaikin(pts, smooth) : pts;
    const sh = new THREE.Shape(pp.map(([z, y]) => new THREE.Vector2(z, y)));
    const geo = new THREE.ExtrudeGeometry(sh, bevel
      ? { depth, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel * 1.2, bevelSegments: hq ? 10 : 4, curveSegments: 4 }
      : { depth, bevelEnabled: false });
    geo.translate(0, 0, -depth / 2);
    geo.rotateY(-Math.PI / 2);
    geo.computeVertexNormals();
    return geo;
  };

  // ---------- Carrocería ----------
  // Vidrio transparente (se ve el interior) en alta calidad; opaco en la versión ligera
  const glassClear = mat(THREE.MeshPhysicalMaterial, { color: 0x0b161b, roughness: 0.03, metalness: 0, transparent: true, opacity: 0.2, depthWrite: false, clearcoat: 1, clearcoatRoughness: 0 }, 2.4);
  const slab = (w, h, cz, cy, nz, ny, m, grow = 0.085, geo = null) => {
    const o = new THREE.Mesh(geo || new THREE.PlaneGeometry(w, h), m);
    const n = new THREE.Vector3(0, ny, nz).normalize();
    o.position.set(0, cy + n.y * grow, cz + n.z * grow);
    o.lookAt(o.position.clone().add(n));
    shell.add(o); return o;
  };
  // Marco de goma con hueco (deja ver el interior)
  const frameGeo = (w, h, t) => {
    const sh = new THREE.Shape(); sh.moveTo(-w / 2, -h / 2); sh.lineTo(w / 2, -h / 2); sh.lineTo(w / 2, h / 2); sh.lineTo(-w / 2, h / 2); sh.closePath();
    const hole = new THREE.Path(); hole.moveTo(-w / 2 + t, -h / 2 + t); hole.lineTo(-w / 2 + t, h / 2 - t); hole.lineTo(w / 2 - t, h / 2 - t); hole.lineTo(w / 2 - t, -h / 2 + t); hole.closePath();
    sh.holes.push(hole); return new THREE.ShapeGeometry(sh);
  };
  const SIDE_GLASS = [[0.80, 0.93], [0.43, 1.225], [-0.78, 1.245], [-0.78, 0.96]];

  if (!hq) {
    // Versión ligera: carrocería sólida y vidrio opaco
    const profile = [
      [-2.06, 0.36], [2.06, 0.36], [2.09, 0.52], [2.08, 0.68],
      [1.92, 0.755], [0.90, 0.845], [0.40, 1.265], [-0.82, 1.285],
      [-1.72, 0.96], [-2.04, 0.895], [-2.08, 0.60],
    ];
    part(taper(extrudeSide(profile, 1.46, 0.07, 1)), white, 0, 0, 0);
    part(new THREE.BoxGeometry(1.5, 0.12, 3.9), plastic, 0, 0.33, 0);
    part(taper(extrudeSide([[0.80, 0.93], [0.43, 1.225], [-0.80, 1.245], [-1.50, 0.97]], 1.64, 0)), glass, 0, 0, 0);
    slab(1.26, 0.54, 0.62, 1.07, 0.40, 0.49, glass);
    slab(1.26, 0.78, -1.27, 1.12, -0.34, 0.85, glass);
  } else {
    // ---- Alta calidad: carrocería por piezas con cabina hueca ----
    part(new THREE.BoxGeometry(1.5, 0.12, 3.9), plastic, 0, 0.33, 0);                                  // falda inferior
    part(taper(extrudeSide([[0.82, 0.36], [2.06, 0.36], [2.09, 0.52], [2.08, 0.68], [1.92, 0.755], [0.90, 0.845], [0.82, 0.9]], 1.46, 0.07, 3)), white, 0, 0, 0);   // bloque del motor
    part(taper(extrudeSide([[-1.5, 0.36], [-2.06, 0.36], [-2.08, 0.60], [-2.04, 0.895], [-1.72, 0.96], [-1.5, 0.96]], 1.46, 0.07, 3)), white, 0, 0, 0);            // bloque trasero
    part(taper(extrudeSide([[0.44, 1.268], [-0.86, 1.29], [-0.86, 1.25], [0.47, 1.228]], 1.44, 0.012, 0)), white, 0, 0, 0);                                        // techo
    [-1, 1].forEach((sd) => {
      const door = extrudeSide([[0.86, 0.36], [-1.52, 0.36], [-1.52, 0.955], [-0.4, 0.96], [0.8, 0.935], [0.86, 0.9]], 0.07, 0.012, 0); door.translate(sd * 0.765, 0, 0); taper(door);
      part(door, white, 0, 0, 0);                                                                                                                                       // puerta
      const quarter = extrudeSide([[-0.78, 1.29], [-1.72, 0.965], [-1.5, 0.955], [-0.78, 0.955]], 0.1, 0.01, 0); quarter.translate(sd * 0.71, 0, 0); taper(quarter);
      part(quarter, white, 0, 0, 0);                                                                                                                                    // panel trasero (pilar C)
      const sg = extrudeSide(SIDE_GLASS, 0.012, 0, 0); sg.translate(sd * 0.8, 0, 0); taper(sg);
      part(sg, glassClear, 0, 0, 0);                                                                                                                                    // ventana lateral
      const ap = part(new THREE.BoxGeometry(0.05, 0.05, 0.58), white, sd * 0.69, 1.075, 0.63); ap.rotation.x = 0.657;                                                    // pilar A
      part(new THREE.BoxGeometry(0.02, 0.4, 1.3), plastic, sd * 0.725, 0.69, 0.1);                                                                                      // tarjeta de puerta
      part(new THREE.BoxGeometry(0.06, 0.05, 0.4), plastic, sd * 0.7, 0.86, 0.1);                                                                                       // apoyabrazos
    });
    slab(1.26, 0.54, 0.62, 1.07, 0.40, 0.49, glassClear);
    slab(0, 0, 0.62, 1.07, 0.40, 0.49, rubberTrim, 0.082, frameGeo(1.32, 0.6, 0.045));
    slab(1.26, 0.78, -1.27, 1.12, -0.34, 0.85, glassClear);
    slab(0, 0, -1.27, 1.12, -0.34, 0.85, rubberTrim, 0.082, frameGeo(1.32, 0.84, 0.045));

    // ---- Interior ----
    const fabric = mat(THREE.MeshStandardMaterial, { color: 0x1b1d1f, roughness: 0.95, metalness: 0 }, 0.15);
    const fabric2 = mat(THREE.MeshStandardMaterial, { color: 0x2a2d30, roughness: 0.95, metalness: 0 }, 0.15);
    const leather = mat(THREE.MeshStandardMaterial, { color: 0x0a0a0a, roughness: 0.7, metalness: 0 }, 0.25);
    const rbox = (w, h, d, r = 0.045) => {
      const sh = new THREE.Shape();
      sh.moveTo(-w / 2 + r, -h / 2); sh.lineTo(w / 2 - r, -h / 2); sh.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
      sh.lineTo(w / 2, h / 2 - r); sh.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); sh.lineTo(-w / 2 + r, h / 2); sh.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
      sh.lineTo(-w / 2, -h / 2 + r); sh.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
      const g = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 3, curveSegments: 6 });
      g.translate(0, 0, -d / 2); return g;
    };
    part(new THREE.BoxGeometry(1.44, 0.04, 2.7), fabric2, 0, 0.43, -0.1);                              // piso
    part(new THREE.BoxGeometry(1.3, 0.02, 1.25), fabric2, 0, 1.215, -0.2);                             // techo interior
    part(new THREE.BoxGeometry(1.32, 0.05, 0.5), fabric2, 0, 0.74, -1.43);                             // piso del portaequipajes
    // tablero, consola y volante (conductor a la izquierda, como en Colombia)
    part(rbox(1.34, 0.13, 0.4, 0.04), plastic, 0, 0.9, 0.62);
    part(rbox(0.5, 0.12, 0.26, 0.04), plastic, 0.38, 0.99, 0.58);
    const gc = document.createElement('canvas'); gc.width = 256; gc.height = 128; const gg = gc.getContext('2d');
    gg.fillStyle = '#050505'; gg.fillRect(0, 0, 256, 128);
    [[72, 64], [184, 64]].forEach(([cx, cy], i) => {
      gg.strokeStyle = '#e9e9e9'; gg.lineWidth = 4; gg.beginPath(); gg.arc(cx, cy, 48, Math.PI * 0.75, Math.PI * 2.25); gg.stroke();
      gg.strokeStyle = '#ff5a1f'; gg.lineWidth = 5; gg.beginPath(); gg.moveTo(cx, cy); gg.lineTo(cx + Math.cos(2.5 + i * 0.7) * 40, cy + Math.sin(2.5 + i * 0.7) * 40); gg.stroke();
    });
    const gt = new THREE.CanvasTexture(gc); gt.colorSpace = THREE.SRGBColorSpace;
    const gauges = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.2), new THREE.MeshBasicMaterial({ map: gt, toneMapped: false }));
    gauges.position.set(0.38, 0.99, 0.449); gauges.rotation.set(-0.12, Math.PI, 0); shell.add(gauges);
    part(rbox(0.22, 0.2, 0.78, 0.05), plastic, 0, 0.58, 0.12);                                          // consola central
    part(new THREE.CylinderGeometry(0.012, 0.012, 0.2, 10), chrome, 0, 0.78, 0.2);                      // palanca
    part(new THREE.SphereGeometry(0.03, 16, 12), leather, 0, 0.89, 0.2);
    part(new THREE.TorusGeometry(0.17, 0.016, 14, 48), leather, 0.38, 0.99, 0.32).rotation.x = 0.35;     // volante
    part(new THREE.BoxGeometry(0.3, 0.02, 0.02), leather, 0.38, 0.99, 0.32).rotation.x = 0.35;
    part(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 12).rotateX(Math.PI / 2), plastic, 0.38, 0.95, 0.46);
    part(new THREE.BoxGeometry(0.2, 0.05, 0.02), plastic, 0, 1.17, 0.5);                                // espejo retrovisor
    // asientos delanteros (cuna, respaldo y apoyacabezas) y banca trasera
    [-0.38, 0.38].forEach((x) => {
      part(rbox(0.46, 0.12, 0.52), fabric, x, 0.56, -0.05);
      part(rbox(0.1, 0.1, 0.5), fabric2, x - Math.sign(x) * 0.2, 0.62, -0.05);                          // lateral del asiento
      const back = part(rbox(0.46, 0.6, 0.11), fabric, x, 0.93, -0.38); back.rotation.x = -0.18;
      const head = part(rbox(0.22, 0.2, 0.09, 0.06), fabric, x, 1.27, -0.45); head.rotation.x = -0.18;
    });
    part(rbox(1.3, 0.12, 0.42), fabric, 0, 0.58, -1.0);
    const rb = part(rbox(1.3, 0.5, 0.1), fabric, 0, 0.88, -1.25); rb.rotation.x = -0.2;
    // pedales y alfombra
    part(new THREE.BoxGeometry(0.06, 0.02, 0.1), black, 0.3, 0.52, 0.52);
    part(new THREE.BoxGeometry(0.06, 0.02, 0.1), black, 0.4, 0.52, 0.52);
    part(new THREE.BoxGeometry(0.06, 0.02, 0.1), black, 0.5, 0.52, 0.52);
  }
  [-1, 1].forEach((sd) => part(new THREE.BoxGeometry(0.02, 0.028, 1.72), chrome, sd * 0.822, 0.935, -0.34));   // moldura cromada bajo la ventana
  part(new THREE.BoxGeometry(0.62, 0.012, 0.02), black, -0.1, 0.95, 0.93);   // limpiaparabrisas
  part(new THREE.BoxGeometry(0.4, 0.01, 0.02), black, 0.5, 0.945, 0.9);

  // Capó, rejilla, parachoques
  part(new THREE.BoxGeometry(1.44, 0.03, 1.06), black, 0, 0.92, 1.42).rotation.x = 0.078;
  part(new THREE.BoxGeometry(0.34, 0.012, 0.9), plastic, 0, 0.94, 1.42).rotation.x = 0.078;
  part(new THREE.BoxGeometry(1.46, 0.05, 0.03), black, 0, 0.775, 2.135);
  const grille = new THREE.Group(); grille.position.set(0, 0.7, 2.16); shell.add(grille);
  part(new THREE.BoxGeometry(0.64, 0.11, 0.025), plastic, 0, 0, 0, grille);
  for (let i = 0; i < (hq ? 5 : 2); i++) part(new THREE.BoxGeometry(0.6, 0.008, 0.03), chrome, 0, -0.04 + i * 0.02, 0.005, grille);
  part(new THREE.BoxGeometry(1.64, 0.2, 0.12), black, 0, 0.5, 2.1);
  part(new THREE.BoxGeometry(0.86, 0.07, 0.14), plastic, 0, 0.38, 2.135);
  part(new THREE.BoxGeometry(0.5, 0.012, 0.03), chrome, 0, 0.58, 2.17);
  if (hq) {
    for (let i = 0; i < 6; i++) part(new THREE.BoxGeometry(0.52, 0.006, 0.02), plastic, 0, 0.405 + i * 0.012, 2.205);   // toma de aire inferior
  }
  part(new THREE.BoxGeometry(1.64, 0.2, 0.12), black, 0, 0.46, -2.1);

  // Faros: carcasa, reflector, aro cromado, lente y bombillo
  const seg = hq ? 48 : 20;
  [-0.56, 0.56].forEach((x) => {
    part(new THREE.CylinderGeometry(0.195, 0.195, 0.08, seg).rotateX(Math.PI / 2), black, x, 0.86, 1.95);
    part(new THREE.CylinderGeometry(0.18, 0.18, 0.05, seg).rotateX(Math.PI / 2), chrome, x, 0.86, 1.985);
    part(new THREE.ConeGeometry(0.15, 0.08, seg).rotateX(-Math.PI / 2), reflector, x, 0.86, 1.99);
    part(new THREE.SphereGeometry(0.15, seg, 12, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2), lampLens, x, 0.86, 2.0);
    part(new THREE.SphereGeometry(0.045, 20, 12), lampOn, x, 0.86, 2.0);
    part(new THREE.TorusGeometry(0.178, 0.008, 8, seg), chrome, x, 0.86, 2.012);
    part(new THREE.BoxGeometry(0.2, 0.08, 0.05), amber, x * 1.42, 0.5, 2.165);
    part(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 24).rotateX(Math.PI / 2), lampOn, x * 0.84, 0.43, 2.17);
    part(new THREE.TorusGeometry(0.058, 0.007, 8, 24), chrome, x * 0.84, 0.43, 2.172);
  });
  // Parte trasera: panel negro, calaveras segmentadas, reversa, placa, escape
  part(new THREE.BoxGeometry(1.5, 0.2, 0.04), black, 0, 0.73, -2.115);
  [-1, 1].forEach((s) => {
    for (let i = 0; i < 3; i++) part(new THREE.BoxGeometry(0.14, 0.17, 0.05), tail, s * (0.4 + i * 0.165), 0.73, -2.125);
    part(new THREE.BoxGeometry(0.14, 0.15, 0.05), tail, s * 0.9, 0.73, -2.11);
    part(new THREE.BoxGeometry(0.1, 0.05, 0.04), lampOn, s * 0.28, 0.66, -2.13);
    part(new THREE.BoxGeometry(0.46, 0.012, 0.055), black, s * 0.58, 0.82, -2.127);
  });
  const plateCv = document.createElement('canvas'); plateCv.width = 256; plateCv.height = 64;
  const pg = plateCv.getContext('2d'); pg.fillStyle = '#f2c230'; pg.fillRect(0, 0, 256, 64);
  pg.strokeStyle = '#1a1a1a'; pg.lineWidth = 4; pg.strokeRect(3, 3, 250, 58);
  pg.fillStyle = '#111'; pg.font = '700 40px Arial, sans-serif'; pg.textAlign = 'center'; pg.fillText('AE 86', 128, 46);
  const plateTex = new THREE.CanvasTexture(plateCv); plateTex.colorSpace = THREE.SRGBColorSpace; plateTex.anisotropy = 8;
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.1), new THREE.MeshStandardMaterial({ map: plateTex, roughness: 0.5 }));
  plate.position.set(0, 0.5, -2.185); plate.rotation.y = Math.PI; shell.add(plate);
  part(new THREE.BoxGeometry(0.42, 0.12, 0.02), black, 0, 0.5, -2.172);
  const tip = part(new THREE.CylinderGeometry(0.048, 0.05, 0.16, 32).rotateX(Math.PI / 2), chrome, 0.55, 0.38, -2.165);
  void tip;
  part(new THREE.CylinderGeometry(0.036, 0.036, 0.17, 24).rotateX(Math.PI / 2), black, 0.55, 0.38, -2.168);

  // Laterales: zócalos, manijas, cortes de puerta, retrovisores, tapa de combustible
  [-1, 1].forEach((s) => {
    part(new THREE.BoxGeometry(0.035, 0.1, 3.0), black, s * 0.8, 0.43, 0);
    const handle = part(new THREE.BoxGeometry(0.03, 0.025, 0.2), chrome, s * 0.806, 0.84, 0.0);
    void handle;
    part(new THREE.BoxGeometry(0.02, 0.05, 0.24), black, s * 0.803, 0.84, 0.0);
    part(new THREE.BoxGeometry(0.012, 0.5, 0.012), black, s * 0.815, 0.68, 0.8);
    part(new THREE.BoxGeometry(0.012, 0.5, 0.012), black, s * 0.815, 0.68, -0.36);
    part(new THREE.BoxGeometry(0.012, 0.012, 1.16), black, s * 0.815, 0.44, 0.22);
    part(new THREE.BoxGeometry(0.1, 0.03, 0.04), black, s * 0.87, 0.97, 0.78).rotation.y = s * 0.2;
    const mir = new THREE.Mesh(new THREE.SphereGeometry(0.1, 32, 16), white); mir.scale.set(0.55, 0.9, 1.5); mir.position.set(s * 0.95, 1.0, 0.76); mir.castShadow = true; shell.add(mir);
    part(new THREE.BoxGeometry(0.012, 0.085, 0.14), glass, s * 0.975, 1.0, 0.76);
    part(new THREE.CylinderGeometry(0.045, 0.045, 0.01, 24).rotateZ(Math.PI / 2), black, s * 0.81, 0.92, -1.62);                 // tapa de combustible
    part(new THREE.CylinderGeometry(0.03, 0.03, 0.012, 20).rotateZ(Math.PI / 2), amber, s * 0.805, 0.62, 1.88);                  // luz lateral
    part(new THREE.BoxGeometry(0.014, 0.012, 3.1), chrome, s * 0.805, 0.585, 0.0);                                               // filete cromado lateral
  });
  part(new THREE.CylinderGeometry(0.006, 0.006, 0.7, 8), black, -0.62, 1.02, 0.55);                                               // antena
  // Spoiler pequeño sobre la luneta
  part(new THREE.BoxGeometry(1.4, 0.035, 0.2), black, 0, 1.01, -1.98);
  part(new THREE.BoxGeometry(0.025, 0.07, 0.16), black, 0.62, 0.98, -1.98);
  part(new THREE.BoxGeometry(0.025, 0.07, 0.16), black, -0.62, 0.98, -1.98);
  // Tercera luz de freno
  part(new THREE.BoxGeometry(0.5, 0.025, 0.03), tail, 0, 1.065, -1.98);

  // ---------- Ruedas ----------
  const lathe = (pts, sg) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), sg).rotateZ(Math.PI / 2);
  const rs = hq ? 72 : 32;
  const tireGeo = lathe([[0.2, -0.1], [0.24, -0.104], [0.27, -0.102], [0.298, -0.092], [0.312, -0.07], [0.318, -0.04], [0.319, 0], [0.318, 0.04], [0.312, 0.07], [0.298, 0.092], [0.27, 0.102], [0.24, 0.104], [0.2, 0.1]], rs);
  const rimGeo = lathe([[0.0, 0.07], [0.12, 0.078], [0.2, 0.085], [0.222, 0.1], [0.23, 0.092], [0.228, 0.06], [0.2, 0.05], [0.0, 0.05]], rs);
  const spokeGeo = new THREE.BoxGeometry(0.02, 0.4, 0.04);
  const capGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.03, 32).rotateZ(Math.PI / 2);
  const lugGeo = new THREE.CylinderGeometry(0.013, 0.013, 0.024, 6).rotateZ(Math.PI / 2);
  const discGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.02, hq ? 64 : 24).rotateZ(Math.PI / 2);
  const holeGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.024, 8).rotateZ(Math.PI / 2);
  const treadGeo = new THREE.BoxGeometry(0.16, 0.022, 0.048);
  const wheels = [];
  [[-0.8, 1.2], [0.8, 1.2], [-0.8, -1.2], [0.8, -1.2]].forEach(([x, z], i) => {
    const side = Math.sign(x);
    const piv = new THREE.Group(); piv.position.set(x, 0.318, z);
    const w = new THREE.Group(); piv.add(w);
    const tire = new THREE.Mesh(tireGeo, rubber); tire.castShadow = true; w.add(tire);
    const rim = new THREE.Mesh(rimGeo, rimMat); rim.position.x = side * 0.01; w.add(rim);
    for (let k = 0; k < 4; k++) {
      const sp = new THREE.Mesh(spokeGeo, rimMat);
      sp.rotation.x = (k / 4) * Math.PI + Math.PI / 8; sp.position.x = side * 0.092; w.add(sp);
    }
    const cap = new THREE.Mesh(capGeo, chrome); cap.position.x = side * 0.1; w.add(cap);
    w.add(new THREE.Mesh(discGeo, discMat));
    if (hq) {
      for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2, lug = new THREE.Mesh(lugGeo, chrome); lug.position.set(side * 0.108, Math.cos(a) * 0.085, Math.sin(a) * 0.085); w.add(lug); }
      // banda de rodadura: bloques instanciados alrededor del neumático
      const NT = 60, tread = new THREE.InstancedMesh(treadGeo, rubber, NT), d = new THREE.Object3D();
      for (let k = 0; k < NT; k++) { const a = (k / NT) * Math.PI * 2; d.position.set(0, Math.cos(a) * 0.321, Math.sin(a) * 0.321); d.rotation.set(a, 0, 0); d.updateMatrix(); tread.setMatrixAt(k, d.matrix); }
      w.add(tread);
      // disco ventilado: agujeros
      const holes = new THREE.InstancedMesh(holeGeo, black, 24);
      for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2, r = 0.09 + (k % 2) * 0.04; d.position.set(0, Math.cos(a) * r, Math.sin(a) * r); d.rotation.set(0, 0, 0); d.updateMatrix(); holes.setMatrixAt(k, d.matrix); }
      w.add(holes);
    }
    const cal = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.11, 0.13), caliper); cal.position.set(0, 0.12, 0.09); piv.add(cal);
    group.add(piv);
    mergeMeshes(THREE, w, byMaterial, w);
    wheels.push({ piv, w, front: i < 2 });
    // paso de rueda: fondo oscuro y labio de la carrocería
    const arch = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.02, hq ? 64 : 32).rotateZ(Math.PI / 2), plastic);
    arch.position.set(side * 0.795, 0.318, z); group.add(arch);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.405, 0.022, hq ? 16 : 10, hq ? 72 : 36, Math.PI).rotateY(Math.PI / 2), white);
    lip.position.set(side * 0.81, 0.318, z); lip.castShadow = true; group.add(lip);
  });

  // Une las piezas por material: de ~100 draw calls a unas 35
  mergeMeshes(THREE, shell, byMaterial, shell);
  mergeMeshes(THREE, group, (o) => (o.parent === group ? byMaterial(o) : null), group);
  return { group, shell, wheels };
}


// ---------- Unir mallas (menos draw calls) ----------
// Une las mallas bajo `root` en una sola por grupo y las deja como hijas de `target`.
// pick(malla) -> null (no tocar) | { key, material, color?, flag? }
//   color: se hornea como color por vértice (varios materiales pasan a ser uno solo)
//   flag: atributo `panda` (1 = pintura que recibe el corte de dos tonos)
export const byMaterial = (o) => ({ key: o.material.uuid, material: o.material });
export function mergeMeshes(THREE, root, pick, target = root) {
  root.updateWorldMatrix(true, true); target.updateWorldMatrix(true, false);
  const inv = new THREE.Matrix4().copy(target.matrixWorld).invert();
  const groups = new Map();
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || Array.isArray(o.material) || o.userData.merged) return;
    const p = pick(o); if (!p) return;
    let g = groups.get(p.key); if (!g) groups.set(p.key, g = { material: p.material, items: [], shadow: false, receive: false });
    g.items.push({ o, color: p.color || null, flag: p.flag || 0 });
  });
  const m4 = new THREE.Matrix4(), n3 = new THREE.Matrix3(), v = new THREE.Vector3(), out = [];
  groups.forEach((g, key) => {
    let nv = 0, ni = 0;
    g.items.forEach(({ o }) => { const ge = o.geometry; nv += ge.attributes.position.count; ni += ge.index ? ge.index.count : ge.attributes.position.count; });
    const useUv = !!g.material.map && g.items.every(({ o }) => o.geometry.attributes.uv);
    const useCol = g.items.some((it) => it.color), useFlag = g.items.some((it) => it.flag);
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
    const uv = useUv ? new Float32Array(nv * 2) : null, col = useCol ? new Float32Array(nv * 3) : null, flg = useFlag ? new Float32Array(nv) : null;
    let vo = 0, io = 0, hasNormals = true;
    g.items.forEach(({ o, color, flag }) => {
      const ge = o.geometry, P = ge.attributes.position, N = ge.attributes.normal, U = ge.attributes.uv, n = P.count;
      m4.multiplyMatrices(inv, o.matrixWorld); n3.getNormalMatrix(m4);
      if (!N) hasNormals = false;
      for (let i = 0; i < n; i++) {
        const k = (vo + i) * 3;
        v.fromBufferAttribute(P, i).applyMatrix4(m4); pos[k] = v.x; pos[k + 1] = v.y; pos[k + 2] = v.z;
        if (N) { v.fromBufferAttribute(N, i).applyMatrix3(n3).normalize(); nor[k] = v.x; nor[k + 1] = v.y; nor[k + 2] = v.z; }
        if (uv) { uv[(vo + i) * 2] = U.getX(i); uv[(vo + i) * 2 + 1] = U.getY(i); }
        if (col) { col[k] = color ? color.r : 1; col[k + 1] = color ? color.g : 1; col[k + 2] = color ? color.b : 1; }
        if (flg) flg[vo + i] = flag;
      }
      const cnt = ge.index ? ge.index.count : n, flip = m4.determinant() < 0;
      for (let i = 0; i < cnt; i += 3) {
        const a = (ge.index ? ge.index.getX(i) : i) + vo, b = (ge.index ? ge.index.getX(i + 1) : i + 1) + vo, c = (ge.index ? ge.index.getX(i + 2) : i + 2) + vo;
        idx[io + i] = a; idx[io + i + 1] = flip ? c : b; idx[io + i + 2] = flip ? b : c;
      }
      vo += n; io += cnt;
      if (o.castShadow) g.shadow = true;
      if (o.receiveShadow) g.receive = true;
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    if (uv) geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    if (col) geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    if (flg) geo.setAttribute('panda', new THREE.BufferAttribute(flg, 1));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    if (!hasNormals) geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, g.material);
    mesh.castShadow = g.shadow; mesh.receiveShadow = g.receive; mesh.userData.merged = true; mesh.name = 'unida:' + (g.material.name || key);
    if (g.material.transparent) mesh.renderOrder = 2;
    g.items.forEach(({ o }) => { o.removeFromParent(); o.geometry.dispose(); });
    out.push(mesh);
  });
  out.forEach((m) => target.add(m));
  return out;
}

// Libera de la GPU todo lo que cuelga de un objeto (geometrías, materiales y texturas)
export function disposeTree(root) {
  root.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    ms.forEach((m) => { ['map', 'emissiveMap', 'bumpMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap'].forEach((k) => { if (m[k]) m[k].dispose(); }); m.dispose(); });
  });
}

// ---------- Materiales del carro de Blender ----------
// Siete materiales para todo el carro; los colores van por vértice.
// Con envMap: pintura, metal y vidrio reflejan el entorno (barato: un solo mapa pequeño).
// Sin envMap: sombreado caricatura por bandas.
const SPLIT_Y = 0.585;   // altura del corte "panda": por debajo, la pintura es negra
export function makeCarMaterials(THREE, { envMap = null, toonGradient = null, clearcoat = false } = {}) {
  const keep = (m, name) => { m.name = name; m.userData.keep = true; return m; };
  const toon = (p) => new THREE.MeshToonMaterial({ gradientMap: toonGradient, ...p });
  const gloss = keep(envMap
    ? new (clearcoat ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial)({ vertexColors: true, roughness: 0.16, metalness: 0.0, envMap, envMapIntensity: 1.1, ...(clearcoat ? { clearcoat: 1, clearcoatRoughness: 0.05 } : {}) })
    : toon({ vertexColors: true }), 'pintura');
  // Corte de dos tonos calculado en el shader: nítido aunque los triángulos sean grandes
  gloss.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float panda; varying float vPanda; varying float vCarY;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPanda = panda; vCarY = position.y;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vPanda; varying float vCarY;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        if (vPanda > 0.5) { float pw = max(fwidth(vCarY), 0.0005); diffuseColor.rgb = mix(vec3(0.004), diffuseColor.rgb, smoothstep(${SPLIT_Y.toFixed(3)} - pw, ${SPLIT_Y.toFixed(3)} + pw, vCarY)); }`);
  };
  const matte = keep(envMap ? new THREE.MeshLambertMaterial({ vertexColors: true }) : toon({ vertexColors: true }), 'mate');
  const metal = keep(envMap
    ? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 1, envMap, envMapIntensity: 1.5 })
    : toon({ vertexColors: true }), 'metal');
  const glass = keep(envMap
    ? new THREE.MeshStandardMaterial({ color: 0x0a1418, roughness: 0.03, metalness: 0, transparent: true, opacity: 0.38, depthWrite: false, envMap, envMapIntensity: 2.6 })
    : toon({ color: 0x3f4548, transparent: true, opacity: 0.25, depthWrite: false }), 'vidrio');
  const glow = keep(new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }), 'luces');
  const tail = keep(new THREE.MeshBasicMaterial({ color: 0x8c1010, toneMapped: false }), 'stop');
  const lens = keep(new THREE.MeshBasicMaterial({ color: 0x2a2a2a, toneMapped: false }), 'faro');
  return { gloss, matte, metal, glass, glow, tail, lens };
}

// A qué material va cada material del GLB (por nombre) y con qué color
const BRONZE = 0xa9702f;
function carClass(THREE, m, mats) {
  const c = (hex) => new THREE.Color(hex);
  switch (m.name) {
    case 'paint': return { key: 'gloss', material: mats.gloss, color: c(0xe6e8e4), flag: 1 };
    case 'black': return { key: 'gloss', material: mats.gloss, color: c(0x0b0c0d) };
    case 'glass': return { key: 'glass', material: mats.glass };
    case 'tail': return { key: 'tail', material: mats.tail };
    case 'lamp': case 'amber': return { key: 'glow', material: mats.glow, color: m.color.clone() };
    case 'rim': return { key: 'metal', material: mats.metal, color: c(BRONZE) };
    case 'chrome': case 'disc': return { key: 'metal', material: mats.metal, color: m.color.clone() };
    case 'rubber': return { key: 'matte', material: mats.matte, color: c(0x141414) };
    default:
      if (m.transparent) return { key: 'glass', material: mats.glass };
      return { key: 'matte', material: mats.matte, color: m.color ? m.color.clone() : c(0x202020) };
  }
}

// Faros escamoteables: dos cajas que suben desde las tapas del capó (hechas aquí, no vienen en el GLB)
function addPopups(THREE, built, mats, body) {
  // altura del capó sobre las tapas, leída de los vértices de la carrocería
  const P = body.geometry.attributes.position; let yF = -1, yB = -1;
  for (let i = 0; i < P.count; i++) {
    const x = Math.abs(P.getX(i)), z = P.getZ(i), y = P.getY(i);
    if (x < 0.27 || x > 0.62 || y > 1.0) continue;
    if (z > 1.86 && z < 1.94 && y > yF) yF = y;
    if (z > 1.58 && z < 1.66 && y > yB) yB = y;
  }
  if (yF < 0.5 || yB < 0.5) return null;
  const RISE = 0.098, W = 0.34, D = 0.25, H = 0.2, zc = 1.815;
  const pop = new THREE.Group(); pop.name = 'faros-escamoteables';
  const white = new THREE.Color(0xe6e8e4), dark = new THREE.Color(0x0b0c0d);
  [-1, 1].forEach((sx) => {
    const geo = new THREE.BoxGeometry(W, H, D), p = geo.attributes.position, n = geo.attributes.normal, col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const top = p.getY(i) > 0, t = (p.getZ(i) + D / 2) / D;           // t = 0 atrás, 1 adelante
      const c = n.getY(i) > 0.5 ? white : dark; col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      p.setY(i, top ? (yB + (yF - yB) * t) + RISE : Math.min(yF, yB) - 0.06);
      if (top && t < 0.5) p.setZ(i, p.getZ(i) + 0.07);                    // la cara de atrás va inclinada
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
    const box = new THREE.Mesh(geo, mats.gloss); box.position.set(sx * 0.445, 0, zc); box.castShadow = true; pop.add(box);
    const lens = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.06, RISE - 0.03), mats.lens);
    lens.position.set(sx * 0.445, yF + RISE / 2 - 0.004, zc + D / 2 + 0.004); pop.add(lens);
  });
  built.shell.add(pop);
  return { pop, rise: RISE + 0.012 };
}

// Animación de luces: faros que suben o bajan y luz de freno. Devuelve 0..1 (qué tan arriba están los faros).
const smooth01 = (x, a, b) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
export function animateAE86(built, dt, st = {}) {
  const f = built.fx; if (!f) return 0;
  f.k += ((st.lights ? 1 : 0) - f.k) * Math.min(1, dt * 4.5);
  if (f.pop) { f.pop.position.y = (f.k - 1) * f.rise; f.pop.visible = f.k > 0.02; }
  const on = smooth01(f.k, 0.7, 0.98);
  f.mats.lens.color.setRGB(0.03 + on * 0.97, 0.03 + on * 0.93, 0.03 + on * 0.78);
  f.brake += ((st.brake ? 1 : 0) - f.brake) * Math.min(1, dt * 14);
  f.mats.tail.color.setRGB(0.27 + f.brake * 0.73, 0.012 + f.brake * 0.06, 0.012 + f.brake * 0.04);
  return f.k;
}

// Si existe un modelo hecho en Blender (.glb) lo usa en lugar del carro procedural.
// Se normaliza (tamaño, centro, orientación); el frente se detecta por las ruedas
// (nodos wheel-front-* / wheel-back-*). Con ?flip se invierte el frente.
// Las ruedas se reparentan a pivotes alineados al mundo (dirección y giro funcionan igual que en el carro procedural).
// Todo el carro se une en unas 20 mallas (venía en 58) y el carro procedural se libera de la memoria.
// opts: { clearcoat, drop (m que baja la carrocería), track (m que salen las ruedas) }
export async function tryLoadAE86Model(THREE, built, url, envMap, flip = false, toonGradient = null, opts = {}) {
  // lo que hay ahora (carro procedural) se quita cuando el GLB esté listo; se anota antes de esperar nada
  const old = [...built.shell.children, ...built.group.children.filter((ch) => ch !== built.shell)];
  try {
    const head = await fetch(url, { method: 'HEAD' });
    if (!head.ok) return false;
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    const gltf = await new GLTFLoader().loadAsync(url);
    const model = gltf.scene;
    const holder = new THREE.Group(); holder.add(model);
    let box = new THREE.Box3().setFromObject(model), size = box.getSize(new THREE.Vector3());
    if (size.x > size.z) holder.rotation.y = Math.PI / 2;                     // largo sobre el eje z
    holder.updateMatrixWorld(true);
    const NAMES = ['wheel-front-left', 'wheel-front-right', 'wheel-back-left', 'wheel-back-right'];
    const fl = model.getObjectByName('wheel-front-left'), bl = model.getObjectByName('wheel-back-left');
    if (fl && bl) {
      const pa = fl.getWorldPosition(new THREE.Vector3()), pb = bl.getWorldPosition(new THREE.Vector3());
      if (pa.z < pb.z) holder.rotation.y += Math.PI;                           // el frente debe quedar en +z
    }
    if (flip) holder.rotation.y += Math.PI;
    holder.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(holder); size = box.getSize(new THREE.Vector3());
    holder.scale.setScalar(4.2 / Math.max(size.z, 0.001)); holder.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(holder);
    const c = box.getCenter(new THREE.Vector3());
    // centro lateral por las ruedas (la antena y los espejos descentraban la caja)
    const wn = NAMES.map((n) => model.getObjectByName(n)).filter(Boolean);
    if (wn.length === 4) c.x = wn.reduce((a, n) => a + n.getWorldPosition(new THREE.Vector3()).x, 0) / 4;
    holder.position.set(-c.x, -box.min.y, -c.z); holder.updateMatrixWorld(true);

    const mats = makeCarMaterials(THREE, { envMap, toonGradient, clearcoat: !!opts.clearcoat });

    // ruedas: pivote (dirección, eje Y del mundo) -> giro (eje X del mundo) -> malla unida
    const real = [], track = opts.track ?? 0.012;
    NAMES.forEach((n) => {
      const node = model.getObjectByName(n); if (!node) return;
      node.updateWorldMatrix(true, false);
      const pos = new THREE.Vector3(), quat = new THREE.Quaternion(), scl = new THREE.Vector3();
      node.matrixWorld.decompose(pos, quat, scl);
      node.removeFromParent();
      node.position.set(0, 0, 0); node.quaternion.copy(quat); node.scale.copy(scl);
      const spin = new THREE.Group(); spin.add(node);
      const piv = new THREE.Group(); piv.position.copy(pos); piv.position.x += Math.sign(pos.x) * track; piv.rotation.order = 'YXZ'; piv.add(spin);
      // la mordaza de freno no gira con la rueda: se queda en el pivote
      mergeMeshes(THREE, node, (o) => (o.material.name === 'caliper' ? { key: 'matte', material: mats.matte, color: o.material.color.clone() } : null), piv);
      mergeMeshes(THREE, node, (o) => { const p = carClass(THREE, o.material, mats); return p.key === 'gloss' ? { key: 'matte', material: mats.matte, color: p.color } : p; }, spin);
      spin.remove(node);
      spin.children.forEach((m) => { m.castShadow = m.material === mats.matte; });
      real.push({ piv, w: spin, front: n.includes('front') });
    });

    // carrocería: todo lo demás, unido por tipo de material
    const tmp = new THREE.Group(); tmp.position.y = -(opts.drop ?? 0.025); tmp.add(holder); tmp.updateMatrixWorld(true);
    const srcMats = new Set(); model.traverse((o) => { if (o.isMesh) srcMats.add(o.material); });
    const parts = new THREE.Group(); parts.name = 'ae86-blender';
    const merged = mergeMeshes(THREE, holder, (o) => carClass(THREE, o.material, mats), parts);
    srcMats.forEach((m) => m.dispose());
    merged.forEach((m) => { m.castShadow = m.material === mats.gloss || m.material === mats.matte; });

    // quita y libera el carro procedural
    old.forEach((o) => { o.removeFromParent(); disposeTree(o); });
    built.shell.add(parts);
    real.forEach((r) => built.group.add(r.piv));
    built.wheels.length = 0; real.forEach((r) => built.wheels.push(r));
    const body = merged.find((m) => m.material === mats.gloss);
    const pp = body ? addPopups(THREE, built, mats, body) : null;
    built.fx = { mats, pop: pp ? pp.pop : null, rise: pp ? pp.rise : 0, k: 0, brake: 0 };
    animateAE86(built, 0, {});
    built.realModel = true;
    return true;
  } catch (e) { console.warn('No se pudo cargar el modelo real', e); return false; }
}


// Mapa de entorno pequeño tipo estudio (cajas de luz), generado una sola vez: da reflejos sin descargar ningún HDRI
export function makeStudioEnv(THREE, renderer, { accent = 0x22d6a3, base = 0x0d1513 } = {}) {
  const es = new THREE.Scene();
  const bm = (c, k = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide });
  es.add(new THREE.Mesh(new THREE.SphereGeometry(50, 24, 16), new THREE.MeshBasicMaterial({ color: base, side: THREE.BackSide })));
  const add = (w, h, x, y, z, m) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.set(x, y, z); p.lookAt(0, 0, 0); es.add(p); };
  add(30, 12, 0, 30, 5, bm(0xffffff, 5));        // techo
  add(7, 26, -30, 10, 8, bm(0xffffff, 3));       // franjas laterales
  add(7, 26, 30, 10, -8, bm(0xffffff, 3));
  add(34, 5, 0, 7, -32, bm(accent, 2.2));        // contraluz de color
  const floor = new THREE.Mesh(new THREE.CircleGeometry(60, 24), bm(0x1c2422)); floor.rotation.x = -Math.PI / 2; floor.position.y = -5; es.add(floor);
  const pm = new THREE.PMREMGenerator(renderer), tex = pm.fromScene(es, 0.03).texture; pm.dispose();
  es.traverse((o) => { if (o.geometry) { o.geometry.dispose(); o.material.dispose(); } });
  return tex;
}

// ---------- Estilo caricatura (sombreado por bandas, sin mapas de entorno: gasta mucho menos GPU y RAM) ----------
export function makeToonGradient(THREE) {
  const t = new THREE.DataTexture(new Uint8Array([85, 165, 255]), 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
  return t;
}

export function toonify(THREE, root, grad) {
  const cache = new Map();
  const conv = (m) => {
    if (!m || m.isMeshToonMaterial || m.isMeshBasicMaterial || m.userData.keep) return m;
    if (!(m.isMeshStandardMaterial || m.isMeshPhysicalMaterial || m.isMeshLambertMaterial)) return m;
    if (cache.has(m)) return cache.get(m);
    const n = new THREE.MeshToonMaterial({
      color: m.color.clone(), map: m.map || null, emissive: m.emissive ? m.emissive.clone() : new THREE.Color(0),
      emissiveIntensity: m.emissiveIntensity ?? 1, emissiveMap: m.emissiveMap || null,
      transparent: m.transparent, opacity: m.opacity, side: m.side, gradientMap: grad, vertexColors: m.vertexColors,
    });
    n.name = m.name; n.depthWrite = m.depthWrite;
    if (Object.prototype.hasOwnProperty.call(m, 'onBeforeCompile')) n.onBeforeCompile = m.onBeforeCompile;
    cache.set(m, n); m.dispose();
    return n;
  };
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.material = Array.isArray(o.material) ? o.material.map(conv) : conv(o.material);
  });
}
