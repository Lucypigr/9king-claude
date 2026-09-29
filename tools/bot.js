// 無頭 Bot：用來煙霧測試與粗調平衡。node tools/bot.js [king] [diff] [runs]
const NK = require('./sim.js'); const G = NK.G, C = NK.CARDS;

function chooseLoot(S) {
  const rank = { troop: 5, tower: 4, building: 3, ench: 2, tome: 1, base: 6 };
  const owned = new Set(G.plots(S).map(p => p.card));
  let best = null, bs = -1;
  for (const id of S.loot.options) { const cd = C[id]; let s = (rank[cd.type] || 0) + (owned.has(id) ? 3 : 0) + S.rng.next(); if (s > bs) { bs = s; best = id; } }
  return best;
}
function playTurn(S) {
  // 回傳是否有出牌
  const hand = S.hand.filter(h => C[h.id].type !== 'base' || !G.basePlot(S));
  const order = { troop: 0, tower: 1, building: 2, ench: 3, tome: 4, base: 5 };
  hand.sort((a, b) => order[C[a.id].type] - order[C[b.id].type]);
  for (const h of hand) {
    const cd = C[h.id];
    // 1) 升級同名
    const same = G.plots(S).find(p => p.card === h.id && G.canLevel(S, p));
    if (same && cd.type !== 'tome' && cd.type !== 'ench') { G.play(S, h.id, same.r, same.c); return true; }
    const targets = G.validTargets(S, h.id);
    if (targets === null) { G.play(S, h.id); return true; }
    if (!targets.length) continue;
    let pick = null;
    if (['troop', 'tower', 'building'].includes(cd.type)) {
      // 優先中央
      targets.sort((a, b) => (Math.abs(a[0] - 2) + Math.abs(a[1] - 2)) - (Math.abs(b[0] - 2) + Math.abs(b[1] - 2)));
      pick = targets[0];
    } else if (cd.type === 'ench') { const t = targets.map(([r, c]) => S.grid[r][c]).sort((a, b) => b.units - a.units)[0]; pick = [t.r, t.c]; }
    else if (['wildcard', 'procreate', 'swords', 'shields', 'haste', 'gigantify', 'xray', 'over_invest'].includes(h.id)) {
      const t = targets.map(([r, c]) => S.grid[r][c]).filter(Boolean).sort((a, b) => b.units - a.units)[0]; if (!t) continue; pick = [t.r, t.c];
    } else continue;
    G.play(S, h.id, pick[0], pick[1]); return true;
  }
  return false;
}
function handleEvent(S, ev) {
  if (ev === 'council') { const o = G.councilOptions(S); const d = o.find(x => x.kind === 'king') || o[0]; G.applyDecree(S, d.id); }
  else if (ev === 'prophet') G.startProphecy(S);
  else if (ev === 'blessing') G.resolveBlessing(S);
  else if (ev === 'tower') { const c = G.expandCandidates(S); if (c.length) G.unlockPlot(S, ...S.rng.pick(c)); }
  else if (ev === 'merchant') { /* 不買 */ }
}
function playRun(kingId, diffId, seed, verbose) {
  const S = G.newRun(kingId, diffId, seed);
  const c = [2, 2]; G.play(S, NK.KINGS[kingId].base, 2, 2); S.phase = 'setupLoot';
  G.makeLoot(S, S.king); S.phase = 'loot';
  let guard = 0;
  while (!S.done && guard++ < 400) {
    if (S.phase === 'loot') { G.pickLoot(S, chooseLoot(S)); continue; }
    if (S.phase === 'events') { let e; while ((e = G.nextEvent(S))) handleEvent(S, e); continue; }
    if (S.phase === 'play') {
      while (S.uses > 0 && S.hand.length) { if (!playTurn(S)) { G.pit(S, S.hand[0].id); break; } }
      G.planBattle(S);
      const b = NK.runBattle(S, S.cur.wave);
      if (verbose) console.log(`Y${S.year} vs ${S.cur.king} ${b.win ? 'WIN ' : 'LOSE'} t=${b.t.toFixed(0)}s lives=${S.lives} gold=${S.gold} plots=${G.plots(S).length}`);
      const r = G.finishBattle(S, { win: b.win }); if (r.over) break;
    }
  }
  return S;
}
module.exports = { playRun };
if (require.main === module) {
  const [k = 'nothing', d = 'peasant', n = '5'] = process.argv.slice(2);
  const ys = [];
  for (let i = 0; i < +n; i++) { const S = playRun(k, d, 100 + i, +n === 1); ys.push(S.year); }
  console.log(k, d, 'years reached:', ys.join(','), 'avg', (ys.reduce((a, b) => a + b, 0) / ys.length).toFixed(1));
}
