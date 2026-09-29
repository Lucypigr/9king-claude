// 逐一觸發事件彈窗並截圖
const { chromium } = require(process.env.PW); const path = require('path'); const OUT = process.env.OUT || '.';
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; page.on('pageerror', e => errs.push('PAGEERR ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../index.html'));
  await page.evaluate(() => {
    const G = NK.G; const S = G.newRun('greed', 'squire', 11); S.year = 12; S.gold = 150;
    G.play(S, 'palace', 2, 2); S.phase = 'events'; G.addCard(S, 'mercenary', 1); S.uses = 1;
    S.events = ['council', 'merchant', 'prophet', 'diplomat', 'tower']; NK.UI.debug.setState(S); NK.UI.debug.afterState();
  });
  const names = ['council', 'merchant', 'prophet', 'diplomat', 'diplomat2', 'tower'];
  await page.waitForTimeout(200); await page.screenshot({ path: OUT + '/e1_council.png' });
  await page.click('#overlay .decreeCard'); await page.waitForTimeout(200); await page.screenshot({ path: OUT + '/e2_merchant.png' });
  await page.click('#overlay .card:nth-child(1)'); await page.waitForTimeout(150); await page.screenshot({ path: OUT + '/e2b_merchant_bought.png' });
  await page.click('#overlay .btn.primary'); await page.waitForTimeout(200); await page.screenshot({ path: OUT + '/e3_prophet.png' });
  await page.click('#overlay .btn.primary'); await page.waitForTimeout(200); await page.screenshot({ path: OUT + '/e4_diplomat.png' });
  await page.click('#overlay .kingBtn'); await page.waitForTimeout(200); await page.screenshot({ path: OUT + '/e5_diplomat2.png' });
  await page.click('#overlay .kingBtn'); await page.waitForTimeout(300); await page.screenshot({ path: OUT + '/e6_tower.png' });
  await page.click('.plot.candidate'); await page.waitForTimeout(300); await page.screenshot({ path: OUT + '/e7_after_events.png' });
  await page.evaluate(() => { const { S } = NK.UI.get(); S.done = true; S.won = true; S.stats.kills = 1234; NK.UI.debug.afterState(); });
  await page.waitForTimeout(200); await page.screenshot({ path: OUT + '/e8_win.png' });
  console.log(errs.join('\n') || 'no errors');
  await browser.close();
})();
