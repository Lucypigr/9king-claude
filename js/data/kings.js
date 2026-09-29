/* 9 Kings – 國王、詔令、祝福、事件排程、難度 */
(function (NK) {
  'use strict';
  const D = (en, zh) => ({ en, zh });

  /* ───── 國王（順序＝選王輪盤順序）───── */
  NK.KINGS = {
    nothing:  { en: 'King of Nothing',  zh: '虛無之王', color: '#8a8f99', dark: '#3b3f47', base: 'castle',
                desc: D('Beginner deck, balanced gameplay with steady progression.', '新手牌組，平衡穩定的成長。'),
                cards: ['soldier', 'archer', 'paladin', 'scout_tower', 'farm', 'blacksmith', 'wildcard', 'steel_coat'] },
    spells:   { en: 'King of Spells',   zh: '法術之王', color: '#7a5cff', dark: '#2c2266', base: 'citadel',
                desc: D('Focused on enchantments, perfect for creating small armies of super soldiers.', '專精附魔，打造少量的超級士兵。'),
                cards: ['wizard', 'warlock', 'shaman', 'spire', 'library', 'offering', 'static', 'combustion'] },
    greed:    { en: 'King of Greed',    zh: '貪婪之王', color: '#e0b030', dark: '#5c4508', base: 'palace',
                desc: D('Getting gold at all costs is the main playstyle for this king.', '不惜一切代價獲取金幣。'),
                cards: ['mercenary', 'thief', 'dispenser', 'beacon', 'vault', 'midas_touch', 'mortgage', 'over_invest'] },
    blood:    { en: 'King of Blood',    zh: '鮮血之王', color: '#d2372f', dark: '#5a1512', base: 'pagoda',
                desc: D('Sacrifices and large armies of expendable units.', '犧牲與大量可消耗的軍隊。'),
                cards: ['imp', 'bomber', 'mangler', 'cemetery', 'demons_altar', 'carnage', 'vampirism', 'sacrifice'] },
    nature:   { en: 'King of Nature',   zh: '自然之王', color: '#3fae55', dark: '#15421f', base: 'treant',
                desc: D('Support focused, it excels at making other decks more powerful.', '偏重輔助，讓其他牌組更強大。'),
                cards: ['elf', 'boar', 'mycelium', 'orchard', 'forest', 'clone', 'procreate', 'poison_vial'] },
    stone:    { en: 'King of Stone',    zh: '磐石之王', color: '#a68a64', dark: '#4a3b26', base: 'stronghold',
                desc: D('Towers and walls are his focus, with troops that stall the enemies.', '以塔與牆為主，用部隊拖延敵人。'),
                cards: ['ballista', 'trapper', 'trebuchet', 'flametower', 'wallmaker', 'quarry', 'cauldron', 'earthworks'] },
    progress: { en: 'King of Progress', zh: '進步之王', color: '#37b6c9', dark: '#0f4650', base: 'mothership',
                desc: D('High-tech, with builds focused on levels and long-term synergies.', '高科技，專注升級與長期協同。'),
                cards: ['executioner', 'defender', 'lab_rat', 'converter', 'concabulator', 'reinforce', 'precision', 'overhaul'] },
    nomads:   { en: 'King of Nomads',   zh: '遊牧之王', color: '#d98b3a', dark: '#5a3512', base: 'warlord',
                desc: D('A king without a castle. Relies heavily on unusual troops.', '沒有城堡的王，倚賴特殊的部隊。'),
                cards: ['mob', 'raptor', 'dragons_den', 'camp', 'frost', 'migration', 'swords', 'shields'] },
    rainbow:  { en: 'Rainbow Army',     zh: '彩虹軍', color: '#ff7ad9', dark: '#4a2a6a', special: true, noPlay: true,
                desc: D('Special army. Beat it to choose a Rainbow card.', '特殊軍隊。擊敗後可選擇一張彩虹卡。'),
                cards: ['scapegoat', 'ogre', 'slime', 'razing', 'shrine', 'unify', 'temple', 'haste', 'echoform', 'gigantify', 'patronage', 'xray'] }
  };
  NK.KING_ORDER = ['nothing', 'spells', 'greed', 'blood', 'nature', 'stone', 'progress', 'nomads'];

  /* ───── 難度（敵人屬性成長）───── */
  NK.DIFFICULTIES = [
    { id: 'peasant', en: 'Peasant', zh: '農民', mul: 0.8,  growth: 0.055 },
    { id: 'squire',  en: 'Squire',  zh: '侍從', mul: 0.95, growth: 0.065 },
    { id: 'prince',  en: 'Prince',  zh: '王子', mul: 1.1,  growth: 0.075 },
    { id: 'king',    en: 'King',    zh: '國王', mul: 1.25, growth: 0.085 }
  ];

  /* ───── 常數（GUESS 標記＝wiki 沒寫，我估算）───── */
  NK.CONST = {
    LIVES: 3,                // GUESS
    YEARLY_GOLD: 9,
    MERCHANT_BASE: 30, MERCHANT_STEP: 15,
    REROLL_STEP: 10,
    FINAL_YEAR: 33,
    EXPAND_COST: 30,          // 第 33 年後
    PIT_GOLD: 9,
    START_HAND_CHOICES: 3,
    MAX_LEVEL: 3,
    GRID: 5                   // 5x5 最大王國，初始開放中央 3x3
  };

  /* ───── 事件排程（年份）GUESS：wiki 只給首次出現年份 ───── */
  NK.SCHEDULE = {
    council:  [4, 10, 17, 24, 30],
    prophet:  [7],
    blessing: [16],
    diplomat: [8, 15, 22, 28],
    merchant: [12, 18, 25, 31],
    tower:    [12, 19, 27],
    rainbow:  { from: 11, to: 30 }
  };

  /* ───── 祝福 ───── */
  NK.BLESSINGS = {
    baby_boom:  { en: 'Baby Boom',  zh: '嬰兒潮', ic: '🍼', n: 1, d: D('Doubles the units of the troop on the target plot.', '目標地塊上的部隊單位數翻倍。') },
    illuminism: { en: 'Illuminism', zh: '啟蒙',   ic: '💡', n: 3, d: D('The cards on the target plots level up.', '目標地塊上的卡片升 1 級。') },
    peacetime:  { en: 'Peacetime',  zh: '太平盛世', ic: '🕊️', n: 1, d: D('Doubles the HP of the card on the target plot.', '目標地塊上卡片的生命翻倍。') },
    prosperity: { en: 'Prosperity', zh: '繁榮',   ic: '🪙', n: 0, d: D('If you have 20 gold or less, multiplies your gold by 9.', '若你的金幣 ≤ 20，金幣乘以 9。') },
    zenith:     { en: 'Zenith',     zh: '天頂',   ic: '☀️', n: 1, d: D('Doubles the damage of the card on the target plot.', '目標地塊上卡片的傷害翻倍。') }
  };

  /* ───── 詔令（Royal Decrees）─────
   * max: 可選次數上限。effect 由 state.js 的 applyDecree 處理（id 對應）。 */
  const dec = (id, kind, king, en, zh, den, dzh, max) => ({ id, kind, king, en, zh, d: D(den, dzh), max: max || 20 });
  NK.DECREES = [
    // 通用
    dec('bunker', 'basic', null, 'Bunker', '地堡', 'Increases the attack speed of your towers by 50%.', '所有塔攻速 +50%。', 20),
    dec('catharsis', 'basic', null, 'Catharsis', '淨化', 'All troops in the field now have the same damage as your highest damage troop.', '所有部隊傷害提升至與最高傷害部隊相同。', 1),
    dec('exploration', 'basic', null, 'Exploration', '探索', 'Unlocks 3 new random plots.', '解鎖 3 個隨機新地塊。', 20),
    dec('eyeglass', 'basic', null, 'Eyeglass', '望遠鏡', 'All your units and towers have +20% chance to deal critical damage.', '所有單位與塔 +20% 暴擊率。', 5),
    dec('feast', 'basic', null, 'Feast', '盛宴', 'Doubles the maximum HP of all troops.', '所有部隊最大生命翻倍。', 20),
    dec('gunpowder', 'basic', null, 'Gunpowder', '火藥', 'Increases the damaging range of area attacks by 30%.', '範圍攻擊的傷害範圍 +30%。', 5),
    dec('iron_fist', 'basic', null, 'Iron Fist', '鐵拳', 'Doubles critical damage.', '暴擊傷害翻倍。', 3),
    dec('leatherworks', 'basic', null, 'Leatherworks', '皮革工坊', 'Doubles the movement speed of all your units.', '所有單位移動速度翻倍。', 20),
    dec('loan', 'basic', null, 'Loan', '貸款', 'Receive 99 gold coins.', '獲得 99 金幣。', 20),
    dec('outsourcing', 'basic', null, 'Outsourcing', '外包', 'Receive 9 free rerolls.', '獲得 9 次免費重骰。', 20),
    dec('overwork', 'basic', null, 'Overwork', '過勞', 'Your support buildings apply their effects one more time.', '輔助建築的效果多觸發 1 次。', 2),
    dec('poison_thorns', 'basic', null, 'Poison Thorns', '毒刺', 'Every time enemies attack your units, those enemies gain 1 poison stack.', '敵人每次攻擊你的單位，自身中毒 1 層。', 20),
    dec('rebirth', 'basic', null, 'Rebirth', '重生', 'Regains all your lost lives.', '恢復所有失去的生命。', 20),
    dec('sharp_blades', 'basic', null, 'Sharp Blades', '利刃', 'Increases the attack of all your units and towers by 30%.', '所有單位與塔攻擊 +30%。', 20),
    dec('supplies', 'basic', null, 'Supplies', '補給', "Get a copy of each of your king's cards.", '獲得你國王每張卡片各一張。', 20),
    dec('venom', 'basic', null, 'Venom', '劇毒', 'Every poison effect is now applied twice.', '所有毒素效果施加兩次。', 3),
    dec('war_horns', 'basic', null, 'War Horns', '戰角', 'Summons are 50% stronger.', '召喚物強度 +50%。', 20),
    dec('weakspot', 'basic', null, 'Weakspot', '弱點', 'Frozen, stunned, or poisoned units take +50% damage.', '凍結、暈眩、中毒的單位受到 +50% 傷害。', 1),
    // 彩虹
    dec('gambling', 'rainbow', null, 'Gambling', '賭博', 'Receive two cards after every battle. You can no longer choose your loot.', '每場戰鬥後獲得兩張隨機卡，不能再選擇戰利品。', 1),
    dec('longtermism', 'rainbow', null, 'Longtermism', '長期主義', 'You can choose three decrees in the next Royal Council.', '下一次王室議會可選擇三個詔令。', 1),
    dec('payroll', 'rainbow', null, 'Payroll', '薪資', 'Your first re-roll in every encounter gives you +10 gold instead of taking it.', '每次遭遇的第一次重骰改為獲得 10 金幣。', 1),
    dec('refraction', 'rainbow', null, 'Refraction', '折射', 'Replaces your cards in hand with random Rainbow cards.', '將手牌全部換成隨機彩虹卡。', 1),
    dec('wishing_well', 'rainbow', null, 'Wishing Well', '許願池', 'Gets 3 copies of the next card you throw into the pit.', '下一張丟進坑洞的卡，獲得 3 張複本。', 1),
    // 虛無
    dec('armory', 'king', 'nothing', 'Armory', '軍械庫', 'All troops gain +3 stacks of Steel Coat.', '所有部隊獲得 +3 層鋼甲。', 20),
    dec('development', 'king', 'nothing', 'Development', '開發', 'Receives 1 Wildcard card for each empty plot you have.', '每有一個空地塊，獲得 1 張萬用牌。', 20),
    dec('fireball', 'king', 'nothing', 'Fireball', '火球', 'Castle hits now leave a damaging area of fire on the ground.', '城堡命中後在地面留下燃燒區域。', 1),
    dec('freshmen', 'king', 'nothing', 'Freshmen', '新兵', 'Doubles all stats of all level 1 troops.', '所有 1 級部隊全屬性翻倍。', 1),
    dec('twinshot', 'king', 'nothing', 'Twinshot', '雙連射', 'Archers now shoot +1 arrow per hit.', '弓箭手每次多射 1 箭。', 5),
    // 法術
    dec('abracadabra', 'king', 'spells', 'Abracadabra', '咒語', '10% of all enemies turn into frogs.', '10% 的敵人變成青蛙。', 1),
    dec('glass_staffs', 'king', 'spells', 'Glass Staffs', '玻璃法杖', 'Your wizards now have 100 attack points but only 1 HP.', '法師傷害變為 100，但生命只有 1。', 1),
    dec('re_enchant', 'king', 'spells', 'Re-enchant', '重新附魔', 'Doubles all enchantments of all your active troops.', '所有在場部隊的附魔翻倍。', 2),
    dec('spiremania', 'king', 'spells', 'Spiremania', '尖塔狂熱', 'Doubles the amount of healing rays of your Spires.', '尖塔的治療射線數量翻倍。', 20),
    dec('static_fields', 'king', 'spells', 'Static Fields', '靜電場', "Doubles the attack speed of your Citadel's lightning bolts.", '城塞閃電攻速翻倍。', 20),
    // 貪婪
    dec('bargain', 'king', 'greed', 'Bargain', '議價', "Merchant's cards cost half the price.", '商人的卡片半價。', 2),
    dec('burglary', 'king', 'greed', 'Burglary', '入室行竊', 'All active troops gain 2 stacks of Midas Touch.', '所有在場部隊獲得 2 層點金術。', 20),
    dec('insurance', 'king', 'greed', 'Insurance', '保險', 'Receive 1 gold for every 9 allied unit deaths.', '每 9 名友軍陣亡獲得 1 金幣。', 20),
    dec('salvage', 'king', 'greed', 'Salvage', '回收', 'Cards thrown into the pit return 3x more gold.', '丟進坑洞的卡返還 3 倍金幣。', 3),
    dec('scimitars', 'king', 'greed', 'Scimitars', '彎刀', 'Thief attacks are always critical strikes.', '盜賊攻擊必定暴擊。', 1),
    // 鮮血
    dec('bloodbath', 'king', 'blood', 'Bloodbath', '血浴', 'Oblation now also gives +1% damage to plots per troop added.', '獻祭品同時為地塊每增加 1 部隊 +1% 傷害。', 20),
    dec('covenant', 'king', 'blood', 'Covenant', '契約', "Doubles the stats of all active Demon's Altars.", '所有惡魔祭壇的屬性翻倍。', 20),
    dec('death_pool', 'king', 'blood', 'Death Pool', '死亡池', 'Receive a Sacrifice card every time you throw a card in the pit.', '每丟一張卡進坑洞，獲得 1 張獻身。', 3),
    dec('embalming', 'king', 'blood', 'Embalming', '防腐', 'Enemies killed have a 10% chance to be summoned back to life as allies.', '被殺死的敵人有 10% 機率復活為友軍。', 1),
    dec('evil_pact', 'king', 'blood', 'Evil Pact', '邪惡契約', "Doubles the maximum quantity of Pagoda's summoned imps.", '寶塔召喚小鬼的數量上限翻倍。', 3),
    dec('fireworks', 'king', 'blood', 'Fireworks', '煙火', 'Bombers have their attack range area doubled.', '炸彈兵的爆炸範圍翻倍。', 2),
    dec('transmutation', 'king', 'blood', 'Transmutation', '嬗變', 'All active allied troops are replaced with level 3 Imps.', '所有在場友軍部隊換成 3 級小鬼。', 1),
    // 自然
    dec('fertility', 'king', 'nature', 'Fertility', '豐饒', 'Receive 3 Procreate cards immediately.', '立即獲得 3 張繁衍。', 3),
    dec('nettle', 'king', 'nature', 'Nettle', '蕁麻', 'Your Treant attack now deals damage to enemies.', '樹人的攻擊現在會傷害敵人。', 1),
    dec('populate', 'king', 'nature', 'Populate', '繁殖', 'Whenever any unit is added to any plot, add one extra unit.', '任何地塊每新增單位時，多新增 1 個。', 2),
    dec('revitalize', 'king', 'nature', 'Revitalize', '復甦', 'Doubles every heal effect you receive.', '所有治療效果翻倍。', 20),
    dec('wilderness', 'king', 'nature', 'Wilderness', '荒野', 'Unlocks 3 new random plots, with Forests on each of them.', '解鎖 3 個隨機新地塊，每個都有一座森林。', 20),
    // 磐石
    dec('barricade', 'king', 'stone', 'Barricade', '路障', 'Walls reflect 10% of damage taken.', '牆壁反彈 10% 承受傷害。', 20),
    dec('dynamites', 'king', 'stone', 'Dynamites', '炸藥', 'Traps now cause double damage.', '陷阱傷害翻倍。', 20),
    dec('engineering', 'king', 'stone', 'Engineering', '工程學', 'Doubles the damage of all towers.', '所有塔傷害翻倍。', 20),
    dec('towerdome', 'king', 'stone', 'Towerdome', '塔穹', 'Stronghold can now build towers twice as fast.', '要塞建塔速度翻倍。', 3),
    // 進步
    dec('frankensteinian', 'king', 'progress', 'Frankensteinian', '科學怪人', 'Converter towers now summon bombers instead of Lab Rats.', '轉化塔改為召喚炸彈兵而非實驗鼠。', 1),
    dec('gentrify', 'king', 'progress', 'Gentrify', '仕紳化', 'All currently active plots gain one level.', '所有在場地塊升 1 級。', 20),
    dec('junkyard', 'king', 'progress', 'Junkyard', '廢料場', 'Adds 9 random trash cards to your hand.', '手牌加入 9 張廢料牌。', 20),
    dec('scopes', 'king', 'progress', 'Scopes', '瞄準鏡', 'Adds 9 Precision cards to your hand.', '手牌加入 9 張精準。', 20),
    dec('splicing', 'king', 'progress', 'Splicing', '基因拼接', 'The level of all active lab rats is doubled.', '所有實驗鼠等級翻倍。', 2),
    dec('ultragravity', 'king', 'progress', 'Ultragravity', '超重力', 'Doubles the attack range of your Mothership.', '母艦攻擊範圍翻倍。', 3),
    // 遊牧
    dec('cryoflame', 'king', 'nomads', 'Cryoflame', '冰焰', 'Dragons now spit blue fire and attack +1 time per battle.', '巨龍噴出藍火，每場多攻擊 1 次。', 20),
    dec('frostbite', 'king', 'nomads', 'Frostbite', '凍傷', 'Frost now deals damage per second. +1 damage per stack.', '寒霜每秒造成傷害，每層 +1。', 20),
    dec('pillage', 'king', 'nomads', 'Pillage', '掠奪', 'The effect of all plot destroying cards is applied +1 time.', '所有摧毀地塊的卡效果多套用 1 次。', 20),
    dec('settlement', 'king', 'nomads', 'Settlement', '殖民', 'All new troops and towers placed on empty plots start with double stats.', '新放置到空地塊的部隊與塔初始屬性翻倍。', 20),
    dec('smithy', 'king', 'nomads', 'Smithy', '鍛造廠', 'Swords and Shields have double effect.', '刀劍與盾牌效果翻倍。', 20)
  ];
  NK.DECREE_BY_ID = {};
  NK.DECREES.forEach(d => { NK.DECREE_BY_ID[d.id] = d; });

  /* ───── 語言/名稱工具 ───── */
  NK.lang = 'zh';
  NK.t = (o) => (o && (o[NK.lang] || o.en)) || '';
  NK.name = (o) => (NK.lang === 'zh' ? o.zh : o.en) || o.en;
})(globalThis.NK = globalThis.NK || {});
