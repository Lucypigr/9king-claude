/* 9 Kings – 敵軍生成
 * wiki 沒公開敵人成長公式，這裡是我的估算（NK.ENEMY 可直接調整）。 */
(function (NK) {
  'use strict';
  const C = NK.CARDS;

  NK.ENEMY = {
    // 各國王的敵軍兵種與權重
    roster: {
      nothing:  [['soldier', 6], ['archer', 3], ['paladin', 1.5]],
      spells:   [['wizard', 4], ['warlock', 2], ['shaman', 1.5]],
      greed:    [['thief', 4], ['mercenary', 5]],
      blood:    [['imp', 6], ['bomber', 3]],
      nature:   [['elf', 3], ['boar', 4]],
      stone:    [['ballista', 3], ['trapper', 4]],
      progress: [['executioner', 3], ['defender', 2.5], ['lab_rat', 5]],
      nomads:   [['mob', 4], ['raptor', 4], ['warlord', 1]],
      rainbow:  [['slime', 4], ['ogre', 3]]
    },
    countBase: 0.30, countPerYear: 0.075, countCap: 4.0, // 數量 = 表格數量 × (base + perYear*年)
    kinds: [2, 2, 3],                                      // 早/中/後期每場兵種數
    bossHp: 30, bossDmg: 3, bossSize: 2.4,
    goldenChance: 0.08
  };

  // 回傳 { specs:[{card, level, count, hpMul, dmgMul, boss?}], king, boss }
  NK.makeWave = function (S, kingId, opts) {
    opts = opts || {};
    const E = NK.ENEMY, rng = S.rng, y = S.year;
    const roster = E.roster[kingId] || E.roster.nothing;
    const growth = S.diff.growth * (S.endless && y > NK.CONST.FINAL_YEAR ? 1.1 : 1);
    const stat = S.diff.mul * Math.pow(1 + growth, y - 1);
    const level = 1 + (y >= 10 ? 1 : 0) + (y >= 22 ? 1 : 0);
    const cf = Math.min(E.countCap, E.countBase + E.countPerYear * y);
    const nKinds = y < 6 ? E.kinds[0] : y < 16 ? E.kinds[1] : E.kinds[2];
    const kinds = [];
    const pool = roster.slice();
    while (kinds.length < Math.min(nKinds, roster.length) && pool.length) {
      const tot = pool.reduce((a, b) => a + b[1], 0); let x = rng.next() * tot, i = 0;
      while (i < pool.length - 1 && x >= pool[i][1]) { x -= pool[i][1]; i++; }
      kinds.push(pool.splice(i, 1)[0][0]);
    }
    const specs = [];
    for (const card of kinds) {
      const cd = C[card];
      const tableCount = cd.lv ? cd.lv[level - 1][5] : 9;
      const lvCount = card === 'mercenary' ? [9, 18, 27][level - 1] : tableCount;
      const count = Math.max(1, Math.round(lvCount * cf / Math.sqrt(kinds.length)));
      specs.push({ card, level, count, hpMul: stat, dmgMul: stat });
    }
    let boss = false;
    if (opts.boss) {
      boss = true;
      const lead = kinds[kinds.length - 1];
      specs.push({ card: lead, level: 3, count: 1, hpMul: stat * E.bossHp, dmgMul: stat * E.bossDmg, boss: true, size: E.bossSize });
    }
    return { king: kingId, specs, boss, year: y, stat, level };
  };

  // 預覽：以敵軍摘要顯示
  NK.wavePreview = function (wave) {
    return wave.specs.map(s => ({ card: s.card, count: s.count, level: s.level, boss: !!s.boss }));
  };
})(globalThis.NK = globalThis.NK || {});
