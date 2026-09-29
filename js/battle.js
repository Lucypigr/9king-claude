/* 9 Kings – 即時戰鬥模擬（無 DOM，可在 Node 直接跑）
 * 座標系：1280×620。王國網格在左，戰場在右，敵人從右邊進來。 */
(function (NK) {
  'use strict';
  const C = NK.CARDS, G = NK.G;
  const W = 1280, H = 620, FTOP = 90, FBOT = 560, SPD = 52, CAP = 30;
  NK.WORLD = { W, H, FTOP, FBOT };

  /* ───── 版面：計算每個地塊的世界座標 ───── */
  NK.layout = function (S, extra) {
    let r0 = 99, r1 = -1, c0 = 99, c1 = -1;
    const eat = (r, c) => { r0 = Math.min(r0, r); r1 = Math.max(r1, r); c0 = Math.min(c0, c); c1 = Math.max(c1, c); };
    for (let r = 0; r < NK.CONST.GRID; r++) for (let c = 0; c < NK.CONST.GRID; c++) if (S.open[r][c]) eat(r, c);
    if (extra) for (const [r, c] of extra) eat(r, c);
    if (r1 < 0) { r0 = 1; r1 = 3; c0 = 1; c1 = 3; }
    const rows = r1 - r0 + 1, cols = c1 - c0 + 1;
    const maxW = 450, maxH = 480;
    const cs = Math.floor(Math.min(150, maxW / cols, maxH / rows));
    const gw = cs * cols, gh = cs * rows;
    const ox = 22 + (maxW - gw) / 2, oy = 84 + (maxH - gh) / 2;
    return { cs, ox, oy, r0, c0, rows, cols, right: ox + gw, left: ox, top: oy, bottom: oy + gh,
      pos: (r, c) => ({ x: ox + (c - c0 + 0.5) * cs, y: oy + (r - r0 + 0.5) * cs }) };
  };

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ───── 戰鬥 ───── */
  function Battle(S, wave, opts) {
    opts = opts || {};
    this.S = S; this.wave = wave; this.rng = S.rng;
    this.lay = NK.layout(S);
    this.u = []; this.tw = []; this.zones = []; this.traps = []; this.fx = []; this.byPlot = new Map();
    this.t = 0; this.done = false; this.win = false; this.baseHit = false; this.nextId = 1;
    this.kills = 0; this.deaths = 0; this.aim = null; this.aimT = 0; this.goldGained = 0; this.overtime = false;
    this.buf = { shamanDmg: 0 };
    this.base = null; this.baseXY = { x: this.lay.left + 40, y: (this.lay.top + this.lay.bottom) / 2 };
    this.wallCount = 0;
    this.isBoss = !!wave.boss;
    this._spawnPlayer(); this._spawnEnemy();
    this._mounts();
  }
  NK.Battle = Battle;
  const P = Battle.prototype;

  P.mk = function (o) {
    const u = Object.assign({ id: this.nextId++, alive: true, x: 0, y: 0, hp: 1, maxhp: 1, dmg: 0, hps: 1, spd: SPD, range: 16, atk: 'melee', crit: 0, critMul: 2,
      cd: 0, size: 1, k: 1, ench: {}, targetable: true, retarget: 0, tgt: null, poison: 0, poisonT: 0, slow: 0, slowT: 0, root: 0, shield: 0, prec: 0, t: 0, side: 0, buffs: 0, dmgBase: 0 }, o);
    u.maxhp = u.maxhp || u.hp; u.cd = this.rng.next();
    this.u.push(u); return u;
  };

  /* ── 玩家側生成 ── */
  P._cauldronStacks = function (p) {
    let n = 0; for (const q of G.adjacent(this.S, p)) if (q.card === 'cauldron') n += q.level;
    return n;
  };
  P._spawnPlayer = function () {
    const S = this.S, lay = this.lay;
    const walls = [];
    for (const p of G.plots(S)) {
      const cd = C[p.card], pos = lay.pos(p.r, p.c);
      if (cd.type === 'troop' || cd.isTroopBase) this._spawnTroop(p, pos);
      else if (cd.type === 'base') this._spawnBase(p, pos);
      else if (cd.type === 'tower') this._spawnTower(p, pos);
      else if (cd.fx === 'wall') walls.push(p);
      if (cd.type === 'base' || cd.isTroopBase) this.baseXY = { x: Math.max(lay.left + 30, pos.x - lay.cs * 0.2), y: pos.y };
    }
    walls.forEach((p, i) => {
      const hp = cd_wallHp(p) * (1 + 0);
      this.mk({ side: 0, kind: 'wall', card: 'wallmaker', plot: p, x: lay.right + 22 + (i % 2) * 10, y: FTOP + (FBOT - FTOP) * ((i + 0.5) / walls.length),
        hp, maxhp: hp, spd: 0, dmg: 0, hps: 0, size: 2.2, spr: 'wall', immobile: true, noAtk: true, reflect: 0.1 * G.dc(S, 'barricade') });
    });
    // 陷阱（累積）
    for (const p of G.plots(S)) if (p.card === 'trapper' && p.x.traps) {
      const st = G.unitStats(S, p);
      for (let i = 0; i < p.x.traps; i++) this.traps.push({ x: lay.right + 120 + this.rng.next() * 500, y: FTOP + 20 + this.rng.next() * (FBOT - FTOP - 40), dmg: st.dmg * Math.pow(2, G.dc(S, 'dynamites')) * 3, r: 34, plot: p });
      p.x.traps = 0;
    }
  };
  function cd_wallHp(p) { return C.wallmaker.wallHp[Math.min(p.level, 3) - 1]; }

  P._spawnTroop = function (p, pos) {
    const S = this.S, cd = C[p.card], st = G.unitStats(S, p);
    const n = Math.floor(st.count); if (n <= 0) return;
    const ent = Math.min(n, CAP), k = n / ent;
    const poisonOn = (p.ench.poison_vial || 0) + this._cauldronStacks(p);
    const arr = []; this.byPlot.set(p.id, arr);
    for (let i = 0; i < ent; i++) {
      const u = this.mk({ side: 0, kind: 'unit', card: p.card, plot: p, x: pos.x + (this.rng.next() - .5) * 60, y: pos.y + (this.rng.next() - .5) * 60,
        hp: st.hp * k, maxhp: st.hp * k, dmg: st.dmg * k, dmgBase: st.dmg, hps: st.hps, spd: st.spd * SPD, atk: cd.atk || 'melee', range: cd.atk === 'ranged' ? (cd.range || 220) : 16,
        crit: st.crit, critMul: st.critMul, size: (cd.size || 1) * (p.x.big ? 1.6 : 1) * (1 + Math.log2(k) * 0.12), k, beh: cd.beh, spr: cd.spr || 'knight', ench: p.ench,
        shield: p.ench.steel_coat || 0, prec: p.ench.precision || 0, poisonOn, aoe: (cd.aoe || 0) * Math.pow(1.3, G.dc(S, 'gunpowder')), col: NK.KINGS[cd.king] ? NK.KINGS[cd.king].color : '#ccc' });
      if (cd.beh === 'scapegoat') { u.passive = true; u.noAtk = true; u.home = { x: pos.x + 80 + this.rng.next() * 60, y: FTOP + 40 + this.rng.next() * (FBOT - FTOP - 80) }; }
      if (cd.beh === 'defender') { u.noAtk = true; u.reflect = 1; }
      if (cd.beh === 'bomber') { u.aoe = 60 * Math.pow(2, G.dc(S, 'fireworks')) * Math.pow(1.3, G.dc(S, 'gunpowder')); }
      if (cd.beh === 'trapper') { u.traps = 3; }
      if (cd.beh === 'jump') { u.jumpAt = 1.0; }
      if (cd.beh === 'warlord') { u.banners = 0; }
      if (cd.isTroopBase) u.kind = 'unit';
      if (p.card === 'archer' && G.dc(S, 'twinshot')) u.multi = 1 + G.dc(S, 'twinshot');
      arr.push(u);
    }
  };

  P._spawnBase = function (p, pos) {
    const S = this.S, cd = C[p.card], st = G.unitStats(S, p), b = cd.base;
    this.base = { plot: p, cd, st, x: pos.x, y: pos.y, cd0: 0.6, timer: 0, beh: cd.beh };
    if (cd.beh === 'pagoda') {
      const cap = b.cap * Math.pow(2, G.dc(S, 'evil_pact'));
      const n = Math.min(cap, 9 + S.year - 1);
      const ent = Math.min(n, CAP), k = n / ent;
      const mul = Math.pow(1.5, G.dc(S, 'war_horns')) * (1 + 0);
      for (let i = 0; i < ent; i++) this.mk({ side: 0, kind: 'unit', card: 'imp', x: pos.x + (this.rng.next() - .5) * 50, y: pos.y + (this.rng.next() - .5) * 50,
        hp: st.hp * k * mul, dmg: st.dmg * k * mul, hps: st.hps, spd: 2 * SPD, size: 0.8, k, spr: 'imp', col: NK.KINGS.blood.color, targetable: false, crit: 5, critMul: st.critMul, summon: true });
    }
    if (cd.beh === 'mothership') {
      this.ship = this.mk({ side: 0, kind: 'unit', card: 'mothership', x: pos.x + 40, y: pos.y, hp: 1e9, dmg: st.dmg, hps: st.hps, spd: 1.6 * SPD, atk: 'ranged', range: 210 * Math.pow(2, G.dc(S, 'ultragravity')), size: 1.8, spr: 'ship', col: NK.KINGS.progress.color, targetable: false, crit: st.crit, critMul: st.critMul, flying: true });
    }
  };

  P._spawnTower = function (p, pos) {
    const S = this.S, cd = C[p.card], st = G.unitStats(S, p);
    const poisonOn = (p.ench.poison_vial || 0) + this._cauldronStacks(p);
    const tw = { plot: p, cd, st, x: pos.x, y: pos.y, beh: cd.beh, range: cd.range || 400, cd0: this.rng.next(), poisonOn, side: 0 };
    if (cd.beh === 'altar') {
      const n = p.level, mul = Math.pow(1.5, G.dc(S, 'war_horns'));
      for (let i = 0; i < n; i++) this.mk({ side: 0, kind: 'unit', card: 'demon', x: pos.x + 30, y: pos.y + (i - n / 2) * 12, hp: st.hp * mul, dmg: st.dmg * mul, hps: st.hps, spd: 1.1 * SPD, size: 1.6, spr: 'imp', col: '#ff5040', crit: st.crit, critMul: st.critMul, poisonOn, summon: true, altar: p });
      return;
    }
    if (cd.beh === 'mycelium') {
      tw.sp = 0; tw.spawnT = 9 / (1 + G.dc(S, 'overwork'));
      const ns = p.x.spores || 0; const ent = Math.min(ns, CAP), k = ent ? ns / ent : 1;
      for (let i = 0; i < ent; i++) this._spore(tw, k);
    }
    if (cd.beh === 'flame') {
      this.mk({ side: 0, kind: 'unit', card: 'flametower', x: pos.x + 30, y: pos.y, hp: 1e9, dmg: st.dmg, hps: st.hps, spd: (0.7 + 0.15 * p.level) * SPD, atk: 'melee', range: 60, size: 1.5, spr: 'tower', col: '#ff7030', targetable: false, flame: true, poisonOn, crit: st.crit, critMul: st.critMul, aoe: 40, flying: false });
      return;
    }
    this.tw.push(tw);
  };
  P._spore = function (tw, k) {
    const st = tw.st;
    return this.mk({ side: 0, kind: 'unit', card: 'spore', x: tw.x + 30 + this.rng.next() * 20, y: tw.y + (this.rng.next() - .5) * 60, hp: 10, dmg: st.dmg * (k || 1), hps: st.hps, spd: 1.2 * SPD, size: 0.8, spr: 'slime', col: '#9be26a', targetable: false, crit: 0, critMul: 2, summon: true, k: k || 1 });
  };

  /* ── 敵人生成 ── */
  P._spawnEnemy = function () {
    const S = this.S, wave = this.wave, E = NK.ENEMY, king = NK.KINGS[wave.king];
    const abr = G.dc(S, 'abracadabra');
    for (const sp of wave.specs) {
      const cd = C[sp.card], row = cd.lv[Math.min(sp.level, 3) - 1];
      const n = sp.count, ent = Math.min(n, CAP), k = n / ent;
      const hp = row[0] * sp.hpMul, dmg = row[1] * sp.dmgMul;
      for (let i = 0; i < ent; i++) {
        const golden = !sp.boss && this.rng.chance(E.goldenChance);
        const frog = !sp.boss && abr && this.rng.chance(0.1);
        const u = this.mk({ side: 1, kind: 'unit', card: sp.card, x: W - 20 + this.rng.next() * 140, y: FTOP + 10 + this.rng.next() * (FBOT - FTOP - 20),
          hp: (frog ? 1 : hp * k) * (sp.boss ? 1 : 1), maxhp: (frog ? 1 : hp * k), dmg: frog ? 0.1 : dmg * k, dmgBase: dmg, hps: row[2], spd: row[3] * SPD, atk: cd.atk || 'melee',
          range: cd.atk === 'ranged' ? (cd.range || 220) : 16, crit: row[4], critMul: 2, size: (sp.size || cd.size || 1) * (1 + Math.log2(k) * 0.12) * (frog ? 0.6 : 1), k,
          beh: cd.beh, spr: frog ? 'slime' : (cd.spr || 'knight'), col: king.color, golden, boss: !!sp.boss, aoe: cd.aoe || 0, ench: {}, frog });
        if (cd.beh === 'defender') { u.noAtk = true; u.reflect = 1; }
        if (cd.beh === 'bomber') u.aoe = 60;
        if (cd.beh === 'scapegoat') u.noAtk = true;
        if (cd.beh === 'jump') u.jumpAt = 1.2;
        if (cd.beh === 'trapper') u.traps = 0; // 敵方陷阱師：純近戰
        if (sp.boss) { u.maxhp = u.hp; u.spd *= 0.75; }
      }
    }
    this.enemyTotal = this.u.filter(u => u.side === 1).length;
  };

  /* ── 騎乘（野豬 / 迅猛龍）── */
  P._mounts = function () {
    const S = this.S;
    for (const p of G.plots(S)) {
      if (p.card !== 'boar' && p.card !== 'raptor') continue;
      const mounts = (this.byPlot.get(p.id) || []).slice();
      for (const q of G.adjacent(S, p)) {
        const riders = this.byPlot.get(q.id);
        if (!G.isTroop(q) || q.card === 'boar' || q.card === 'raptor' || !riders) continue;
        for (const rider of riders) {
          if (!mounts.length) break;
          const m = mounts.pop(); if (!m.alive) continue;
          if (p.card === 'boar') { const mul = 1 + m.hp / m.k * 0.01; rider.hp *= mul; rider.maxhp *= mul; rider.dmg *= mul; rider.hps *= mul; }
          else { rider.hp += m.hp; rider.maxhp += m.hp; rider.dmg += m.dmg; rider.spd = Math.max(rider.spd, m.spd); }
          rider.mounted = true; m.alive = false; m.mount = true;
        }
      }
    }
    this.u = this.u.filter(u => u.alive);
  };

  /* ───── 傷害 ───── */
  P.gain = function (n) { if (n > 0) { G.gain(this.S, n); this.goldGained += n; } };
  P.heal = function (u, n) { if (!u.alive) return; u.hp = Math.min(u.maxhp, u.hp + n); };

  // src 可為 null（環境傷害）。opts: {noCrit,noReflect,noProc,pos}
  P.damage = function (t, dmg, src, opts) {
    opts = opts || {};
    if (!t.alive || dmg <= 0 && !opts.zero) return 0;
    const S = this.S;
    if (src && !opts.noCrit) {
      if (src.prec > 0) { src.prec--; dmg *= src.critMul; }
      else if (src.crit > 0 && this.rng.next() * 100 < src.crit) dmg *= src.critMul;
    }
    if (G.dc(S, 'weakspot') && (t.poison > 0 || t.slow > 0)) dmg *= 1.5;
    if (t.shield > 0) { t.shield--; this.fx.push({ t: 'text', x: t.x, y: t.y - 10, s: '🛡', ttl: 0.5 }); return 0; }
    t.hp -= dmg;
    if (src && !opts.noProc && src.alive !== false) this._onHit(src, t, dmg, opts);
    if (t.reflect && src && src.alive && typeof src.hp === 'number' && !opts.noReflect) { src.hp -= dmg * t.reflect; if (src.hp <= 0) this.kill(src, null); }
    if (t.hp <= 0 && t.alive) this.kill(t, src);
    return dmg;
  };

  P._onHit = function (src, t, dmg, opts) {
    const S = this.S;
    const e = src.ench || {};
    if (src.side === 0) {
      const ps = src.poisonOn || 0; // 已含毒瓶與大釜
      if (ps > 0) this._poison(t, ps * Math.pow(2, G.dc(S, 'venom')));
      if (e.frost) { t.slow = Math.min(0.8, 0.2 * e.frost); t.slowT = 3; if (G.dc(S, 'frostbite')) this._poison(t, G.dc(S, 'frostbite') * e.frost * 0.5); }
      if (e.vampirism) this.heal(src, dmg * 0.25 * e.vampirism);
      if (e.static && !opts.chain) this._chain(src, t, e.static);
    } else if (G.dc(S, 'poison_thorns') && t.side === 0) { this._poison(src, G.dc(S, 'poison_thorns')); }
  };
  P._poison = function (t, stacks) {
    if (!t.alive || t.boss && false) return;
    t.poison = Math.min(t.poison + stacks, 999); t.poisonT = 5;
  };
  P._chain = function (src, from, n) {
    let cur = from; const hit = new Set([from.id]);
    for (let i = 0; i < n; i++) {
      let best = null, bd = 110;
      for (const o of this.u) if (o.alive && o.side !== src.side && o.targetable && !hit.has(o.id)) { const d = dist(cur, o); if (d < bd) { bd = d; best = o; } }
      if (!best) break;
      hit.add(best.id);
      this.fx.push({ t: 'line', x1: cur.x, y1: cur.y, x2: best.x, y2: best.y, col: '#b9a0ff', ttl: 0.18 });
      this.damage(best, n * (src.k || 1), null); cur = best;
    }
  };
  P.aoe = function (x, y, r, dmg, side, src, opts) {
    opts = opts || {};
    r *= Math.pow(1.3, G.dc(this.S, 'gunpowder'));
    this.fx.push({ t: 'boom', x, y, r, col: opts.col || '#ffb040', ttl: 0.3 });
    const list = this.u.slice();
    for (const o of list) {
      if (!o.alive || o.side === side) continue;
      if (!o.targetable && !opts.all) continue;
      if (Math.hypot(o.x - x, o.y - y) <= r + 6 * o.size) this.damage(o, dmg, src, opts);
    }
  };

  P.kill = function (t, killer) {
    if (!t.alive) return;
    t.alive = false; t.hp = 0;
    const S = this.S;
    if (t.kind !== 'wall') this.fx.push({ t: 'puff', x: t.x, y: t.y, col: t.side === 0 ? '#9cf' : '#f99', ttl: 0.35 });
    if (t.side === 0) {
      if (t.kind === 'wall') return;
      if (t.summon) return;
      this.deaths += t.k || 1; G.onAllyDeath(S, t.k || 1);
      if (t.ench && t.ench.carnage) this.aoe(t.x, t.y, 50, t.maxhp * 0.1 * t.ench.carnage, 0, null, { noProc: true, col: '#ff4040' });
      if (t.beh === 'bomber') this.aoe(t.x, t.y, t.aoe || 60, t.dmg, 0, t, { col: '#ff8a30' });
      if (t.beh === 'scapegoat') this.gain(3 * t.plot.level * (t.k || 1));
      // 墓園：相鄰單位陣亡 → 召喚小鬼
      if (t.plot) for (const tw of this.tw) if (tw.beh === 'cemetery' && G.adjacent(S, tw.plot).includes(t.plot)) this._cemetery(tw, t);
    } else {
      this.kills += t.k || 1; S.stats.kills += t.k || 1;
      if (t.beh === 'bomber') this.aoe(t.x, t.y, t.aoe || 60, t.dmg, 1, t, { col: '#ff8a30' });
      if (killer && killer.side === 0) {
        const mt = killer.ench && killer.ench.midas_touch;
        if (mt) { const n = Math.round(t.k || 1); let g = 0; for (let i = 0; i < Math.min(n, 60); i++) if (this.rng.next() < 0.02 * mt) g++; if (g) this.gain(g * Math.max(1, Math.floor(n / 60))); }
        if (killer.ench && killer.ench.combustion) this.aoe(t.x, t.y, 40, killer.dmgBase * 0.2 * killer.ench.combustion, 0, null, { noProc: true, col: '#ff6020' });
        if (G.dc(S, 'embalming') && this.rng.chance(0.1)) this._revive(t);
      }
      if (t.golden && killer && killer.palace) this.gain(3 + Math.floor(S.year / 10));
    }
  };
  P._cemetery = function (tw, dead) {
    const st = tw.st, S = this.S, mul = Math.pow(1.5, G.dc(S, 'war_horns'));
    this.mk({ side: 0, kind: 'unit', card: 'imp', x: dead.x, y: dead.y, hp: st.hp * mul, dmg: st.dmg * mul, hps: st.hps, spd: 2 * SPD, size: 0.8, spr: 'imp', col: NK.KINGS.blood.color, ench: dead.ench, crit: 5, critMul: 2, summon: true, k: 1 });
  };
  P._revive = function (t) {
    this.mk({ side: 0, kind: 'unit', card: t.card, x: t.x, y: t.y, hp: t.maxhp * 0.5, dmg: t.dmg, hps: t.hps, spd: t.spd, atk: t.atk, range: t.range, size: t.size, spr: t.spr, col: '#9fd', summon: true, k: t.k });
  };

  /* ───── 目標選擇 ───── */
  P._enemiesOf = function (side) { return this.u.filter(o => o.alive && o.side !== side && o.targetable); };
  P._nearest = function (u, list) {
    let b = null, bd = 1e9;
    for (const o of list) { const d = Math.hypot(o.x - u.x, o.y - u.y); if (d < bd) { bd = d; b = o; } }
    return b;
  };
  P._pick = function (u) {
    const foes = this._enemiesOf(u.side);
    if (!foes.length) return null;
    if (u.beh === 'farthest') { let b = null, bx = -1e9; for (const o of foes) { const s = u.side === 0 ? o.x : -o.x; if (s > bx) { bx = s; b = o; } } return b; }
    if (u.beh === 'lowest') { const inR = foes.filter(o => Math.hypot(o.x - u.x, o.y - u.y) <= u.range + 30); const l = inR.length ? inR : foes; let b = null, bh = 1e18; for (const o of l) if (o.hp < bh) { bh = o.hp; b = o; } return b; }
    return this._nearest(u, foes);
  };

  /* ───── 主迴圈 ───── */
  P.step = function (dt) {
    if (this.done) return;
    this.t += dt;
    if (this.aimT > 0) { this.aimT -= dt; if (this.aimT <= 0) this.aim = null; }
    if (this.t > 110 && !this.overtime) { this.overtime = true; }
    // 分離
    const cell = 18, hash = new Map();
    for (const o of this.u) if (o.alive && !o.immobile) { const key = (Math.floor(o.x / cell)) * 1000 + Math.floor(o.y / cell); let a = hash.get(key); if (!a) hash.set(key, a = []); a.push(o); }
    for (const u of this.u) if (u.alive) this._unit(u, dt, hash, cell);
    this._base(dt); this._towers(dt); this._zones(dt); this._traps();
    this.u = this.u.filter(u => u.alive);
    this.fx = this.fx.filter(f => (f.ttl -= dt) > 0);
    // 勝負
    let foes = 0; for (const u of this.u) if (u.alive && u.side === 1) foes++;
    if (!foes) { this.done = true; this.win = true; this._finish(); }
    else if (this.baseHit) { this.done = true; this.win = false; this._finish(); }
  };

  P._unit = function (u, dt, hash, cell) {
    u.t += dt;
    // 狀態
    if (u.poisonT > 0) { u.poisonT -= dt; const d = u.poison * dt; u.hp -= d; if (u.hp <= 0) { this.kill(u, null); return; } if (u.poisonT <= 0) u.poison = 0; }
    if (u.slowT > 0) { u.slowT -= dt; if (u.slowT <= 0) u.slow = 0; }
    if (u.root > 0) { u.root -= dt; }
    if (u.kind === 'wall' || u.noAtk && u.immobile) return;
    const rooted = u.root > 0;
    const spdMul = (1 - u.slow) * (this.overtime && u.side === 1 ? 1.6 : 1);

    // 小兵特殊
    if (u.beh === 'jump' && !u.jumped && u.t >= u.jumpAt) {
      const foes = this._enemiesOf(u.side);
      if (foes.length) { let b = foes[0]; for (const o of foes) if ((u.side === 0 ? o.x > b.x : o.x < b.x)) b = o; u.x = b.x + (u.side === 0 ? 14 : -14); u.y = b.y + (this.rng.next() - .5) * 20; }
      u.jumped = true;
    }
    if (u.beh === 'scapegoat' && u.side === 0) { // 在後排晃
      if (!u.home) u.home = { x: u.x, y: u.y };
      if (!u.wt || u.wt < u.t) { u.wt = u.t + 2 + this.rng.next() * 2; u.wx = u.home.x + (this.rng.next() - .5) * 120; u.wy = u.home.y + (this.rng.next() - .5) * 120; }
      this._move(u, u.wx, u.wy, dt * spdMul * 0.5); return;
    }
    if (u.flying && u === this.ship) return this._ship(u, dt);

    // 索敵
    u.retarget -= dt;
    if (!u.tgt || !u.tgt.alive || u.retarget <= 0 || (u.beh === 'lowest')) { u.tgt = this._pick(u); u.retarget = 0.25 + this.rng.next() * 0.2; }
    const t = u.tgt;
    if (!t) { // 沒目標：敵人往基地走
      if (u.side === 1) { if (!rooted) this._move(u, this.baseXY.x, this.baseXY.y, dt * spdMul); if (u.x <= this.baseXY.x + 46) this.baseHit = true; }
      else if (u.summon || u.flame) { /* 待命 */ }
      return;
    }
    if (u.side === 1 && this._baseNear(u)) { this.baseHit = true; }
    const d = Math.hypot(t.x - u.x, t.y - u.y);
    const reach = u.atk === 'ranged' ? u.range : (u.range + 6 * (t.size || 1));
    u.cd -= dt * u.hps * (1 - u.slow);
    // 移動
    if (!rooted && d > reach * (u.atk === 'ranged' ? 0.92 : 0.9)) {
      this._move(u, t.x, t.y, dt * spdMul);
      if (u.beh === 'trapper' && u.side === 0 && u.traps > 0 && u.cd <= 0) { this.traps.push({ x: u.x, y: u.y, dmg: u.dmg * 3 * Math.pow(2, G.dc(this.S, 'dynamites')), r: 34, plot: u.plot, mine: true }); u.traps--; u.cd = 1; }
    } else if (!rooted) {
      // 近戰貼身時輕微繞動避免疊在一起
      this._sep(u, hash, cell, dt);
    }
    if (rooted || u.noAtk) return;
    if (d <= reach && u.cd <= 0) { this._attack(u, t); u.cd = 1; }
    // 炸彈兵接觸自爆
    if (u.beh === 'bomber' && d <= 16) { u.hp = 0; this.kill(u, null); }
  };

  P._baseNear = function (u) { return u.x <= this.baseXY.x + 46 && Math.abs(u.y - this.baseXY.y) < 200; };

  P._move = function (u, x, y, dt) {
    const dx = x - u.x, dy = y - u.y, d = Math.hypot(dx, dy) || 1, s = Math.min(d, u.spd * dt);
    u.x += dx / d * s; u.y += dy / d * s; u.fx = dx >= 0 ? 1 : -1;
    u.y = clamp(u.y, FTOP - 20, FBOT + 10); u.x = clamp(u.x, 10, W + 200);
  };
  P._sep = function (u, hash, cell, dt) {
    const cx = Math.floor(u.x / cell), cy = Math.floor(u.y / cell);
    let px = 0, py = 0, n = 0;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const a = hash.get((cx + i) * 1000 + cy + j); if (!a) continue;
      for (const o of a) { if (o === u) continue; const dx = u.x - o.x, dy = u.y - o.y, dd = dx * dx + dy * dy; if (dd < 64 && dd > 0.01) { const l = Math.sqrt(dd); px += dx / l; py += dy / l; n++; } }
    }
    if (n) { u.x += px / n * 40 * dt; u.y += py / n * 40 * dt; }
  };

  /* ── 攻擊 ── */
  P._attack = function (u, t) {
    const S = this.S, side = u.side;
    if (u.beh === 'shaman') { const add = u.dmgBase * 0.04; this.buf.shamanDmg += add; for (const a of this.u) if (a.alive && a.side === side && !a.noAtk) a.dmg += add * a.k; this.fx.push({ t: 'text', x: u.x, y: u.y - 12, s: '✦', ttl: .6 }); }
    if (u.beh === 'warlord') {
      const ally = this.u.filter(a => a.alive && a.side === side && a !== u && !a.noAtk);
      if (ally.length) { const c = this.rng.pick(ally); this.fx.push({ t: 'line', x1: u.x, y1: u.y, x2: c.x, y2: c.y, col: '#ffd060', ttl: .25 });
        for (const a of ally) if (Math.hypot(a.x - c.x, a.y - c.y) < 110 && (a.banners || 0) < 6) { a.banners = (a.banners || 0) + 1; a.dmg += u.dmgBase * 0.15 * a.k; a.maxhp += u.maxhp * 0.1; a.hp += u.maxhp * 0.1; } }
    }
    if (u.beh === 'pierce') { // 貫穿箭
      const ang = Math.atan2(t.y - u.y, t.x - u.x);
      this.fx.push({ t: 'line', x1: u.x, y1: u.y, x2: u.x + Math.cos(ang) * 900, y2: u.y + Math.sin(ang) * 900, col: '#ffe9a0', ttl: .2 });
      for (const o of this.u) if (o.alive && o.side !== side && o.targetable) {
        const dx = o.x - u.x, dy = o.y - u.y, proj = dx * Math.cos(ang) + dy * Math.sin(ang), perp = Math.abs(-dx * Math.sin(ang) + dy * Math.cos(ang));
        if (proj > 0 && perp < 12 * o.size + 6) this.damage(o, u.dmg, u);
      }
      return;
    }
    const shots = u.multi || 1;
    for (let s = 0; s < shots; s++) {
      let tt = t;
      if (s > 0) { const o = this._enemiesOf(side).filter(x => Math.hypot(x.x - u.x, x.y - u.y) <= u.range); if (o.length) tt = this.rng.pick(o); }
      if (u.atk === 'ranged') this.fx.push({ t: 'line', x1: u.x, y1: u.y, x2: tt.x, y2: tt.y, col: side === 0 ? '#f4e6a8' : '#f0a090', ttl: .12 });
      if (u.aoe && u.beh !== 'bomber') this.aoe(tt.x, tt.y, u.aoe, u.dmg, side, u, { col: '#9a6aff' });
      else this.damage(tt, u.dmg, u);
    }
  };

  /* ── 母艦 ── */
  P._ship = function (u, dt) {
    const st = this.base.st; u.cd -= dt * u.hps;
    let tx, ty;
    if (this.aim) { tx = this.aim.x; ty = this.aim.y; }
    else { const t = this._pick(u); if (t) { tx = t.x - 130; ty = t.y; } else { tx = this.baseXY.x + 40; ty = this.baseXY.y; } }
    const d = Math.hypot(tx - u.x, ty - u.y); if (d > 10) this._move(u, tx, ty, dt);
    const foes = this._enemiesOf(0); const t = this._nearest(u, foes);
    if (t && u.cd <= 0 && Math.hypot(t.x - u.x, t.y - u.y) <= u.range) { u.cd = 1; this.fx.push({ t: 'line', x1: u.x, y1: u.y, x2: t.x, y2: t.y, col: '#6ff', ttl: .15 }); this.aoe(t.x, t.y, 30, u.dmg, 0, u, { col: '#6ff' }); }
  };

  /* ── 基地 ── */
  P._aimPoint = function (radius) {
    if (this.aim) return this.aim;
    const foes = this._enemiesOf(0); if (!foes.length) return null;
    let best = null, bc = -1; const sample = foes.length > 40 ? this.rng.shuffle(foes).slice(0, 40) : foes;
    for (const f of sample) { let c = 0; for (const o of foes) if (Math.hypot(o.x - f.x, o.y - f.y) < radius) c++; c += (1 - f.x / W) * 0.5; if (c > bc) { bc = c; best = f; } }
    return best;
  };
  P._base = function (dt) {
    const B = this.base; if (!B) return; const S = this.S, st = B.st, beh = B.beh;
    if (beh === 'pagoda' || beh === 'mothership') return;
    if (beh === 'stronghold') {
      B.timer -= dt;
      if (B.timer <= 0) { B.timer = 4 / Math.pow(2, G.dc(S, 'towerdome')); const lay = this.lay;
        this.tw.push({ plot: B.plot, cd: null, st: { dmg: st.dmg, hps: st.hps, crit: 0, critMul: st.critMul }, x: lay.left + this.rng.next() * (lay.right - lay.left), y: lay.top + this.rng.next() * (lay.bottom - lay.top), beh: 'arrows', range: 340, cd0: 0, poisonOn: 0, arrows: B.plot.level, summoned: true }); }
      return;
    }
    let hps = st.hps * (beh === 'citadel' ? Math.pow(2, G.dc(S, 'static_fields')) : 1);
    B.cd0 -= dt * hps; if (B.cd0 > 0) return;
    if (beh === 'castle') {
      const a = this._aimPoint(70); if (!a) { B.cd0 = 0; return; }
      B.cd0 = 1; const r = (B.cd.base.radius || 70);
      this.fx.push({ t: 'line', x1: B.x, y1: B.y, x2: a.x, y2: a.y, col: '#d8d0c0', ttl: .3, thick: 3 });
      this.aoe(a.x, a.y, r, st.dmg, 0, { crit: st.crit, critMul: st.critMul, side: 0, alive: true, ench: {}, poisonOn: 0, k: 1 }, { col: '#c8b090' });
      if (G.dc(S, 'fireball')) this.zones.push({ x: a.x, y: a.y, r: r * 0.7, ttl: 4, tick: 0, kind: 'fire', dmg: st.dmg * 0.25, side: 0 });
    } else if (beh === 'citadel') {
      const a = this._aimPoint(50); if (!a) { B.cd0 = 0; return; }
      B.cd0 = 1; let cur = a; const hit = new Set();
      this.fx.push({ t: 'line', x1: B.x, y1: B.y, x2: a.x, y2: a.y, col: '#c8b8ff', ttl: .2, thick: 3 });
      this.aoe(a.x, a.y, 40, st.dmg, 0, { crit: st.crit, critMul: st.critMul, side: 0, alive: true, ench: {}, poisonOn: 0, k: 1 }, { col: '#c8b8ff' });
      let dmg = st.dmg;
      for (let i = 0; i < B.plot.level; i++) {
        let bst = null, bd = 130; for (const o of this.u) if (o.alive && o.side === 1 && o.targetable && !hit.has(o.id) && o !== a) { const d = dist(cur, o); if (d < bd) { bd = d; bst = o; } }
        if (!bst) break; hit.add(bst.id); dmg *= 0.6;
        this.fx.push({ t: 'line', x1: cur.x, y1: cur.y, x2: bst.x, y2: bst.y, col: '#b9a0ff', ttl: .2 }); this.damage(bst, dmg, null); cur = bst;
      }
    } else if (beh === 'palace') {
      const foes = this._enemiesOf(0).filter(o => !o.boss); if (!foes.length) { B.cd0 = 0; return; }
      B.cd0 = 1; let t = foes[0]; for (const o of foes) if (o.hp > t.hp || (o.golden && !t.golden)) t = o;
      this.fx.push({ t: 'line', x1: B.x, y1: B.y, x2: t.x, y2: t.y, col: '#ffe36a', ttl: .3, thick: 4 });
      this.damage(t, 99999, { palace: true, alive: true, crit: 0, critMul: 1, ench: {}, side: 0, k: 1 }, { noCrit: true });
      if (t.alive) this.kill(t, { palace: true, side: 0, ench: {} });
    } else if (beh === 'treant') {
      B.cd0 = 1; const foes = this._enemiesOf(0), allies = this.u.filter(o => o.alive && o.side === 0 && !o.summon && o.kind === 'unit');
      let c = allies.length ? this.rng.pick(allies) : { x: this.lay.right + 60, y: (FTOP + FBOT) / 2 };
      if (this.aim) c = this.aim;
      this.zones.push({ x: c.x, y: c.y, r: B.cd.base.radius, ttl: 1e9, tick: 0, kind: 'grove', dmg: st.dmg, heal: st.dmg * (B.cd.base.heal || 1) * Math.pow(2, G.dc(S, 'revitalize')), hurt: G.dc(S, 'nettle') > 0, side: 0 });
    }
  };

  /* ── 塔 ── */
  P._towers = function (dt) {
    const S = this.S;
    for (const tw of this.tw) {
      const st = tw.st, beh = tw.beh; if (beh === 'cemetery') continue;
      if (beh === 'mycelium') { tw.spawnT -= dt; if (tw.spawnT <= 0) { tw.spawnT = 9 / (1 + G.dc(S, 'overwork')); this._spore(tw, 1); tw.plot.x.spores = (tw.plot.x.spores || 0) + 1; } continue; }
      if (beh === 'converter') { /* 下面統一處理 */ }
      tw.cd0 -= dt * st.hps;
      if (tw.cd0 > 0) continue;
      const foes = this.u.filter(o => o.alive && o.side === 1 && o.targetable && Math.hypot(o.x - tw.x, o.y - tw.y) <= tw.range);
      if (beh === 'heal') {
        const allies = this.u.filter(o => o.alive && o.side === 0 && o.hp < o.maxhp && (o.kind === 'unit' || o.kind === 'wall') && !o.summon);
        if (!allies.length) { tw.cd0 = 0; continue; }
        tw.cd0 = 1; allies.sort((a, b) => a.hp / a.maxhp - b.hp / b.maxhp);
        const rays = Math.pow(2, G.dc(S, 'spiremania'));
        for (let i = 0; i < Math.min(rays, allies.length); i++) { const a = allies[i]; this.heal(a, st.dmg * (a.k || 1) * Math.pow(2, G.dc(S, 'revitalize'))); this.fx.push({ t: 'line', x1: tw.x, y1: tw.y, x2: a.x, y2: a.y, col: '#7dffb0', ttl: .2 }); }
        continue;
      }
      if (!foes.length) { tw.cd0 = 0; continue; }
      tw.cd0 = 1;
      const near = (n) => foes.slice().sort((a, b) => dist(tw, a) - dist(tw, b)).slice(0, n);
      const shoot = (t, dmg, col, r) => { this.fx.push({ t: 'line', x1: tw.x, y1: tw.y, x2: t.x, y2: t.y, col: col || '#fff2b0', ttl: .15 }); if (r) this.aoe(t.x, t.y, r, dmg, 0, this._tsrc(tw), { col }); else this.damage(t, dmg, this._tsrc(tw)); };
      switch (beh) {
        case 'arrows': { const arrows = tw.summoned ? tw.arrows : (C[tw.plot.card].lv[Math.min(tw.plot.level, 3) - 1][3]); for (let i = 0; i < arrows; i++) shoot(this.rng.pick(foes), st.dmg); break; }
        case 'single': { if (!tw.tgt || !tw.tgt.alive || dist(tw, tw.tgt) > tw.range) tw.tgt = near(1)[0]; shoot(tw.tgt, st.dmg, '#ffe36a'); break; }
        case 'aoe': shoot(near(1)[0], st.dmg, '#ff8a4a', C.mangler.radius); break;
        case 'trebuchet': {
          let cnt = 0; for (const q of G.plots(S)) if ((C[q.card].type === 'tower' || C[q.card].type === 'building') && q !== tw.plot) cnt++;
          const n = Math.max(1, cnt * tw.plot.level);
          for (let i = 0; i < Math.min(n, 60); i++) shoot(this.rng.pick(foes), st.dmg * Math.max(1, n / 60), '#b09070', C.trebuchet.radius); break; }
        case 'roots': {
          const cnt = C.orchard.lv[Math.min(tw.plot.level, 3) - 1][3];
          for (const t of this.rng.shuffle(foes.filter(f => f.root <= 0 && !f.boss)).slice(0, cnt)) { t.root = 4; t.rootDmg = st.dmg; this.fx.push({ t: 'text', x: t.x, y: t.y - 8, s: '🌿', ttl: .8 }); }
          for (const f of foes) if (f.root > 0 && f.rootDmg) this.damage(f, f.rootDmg * (f.k || 1) * 0.5, null); break; }
        case 'converter': {
          const t = near(1).find(o => !o.boss); if (!t) break;
          this.fx.push({ t: 'line', x1: tw.x, y1: tw.y, x2: t.x, y2: t.y, col: '#6cf', ttl: .2 });
          t.alive = false; this.kills += t.k || 1;
          const bomb = G.dc(S, 'frankensteinian');
          const rr = bomb ? C.bomber.lv[Math.min(tw.plot.level, 3) - 1] : null;
          this.mk({ side: 0, kind: 'unit', card: 'lab_rat', x: t.x, y: t.y, hp: rr ? rr[0] : st.hp, dmg: rr ? rr[1] : st.dmg, hps: rr ? rr[2] : st.hps, spd: 1.6 * SPD, size: 0.8, spr: bomb ? 'bomb' : 'rat', col: '#6cf', summon: true, k: 1, beh: bomb ? 'bomber' : null, aoe: bomb ? 60 : 0 }); break; }
        case 'dragon': { const n = 1 + G.dc(S, 'cryoflame'); for (let i = 0; i < n; i++) { const t = foes.slice().sort((a, b) => b.hp - a.hp)[0]; if (t) { this.fx.push({ t: 'text', x: t.x, y: t.y - 12, s: '🔥', ttl: .8 }); this.aoe(t.x, t.y, 60, st.dmg, 0, this._tsrc(tw), { col: '#ff6a3a' }); } } break; }
      }
    }
  };
  P._tsrc = function (tw) { return { side: 0, alive: true, crit: tw.st.crit, critMul: tw.st.critMul, ench: {}, poisonOn: tw.poisonOn || 0, k: 1 }; };

  /* ── 區域（治療區/火）── */
  P._zones = function (dt) {
    for (const z of this.zones) {
      z.ttl -= dt; z.tick -= dt; if (z.tick > 0) continue; z.tick = 1;
      if (z.kind === 'grove') {
        for (const o of this.u) if (o.alive && o.side === 0 && (o.kind === 'unit') && !o.summon && Math.hypot(o.x - z.x, o.y - z.y) <= z.r) this.heal(o, z.heal * (o.k || 1));
        if (z.hurt) for (const o of this.u) if (o.alive && o.side === 1 && o.targetable && Math.hypot(o.x - z.x, o.y - z.y) <= z.r) this.damage(o, z.dmg * (o.k || 1) * 0.5, null);
      } else if (z.kind === 'fire') { for (const o of this.u) if (o.alive && o.side === 1 && o.targetable && Math.hypot(o.x - z.x, o.y - z.y) <= z.r) this.damage(o, z.dmg * (o.k || 1), null); }
    }
    this.zones = this.zones.filter(z => z.ttl > 0);
    // 火焰塔持續燃燒
    for (const u of this.u) if (u.alive && u.flame) {
      u.cd -= 0; }
  };

  P._traps = function () {
    if (!this.traps.length) return;
    for (const tr of this.traps) {
      if (tr.used) continue;
      for (const o of this.u) if (o.alive && o.side === 1 && o.targetable && Math.hypot(o.x - tr.x, o.y - tr.y) < 20) { tr.used = true; this.aoe(tr.x, tr.y, tr.r, tr.dmg, 0, null, { col: '#c0a060', noProc: true }); break; }
    }
    this.traps = this.traps.filter(t => !t.used);
  };

  /* ── 結束 ── */
  P._finish = function () {
    const S = this.S;
    // 剩餘陷阱累積回陷阱師
    const left = this.traps.filter(t => t.plot && !t.used);
    for (const t of left) t.plot.x.traps = (t.plot.x.traps || 0) + 1;
    this.result = { win: this.win, kills: this.kills, deaths: this.deaths, time: this.t, gold: this.goldGained, baseHit: this.baseHit };
  };

  // 火焰塔傷害 tick：在單位迴圈中以近戰 AoE 處理（flame 單位 atk=melee, aoe=40）
  NK.runBattle = function (S, wave, maxT) {
    const b = new Battle(S, wave); let i = 0; const dt = 0.05;
    while (!b.done && i++ < (maxT || 3600)) b.step(dt);
    if (!b.done) { b.done = true; b.win = false; b.baseHit = true; b._finish(); }
    return b;
  };
})(globalThis.NK = globalThis.NK || {});
