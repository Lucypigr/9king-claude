// 用法：KING=spells YEAR=20 node tools/scene.js  → 建立中期王國並截圖戰鬥
const { chromium } = require(process.env.PW); const path = require('path'); const OUT = process.env.OUT || '.';
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--allow-file-access-from-files', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; page.on('pageerror', e => errs.push('PAGEERR ' + e.stack)); page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../index.html'));
  const king = process.env.KING || 'spells', year = +(process.env.YEAR || 18);
  await page.evaluate(({ king, year }) => {
    const G = NK.G, K = NK.KINGS; const S = G.newRun(king, 'squire', 5);
    S.year = year; S.gold = 120; G.play(S, K[king].base, 2, 2); S.phase = 'play';
    const cards = K[king].cards.filter(id => NK.CARDS[id].type !== 'tome' && NK.CARDS[id].type !== 'ench');
    const spots = [[1,1],[1,2],[1,3],[2,1],[2,3],[3,1],[3,2],[3,3]]; let i = 0;
    for (const id of cards) { if (i >= spots.length) break; G.addCard(S, id, 3); S.uses = 3; for (let n = 0; n < 2; n++) { S.uses = 3; const [r, c] = spots[i]; if (n === 0) G.play(S, id, r, c); else G.play(S, id, r, c); } i++; }
    for (const p of G.plots(S)) if (G.isTroop(p)) { p.ench.static = 2; p.ench.steel_coat = 1; }
    NK.UI.debug.setState(S); S.uses = 1; G.previewWave(S); NK.UI.debug.renderAll();
  }, { king, year });
  await page.screenshot({ path: OUT + '/9_scene_play.png' });
  await page.evaluate(() => NK.UI.debug.startBattle());
  await page.waitForTimeout(4000); await page.screenshot({ path: OUT + '/10_scene_battle.png' });
  await page.waitForTimeout(6000); await page.screenshot({ path: OUT + '/11_scene_battle2.png' });
  console.log(errs.join('\n') || 'no errors');
  await browser.close();
})();
