/* 9 Kings – 遊戲狀態與王國規則（無 DOM、可在 Node 直接跑） */
(function (NK) {
  'use strict';
  const C = NK.CARDS, K = NK.KINGS, CONST = NK.CONST, G = (NK.G = {});

  /* ───── 亂數（mulberry32，可存檔）───── */
  G.makeRng = function (seed) {
    const r = { s: (seed >>> 0) || 1 };
    r.next = function () {
      let t = (r.s += 0x6D2B79F5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.int = (a, b) => a + Math.floor(r.next() * (b - a + 1));
    r.pick = (arr) => arr[Math.floor(r.next() * arr.length)];
    r.chance = (p) => r.next() < p;
    r.shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r.next() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    return r;
  };

  /* ───── 工具 ───── */
  G.kingCards = (k) => { const ki = K[k]; return ki.base ? [ki.base].concat(ki.cards) : ki.cards.slice(); };
  G.dc = (S, id) => S.decrees[id] || 0;
  const inGrid = (r, c) => r >= 0 && c >= 0 && r < CONST.GRID && c < CONST.GRID;
  const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  G.inGrid = inGrid;

  G.cell = (S, r, c) => (inGrid(r, c) ? S.grid[r][c] : null);
  G.isOpen = (S, r, c) => inGrid(r, c) && S.open[r][c] && !S.razed[r][c];
  G.plots = (S) => { const a = []; for (let r = 0; r < CONST.GRID; r++) for (let c = 0; c < CONST.GRID; c++) if (S.grid[r][c]) a.push(S.grid[r][c]); return a; };
  G.adjacent = (S, plot, diag) => {
    const out = [];
    for (const [dr, dc] of (diag ? DIAG : DIRS)) { const p = G.cell(S, plot.r + dr, plot.c + dc); if (p) out.push(p); }
    return out;
  };
  G.adjacentEmpty = (S, plot) => {
    const out = [];
    for (const [dr, dc] of DIRS) { const r = plot.r + dr, c = plot.c + dc; if (G.isOpen(S, r, c) && !S.grid[r][c]) out.push([r, c]); }
    return out;
  };
  G.basePlot = (S) => G.plots(S).find(p => C[p.card].type === 'base' || C[p.card].isTroopBase) || null;
  G.typeOf = (p) => C[p.card].type;
  G.isTroop = (p) => C[p.card].type === 'troop' || !!C[p.card].isTroopBase;
  G.isTower = (p) => C[p.card].type === 'tower';
  G.isBase = (p) => C[p.card].type === 'base';

  /* ───── 新遊戲 ───── */
  G.newRun = function (kingId, diffId, seed) {
    seed = seed || (Math.random() * 4294967296) >>> 0;
    const rng = G.makeRng(seed);
    const grid = [], open = [], razed = [];
    for (let r = 0; r < CONST.GRID; r++) { grid.push(Array(CONST.GRID).fill(null)); open.push(Array(CONST.GRID).fill(false)); razed.push(Array(CONST.GRID).fill(false)); }
    for (let r = 1; r <= 3; r++) for (let c = 1; c <= 3; c++) open[r][c] = true;
    const others = NK.KING_ORDER.filter(k => k !== kingId);
    const S = {
      seed, rng, king: kingId, diff: NK.DIFFICULTIES.find(d => d.id === diffId) || NK.DIFFICULTIES[0],
      year: 1, lives: CONST.LIVES, maxLives: CONST.LIVES, gold: 0,
      grid, open, razed, nextId: 1,
      hand: [], uses: 1, decrees: {}, opponents: rng.shuffle(others).slice(0, 3),
      phase: 'setup', // setup(放基地) → loot → play → battle → ...
      tomesUsed: 0, overhaulUses: 0, plotsDestroyed: 0, rerolls: 0, freeRerolls: 0, merchantBuys: 0,
      pendingCouncil: 0, longtermism: false, wishingWell: false, payrollUsed: false,
      prophecy: null, rainbowYear: rng.int(NK.SCHEDULE.rainbow.from, NK.SCHEDULE.rainbow.to), rainbowDone: false,
      endless: false, stats: { kills: 0, deaths: 0, levels: 0 }, log: [], allyDeaths: 0, insuranceDeaths: 0, done: false, won: false
    };
    G.addCard(S, K[kingId].base, 1);
    return S;
  };

  G.gain = function (S, n) {
    if (n <= 0) return;
    S.gold += n;
    for (const p of G.plots(S)) if (p.card === 'dispenser') p.x.gold = (p.x.gold || 0) + n;
  };

  /* ───── 手牌 ───── */
  G.addCard = function (S, id, n) {
    n = n || 1;
    const h = S.hand.find(x => x.id === id);
    if (h) h.n += n; else S.hand.push({ id, n });
  };
  G.takeCard = function (S, id) {
    const i = S.hand.findIndex(x => x.id === id);
    if (i < 0) return false;
    if (--S.hand[i].n <= 0) S.hand.splice(i, 1);
    return true;
  };
  G.handCount = (S) => S.hand.reduce((a, h) => a + h.n, 0);

  /* ───── 地塊 ───── */
  function newPlot(S, r, c, cardId) {
    return { id: S.nextId++, r, c, card: cardId, level: 1, units: 0, m: { hp: 1, dmg: 1, hps: 1, spd: 1, crit: 0, dmgAdd: 0, hpAdd: 0 }, ench: {}, x: {} };
  }
  G.newPlot = newPlot;

  G.baseCount = function (S, plot) {
    const cd = C[plot.card];
    if (cd.gold15) return 0;
    if (cd.unlimited) return 2 * plot.level;
    if (!cd.lv || !cd.lv[0][5]) return 0;
    return cd.lv[Math.min(plot.level, 3) - 1][5];
  };
  G.addUnits = function (S, plot, n, noChain) {
    if (n <= 0 || C[plot.card].gold15) return;
    const total = n + (noChain ? 0 : G.dc(S, 'populate')); // Populate：每次新增單位時額外 +1
    plot.units += total;
    const cd = C[plot.card];
    if (cd.perUnitDmg) plot.m.dmg += cd.perUnitDmg * total;
    if (!noChain) for (const q of G.adjacent(S, plot)) if (q.card === 'mob' && plot.card !== 'mob') { q.units += 1; }
  };
  G.levelCap = (S, plot) => (C[plot.card].unlimited ? Infinity : (C[plot.card].type === 'base' ? 3 : CONST.MAX_LEVEL) + (S.decrees.__cap || 0));
  G.canLevel = (S, plot) => plot.level < G.levelCap(S, plot) && !plot.x.broken;

  G.levelUp = function (S, plot, passive) {
    if (!G.canLevel(S, plot)) return false;
    const cd = C[plot.card];
    const before = G.baseCount(S, plot);
    plot.level++;
    S.stats.levels++;
    if (cd.type === 'troop' || cd.isTroopBase) {
      const add = G.baseCount(S, plot) - before;
      if (add > 0) G.addUnits(S, plot, add);
    }
    onLevelUp(S, plot, passive);
    return true;
  };
  function onLevelUp(S, plot, passive) {
    // Reinforce：任何地塊升級，所有帶 reinforce 的部隊 +1% 傷害
    for (const p of G.plots(S)) if (p.ench.reinforce) p.m.dmg += 0.01 * p.ench.reinforce;
    // 實驗鼠：相鄰地塊升級時同步升級（被動升級不再連鎖）
    if (!passive) for (const q of G.adjacent(S, plot)) if (q.card === 'lab_rat') G.levelUp(S, q, true);
    // 萬能機：升到 3 級時所有地塊升級
    if (plot.card === 'concabulator' && plot.level >= 3 && !plot.x.broken) {
      plot.x.broken = true;
      for (const p of G.plots(S)) if (p !== plot) G.levelUp(S, p, true);
    }
  }

  G.destroyPlot = function (S, plot, forever) {
    S.grid[plot.r][plot.c] = null;
    S.plotsDestroyed++;
    if (forever) S.razed[plot.r][plot.c] = true;
  };
  G.destroyTimes = (S) => 1 + G.dc(S, 'pillage');

  G.buff = function (plot, kind, mul) { // 乘法加成（聖騎士傷害同步生命）
    if (kind === 'all') { plot.m.hp *= mul; plot.m.dmg *= mul; plot.m.hps *= mul; return; }
    plot.m[kind] *= mul;
    if (kind === 'dmg' && C[plot.card].dmgLinksHp) plot.m.hp *= mul;
  };
  G.buffAdd = function (plot, kind, add) { // 百分比加成（+2% 之類）
    plot.m[kind] += add;
    if (kind === 'dmg' && C[plot.card].dmgLinksHp) plot.m.hp += add;
  };

  /* ───── 單位屬性 ───── */
  G.unitStats = function (S, plot) {
    const cd = C[plot.card], lv = plot.level, L = Math.min(lv, 3) - 1;
    let hp = 0, dmg = 0, hps = 0, spd = 1, crit = 0, count = plot.units;
    if (cd.type === 'troop' || cd.isTroopBase) {
      const row = cd.lv[L];
      [hp, dmg, hps, spd, crit] = row;
      if (cd.unlimited && lv > 3) { const g = Math.pow(cd.ratGrow, lv - 3); hp = row[0] * g; dmg = row[1] * g; }
    } else if (cd.type === 'tower') {
      const row = cd.lv[L];
      dmg = row[0]; hps = row[1]; crit = row[2];
      if (cd.beh === 'cemetery') { hp = row[3]; }
      if (cd.beh === 'altar') { hp = row[3]; }
      if (cd.beh === 'converter') { hp = row[3]; }
      if (cd.beh === 'roots') { count = row[3]; }
      if (cd.beh === 'arrows') { count = row[3]; }
    } else if (cd.type === 'base') {
      const b = cd.base, g = lv - 1;
      dmg = b.dmg * Math.pow(b.dmgMul, g); hps = b.hps * Math.pow(b.hpsMul, g); crit = b.crit || 0;
      if (b.hp) hp = b.hp * Math.pow(b.hpMul, g);
    }
    hp = hp * plot.m.hp + plot.m.hpAdd;
    dmg = dmg * plot.m.dmg + plot.m.dmgAdd;
    hps = hps * plot.m.hps;
    spd = spd * plot.m.spd;
    crit += plot.m.crit;
    // 全域（詔令）
    const isT = G.isTroop(plot), isTw = cd.type === 'tower', isB = cd.type === 'base';
    dmg *= Math.pow(1.3, G.dc(S, 'sharp_blades'));
    if (isT) {
      hp *= Math.pow(2, G.dc(S, 'feast'));
      spd *= Math.pow(2, G.dc(S, 'leatherworks'));
      if (plot.level === 1 && G.dc(S, 'freshmen')) { hp *= 2; dmg *= 2; hps *= 2; }
      if (plot.card === 'wizard' && G.dc(S, 'glass_staffs')) { dmg = 100; hp = 1; }
    }
    if (isTw) { hps *= Math.pow(1.5, G.dc(S, 'bunker')); dmg *= Math.pow(2, G.dc(S, 'engineering')); }
    if (plot.card === 'dragons_den') dmg *= Math.pow(1.2, S.plotsDestroyed);
    if (plot.card === 'demons_altar') { const b = 1 + (plot.x.altar || 0) * 0.005, cv = Math.pow(2, G.dc(S, 'covenant')); hp *= b * cv; dmg *= b * cv; hps *= b; }
    if (isT || isTw || isB) crit += 20 * G.dc(S, 'eyeglass');
    if (plot.card === 'mercenary') count = Math.min(500, Math.floor(S.gold / 15));
    if (plot.card === 'thief' && G.dc(S, 'scimitars')) crit = 100;
    if (plot.card === 'dispenser') hps *= 1 + (plot.x.gold || 0) / 100;
    return { hp, dmg, hps, spd, crit, count, critMul: 2 * Math.pow(2, G.dc(S, 'iron_fist')) };
  };

  /* ───── 出牌規則 ───── */
  G.targetKind = function (cardId) {
    const cd = C[cardId];
    if (cd.type === 'tome') return cd.target || 'plot';
    if (cd.type === 'ench') return 'enchable';
    return 'place';
  };
  // 回傳此卡可指定的格子 [[r,c],...]；'none' 時回傳 null
  G.validTargets = function (S, cardId) {
    const cd = C[cardId], out = [];
    if (cd.type === 'tome' && cd.target === 'none') return null;
    const need = G.targetKind(cardId);
    for (let r = 0; r < CONST.GRID; r++) for (let c = 0; c < CONST.GRID; c++) {
      if (!G.isOpen(S, r, c)) continue;
      const p = S.grid[r][c];
      if (G.canTarget(S, cardId, r, c)) out.push([r, c]);
    }
    return out;
  };
  G.canTarget = function (S, cardId, r, c) {
    const cd = C[cardId];
    if (!G.isOpen(S, r, c)) return false;
    const p = S.grid[r][c];
    if (S.phase === 'setup') return cd.type === 'base' && !p;
    if (cd.type === 'troop' || cd.type === 'building' || cd.type === 'tower' || cd.type === 'base') {
      if (!p) return cd.type !== 'base' || !G.basePlot(S);
      return p.card === cardId && G.canLevel(S, p);
    }
    if (cd.type === 'ench') return !!p && G.isTroop(p);
    // tome
    if (cd.junk) return false;
    if (!p) return false;
    switch (cardId) {
      case 'wildcard': return G.canLevel(S, p);
      case 'offering': case 'mortgage': case 'sacrifice': case 'overhaul': case 'razing': return !G.isBase(p) && !C[p.card].isTroopBase;
      case 'over_invest': return (G.isTroop(p) || G.isTower(p)) && S.gold >= 30;
      case 'clone': return !G.isBase(p) && !C[p.card].isTroopBase;
      case 'procreate': return G.isTroop(p) && !C[p.card].gold15;
      case 'earthworks': return !G.isBase(p) && !C[p.card].isTroopBase;
      case 'migration': return G.adjacentEmpty(S, p).length > 0 && !G.isBase(p);
      case 'swords': case 'shields': return G.isTroop(p) || G.isTower(p) || G.isBase(p);
      case 'unify': return G.isTroop(p) && G.adjacent(S, p).some(q => G.isTroop(q));
      case 'haste': return G.isTroop(p);
      case 'echoform': return !G.isBase(p) && !C[p.card].isTroopBase && G.adjacentEmpty(S, p).length > 0;
      case 'gigantify': return G.isTroop(p);
      case 'xray': return true;
      default: return true;
    }
  };

  function campTrigger(S) {
    for (const cp of G.plots(S)) if (cp.card === 'camp' && !cp.x.broken) {
      for (const q of G.adjacent(S, cp)) { G.buffAdd(q, 'dmg', 0.02 * cp.level); q.m.hp += 0.02 * cp.level; q.m.hps += 0.02 * cp.level; }
    }
  }

  // 出牌。回傳 { ok, msg, endYear }
  G.play = function (S, cardId, r, c) {
    const cd = C[cardId];
    if (!S.hand.some(h => h.id === cardId)) return { ok: false, msg: 'no card' };
    if (cd.type === 'tome' && cd.target === 'none') { /* Patronage 直接打出 */ }
    else if (!G.canTarget(S, cardId, r, c)) return { ok: false, msg: 'invalid target' };
    const p = (r != null) ? S.grid[r][c] : null;
    let refund = !!cd.refund;
    G.takeCard(S, cardId);
    if (cd.type === 'tome') { S.tomesUsed++; for (const w of G.plots(S)) if (w.card === 'warlock') w.m.hp += (C.warlock.tomeHp || 0.05); }

    if (cd.type === 'troop' || cd.type === 'building' || cd.type === 'tower' || cd.type === 'base') {
      if (p) G.levelUp(S, p);
      else {
        const np = newPlot(S, r, c, cardId);
        S.grid[r][c] = np;
        np.units = cd.gold15 ? 0 : G.baseCount(S, np);
        const st = G.dc(S, 'settlement');
        if (st && (cd.type === 'troop' || cd.type === 'tower')) G.buff(np, 'all', Math.pow(2, st));
        if (S.phase !== 'setup') campTrigger(S);
        if (cd.type === 'troop' || cd.isTroopBase) for (const q of G.adjacent(S, np)) if (q.card === 'mob' && cardId !== 'mob') q.units += Math.min(1, np.units);
        applyStartDecrees(S, np);
      }
    } else if (cd.type === 'ench') {
      p.ench[cardId] = (p.ench[cardId] || 0) + 1;
      if (p.card === 'wizard') G.buff(p, 'dmg', 1 + C.wizard.enchDmg);
    } else {
      tome(S, cardId, p, r, c);
    }
    if (!refund && S.phase !== 'setup') S.uses--;
    return { ok: true, endYear: S.uses <= 0 };
  };

  function applyStartDecrees(S, np) {
    // 詔令：Armory 等對「新地塊」的追加
    const st = G.dc(S, 'armory');
    if (st && G.isTroop(np)) np.ench.steel_coat = (np.ench.steel_coat || 0) + 3 * st;
    const bg = G.dc(S, 'burglary');
    if (bg && G.isTroop(np)) np.ench.midas_touch = (np.ench.midas_touch || 0) + 2 * bg;
  }

  const allTomes = () => Object.values(C).filter(c => c.type === 'tome' && c.king !== 'rainbow' && !c.junk).map(c => c.id);

  function tome(S, id, p, r, c) {
    const times = () => G.destroyTimes(S);
    switch (id) {
      case 'wildcard': G.levelUp(S, p); break;
      case 'offering': G.destroyPlot(S, p); for (let i = 0; i < 3 * times(); i++) G.addCard(S, S.rng.pick(allTomes()), 1); break;
      case 'mortgage': { const lv = p.level; G.destroyPlot(S, p); G.gain(S, 30 * lv * times()); break; }
      case 'over_invest': S.gold -= 30; G.buff(p, 'all', 1.15); break;
      case 'sacrifice': { const adj = G.adjacent(S, p); G.destroyPlot(S, p); for (let i = 0; i < times(); i++) for (const q of adj) if (S.grid[q.r][q.c] === q) G.levelUp(S, q); break; }
      case 'clone': G.addCard(S, p.card, 1); break;
      case 'procreate': G.addUnits(S, p, 9); break;
      case 'earthworks': {
        for (const [dr, dc] of DIRS) { const rr = p.r + dr, cc = p.c + dc; if (inGrid(rr, cc) && !S.razed[rr][cc]) S.open[rr][cc] = true; }
        const n = Math.min(3, p.level); G.destroyPlot(S, p); S.plotsDestroyed--; G.addCard(S, p.card, n); break;
      }
      case 'overhaul': {
        G.destroyPlot(S, p);
        const n = 2 + S.overhaulUses; S.overhaulUses++;
        for (let t = 0; t < times(); t++) {
          const cands = G.plots(S).filter(q => G.canLevel(S, q));
          for (const q of S.rng.shuffle(cands).slice(0, n)) G.levelUp(S, q);
        }
        break;
      }
      case 'migration': {
        const e = S.rng.pick(G.adjacentEmpty(S, p));
        S.grid[p.r][p.c] = null; p.r = e[0]; p.c = e[1]; S.grid[p.r][p.c] = p;
        G.buff(p, 'dmg', 1.1); p.m.hp *= (C[p.card].dmgLinksHp ? 1 : 1.1);
        campTrigger(S);
        break;
      }
      case 'swords': case 'shields': {
        const k = id === 'swords' ? 'dmg' : 'hp', mul = G.dc(S, 'smithy') ? 2 : 1;
        const cur = G.unitStats(S, p)[k];
        const add = Math.max(5, cur * 0.05) * mul;
        if (k === 'dmg') p.m.dmgAdd += add; else p.m.hpAdd += add;
        break;
      }
      case 'razing': G.destroyPlot(S, p, true); S.pendingCouncil++; break;
      case 'unify': {
        let sum = 0;
        for (const q of G.adjacent(S, p)) if (G.isTroop(q) && !G.isBase(q) && !C[q.card].isTroopBase) { sum += q.units; S.grid[q.r][q.c] = null; }
        G.addUnits(S, p, sum, true); break;
      }
      case 'haste': G.buff(p, 'spd', 3); break;
      case 'echoform': {
        const e = S.rng.pick(G.adjacentEmpty(S, p));
        const cp = JSON.parse(JSON.stringify(p)); cp.id = S.nextId++; cp.r = e[0]; cp.c = e[1];
        S.grid[e[0]][e[1]] = cp; break;
      }
      case 'gigantify': G.buff(p, 'hp', 2); G.buff(p, 'dmg', 2); p.x.big = true; break;
      case 'patronage': { const b = G.basePlot(S); if (b) { for (let i = 0; i < 3; i++) { b.level++; onLevelUp(S, b, true); } } break; }
      case 'xray': for (const q of G.adjacent(S, p, true)) G.levelUp(S, q); break;
    }
  }

  /* ───── 結算年度：建築效果 + 金幣 ───── */
  G.yearEnd = function (S) {
    const ow = 1 + G.dc(S, 'overwork');
    const log = [];
    const troopsAdj = (p) => G.adjacent(S, p).filter(q => G.isTroop(q));
    const workPlots = G.plots(S);
    for (const p of workPlots) {
      if (S.grid[p.r][p.c] !== p) continue;
      const cd = C[p.card];
      if (cd.type !== 'building' && cd.type !== 'troop' && cd.type !== 'tower') continue;
      const n = p.level * ow;
      switch (cd.fx || cd.beh) {
        case 'farm': { const ts = troopsAdj(p).filter(q => !C[q.card].gold15); if (ts.length) for (let i = 0; i < n; i++) G.addUnits(S, S.rng.pick(ts), 1); break; }
        case 'smith': for (const q of G.adjacent(S, p)) if (G.isTroop(q) || G.isTower(q)) G.buffAdd(q, 'dmg', 0.02 * n); break;
        case 'beacon': for (const q of G.adjacent(S, p)) if (G.isTroop(q) || G.isTower(q)) q.m.hps += 0.02 * n; break;
        case 'forest': for (const q of troopsAdj(p)) q.m.hp += 0.02 * n; break;
        case 'quarry': for (const q of G.plots(S)) if (G.isTower(q) || G.isBase(q)) G.buffAdd(q, 'dmg', 0.02 * n); break;
        case 'library': for (let i = 0; i < n; i++) {
          const ts = troopsAdj(p).filter(q => Object.keys(q.ench).length); if (!ts.length) break;
          const t = S.rng.pick(ts); if (S.rng.chance(0.5)) { const k = S.rng.pick(Object.keys(t.ench)); t.ench[k]++; if (t.card === 'wizard') G.buff(t, 'dmg', 1.05); }
        } break;
        case 'vault': G.gain(S, 3 * n); break;
        case 'shrine': for (let i = 0; i < ow; i++) {
          const cost = Math.max(0, 9 - 3 * (p.level - 1));
          const cands = G.plots(S).filter(q => G.canLevel(S, q));
          if (S.gold >= cost && cands.length) { S.gold -= cost; G.levelUp(S, S.rng.pick(cands)); }
        } break;
        case 'temple': for (let i = 0; i < ow; i++) {
          const cands = G.plots(S).filter(q => G.isTroop(q) || G.isBase(q));
          if (!cands.length) break; const q = S.rng.pick(cands);
          const ks = G.isBase(q) ? ['dmg', 'hps'] : ['hp', 'dmg', 'hps', 'spd']; G.buff(q, S.rng.pick(ks), 1.1);
        } break;
        case 'ogre': { const e = G.adjacentEmpty(S, p).length; for (let i = 0; i < ow; i++) if (e) { const f = 1 + 0.1 * e; p.m.hp *= f; p.m.dmg *= f; p.m.hps *= f; p.m.spd *= f; } break; }
        case 'slime': for (let i = 0; i < ow; i++) {
          const es = G.adjacentEmpty(S, p); if (!es.length) break;
          const e = S.rng.pick(es); const cp = JSON.parse(JSON.stringify(p)); cp.id = S.nextId++; cp.r = e[0]; cp.c = e[1]; S.grid[e[0]][e[1]] = cp;
        } break;
        case 'aoe': /* Mangler */ {
          if (p.card !== 'mangler') break;
          for (let i = 0; i < n; i++) {
            const ts = troopsAdj(p).filter(q => q.units > 0 && !C[q.card].gold15 || (C[q.card].gold15 && S.gold >= 15 * p.level + 1));
            if (!ts.length) break; const t = S.rng.pick(ts);
            if (!C[t.card].gold15) { t.units--; if (t.units <= 0) S.grid[t.r][t.c] = null; }
            p.m.dmgAdd += 2; S.allyDeaths++; onAllyDeath(S, 1);
          }
          break;
        }
      }
    }
    G.gain(S, CONST.YEARLY_GOLD);
    return log;
  };

  function onAllyDeath(S, n) {
    for (const p of G.plots(S)) if (p.card === 'demons_altar') p.x.altar = (p.x.altar || 0) + n;
    const ins = G.dc(S, 'insurance');
    if (ins) { S.insuranceDeaths += n; while (S.insuranceDeaths >= 9) { S.insuranceDeaths -= 9; G.gain(S, ins); } }
  }
  G.onAllyDeath = onAllyDeath;

  /* ───── 戰利品 / 重骰 / 商人 / 議會 ───── */
  G.lootPool = (kingId) => G.kingCards(kingId);
  G.lootOptions = function (S, kingId, n) {
    n = n || 3;
    // 每位國王 9 張卡（含基地）。別人的基地不能拿。
    const base = K[kingId].base;
    let pool = G.lootPool(kingId).filter(id => !(id === base && kingId !== S.king));
    if (kingId === 'rainbow') pool = K.rainbow.cards.slice();
    return S.rng.shuffle(pool).slice(0, n);
  };
  G.rerollCost = (S) => (S.freeRerolls > 0 ? 0 : CONST.REROLL_STEP * (S.rerolls + 1));
  G.doReroll = function (S, resetOnLoot) {
    const cost = G.rerollCost(S);
    if (S.freeRerolls > 0) { S.freeRerolls--; return true; }
    if (G.dc(S, 'payroll') && !S.payrollUsed) { S.payrollUsed = true; S.gold += 10; S.rerolls++; return true; }
    if (S.gold < cost) return false;
    S.gold -= cost; S.rerolls++; return true;
  };
  G.merchantPrice = function (S) {
    let p = CONST.MERCHANT_BASE + CONST.MERCHANT_STEP * S.merchantBuys;
    p = Math.floor(p / Math.pow(2, G.dc(S, 'bargain')));
    return p;
  };
  G.merchantOffers = function (S, type) {
    // type: architect(base/building/tower→不含他人基地) sage(ench/tome) warmonger(troop)
    const kinds = { architect: ['building', 'tower'], sage: ['ench', 'tome'], warmonger: ['troop'] }[type];
    const ids = Object.values(C).filter(c => kinds.includes(c.type) && !c.junk && !c.isTroopBase && !(c.king === 'rainbow' && !S.rng.chance(0.25 * (1 + 0.2 * (S.decrees.__lucky || 0)))));
    return S.rng.shuffle(ids).slice(0, 5).map(c => c.id);
  };

  G.councilOptions = function (S) {
    const okay = (d) => G.dc(S, d.id) < d.max && !(d.id === 'rebirth' && S.lives >= S.maxLives) && !(d.id === 'refraction' && !S.hand.length);
    const basic = NK.DECREES.filter(d => d.kind === 'basic' && okay(d));
    const kingD = NK.DECREES.filter(d => d.kind === 'king' && d.king === S.king && okay(d));
    const rain = NK.DECREES.filter(d => d.kind === 'rainbow' && okay(d));
    const out = [];
    const want = S.longtermism ? 5 : 3;
    const pools = [kingD.slice(), basic.slice(), rain.slice()];
    const w = [0.42, 0.5, 0.08];
    let guard = 0;
    while (out.length < want && guard++ < 200) {
      let x = S.rng.next(), i = x < w[0] ? 0 : x < w[0] + w[1] ? 1 : 2;
      if (!pools[i].length) continue;
      const k = S.rng.int(0, pools[i].length - 1); out.push(pools[i].splice(k, 1)[0]);
    }
    return out;
  };
  G.applyDecree = function (S, id) {
    const d = NK.DECREE_BY_ID[id];
    S.decrees[id] = (S.decrees[id] || 0) + 1;
    switch (id) {
      case 'exploration': unlockRandom(S, 3, false); break;
      case 'wilderness': unlockRandom(S, 3, true); break;
      case 'loan': G.gain(S, 99); break;
      case 'outsourcing': S.freeRerolls += 9; break;
      case 'rebirth': S.lives = S.maxLives; break;
      case 'supplies': for (const cid of K[S.king].cards) G.addCard(S, cid, 1); break;
      case 'refraction': { const n = G.handCount(S); S.hand = []; const rc = K.rainbow.cards; for (let i = 0; i < n; i++) G.addCard(S, S.rng.pick(rc), 1); break; }
      case 'development': { let e = 0; for (let r = 0; r < CONST.GRID; r++) for (let c = 0; c < CONST.GRID; c++) if (G.isOpen(S, r, c) && !S.grid[r][c]) e++; G.addCard(S, 'wildcard', e); break; }
      case 'fertility': G.addCard(S, 'procreate', 3); break;
      case 'scopes': G.addCard(S, 'precision', 9); break;
      case 'junkyard': G.addCard(S, 'trash', 9); break;
      case 'gentrify': for (const p of G.plots(S)) G.levelUp(S, p, true); break;
      case 'splicing': for (const p of G.plots(S)) if (p.card === 'lab_rat') { const add = p.level; p.level *= 2; p.units += 2 * add; } break;
      case 'armory': for (const p of G.plots(S)) if (G.isTroop(p)) p.ench.steel_coat = (p.ench.steel_coat || 0) + 3; break;
      case 'burglary': for (const p of G.plots(S)) if (G.isTroop(p)) p.ench.midas_touch = (p.ench.midas_touch || 0) + 2; break;
      case 're_enchant': for (const p of G.plots(S)) if (G.isTroop(p)) for (const k of Object.keys(p.ench)) p.ench[k] *= 2; break;
      case 'transmutation': for (const p of G.plots(S)) if (G.isTroop(p) && !G.isBase(p) && !C[p.card].isTroopBase) { p.card = 'imp'; p.level = 3; p.units = 39; p.m = { hp: 1, dmg: 1, hps: 1, spd: 1, crit: 0, dmgAdd: 0, hpAdd: 0 }; } break;
      case 'longtermism': S.longtermism = true; break;
      case 'wishing_well': S.wishingWell = true; break;
    }
    return d;
  };
  function unlockRandom(S, n, forest) {
    const cands = [];
    for (let r = 0; r < CONST.GRID; r++) for (let c = 0; c < CONST.GRID; c++) {
      if (S.open[r][c] || S.razed[r][c]) continue;
      if ([[-1, 0], [1, 0], [0, -1], [0, 1]].some(([dr, dc]) => inGrid(r + dr, c + dc) && S.open[r + dr][c + dc])) cands.push([r, c]);
    }
    for (const [r, c] of S.rng.shuffle(cands).slice(0, n)) {
      S.open[r][c] = true;
      if (forest) { const p = newPlot(S, r, c, 'forest'); S.grid[r][c] = p; }
    }
  }
  G.expandCandidates = function (S) {
    const cands = [];
    for (let r = 0; r < CONST.GRID; r++) for (let c = 0; c < CONST.GRID; c++) {
      if (S.open[r][c] || S.razed[r][c]) continue;
      if (DIRS.some(([dr, dc]) => inGrid(r + dr, c + dc) && S.open[r + dr][c + dc])) cands.push([r, c]);
    }
    return cands;
  };
  G.unlockPlot = function (S, r, c) { S.open[r][c] = true; };

  /* ───── 先知 / 祝福 ───── */
  G.startProphecy = function (S) {
    const id = S.rng.pick(Object.keys(NK.BLESSINGS)), b = NK.BLESSINGS[id];
    const cells = [];
    for (let r = 1; r <= 3; r++) for (let c = 1; c <= 3; c++) cells.push([r, c]);
    S.prophecy = { id, targets: S.rng.shuffle(cells).slice(0, b.n), year: NK.SCHEDULE.blessing[0] };
    return S.prophecy;
  };
  G.resolveBlessing = function (S) {
    const pr = S.prophecy; if (!pr) return null;
    const res = { id: pr.id, ok: false };
    if (pr.id === 'prosperity') { if (S.gold <= 20) { G.gain(S, S.gold * 8); res.ok = true; } }
    else for (const [r, c] of pr.targets) {
      const p = S.grid[r][c]; if (!p) continue;
      res.ok = true;
      if (pr.id === 'baby_boom' && G.isTroop(p) && !C[p.card].gold15) p.units *= 2;
      if (pr.id === 'illuminism') G.levelUp(S, p);
      if (pr.id === 'peacetime') G.buff(p, 'hp', 2);
      if (pr.id === 'zenith') G.buff(p, 'dmg', 2);
    }
    S.prophecy = null;
    return res;
  };

  /* ───── 年度事件排程 ───── */
  G.eventsForYear = function (S) {
    const y = S.year, sc = NK.SCHEDULE, ev = [];
    if (y === CONST.FINAL_YEAR && !S.endless) ev.push('final');
    if (S.prophecy && y === S.prophecy.year) ev.push('blessing');
    if (sc.prophet.includes(y)) ev.push('prophet');
    if (sc.tower.includes(y) || (y > CONST.FINAL_YEAR)) ev.push('tower');
    if (sc.diplomat.includes(y)) ev.push('diplomat');
    if (sc.council.includes(y)) ev.push('council');
    if (sc.merchant.includes(y)) ev.push('merchant');
    return ev;
  };


  /* ───── 年度流程（UI 與 Bot 共用）─────
   * 順序：戰鬥 → 結算 → year++ → 戰利品 → 事件 → 出牌 → 戰鬥 …… */
  G.startYear = function (S) {
    S.uses = (S.year === CONST.FINAL_YEAR && !S.endless) ? 999 : 1;
    S.rerolls = 0; S.payrollUsed = false;
    S.events = G.eventsForYear(S);
    if (S.pendingCouncil > 0) { S.events.push('council'); S.pendingCouncil--; }
    S.phase = 'events';
  };
  G.nextEvent = function (S) { const e = S.events.shift(); if (!e) S.phase = 'play'; return e || null; };

  G.planBattle = function (S) {
    const kingId = G.pickEnemyKing(S);
    const final = S.year === CONST.FINAL_YEAR && !S.endless;
    S.cur = { king: kingId, final, wave: NK.makeWave(S, kingId, { boss: final || kingId === 'rainbow' && false }) };
    S.phase = 'battle';
    return S.cur;
  };
  G.previewWave = function (S) { if (!S.cur) G.planBattle(S); S.phase = 'play'; return S.cur; };

  // res: { win }
  G.finishBattle = function (S, res) {
    const cur = S.cur; S.cur = null;
    let lootKing = S.king, msg = '';
    if (res.win) {
      lootKing = cur.king;
      if (cur.king === 'rainbow') S.rainbowDone = true;
      if (cur.final) { S.won = true; S.done = true; }
    } else {
      S.lives--;
      if (cur.final) S.lives = 0; // 最終戰失敗＝失去所有生命
      if (S.lives <= 0) { S.done = true; S.won = false; }
    }
    G.yearEnd(S);
    S.lastLootKing = lootKing;
    if (S.done) return { over: true, won: S.won };
    S.year++;
    G.makeLoot(S, lootKing);
    return { over: false };
  };
  G.continueEndless = function (S) { S.done = false; S.endless = true; S.lives = S.maxLives; S.year++; G.makeLoot(S, S.king); };

  G.makeLoot = function (S, kingId) {
    S.phase = 'loot'; S.rerolls = 0; S.payrollUsed = false;
    S.loot = { king: kingId, options: G.lootOptions(S, kingId, 3) };
    if (kingId === 'rainbow') S.loot.options = S.rng.shuffle(NK.KINGS.rainbow.cards).slice(0, 3);
    if (G.dc(S, 'gambling')) { // 賭博：自動拿兩張
      G.addCard(S, S.loot.options[0], 1); G.addCard(S, S.loot.options[1], 1); S.loot = null; G.startYear(S);
    }
    return S.loot;
  };
  G.pickLoot = function (S, id) {
    G.addCard(S, id, 1); S.loot = null;
    if (S.phase === 'setupLoot') { S.phase = 'events'; }
    G.startYear(S);
  };
  G.rerollLoot = function (S) {
    if (!G.doReroll(S)) return false;
    S.loot.options = G.lootOptions(S, S.loot.king, 3);
    if (S.loot.king === 'rainbow') S.loot.options = S.rng.shuffle(NK.KINGS.rainbow.cards).slice(0, 3);
    return true;
  };

  // 丟進坑洞：+9 金、結束回合
  G.pit = function (S, cardId) {
    if (!G.takeCard(S, cardId)) return false;
    let g = CONST.PIT_GOLD * Math.pow(3, G.dc(S, 'salvage'));
    G.gain(S, g);
    if (S.wishingWell) { S.wishingWell = false; G.addCard(S, cardId, 3); }
    const dp = G.dc(S, 'death_pool'); if (dp && cardId !== 'sacrifice') G.addCard(S, 'sacrifice', dp);
    S.uses = 0; return true;
  };
  // 商人購買
  G.buyCard = function (S, id) {
    const price = G.merchantPrice(S);
    if (S.gold < price && !(S.merchantBuys < (S.decrees.__peddler || 0))) return false;
    S.gold -= price; S.merchantBuys++; G.addCard(S, id, 1); S.uses++; return true;
  };
  G.buyExpand = function (S, r, c) { if (S.gold < CONST.EXPAND_COST) return false; S.gold -= CONST.EXPAND_COST; S.open[r][c] = true; return true; };

  /* ───── 存檔 ───── */
  G.serialize = function (S) { const o = Object.assign({}, S); o.rngState = S.rng.s; delete o.rng; return JSON.stringify(o); };
  G.deserialize = function (json) {
    const o = JSON.parse(json); const rng = G.makeRng(1); rng.s = o.rngState; delete o.rngState; o.rng = rng;
    o.diff = NK.DIFFICULTIES.find(d => d.id === o.diff.id) || o.diff; return o;
  };

  /* ───── 選敵 ───── */
  G.pickEnemyKing = function (S) {
    if (S.year === S.rainbowYear && !S.rainbowDone) return 'rainbow';
    if (S.year === CONST.FINAL_YEAR && !S.endless) return S.rng.pick(S.opponents);
    return S.rng.pick(S.opponents);
  };
})(globalThis.NK = globalThis.NK || {});
