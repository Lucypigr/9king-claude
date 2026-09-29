// 亂數壓力測試：隨機出所有卡、隨機詔令，檢查例外與 NaN。 node tools/fuzz.js [runs]
const NK = require('./sim.js'); const G = NK.G, C = NK.CARDS;
function nanCheck(S, where) {
  for (const p of G.plots(S)) { const st = G.unitStats(S, p); for (const k in st) if (typeof st[k] === 'number' && !isFinite(st[k])) throw new Error(`NaN ${k} in ${p.card} at ${where}`); }
  if (!isFinite(S.gold)) throw new Error('gold NaN ' + where);
}
function fuzzRun(seed) {
  const kings = NK.KING_ORDER; const kingId = kings[seed % kings.length];
  const S = G.newRun(kingId, ['peasant', 'squire', 'prince', 'king'][seed % 4], seed);
  const rng = S.rng;
  G.play(S, NK.KINGS[kingId].base, 2, 2); G.makeLoot(S, S.king);
  const allIds = Object.keys(C).filter(id => !C[id].junk);
  let guard = 0, plays = 0;
  while (!S.done && guard++ < 200) {
    if (S.phase === 'loot') { G.pickLoot(S, rng.pick(S.loot.options)); continue; }
    if (S.phase === 'events') { let e; while ((e = G.nextEvent(S))) {
      if (e === 'council') { const o = G.councilOptions(S); if (o.length) G.applyDecree(S, rng.pick(o).id); }
      else if (e === 'prophet') G.startProphecy(S); else if (e === 'blessing') G.resolveBlessing(S);
      else if (e === 'tower') { const c = G.expandCandidates(S); if (c.length) G.unlockPlot(S, ...rng.pick(c)); }
      else if (e === 'merchant') { for (const t of ['architect', 'sage', 'warmonger']) { const offers = G.merchantOffers(S, t); S.gold += 200; if (G.buyCard(S, rng.pick(offers))) plays++; } }
    } continue; }
    if (S.phase === 'play') {
      // 隨機給卡並隨機出牌（測試所有卡）
      for (let i = 0; i < 3; i++) G.addCard(S, rng.pick(allIds), 1);
      S.uses = 3;
      for (let k = 0; k < 6 && S.uses > 0 && S.hand.length; k++) {
        const h = rng.pick(S.hand); const t = G.validTargets(S, h.id);
        if (t === null) { G.play(S, h.id); plays++; }
        else if (t.length) { const [r, c] = rng.pick(t); const res = G.play(S, h.id, r, c); if (!res.ok) throw new Error('play failed ' + h.id + ' ' + res.msg); plays++; }
        nanCheck(S, 'play ' + h.id);
      }
      S.uses = 0;
      G.planBattle(S);
      const b = NK.runBattle(S, S.cur.wave, 2400);
      for (const u of b.u) if (!isFinite(u.hp) || !isFinite(u.x)) throw new Error('unit NaN ' + u.card);
      G.finishBattle(S, { win: b.win }); nanCheck(S, 'finish');
    }
  }
  return { S, plays };
}
const n = +(process.argv[2] || 24); let tot = 0;
for (let i = 1; i <= n; i++) { try { const r = fuzzRun(i); tot += r.plays; } catch (e) { console.log('seed', i, 'FAIL', e.stack.split('\n').slice(0, 4).join('\n')); process.exitCode = 1; } }
console.log('fuzz done, plays:', tot);
