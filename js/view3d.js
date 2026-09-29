/* 9 Kings – 3D 表現層（three.js，低多邊形風格）
 * 引擎（state.js / battle.js）不變；這裡只負責把 plots 與 battle.u 畫成 3D。
 * 座標：世界像素 (x,y) → three (x,z)；K 是縮放。 */
(function (NK) {
  'use strict';
  const V = (NK.V3 = { ok: false });
  if (typeof THREE === 'undefined') return;
  const C = NK.CARDS, K_ = NK.KINGS;
  const K = 0.03, WX = 640, WY = 310;
  const px = (x) => (x - WX) * K, pz = (y) => (y - WY) * K;
  V.toWorld = (x3, z3) => ({ x: x3 / K + WX, y: z3 / K + WY });

  /* ───── 材質 / 幾何工具 ───── */
  const matCache = new Map();
  function mat(color, o) {
    o = o || {}; const key = color + (o.emissive || '') + (o.t ? 't' : '');
    let m = matCache.get(key); if (m) return m;
    m = new THREE.MeshLambertMaterial({ color, flatShading: true, emissive: o.emissive || 0x000000, transparent: !!o.t, opacity: o.t || 1 });
    matCache.set(key, m); return m;
  }
  const shade = (hex, f) => { const c = new THREE.Color(hex); c.multiplyScalar(f); return c.getHex(); };
  const hexOf = (s) => new THREE.Color(s).getHex();
  function add(parent, geo, color, x, y, z, o) {
    o = o || {}; const m = new THREE.Mesh(geo, o.mat || mat(color, o));
    m.position.set(x || 0, y || 0, z || 0); if (o.rx) m.rotation.x = o.rx; if (o.ry) m.rotation.y = o.ry; if (o.rz) m.rotation.z = o.rz;
    if (o.s) m.scale.set(o.s[0], o.s[1], o.s[2]);
    m.castShadow = o.noShadow ? false : true; m.receiveShadow = true; parent.add(m); return m;
  }
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const cyl = (rt, rb, h, n) => new THREE.CylinderGeometry(rt, rb, h, n || 8);
  const cone = (r, h, n) => new THREE.ConeGeometry(r, h, n || 6);
  const sph = (r, n) => new THREE.IcosahedronGeometry(r, n || 1);

  /* ───── 人形 / 生物（面向 +z）───── */
  function human(o) {
    const g = new THREE.Group(), b = new THREE.Group(); g.add(b); g.userData.body = b;
    const col = hexOf(o.col), dark = shade(col, 0.6), skin = o.skin || 0xf0c8a0, s = o.big ? 1.25 : 1;
    add(b, box(0.15 * s, 0.34, 0.16 * s), dark, -0.1 * s, 0.17, 0); add(b, box(0.15 * s, 0.34, 0.16 * s), dark, 0.1 * s, 0.17, 0);
    add(b, box(0.44 * s, 0.42, 0.27 * s), col, 0, 0.55, 0);
    add(b, box(0.46 * s, 0.09, 0.29 * s), shade(col, 1.35), 0, 0.36, 0); // 腰帶/下擺
    add(b, box(0.12, 0.34, 0.12), col, -0.29 * s, 0.56, 0); add(b, box(0.12, 0.34, 0.12), col, 0.29 * s, 0.56, 0);
    add(b, sph(0.17), skin, 0, 0.94, 0);
    const hat = o.hat;
    if (hat === 'helm') { add(b, cyl(0.19, 0.19, 0.16, 8), 0xaab0bc, 0, 1.0, 0); add(b, cone(0.06, 0.16, 5), 0xd23a2e, 0, 1.17, 0); }
    else if (hat === 'bigHelm') { add(b, cyl(0.22, 0.22, 0.24, 8), 0x9aa0ac, 0, 1.0, 0); add(b, box(0.05, 0.22, 0.05), 0xd23a2e, 0, 1.2, -0.05); }
    else if (hat === 'hat') { add(b, cone(0.22, 0.5, 6), shade(col, 0.8), 0, 1.25, 0); add(b, cyl(0.28, 0.28, 0.03, 8), shade(col, 0.7), 0, 1.02, 0); }
    else if (hat === 'hood') { add(b, sph(0.2), shade(col, 0.7), 0, 0.98, -0.03, { s: [1, 0.9, 1] }); }
    else if (hat === 'horn') { add(b, cone(0.045, 0.2, 4), 0xf3e6c8, -0.11, 1.12, 0, { rz: 0.4 }); add(b, cone(0.045, 0.2, 4), 0xf3e6c8, 0.11, 1.12, 0, { rz: -0.4 }); }
    const w = o.weapon;
    if (w === 'sword') { add(b, box(0.05, 0.5, 0.05), 0xdfe4ec, 0.32 * s, 0.75, 0.16, { rx: 0.5 }); add(b, box(0.16, 0.04, 0.05), 0xf2c94c, 0.32 * s, 0.53, 0.06, { rx: 0.5 }); }
    if (w === 'shield' || o.shield) add(b, cyl(0.2, 0.2, 0.05, 8), shade(col, 1.4), -0.34 * s, 0.55, 0.05, { rz: Math.PI / 2 });
    if (w === 'hammer') { add(b, box(0.05, 0.6, 0.05), 0x8a5a30, 0.34, 0.75, 0.12, { rx: 0.4 }); add(b, box(0.2, 0.16, 0.16), 0x9aa0ac, 0.34, 1.03, 0.22, { rx: 0.4 }); }
    if (w === 'bow') { const t = add(b, new THREE.TorusGeometry(0.3, 0.025, 4, 10, Math.PI), 0x8a5a30, 0.3, 0.6, 0.12, { rz: -Math.PI / 2, ry: Math.PI / 2 }); }
    if (w === 'staff') { add(b, cyl(0.025, 0.025, 1.1, 5), 0x8a5a30, 0.34, 0.6, 0.05); add(b, sph(0.09), 0x7ee0ff, 0.34, 1.2, 0.05, { emissive: 0x1a6a8a }); }
    if (w === 'axe') { add(b, box(0.05, 0.6, 0.05), 0x8a5a30, 0.34, 0.7, 0.1); add(b, box(0.03, 0.22, 0.2), 0xb0b6c2, 0.34, 0.95, 0.2); }
    if (w === 'bomb') { add(b, sph(0.2), 0x25221f, 0, 0.62, 0.22); add(b, cyl(0.01, 0.01, 0.15, 4), 0xf2c94c, 0, 0.86, 0.22); add(b, sph(0.04), 0xff6a30, 0, 0.95, 0.22, { emissive: 0xff5a10 }); }
    if (w === 'stone') add(b, sph(0.1), 0x9a948a, 0.3, 0.75, 0.12);
    if (w === 'dagger') { add(b, box(0.04, 0.3, 0.04), 0xdfe4ec, 0.3, 0.6, 0.15, { rx: 1 }); }
    return g;
  }
  function beast(o) {
    const g = new THREE.Group(), b = new THREE.Group(); g.add(b); g.userData.body = b;
    const col = hexOf(o.col), dark = shade(col, 0.6), sc = o.sc || 1;
    add(b, box(0.42 * sc, 0.36 * sc, 0.8 * sc), col, 0, 0.5 * sc, 0);
    add(b, box(0.3 * sc, 0.28 * sc, 0.34 * sc), shade(col, 1.15), 0, 0.62 * sc, 0.5 * sc);
    add(b, box(0.16 * sc, 0.12 * sc, 0.16 * sc), 0x3a2a20, 0, 0.55 * sc, 0.72 * sc);
    add(b, cone(0.04, 0.16, 4), 0xf3e6c8, -0.1 * sc, 0.55 * sc, 0.78 * sc, { rx: Math.PI / 2 }); add(b, cone(0.04, 0.16, 4), 0xf3e6c8, 0.1 * sc, 0.55 * sc, 0.78 * sc, { rx: Math.PI / 2 });
    for (const [x, z] of [[-0.14, 0.28], [0.14, 0.28], [-0.14, -0.28], [0.14, -0.28]]) add(b, box(0.1 * sc, 0.34 * sc, 0.1 * sc), dark, x * sc, 0.17 * sc, z * sc);
    add(b, box(0.08, 0.08, 0.3 * sc), dark, 0, 0.6 * sc, -0.5 * sc, { rx: -0.6 });
    if (o.raptor) { add(b, cone(0.1, 0.4, 4), 0x2a8a3a, 0, 0.8 * sc, -0.2 * sc, { rx: -0.9 }); }
    return g;
  }
  function critter(kind, col) {
    const g = new THREE.Group(), b = new THREE.Group(); g.add(b); g.userData.body = b; const c = hexOf(col);
    if (kind === 'rat') { add(b, sph(0.2), c, 0, 0.22, 0, { s: [0.9, 0.8, 1.4] }); add(b, sph(0.1), shade(c, 1.2), 0, 0.26, 0.28); add(b, sph(0.06), 0xffaaaa, -0.1, 0.36, 0.2); add(b, sph(0.06), 0xffaaaa, 0.1, 0.36, 0.2); add(b, box(0.03, 0.03, 0.3), 0xffaaaa, 0, 0.15, -0.35); }
    else if (kind === 'slime') { add(b, sph(0.32, 2), c, 0, 0.24, 0, { s: [1, 0.75, 1], mat: new THREE.MeshLambertMaterial({ color: c, flatShading: true, transparent: true, opacity: 0.88 }) }); add(b, sph(0.05), 0x111111, -0.1, 0.32, 0.26); add(b, sph(0.05), 0x111111, 0.1, 0.32, 0.26); }
    else if (kind === 'ship') { add(b, cyl(0.7, 0.4, 0.18, 10), 0x8b95a5, 0, 0.9, 0); add(b, sph(0.32, 2), hexOf(col), 0, 1.08, 0, { s: [1, 0.8, 1], mat: new THREE.MeshLambertMaterial({ color: 0x6fe8ff, emissive: 0x1a7a8a, transparent: true, opacity: 0.85 }) }); for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; add(b, sph(0.06), 0xffe36a, Math.cos(a) * 0.55, 0.88, Math.sin(a) * 0.55, { emissive: 0xaa8a20 }); } }
    else if (kind === 'flame') { add(b, cyl(0.2, 0.28, 0.6, 6), 0x6b6f78, 0, 0.3, 0); add(b, cone(0.22, 0.55, 6), 0xff7a30, 0, 0.82, 0, { emissive: 0xff5a10 }); }
    return g;
  }
  const ARCH = {
    knight: (c) => human({ col: c, hat: 'helm', weapon: 'sword', shield: true }),
    heavy: (c) => human({ col: c, hat: 'bigHelm', weapon: 'hammer', shield: true, big: true }),
    archer: (c) => human({ col: c, hat: 'hood', weapon: 'bow' }),
    mage: (c) => human({ col: c, hat: 'hat', weapon: 'staff' }),
    imp: (c) => human({ col: c, hat: 'horn', weapon: 'dagger', skin: 0xd0604a }),
    bomb: (c) => human({ col: c, hat: null, weapon: 'bomb', skin: 0xd8a070 }),
    beast: (c) => beast({ col: c }), raptor: (c) => beast({ col: c, raptor: true, sc: 1.1 }),
    rat: (c) => critter('rat', c), slime: (c) => critter('slime', c), ship: (c) => critter('ship', c), tower: (c) => critter('flame', c),
    stone: (c) => human({ col: c, hat: 'hood', weapon: 'stone' })
  };
  const protoCache = new Map();
  function unitModel(spr, col) {
    const key = spr + col; let p = protoCache.get(key);
    if (!p) { p = (ARCH[spr] || ARCH.knight)(col); protoCache.set(key, p); }
    const c = p.clone(true); c.userData = { body: c.children[0] }; return c;
  }
  V.unitModel = unitModel;

  /* ───── 建築模型（卡片 → 3D）───── */
  function tower(g, col, o) {
    o = o || {}; const h = o.h || 1.6, r = o.r || 0.4, c = hexOf(col);
    add(g, cyl(r, r * 1.15, h, o.n || 8), o.stone || 0x9a9488, 0, h / 2, 0);
    add(g, cyl(r * 1.25, r * 1.25, 0.14, o.n || 8), shade(o.stone || 0x9a9488, 0.8), 0, h + 0.02, 0);
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; add(g, box(0.16, 0.18, 0.16), o.stone || 0x9a9488, Math.cos(a) * r * 1.15, h + 0.16, Math.sin(a) * r * 1.15); }
    if (o.roof) add(g, cone(r * 1.35, o.roof, o.n || 8), c, 0, h + 0.15 + o.roof / 2, 0);
    if (o.flag) { add(g, cyl(0.02, 0.02, 0.5, 4), 0x5a3a20, 0, h + (o.roof || 0.2) + 0.4, 0); add(g, box(0.3, 0.18, 0.02), c, 0.16, h + (o.roof || 0.2) + 0.55, 0); }
    return g;
  }
  function hut(g, col, o) {
    o = o || {}; const w = o.w || 0.9, d = o.d || 0.8, h = o.h || 0.55, c = hexOf(col);
    add(g, box(w, h, d), o.wall || 0xd8c4a0, 0, h / 2, 0);
    add(g, cone(Math.max(w, d) * 0.78, o.roof || 0.5, 4), c, 0, h + (o.roof || 0.5) / 2, 0, { ry: Math.PI / 4 });
    add(g, box(0.2, 0.32, 0.03), 0x5a3a20, 0, 0.16, d / 2 + 0.01);
    return g;
  }
  function trees(g, n, col, r) {
    for (let i = 0; i < n; i++) { const a = i / n * 6.28 + 0.4, d = n === 1 ? 0 : (r || 0.5); const x = Math.cos(a) * d, z = Math.sin(a) * d, s = 0.8 + (i % 3) * 0.2;
      add(g, cyl(0.06, 0.08, 0.35 * s, 5), 0x6a4a2a, x, 0.17 * s, z); add(g, cone(0.3 * s, 0.6 * s, 6), col, x, 0.6 * s, z); add(g, cone(0.24 * s, 0.5 * s, 6), shade(col, 1.15), x, 0.95 * s, z); }
    return g;
  }
  function rocks(g, n, col) { for (let i = 0; i < n; i++) { const a = i * 2.1, d = 0.15 + i * 0.12; add(g, sph(0.2 + (i % 2) * 0.12, 0), shade(col, 0.9 + i * 0.1), Math.cos(a) * d, 0.16, Math.sin(a) * d, { s: [1, 0.8, 1] }); } return g; }
  function tent(g, col, x, z, s) { s = s || 1; add(g, cone(0.42 * s, 0.6 * s, 4), hexOf(col), x, 0.3 * s, z, { ry: Math.PI / 4 }); add(g, box(0.16 * s, 0.26 * s, 0.03), 0x2a1a10, x, 0.12 * s, z + 0.3 * s); return g; }
  function banner(g, col, x, z, h) { h = h || 0.9; add(g, cyl(0.02, 0.02, h, 4), 0x5a3a20, x, h / 2, z); add(g, box(0.34, 0.22, 0.02), hexOf(col), x + 0.18, h - 0.14, z); return g; }
  function fire(g, y) { add(g, cone(0.16, 0.4, 5), 0xff8a2a, 0, y, 0, { emissive: 0xff5a10, noShadow: true }); add(g, cone(0.09, 0.28, 5), 0xffdd55, 0, y - 0.02, 0, { emissive: 0xffbb20, noShadow: true }); }
  function gear(g, x, y, z, r, col) { const t = add(g, new THREE.TorusGeometry(r, r * 0.28, 5, 8), col, x, y, z, { rx: Math.PI / 2 }); return t; }

  const BUILD = {
    castle: (g, c) => { add(g, box(1.1, 0.7, 0.9), 0x9a9488, 0, 0.35, 0); for (const [x, z] of [[-0.6, -0.5], [0.6, -0.5], [-0.6, 0.5], [0.6, 0.5]]) { const t = new THREE.Group(); t.position.set(x, 0, z); tower(t, c, { h: 0.95, r: 0.22, roof: 0.35, n: 6 }); g.add(t); } add(g, box(0.4, 0.5, 0.4), shade(hexOf(c), 0.7), 0, 0.95, 0); add(g, cone(0.32, 0.4, 4), hexOf(c), 0, 1.4, 0, { ry: Math.PI / 4 }); banner(g, c, 0, 0, 1.9); },
    citadel: (g, c) => { add(g, cyl(0.7, 0.85, 0.35, 8), 0x6a6488, 0, 0.17, 0); tower(g, c, { h: 1.6, r: 0.3, roof: 0.8, n: 6, stone: 0x8e88b8 }); for (const a of [0, 2.1, 4.2]) { const t = new THREE.Group(); t.position.set(Math.cos(a) * 0.55, 0.3, Math.sin(a) * 0.55); tower(t, c, { h: 0.7, r: 0.14, roof: 0.4, n: 5, stone: 0x8e88b8 }); g.add(t); } add(g, sph(0.13), 0x9be7ff, 0, 2.3, 0, { emissive: 0x2a90c0 }); },
    palace: (g, c) => { add(g, box(1.2, 0.5, 0.9), 0xe8d8a0, 0, 0.25, 0); add(g, cyl(0.42, 0.5, 0.4, 10), 0xf2e0b0, 0, 0.7, 0); add(g, sph(0.5, 2), 0xf2c94c, 0, 1.15, 0, { s: [1, 0.9, 1], emissive: 0x6a5010 }); add(g, cone(0.05, 0.3, 4), 0xf2c94c, 0, 1.75, 0); for (const x of [-0.5, -0.17, 0.17, 0.5]) add(g, cyl(0.06, 0.06, 0.5, 6), 0xffffff, x, 0.25, 0.5); },
    pagoda: (g, c) => { for (let i = 0; i < 3; i++) { add(g, box(0.9 - i * 0.2, 0.3, 0.9 - i * 0.2), 0xd8c4a0, 0, 0.15 + i * 0.5, 0); add(g, cone(0.75 - i * 0.16, 0.28, 4), hexOf(c), 0, 0.42 + i * 0.5, 0, { ry: Math.PI / 4 }); } add(g, cyl(0.02, 0.02, 0.4, 4), 0xf2c94c, 0, 1.75, 0); },
    treant: (g, c) => { add(g, cyl(0.28, 0.4, 1.1, 7), 0x6a4a2a, 0, 0.55, 0); add(g, sph(0.65, 1), hexOf(c), 0, 1.5, 0, { s: [1, 0.85, 1] }); add(g, sph(0.45, 1), shade(hexOf(c), 1.2), 0.4, 1.35, 0.15); add(g, sph(0.05), 0xffe36a, -0.1, 0.8, 0.36, { emissive: 0xaa8a20 }); add(g, sph(0.05), 0xffe36a, 0.1, 0.8, 0.36, { emissive: 0xaa8a20 }); },
    stronghold: (g, c) => { add(g, box(1.2, 0.6, 1.0), 0x8a8478, 0, 0.3, 0); for (let i = -2; i <= 2; i++) add(g, box(0.16, 0.18, 0.16), 0x8a8478, i * 0.26, 0.68, 0.5); for (const x of [-0.6, 0.6]) { const t = new THREE.Group(); t.position.set(x, 0, -0.2); tower(t, c, { h: 1.1, r: 0.22, n: 6 }); g.add(t); } banner(g, c, 0, 0, 1.4); },
    mothership: (g, c) => { add(g, cyl(0.8, 0.5, 0.2, 12), 0x8b95a5, 0, 0.9, 0); add(g, sph(0.4, 2), 0x6fe8ff, 0, 1.08, 0, { s: [1, 0.8, 1], emissive: 0x1a7a8a }); add(g, cyl(0.1, 0.4, 0.5, 8), 0x37b6c9, 0, 0.5, 0, { mat: new THREE.MeshLambertMaterial({ color: 0x6fe8ff, transparent: true, opacity: 0.25 }), noShadow: true }); },
    warlord: (g, c) => { tent(g, c, 0, 0, 1.6); banner(g, c, 0.5, 0.2, 1.5); },
    scout_tower: (g, c) => tower(g, c, { h: 1.5, r: 0.32, roof: 0.5, n: 6, stone: 0xb09070, flag: true }),
    farm: (g, c) => { hut(g, c, { w: 0.7, d: 0.6, h: 0.5, roof: 0.4, wall: 0xc8583c }); for (const [x, z] of [[0.55, 0.3], [0.5, -0.3]]) { add(g, cyl(0.16, 0.16, 0.24, 8), 0xe8c440, x, 0.12, z); } for (let i = -3; i <= 3; i++) add(g, box(0.03, 0.2, 0.03), 0x8a5a30, i * 0.14, 0.1, 0.62); },
    blacksmith: (g, c) => { hut(g, c, { w: 0.8, d: 0.7, h: 0.5, roof: 0.35, wall: 0x9a8a7a }); add(g, box(0.16, 0.5, 0.16), 0x5a5550, -0.25, 0.7, -0.15); add(g, box(0.3, 0.12, 0.16), 0x3a3a40, 0.55, 0.2, 0.2); add(g, box(0.14, 0.14, 0.14), 0x3a3a40, 0.55, 0.1, 0.2); fire(g, 0.15); g.children[g.children.length - 1].position.set(0.3, 0.15, 0.4); },
    library: (g, c) => { hut(g, c, { w: 0.95, d: 0.75, h: 0.6, roof: 0.45, wall: 0xd8cfe8 }); for (let i = 0; i < 4; i++) add(g, box(0.1, 0.24, 0.16), [0xc0392b, 0x2e86c1, 0x27ae60, 0xf1c40f][i], -0.3 + i * 0.13, 0.12, 0.55); },
    beacon: (g, c) => { tower(g, c, { h: 1.1, r: 0.25, n: 6, stone: 0x8a7a68 }); fire(g, 1.5); },
    vault: (g, c) => { add(g, box(0.9, 0.7, 0.8), 0xe0b030, 0, 0.35, 0); add(g, box(0.92, 0.1, 0.82), 0xa8823a, 0, 0.7, 0); add(g, cyl(0.2, 0.2, 0.06, 10), 0x6a5010, 0, 0.35, 0.41, { rx: Math.PI / 2 }); add(g, sph(0.14), 0xffe36a, 0.5, 0.15, 0.4, { emissive: 0x8a6a10 }); },
    forest: (g, c) => trees(g, 5, hexOf(c), 0.45),
    quarry: (g, c) => { rocks(g, 5, 0x9a9488); add(g, box(0.06, 0.8, 0.06), 0x6a4a2a, 0.5, 0.4, 0.3); add(g, box(0.5, 0.06, 0.06), 0x6a4a2a, 0.3, 0.8, 0.3); },
    cauldron: (g, c) => { add(g, sph(0.42, 2), 0x2a2a30, 0, 0.42, 0, { s: [1, 0.85, 1] }); add(g, cyl(0.34, 0.34, 0.06, 10), 0x7be27a, 0, 0.72, 0, { emissive: 0x2a8a2a }); for (const a of [0.5, 2.6, 4.7]) add(g, box(0.05, 0.25, 0.05), 0x3a2a20, Math.cos(a) * 0.35, 0.1, Math.sin(a) * 0.35); },
    wallmaker: (g, c) => { for (let i = -1; i <= 1; i++) { add(g, box(0.9, 0.45, 0.22), 0x9a9488, 0, 0.22, i * 0.3); for (let j = -2; j <= 2; j++) add(g, box(0.14, 0.14, 0.24), 0x9a9488, j * 0.2, 0.52, i * 0.3); } },
    camp: (g, c) => { tent(g, c, -0.3, 0.1, 1); tent(g, c, 0.35, -0.15, 0.8); add(g, cyl(0.16, 0.16, 0.08, 6), 0x4a3a2a, 0.1, 0.05, 0.4); fire(g, 0.25); g.children[g.children.length - 1].position.set(0.1, 0.25, 0.4); g.children[g.children.length - 2].position.set(0.1, 0.25, 0.4); },
    concabulator: (g, c) => { add(g, box(0.9, 0.5, 0.7), 0x6a7684, 0, 0.25, 0); gear(g, -0.2, 0.75, 0, 0.22, hexOf(c)); gear(g, 0.2, 0.7, 0.15, 0.16, 0xf2c94c); add(g, cyl(0.06, 0.06, 0.5, 5), 0x4a5664, 0.4, 0.75, -0.2); },
    shrine: (g, c) => { add(g, box(0.1, 1, 0.1), 0xd23a2e, -0.4, 0.5, 0); add(g, box(0.1, 1, 0.1), 0xd23a2e, 0.4, 0.5, 0); add(g, box(1.1, 0.12, 0.14), 0xd23a2e, 0, 1.0, 0); add(g, box(0.9, 0.08, 0.1), 0x2a2a2a, 0, 0.82, 0); },
    temple: (g, c) => { add(g, box(1, 0.12, 0.8), 0xe8e0d0, 0, 0.06, 0); for (const x of [-0.38, -0.13, 0.13, 0.38]) add(g, cyl(0.07, 0.07, 0.6, 8), 0xf4eee0, x, 0.42, 0.28); add(g, cone(0.75, 0.32, 3), 0xd8cdb8, 0, 0.88, 0.1, { ry: Math.PI / 2, s: [1, 1, 0.6] }); },
    spire: (g, c) => { add(g, cone(0.3, 0.3, 8), 0x8a94a8, 0, 0.15, 0, {}); add(g, new THREE.OctahedronGeometry(0.34), 0x9be7ff, 0, 1.0, 0, { s: [0.8, 2, 0.8], emissive: 0x2a90c0 }); },
    dispenser: (g, c) => { add(g, cyl(0.3, 0.38, 0.9, 8), 0xe0b030, 0, 0.45, 0); add(g, sph(0.3, 1), 0xffe36a, 0, 1.1, 0, { emissive: 0x8a6a10 }); add(g, cyl(0.06, 0.06, 0.4, 5), 0x6a5010, 0.4, 0.9, 0, { rz: 1.1 }); },
    mangler: (g, c) => { add(g, box(0.9, 0.35, 0.8), 0x5a5560, 0, 0.17, 0); gear(g, -0.25, 0.55, 0, 0.26, 0x9a2a2a); gear(g, 0.25, 0.55, 0, 0.26, 0x9a2a2a); add(g, cyl(0.08, 0.14, 0.5, 6), 0x3a3a40, 0, 0.7, 0.3, { rx: 1.2 }); },
    cemetery: (g, c) => { for (let i = 0; i < 5; i++) { const x = -0.4 + i * 0.2, z = (i % 2) * 0.3 - 0.1; add(g, box(0.16, 0.34, 0.06), 0x8a8a92, x, 0.17, z); add(g, cyl(0.08, 0.08, 0.06, 8), 0x8a8a92, x, 0.36, z, { rx: Math.PI / 2 }); } add(g, box(0.6, 0.06, 0.5), 0x3a3a30, 0, 0.02, 0.1); },
    demons_altar: (g, c) => { add(g, box(0.9, 0.3, 0.9), 0x2a2228, 0, 0.15, 0); add(g, box(0.6, 0.3, 0.6), 0x3a2a34, 0, 0.45, 0); fire(g, 0.9); add(g, cone(0.06, 0.4, 4), 0xd23a2e, -0.4, 0.5, 0.4); add(g, cone(0.06, 0.4, 4), 0xd23a2e, 0.4, 0.5, 0.4); },
    trebuchet: (g, c) => { add(g, box(1, 0.1, 0.5), 0x6a4a2a, 0, 0.05, 0); add(g, box(0.08, 0.9, 0.08), 0x6a4a2a, -0.25, 0.5, 0, { rz: 0.2 }); add(g, box(0.08, 0.9, 0.08), 0x6a4a2a, 0.25, 0.5, 0, { rz: -0.2 }); add(g, box(1.2, 0.07, 0.07), 0x8a5a30, 0, 0.95, 0, { rz: 0.3 }); add(g, sph(0.16), 0x8a8478, -0.55, 0.7, 0); rocks(g, 2, 0x8a8478); },
    flametower: (g, c) => { tower(g, c, { h: 0.9, r: 0.3, n: 6, stone: 0x6b6f78 }); fire(g, 1.3); },
    mycelium: (g, c) => { for (let i = 0; i < 4; i++) { const a = i * 1.6, d = i ? 0.35 : 0, s = 1 - i * 0.15; add(g, cyl(0.06 * s, 0.09 * s, 0.4 * s, 6), 0xf0e8d0, Math.cos(a) * d, 0.2 * s, Math.sin(a) * d); add(g, sph(0.3 * s, 1), [0xd8583c, 0xc06ad8, 0xe0b030, 0xd8583c][i], Math.cos(a) * d, 0.5 * s, Math.sin(a) * d, { s: [1, 0.6, 1] }); } },
    orchard: (g, c) => { for (let i = 0; i < 3; i++) { const x = -0.4 + i * 0.4, z = (i % 2) * 0.3 - 0.1; add(g, cyl(0.05, 0.07, 0.4, 5), 0x6a4a2a, x, 0.2, z); add(g, sph(0.3, 1), 0x4aa84a, x, 0.6, z); for (const a of [0.5, 2.5, 4.5]) add(g, sph(0.05), 0xd23a2e, x + Math.cos(a) * 0.25, 0.6, z + Math.sin(a) * 0.25); } },
    converter: (g, c) => { add(g, cyl(0.25, 0.35, 0.3, 6), 0x5a6a7a, 0, 0.15, 0); add(g, cyl(0.1, 0.14, 0.9, 6), 0x8b95a5, 0, 0.75, 0); gear(g, 0, 1.0, 0, 0.3, 0x37b6c9); add(g, sph(0.12), 0x6fe8ff, 0, 1.3, 0, { emissive: 0x1a7a8a }); },
    dragons_den: (g, c) => { add(g, sph(0.7, 1), 0x6a5a48, 0, 0.4, 0, { s: [1.1, 0.8, 1] }); add(g, cyl(0.28, 0.28, 0.1, 8), 0x1a1210, 0, 0.35, 0.55, { rx: Math.PI / 2 }); add(g, cone(0.1, 0.4, 4), 0xd98b3a, 0.3, 1.0, 0.1); add(g, cone(0.1, 0.4, 4), 0xd98b3a, -0.3, 0.95, 0.1); add(g, sph(0.05), 0xff6a30, 0, 0.42, 0.62, { emissive: 0xff4010 }); }
  };
  // 通用建築備援
  function genericBuilding(g, cd) { hut(g, K_[cd.king] ? K_[cd.king].color : '#888', {}); }

  function cardModel(id, opt) {
    opt = opt || {}; const cd = C[id], col = K_[cd.king] ? K_[cd.king].color : '#999';
    const g = new THREE.Group();
    if (cd.type === 'troop' || cd.isTroopBase) {
      // 營地：帳篷 + 旗 + 迷你兵
      if (!opt.minisOnly) { tent(g, col, -0.42, -0.32, 0.9); banner(g, col, 0.5, -0.4, 1.1); }
      const minis = new THREE.Group(); minis.name = 'minis'; g.add(minis);
      const n = opt.n != null ? opt.n : 3;
      for (let i = 0; i < n; i++) { const m = unitModel(cd.spr || 'knight', col); const a = (i - (n - 1) / 2) * 0.55, s = (cd.size || 1) * 0.72; m.scale.setScalar(s); m.position.set(a * 0.55 + 0.05, 0, 0.3 + (i % 2) * 0.22); m.rotation.y = 0.2 - a * 0.15; minis.add(m); }
      if (cd.isTroopBase) BUILD.warlord(g, col);
      return g;
    }
    const b = BUILD[id] || (cd.type === 'tower' ? null : null);
    if (b) b(g, col); else if (cd.type === 'tower') tower(g, col, { h: 1.2, r: 0.3, roof: 0.4, n: 6 }); else genericBuilding(g, cd);
    return g;
  }
  V.cardModel = cardModel;

  /* ───── 場景 ───── */
  let renderer, scene, camera, root, plotsG, unitsG, fxG, envG, sun, canvas;
  const views = new Map(), dying = [];
  let curB = null, aimMesh, W3 = 1280, H3 = 620, lastLay = null, time = 0, kingKey = '';
  const plotObjs = new Map(), tileObjs = new Map();

  function skyTexture() {
    const c = document.createElement('canvas'); c.width = 4; c.height = 256; const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#5aa6dc'); g.addColorStop(0.55, '#a6d4ea'); g.addColorStop(1, '#e8f0d8'); x.fillStyle = g; x.fillRect(0, 0, 4, 256);
    return new THREE.CanvasTexture(c);
  }
  const rnd = (s) => () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };

  V.init = function (cv) {
    try {
      canvas = cv;
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    } catch (e) { return false; }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.setSize(W3, H3, false);
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    scene = new THREE.Scene(); scene.background = skyTexture(); scene.fog = new THREE.Fog(0xa9cfc0, 45, 100);
    camera = new THREE.PerspectiveCamera(36, W3 / H3, 0.5, 200); camera.position.set(-3.2, 23.5, 18.5); camera.lookAt(-3.2, 0, 0.7);
    scene.add(new THREE.HemisphereLight(0xdff0ff, 0x5a6a44, 0.75));
    sun = new THREE.DirectionalLight(0xfff0d0, 0.95); sun.position.set(-14, 26, 10); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera; sc.left = -30; sc.right = 30; sc.top = 20; sc.bottom = -20; sc.near = 1; sc.far = 80; sun.shadow.bias = -0.0008; scene.add(sun);
    root = new THREE.Group(); scene.add(root);
    envG = new THREE.Group(); plotsG = new THREE.Group(); unitsG = new THREE.Group(); fxG = new THREE.Group(); root.add(envG, plotsG, unitsG, fxG);
    aimMesh = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.65, 24), new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.9, side: THREE.DoubleSide })); aimMesh.rotation.x = -Math.PI / 2; aimMesh.position.y = 0.06; aimMesh.visible = false; fxG.add(aimMesh);
    V.ok = true; return true;
  };

  /* ── 環境 ── */
  function buildEnv(lay, king) {
    while (envG.children.length) envG.remove(envG.children[0]);
    const r = rnd(7), kc = K_[king];
    // 地面（頂點著色）
    const geo = new THREE.PlaneGeometry(110, 70, 80, 50); geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, colors = new Float32Array(pos.count * 3), c1 = new THREE.Color(0x4f9a3c), c2 = new THREE.Color(0x3e8434), c3 = new THREE.Color(0x62aa48);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i); let h = 0;
      const far = Math.max(0, Math.abs(z) - 12) + Math.max(0, Math.abs(x) - 30); h = far * far * 0.03 * (0.6 + r() * 0.8); pos.setY(i, h);
      const c = c1.clone().lerp(r() < 0.5 ? c2 : c3, r()); c.multiplyScalar(0.95 + r() * 0.1); colors.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3)); geo.computeVertexNormals();
    const ground = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })); ground.receiveShadow = true; envG.add(ground);
    // 土路
    const rx0 = px(lay.right + 30), pts = [];
    const shape = new THREE.Shape(); const top = [[rx0, -4.4], [-2, -5.8], [6, -3.8], [20, -4.6]], bot = [[20, 4.2], [6, 5.2], [-2, 3.6], [rx0, 4.4]];
    shape.moveTo(...top[0]); const cv = (arr) => { for (let i = 1; i < arr.length; i++) shape.lineTo(...arr[i]); }; cv(top); shape.lineTo(...bot[0]); cv(bot); shape.closePath();
    const road = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshLambertMaterial({ color: 0x9a7a48, flatShading: true })); road.rotation.x = Math.PI / 2; road.position.y = 0.03; road.material.side = THREE.DoubleSide; road.receiveShadow = true; envG.add(road);
    for (let i = 0; i < 70; i++) { const x = rx0 + r() * (20 - rx0), z = (r() - 0.5) * 9; const m = new THREE.Mesh(sph(0.1 + r() * 0.12, 0), mat(0x8a7048)); m.position.set(x, 0.06, z); m.scale.y = 0.5; m.receiveShadow = true; envG.add(m); }
    // 王國廣場（石板 + 城牆）
    const wx = px(lay.right + 33), x0 = px(0) - 3, plaza = new THREE.Mesh(box(wx - x0 + 1, 0.4, 20), mat(new THREE.Color(0x8a8478).lerp(new THREE.Color(kc.color), 0.22).getHex()));
    plaza.position.set((x0 + wx + 1) / 2, -0.05, 0); plaza.receiveShadow = true; envG.add(plaza);
    for (let i = 0; i < 40; i++) { const s = add(envG, box(0.9 + r(), 0.05, 0.9 + r()), new THREE.Color(0x9a9488).lerp(new THREE.Color(kc.color), 0.18).multiplyScalar(0.92 + r() * 0.16).getHex(), x0 + r() * (wx - x0), 0.16, (r() - 0.5) * 18, { noShadow: true }); }
    for (let z = -9.4; z <= 9.6; z += 0.9) { add(envG, box(0.7, 1.0, 0.8), 0x8a8478, wx, 0.5, z); add(envG, box(0.5, 0.3, 0.5), 0x9a9488, wx, 1.15, z); }
    for (const z of [-9.6, 9.8]) { const t = new THREE.Group(); t.position.set(wx, 0, z); tower(t, kc.color, { h: 2.0, r: 0.6, roof: 0.9, n: 8, flag: true }); envG.add(t); }
    // 樹叢、岩石、遠山
    const treeCol = [0x2f7a3a, 0x3a8a44, 0x276a34];
    for (let i = 0; i < 120; i++) {
      const x = wx + 2 + r() * 40, side = r() < 0.5 ? -1 : 1, z = side * (6.6 + r() * 12); if (Math.abs(z) < 6.4) continue;
      const g = new THREE.Group(); g.position.set(x, 0, z); const s = 0.9 + r() * 0.9; g.scale.setScalar(s); trees(g, 1, treeCol[i % 3], 0); envG.add(g);
    }
    for (let i = 0; i < 26; i++) { const g = new THREE.Group(); g.position.set(wx + 2 + r() * 40, 0, (r() < 0.5 ? -1 : 1) * (6.5 + r() * 14)); rocks(g, 2, 0x9a9488); envG.add(g); }
    for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(cone(6 + r() * 5, 9 + r() * 8, 5), mat(shade(0x6a8a7a, 0.8 + r() * 0.3))); m.position.set(-30 + i * 9 + r() * 4, 3, -36 - r() * 6); m.castShadow = false; envG.add(m); }
    // 花
    for (let i = 0; i < 90; i++) { const m = new THREE.Mesh(sph(0.06, 0), mat([0xf2c94c, 0xffffff, 0xe0607a][i % 3])); m.position.set(wx + 1 + r() * 30, 0.07, (r() - 0.5) * 30); envG.add(m); }
  }

  V.setLayout = function (lay, king) {
    const key = lay.right + ':' + king; lastLay = lay; if (key === kingKey) return; kingKey = key; buildEnv(lay, king);
  };

  /* ── 地塊 ── */
  const hi = { valid: new Set(), cands: [], prophecy: new Set(), hover: null };
  function disposeGroup(g) { g.traverse(o => { if (o.isMesh && o.userData.own) o.geometry.dispose(); }); }
  V.setPlots = function (S, lay, opts) {
    opts = opts || {}; V.setLayout(lay, S.king);
    hi.valid = opts.valid || new Set(); hi.cands = opts.cands || []; hi.prophecy = opts.prophecy || new Set();
    const keep = new Set();
    const cs = lay.cs * K;
    const cells = [];
    for (let r = 0; r < NK.CONST.GRID; r++) for (let c = 0; c < NK.CONST.GRID; c++) { const isC = hi.cands.some(x => x[0] === r && x[1] === c); if (S.open[r][c] || isC) cells.push([r, c, isC]); }
    for (const [r, c, isC] of cells) {
      const key = r + ',' + c, p = S.grid[r][c], pos = lay.pos(r, c);
      const sig = [S.razed[r][c] ? 'x' : '', isC ? 'c' : '', p ? p.card + p.level + ':' + Math.min(6, Math.ceil(p.units / 6)) + ':' + (p.x.big ? 1 : 0) : '', lay.cs].join('|');
      let o = plotObjs.get(key);
      if (!o || o.sig !== sig) {
        if (o) { plotsG.remove(o.g); disposeGroup(o.g); }
        const g = new THREE.Group(); g.position.set(px(pos.x), 0, pz(pos.y));
        const tileCol = S.razed[r][c] ? 0x2a2622 : isC ? 0xe3bb5c : 0x6f6a62;
        const tile = add(g, box(cs * 0.94, 0.16, cs * 0.94), tileCol, 0, 0.02, 0); tile.userData.tile = true;
        add(g, box(cs * 0.86, 0.06, cs * 0.86), shade(tileCol, 1.18), 0, 0.12, 0, { noShadow: true });
        if (p) {
          const cd = C[p.card]; const m = cardModel(p.card, { n: Math.max(1, Math.min(5, Math.ceil((cd.gold15 ? 3 : p.units) / 6))) });
          m.position.y = 0.15; const sc = Math.min(2.1, cs / 1.15) * (1 + (p.level - 1) * 0.06) * (p.x.big ? 1.3 : 1); m.scale.setScalar(sc);
          m.traverse(x => { x.userData.own = true; }); g.add(m); o = { g, sig, model: m };
          for (let i = 0; i < Math.min(p.level, 6); i++) add(g, cone(0.08, 0.2, 4), 0xf2c94c, -cs * 0.36 + i * 0.2, 0.28, cs * 0.4, { emissive: 0x6a5010 });
          const ic = iconSprite(cd.ic); ic.position.set(0, 1.7 * Math.min(1.6, sc * 0.9) + 0.6, 0); ic.scale.setScalar(0.8); g.add(ic);
        } else o = { g, sig };
        o.tile = tile; o.pos = pos; plotsG.add(g); plotObjs.set(key, o);
      }
      o.seen = true; keep.add(key);
      // 高亮
      const isV = hi.valid.has(key), isP = hi.prophecy.has(key);
      const tm = o.tile.material; o.tile.material = mat(S.razed[r][c] ? 0x2a2622 : isC ? 0xe3bb5c : isV ? 0xbfe6ff : isP ? 0x4aa0d8 : 0x6f6a62, { emissive: isV ? 0x3a6a8a : isP ? 0x1a4a6a : isC ? 0x5a4410 : 0 });
      o.valid = isV;
    }
    for (const [k, o] of plotObjs) if (!keep.has(k)) { plotsG.remove(o.g); disposeGroup(o.g); plotObjs.delete(k); }
  };

  const iconCache = new Map();
  function iconSprite(ch) {
    let t = iconCache.get(ch);
    if (!t) { const c = document.createElement('canvas'); c.width = c.height = 96; const x = c.getContext('2d'); x.font = '64px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = '#0008'; x.shadowBlur = 6; x.fillText(ch, 48, 52); t = new THREE.CanvasTexture(c); iconCache.set(ch, t); }
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false })); s.renderOrder = 10; return s;
  }

  // 每格投影到螢幕的矩形（給 DOM 命中區/標籤用）
  V.plotRect = function (lay, r, c) {
    const pos = lay.pos(r, c), h = lay.cs / 2; camera.updateMatrixWorld(); camera.updateProjectionMatrix();
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [dx, dy, dz] of [[-1, -1, 0], [1, -1, 0], [1, 1, 0], [-1, 1, 0], [-1, -1, 1.6], [1, -1, 1.6]]) {
      const v = new THREE.Vector3(px(pos.x + dx * h * 0.94), dz * 0.6, pz(pos.y + dy * h * 0.94)).project(camera);
      const sx = (v.x + 1) / 2 * W3, sy = (1 - v.y) / 2 * H3; x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
    }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  };
  V.pick = function (clientX, clientY, rect) {
    const nx = ((clientX - rect.left) / rect.width) * 2 - 1, ny = -((clientY - rect.top) / rect.height) * 2 + 1;
    const rc = new THREE.Raycaster(); rc.setFromCamera({ x: nx, y: ny }, camera);
    const t = -rc.ray.origin.y / rc.ray.direction.y; if (!isFinite(t) || t < 0) return null;
    return V.toWorld(rc.ray.origin.x + rc.ray.direction.x * t, rc.ray.origin.z + rc.ray.direction.z * t);
  };

  /* ── 戰鬥同步 ── */
  V.setBattle = function (B) {
    curB = B;
    for (const [id, v] of views) unitsG.remove(v.g); views.clear(); dying.length = 0;
    for (const o of plotObjs.values()) { const m = o.model && o.model.getObjectByName('minis'); if (m) m.visible = !B; }
    hpPool.forEach(h => h.visible = false);
  };
  const hpPool = [];
  function hpBar() { const g = new THREE.Group(); const bg = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.09), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.6, depthTest: false })); const fg = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.09), new THREE.MeshBasicMaterial({ color: 0x5fd35f, depthTest: false })); bg.renderOrder = 11; fg.renderOrder = 12; g.add(bg, fg); g.userData.fg = fg; return g; }

  function makeView(u) {
    const g = new THREE.Group();
    let m;
    if (u.kind === 'wall') { m = new THREE.Group(); for (let i = -2; i <= 2; i++) { add(m, box(0.5, 1.0, 0.7), 0x9a9488, 0, 0.5, i * 0.42); add(m, box(0.5, 0.22, 0.34), 0x9a9488, 0, 1.1, i * 0.42); } }
    else { m = unitModel(u.spr || 'knight', u.col || '#ccc'); }
    const s = u.kind === 'wall' ? 1 : Math.min(2.6, (u.size || 1)) * 0.95 * (u.boss ? 1.2 : 1) * 1.3; m.scale.setScalar(s); g.add(m);
    if (u.kind !== 'wall') { const ring = new THREE.Mesh(new THREE.CircleGeometry(0.34 * Math.max(0.8, Math.min(2, u.size || 1)), 12), new THREE.MeshBasicMaterial({ color: u.side === 0 ? 0x5aaaff : 0xff5a50, transparent: true, opacity: 0.45 })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; g.add(ring); }
    if (u.golden) { const gl = new THREE.Mesh(sph(0.5, 1), new THREE.MeshBasicMaterial({ color: 0xffd84a, transparent: true, opacity: 0.35 })); gl.position.y = 0.6; g.add(gl); }
    if (u.boss) { const cr = iconSprite('👑'); cr.position.y = 2.6; cr.scale.setScalar(0.9); g.add(cr); }
    if (u.beh === 'defender' || u.mounted) { /* 標記略 */ }
    unitsG.add(g);
    return { g, m, body: m.userData.body, lx: u.x, ly: u.y, ph: Math.random() * 6, atk: 0, lastCd: u.cd, hp: null, ry: u.side === 0 ? Math.PI / 2 : -Math.PI / 2 };
  }

  function syncUnits(dt) {
    const seen = new Set();
    for (const u of curB.u) {
      if (!u.alive) continue; seen.add(u.id);
      let v = views.get(u.id); if (!v) { v = makeView(u); views.set(u.id, v); }
      const x = px(u.x), z = pz(u.y), y = u.flying ? 1.0 + Math.sin(time * 2 + v.ph) * 0.1 : 0;
      const dx = u.x - v.lx, dy = u.y - v.ly, moved = Math.hypot(dx, dy) > 0.15; v.lx = u.x; v.ly = u.y;
      v.g.position.set(x, y, z);
      let ty = v.ry;
      if (u.tgt && u.tgt.alive && u.kind !== 'wall') ty = Math.atan2(u.tgt.x - u.x, u.tgt.y - u.y); else if (moved) ty = Math.atan2(dx, dy);
      let d = ty - v.m.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); v.m.rotation.y += d * Math.min(1, dt * 12); v.ry = ty;
      if (v.body) {
        if (u.cd > v.lastCd + 0.3) v.atk = 0.2; v.lastCd = u.cd; v.atk = Math.max(0, v.atk - dt);
        const bob = moved ? Math.abs(Math.sin(time * 10 + v.ph)) * 0.08 : Math.sin(time * 2 + v.ph) * 0.012;
        v.body.position.y = bob; v.body.position.z = Math.sin(v.atk / 0.2 * Math.PI) * 0.22; v.body.rotation.x = Math.sin(v.atk / 0.2 * Math.PI) * 0.25;
      }
      if (u.kind === 'wall') { const f = Math.max(0.15, u.hp / u.maxhp); v.m.scale.set(1, 0.4 + 0.6 * f, 1); }
      if (u.root > 0) v.m.rotation.z = Math.sin(time * 30) * 0.05; else v.m.rotation.z = 0;
      // 血條
      if (u.hp < u.maxhp && u.maxhp < 1e8 && u.kind !== 'wall') {
        if (!v.hp) { v.hp = hpPool.find(h => !h.visible && !h.userData.used) || hpBar(); v.hp.userData.used = true; if (!v.hp.parent) fxG.add(v.hp); }
        v.hp.visible = true; v.hp.position.set(x, 1.6 * Math.min(1.8, u.size || 1) + y, z); v.hp.quaternion.copy(camera.quaternion);
        const f = Math.max(0.001, u.hp / u.maxhp), fg = v.hp.userData.fg; fg.scale.x = f; fg.position.x = -0.35 * (1 - f); fg.material.color.set(u.side === 0 ? 0x5fd35f : 0xe05050);
      } else if (v.hp) { v.hp.visible = false; v.hp.userData.used = false; v.hp = null; }
    }
    for (const [id, v] of views) if (!seen.has(id)) {
      views.delete(id); if (v.hp) { v.hp.visible = false; v.hp.userData.used = false; if (hpPool.indexOf(v.hp) < 0) hpPool.push(v.hp); v.hp = null; }
      v.t = 0.35; dying.push(v);
    }
    for (let i = dying.length - 1; i >= 0; i--) { const v = dying[i]; v.t -= dt; const f = Math.max(0, v.t / 0.35); v.g.scale.set(1, f, 1); v.g.position.y -= dt * 0.5; if (v.t <= 0) { unitsG.remove(v.g); dying.splice(i, 1); } }
  }

  /* ── 特效 ── */
  const pool = { line: [], boom: [], zone: [], text: [], trap: [], tower: [], puff: [] };
  function take(name, make) { const p = pool[name]; p.i = p.i || 0; let o = p[p.i]; if (!o) { o = make(); p.push(o); fxG.add(o); } p.i++; o.visible = true; return o; }
  function resetPool() { for (const k in pool) { const p = pool[k]; for (let i = 0; i < p.length; i++) p[i].visible = false; p.i = 0; } }
  const unitBox = box(1, 1, 1);
  function syncFx() {
    resetPool();
    for (const f of curB.fx) {
      if (f.t === 'line') {
        const a = new THREE.Vector3(px(f.x1), 0.9, pz(f.y1)), b = new THREE.Vector3(px(f.x2), 0.9, pz(f.y2)); const len = a.distanceTo(b); if (len < 0.01) continue;
        const m = take('line', () => new THREE.Mesh(unitBox, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true }))); m.material.color.set(f.col); m.material.opacity = Math.min(1, f.ttl * 6);
        const th = (f.thick || 1.5) * 0.035; m.position.copy(a).add(b).multiplyScalar(0.5); m.scale.set(th, th, len); m.lookAt(b);
      } else if (f.t === 'boom') {
        const a = Math.max(0, Math.min(1, f.ttl / 0.3)); const m = take('boom', () => new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false })));
        m.material.color.set(f.col); m.material.opacity = a * 0.55; const s = f.r * K * (1.1 - a * 0.4); m.position.set(px(f.x), 0.15, pz(f.y)); m.scale.set(s, s * 0.45, s);
      } else if (f.t === 'puff') {
        const a = Math.max(0, Math.min(1, f.ttl / 0.35)); const m = take('puff', () => new THREE.Mesh(sph(0.2, 0), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true })));
        m.material.color.set(f.col); m.material.opacity = a; const s = 0.5 + (1 - a) * 0.6; m.scale.setScalar(s); m.position.set(px(f.x), 0.5 + (1 - a) * 0.8, pz(f.y));
      } else if (f.t === 'text') {
        const m = take('text', () => new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false }))); const ic = iconSprite(f.s); m.material.map = ic.material.map; m.material.needsUpdate = true;
        const a = Math.max(0, Math.min(1, f.ttl / 0.5)); m.material.opacity = a; m.scale.setScalar(0.6); m.position.set(px(f.x), 1.6 + (1 - a) * 0.8, pz(f.y)); m.renderOrder = 9;
      }
    }
    for (const z of curB.zones) {
      const m = take('zone', () => new THREE.Mesh(new THREE.CircleGeometry(1, 28), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide })));
      m.rotation.x = -Math.PI / 2; m.material.color.set(z.kind === 'fire' ? 0xff7a30 : 0x6adf70); m.position.set(px(z.x), 0.08, pz(z.y)); m.scale.setScalar(z.r * K);
    }
    for (const t of curB.traps) { const m = take('trap', () => new THREE.Mesh(cone(0.16, 0.3, 4), mat(0xc8b070))); m.position.set(px(t.x), 0.15, pz(t.y)); }
    for (const tw of curB.tw) if (tw.summoned) { const m = take('tower', () => { const g = new THREE.Group(); tower(g, '#a68a64', { h: 0.8, r: 0.2, n: 5 }); return g; }); m.position.set(px(tw.x), 0.1, pz(tw.y)); }
    const aim = curB.aim; aimMesh.visible = !!aim && !curB.done; if (aim) aimMesh.position.set(px(aim.x), 0.1, pz(aim.y));
  }

  V.frame = function (dt) {
    if (!V.ok) return; time += dt;
    if (curB) { syncUnits(dt); syncFx(); } else { resetPool(); aimMesh.visible = false; }
    // 有效地塊呼吸
    const pulse = 0.5 + 0.5 * Math.sin(time * 5);
    for (const o of plotObjs.values()) if (o.valid && o.tile.material.emissive) { o.tile.material = mat(0xbfe6ff, { emissive: 0x2a5a7a + Math.round(pulse * 0x1a) * 0x101 }); }
    renderer.render(scene, camera);
  };
  V.clearBattle = function () { V.setBattle(null); };

  /* ───── 卡片縮圖（把 3D 模型渲染成圖）───── */
  let tr, ts, tc, tcache = new Map();
  V.thumb = function (id) {
    if (!V.ok) return null; if (tcache.has(id)) return tcache.get(id);
    if (!tr) {
      tr = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true }); tr.setSize(160, 120); tr.setPixelRatio(1);
      ts = new THREE.Scene(); ts.add(new THREE.HemisphereLight(0xffffff, 0x556644, 1.1)); const dl = new THREE.DirectionalLight(0xfff0d0, 0.9); dl.position.set(-3, 5, 4); ts.add(dl);
      tc = new THREE.PerspectiveCamera(32, 160 / 120, 0.1, 50);
    }
    const cd = C[id], g = new THREE.Group();
    if (cd.type === 'ench' || cd.type === 'tome') {
      const col = K_[cd.king] ? K_[cd.king].color : '#999';
      const base = add(g, cyl(0.8, 0.9, 0.12, 12), shade(hexOf(col), 0.7), 0, 0.06, 0);
      if (cd.type === 'tome') { add(g, box(0.9, 0.16, 0.7), 0x7a3a2a, 0, 0.25, 0); add(g, box(0.82, 0.12, 0.62), 0xf4ecd8, 0, 0.3, 0); add(g, box(0.06, 0.2, 0.7), 0x5a2a1a, -0.45, 0.28, 0); const o = add(g, new THREE.OctahedronGeometry(0.28), hexOf(col), 0, 1.0, 0, { emissive: shade(hexOf(col), 0.5) }); }
      else { add(g, cyl(0.06, 0.06, 0.5, 6), 0xd0d4dc, 0, 0.4, 0); const o = add(g, sph(0.34, 1), hexOf(col), 0, 1.0, 0, { emissive: shade(hexOf(col), 0.55) }); for (let i = 0; i < 5; i++) { const a = i * 1.26; add(g, sph(0.06), 0xffffff, Math.cos(a) * 0.55, 1.0 + Math.sin(a * 2) * 0.2, Math.sin(a) * 0.55, { emissive: 0x888888 }); } }
    } else {
      const m = cardModel(id, { n: 3 }); const gnd = add(g, cyl(0.95, 1.0, 0.1, 14), 0x6a9a4a, 0, -0.03, 0); g.add(m); if (cd.type === 'troop' || cd.isTroopBase) { m.scale.setScalar(1.05); }
    }
    ts.add(g); const box3 = new THREE.Box3().setFromObject(g), ctr = new THREE.Vector3(); box3.getCenter(ctr); const sz = box3.getSize(new THREE.Vector3()), R = Math.max(sz.x, sz.y * 1.3, sz.z) * 1.15 + 0.6;
    tc.position.set(ctr.x + R * 0.55, ctr.y + R * 0.75, ctr.z + R * 1.05); tc.lookAt(ctr.x, ctr.y - 0.05, ctr.z);
    tr.render(ts, tc); const url = tr.domElement.toDataURL('image/png'); ts.remove(g); tcache.set(id, url); return url;
  };
})(globalThis.NK = globalThis.NK || {});
