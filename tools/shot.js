// 用法：node tools/shot.js  → 依序截圖各畫面到 $OUT
const { chromium } = require(process.env.PW || '/usr/local/lib/node_modules/playwright');
const path = require('path'); const OUT = process.env.OUT || '.';
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; page.on('pageerror', e => errs.push('PAGEERR ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../index.html'));
  await page.waitForTimeout(400); await page.screenshot({ path: OUT + '/1_title.png' });
  await page.click('#btnNew'); await page.waitForTimeout(300); await page.screenshot({ path: OUT + '/2_select.png' });
  await page.click('#btnStart'); await page.waitForTimeout(400); await page.screenshot({ path: OUT + '/3_setup.png' });
  console.log(errs.join('\n') || 'no errors');
  await browser.close();
})();
