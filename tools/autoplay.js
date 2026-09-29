// 用真實 DOM 點擊自動玩數年，驗證整個 UI 流程不會卡住/報錯。 KING=nothing STEPS=80 node tools/autoplay.js
const { chromium } = require(process.env.PW); const path = require('path'); const OUT = process.env.OUT || '.';
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--allow-file-access-from-files', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; page.on('pageerror', e => errs.push('PAGEERR ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../index.html'));
  const kings = ['nothing','spells','greed','blood','nature','stone','progress','nomads']; const king = process.env.KING || 'nothing';
  await page.click('#btnNew'); await page.click('#kingRow .kingCard:nth-child(' + (kings.indexOf(king) + 1) + ')'); await page.click('#btnStart');
  let lastYear = 0, stuck = 0;
  for (let i = 0; i < +(process.env.STEPS || 80); i++) {
    await page.waitForTimeout(150);
    const act = await page.evaluate(() => {
      const $ = (s) => document.querySelector(s), st = NK.UI.get(), S = st.S;
      const ov = $('#overlay');
      if (!ov.hidden) {
        const d = ov.querySelector('.decreeCard'); if (d) { d.click(); return 'decree'; }
        const kb = ov.querySelector('.kingBtn'); if (kb) { kb.click(); return 'king'; }
        const pr = ov.querySelector('.btn.primary'); if (pr && !ov.querySelector('.card')) { pr.click(); return 'ok'; }
        const cards = [...ov.querySelectorAll('.card:not(.dis)')]; const tr = cards.find(c => c.classList.contains('t-troop') || c.classList.contains('t-tower')) || cards[0];
        if (tr) { tr.click(); const p2 = ov.querySelector('.btn.primary'); if (p2 && ov.querySelector('.priceTag')) p2.click(); return 'card'; }
        if (pr) { pr.click(); return 'ok2'; }
        return 'overlay?';
      }
      const cand = $('.plot.candidate'); if (cand) { cand.click(); return 'expand'; }
      if (S.phase === 'setup') { document.querySelector('.plot.valid').click(); return 'base'; }
      if (S.phase === 'play') {
        const hand = [...document.querySelectorAll('#hand .card')];
        for (const c of hand) { c.click(); const v = document.querySelector('.plot.valid'); if (v) { v.click(); return 'play'; } }
        if (hand.length) { hand[0].click(); const pit = [...document.querySelectorAll('#actions .btn')].find(b => b.textContent.includes('🕳')); if (pit && !pit.disabled) { pit.click(); return 'pit'; } }
        const sb = [...document.querySelectorAll('#actions .btn.primary')][0]; if (sb) { sb.click(); return 'startbattle'; }
      }
      if (S.phase === 'battle') { const sk = [...document.querySelectorAll('#actions .btn')].find(b => b.textContent.includes('⏩')); if (sk) sk.click(); return 'battle'; }
      return 'idle:' + S.phase;
    });
    const info = await page.evaluate(() => { const S = NK.UI.get().S; return S.year + '|' + S.lives + '|' + S.phase; });
    if (i % 10 === 0) console.log(i, act, info);
    if (S_done(await page.evaluate(() => NK.UI.get().S.done))) break;
  }
  function S_done(d) { return d; }
  await page.screenshot({ path: OUT + '/auto_end.png' });
  const fin = await page.evaluate(() => { const S = NK.UI.get().S; return { year: S.year, lives: S.lives, done: S.done, kills: S.stats.kills, gold: S.gold, plots: NK.G.plots(S).length }; });
  console.log(JSON.stringify(fin)); console.log(errs.join('\n') || 'no errors');
  await browser.close();
})();
