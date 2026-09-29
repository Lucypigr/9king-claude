/* 9 Kings – 戰場繪製（像素精靈、背景、特效）。僅供瀏覽器使用。 */
(function (NK) {
  'use strict';
  const R = (NK.R = {});
  const W = 1280, H = 620;

  /* ───── 像素精靈 10×12 ─────
   * o=外框 b=隊伍色 d=深色 l=亮色 s=膚色 w=鋼 g=灰 y=金 r=紅 n=棕 W=白 k=黑 */
  const SPR = {
    knight: ['...ooo....', '..osso....', '..osso..w.', '...oo...w.', '.ooboo..w.', 'obbbbo.ow.', 'ogbbbbowo.', 'ogbbbo.o..', '.obbbo....', '.obobo....', '.ono.ono..', '.oo..oo...'],
    heavy: ['..oooo....', '.ogggo....', '.ogsgo.w..', '..oooo.w..', '.obbbbo.w.', 'obbbbbbow.', 'obbdbbbbo.', 'ogbbbbbo..', 'obbbbbbo..', '.obbbbo...', '.onoono...', '.ooo.oo...'],
    archer: ['...ooo....', '..osso....', '..osso.n..', '...oo.n.n.', '..obbo.n.n', '.obbbbon.n', '.obbbb.n.n', '.obbbo.n.n', '..obbo.n.n', '..obbo..n.', '..ono.....', '..oo.oo...'],
    mage: ['....o.....', '...obo....', '..obbbo...', '.ooooooo..', '..osso..y.', '..osso..n.', '.obbbbo.n.', 'obbbbbboyn', 'obbbbbbo.n', '.obbbbo..n', '.obbbbo..n', '..oooo....'],
    imp: ['o..oo..o..', 'ob.oo.bo..', '.obbbbo...', '.obrbro...', '.obbbbo.o.', '..obbo.ob.', '.obbbbobo.', 'o.obbo.o..', '..obbo....', '..oboo....', '..o..o....', '.oo..oo...'],
    bomb: ['.......y..', '......y...', '.....on...', '..ooooo...', '.okkkkko..', 'okkWkkkko.', 'okkkkkkko.', 'okkrrkkko.', 'okkkkkkko.', '.okkkkko..', '..ooooo...', '..o.o.o...'],
    beast: ['..........', '....oo.o..', '...obbbbo.', '..obbbbbbo', '.obbbbbbbo', 'obbbrbbbo.', 'obbbbbbbo.', 'ogbbbbbbo.', '.obbbbbo..', '.ono.ono..', '.ono.ono..', '.oo..oo...'],
    rat: ['..........', '..........', '..........', '....o.o...', '...obbbo..', '.o.obrbbo.', 'obobbbbbbo', 'obbbbbbbo.', '.obbbbbo..', '..ono.ono.', '..oo..oo..', '..........'],
    slime: ['..........', '..........', '...oooo...', '..obbbbo..', '.obWbbWbo.', '.obkbbkbo.', 'obbbbbbbbo', 'obbbbbbbbo', 'obbbbbbbbo', '.oooooooo.', '..........', '..........'],
    ship: ['..........', '....oo....', '..oooooo..', '.oglllggo.', 'ogglllllgo', 'oggbbbbggo', 'ogbbbbbbgo', '.oooyyooo.', '..o.yy.o..', '..........', '..........', '..........'],
    tower: ['...oyo....', '..oyyyo...', '..orryo...', '.oorrroo..', '.orrrrro..', 'oorrrrroo.', 'orrryrrro.', 'orryyyrro.', 'orrrrrrro.', '.oooooooo.', '..........', '..........'],
    wall: ['oooooooooo', 'oggggoggggo', 'oggggoggggo', 'ooooooooo.', 'oggoggggog', 'oggoggggog', 'ooooooooo.', 'oggggoggo.', 'oggggoggo.', 'oooooooooo', '..........', '..........']
  };
  for (const k in SPR) SPR[k] = SPR[k].map(r => (r + '..........').slice(0, 10));

  const cache = new Map();
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const c = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
    return '#' + ((1 << 24) | (c(r) << 16) | (c(g) << 8) | c(b)).toString(16).slice(1);
  }
  R.shade = shade;
  R.sprite = function (name, col, flash) {
    const key = name + col + (flash ? 'f' : '');
    let c = cache.get(key); if (c) return c;
    const rows = SPR[name] || SPR.knight;
    c = document.createElement('canvas'); c.width = 10; c.height = 12;
    const x = c.getContext('2d');
    const pal = { o: '#150f0c', b: col, d: shade(col, 0.6), l: shade(col, 1.35), s: '#f0c8a0', w: '#e0e4ec', g: '#8b9099', y: '#f2c94c', r: '#d23a2e', n: '#8a5a30', W: '#ffffff', k: '#22201e' };
    for (let j = 0; j < 12; j++) for (let i = 0; i < 10; i++) {
      const ch = rows[j][i]; if (ch === '.') continue;
      x.fillStyle = flash ? '#fff' : (pal[ch] || col); x.fillRect(i, j, 1, 1);
    }
    cache.set(key, c); return c;
  };

  /* ───── 背景（一次性繪製）───── */
  function rng(seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
  R.makeBackground = function (lay, tint) {
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); const r = rng(9);
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#345a34'); g.addColorStop(1, '#2c4d2e'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 2600; i++) { x.fillStyle = r() < 0.5 ? 'rgba(90,140,70,.35)' : 'rgba(20,50,25,.35)'; x.fillRect(r() * W, r() * H, 2 + r() * 3, 2); }
    // 土路
    x.fillStyle = '#6a5636'; x.beginPath(); x.moveTo(lay.right, 210); x.bezierCurveTo(600, 190, 900, 260, W, 240); x.lineTo(W, 440); x.bezierCurveTo(900, 470, 600, 400, lay.right, 430); x.closePath(); x.fill();
    for (let i = 0; i < 900; i++) { const px = lay.right + r() * (W - lay.right), py = 200 + r() * 250; x.fillStyle = r() < 0.5 ? 'rgba(140,110,70,.4)' : 'rgba(60,45,25,.35)'; x.fillRect(px, py, 2, 2); }
    // 王國廣場
    x.fillStyle = shade(tint || '#4a3e2e', 1); x.fillRect(0, 0, lay.right + 26, H);
    x.fillStyle = 'rgba(0,0,0,.22)'; x.fillRect(0, 0, lay.right + 26, H);
    for (let yy = 0; yy < H; yy += 22) for (let xx = (yy / 22 % 2) * 22; xx < lay.right + 26; xx += 44) { x.strokeStyle = 'rgba(0,0,0,.25)'; x.strokeRect(xx, yy, 44, 22); }
    // 城牆邊界
    x.fillStyle = '#5b5348'; x.fillRect(lay.right + 26, 0, 14, H);
    x.fillStyle = '#7a7166'; for (let yy = 0; yy < H; yy += 30) x.fillRect(lay.right + 24, yy, 18, 16);
    x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(lay.right + 40, 0, 6, H);
    // 樹
    for (let i = 0; i < 70; i++) {
      const px = lay.right + 60 + r() * (W - lay.right - 60), top = r() < 0.5; const py = top ? 20 + r() * 110 : H - 20 - r() * 100;
      x.fillStyle = '#4a3020'; x.fillRect(px - 2, py + 4, 4, 10);
      x.fillStyle = r() < 0.5 ? '#2a5a2c' : '#23492a'; x.beginPath(); x.arc(px, py, 10 + r() * 6, 0, 7); x.fill();
      x.fillStyle = 'rgba(120,180,90,.25)'; x.beginPath(); x.arc(px - 3, py - 3, 5, 0, 7); x.fill();
    }
    // 暗角
    const v = x.createRadialGradient(W / 2, H / 2, 260, W / 2, H / 2, 800); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.45)'); x.fillStyle = v; x.fillRect(0, 0, W, H);
    return c;
  };

  /* ───── 單位/特效繪製 ───── */
  R.drawBattle = function (ctx, b, opts) {
    opts = opts || {};
    ctx.imageSmoothingEnabled = false;
    // 區域
    for (const z of b.zones) {
      ctx.globalAlpha = 0.22; ctx.fillStyle = z.kind === 'fire' ? '#ff7a30' : '#6adf70';
      ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, 7); ctx.fill(); ctx.globalAlpha = 0.6; ctx.strokeStyle = z.kind === 'fire' ? '#ffb060' : '#9fff9f'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.globalAlpha = 1;
    }
    for (const tr of b.traps) { ctx.fillStyle = '#c8b070'; ctx.beginPath(); ctx.moveTo(tr.x - 6, tr.y + 4); ctx.lineTo(tr.x, tr.y - 6); ctx.lineTo(tr.x + 6, tr.y + 4); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#3a2a10'; ctx.stroke(); }
    // 塔（召喚塔）
    for (const tw of b.tw) if (tw.summoned) { ctx.drawImage(R.sprite('tower', '#a68a64'), tw.x - 10, tw.y - 14, 20, 24); }
    // 單位
    const list = b.u.slice().sort((a, c) => a.y - c.y);
    for (const u of list) {
      if (!u.alive) continue;
      if (u.kind === 'wall') { const w = 22, h = 60 * Math.max(0.5, u.hp / u.maxhp) + 16; ctx.fillStyle = '#8a8378'; ctx.fillRect(u.x - w / 2, u.y - h / 2, w, h); ctx.strokeStyle = '#2a251f'; ctx.strokeRect(u.x - w / 2, u.y - h / 2, w, h); continue; }
      const sc = 2.5 * Math.min(2.6, u.size || 1), w = 10 * sc, h = 12 * sc;
      // 影子/隊伍環
      ctx.fillStyle = u.side === 0 ? 'rgba(90,170,255,.35)' : 'rgba(255,90,80,.35)'; ctx.beginPath(); ctx.ellipse(u.x, u.y + h * 0.42, w * 0.5, h * 0.16, 0, 0, 7); ctx.fill();
      const spr = R.sprite(u.spr || 'knight', u.col || '#ccc', false);
      ctx.save(); ctx.translate(u.x, u.y - (u.flying ? 18 : 0));
      const face = u.side === 0 ? 1 : -1; ctx.scale(face, 1);
      if (u.golden) { ctx.shadowColor = '#ffd84a'; ctx.shadowBlur = 8; }
      if (u.slow > 0) ctx.globalAlpha = 0.8;
      ctx.drawImage(spr, -w / 2, -h / 2, w, h);
      ctx.restore(); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      if (u.poison > 0) { ctx.fillStyle = '#7f4'; ctx.fillRect(u.x - 3, u.y - h / 2 - 8, 6, 2); }
      if (u.boss) { ctx.fillStyle = '#ffd24a'; ctx.font = '16px serif'; ctx.textAlign = 'center'; ctx.fillText('👑', u.x, u.y - h / 2 - 2); }
      if (u.mounted) { ctx.fillStyle = '#e8b070'; ctx.fillRect(u.x - 3, u.y + h * 0.3, 6, 2); }
      if (u.root > 0) { ctx.strokeStyle = '#4c8'; ctx.lineWidth = 2; ctx.strokeRect(u.x - w / 2, u.y - h / 2, w, h); }
      if (u.hp < u.maxhp && u.maxhp < 1e8) { const bw = Math.max(12, w); ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(u.x - bw / 2, u.y - h / 2 - 5, bw, 3); ctx.fillStyle = u.side === 0 ? '#5fd35f' : '#e05050'; ctx.fillRect(u.x - bw / 2, u.y - h / 2 - 5, bw * Math.max(0, u.hp / u.maxhp), 3); }
    }
    // 特效
    for (const f of b.fx) {
      const a = Math.max(0, Math.min(1, f.ttl / 0.3));
      if (f.t === 'line') { ctx.globalAlpha = Math.min(1, a * 2); ctx.strokeStyle = f.col; ctx.lineWidth = f.thick || 1.5; ctx.beginPath(); ctx.moveTo(f.x1, f.y1); ctx.lineTo(f.x2, f.y2); ctx.stroke(); }
      else if (f.t === 'boom') { ctx.globalAlpha = a * 0.55; ctx.fillStyle = f.col; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1.1 - a * 0.4), 0, 7); ctx.fill(); ctx.globalAlpha = a; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke(); }
      else if (f.t === 'puff') { ctx.globalAlpha = a; ctx.fillStyle = f.col; const s = (1 - a) * 8; ctx.fillRect(f.x - s, f.y - s, 3, 3); ctx.fillRect(f.x + s, f.y - s * 0.5, 3, 3); ctx.fillRect(f.x, f.y + s, 3, 3); ctx.fillRect(f.x - s * 0.6, f.y + s * 0.4, 2, 2); }
      else if (f.t === 'text') { ctx.globalAlpha = Math.min(1, a * 2); ctx.font = '14px serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(f.s, f.x, f.y - (1 - a) * 14); }
      ctx.globalAlpha = 1;
    }
    // 瞄準準星
    if (opts.aim) { const a = opts.aim; ctx.strokeStyle = 'rgba(255,240,180,.9)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(a.x, a.y, 20, 0, 7); ctx.moveTo(a.x - 28, a.y); ctx.lineTo(a.x + 28, a.y); ctx.moveTo(a.x, a.y - 28); ctx.lineTo(a.x, a.y + 28); ctx.stroke(); }
  };

  // 敵人預覽小圖示用
  R.iconCanvas = function (spr, col, scale) {
    const c = document.createElement('canvas'); c.width = 10 * scale; c.height = 12 * scale; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    x.drawImage(R.sprite(spr, col), 0, 0, c.width, c.height); return c;
  };
  R.W = W; R.H = H;
})(globalThis.NK = globalThis.NK || {});
