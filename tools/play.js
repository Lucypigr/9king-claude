// 瀏覽器內完整流程冒煙測試 + 截圖
const { chromium } = require(process.env.PW); const path = require('path'); const OUT = process.env.OUT || '.';
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; page.on('pageerror', e => errs.push('PAGEERR ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../index.html'));
  const king = process.env.KING || 'nothing';
  await page.evaluate((k) => { document.querySelector('#btnNew').click(); }, king);
  const kings = ['nothing','spells','greed','blood','nature','stone','progress','nomads'];
  await page.click('#kingRow .kingCard:nth-child(' + (kings.indexOf(king) + 1) + ')');
  await page.click('#btnStart'); await page.waitForTimeout(200);
  await page.click('.plot[data-r="2"][data-c="1"]'); await page.waitForTimeout(300);
  await page.screenshot({ path: OUT + '/4_loot.png' });
  const tr = await page.$('#overlay .card.t-troop, #overlay .card.t-tower'); await (tr || await page.$('#overlay .card')).click(); await page.waitForTimeout(300);
  await page.screenshot({ path: OUT + '/5_play.png' });
  await page.click('#hand .card'); await page.waitForTimeout(100);
  await page.screenshot({ path: OUT + '/6_selected.png' });
  await page.click('.plot.valid[data-r="2"][data-c="2"]'); await page.waitForTimeout(3500);
  await page.screenshot({ path: OUT + '/7_battle.png' });
  await page.waitForTimeout(6000);
  await page.screenshot({ path: OUT + '/8_after.png' });
  console.log(errs.join('\n') || 'no errors');
  await browser.close();
})();
