# 九王 9 Kings（同人復刻原型）

> 非官方同人作品。玩法、卡片與數值整理自 [9 Kings 社群 wiki](https://9kings.fandom.com/)（原作：Sad Socket 的 Steam 遊戲《九王 9 Kings》）。
> 美術是自製的仿風格像素/CSS 素材，**沒有使用任何官方圖片**。

純 HTML5 + JavaScript，**不需要建置、沒有相依套件**。

## 遊玩

直接用瀏覽器打開 `index.html`（或 `python3 -m http.server` 後開 <http://localhost:8000>）。

- 8 位國王：虛無 / 法術 / 貪婪 / 鮮血 / 自然 / 磐石 / 進步 / 遊牧（＋彩虹軍敵人與彩虹卡）
- 約 85 張卡：基地、部隊、建築、塔、附魔、魔法書，含重複卡升級（最高 3 級）
- 年度流程：戰利品三選一 → 事件 → 出牌 → 即時自動戰鬥 → 結算（+9 金、建築效果）
- 事件：王室議會（60+ 詔令）、先知／祝福、外交官、商人、擴張塔、第 33 年最終戰、無盡模式
- 戰鬥中點擊戰場可瞄準城堡／城塞、操控母艦、放置樹人治療區
- 自動存檔（localStorage）、繁中 / English 切換

## 專案結構

```
index.html            入口
css/style.css         介面樣式
js/data/cards.js      ★ 所有卡片（數值、能力）— 想融合其他遊戲，從這裡加卡
js/data/kings.js      ★ 國王、詔令、祝福、難度、事件排程、常數
js/state.js           規則引擎：地塊、升級、出牌、建築、詔令、年度流程、存檔（無 DOM）
js/enemy.js           敵軍生成與成長曲線（可調）
js/battle.js          即時戰鬥模擬：單位 AI、塔、基地、附魔、狀態（無 DOM）
js/render.js          像素精靈與戰場繪製
js/ui.js, i18n.js     介面、事件彈窗、流程控制、文字
tools/                無頭工具（見下）
docs/DATA_NOTES.md    ★ 資料來源、哪些數值是估算、待辦
```

引擎（`state.js`、`battle.js`）完全不碰 DOM，可在 Node 直接跑，所以規則都能自動測試。

## 開發工具（需要 Node）

```bash
node tools/rules-test.js      # 規則單元測試（對照 wiki 描述）
node tools/fuzz.js 40         # 隨機出所有卡/詔令的壓力測試，檢查例外與 NaN
node tools/bot.js nothing king 6   # Bot 整局模擬，粗略看平衡（國王/難度/次數）
```

截圖腳本（`tools/shot.js`、`play.js`、`scene.js`、`events.js`）需要 Playwright，用法見檔案開頭。

## 尚未完成 / 之後可做

見 [docs/DATA_NOTES.md](docs/DATA_NOTES.md)。重點：永久成長（國王等級與 78 個 perk）、國王解鎖任務、
時間之王（官方也還沒出）、音效、正式美術、部分卡片數值待校正。
