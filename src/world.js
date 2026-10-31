// ====== THẾ GIỚI 3D: đảo, trạm, nhân vật, hiệu ứng (three.js r128) ======
let R, SC, CAM, SUN, GRAD, WATER, FOAM;
const COLL = [];             // vật cản hình tròn {x,z,r}
const ST3 = {};              // dữ liệu 3D của từng trạm
const ANIM = [];             // hàm cập nhật mỗi khung hình (t, dt)
const V3 = THREE.Vector3;
const rng = (s => () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; })(20261031);
const FONT = '"Baloo 2", "Nunito", system-ui, sans-serif';

// ---------- vật liệu & hình khối ----------
const MC = {};
function M(c) { return MC[c] || (MC[c] = new THREE.MeshToonMaterial({ color: c, gradientMap: GRAD })); }
const MB = {};
function MBasic(c, o) { const k = c + '|' + (o || 1); return MB[k] || (MB[k] = new THREE.MeshBasicMaterial({ color: c, transparent: o < 1, opacity: o || 1 })); }
const OUT = new THREE.MeshBasicMaterial({ color: 0x3a2350, side: THREE.BackSide });
function mesh(geo, c, cast = true) { const m = new THREE.Mesh(geo, typeof c === 'number' ? M(c) : c); m.castShadow = cast; m.receiveShadow = true; return m; }
function at(o, x, y, z) { o.position.set(x, y, z); return o; }
function outline(m, k = 1.06) { const o = new THREE.Mesh(m.geometry, OUT); o.scale.setScalar(k); o.castShadow = false; m.add(o); return m; }
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (a, b, h, s = 18) => new THREE.CylinderGeometry(a, b, h, s);
const sph = (r, w = 22, h = 16) => new THREE.SphereGeometry(r, w, h);
const cone = (r, h, s = 16) => new THREE.ConeGeometry(r, h, s);

// ---------- chữ & biểu tượng vẽ bằng canvas ----------
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearFilter; t.anisotropy = 4; return t; }
function sprite(tex, h, aspect) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })); s.scale.set(h * aspect, h, 1); return s; }
function textSprite(txt, o = {}) {
  const fs = o.fs || 46, pad = o.pad || 22, c = document.createElement('canvas'), g = c.getContext('2d');
  g.font = `800 ${fs}px ${FONT}`; const w = Math.ceil(g.measureText(txt).width) + pad * 2, h = Math.ceil(fs * 1.55);
  c.width = w + 8; c.height = h + 12;
  const g2 = c.getContext('2d'); g2.font = `800 ${fs}px ${FONT}`;
  g2.fillStyle = 'rgba(58,35,80,.25)'; rr(g2, 4, 9, w, h, h / 2); g2.fill();
  g2.fillStyle = o.bg || '#ffffff'; rr(g2, 4, 4, w, h, h / 2); g2.fill();
  if (o.stroke) { g2.lineWidth = 5; g2.strokeStyle = o.stroke; rr(g2, 6.5, 6.5, w - 5, h - 5, h / 2); g2.stroke(); }
  g2.fillStyle = o.fg || '#3b2160'; g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.fillText(txt, 4 + w / 2, 4 + h / 2 + fs * 0.06);
  const t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearFilter;
  return sprite(t, o.h || 0.8, c.width / c.height);
}
function heartPath(g, cx, cy, s) {
  g.beginPath(); g.moveTo(cx, cy + s * 0.9);
  g.bezierCurveTo(cx - s * 1.5, cy - s * 0.1, cx - s * 0.7, cy - s * 1.2, cx, cy - s * 0.45);
  g.bezierCurveTo(cx + s * 0.7, cy - s * 1.2, cx + s * 1.5, cy - s * 0.1, cx, cy + s * 0.9); g.closePath();
}
const ICON = {};
function makeIcons() {
  const S = 128;
  const bubble = (draw, ring) => canvasTex(S, S, (g) => {
    g.fillStyle = 'rgba(58,35,80,.25)'; g.beginPath(); g.arc(64, 68, 54, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(64, 62, 54, 0, 7); g.fill();
    g.lineWidth = 7; g.strokeStyle = ring || '#3b2160'; g.beginPath(); g.arc(64, 62, 50, 0, 7); g.stroke(); draw(g);
  });
  ICON.heart = canvasTex(S, S, g => { g.fillStyle = '#ff5c8a'; heartPath(g, 64, 66, 46); g.fill(); g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(42, 46, 10, 7, -0.6, 0, 7); g.fill(); });
  ICON.star = canvasTex(S, S, g => { g.fillStyle = '#ffd23f'; g.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 22 : 54, a = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(64 + r * Math.cos(a), 66 + r * Math.sin(a)); } g.fill(); });
  ICON.spark = canvasTex(64, 64, g => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 30); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,240,180,.8)'); gr.addColorStop(1, 'rgba(255,240,180,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
  ICON.q = bubble(g => { g.fillStyle = '#8a6bd1'; g.font = `800 70px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 64, 68); }, '#8a6bd1');
  ICON.ex = bubble(g => { g.fillStyle = '#e0663c'; g.font = `800 70px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('!', 64, 68); }, '#e0663c');
  ICON.love = bubble(g => { g.fillStyle = '#ff5c8a'; heartPath(g, 64, 66, 26); g.fill(); }, '#ff5c8a');
  ICON.note = bubble(g => { g.fillStyle = '#3cb88f'; g.font = `800 64px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('♪', 62, 66); }, '#3cb88f');
  ICON.smile = bubble(g => { g.strokeStyle = '#e0a400'; g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.arc(64, 58, 24, 0.3, Math.PI - 0.3); g.stroke(); g.fillStyle = '#e0a400'; g.beginPath(); g.arc(50, 50, 6, 0, 7); g.arc(78, 50, 6, 0, 7); g.fill(); }, '#e0a400');
  ICON.check = canvasTex(S, S, g => { g.fillStyle = 'rgba(58,35,80,.25)'; g.beginPath(); g.arc(64, 70, 50, 0, 7); g.fill(); g.fillStyle = '#3cb88f'; g.beginPath(); g.arc(64, 64, 50, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 12; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(42, 66); g.lineTo(58, 82); g.lineTo(88, 48); g.stroke(); });
}
function markerTex(st) {
  return canvasTex(160, 170, g => {
    g.translate(80, 78);
    if (st.id[0] === 'q') {
      g.fillStyle = 'rgba(58,35,80,.28)'; heartPath(g, 0, 8, 62); g.fill();
      g.fillStyle = '#fff'; heartPath(g, 0, 0, 64); g.fill();
      g.fillStyle = '#ff5c8a'; heartPath(g, 0, 2, 52); g.fill();
      g.fillStyle = '#fff'; g.font = `800 64px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(HQ[st.id].n), 0, 2);
    } else {
      g.fillStyle = 'rgba(58,35,80,.28)'; g.beginPath(); g.arc(0, 8, 56, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, 58, 0, 7); g.fill();
      g.fillStyle = st.col; g.beginPath(); g.arc(0, 0, 47, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.font = `800 76px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('!', 0, 6);
    }
  });
}

// ---------- khởi tạo ----------
function initWorld(canvas) {
  R = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  R.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
  GRAD = new THREE.DataTexture(new Uint8Array([105, 105, 105, 255, 178, 178, 178, 255, 235, 235, 235, 255]), 3, 1, THREE.RGBAFormat);
  GRAD.minFilter = GRAD.magFilter = THREE.NearestFilter; GRAD.generateMipmaps = false; GRAD.needsUpdate = true;

  SC = new THREE.Scene();
  SC.background = canvasTex(4, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#5fb8f5'); gr.addColorStop(0.55, '#a9dcff'); gr.addColorStop(1, '#fde9f3'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  SC.fog = new THREE.Fog(0xcfe9ff, 70, 170);
  CAM = new THREE.PerspectiveCamera(48, 1, 0.1, 400);
  SC.add(new THREE.HemisphereLight(0xffffff, 0xa8d98f, 0.66));
  SUN = new THREE.DirectionalLight(0xfff3dc, 0.58); SUN.position.set(22, 40, 18); SUN.castShadow = true;
  const sm = window.innerWidth < 700 ? 1024 : 2048; SUN.shadow.mapSize.set(sm, sm);
  Object.assign(SUN.shadow.camera, { left: -46, right: 46, top: 46, bottom: -46, near: 1, far: 120 });
  SUN.shadow.bias = -0.0006; SC.add(SUN);

  makeIcons();
  buildIsland(); buildPlaza();
  STATIONS.forEach(buildStation);
  buildPaths(); decorate(); buildSky();
}

// ---------- đảo & biển ----------
function buildIsland() {
  const grass = mesh(cyl(38, 38.4, 0.6, 72), 0x84c95e, false); at(grass, 0, -0.3, 0); SC.add(grass);
  const dirt = mesh(cyl(38.5, 39.6, 2.6, 72), 0xc99b6d, false); at(dirt, 0, -1.6, 0); SC.add(dirt);
  const sand = mesh(cyl(43.5, 47, 1, 72), 0xf7e1a8, false); at(sand, 0, -0.95, 0); SC.add(sand);
  // mảng cỏ đậm nhạt
  for (let i = 0; i < 26; i++) {
    const a = rng() * Math.PI * 2, r = 10 + rng() * 26, m = new THREE.Mesh(new THREE.CircleGeometry(1.5 + rng() * 3.5, 20), M(rng() < 0.5 ? 0x77bd55 : 0x93d26c));
    m.rotation.x = -Math.PI / 2; at(m, Math.sin(a) * r, 0.012 + i * 0.0004, Math.cos(a) * r); m.receiveShadow = true; SC.add(m);
  }
  const wg = new THREE.PlaneGeometry(320, 320, 64, 64); wg.rotateX(-Math.PI / 2);
  WATER = new THREE.Mesh(wg, new THREE.MeshToonMaterial({ color: 0x54c6ec, gradientMap: GRAD, transparent: true, opacity: 0.94 }));
  WATER.position.y = -0.62; WATER.receiveShadow = true; SC.add(WATER);
  const base = wg.attributes.position.array.slice();
  FOAM = new THREE.Mesh(new THREE.RingGeometry(46.4, 48.6, 72), MBasic(0xffffff, 0.75)); FOAM.rotation.x = -Math.PI / 2; FOAM.position.y = -0.5; SC.add(FOAM);
  ANIM.push((t) => {
    const p = wg.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) { const x = base[i], z = base[i + 2]; p[i + 1] = Math.sin(x * 0.12 + t * 1.1) * 0.18 + Math.cos(z * 0.1 + t * 0.9) * 0.16; }
    wg.attributes.position.needsUpdate = true; wg.computeVertexNormals();
    FOAM.scale.setScalar(1 + Math.sin(t * 1.3) * 0.012);
  });
  // cầu tàu + thuyền
  const dock = new THREE.Group(); dock.position.set(-9, 0, 37); dock.rotation.y = -0.25;
  for (let i = 0; i < 9; i++) dock.add(at(mesh(box(2.6, 0.18, 0.9), i % 2 ? 0xd9a36a : 0xcf9860), 0, -0.05, i * 0.95));
  for (const sx of [-1.2, 1.2]) for (const k of [3, 8]) dock.add(at(mesh(cyl(0.16, 0.16, 1.6), 0xa8754a), sx, -0.5, k));
  const boat = new THREE.Group(); boat.add(at(mesh(box(1.8, 0.6, 3.6), 0xffffff), 0, 0, 0)); boat.add(at(mesh(box(1.9, 0.18, 3.7), 0xe5484d), 0, 0.3, 0));
  boat.add(at(mesh(cyl(0.06, 0.06, 2.6), 0xa8754a), 0, 1.4, 0)); const sail = mesh(new THREE.ConeGeometry(0.9, 2, 3), 0xfff4d6); sail.scale.z = 0.12; at(sail, 0, 1.6, 0.35); boat.add(sail);
  at(boat, 2.6, -0.2, 7.5); dock.add(boat); SC.add(dock);
  ANIM.push(t => { boat.position.y = -0.25 + Math.sin(t * 1.6) * 0.08; boat.rotation.z = Math.sin(t * 1.2) * 0.05; });
}

// ---------- quảng trường ----------
const PLAZA_R = 8.6;
function buildPlaza() {
  SC.add(at(mesh(cyl(PLAZA_R, PLAZA_R + 0.2, 0.22, 64), 0xf6ead8, false), 0, 0.1, 0));
  SC.add(at(mesh(cyl(6.2, 6.2, 0.24, 64), 0xefd9c0, false), 0, 0.11, 0));
  SC.add(at(mesh(cyl(4.4, 4.4, 0.26, 64), 0xf6ead8, false), 0, 0.12, 0));
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, d = mesh(cyl(0.28, 0.28, 0.27, 6), i % 2 ? 0xff9ab8 : 0xb79ef0, false); at(d, Math.sin(a) * 5.3, 0.12, Math.cos(a) * 5.3); SC.add(d); }
  // đài phun nước
  const f = new THREE.Group();
  f.add(at(mesh(cyl(2.3, 2.5, 0.65, 28), 0xd8cdf0), 0, 0.5, 0));
  f.add(at(mesh(cyl(2.05, 2.05, 0.06, 28), MBasic(0x7fd8ff)), 0, 0.82, 0));
  f.add(at(mesh(cyl(0.35, 0.5, 1.5, 16), 0xd8cdf0), 0, 1.4, 0));
  f.add(at(mesh(cyl(1.05, 0.45, 0.4, 20), 0xc3b3ea), 0, 2.15, 0));
  f.add(at(mesh(cyl(0.9, 0.9, 0.05, 20), MBasic(0x7fd8ff)), 0, 2.36, 0));
  const top = at(mesh(sph(0.3), 0xff8fb1), 0, 2.6, 0); f.add(top); SC.add(f);
  COLL.push({ x: 0, z: 0, r: 2.7 });
  const drops = []; for (let i = 0; i < 14; i++) { const d = at(new THREE.Mesh(sph(0.09, 8, 6), MBasic(0xbdefff)), 0, 0, 0); SC.add(d); drops.push(d); }
  ANIM.push(t => drops.forEach((d, i) => { const a = i / drops.length * Math.PI * 2, k = (t * 0.7 + i * 0.37) % 1; d.position.set(Math.sin(a) * (0.3 + k * 1.6), 2.7 + k * 1.2 - k * k * 2.4, Math.cos(a) * (0.3 + k * 1.6)); }));
  // cổng KioMath phía bắc
  const gate = new THREE.Group(); gate.position.set(0, 0, -PLAZA_R - 0.2);
  for (const sx of [-2.1, 2.1]) { gate.add(at(mesh(cyl(0.22, 0.26, 3.6, 12), 0x643a86), sx, 1.8, 0)); gate.add(at(mesh(sph(0.32), 0xe0663c), sx, 3.75, 0)); COLL.push({ x: sx, z: -PLAZA_R - 0.2, r: 0.45 }); }
  const bw = 4.6, bh = 1.25;
  gate.add(at(mesh(box(bw + 0.3, bh + 0.25, 0.22), 0x643a86), 0, 3.3, 0));
  const logoTex = canvasTex(1024, 280, (g, w, h) => { g.fillStyle = '#ffffff'; rr(g, 0, 0, w, h, 40); g.fill(); });
  const logoMat = new THREE.MeshBasicMaterial({ map: logoTex });
  const front = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), logoMat); at(front, 0, 3.3, 0.115); gate.add(front);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), logoMat); back.rotation.y = Math.PI; at(back, 0, 3.3, -0.115); gate.add(back);
  const img = new Image(); img.onload = () => { const c = logoTex.image, g = c.getContext('2d'); const s = Math.min(900 / img.width, 220 / img.height); g.drawImage(img, (1024 - img.width * s) / 2, (280 - img.height * s) / 2, img.width * s, img.height * s); logoTex.needsUpdate = true; }; img.src = LOGO_SRC;
  SC.add(gate);
  // cột đèn + dây cờ
  const angs = STATIONS.map(s => Math.atan2(s.x, s.z)).concat([Math.PI]).sort((a, b) => a - b), lamps = [];
  for (let i = 0; i < angs.length; i++) { const a = angs[i], b = i + 1 < angs.length ? angs[i + 1] : angs[0] + Math.PI * 2; if (b - a > 0.5) { const m = (a + b) / 2; if (Math.cos(m) < -0.2) lamps.push([Math.sin(m) * 7.9, Math.cos(m) * 7.9]); } }
  lamps.sort((p, q) => Math.atan2(p[0], -p[1]) - Math.atan2(q[0], -q[1]));
  lamps.forEach(([x, z]) => {
    SC.add(at(mesh(cyl(0.09, 0.12, 3.2, 10), 0x643a86), x, 1.6, z));
    SC.add(at(new THREE.Mesh(sph(0.3, 14, 10), MBasic(0xfff1b8)), x, 3.3, z));
    SC.add(at(mesh(cone(0.38, 0.3, 10), 0x643a86), x, 3.62, z));
    COLL.push({ x, z, r: 0.35 });
  });
  const fc = [0xff5c8a, 0xffd23f, 0x4cb4e6, 0x3cc6a0, 0xb07be0, 0xff8a50];
  const tri = new THREE.Shape(); tri.moveTo(-0.17, 0); tri.lineTo(0.17, 0); tri.lineTo(0, -0.38); tri.closePath();
  const tg = new THREE.ShapeGeometry(tri);
  for (let i = 0; i < lamps.length - 1; i++) {
    const a = lamps[i], b = lamps[i + 1], n = 9;
    for (let k = 1; k < n; k++) {
      const u = k / n, x = a[0] + (b[0] - a[0]) * u, z = a[1] + (b[1] - a[1]) * u, y = 3.15 - Math.sin(u * Math.PI) * 0.7;
      const fl = new THREE.Mesh(tg, new THREE.MeshBasicMaterial({ color: fc[(i * 3 + k) % fc.length], side: THREE.DoubleSide }));
      at(fl, x, y, z); fl.rotation.y = Math.atan2(b[0] - a[0], b[1] - a[1]) + Math.PI / 2; SC.add(fl);
    }
  }
  // ghế đá
  [[-5.6, 3.6], [5.6, 3.6]].forEach(([x, z]) => { const b = new THREE.Group(); b.add(at(mesh(box(2, 0.18, 0.7), 0xd9a36a), 0, 0.55, 0)); for (const sx of [-0.75, 0.75]) b.add(at(mesh(box(0.18, 0.5, 0.6), 0x8b6a9e), sx, 0.25, 0)); b.position.set(x, 0.2, z); b.rotation.y = Math.atan2(-x, -z); SC.add(b); COLL.push({ x, z, r: 0.9 }); });
}

// ---------- các trạm ----------
function sGroup(st) { const G = new THREE.Group(); G.position.set(st.x, 0, st.z); G.rotation.y = Math.atan2(-st.x, -st.z); SC.add(G); G.updateMatrixWorld(); return G; }
function addC(G, lx, lz, r) { const p = G.localToWorld(new V3(lx, 0, lz)); COLL.push({ x: p.x, z: p.z, r }); }
function wpt(G, lx, lz) { const p = G.localToWorld(new V3(lx, 0, lz)); return { x: p.x, z: p.z }; }

function buildStation(st) {
  const G = sGroup(st), D = { G, st, npc: null, ip: wpt(G, 0, 2.6), top: 4.6 };
  const B = BUILD[st.id]; B(G, D);
  G.updateMatrixWorld();
  // nhãn tên + dấu nhiệm vụ
  const lab = textSprite(st.name, { fs: 44, h: 0.72 }); lab.position.set(st.x, D.top, st.z); SC.add(lab); D.label = lab;
  D.markTex = markerTex(st);
  const mk = sprite(D.markTex, 1.25, 160 / 170); mk.position.set(st.x, D.top + 1.2, st.z); SC.add(mk); D.marker = mk;
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.25, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(st.col), transparent: true, opacity: 0.7 }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(D.ip.x, 0.04, D.ip.z); SC.add(ring); D.ring = ring;
  ANIM.push(t => { mk.position.y = D.top + 1.2 + Math.sin(t * 2.4 + st.x) * 0.18; const todo = mk.material.map !== ICON.check, pz = todo ? 1 + Math.max(0, Math.sin(t * 5)) * 0.22 : 1; mk.scale.set(1.25 * 160 / 170 * pz, 1.25 * pz, 1); mk.material.opacity = todo ? 0.75 + Math.abs(Math.sin(t * 5)) * 0.25 : 1; ring.material.opacity = 0.35 + Math.abs(Math.sin(t * 3)) * 0.55; ring.scale.setScalar(1 + Math.sin(t * 3) * 0.08); if (D.npc) D.npc.tick(t); });
  ST3[st.id] = D;
}

const BUILD = {
  q1(G, D) { // Đồi Bài Khó
    G.add(at(mesh(sph(4.6, 26, 16), 0x7cc35c), 0, -0.6, -4.2)).scale.set(1, 1, 1);
    const m1 = G.children[G.children.length - 1]; m1.scale.set(1, 0.6, 1);
    const m2 = at(mesh(sph(3, 22, 14), 0x88cd66), 3.6, -0.4, -2.6); m2.scale.set(1, 0.55, 1); G.add(m2);
    G.add(at(mesh(box(4, 0.45, 0.9), 0x9b95ad), 0, 0.22, -0.6));
    G.add(at(mesh(box(3.6, 2.4, 0.38), 0xb9b3c9), 0, 1.7, -0.6));
    const slate = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.0), new THREE.MeshBasicMaterial({ map: canvasTex(512, 320, (g, w, h) => {
      g.fillStyle = '#2f4a45'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,.9)'; g.fillStyle = '#fff'; g.font = `700 54px ${FONT}`;
      g.fillText('x² + 2x = ?', 30, 80); g.font = `700 46px ${FONT}`; g.fillText('√(a + b)', 300, 150); g.fillText('∑ 1/n', 40, 170); g.font = `700 60px ${FONT}`; g.fillStyle = '#ffd23f'; g.fillText('π', 420, 70);
      g.fillStyle = '#ff9ab8'; g.font = `700 44px ${FONT}`; g.fillText('3, 6, 12, 24, ...?', 40, 260); g.lineWidth = 4; g.beginPath(); g.moveTo(340, 210); g.lineTo(460, 290); g.lineTo(340, 290); g.closePath(); g.stroke();
    }) }));
    at(slate, 0, 1.72, -0.4); G.add(slate);
    G.add(at(mesh(cyl(0.55, 0.65, 0.7, 14), 0xa8754a), 2.4, 0.35, 0.8));
    D.npc = makeAnimal('owl'); at(D.npc.g, 2.4, 0.7, 0.8); D.npc.g.scale.setScalar(0.85); G.add(D.npc.g);
    addC(G, 0, -0.6, 2.1); addC(G, 2.4, 0.8, 0.8); addC(G, 0, -4.2, 4.3); addC(G, 3.6, -2.6, 2.6); D.top = 4.4;
  },
  q2(G, D) { // Giếng Ước Mong
    G.add(at(mesh(cyl(1.35, 1.45, 0.95, 22), 0xc8c0d8), 0, 0.48, 0));
    G.add(at(mesh(cyl(1.12, 1.12, 0.05, 22), MBasic(0x3fb6f0)), 0, 0.9, 0));
    for (const sx of [-1.25, 1.25]) G.add(at(mesh(box(0.22, 2.3, 0.22), 0xa8754a), sx, 1.15, 0));
    const roof = at(mesh(cone(2.0, 1.1, 4), 0xe5484d), 0, 2.75, 0); roof.rotation.y = Math.PI / 4; G.add(roof);
    const crank = at(mesh(cyl(0.08, 0.08, 2.6, 8), 0x8b5e3c), 0, 2.0, 0); crank.rotation.z = Math.PI / 2; G.add(crank);
    G.add(at(mesh(cyl(0.22, 0.18, 0.32, 12), 0x8b6a9e), 0, 1.45, 0));
    D.npc = makeAnimal('rabbit'); at(D.npc.g, 2.1, 0, 1.0); G.add(D.npc.g);
    const sp = []; for (let i = 0; i < 6; i++) { const s = sprite(ICON.star, 0.35, 1); G.add(s); sp.push(s); }
    ANIM.push(t => sp.forEach((s, i) => { const k = (t * 0.35 + i / 6) % 1; s.position.set(Math.sin(i * 2.1 + t) * 0.7, 1 + k * 2.6, Math.cos(i * 2.1 + t) * 0.7); s.material.opacity = 1 - k; }));
    addC(G, 0, 0, 1.7); addC(G, 2.1, 1.0, 0.7);
  },
  q3(G, D) { // Lều Ấm Áp
    const tent = at(mesh(new THREE.ConeGeometry(2.4, 3.1, 8), M(0xf4a259)), 0, 1.55, -0.3); G.add(tent);
    G.add(at(mesh(cone(0.6, 0.8, 8), 0xe5484d), 0, 3.25, -0.3));
    G.add(at(mesh(cyl(0.05, 0.05, 0.8, 6), 0x8b5e3c), 0, 3.8, -0.3));
    const flag = at(mesh(box(0.5, 0.3, 0.03), 0xff5c8a), 0.27, 4.0, -0.3); G.add(flag);
    const sh = new THREE.Shape(); sh.moveTo(-0.75, 0); sh.lineTo(0.75, 0); sh.lineTo(0, 1.7); sh.closePath();
    const door = new THREE.Mesh(new THREE.ShapeGeometry(sh), MBasic(0x5a2e1c)); door.position.set(0, 0.02, 2.13 - 0.3); door.rotation.x = -Math.atan(2.4 / 3.1); G.add(door);
    G.add(at(mesh(cyl(0.07, 0.07, 1.8, 8), 0x8b5e3c), -2.3, 0.9, 1.2));
    G.add(at(new THREE.Mesh(sph(0.26, 14, 10), MBasic(0xffd36b)), -2.3, 1.95, 1.2));
    const c1 = at(mesh(sph(0.45), 0xb79ef0), -1.1, 0.25, 2.1); c1.scale.set(1, 0.45, 1); G.add(c1);
    const c2 = at(mesh(sph(0.4), 0xff9ab8), -0.3, 0.22, 2.4); c2.scale.set(1, 0.45, 1); G.add(c2);
    D.npc = makeAnimal('bear'); at(D.npc.g, 1.9, 0, 1.4); G.add(D.npc.g);
    addC(G, 0, -0.3, 2.5); addC(G, 1.9, 1.4, 0.75); addC(G, -2.3, 1.2, 0.3); D.top = 4.9;
  },
  q4(G, D) { // Tiệm Quà Bất Ngờ
    G.add(at(mesh(box(4.2, 2.5, 2.8), 0xffd1dc), 0, 1.25, -0.6));
    const roof = at(mesh(cone(3.3, 1.4, 4), 0xd94c7a), 0, 3.2, -0.6); roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 0.72); G.add(roof);
    for (let i = 0; i < 7; i++) { const s = at(mesh(box(0.62, 0.08, 1.0), i % 2 ? 0xffffff : 0xf06292), -1.86 + i * 0.62, 2.2, 1.15); s.rotation.x = 0.45; G.add(s); }
    G.add(at(mesh(box(3.2, 0.95, 0.8), 0xffffff), 0, 0.48, 1.3));
    G.add(at(mesh(box(3.3, 0.1, 0.9), 0xf06292), 0, 1.0, 1.3));
    G.add(at(mesh(box(1.0, 1.0, 0.06), 0x8a5a7a), -1.2, 1.4, 0.82));
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.55), new THREE.MeshBasicMaterial({ map: canvasTex(512, 128, (g, w, h) => { g.fillStyle = '#fff'; rr(g, 0, 0, w, h, 40); g.fill(); g.fillStyle = '#d94c7a'; g.font = `800 78px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('TIỆM QUÀ', w / 2, h / 2 + 6); }) }));
    at(sign, 0, 2.9, 0.82); G.add(sign);
    const gift = (x, z, s, c, rc) => { const g = new THREE.Group(); g.add(at(mesh(box(s, s, s), c), 0, s / 2, 0)); g.add(at(mesh(box(s * 1.02, s * 1.02, s * 0.2), rc), 0, s / 2, 0)); g.add(at(mesh(box(s * 0.2, s * 1.02, s * 1.02), rc), 0, s / 2, 0)); g.add(at(mesh(sph(s * 0.18, 10, 8), rc), 0, s * 1.05, 0)); at(g, x, 0, z); g.rotation.y = rng(); G.add(g); return g; };
    gift(-2.8, 1.3, 0.7, 0x4cb4e6, 0xffd23f); gift(-2.7, 2.1, 0.5, 0xb07be0, 0xffffff); const gt = gift(-2.8, 1.3, 0.4, 0xffd23f, 0xff5c8a); gt.position.y = 0.72;
    gift(2.8, 1.6, 0.6, 0x3cc6a0, 0xff5c8a);
    D.npc = makeAnimal('cat'); at(D.npc.g, 0.9, 1.05, 1.3); D.npc.g.scale.setScalar(0.7); G.add(D.npc.g);
    D.ip = wpt(G, 0, 3.0); addC(G, -1.2, -0.6, 1.6); addC(G, 1.2, -0.6, 1.6); addC(G, -0.8, 1.3, 0.9); addC(G, 0.8, 1.3, 0.9); addC(G, -2.8, 1.6, 0.6); addC(G, 2.8, 1.6, 0.5); D.top = 5;
  },
  tc(G, D) { // Đài Quan Sát
    G.add(at(mesh(cyl(1.7, 1.9, 2.8, 24), 0xdcd2fb), 0, 1.4, -0.3));
    G.add(at(mesh(cyl(1.78, 1.78, 0.22, 24), 0x8a6bd1), 0, 2.85, -0.3));
    G.add(at(mesh(new THREE.SphereGeometry(1.72, 26, 14, 0, Math.PI * 2, 0, Math.PI / 2), 0x6b5bd6), 0, 2.9, -0.3));
    const tel = at(mesh(cyl(0.22, 0.3, 2.3, 12), 0x40366b), 0, 3.6, 0.6); tel.rotation.x = 0.85; G.add(tel);
    G.add(at(mesh(box(0.9, 1.5, 0.1), 0x40366b), 0, 0.75, 1.55));
    G.add(at(mesh(box(1.6, 0.2, 0.8), 0xc3b3ea), 0, 0.1, 1.9));
    const stars = []; for (let i = 0; i < 5; i++) { const s = sprite(ICON.star, 0.4, 1); G.add(s); stars.push(s); }
    ANIM.push(t => stars.forEach((s, i) => { s.position.set(Math.sin(i * 1.3) * 1.6, 5.2 + Math.sin(t * 2 + i) * 0.3, -0.3 + Math.cos(i * 1.3) * 1.2); s.material.opacity = 0.5 + 0.5 * Math.sin(t * 3 + i * 2); }));
    addC(G, 0, -0.3, 2.1); D.top = 5.4;
  },
  kv(G, D) { // Bậc Thang Kì Vọng
    const cols = [0x8a6bd1, 0x9a72cf, 0xb27bc4, 0xcb7fab, 0xde7a7f, 0xe0663c];
    for (let k = 0; k < 6; k++) {
      const h = 0.38 * (k + 1), x = -2.75 + k * 1.1;
      G.add(at(mesh(box(1.08, h, 1.5), cols[k]), x, h / 2, -0.3));
      const lb = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.32), new THREE.MeshBasicMaterial({ map: canvasTex(128, 64, (g) => { g.fillStyle = '#fff'; rr(g, 0, 0, 128, 64, 22); g.fill(); g.fillStyle = '#3b2160'; g.font = `800 48px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(5 + k), 64, 36); }), transparent: true }));
      at(lb, x, Math.min(h - 0.2, 0.24 + 0.1 * k), 0.46); G.add(lb);
      addC(G, x, -0.3, 0.85);
    }
    G.add(at(mesh(cyl(0.05, 0.05, 1.6, 8), 0x40366b), 2.75, 3.0, -0.3));
    const fl = at(mesh(box(0.7, 0.42, 0.04), 0xffd23f), 3.12, 3.55, -0.3); G.add(fl);
    ANIM.push(t => { fl.rotation.y = Math.sin(t * 3) * 0.25; });
    D.top = 5.2;
  },
  hoc(G, D) { // Sân Chơi Toán
    const base = at(mesh(cone(0.4, 0.65, 3), 0x643a86), -1.8, 0.32, 0); G.add(base);
    const plank = new THREE.Group(); at(plank, -1.8, 0.66, 0); G.add(plank);
    plank.add(at(mesh(box(3.2, 0.12, 0.42), 0xffd23f), 0, 0, 0));
    for (const sx of [-1.4, 1.4]) plank.add(at(mesh(box(0.42, 0.3, 0.42), 0xff5c8a), sx, 0.18, 0));
    ANIM.push(t => { plank.rotation.z = Math.sin(t * 1.6) * 0.18; });
    G.add(at(mesh(box(1.1, 0.14, 1.1), 0x4cb4e6), 1.9, 1.4, -0.9));
    for (const sx of [1.4, 2.4]) for (const sz of [-1.4, -0.4]) G.add(at(mesh(cyl(0.07, 0.07, 1.45, 8), 0xffffff), sx, 0.72, sz));
    const sl = at(mesh(box(0.85, 0.08, 2.4), 0x3cc6a0), 1.9, 0.78, 0.6); sl.rotation.x = 0.55; G.add(sl);
    G.add(at(mesh(box(0.08, 0.3, 2.4), 0x2fa37e), 1.48, 0.86, 0.6).rotateX(0.55)); G.add(at(mesh(box(0.08, 0.3, 2.4), 0x2fa37e), 2.32, 0.86, 0.6).rotateX(0.55));
    const ball = at(mesh(sph(0.3), 0xff8a50), -0.2, 0.3, 1.8); G.add(ball);
    ANIM.push(t => { ball.position.y = 0.3 + Math.abs(Math.sin(t * 3)) * 0.6; });
    D.npc = makeAnimal('squirrel'); at(D.npc.g, 0.2, 0, 0.9); D.npc.g.scale.setScalar(0.85); G.add(D.npc.g);
    addC(G, -2.8, 0, 0.6); addC(G, -1.8, 0, 0.6); addC(G, -0.8, 0, 0.6); addC(G, 1.9, -0.9, 0.9); addC(G, 1.9, 0.6, 0.6); addC(G, 0.2, 0.9, 0.6);
  },
  guong(G, D) { // Gương Thần
    G.add(at(mesh(box(1.6, 0.3, 0.9), 0xd9a441), 0, 0.15, 0));
    for (const sx of [-0.55, 0.55]) G.add(at(mesh(cyl(0.08, 0.1, 0.9, 8), 0xd9a441), sx, 0.7, 0));
    const fr = at(mesh(new THREE.TorusGeometry(1, 0.13, 10, 44), 0xf2c14e), 0, 2.05, 0); fr.scale.set(0.74, 1, 1); G.add(fr);
    const glassMat = new THREE.MeshBasicMaterial({ color: 0xbfe9ff });
    const glass = at(new THREE.Mesh(new THREE.CircleGeometry(1, 44), glassMat), 0, 2.05, 0.02); glass.scale.set(0.74, 1, 1); G.add(glass);
    const gb = glass.clone(); gb.rotation.y = Math.PI; gb.position.z = -0.02; G.add(gb);
    G.add(at(mesh(sph(0.2, 12, 8), 0xff9ab8), 0, 3.2, 0));
    const c = new THREE.Color();
    ANIM.push(t => { c.setHSL(0.55 + Math.sin(t * 0.8) * 0.12, 0.8, 0.85); glassMat.color.copy(c); });
    const sp = []; for (let i = 0; i < 4; i++) { const s = sprite(ICON.spark, 0.5, 1); G.add(s); sp.push(s); }
    ANIM.push(t => sp.forEach((s, i) => { const a = t * 1.2 + i * Math.PI / 2; s.position.set(Math.cos(a) * 1.0, 2.05 + Math.sin(a) * 1.3, 0.2); }));
    addC(G, 0, 0, 1.0); D.top = 4.4;
  },
  thu(G, D) { // Hòm Thư
    G.add(at(mesh(box(0.2, 1.15, 0.2), 0x8b5e3c), 0, 0.58, 0));
    G.add(at(mesh(box(0.75, 0.5, 0.95), 0xe5484d), 0, 1.35, 0));
    const tp = at(mesh(cyl(0.375, 0.375, 0.95, 16), 0xe5484d), 0, 1.6, 0); tp.rotation.x = Math.PI / 2; G.add(tp);
    G.add(at(mesh(box(0.5, 0.06, 0.04), 0xffffff), 0, 1.4, 0.49));
    const fl = new THREE.Group(); at(fl, 0.42, 1.45, -0.2); fl.add(at(mesh(box(0.05, 0.6, 0.05), 0xffd23f), 0, 0.3, 0)); fl.add(at(mesh(box(0.05, 0.22, 0.3), 0xffd23f), 0, 0.5, 0.15)); G.add(fl);
    ANIM.push(t => { fl.rotation.x = -0.2 + Math.sin(t * 2) * 0.25; });
    const env = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.34), new THREE.MeshBasicMaterial({ map: canvasTex(128, 88, (g) => { g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 88); g.strokeStyle = '#e0663c'; g.lineWidth = 5; g.beginPath(); g.moveTo(4, 4); g.lineTo(64, 50); g.lineTo(124, 4); g.stroke(); g.fillStyle = '#ff5c8a'; heartPath(g, 64, 62, 12); g.fill(); }), side: THREE.DoubleSide }));
    G.add(env);
    ANIM.push(t => { env.position.set(Math.sin(t * 0.9) * 0.5, 2.4 + Math.sin(t * 1.8) * 0.15, 0); env.rotation.z = Math.sin(t * 1.5) * 0.3; });
    D.ip = wpt(G, 0, 1.9); addC(G, 0, 0, 0.6); D.top = 3.4;
  }
};

// đường đá dẫn từ quảng trường tới từng trạm
function buildPaths() {
  const pts = [];
  STATIONS.forEach(st => {
    const ip = ST3[st.id].ip, d = Math.hypot(ip.x, ip.z), ux = ip.x / d, uz = ip.z / d;
    for (let r = PLAZA_R + 0.9; r < d - 1.4; r += 1.35) { const j = (rng() - 0.5) * 0.4; pts.push([ux * r - uz * j, uz * r + ux * j, rng() * 3]); }
  });
  const im = new THREE.InstancedMesh(cyl(0.58, 0.62, 0.1, 8), M(0xf3e3c6), pts.length), o = new THREE.Object3D();
  pts.forEach((p, i) => { o.position.set(p[0], 0.03, p[1]); o.rotation.y = p[2]; o.scale.set(1, 1, 0.8 + rng() * 0.3); o.updateMatrix(); im.setMatrixAt(i, o.matrix); });
  im.receiveShadow = true; SC.add(im); PATHS = pts;
}
let PATHS = [];

// cây, bụi, hoa, đá
function freeSpot(x, z, rad) {
  if (Math.hypot(x, z) < PLAZA_R + 2) return false;
  for (const st of STATIONS) if (Math.hypot(x - st.x, z - st.z) < 5.4) return false;
  for (const c of COLL) if (Math.hypot(x - c.x, z - c.z) < c.r + rad) return false;
  for (const p of PATHS) if (Math.hypot(x - p[0], z - p[1]) < 1.6 + rad) return false;
  if (Math.hypot(x + 9, z - 37) < 4) return false;
  return true;
}
function decorate() {
  const leaf = [0x5fbf55, 0x6fcf5f, 0x4fae5a, 0x7ad36a], bloom = [0xffb3cc, 0xffc9de];
  let n = 0, tries = 0;
  while (n < 46 && tries < 2000) {
    tries++; const a = rng() * Math.PI * 2, r = 11 + rng() * 25.5, x = Math.sin(a) * r, z = Math.cos(a) * r;
    if (!freeSpot(x, z, 1.4)) continue;
    const t = new THREE.Group(), s = 0.85 + rng() * 0.5, kind = rng();
    t.add(at(mesh(cyl(0.2, 0.3, 1.6, 8), 0x9a6a45), 0, 0.8, 0));
    if (kind < 0.22) { for (let k = 0; k < 3; k++) t.add(at(mesh(cone(1.25 - k * 0.3, 1.3, 8), 0x3f9e5a), 0, 1.6 + k * 0.7, 0)); }
    else { const c = kind > 0.84 ? bloom[n % 2] : leaf[n % 4]; t.add(at(mesh(sph(1.15, 14, 10), c), 0, 2.2, 0)); t.add(at(mesh(sph(0.8, 12, 8), c), 0.6, 2.0, 0.3)); t.add(at(mesh(sph(0.75, 12, 8), c), -0.5, 2.7, -0.2)); }
    t.scale.setScalar(s); t.position.set(x, 0, z); t.rotation.y = rng() * 6; SC.add(t);
    COLL.push({ x, z, r: 0.55 * s }); n++;
    const ph = rng() * 6; ANIM.push(tt => { t.rotation.z = Math.sin(tt * 1.2 + ph) * 0.02; });
  }
  // bụi cây
  tries = 0; n = 0;
  while (n < 34 && tries < 1500) {
    tries++; const a = rng() * Math.PI * 2, r = 10 + rng() * 27, x = Math.sin(a) * r, z = Math.cos(a) * r;
    if (!freeSpot(x, z, 0.8)) continue;
    const b = new THREE.Group(), c = leaf[n % 4];
    b.add(at(mesh(sph(0.7, 12, 8), c), 0, 0.35, 0)); b.add(at(mesh(sph(0.5, 10, 8), c), 0.55, 0.28, 0.1));
    if (n % 3 === 0) for (let k = 0; k < 4; k++) b.add(at(mesh(sph(0.1, 6, 4), [0xff5c8a, 0xffd23f, 0xffffff][k % 3], false), Math.cos(k * 1.7) * 0.55, 0.6 + (k % 2) * 0.1, Math.sin(k * 1.7) * 0.5));
    b.position.set(x, 0, z); SC.add(b); COLL.push({ x, z, r: 0.75 }); n++;
  }
  // hoa
  const fc = [0xff5c8a, 0xffd23f, 0xffffff, 0xb07be0, 0xff8a50], o = new THREE.Object3D();
  fc.forEach(col => {
    const im = new THREE.InstancedMesh(sph(0.13, 6, 4), M(col), 40); let k = 0;
    while (k < 40) { const a = rng() * Math.PI * 2, r = 9.5 + rng() * 28, x = Math.sin(a) * r, z = Math.cos(a) * r; if (!freeSpot(x, z, 0)) continue; o.position.set(x, 0.14, z); o.updateMatrix(); im.setMatrixAt(k++, o.matrix); }
    SC.add(im);
  });
  // đá
  for (let i = 0; i < 14; i++) { const a = rng() * Math.PI * 2, r = 37 + rng() * 5, x = Math.sin(a) * r, z = Math.cos(a) * r; const m = mesh(new THREE.DodecahedronGeometry(0.6 + rng() * 0.9), 0xb8b2c8); m.position.set(x, -0.2, z); m.rotation.set(rng(), rng(), rng()); SC.add(m); }
  // bướm
  for (let i = 0; i < 7; i++) {
    const b = new THREE.Group(), col = [0xffd23f, 0xff9ab8, 0xb07be0, 0x7fd8ff][i % 4];
    const wgeo = new THREE.CircleGeometry(0.18, 10), wm = new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide });
    const w1 = new THREE.Mesh(wgeo, wm), w2 = new THREE.Mesh(wgeo, wm); w1.position.x = 0.15; w2.position.x = -0.15;
    const p1 = new THREE.Group(), p2 = new THREE.Group(); p1.add(w1); p2.add(w2); b.add(p1, p2); SC.add(b);
    const cx = (rng() - 0.5) * 50, cz = (rng() - 0.5) * 50, ph = rng() * 6;
    ANIM.push(t => { const tt = t * 0.5 + ph; b.position.set(cx + Math.sin(tt) * 4, 1.2 + Math.sin(tt * 3) * 0.4, cz + Math.sin(tt * 1.3) * 3); b.rotation.y = tt; const f = Math.sin(t * 18 + ph) * 0.9; p1.rotation.z = f; p2.rotation.z = -f; b.rotation.x = -Math.PI / 2 + 0.4; });
  }
}
function buildSky() {
  for (let i = 0; i < 9; i++) {
    const c = new THREE.Group(), n = 3 + Math.floor(rng() * 3);
    for (let k = 0; k < n; k++) { const s = new THREE.Mesh(sph(2 + rng() * 1.6, 12, 8), MBasic(0xffffff)); s.position.set(k * 2.4 - n, rng() * 0.8, rng() * 1.5); s.scale.y = 0.7; c.add(s); }
    const a = rng() * Math.PI * 2, r = 45 + rng() * 40; c.position.set(Math.sin(a) * r, 26 + rng() * 14, Math.cos(a) * r); SC.add(c);
    const sp = 0.4 + rng() * 0.5; ANIM.push((t, dt) => { c.position.x += dt * sp; if (c.position.x > 110) c.position.x = -110; });
  }
}

// ---------- nhân vật người (chibi) ----------
const SKIN = [0xffe2cc, 0xf2c39b, 0xc98e66];
const HAIRC = [0x2b2233, 0x5b3a29, 0xa8713f, 0xe8b04b, 0x8a5bd6];
const SHIRT = [0xf06292, 0x4c8df6, 0xffc94a, 0x3cc6a0, 0x8a6bd1, 0xff8a50];
const HAIRS = ['ngan', 'dai', 'bui', 'bim', 'mu'];
function face(head, r, o = {}) {
  const ey = o.ey ?? -0.02, ex = o.ex ?? 0.16;
  for (const sx of [-1, 1]) {
    const x = sx * ex, z = Math.sqrt(r * r - x * x - ey * ey) - 0.02;
    const e = at(new THREE.Mesh(sph(0.068, 12, 10), MBasic(0x2b1d3a)), x, ey, z); e.scale.set(1, 1.35, 0.6); head.add(e);
    head.add(at(new THREE.Mesh(sph(0.024, 8, 6), MBasic(0xffffff)), x + 0.022, ey + 0.045, z + 0.035));
    const bx = sx * (ex + 0.12), by = ey - 0.11, bz = Math.sqrt(Math.max(0.01, r * r - bx * bx - by * by)) + 0.005;
    const bl = at(new THREE.Mesh(new THREE.CircleGeometry(0.065, 14), MBasic(0xff8fb1, 0.65)), bx, by, bz); bl.lookAt(bx * 3, by * 3, bz * 3); head.add(bl);
  }
  if (!o.noMouth) { const m = at(new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.013, 6, 12, Math.PI), MBasic(0x7a2e3a)), 0, ey - 0.1, Math.sqrt(r * r - (ey - 0.1) ** 2) - 0.005); m.rotation.z = Math.PI; head.add(m); }
}
function makeHuman(look, adult, nameTxt) {
  const root = new THREE.Group(), rig = new THREE.Group(); root.add(rig);
  const skin = SKIN[look.skin || 0], hairC = HAIRC[look.hairC || 0], shirt = SHIRT[look.shirt || 0];
  const pants = adult ? 0x4b4f72 : 0x3f5bb5, shoe = adult ? 0x3a2a4a : 0xffffff;
  const legs = [], arms = [];
  for (const sx of [-1, 1]) {
    const p = at(new THREE.Group(), sx * 0.14, 0.42, 0);
    p.add(outline(at(mesh(cyl(0.1, 0.11, 0.36, 10), pants), 0, -0.17, 0), 1.08));
    const s = outline(at(mesh(sph(0.13, 12, 8), shoe), 0, -0.36, 0.04), 1.08); s.scale.set(1, 0.62, 1.35); p.add(s);
    rig.add(p); legs.push(p);
  }
  rig.add(outline(at(mesh(cyl(0.26, 0.35, 0.52, 18), shirt), 0, 0.66, 0)));
  rig.add(at(mesh(cyl(0.355, 0.355, 0.1, 18), pants), 0, 0.44, 0));
  for (const sx of [-1, 1]) {
    const p = at(new THREE.Group(), sx * 0.33, 0.86, 0); p.rotation.z = sx * 0.14;
    p.add(outline(at(mesh(cyl(0.075, 0.07, 0.34, 8), shirt), 0, -0.16, 0), 1.1));
    p.add(outline(at(mesh(sph(0.088, 10, 8), skin), 0, -0.36, 0), 1.1));
    rig.add(p); arms.push(p);
  }
  const head = at(new THREE.Group(), 0, 1.3, 0); rig.add(head);
  const R0 = 0.47; head.add(outline(mesh(sph(R0, 26, 18), skin), 1.045));
  face(head, R0);
  const hair = (g, x, y, z, c = hairC) => { const m = at(mesh(g, c), x, y, z); head.add(m); return m; };
  const st = look.hair || 'ngan';
  if (st !== 'mu') {
    outline(hair(sph(0.5, 24, 16), 0.0, 0.07, -0.08), 1.04);
    for (let i = -2; i <= 2; i++) { const f = hair(sph(0.15, 10, 8), i * 0.13, 0.3 - Math.abs(i) * 0.03, 0.34 - Math.abs(i) * 0.04); f.scale.set(1, 0.8, 0.7); }
  }
  if (st === 'dai') { const b = hair(cyl(0.44, 0.5, 0.75, 18), 0, -0.33, -0.15); b.scale.z = 0.75; for (const sx of [-1, 1]) { const s = hair(cyl(0.12, 0.13, 0.6, 10), sx * 0.4, -0.25, 0.05); } }
  if (st === 'bui') { outline(hair(sph(0.21, 14, 10), 0, 0.5, -0.2), 1.06); hair(new THREE.TorusGeometry(0.15, 0.04, 6, 14), 0, 0.42, -0.17, 0xff5c8a).rotation.x = 1.2; }
  if (st === 'bim') for (const sx of [-1, 1]) { outline(hair(sph(0.17, 12, 10), sx * 0.5, -0.02, -0.08), 1.06); hair(sph(0.07, 8, 6), sx * 0.42, 0.12, -0.04, 0xffd23f); }
  if (st === 'mu') {
    outline(hair(sph(0.49, 24, 16), 0, 0.02, -0.1), 1.04);
    const cap = hair(new THREE.SphereGeometry(0.53, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), shirt === SHIRT[4] ? 0xffc94a : 0x643a86, 0, 0.06, 0); outline(cap, 1.03);
    const brim = hair(cyl(0.3, 0.3, 0.05, 18), 0, 0.1, 0.42, shirt === SHIRT[4] ? 0xffc94a : 0x643a86); brim.scale.set(1, 1, 0.75);
    hair(sph(0.07, 8, 6), 0, 0.58, 0, 0xe0663c);
  }
  rig.scale.setScalar(adult ? 1.12 : 0.92);
  const H = { root, rig, legs, arms, head, adult, ph: 0, emo: null, emoT: 0, yaw: 0, vy: 0, y: 0, h: (adult ? 1.12 : 0.92) * 1.85 };
  if (nameTxt) setNameTag(H, nameTxt);
  const bub = sprite(ICON.love, 0.7, 1); bub.visible = false; bub.position.y = H.h + 0.95; root.add(bub); H.bubble = bub;
  return H;
}
function setNameTag(H, txt) {
  if (H.tag) { H.root.remove(H.tag); H.tag.material.map.dispose(); }
  H.tag = textSprite(txt, { fs: 40, h: 0.42, bg: '#ffffff', fg: '#3b2160', stroke: H.adult ? '#e0663c' : '#8a6bd1' });
  H.tag.position.y = H.h + 0.4; H.root.add(H.tag);
}
function bubble(H, kind, dur = 1.6) { H.bubble.material.map = ICON[kind]; H.bubble.material.needsUpdate = true; H.bubble.visible = true; H.bubT = dur; H.bubA = 0; }
function animHuman(H, dt, sp, t) {
  H.ph += dt * 11 * sp;
  const sw = Math.sin(H.ph) * 0.8 * sp, onG = H.y <= 0.001;
  H.legs[0].rotation.x = onG ? sw : -0.5; H.legs[1].rotation.x = onG ? -sw : 0.3;
  let a0x = -sw * 0.9, a1x = sw * 0.9, a0z = -0.14, a1z = 0.14;
  H.rig.position.y = (onG ? Math.abs(Math.sin(H.ph)) * 0.07 * sp : 0) + Math.sin(t * 2.2) * 0.012;
  H.rig.rotation.z = 0; H.rig.rotation.x = 0; H.head.rotation.set(0, 0, 0);
  if (!onG) { a0z = -1.2; a1z = 1.2; a0x = a1x = 0; }
  if (H.emo) {
    H.emoT += dt; const e = H.emo, k = H.emoT;
    if (e === 'wave') { a1z = 2.6 + Math.sin(k * 14) * 0.35; a1x = 0; }
    else if (e === 'cheer') { a0z = -2.7 + Math.sin(k * 16) * 0.2; a1z = 2.7 - Math.sin(k * 16) * 0.2; a0x = a1x = 0; }
    else if (e === 'dance') { const s = Math.sin(k * 8); H.rig.rotation.z = s * 0.15; a0z = -1.4 - s; a1z = 1.4 - s; a0x = a1x = 0; H.head.rotation.z = -s * 0.15; }
    else if (e === 'think') { a1x = -2.1; a1z = -0.35; H.head.rotation.z = 0.18; H.head.rotation.x = Math.sin(k * 3) * 0.05; }
    else if (e === 'five') { a1x = -2.7; a1z = 0.2; }
    else if (e === 'five2') { a0x = -2.7; a0z = -0.2; }
    else if (e === 'hug') { a0x = a1x = -1.45; a0z = 0.45; a1z = -0.45; H.rig.rotation.x = 0.12; }
    else if (e === 'peace') { a1z = 2.4; a1x = -0.3; a0z = -0.7; H.head.rotation.z = 0.12; }
    else if (e === 'bow') { H.rig.rotation.x = Math.min(k * 3, 0.45); a0x = a1x = 0.1; }
    if (H.emoDur && H.emoT > H.emoDur) { H.emo = null; }
  }
  const L = (v, tgt) => v + (tgt - v) * Math.min(1, dt * 14);
  H.arms[0].rotation.x = L(H.arms[0].rotation.x, a0x); H.arms[1].rotation.x = L(H.arms[1].rotation.x, a1x);
  H.arms[0].rotation.z = L(H.arms[0].rotation.z, a0z); H.arms[1].rotation.z = L(H.arms[1].rotation.z, a1z);
  let dy = H.yaw - H.root.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); H.root.rotation.y += dy * Math.min(1, dt * 12);
  if (H.bubble.visible) { H.bubT -= dt; H.bubA += dt; const s = Math.min(1, H.bubA * 6) * (H.bubT < 0.2 ? Math.max(0, H.bubT / 0.2) : 1); H.bubble.scale.set(0.7 * s, 0.7 * s, 1); H.bubble.position.y = H.h + 0.95 + Math.sin(H.bubA * 5) * 0.05; if (H.bubT <= 0) H.bubble.visible = false; }
}
function emote(H, k, dur) { H.emo = k; H.emoT = 0; H.emoDur = dur || 0; }

// ---------- thú NPC ----------
function makeAnimal(kind) {
  const C = { owl: [0x9b7bd6, 0xf3e7ff], rabbit: [0xfafafa, 0xffd6e4], bear: [0xc58a5a, 0xf1d3b3], cat: [0xf2a14b, 0xfff1de], squirrel: [0xc7743d, 0xffe2c4] }[kind];
  const g = new THREE.Group(), rig = new THREE.Group(); g.add(rig);
  const body = outline(at(mesh(sph(0.55, 20, 14), C[0]), 0, 0.55, 0), 1.05); body.scale.set(1, 0.95, 0.9); rig.add(body);
  const belly = at(mesh(sph(0.4, 16, 12), C[1]), 0, 0.5, 0.2); belly.scale.set(1, 1, 0.7); rig.add(belly);
  for (const sx of [-1, 1]) { const f = outline(at(mesh(sph(0.17, 10, 8), C[0]), sx * 0.25, 0.08, 0.15), 1.08); f.scale.set(1, 0.6, 1.2); rig.add(f); }
  const head = at(new THREE.Group(), 0, 1.3, 0); rig.add(head);
  const hr = 0.48; head.add(outline(mesh(sph(hr, 22, 16), C[0]), 1.045));
  face(head, hr, { noMouth: kind === 'owl' });
  if (kind === 'owl') {
    for (const sx of [-1, 1]) { const e = at(mesh(sph(0.16, 12, 10), C[1]), sx * 0.16, 0.0, 0.33); e.scale.z = 0.4; head.add(e); const t = at(mesh(cone(0.11, 0.3, 6), C[0]), sx * 0.3, 0.45, 0); t.rotation.z = -sx * 0.4; head.add(t); }
    const bk = at(mesh(cone(0.07, 0.18, 6), 0xffa726), 0, -0.12, 0.47); bk.rotation.x = Math.PI / 2 + 0.4; head.add(bk);
    for (const sx of [-1, 1]) { const w = outline(at(mesh(sph(0.3, 12, 10), C[0]), sx * 0.52, 0.6, 0), 1.06); w.scale.set(0.35, 0.9, 0.7); rig.add(w); }
    head.add(at(mesh(cyl(0.3, 0.3, 0.06, 4), 0x40366b), 0, 0.5, 0).rotateY(Math.PI / 4));
    head.add(at(mesh(box(0.24, 0.2, 0.24), 0x40366b), 0, 0.42, 0));
  }
  if (kind === 'rabbit') for (const sx of [-1, 1]) { const e = outline(at(mesh(sph(0.14, 12, 10), C[0]), sx * 0.17, 0.62, -0.02), 1.06); e.scale.set(0.9, 2.9, 0.6); e.rotation.z = -sx * 0.18; head.add(e); const i = at(mesh(sph(0.09, 10, 8), C[1]), sx * 0.17, 0.6, 0.05); i.scale.set(0.8, 2.6, 0.4); i.rotation.z = -sx * 0.18; head.add(i); }
  if (kind === 'bear') { for (const sx of [-1, 1]) head.add(outline(at(mesh(sph(0.15, 12, 10), C[0]), sx * 0.33, 0.36, -0.05), 1.08)); const m = at(mesh(sph(0.16, 12, 10), C[1]), 0, -0.13, 0.4); m.scale.set(1.2, 0.8, 0.8); head.add(m); head.add(at(mesh(sph(0.05, 8, 6), 0x3a2350), 0, -0.08, 0.53)); const hp = at(mesh(sph(0.28, 14, 10), 0xff9ab8), 0, 0.55, 0.42); hp.scale.set(1, 0.85, 0.6); rig.add(hp); }
  if (kind === 'cat' || kind === 'squirrel') { for (const sx of [-1, 1]) { const e = outline(at(mesh(cone(0.14, 0.3, 4), C[0]), sx * 0.27, 0.42, -0.02), 1.08); e.rotation.z = -sx * 0.3; head.add(e); } head.add(at(mesh(sph(0.04, 8, 6), 0xff7b9c), 0, -0.06, 0.48)); }
  if (kind === 'cat') { const t = outline(at(mesh(cyl(0.07, 0.07, 0.8, 8), C[0]), 0, 0.6, -0.55), 1.1); t.rotation.x = -0.6; rig.add(t); head.add(at(mesh(cyl(0.3, 0.3, 0.12, 16), 0xff5c8a), 0, 0.42, -0.05)); }
  if (kind === 'squirrel') { const t = outline(at(mesh(sph(0.35, 14, 10), C[0]), 0, 1.1, -0.6), 1.05); t.scale.set(0.8, 1.6, 0.7); t.rotation.x = -0.35; rig.add(t); }
  const ph = Math.random() * 6;
  const A = {
    g, head, rig,
    tick(t) {
      rig.position.y = Math.abs(Math.sin(t * 2 + ph)) * 0.05; rig.scale.set(1 + Math.sin(t * 4 + ph) * 0.015, 1 - Math.sin(t * 4 + ph) * 0.015, 1);
      if (PLAYER && PLAYER.root.visible) {
        const p = new V3(); g.getWorldPosition(p); const dx = PLAYER.root.position.x - p.x, dz = PLAYER.root.position.z - p.z;
        let want = 0; if (dx * dx + dz * dz < 64) { const wy = new THREE.Quaternion(); g.parent.getWorldQuaternion(wy); const e = new THREE.Euler().setFromQuaternion(wy, 'YXZ'); want = Math.atan2(dx, dz) - e.y; want = Math.atan2(Math.sin(want), Math.cos(want)); want = Math.max(-1.2, Math.min(1.2, want)); }
        head.rotation.y += (want - head.rotation.y) * 0.08;
      }
    }
  };
  return A;
}
let PLAYER = null;

// ---------- hạt hiệu ứng ----------
const PARTS = [];
function burst(pos, kind = 'heart', n = 14, spd = 4) {
  for (let i = 0; i < n; i++) {
    const s = sprite(ICON[kind], 0.4 + Math.random() * 0.3, 1); s.position.copy(pos);
    const a = Math.random() * Math.PI * 2, u = 0.4 + Math.random();
    s.userData = { v: new V3(Math.cos(a) * spd * 0.5 * u, spd * (0.8 + Math.random() * 0.6), Math.sin(a) * spd * 0.5 * u), life: 1.4 + Math.random() * 0.6, age: 0, base: s.scale.x };
    SC.add(s); PARTS.push(s);
  }
}
function tickParts(dt) {
  for (let i = PARTS.length - 1; i >= 0; i--) {
    const s = PARTS[i], u = s.userData; u.age += dt; u.v.y -= 6 * dt; s.position.addScaledVector(u.v, dt);
    const k = 1 - u.age / u.life; s.material.opacity = Math.max(0, k); s.scale.set(u.base * (0.6 + k * 0.4), u.base * (0.6 + k * 0.4), 1);
    if (u.age >= u.life) { SC.remove(s); s.material.dispose(); PARTS.splice(i, 1); }
  }
}
function groundY(x, z) { return Math.hypot(x, z) < PLAZA_R ? 0.21 : 0; }
