// ====== LUỒNG CHƠI: tạo nhân vật → lượt bố/mẹ → chuyển máy → lượt con → Đổi phiếu ======
const KEY = 'hieunhau-v1';
// Mật khẩu xem "Dành cho KioMath": chỉ lưu SHA-256 của 'hieunhau:' + mật khẩu.
const STAFF_HASH = 'a7b22d0ab6e2cba152992ba03a3d9ce2ec0ea11d5a9f7726d916cede43cb2b0d';
// Dán URL Apps Script (đuôi /exec) vào đây để gửi kết quả về Google Sheet. Để trống = chỉ lưu trên máy.
const SHEET_API = '';

const $ = id => document.getElementById(id);
const store = {
  get(k, d) { try { const v = localStorage.getItem(KEY + ':' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(KEY + ':' + k, JSON.stringify(v)); } catch (e) {} }
};
function fresh() {
  return {
    phase: 'title', role: 'Mẹ',
    p: { name: '', phone: '', child: '', look: { hair: 'dai', hairC: 1, shirt: 0, skin: 0 } },
    c: { name: '', cls: '', look: { hair: 'ngan', hairC: 0, shirt: 2, skin: 0 } },
    ans: { p: {}, c: {} }, done: { p: [], c: [] }, te: {}, rv: { step: 0, flipped: [] },
    acts: {}, goal: '', saved: false, photo: '', id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  };
}
let S = Object.assign(fresh(), store.get('session', {}));
const save = () => store.set('session', S);

// ---------- chữ ----------
const last = s => (s || '').trim().split(/\s+/).pop() || '';
const cP = () => S.role, lp = () => S.role.toLowerCase();
const cC = () => last(S.c.name || S.p.child) || 'con';
const fill = s => String(s).replace(/\{P\}/g, cP()).replace(/\{p\}/g, lp()).replace(/\{C\}/g, cC());
const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const F = s => esc(fill(s));
const pTag = () => (S.role + ' ' + last(S.p.name)).trim();
const HEART = '<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.3-9.2C1.4 8.3 3.6 4.5 7.3 4.5c2 0 3.4 1.1 4.7 2.7 1.3-1.6 2.7-2.7 4.7-2.7 3.7 0 5.9 3.8 4.6 7.3C19.5 16.4 12 21 12 21z" fill="currentColor"/></svg>';

let MODE = 'title', T = 0, HP = null, HC = null, camYaw = 0, camDist = 10.5, ARROW = null, STAFF_OK = false, BUSY = false;
const keys = {}; let jx = 0, jy = 0, drag = null, nearSt = null, hintKey = '';
const lookAtV = new V3(0, 0, 0);

// ---------- khởi động ----------
async function boot() {
  $('logoTitle').src = LOGO_SRC; $('logoLoad').src = LOGO_SRC;
  try { await Promise.race([Promise.all([document.fonts.load('800 40px "Baloo 2"', 'Đảo Hiểu ơ'), document.fonts.load('700 16px "Nunito"', 'Đảo Hiểu ơ')]), new Promise(r => setTimeout(r, 2500))]); } catch (e) {}
  initWorld($('cv'));
  const sh = new THREE.Shape(); sh.moveTo(0, 0.6); sh.lineTo(0.42, 0.05); sh.lineTo(0.15, 0.05); sh.lineTo(0.15, -0.4); sh.lineTo(-0.15, -0.4); sh.lineTo(-0.15, 0.05); sh.lineTo(-0.42, 0.05); sh.closePath();
  ARROW = new THREE.Group(); const am = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color: 0xe0663c, transparent: true, opacity: 0.92, side: THREE.DoubleSide })); am.rotation.x = Math.PI / 2; ARROW.add(am); ARROW.visible = false; SC.add(ARROW);
  bindUI(); resize(); addEventListener('resize', resize);
  requestAnimationFrame(frame);
  setTimeout(() => $('loading').classList.add('gone'), 250);
  showTitle();
}

function hideAll() {
  ['scTitle', 'scCreate', 'hud', 'dlg', 'turnEnd', 'scPass', 'scReveal', 'photo', 'staff'].forEach(id => $(id).hidden = true);
  ARROW && (ARROW.visible = false);
}
function route() {
  const ph = S.phase;
  if (ph === 'createP') showCreate('p');
  else if (ph === 'p' || ph === 'c') enterPlay();
  else if (ph === 'passC') showPass('c');
  else if (ph === 'createC') showCreate('c');
  else if (ph === 'passR') showPass('r');
  else if (ph === 'rv') showReveal();
  else showTitle();
}

// ---------- màn mở đầu ----------
function showTitle() {
  MODE = 'title'; hideAll(); $('scTitle').hidden = false;
  [HP, HC].forEach(h => h && (h.root.visible = false));
  const has = S.phase !== 'title' && !!S.p.name;
  $('btnResume').hidden = !has;
  $('btnStart').textContent = has ? 'Gia đình mới' : 'Bắt đầu';
  $('btnStart').className = has ? 'btn ghost lg' : 'btn primary lg';
  $('btnResume').className = 'btn primary lg';
  refreshStations();
}

// ---------- tạo nhân vật ----------
let CW = 'p';
const HAIR_N = { ngan: 'Ngắn', dai: 'Dài', bui: 'Búi', bim: 'Hai bím', mu: 'Mũ' };
const hex = n => '#' + n.toString(16).padStart(6, '0');
function rebuild(w) {
  const old = w === 'p' ? HP : HC; let pos = null, yaw = 0, vis = true;
  if (old) { pos = old.root.position.clone(); yaw = old.yaw; vis = old.root.visible; SC.remove(old.root); }
  const h = makeHuman(S[w].look, w === 'p', w === 'p' ? pTag() : cC());
  if (pos) h.root.position.copy(pos); h.yaw = h.root.rotation.y = yaw; h.root.visible = vis; h.sp = 0;
  SC.add(h.root); if (w === 'p') HP = h; else HC = h;
  if (PLAYER === old) PLAYER = h;
  return h;
}
function showCreate(w) {
  MODE = 'create'; CW = w; hideAll(); $('scCreate').hidden = false;
  const isP = w === 'p';
  $('crParent').hidden = !isP; $('crChild').hidden = isP; $('crErr').hidden = true;
  $('crEyebrow').textContent = isP ? 'Phần của bố / mẹ' : 'Phần của con';
  $('crTitle').textContent = isP ? 'Tạo nhân vật của bố mẹ' : 'Chào ' + cC() + '! Tạo nhân vật của em';
  if (isP) {
    $('fPName').value = S.p.name; $('fPhone').value = S.p.phone; $('fChild').value = S.p.child;
    document.querySelectorAll('.seg button').forEach(b => b.classList.toggle('on', b.dataset.role === S.role));
  } else { $('fCName').value = S.c.name || S.p.child; $('fCls').value = S.c.cls; S.c.name = $('fCName').value; }
  renderLook();
  [HP, HC].forEach(h => h && (h.root.visible = false));
  const h = rebuild(w); h.root.visible = true; h.root.position.set(0, 0.21, 3.2); h.yaw = h.root.rotation.y = 0; emote(h, 'wave', 1.8);
  PLAYER = h; refreshStations(); save();
}
function renderLook() {
  const L = S[CW].look;
  const mk = (id, items, key, sw) => { $(id).innerHTML = items.map((v, i) => { const val = sw ? i : v; return `<button type="button" class="${sw ? 'sw' : ''} ${L[key] === val ? 'on' : ''}" data-k="${key}" data-v="${val}" ${sw ? `style="background:${hex(v)}" aria-label="${key} ${i + 1}"` : ''}>${sw ? '' : HAIR_N[v]}</button>`; }).join(''); };
  mk('lkHair', HAIRS, 'hair'); mk('lkHairC', HAIRC, 'hairC', 1); mk('lkShirt', SHIRT, 'shirt', 1); mk('lkSkin', SKIN, 'skin', 1);
}
function submitCreate(e) {
  e.preventDefault(); const err = $('crErr');
  if (CW === 'p') {
    S.p.name = $('fPName').value.trim(); S.p.phone = $('fPhone').value.trim(); S.p.child = $('fChild').value.trim();
    if (!S.p.name) { err.textContent = 'Bạn nhập họ tên bố/mẹ nhé.'; err.hidden = false; $('fPName').focus(); return; }
    if (!S.p.child) { err.textContent = 'Bạn nhập tên con nhé, con sẽ thấy tên mình khi đến lượt.'; err.hidden = false; $('fChild').focus(); return; }
    const dg = S.p.phone.replace(/\D/g, ''); if (S.p.phone && (dg.length < 9 || dg.length > 11)) { err.textContent = 'Số điện thoại chưa đúng (9–11 chữ số).'; err.hidden = false; $('fPhone').focus(); return; }
    S.phase = 'p';
  } else {
    S.c.name = $('fCName').value.trim(); S.c.cls = $('fCls').value.trim();
    if (!S.c.name) { err.textContent = 'Em nhập họ tên của mình nhé.'; err.hidden = false; $('fCName').focus(); return; }
    S.phase = 'c';
  }
  SND.play('ok'); save(); rebuild(CW); enterPlay();
}

// ---------- vào đảo ----------
function enterPlay() {
  MODE = 'play'; hideAll(); $('hud').hidden = false; $('emotes').hidden = true;
  const w = S.phase;
  if (!HP) rebuild('p'); if (w === 'c' && !HC) rebuild('c');
  PLAYER = w === 'p' ? HP : HC;
  setNameTag(PLAYER, w === 'p' ? pTag() : cC());
  PLAYER.root.visible = true; PLAYER.root.position.set(0, 0.21, 5.8); PLAYER.yaw = PLAYER.root.rotation.y = Math.PI; PLAYER.y = 0; PLAYER.vy = 0;
  camYaw = 0;
  if (w === 'c') { HP.root.visible = true; HP.root.position.set(-3.4, 0.21, 2.6); HP.yaw = HP.root.rotation.y = 2.4; setNameTag(HP, pTag()); }
  else if (HC) HC.root.visible = false;
  $('whoDot').style.background = hex(SHIRT[S[w].look.shirt]);
  $('whoName').textContent = w === 'p' ? 'Lượt của ' + pTag() : 'Lượt của ' + cC();
  $('quest').classList.toggle('closed', innerWidth < 760);
  refreshStations(); renderQuest();
  toast(w === 'p' ? fill('Chào {P}! Ghé các trạm có dấu ♥ và ! trên đảo nhé. Bấm nút danh sách để xem nhiệm vụ.') : fill('Đến lượt {C} rồi! Đi một vòng đảo, ghé từng trạm có dấu ♥ và ! nhé.'), 4200);
  save();
}
const turn = () => (MODE === 'play' && (S.phase === 'p' || S.phase === 'c')) ? S.phase : null;
const active = (st, w) => st.who === 'both' || st.who === w;
const mine = w => STATIONS.filter(st => active(st, w));
const isDone = (w, id) => S.done[w].includes(id);
const allDone = w => mine(w).every(st => isDone(w, st.id));

function refreshStations() {
  const w = turn();
  STATIONS.forEach(st => {
    const D = ST3[st.id], on = !!w && active(st, w), done = on && isDone(w, st.id);
    D.marker.visible = on; D.ring.visible = on && !done;
    D.marker.material.map = done ? ICON.check : D.markTex; D.marker.material.needsUpdate = true;
    D.label.material.opacity = (!w || on) ? 1 : 0.4;
  });
}
function stationSub(st, w) {
  if (st.id[0] === 'q') return HQ[st.id].truth === w ? 'Trả lời thật lòng' : (w === 'p' ? 'Đoán ý ' + cC() : 'Đoán ý ' + lp());
  return ({ tc: 'Góc riêng · Tố chất Toán', kv: 'Góc riêng · Kì vọng', hoc: 'Giờ học em thích', guong: 'Ba từ tả ' + lp(), thu: w === 'p' ? 'Lời nhắn gửi con' : 'Lời nhắn gửi ' + lp() })[st.id];
}
function renderQuest() {
  const w = turn(); if (!w) return;
  const list = mine(w), n = list.filter(st => isDone(w, st.id)).length;
  $('questList').innerHTML = list.map(st => {
    const d = isDone(w, st.id), q = st.id[0] === 'q';
    const bg = d ? 'var(--mint)' : q ? 'var(--rose)' : st.col;
    return `<li class="${d ? 'done' : ''}"><span class="qi" style="background:${bg}">${d ? '✓' : q ? HQ[st.id].n : '!'}</span><span class="qn">${esc(st.name)}<small>${d ? 'Đã xong · ' : ''}${esc(stationSub(st, w))}</small></span><button data-go="${st.id}">Đi tới</button></li>`;
  }).join('');
  $('questSub').textContent = n + '/' + list.length;
  $('whoProg').textContent = n + '/' + list.length + ' trạm';
  $('whoBar').style.width = (n / list.length * 100) + '%';
  $('btnEndTurn').hidden = n < list.length;
  $('btnEndTurn').textContent = w === 'p' ? 'Xong, đưa máy cho con' : 'Xong, cùng Đổi phiếu';
}
function goTo(id) {
  const D = ST3[id], st = D.st, d = Math.hypot(D.ip.x, D.ip.z) || 1;
  const x = D.ip.x - D.ip.x / d * 0.6, z = D.ip.z - D.ip.z / d * 0.6;
  burst(PLAYER.root.position.clone().add(new V3(0, 1, 0)), 'spark', 10, 3);
  PLAYER.root.position.set(x, groundY(x, z), z);
  PLAYER.yaw = PLAYER.root.rotation.y = Math.atan2(st.x - x, st.z - z); camYaw = PLAYER.yaw + Math.PI;
  CAM.position.set(x + Math.sin(camYaw) * 9, 6, z + Math.cos(camYaw) * 9);
  burst(PLAYER.root.position.clone().add(new V3(0, 1, 0)), 'spark', 12, 3); SND.play('whoosh');
  if (innerWidth < 760) $('quest').classList.add('closed');
}

// ---------- hộp thoại trạm ----------
let typeTimer = null, DLG = null;
function type(el, txt) {
  clearInterval(typeTimer); let i = 0; el.textContent = '';
  typeTimer = setInterval(() => { i += 2; el.textContent = txt.slice(0, i); if (i >= txt.length) clearInterval(typeTimer); }, 20);
  el.onclick = () => { clearInterval(typeTimer); el.textContent = txt; };
}
function openStation(st) {
  const w = turn(); if (!w || !active(st, w)) return;
  DLG = st; $('dlg').hidden = false; $('emotes').hidden = true; $('btnAct').hidden = true;
  const npc = !!ST3[st.id].npc;
  $('dlgPor').textContent = st.emo; $('dlgPor').style.background = st.col + '33';
  $('dlgName').textContent = npc ? st.npc : st.name;
  $('dlgPlace').textContent = (npc ? st.name + ' · ' : '') + stationSub(st, w);
  PLAYER.yaw = Math.atan2(st.x - PLAYER.root.position.x, st.z - PLAYER.root.position.z);
  const body = $('dlgBody'); body.scrollTop = 0;
  (st.id[0] === 'q' ? rHeart : { tc: rTC, kv: rKV, hoc: rHoc, guong: rGuong, thu: rThu }[st.id])(body, st, w);
  SND.play('open');
}
function closeDlg() {
  clearInterval(typeTimer); $('dlg').hidden = true; const st = DLG; DLG = null;
  const w = turn();
  if (w && allDone(w) && !S.te[w]) { S.te[w] = true; save(); setTimeout(showTurnEnd, 350); }
}
function complete(st, w, line) {
  if (!isDone(w, st.id)) S.done[w].push(st.id);
  save(); refreshStations(); renderQuest();
  $('dlgBody').innerHTML = `<div class="done-v"><div class="big-heart">${HEART}</div><p>${esc(line)}</p><button class="btn primary lg" id="dvGo">Đi tiếp</button></div>`;
  $('dvGo').onclick = () => { SND.play('tap'); closeDlg(); };
  SND.play('ok'); emote(PLAYER, 'cheer', 1); PLAYER.vy = 6;
  burst(PLAYER.root.position.clone().add(new V3(0, PLAYER.h + 0.3, 0)), 'heart', 12, 4);
}
const okBtn = (txt, dis) => `<button class="btn primary lg wide" id="okBtn" ${dis ? 'disabled' : ''}>${txt}</button>`;

function rHeart(body, st, w) {
  const q = HQ[st.id], truth = q.truth === w; let sel = S.ans[w][st.id];
  body.innerHTML = `<p class="say" id="say"></p>
  <div class="qcard"><div class="qtop"><span class="qtag">♥ ${q.n}</span><span class="qmode">${truth ? 'Trả lời thật lòng' : 'Đoán ý ' + esc(w === 'p' ? cC() : lp())}</span></div>
  <h3>${F(w === 'p' ? q.pq : q.cq)}</h3><p class="qh">${F(w === 'p' ? q.ph : q.ch)}</p>
  <div class="opts">${q.opts.map((o, i) => `<button class="opt ${sel === i ? 'on' : ''}" data-i="${i}"><span class="L">${'ABCD'[i]}</span><span>${esc(o)}</span></button>`).join('')}</div></div>
  ${okBtn('Chốt đáp án', sel == null)}`;
  type($('say'), fill(w === 'p' ? q.pSay : q.cSay));
  body.querySelectorAll('.opt').forEach(b => b.onclick = () => { sel = +b.dataset.i; body.querySelectorAll('.opt').forEach(x => x.classList.toggle('on', x === b)); $('okBtn').disabled = false; SND.play('tap'); });
  $('okBtn').onclick = () => { S.ans[w][st.id] = sel; complete(st, w, fill(q.done)); };
}
function rTC(body, st, w) {
  const tr = (S.ans.p.traits || [0, 0, 0, 0, 0, 0]).slice();
  body.innerHTML = `<span class="private">Góc riêng của bố mẹ · con không xem phần này</span>
  <p class="say" id="say"></p>
  <div class="qcard"><h3>Con có tố chất Toán không?</h3><p class="qh">${F('Nhớ lại những lần {C} học ở nhà, {p} đã từng thấy con... Tích những điều đúng với con.')}</p>
  <div class="checks">${TRAITS.map((t, i) => `<button class="ck ${tr[i] ? 'on' : ''}" data-i="${i}"><i></i><span>${esc(t)}</span></button>`).join('')}</div>
  <div class="tally">Con có <b id="tcN">0</b> dấu ✓ / 6</div>
  <div class="tiers">${TRAIT_TIERS.map((x, i) => `<div class="tier" data-i="${i}"><b>${x.k}</b><span>${esc(x.t)}</span></div>`).join('')}</div>
  <p class="quote">Tố chất cần rèn luyện mới thành năng lực. Rèn luyện mà thiếu tố chất sẽ sớm chạm trần.</p>
  <p class="small">${F('Bài test hôm nay giúp KioMath và {p} nhìn rõ hơn những dấu ✓ này.')}</p></div>
  ${okBtn('Lưu vào góc riêng')}`;
  type($('say'), fill('Từ Đài Quan Sát nhìn được rất xa. {P} thử nhớ lại xem {C} có những dấu hiệu nào dưới đây nhé.'));
  const upd = () => { const n = tr.filter(Boolean).length; $('tcN').textContent = n; body.querySelectorAll('.tier').forEach((el, i) => el.classList.toggle('on', n >= TRAIT_TIERS[i].min && n <= TRAIT_TIERS[i].max)); };
  body.querySelectorAll('.ck').forEach(b => b.onclick = () => { const i = +b.dataset.i; tr[i] = tr[i] ? 0 : 1; b.classList.toggle('on', !!tr[i]); upd(); SND.play('tap'); });
  upd();
  $('okBtn').onclick = () => { S.ans.p.traits = tr; const n = tr.filter(Boolean).length; complete(st, w, `Con có ${n}/6 dấu ✓. ` + TRAIT_TIERS.find(x => n >= x.min && n <= x.max).t + '.'); };
}
function gapSVG(now, want) {
  const B = 140, u = 11.5, hw = want * u, hn = now * u, he = u;
  const arrow = want > now + 1 ? `<line x1="76" y1="${B - hw + 4}" x2="76" y2="${B - hn - he - 4}" stroke="#e0663c" stroke-width="2.5" stroke-dasharray="4 4"/><path d="M70 ${B - hw + 10} L76 ${B - hw + 2} L82 ${B - hw + 10}" fill="#e0663c"/><path d="M70 ${B - hn - he - 10} L76 ${B - hn - he - 2} L82 ${B - hn - he - 10}" fill="#e0663c"/>` : '';
  return `<svg viewBox="0 0 150 150" role="img" aria-label="Kì vọng ${want} điểm, con đang ${now} điểm">
   <line x1="4" y1="${B}" x2="146" y2="${B}" stroke="#c9bde3" stroke-width="2"/>
   <rect x="8" y="${B - hw}" width="52" height="${hw}" rx="6" fill="#e0663c"/>
   <text x="34" y="${B - hw + 18}" text-anchor="middle" font-family="Baloo 2, sans-serif" font-weight="800" font-size="15" fill="#fff">${want}</text>
   <text x="34" y="${B - 6}" text-anchor="middle" font-family="Nunito, sans-serif" font-weight="800" font-size="9" fill="#fff">Mong</text>
   <rect x="92" y="${B - hn}" width="52" height="${hn}" rx="6" fill="#5b2e86"/>
   <rect x="92" y="${B - hn - he - 2}" width="52" height="${he}" rx="5" fill="#a98ad6"/>
   <text x="118" y="${B - hn + 18}" text-anchor="middle" font-family="Baloo 2, sans-serif" font-weight="800" font-size="15" fill="#fff">${now}</text>
   <text x="118" y="${B - 6}" text-anchor="middle" font-family="Nunito, sans-serif" font-weight="800" font-size="9" fill="#fff">Khả năng</text>
   <text x="118" y="${B - hn - 4}" text-anchor="middle" font-family="Nunito, sans-serif" font-weight="800" font-size="8" fill="#fff">+ nỗ lực</text>
   ${arrow}</svg>`;
}
function gapMsg(now, want) {
  const g = want - now;
  if (g <= 0) return ['Trong tầm tay', 'Kì vọng nằm trong sức con. Có thể thử thách con thêm một chút để con lớn lên.'];
  if (g === 1) return ['Kì vọng vừa tầm', 'Vừa sức con, cộng thêm một chút cố gắng. Rất lí tưởng!'];
  if (g === 2) return ['Khoảng cách hơi xa', 'Khoảng cách = áp lực. Nên chia nhỏ thành mục tiêu từng tháng để con với tới được.'];
  return ['Khoảng cách quá lớn', 'Khoảng cách quá lớn: con sợ Toán, mất tự tin, học đối phó.'];
}
function rKV(body, st, w) {
  let now = S.ans.p.now || 0, want = S.ans.p.want || 0;
  const sc = (k, v) => [5, 6, 7, 8, 9, 10].map(n => `<button data-k="${k}" data-n="${n}" class="${v === n ? 'on' : ''}">${n}</button>`).join('');
  body.innerHTML = `<span class="private">Góc riêng của bố mẹ · con không xem phần này</span>
  <p class="say" id="say"></p>
  <div class="qcard"><h3>Kì vọng và sức của con</h3><p class="qh">${F('Điểm Toán của {C}, theo {p}:')}</p>
  <div class="scale"><span>Hiện con thường được</span><div class="sc">${sc('now', now)}</div></div>
  <div class="scale want"><span>${F('{P} mong kì này đạt')}</span><div class="sc">${sc('want', want)}</div></div>
  <div class="gap" id="gapBox"></div>
  <h3 style="font-size:17px;margin:4px 0 8px">Cần gì đầu tiên?</h3>
  <div class="needs">${NEEDS.map((n, i) => `<div><i>${i + 1}</i><span><b>${esc(n[0])}</b>${esc(n[1])}</span></div>`).join('')}</div></div>
  ${okBtn('Lưu vào góc riêng', !(now && want))}`;
  type($('say'), fill('Mỗi bậc thang là một mức điểm. {P} chọn mức con đang đứng và mức {p} mong con leo tới nhé.'));
  const upd = () => {
    const g = $('gapBox');
    if (now && want) { const m = gapMsg(now, want); g.innerHTML = gapSVG(now, want) + `<p><b style="color:${want - now >= 3 ? 'var(--ember-2)' : 'var(--plum)'}">${m[0]}</b>${esc(m[1])}</p>`; g.hidden = false; }
    else g.hidden = true;
    $('okBtn').disabled = !(now && want);
  };
  body.querySelectorAll('.sc button').forEach(b => b.onclick = () => { const n = +b.dataset.n; if (b.dataset.k === 'now') now = n; else want = n; b.parentNode.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); upd(); SND.play('tap'); });
  upd();
  $('okBtn').onclick = () => { S.ans.p.now = now; S.ans.p.want = want; complete(st, w, 'Đã ghi lại: con đang ' + now + ', ' + lp() + ' mong ' + want + '. ' + gapMsg(now, want)[0] + '.'); };
}
function rHoc(body, st, w) {
  let sel = (S.ans.c.likes || []).slice();
  body.innerHTML = `<p class="say" id="say"></p>
  <div class="qcard"><div class="qtop"><span class="qmode">Chọn tối đa 2</span></div><h3>Giờ học Toán em thích nhất là có...</h3><p class="qh">Không có đúng sai, em thích gì chọn nấy nhé!</p>
  <div class="checks">${LIKES.map((t, i) => `<button class="ck ${sel.includes(i) ? 'on' : ''}" data-i="${i}"><i></i><span>${esc(t)}</span></button>`).join('')}</div></div>
  ${okBtn('Xong rồi', !sel.length)}`;
  type($('say'), fill('Chít chít! Ở sân chơi này ai cũng có giờ học yêu thích. Còn {C} thì sao?'));
  const paint = () => body.querySelectorAll('.ck').forEach(b => b.classList.toggle('on', sel.includes(+b.dataset.i)));
  body.querySelectorAll('.ck').forEach(b => b.onclick = () => { const i = +b.dataset.i; if (sel.includes(i)) sel = sel.filter(x => x !== i); else { sel.push(i); if (sel.length > 2) sel.shift(); } paint(); $('okBtn').disabled = !sel.length; SND.play('tap'); });
  $('okBtn').onclick = () => { S.ans.c.likes = sel; complete(st, w, 'Sóc Nâu nhớ rồi! Thầy cô KioMath sẽ biết em thích học thế nào.'); };
}
function rGuong(body, st, w) {
  const wd = (S.ans.c.words || ['', '', '']).slice();
  body.innerHTML = `<p class="say" id="say"></p>
  <div class="qcard"><h3>${F('Ba từ em dùng để tả {p} là:')}</h3><p class="qh">Gõ vào ô, hoặc chạm vào gợi ý bên dưới.</p>
  <div class="words">${[0, 1, 2].map(i => `<input id="wd${i}" maxlength="24" placeholder="${i + 1}." value="${esc(wd[i])}">`).join('')}</div>
  <div class="chips">${WORD_IDEAS.map(x => `<button data-w="${esc(x)}">${esc(x)}</button>`).join('')}</div></div>
  ${okBtn('Soi xong rồi')}`;
  type($('say'), fill('Gương ơi gương... Gương thần hiện ra người {C} thương nhất. Em thấy {p} là người thế nào?'));
  const upd = () => { $('okBtn').disabled = ![0, 1, 2].some(i => $('wd' + i).value.trim()); };
  [0, 1, 2].forEach(i => $('wd' + i).oninput = upd);
  body.querySelectorAll('.chips button').forEach(b => b.onclick = () => { const e = [0, 1, 2].map(i => $('wd' + i)).find(x => !x.value.trim()); if (e) { e.value = b.dataset.w; upd(); SND.play('tap'); } else toast('Đủ 3 từ rồi! Xóa một ô để đổi nhé.'); });
  upd();
  $('okBtn').onclick = () => { S.ans.c.words = [0, 1, 2].map(i => $('wd' + i).value.trim()); complete(st, w, fill('Gương thần đã ghi lại. {P} sẽ được đọc khi Đổi phiếu!')); };
}
function rThu(body, st, w) {
  const ideas = (w === 'p' ? MSG_P : MSG_C).map(fill);
  body.innerHTML = `<p class="say" id="say"></p>
  <div class="qcard"><h3>${w === 'p' ? F('Lời nhắn {p} gửi {C}') : F('Lời nhắn em gửi {p}')}</h3><p class="qh">${w === 'p' ? 'Con sẽ đọc khi đổi phiếu' : F('{P} sẽ đọc khi đổi phiếu')}</p>
  <textarea id="msg" maxlength="300" placeholder="Viết vài dòng thật lòng...">${esc(S.ans[w].msg || '')}</textarea>
  <div class="chips">${ideas.map(x => `<button data-m="${esc(x)}">${esc(x)}</button>`).join('')}</div></div>
  <div class="row"><button class="btn primary lg" id="okBtn" style="flex:1">Bỏ vào hòm thư</button><button class="btn ghost" id="laterBtn">Viết sau</button></div>`;
  type($('say'), w === 'p' ? fill('Hòm thư nhỏ chuyển những lời khó nói thành lời dễ nghe. {P} muốn nhắn gì cho {C}?') : fill('Có điều gì em muốn nói với {p} không? Hòm thư sẽ giữ kín đến giờ Đổi phiếu.'));
  const ta = $('msg'), upd = () => { $('okBtn').disabled = !ta.value.trim(); };
  ta.oninput = upd;
  body.querySelectorAll('.chips button').forEach(b => b.onclick = () => { ta.value = (ta.value.trim() ? ta.value.trim() + ' ' : '') + b.dataset.m; upd(); SND.play('tap'); });
  upd();
  $('laterBtn').onclick = closeDlg;
  $('okBtn').onclick = () => { S.ans[w].msg = ta.value.trim(); complete(st, w, 'Lá thư đã nằm gọn trong hòm. Đến giờ Đổi phiếu mới mở!'); };
}

// ---------- hết lượt & chuyển máy ----------
function showTurnEnd() {
  const w = S.phase; if (!(w === 'p' || w === 'c')) return;
  $('turnEnd').hidden = false; SND.play('win');
  if (w === 'p') { $('teTitle').textContent = 'Xong phần của ' + cP() + '!'; $('teText').textContent = fill('Cảm ơn {P}! Câu trả lời của {p} đã được cất kín. Giờ đến lượt {C}.'); $('teGo').textContent = 'Đưa máy cho ' + cC(); }
  else { $('teTitle').textContent = 'Xong phần của ' + cC() + '!'; $('teText').textContent = fill('Giỏi quá! Giờ gọi {p} lại đây để cùng Đổi phiếu nhé.'); $('teGo').textContent = 'Cùng Đổi phiếu'; }
}
function endTurn() {
  $('turnEnd').hidden = true;
  if (S.phase === 'p') { S.phase = 'passC'; save(); showPass('c'); }
  else if (S.phase === 'c') { S.phase = 'passR'; save(); showPass('r'); }
}
let holdT = null, holdK = 0;
function showPass(kind) {
  MODE = 'pass'; hideAll(); $('scPass').hidden = false; $('scPass').dataset.k = kind;
  if (kind === 'c') { $('passEyebrow').textContent = 'Đổi người chơi'; $('passTitle').textContent = 'Đưa máy cho ' + cC() + ' nhé!'; $('passText').textContent = fill('{P} đừng nhìn trộm nha. {C} giữ nút bên dưới để bắt đầu phần của mình.'); $('passBtnTxt').textContent = 'Giữ để bắt đầu'; }
  else { $('passEyebrow').textContent = 'Cả hai đã xong'; $('passTitle').textContent = 'Đổi phiếu nào!'; $('passText').textContent = fill('{P} và {C} ngồi cạnh nhau, cùng nhìn màn hình. Giữ nút để mở 4 thẻ ♥.'); $('passBtnTxt').textContent = 'Giữ để mở thẻ'; }
  setRing(0);
}
function setRing(k) { $('passRing').style.strokeDashoffset = 276.5 * (1 - k); }
function holdStart(e) {
  e.preventDefault(); clearInterval(holdT); holdK = 0; SND.init();
  holdT = setInterval(() => { holdK += 0.05; setRing(holdK); if (holdK >= 1) { clearInterval(holdT); SND.play('ok'); passDone(); } }, 40);
}
function holdEnd() { if (holdK < 1) { clearInterval(holdT); holdK = 0; setRing(0); } }
function passDone() {
  if ($('scPass').dataset.k === 'c') { S.phase = 'createC'; if (!S.c.name) S.c.name = S.p.child; save(); showCreate('c'); }
  else { S.phase = 'rv'; S.rv = { step: 0, flipped: [] }; save(); showReveal(); }
}

// ---------- Đổi phiếu ----------
const STAGE_Z = 4.2, PX = -1.25, CX = 1.25;
const hits = () => ['q1', 'q2', 'q3', 'q4'].filter(k => S.ans.p[k] != null && S.ans.p[k] === S.ans.c[k]).length;
function showReveal() {
  MODE = 'reveal'; hideAll(); $('scReveal').hidden = false;
  if (!HP) rebuild('p'); if (!HC) rebuild('c');
  setNameTag(HP, pTag()); setNameTag(HC, cC());
  [[HP, PX], [HC, CX]].forEach(([h, x]) => { h.root.visible = true; h.root.position.set(x, 0.21, STAGE_Z); h.yaw = h.root.rotation.y = 0; h.y = 0; h.vy = 0; });
  PLAYER = HC; refreshStations(); renderRv();
}
function both(fn) { [HP, HC].forEach(fn); }
function pips(cur) { return `<div class="pips">${[0, 1, 2, 3].map(i => { const k = 'q' + (i + 1), f = S.rv.flipped[i]; return `<i class="${f ? (S.ans.p[k] != null && S.ans.p[k] === S.ans.c[k] ? 'hit' : 'miss') : i === cur ? 'cur' : ''}"></i>`; }).join('')}</div>`; }
function renderRv() {
  const b = $('rvBody'), s = S.rv.step; save(); $('scReveal').scrollTop = 0;
  if (s === 0) {
    b.innerHTML = `<div class="rv-step"><p class="eyebrow">Quảng trường Đổi phiếu</p><h2 class="h2">Đổi phiếu nào!</h2>
    <p class="lead">${F('{P} và {C} cùng lật 4 thẻ ♥. Mỗi thẻ trùng nhau là một trái tim cho cả nhà.')}</p>${pips(0)}
    <button class="btn primary lg wide" id="rvGo">Lật thẻ ♥ 1</button></div>`;
    both(h => emote(h, 'wave', 2));
    $('rvGo').onclick = () => { S.rv.step = 1; SND.play('tap'); renderRv(); };
  } else if (s >= 1 && s <= 4) {
    const i = s - 1, id = 'q' + s, q = HQ[id], a = S.ans.p[id], c = S.ans.c[id], f = !!S.rv.flipped[i];
    const lp1 = q.truth === 'c' ? F('{P} đoán') : F('{P} trả lời'), lc1 = q.truth === 'c' ? F('{C} chọn') : F('{C} đoán');
    const face = (lab, v, col) => `<div class="back"><b>♥</b><span>${lab}</span></div><div class="front"><span class="who-l" style="color:${col}">${lab}</span><span class="ans-L" style="background:${col}">${v == null ? '–' : 'ABCD'[v]}</span><span class="ans-t">${v == null ? 'Chưa trả lời' : esc(q.opts[v])}</span></div>`;
    b.innerHTML = `<div class="rv-step">${pips(i)}<p class="eyebrow">Thẻ ♥ ${s}/4</p><h2 class="h2">${F(q.rq)}</h2>
    <div class="flip-row"><div class="fcard ${f ? 'open' : ''}" id="fc1">${face(lp1, a, '#e0663c')}</div><div class="fcard ${f ? 'open' : ''}" id="fc2">${face(lc1, c, '#8a6bd1')}</div></div>
    <div id="vd">${f ? verdict(q, a, c) : ''}</div>
    <button class="btn ${f ? 'plum' : 'primary'} lg wide" id="rvGo">${f ? (s < 4 ? 'Thẻ tiếp theo' : 'Xem kết quả') : 'Lật thẻ'}</button></div>`;
    $('rvGo').onclick = () => {
      if (!S.rv.flipped[i]) {
        S.rv.flipped[i] = true; save(); SND.play('flip');
        $('fc1').classList.add('open'); setTimeout(() => $('fc2').classList.add('open'), 160);
        $('rvGo').disabled = true;
        setTimeout(() => {
          $('vd').innerHTML = verdict(q, a, c); $('rvGo').disabled = false; $('rvGo').textContent = s < 4 ? 'Thẻ tiếp theo' : 'Xem kết quả'; $('rvGo').className = 'btn plum lg wide';
          b.querySelector('.pips').outerHTML = pips(i);
          if (a != null && a === c) { SND.play('match'); both(h => { emote(h, 'cheer', 1.4); h.vy = 7; }); burst(new V3(0, 2.6, STAGE_Z), 'heart', 22, 5); }
          else { SND.play('miss'); both(h => { emote(h, 'think', 1.8); bubble(h, 'q', 1.8); }); }
        }, 750);
      } else { S.rv.step++; SND.play('tap'); renderRv(); }
    };
  } else if (s === 5) {
    const n = hits(), tier = TIERS.find(x => n >= x.min);
    b.innerHTML = `<div class="rv-step score"><p class="eyebrow">Số câu ♥ hai phiếu trùng nhau</p>
    <div class="num">${n}<small>/4</small></div><div class="hearts">${[0, 1, 2, 3].map(i => `<span style="color:${i < n ? 'var(--rose)' : 'var(--line)'}">${HEART}</span>`).join('')}</div>
    <h3>${tier.t}</h3><p class="lead" style="margin:0 auto 6px">${esc(tier.d)}</p>
    <button class="btn primary lg wide" id="rvGo">Đọc thư của nhau</button></div>`;
    SND.play('win'); both(h => { emote(h, n >= 4 ? 'dance' : n >= 2 ? 'cheer' : 'wave', 2.4); h.vy = 6; });
    for (let k = 0; k < Math.max(1, n); k++) setTimeout(() => burst(new V3((Math.random() - 0.5) * 3, 3, STAGE_Z - 1), n ? 'heart' : 'star', 14, 5), k * 350);
    $('rvGo').onclick = () => { S.rv.step = 6; SND.play('tap'); renderRv(); };
  } else if (s === 6) {
    const mp = S.ans.p.msg, mc = S.ans.c.msg, wd = (S.ans.c.words || []).filter(Boolean), lk = (S.ans.c.likes || []).map(i => LIKES[i]);
    b.innerHTML = `<div class="rv-step"><p class="eyebrow">Hòm thư</p><h2 class="h2">Thư của nhau</h2>
    <div class="letter ${mp ? '' : 'empty'}"><div class="to">${F('{P} gửi {C}')}</div><p>${mp ? esc(mp) : 'Hòm thư trống. ' + F('{P} nói trực tiếp với con một câu nhé!')}</p></div>
    <div class="letter ${mc ? '' : 'empty'}"><div class="to">${F('{C} gửi {P}')}</div><p>${mc ? esc(mc) : 'Hòm thư trống. ' + F('{C} nói trực tiếp với {p} một câu nhé!')}</p>
    ${wd.length ? `<div class="to" style="margin-top:10px">${F('Ba từ {C} tả {p}')}</div><div class="wordrow">${wd.map(x => `<span>${esc(x)}</span>`).join('')}</div>` : ''}</div>
    ${lk.length ? `<p class="small">${F('Giờ học Toán {C} thích nhất có:')} <b>${lk.map(esc).join(' · ')}</b></p>` : ''}
    <button class="btn primary lg wide" id="rvGo">Cả nhà cùng làm</button></div>`;
    both(h => bubble(h, 'love', 2.4)); SND.play('open');
    $('rvGo').onclick = () => { S.rv.step = 7; SND.play('tap'); renderRv(); };
  } else if (s === 7) {
    const A = S.acts, ic = {
      tay: '<svg viewBox="0 0 24 24"><path d="M7 11V5.5a1.5 1.5 0 013 0V10m0-1V4a1.5 1.5 0 013 0v6m0-4.5a1.5 1.5 0 013 0V11m0-2a1.5 1.5 0 013 0v5c0 4-3 7-7 7-3 0-4.5-1.5-6-4l-2.6-4.3a1.5 1.5 0 012.5-1.7L7 13" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      om: HEART,
      anh: '<svg viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z" stroke="currentColor" stroke-width="2" fill="none" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.6" stroke="currentColor" stroke-width="2" fill="none"/></svg>'
    };
    const btn = (k, t) => `<button data-a="${k}" class="${A[k] ? 'on' : ''}">${ic[k]}<span>${t}</span><span class="st">${A[k] ? 'Đã làm ✓' : 'Bấm để làm'}</span></button>`;
    b.innerHTML = `<div class="rv-step"><p class="eyebrow">Cả nhà cùng làm</p><h2 class="h2">Đập tay, ôm nhau, chụp ảnh!</h2>
    <p class="lead" style="margin:0">Bấm từng nút để hai nhân vật làm trước, rồi cả nhà làm thật nhé.</p>
    <div class="acts">${btn('tay', 'Đập tay')}${btn('om', 'Ôm nhau')}${btn('anh', 'Chụp ảnh check-in')}</div>
    ${S.photo ? `<img class="thumb" id="thumb" src="${S.photo}" alt="Ảnh check-in">` : ''}
    <label class="fld"><span>Mục tiêu tháng đầu ở KioMath (cả nhà cùng đặt)</span><textarea id="goal" maxlength="200" placeholder="VD: Làm đủ bài tập về nhà mỗi buổi">${esc(S.goal)}</textarea></label>
    <div class="chips" id="goalIdeas">${['Làm đủ bài tập về nhà mỗi buổi', 'Mỗi buổi hỏi thầy cô ít nhất 1 câu', 'Tự tin giơ tay chữa bài', 'Bài kiểm tra tháng tăng thêm 1 điểm'].map(x => `<button data-g="${x}">${x}</button>`).join('')}</div>
    <button class="btn primary lg wide" id="rvGo">Hoàn thành</button></div>`;
    b.querySelectorAll('.acts button').forEach(x => x.onclick = () => doAct(x.dataset.a));
    $('goal').oninput = e => { S.goal = e.target.value; save(); };
    b.querySelectorAll('#goalIdeas button').forEach(x => x.onclick = () => { $('goal').value = x.dataset.g; S.goal = x.dataset.g; save(); SND.play('tap'); });
    if ($('thumb')) $('thumb').onclick = () => openPhoto();
    $('rvGo').onclick = () => { S.goal = $('goal').value.trim(); S.rv.step = 8; SND.play('win'); renderRv(); };
  } else {
    const n = hits(); saveRecord();
    b.innerHTML = `<div class="rv-step"><p class="eyebrow">Hoàn thành · Hiểu nhau ${n}/4</p><h2 class="h2">Cảm ơn cả nhà!</h2>
    <p class="lead">${F('Chúc {C} làm bài test thật tốt. Thầy cô KioMath sẽ trao đổi kết quả với {p} sau buổi test nhé.')}</p>
    ${S.goal ? `<div class="letter"><div class="to">Mục tiêu tháng đầu</div><p>${esc(S.goal)}</p></div>` : ''}
    ${S.photo ? `<img class="thumb" id="thumb" src="${S.photo}" alt="Ảnh check-in">` : ''}
    <button class="btn primary lg wide" id="rvNew">Gia đình tiếp theo</button>
    <button class="btn ghost wide" id="rvBack">Quay lại bước trước</button>
    <button class="link" id="btnStaff2">Dành cho KioMath</button></div>`;
    both(h => emote(h, 'bow', 1.6));
    let armed = false;
    $('rvNew').onclick = () => { if (!armed) { armed = true; $('rvNew').textContent = 'Bấm lần nữa để bắt đầu gia đình mới'; return; } newFamily(); };
    $('rvBack').onclick = () => { S.rv.step = 7; renderRv(); };
    $('btnStaff2').onclick = openStaff;
    if ($('thumb')) $('thumb').onclick = () => openPhoto();
    for (let k = 0; k < 4; k++) setTimeout(() => burst(new V3((Math.random() - 0.5) * 6, 4 + Math.random() * 2, STAGE_Z - 2), 'star', 16, 6), k * 400);
  }
}
function verdict(q, a, c) {
  const hit = a != null && a === c;
  return `<div class="verdict ${hit ? 'hit' : 'miss'}"><b>${hit ? 'Trùng khớp! +1 ♥' : 'Bất ngờ chưa!'}</b><p>${hit ? F(q.hit) : 'Gợi ý trò chuyện: ' + F(q.miss)}</p></div>`;
}
function newFamily() {
  S = fresh(); save(); [HP, HC].forEach(h => h && SC.remove(h.root)); HP = HC = null; PLAYER = null; showTitle();
}

// ---------- đập tay / ôm / ảnh ----------
const TW = [];
function tween(d, f, done) { TW.push({ d, t: 0, f, done }); }
function tickTw(dt) { for (let i = TW.length - 1; i >= 0; i--) { const w = TW[i]; w.t += dt; const k = Math.min(1, w.t / w.d); w.f(k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2); if (k >= 1) { TW.splice(i, 1); w.done && w.done(); } } }
function moveX(h, x, d, cb) { const x0 = h.root.position.x; h.moving = true; tween(d, k => { h.root.position.x = x0 + (x - x0) * k; }, () => { h.moving = false; cb && cb(); }); }
function backToStage(cb) {
  HP.yaw = HC.yaw = 0;
  moveX(HP, PX, 0.45); moveX(HC, CX, 0.45, () => { HP.yaw = HC.yaw = 0; BUSY = false; cb && cb(); });
}
function doAct(k) {
  if (BUSY) return; BUSY = true; SND.init();
  const mark = () => { S.acts[k] = true; save(); if (S.rv.step === 7) { const el = document.querySelector(`.acts button[data-a="${k}"]`); if (el) { el.classList.add('on'); el.querySelector('.st').textContent = 'Đã làm ✓'; } } };
  if (k === 'tay') {
    HP.yaw = Math.PI / 2; HC.yaw = -Math.PI / 2;
    moveX(HP, -0.52, 0.5); moveX(HC, 0.52, 0.5, () => {
      emote(HP, 'five2', 0.9); emote(HC, 'five', 0.9);
      setTimeout(() => { SND.play('clap'); burst(new V3(0, 2.2, STAGE_Z + 0.3), 'star', 18, 4); }, 260);
      setTimeout(() => backToStage(() => { both(h => { emote(h, 'cheer', 0.9); h.vy = 6; }); mark(); }), 1000);
    });
  } else if (k === 'om') {
    HP.yaw = Math.PI / 2; HC.yaw = -Math.PI / 2;
    moveX(HP, -0.4, 0.5); moveX(HC, 0.4, 0.5, () => {
      emote(HP, 'hug', 1.9); emote(HC, 'hug', 1.9); SND.play('hug');
      [0, 500, 1000].forEach(t => setTimeout(() => burst(new V3(0, 2.4, STAGE_Z), 'heart', 8, 3), t));
      setTimeout(() => backToStage(mark), 2000);
    });
  } else if (k === 'anh') {
    both(h => { h.yaw = 0; emote(h, 'peace', 2.2); });
    setTimeout(() => { takePhoto(); mark(); BUSY = false; }, 700);
  }
}
function flash() { const f = $('flash'); f.style.transition = 'none'; f.style.opacity = '1'; void f.offsetWidth; f.style.transition = 'opacity .7s'; f.style.opacity = '0'; }
const logoImg = new Image(); logoImg.src = LOGO_SRC;
function takePhoto() {
  SND.play('shutter');
  const W = 1080, H = 1350, sz = R.getSize(new THREE.Vector2()), pr = R.getPixelRatio();
  const fov = CAM.fov, pos = CAM.position.clone(), q = CAM.quaternion.clone();
  [HP, HC].forEach(h => h.tag.visible = false);
  R.setPixelRatio(1); R.setSize(W, H, false);
  CAM.clearViewOffset(); CAM.aspect = W / H; CAM.fov = 34; CAM.position.set(0, 2.35, STAGE_Z + 8.6); CAM.lookAt(0, 1.25, STAGE_Z); CAM.updateProjectionMatrix();
  R.render(SC, CAM);
  const shot = R.domElement.toDataURL('image/jpeg', 0.92);
  [HP, HC].forEach(h => h.tag.visible = true);
  R.setPixelRatio(pr); R.setSize(sz.x, sz.y, false); CAM.fov = fov; CAM.position.copy(pos); CAM.quaternion.copy(q); VS = ''; resize();
  flash();
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    g.drawImage(img, 0, 0, W, H);
    g.fillStyle = 'rgba(91,46,134,.92)'; rr(g, 40, 40, 560, 84, 42); g.fill();
    g.fillStyle = '#fff'; g.font = `800 40px ${FONT}`; g.textBaseline = 'middle'; g.fillText('HIỂU CON – HIỂU BỐ MẸ', 72, 84);
    g.fillStyle = 'rgba(58,35,80,.25)'; rr(g, 40, 1118, 1000, 196, 40); g.fill();
    g.fillStyle = '#fff'; rr(g, 40, 1108, 1000, 196, 40); g.fill();
    const lh = 64, lw = logoImg.width ? logoImg.width * lh / logoImg.height : 0; if (lw) g.drawImage(logoImg, 80, 1140, lw, lh);
    g.fillStyle = '#5b2e86'; g.font = `800 50px ${FONT}`; g.textBaseline = 'alphabetic';
    g.fillText(('Nhà ' + cC() + ' · Hiểu nhau ' + hits() + '/4'), 80, 1262);
    g.fillStyle = '#6a5a80'; g.font = `700 32px ${FONT}`; g.textAlign = 'right';
    g.fillText(new Date().toLocaleDateString('vi-VN'), 1000, 1182);
    g.fillStyle = '#ff5c8a'; heartPath(g, 960, 1250, 30); g.fill();
    S.photo = c.toDataURL('image/jpeg', 0.88); save();
    openPhoto();
    if (S.rv.step === 7) renderRv();
  };
  img.src = shot;
}
function openPhoto() { if (!S.photo) return; $('photoImg').src = S.photo; $('photoDl').href = S.photo; $('photoDl').download = 'KioMath-' + (cC() || 'nha-minh') + '.jpg'; let emb = true; try { emb = window.self !== window.top; } catch (e) {} $('photoDl').hidden = emb; $('photo').hidden = false; }

// ---------- lưu kết quả ----------
function buildRecord() {
  const a = S.ans, tr = a.p.traits || [];
  return {
    id: S.id, time: new Date().toLocaleString('vi-VN'), role: S.role, pname: S.p.name, phone: S.p.phone,
    child: S.c.name || S.p.child, cls: S.c.cls, hieu: hits(), tocchat: tr.filter(Boolean).length,
    traits: TRAITS.filter((_, i) => tr[i]).join('; '), now: a.p.now || '', want: a.p.want || '',
    likes: (a.c.likes || []).map(i => LIKES[i]).join('; '), words: (a.c.words || []).filter(Boolean).join(', '),
    goal: S.goal || '', msgP: a.p.msg || '', msgC: a.c.msg || '',
    ansP: ['q1', 'q2', 'q3', 'q4'].map(k => a.p[k] == null ? '-' : 'ABCD'[a.p[k]]).join(''),
    ansC: ['q1', 'q2', 'q3', 'q4'].map(k => a.c[k] == null ? '-' : 'ABCD'[a.c[k]]).join(''),
    acts: ['tay', 'om', 'anh'].filter(k => S.acts[k]).map(k => ({ tay: 'đập tay', om: 'ôm', anh: 'ảnh' })[k]).join(', ')
  };
}
function saveRecord() {
  const rec = buildRecord(), h = store.get('history', []).filter(x => x.id !== rec.id);
  h.unshift(rec); store.set('history', h.slice(0, 500));
  if (!S.saved || S.savedGoal !== S.goal) {
    S.saved = true; S.savedGoal = S.goal; save();
    if (SHEET_API) fetch(SHEET_API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(rec) }).catch(() => {});
  }
}

// ---------- Dành cho KioMath ----------
async function sha(s) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
function openStaff() { $('staff').hidden = false; STAFF_OK ? renderStaff() : renderPin(); }
function renderPin() {
  $('staffBody').innerHTML = `<p class="eyebrow">Dành cho KioMath</p><h2 class="h2">Nhập mật khẩu giáo viên</h2>
  <p class="small">Phần này có thông tin góc riêng của bố mẹ, chỉ thầy cô KioMath xem.</p>
  <form class="pin" id="pinForm"><input id="pinIn" type="password" autocomplete="off" placeholder="Mật khẩu"><button class="btn primary" type="submit">Mở</button></form><p class="err" id="pinErr" hidden></p>`;
  setTimeout(() => $('pinIn').focus(), 50);
  $('pinForm').onsubmit = async e => {
    e.preventDefault();
    try { if (await sha('hieunhau:' + $('pinIn').value) === STAFF_HASH) { STAFF_OK = true; renderStaff(); } else { $('pinErr').textContent = 'Mật khẩu chưa đúng.'; $('pinErr').hidden = false; } }
    catch (er) { $('pinErr').textContent = 'Trình duyệt chưa hỗ trợ kiểm tra mật khẩu (cần mở trang bằng https).'; $('pinErr').hidden = false; }
  };
}
const COLS = [['time', 'Thời gian'], ['role', 'Bố/Mẹ'], ['pname', 'Họ tên PH'], ['phone', 'SĐT'], ['child', 'Con'], ['cls', 'Lớp'], ['hieu', 'Hiểu nhau /4'], ['tocchat', 'Tố chất /6'], ['traits', 'Tố chất đã tích'], ['now', 'Điểm đang'], ['want', 'Điểm mong'], ['likes', 'Con thích học'], ['words', 'Ba từ tả bố/mẹ'], ['goal', 'Mục tiêu tháng'], ['ansP', 'Đáp án PH'], ['ansC', 'Đáp án con'], ['msgP', 'Lời nhắn PH'], ['msgC', 'Lời nhắn con'], ['acts', 'Đã làm']];
const VCOLS = COLS.filter(c => ['time', 'role', 'pname', 'phone', 'child', 'cls', 'hieu', 'tocchat', 'now', 'want', 'likes', 'goal'].includes(c[0]));
function renderStaff() {
  const r = S.p.name ? buildRecord() : null, hist = store.get('history', []);
  const cell = (l, v, full) => `<div class="${full ? 'full' : ''}"><small>${l}</small><b>${esc(v === '' || v == null ? '—' : v)}</b></div>`;
  $('staffBody').innerHTML = `<p class="eyebrow">Dành cho KioMath</p><h2 class="h2">${r ? esc(r.child || 'Gia đình hiện tại') : 'Chưa có gia đình đang chơi'}</h2>
  ${r ? `<p class="small" style="margin-top:0">Hiểu nhau <b>${r.hieu}/4</b> · Tố chất <b>${r.tocchat}/6</b> · Điểm: đang <b>${r.now || '…'}</b> / mong <b>${r.want || '…'}</b> · Con thích học: <b>${esc(r.likes || '…')}</b></p>
  <div class="sum">${cell('Phụ huynh', r.role + ' ' + r.pname)}${cell('Số điện thoại', r.phone)}${cell('Con · Lớp', r.child + (r.cls ? ' · ' + r.cls : ''))}${cell('Tố chất đã tích', r.traits, 1)}${cell('Ba từ tả ' + lp(), r.words)}${cell('Mục tiêu tháng', r.goal)}${cell('Đáp án ♥ PH / con', r.ansP + ' / ' + r.ansC)}${cell('Đã làm', r.acts)}${cell('Lời nhắn bố mẹ gửi con', r.msgP, 1)}${cell('Lời nhắn con gửi bố mẹ', r.msgC, 1)}</div>` : ''}
  <h3 class="h2" style="font-size:19px">Các gia đình đã chơi trên máy này (${hist.length})</h3>
  <div class="tbl"><table><thead><tr>${VCOLS.map(c => `<th>${c[1]}</th>`).join('')}</tr></thead><tbody>${hist.map(x => `<tr>${VCOLS.map(c => `<td>${esc(x[c[0]])}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${VCOLS.length}">Chưa có gia đình nào hoàn thành.</td></tr>`}</tbody></table></div>
  <p class="small">Bảng tóm tắt. Nút sao chép lấy đủ mọi cột (tố chất đã tích, lời nhắn, đáp án).</p>
  <div class="row" style="margin-top:12px"><button class="btn plum" id="cpTsv">Sao chép để dán vào Excel</button><button class="btn ghost" id="clrH">Xóa lịch sử trên máy</button></div>
  <p class="small">${SHEET_API ? 'Kết quả cũng được gửi về Google Sheet của trung tâm.' : 'Chưa nối Google Sheet: kết quả chỉ lưu trên máy này (xem README để nối).'}</p>
  <textarea id="tsvBox" hidden readonly style="margin-top:8px;min-height:80px"></textarea>`;
  $('cpTsv').onclick = () => {
    const tsv = [COLS.map(c => c[1]).join('\t')].concat(hist.map(x => COLS.map(c => String(x[c[0]] ?? '').replace(/[\t\n\r]+/g, ' ')).join('\t'))).join('\n');
    const fb = () => { const t = $('tsvBox'); t.hidden = false; t.value = tsv; t.focus(); t.select(); toast('Đã chọn sẵn bảng, nhấn Ctrl+C (hoặc Sao chép) rồi dán vào Excel.'); };
    try { navigator.clipboard.writeText(tsv).then(() => toast('Đã sao chép ' + hist.length + ' dòng. Mở Excel và dán (Ctrl+V).'), fb); } catch (e) { fb(); }
  };
  let armed = false;
  $('clrH').onclick = () => { if (!armed) { armed = true; $('clrH').textContent = 'Bấm lần nữa để xóa hẳn'; return; } store.set('history', []); renderStaff(); toast('Đã xóa lịch sử trên máy này.'); };
}

// ---------- điều khiển ----------
function bindUI() {
  const unlock = () => SND.init();
  ['pointerup', 'touchend', 'keydown'].forEach(ev => addEventListener(ev, unlock, { passive: true }));
  $('btnStart').onclick = () => { if (S.phase !== 'title' && S.p.name) newFamily(); S.phase = 'createP'; save(); showCreate('p'); SND.play('tap'); };
  $('btnResume').onclick = () => { SND.play('tap'); route(); };
  $('btnStaff1').onclick = openStaff; $('staffX').onclick = () => $('staff').hidden = true;
  $('crForm').onsubmit = submitCreate;
  document.querySelectorAll('.seg button').forEach(b => b.onclick = () => {
    S.role = b.dataset.role; document.querySelectorAll('.seg button').forEach(x => x.classList.toggle('on', x === b));
    Object.assign(S.p.look, S.role === 'Bố' ? { hair: 'ngan', shirt: 1 } : { hair: 'dai', shirt: 0 });
    renderLook(); rebuild('p'); emote(HP, 'wave', 1.4); SND.play('tap');
  });
  $('scCreate').addEventListener('click', e => { const b = e.target.closest('.opts-row button'); if (!b) return; const k = b.dataset.k, v = k === 'hair' ? b.dataset.v : +b.dataset.v; S[CW].look[k] = v; renderLook(); const h = rebuild(CW); emote(h, 'cheer', 0.8); h.vy = 5; SND.play('pop'); save(); });
  let nt = null; const nameLive = () => { clearTimeout(nt); nt = setTimeout(() => { if (CW === 'p') { S.p.name = $('fPName').value; S.p.child = $('fChild').value; setNameTag(HP, pTag()); } else { S.c.name = $('fCName').value; setNameTag(HC, cC()); $('crTitle').textContent = 'Chào ' + cC() + '! Tạo nhân vật của em'; } }, 250); };
  ['fPName', 'fChild', 'fCName'].forEach(id => $(id).addEventListener('input', nameLive));
  $('btnQuest').onclick = () => { $('quest').classList.toggle('closed'); SND.play('tap'); };
  const mb = $('btnMusic'); mb.classList.toggle('off', !SND.musicOn); mb.onclick = () => { SND.init(); SND.setMusic(!SND.musicOn); mb.classList.toggle('off', !SND.musicOn); };
  $('questList').addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) goTo(b.dataset.go); });
  $('btnEndTurn').onclick = showTurnEnd;
  $('teGo').onclick = endTurn; $('teStay').onclick = () => { $('turnEnd').hidden = true; };
  $('btnAct').onclick = () => { if (nearSt) openStation(nearSt); };
  $('btnJump').onclick = jump;
  $('btnEmote').onclick = () => { $('emotes').hidden = !$('emotes').hidden; SND.play('tap'); };
  $('emotes').addEventListener('click', e => { const b = e.target.closest('[data-e]'); if (!b) return; doEmote(b.dataset.e); $('emotes').hidden = true; });
  $('dlgX').onclick = closeDlg;
  $('photoX').onclick = () => $('photo').hidden = true;
  const hb = $('passHold');
  hb.addEventListener('pointerdown', holdStart); ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => hb.addEventListener(ev, holdEnd));
  hb.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) holdStart(e); });
  hb.addEventListener('keyup', holdEnd);
  // phím
  addEventListener('keydown', e => {
    if (e.target.matches('input, textarea')) return;
    keys[e.key.toLowerCase()] = true;
    if (MODE !== 'play') return;
    if (e.key === 'Escape') { if (!$('dlg').hidden) closeDlg(); $('emotes').hidden = true; }
    if (!$('dlg').hidden || !$('turnEnd').hidden) return;
    if (e.key === ' ') { e.preventDefault(); jump(); }
    if ((e.key === 'e' || e.key === 'E' || e.key === 'Enter') && nearSt) openStation(nearSt);
    if ('1234'.includes(e.key)) doEmote(['wave', 'dance', 'love', 'cheer'][+e.key - 1]);
  });
  addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
  // cần điều khiển
  const joy = $('joy'), knob = joy.firstElementChild; let jid = null;
  const jmove = e => { const r = joy.getBoundingClientRect(); let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2); const m = r.width / 2 - 12, l = Math.hypot(dx, dy); if (l > m) { dx *= m / l; dy *= m / l; } jx = dx / m; jy = dy / m; knob.style.transform = `translate(${dx}px,${dy}px)`; };
  joy.addEventListener('pointerdown', e => { jid = e.pointerId; joy.setPointerCapture(jid); jmove(e); });
  joy.addEventListener('pointermove', e => { if (e.pointerId === jid) jmove(e); });
  const jend = e => { if (e.pointerId === jid) { jid = null; jx = jy = 0; knob.style.transform = ''; } };
  joy.addEventListener('pointerup', jend); joy.addEventListener('pointercancel', jend);
  const touch = () => { joy.hidden = false; $('keysHint').hidden = true; };
  if (matchMedia('(pointer: coarse)').matches) touch();
  addEventListener('touchstart', touch, { once: true, passive: true });
  // kéo để xoay camera
  const cv = $('cv');
  cv.addEventListener('pointerdown', e => { drag = { id: e.pointerId, x: e.clientX, x0: e.clientX }; try { cv.setPointerCapture(e.pointerId); } catch (er) {} $('emotes').hidden = true; });
  cv.addEventListener('pointermove', e => { if (!drag || drag.id !== e.pointerId) return; const dx = e.clientX - drag.x; drag.x = e.clientX; if (MODE === 'play') camYaw -= dx * 0.0065; else if (MODE === 'create' && PLAYER) PLAYER.yaw = PLAYER.root.rotation.y = PLAYER.root.rotation.y + dx * 0.012; });
  const dend = () => { drag = null; }; cv.addEventListener('pointerup', dend); cv.addEventListener('pointercancel', dend);
  cv.addEventListener('wheel', e => { if (MODE === 'play') { camDist = Math.max(6, Math.min(17, camDist + e.deltaY * 0.01)); e.preventDefault(); } }, { passive: false });
}
function jump() { if (MODE === 'play' && PLAYER && PLAYER.y <= 0.001 && $('dlg').hidden) { PLAYER.vy = 8.5; SND.play('jump'); } }
function doEmote(k) {
  if (!PLAYER) return; SND.play('pop');
  if (k === 'wave') emote(PLAYER, 'wave', 1.6);
  else if (k === 'dance') { emote(PLAYER, 'dance', 2.6); bubble(PLAYER, 'note', 2.4); }
  else if (k === 'love') { emote(PLAYER, 'cheer', 0.8); bubble(PLAYER, 'love', 1.8); burst(PLAYER.root.position.clone().add(new V3(0, PLAYER.h, 0)), 'heart', 8, 3); }
  else if (k === 'cheer') { emote(PLAYER, 'cheer', 1.4); PLAYER.vy = 7; bubble(PLAYER, 'smile', 1.6); }
}
let toastT = null;
function toast(msg, ms = 2600) { const t = $('toast'); t.textContent = msg; t.hidden = false; t.style.animation = 'none'; void t.offsetWidth; t.style.animation = ''; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, ms); }

// ---------- mỗi khung hình ----------
function updatePlay(dt) {
  if (MODE !== 'play' || !PLAYER) return;
  const P = PLAYER, pos = P.root.position, block = !$('dlg').hidden || !$('turnEnd').hidden;
  let ix = 0, iy = 0;
  if (!block) {
    if (keys['w'] || keys['arrowup']) iy += 1; if (keys['s'] || keys['arrowdown']) iy -= 1;
    if (keys['a'] || keys['arrowleft']) ix -= 1; if (keys['d'] || keys['arrowright']) ix += 1;
    ix += jx; iy -= jy;
  }
  const mag = Math.min(1, Math.hypot(ix, iy));
  if (mag > 0.08) {
    const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw), rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
    let dx = fx * iy + rx * ix, dz = fz * iy + rz * ix; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    const sp = 7.2 * mag; pos.x += dx * sp * dt; pos.z += dz * sp * dt; P.yaw = Math.atan2(dx, dz);
  }
  for (let k = 0; k < 2; k++) for (const c of COLL) { const dx = pos.x - c.x, dz = pos.z - c.z, d = Math.hypot(dx, dz), m = c.r + 0.42; if (d < m && d > 1e-4) { pos.x = c.x + dx / d * m; pos.z = c.z + dz / d * m; } }
  if (HP && HP !== P && HP.root.visible) { const dx = pos.x - HP.root.position.x, dz = pos.z - HP.root.position.z, d = Math.hypot(dx, dz); if (d < 0.9 && d > 1e-4) { pos.x = HP.root.position.x + dx / d * 0.9; pos.z = HP.root.position.z + dz / d * 0.9; } }
  const rr0 = Math.hypot(pos.x, pos.z); if (rr0 > 37) { pos.x *= 37 / rr0; pos.z *= 37 / rr0; }
  P.sp = mag > 0.08 ? mag : 0;
  // trạm gần nhất
  const w = turn(); let near = null, best = 3.0;
  for (const st of STATIONS) { const D = ST3[st.id], d = Math.hypot(pos.x - D.ip.x, pos.z - D.ip.z); if (d < best) { best = d; near = st; } }
  let hk = '';
  if (near && active(near, w) && !block) { nearSt = near; hk = 'a:' + near.id; }
  else { nearSt = null; if (near && !block) hk = 'h:' + near.id; else if (w === 'c' && HP && Math.hypot(pos.x - HP.root.position.x, pos.z - HP.root.position.z) < 2.6 && !block) hk = 'hp'; }
  if (hk !== hintKey) {
    hintKey = hk; const ab = $('btnAct'), hi = $('hint');
    ab.hidden = !hk.startsWith('a:'); hi.hidden = !(hk.startsWith('h:') || hk === 'hp');
    if (hk.startsWith('a:')) { $('actEmo').textContent = near.emo; $('actTxt').textContent = near.act + (matchMedia('(pointer: coarse)').matches ? '' : ' (E)'); SND.play('pop'); }
    if (hk.startsWith('h:')) hi.textContent = near.who === 'p' ? 'Góc riêng của bố mẹ. Lượt này không cần ghé đâu.' : 'Trạm này dành cho con. Đến lượt con nhé!';
    if (hk === 'hp') { hi.textContent = fill('{P} đang chờ {C} ở đây. Nhớ đừng cho {p} xem câu trả lời nhé!'); emote(HP, 'wave', 1.5); }
  }
  // mũi tên dẫn đường
  let tgt = null, td = 1e9;
  if (w) for (const st of mine(w)) { if (isDone(w, st.id)) continue; const D = ST3[st.id], d = Math.hypot(D.ip.x - pos.x, D.ip.z - pos.z); if (d < td) { td = d; tgt = D.ip; } }
  ARROW.visible = !!tgt && td > 4.5 && !block;
  if (ARROW.visible) { const a = Math.atan2(tgt.x - pos.x, tgt.z - pos.z); ARROW.rotation.y = a; ARROW.position.set(pos.x + Math.sin(a) * 1.6, groundY(pos.x, pos.z) + 0.06, pos.z + Math.cos(a) * 1.6); ARROW.children[0].material.opacity = 0.6 + Math.sin(T * 5) * 0.3; }
}
function physics(dt) {
  for (const h of [HP, HC]) {
    if (!h || !h.root.visible) continue;
    h.vy -= 22 * dt; h.y += h.vy * dt; if (h.y <= 0) { h.y = 0; h.vy = 0; }
    const p = h.root.position; p.y = groundY(p.x, p.z) + h.y;
    const sp = (h === PLAYER && MODE === 'play') ? (h.sp || 0) : (h.moving ? 0.55 : 0);
    animHuman(h, dt, sp, T);
  }
}
const camT = new V3(), lookT = new V3();
function updateCam(dt) {
  const tan = Math.tan(CAM.fov * Math.PI / 360), asp = CAM.aspect;
  if (MODE === 'title' || MODE === 'pass') { const a = T * 0.05 + 0.6; camT.set(Math.sin(a) * 60, 30, Math.cos(a) * 60); lookT.set(0, -2, 0); }
  else if (MODE === 'play' && PLAYER) { const p = PLAYER.root.position, ph = 0.5; camT.set(p.x + Math.sin(camYaw) * Math.cos(ph) * camDist, p.y + 1.4 + Math.sin(ph) * camDist, p.z + Math.cos(camYaw) * Math.cos(ph) * camDist); lookT.set(p.x, p.y + 1.3, p.z); }
  else if (MODE === 'create' || MODE === 'reveal') {
    // phần màn hình còn nhìn thấy phía trên bảng (điện thoại)
    const el = MODE === 'create' ? $('scCreate') : $('scReveal'); let f = 1;
    if (innerWidth <= 760 && !el.hidden) f = Math.max(0.28, el.getBoundingClientRect().top / innerHeight);
    if (MODE === 'create' && PLAYER) { const d = Math.max(4.6, 1.15 / (tan * asp), 2.9 / (2 * tan * f)); camT.set(0, 1.55, 3.2 + d); lookT.set(0, 1.05, 3.2); }
    else { const d = Math.max(7.2, 2.55 / (tan * asp), 3.8 / (2 * tan * f)); camT.set(0, 2.5, STAGE_Z + d); lookT.set(0, 1.3, STAGE_Z); }
  }
  const k = 1 - Math.exp(-dt * (MODE === 'play' ? 7 : 3.2));
  CAM.position.lerp(camT, k); lookAtV.lerp(lookT, k); CAM.lookAt(lookAtV);
}
// dịch khung hình để nhân vật không bị bảng che
let VS = '';
function applyView() {
  const W = innerWidth, H = innerHeight; let ox = 0, oy = 0;
  const el = MODE === 'title' ? $('scTitle') : MODE === 'create' ? $('scCreate') : MODE === 'reveal' ? $('scReveal') : null;
  if (el && !el.hidden) {
    const r = el.getBoundingClientRect();
    if (W > 760) ox = MODE === 'reveal' ? (r.width + 16) / 2 : -(r.width + 16) / 2;
    else oy = (H - r.top) / 2;
  }
  const key = W + 'x' + H + ':' + Math.round(ox) + ',' + Math.round(oy);
  if (key === VS) return; VS = key;
  if (ox || oy) CAM.setViewOffset(W, H, ox, oy, W, H); else CAM.clearViewOffset();
  CAM.updateProjectionMatrix();
}
function resize() { R.setSize(innerWidth, innerHeight); CAM.aspect = innerWidth / innerHeight; CAM.updateProjectionMatrix(); VS = ''; }
const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clock.getDelta()); T += dt;
  for (const f of ANIM) f(T, dt);
  updatePlay(dt); physics(dt); tickTw(dt); tickParts(dt); updateCam(dt); applyView();
  R.render(SC, CAM);
}
boot();
