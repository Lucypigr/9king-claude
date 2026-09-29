/* 介面文字（繁中 / English） */
(function (NK) {
  'use strict';
  const T = {
    subtitle: ['王國建造 × Roguelike × 卡牌 — 成為王中之王', 'Kingdom builder × Roguelike × Deck-building — become the King of Kings'],
    fine: ['非官方同人作品。卡片資料整理自 9 Kings 社群 wiki，僅供學習與原型用途。', 'Unofficial fan project. Card data compiled from the 9 Kings community wiki – prototype for learning purposes.'],
    newGame: ['開始新遊戲', 'New Run'], cont: ['繼續遊戲', 'Continue'], how: ['玩法說明', 'How to Play'], lang: ['English', '中文'],
    chooseKing: ['選擇你的國王', 'Choose your King'], difficulty: ['難度', 'Difficulty'], back: ['返回', 'Back'], start: ['出征！', 'Start!'],
    year: ['年', 'Year'], gold: ['金幣', 'Gold'], lives: ['生命', 'Lives'],
    placeBase: ['選擇一塊地放置你的基地', 'Choose a plot for your Base'],
    pickLoot: ['選擇一張戰利品卡', 'Choose a loot card'], lootFrom: ['戰利品來源', 'Spoils from'],
    reroll: ['重骰', 'Reroll'], free: ['免費', 'free'], pit: ['丟進坑洞 (+9 金，跳過回合)', 'Throw in Pit (+9 gold, skip)'],
    startBattle: ['⚔ 開始戰鬥', '⚔ Start battle'], enemy: ['來襲敵軍', 'Incoming'], boss: ['首領', 'Boss'],
    selectTarget: ['選擇目標（右鍵/Esc 取消）', 'Choose a target (right-click / Esc to cancel)'],
    usesLeft: ['本年可出牌', 'Plays left'], hand: ['手牌', 'Hand'], emptyHand: ['手牌是空的', 'Hand is empty'],
    victory: ['勝利！', 'Victory!'], defeat: ['敗北 — 失去 1 條生命', 'Defeat — lost 1 life'], kills: ['擊殺', 'Kills'],
    gameOver: ['王國覆滅', 'Kingdom Fallen'], champion: ['你成為了王中之王！', 'You are the King of Kings!'], endless: ['繼續無盡模式', 'Continue in Endless'],
    again: ['再來一局', 'Play again'], menu: ['選單', 'Menu'], resume: ['繼續', 'Resume'], toTitle: ['回標題', 'Title screen'],
    council: ['王室議會', 'Royal Council'], councilHint: ['選擇一項詔令', 'Choose a decree'], merchant: ['商人', 'Merchant'], merchantHint: ['購買卡片：每買一張多一次出牌機會', 'Buy cards – each purchase grants one extra play'],
    price: ['價格', 'Price'], done: ['完成', 'Done'], prophet: ['先知', 'The Prophet'], blessing: ['祝福降臨', 'Blessing'], diplomat: ['外交官', 'Diplomat'],
    diplomatHint: ['選擇一位要休戰的國王，再選一位新的敵人', 'Pick a king to make peace with, then choose a new enemy'],
    tower: ['擴張塔', 'Expansion Tower'], towerHint: ['選擇一塊新地塊解鎖', 'Choose a new plot to unlock'], skip: ['略過', 'Skip'],
    final: ['最終戰！', 'Final Battle!'], finalHint: ['第 33 年：擊敗王軍首領。這一年可以打出所有手牌。', 'Year 33: defeat the boss army. You may play every card in hand.'],
    decrees: ['已頒布詔令', 'Active decrees'], none: ['（無）', '(none)'],
    speed: ['速度', 'Speed'], skipBattle: ['快轉', 'Fast-forward'],
    stats: ['屬性', 'Stats'], hp: ['生命', 'HP'], dmg: ['傷害', 'DMG'], hps: ['攻速', 'Hits/s'], spd: ['移速', 'Move'], crit: ['暴擊', 'Crit'], units: ['單位數', 'Units'], level: ['等級', 'Lv'],
    aimHint: ['點擊戰場可瞄準/操控基地', 'Click the battlefield to aim / steer your base'],
    typeName: { base: ['基地', 'Base'], troop: ['部隊', 'Troop'], building: ['建築', 'Building'], tower: ['塔', 'Tower'], ench: ['附魔', 'Enchant'], tome: ['魔法書', 'Tome'] },
    howText: [
`<h3>目標</h3><p>建立你的王國，撐過 33 年並擊敗最終首領。你有 3 條生命——敵軍衝進你的基地就會失去 1 條。</p>
<h3>每一年</h3><ol>
<li><b>戰利品</b>：從上一場擊敗的國王牌組中三選一（戰敗則從自己的牌組選）。重骰要花金幣，每次 +10。</li>
<li><b>事件</b>：第 4 年王室議會（詔令）、第 7 年先知、第 8 年外交官、第 12 年商人與擴張塔……</li>
<li><b>出牌</b>：每年只能打出 1 張牌（商人買的卡每張多 1 次；有些魔法書如「獻祭品」不消耗）。打出後戰鬥自動開始。也可以把牌丟進坑洞換 9 金並跳過。</li>
<li><b>戰鬥</b>：即時自動戰鬥。基地（城堡、城塞、母艦、樹人…）可以點擊戰場瞄準或操控。</li>
<li><b>結算</b>：建築效果生效（農場、鐵匠…），並獲得 9 金。</li></ol>
<h3>卡片</h3><ul>
<li><b>部隊</b>：放在空地塊，戰鬥時走上戰場。重複同一張卡 = 升級（最高 3 級）。</li>
<li><b>建築</b>：每年增益相鄰（上下左右）的地塊。</li>
<li><b>塔</b>：固定在地塊上射擊，不會被攻擊也不能被附魔。</li>
<li><b>附魔</b>：可無限疊加在部隊上。 <b>魔法書</b>：立即生效的法術。</li>
<li><b>基地</b>：每位國王專屬，遊戲開始時放置；只能有一個。</li></ul>
<h3>操作</h3><p>點手牌 → 點地塊。右鍵或 Esc 取消。戰鬥中點擊戰場可控制基地。</p>`,
`<h3>Goal</h3><p>Build your kingdom, survive 33 years and defeat the final boss. You have 3 lives – each enemy that reaches your base costs one.</p>
<h3>Each year</h3><ol>
<li><b>Loot</b>: pick 1 of 3 cards from the king you just beat (from your own deck if you lost). Rerolls cost gold, +10 each time.</li>
<li><b>Events</b>: Royal Council (decrees) in year 4, Prophet in 7, Diplomat in 8, Merchant &amp; Expansion Tower in 12 …</li>
<li><b>Play</b>: you may play only 1 card per year (merchant purchases grant +1; some tomes like Offering are free). The battle starts automatically. You can also throw a card into the pit for 9 gold and skip.</li>
<li><b>Battle</b>: real-time auto-battle. Your Base (Castle, Citadel, Mothership, Treant…) can be aimed/steered by clicking the field.</li>
<li><b>Upkeep</b>: buildings trigger (Farm, Blacksmith …) and you receive 9 gold.</li></ol>
<h3>Cards</h3><ul>
<li><b>Troops</b> go on empty plots and march out in battle. Playing a duplicate = level up (max 3).</li>
<li><b>Buildings</b> buff adjacent (orthogonal) plots every year.</li>
<li><b>Towers</b> shoot from their plot; they cannot be attacked or enchanted.</li>
<li><b>Enchantments</b> stack endlessly on troops. <b>Tomes</b> are instant spells.</li>
<li><b>Base</b>: unique to each king, placed at the start; only one.</li></ul>
<h3>Controls</h3><p>Click a hand card → click a plot. Right-click / Esc cancels. Click the battlefield to steer your base.</p>`]
  };
  NK.T = T;
  NK.tr = (k) => { const v = T[k]; if (!v) return k; return Array.isArray(v) ? v[NK.lang === 'zh' ? 0 : 1] : v; };
  NK.typeName = (t) => T.typeName[t][NK.lang === 'zh' ? 0 : 1];
})(globalThis.NK = globalThis.NK || {});
