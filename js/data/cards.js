/* 9 Kings – 卡片資料
 * 數值來源：9 Kings 社群 wiki (9kings.fandom.com)。標記 guess:true 的是 wiki 沒有數值、
 * 由我估算的欄位（見 docs/DATA_NOTES.md），之後拿到正確資料只需改這個檔案。
 *
 * 型別 type: base | troop | building | tower | ench | tome
 * 單位表 lv:  [[hp, dmg, hps, spd, crit%, count], ...]  (Lv1..Lv3)
 * 塔表   lv:  [[dmg, hps, crit%], ...]
 */
(function (NK) {
  'use strict';
  const C = (NK.CARDS = {});
  const def = (id, o) => { o.id = id; C[id] = o; return o; };
  const D = (en, zh) => ({ en, zh });

  /* ───────────── King of Nothing ───────────── */
  def('castle', { type: 'base', king: 'nothing', en: 'Castle', zh: '城堡', ic: '🏰', beh: 'castle',
    d: D('Hurls a stone projectile onto your enemies. Click the battlefield to aim.', '朝敵人投擲巨石（範圍傷害）。戰鬥中可點擊戰場瞄準。'),
    base: { dmg: 10, hps: 0.3, dmgMul: 1.25, hpsMul: 1.1, crit: 0, radius: 70 } });
  def('soldier', { type: 'troop', king: 'nothing', en: 'Soldier', zh: '士兵', ic: '🗡️', atk: 'melee', spr: 'knight',
    d: D('Well-balanced melee troop. Gains +1% damage per new unit.', '均衡的近戰部隊。每新增 1 個單位 +1% 傷害。'),
    lv: [[23, 3, 0.5, 1, 5, 9], [28, 4.1, 0.6, 1.3, 5, 18], [35.9, 5.6, 0.8, 1.6, 5, 27]], perUnitDmg: 0.01 });
  def('paladin', { type: 'troop', king: 'nothing', en: 'Paladin', zh: '聖騎士', ic: '🛡️', atk: 'melee', spr: 'heavy', size: 1.3,
    d: D('Highly defensive melee troop. Damage buffs also increase its HP.', '高防禦近戰部隊。傷害加成同時增加生命值。'),
    lv: [[37, 8, 0.3, 0.8, 5, 3], [55.5, 12, 0.3, 0.8, 5, 6], [83.3, 18, 0.3, 0.8, 5, 9]], dmgLinksHp: true });
  def('archer', { type: 'troop', king: 'nothing', en: 'Archer', zh: '弓箭手', ic: '🏹', atk: 'ranged', range: 230, spr: 'archer',
    d: D('Deals weak but fast ranged damage.', '傷害低但攻速快的遠程部隊。'),
    lv: [[12, 2, 0.6, 1.5, 10, 9], [15, 2.6, 0.8, 1.5, 15, 18], [18.8, 3.4, 1, 1.5, 20, 27]] });
  def('scout_tower', { type: 'tower', king: 'nothing', en: 'Scout Tower', zh: '哨塔', ic: '🗼', beh: 'arrows', range: 420,
    d: D('Shoots powerful single-target arrows.', '射出強力的單體箭矢（每級 +2 箭）。'),
    lv: [[22, 0.5, 5, 2], [30.8, 0.6, 5, 4], [43.1, 0.8, 5, 6]] });
  def('farm', { type: 'building', king: 'nothing', en: 'Farm', zh: '農場', ic: '🌾', fx: 'farm',
    d: D('Every year, adds +1 unit to one adjacent troop.', '每年為一個相鄰部隊 +1 單位（每級 +1）。') });
  def('blacksmith', { type: 'building', king: 'nothing', en: 'Blacksmith', zh: '鐵匠鋪', ic: '🔨', fx: 'smith',
    d: D('Every year, adds +2% attack damage to adjacent troops and constructions.', '每年為相鄰部隊與建築 +2% 攻擊傷害（每級疊加）。') });
  def('wildcard', { type: 'tome', king: 'nothing', en: 'Wildcard', zh: '萬用牌', ic: '🃏', target: 'plot',
    d: D('Levels up target plot.', '將目標地塊升 1 級。') });
  def('steel_coat', { type: 'ench', king: 'nothing', en: 'Steel Coat', zh: '鋼甲', ic: '🧥',
    d: D('Cancels the first hit the target unit would take every battle.', '每場戰鬥抵銷目標單位受到的第一次傷害。') });

  /* ───────────── King of Spells ───────────── */
  def('citadel', { type: 'base', king: 'spells', en: 'Citadel', zh: '城塞', ic: '🏯', beh: 'citadel',
    d: D('Strikes your opponents with chaining lightning bolts.', '以連鎖閃電轟擊敵人（每級多連鎖 1 個敵人）。'),
    base: { dmg: 15, hps: 0.8, dmgMul: 1.2, hpsMul: 1.1, crit: 0, radius: 40 } });
  def('wizard', { type: 'troop', king: 'spells', en: 'Wizard', zh: '法師', ic: '🧙', atk: 'ranged', range: 270, spr: 'mage',
    d: D('Ranged spellcaster. Damage increases for each Enchantment it bears.', '遠程施法者。每附加一個附魔 +5% 傷害。'),
    lv: [[12, 12, 0.2, 1.2, 0, 9], [15, 21, 0.2, 1.2, 0, 18], [18.8, 36.8, 0.2, 1.2, 0, 27]], enchDmg: 0.05 });
  def('warlock', { type: 'troop', king: 'spells', en: 'Warlock', zh: '術士', ic: '🧿', atk: 'melee', aoe: 42, spr: 'heavy', size: 1.2,
    d: D('Melee tank that deals area damage. Gain HP for each tome used.', '近戰坦克，造成範圍傷害。每使用一張魔法書 +5% 生命。'),
    lv: [[33, 2, 0.1, 0.8, 0, 3], [49.5, 2, 0.1, 1, 0, 6], [74.3, 2, 0.2, 1.3, 0, 9]], tomeHp: 0.05 });
  def('shaman', { type: 'troop', king: 'spells', en: 'Shaman', zh: '薩滿', ic: '🪘', atk: 'ranged', range: 240, spr: 'mage', beh: 'shaman',
    d: D("Buffs allies' attack damage based on its own damage.", '依自身傷害強化所有友軍的攻擊傷害。'),
    lv: [[12, 4, 0.2, 1.8, 0, 6], [15, 6, 0.3, 1.8, 0, 12], [18.8, 9, 0.3, 1.8, 0, 18]] });
  def('static', { type: 'ench', king: 'spells', en: 'Static', zh: '靜電', ic: '⚡',
    d: D("Unit's attacks trigger a lightning chain. +1 damage and +1 chain per stack.", '攻擊觸發連鎖閃電。每層 +1 傷害、+1 連鎖。') });
  def('combustion', { type: 'ench', king: 'spells', en: 'Combustion', zh: '燃爆', ic: '💥',
    d: D('Unit causes area damage equal to 20% of its attack when it kills an enemy.', '擊殺敵人時造成相當於 20% 攻擊力的範圍傷害。') });
  def('offering', { type: 'tome', king: 'spells', en: 'Offering', zh: '獻祭品', ic: '🩸', target: 'plot', refund: true,
    d: D('Destroy target plot to receive 3 random tome cards.', '摧毀目標地塊，獲得 3 張隨機魔法書。（不結束本年）') });
  def('library', { type: 'building', king: 'spells', en: 'Library', zh: '圖書館', ic: '📚', fx: 'library',
    d: D('Every year, has a 50% chance of duplicating an enchantment of one adjacent troop.', '每年 50% 機率複製相鄰部隊的一個附魔。') });
  def('spire', { type: 'tower', king: 'spells', en: 'Spire', zh: '尖塔', ic: '🔱', beh: 'heal', range: 420,
    d: D('Heals your units that are closest to death during battle.', '戰鬥中治療最接近死亡的友軍。'),
    lv: [[10, 0.5, 0], [15, 0.5, 0], [22.5, 0.5, 0]] });

  /* ───────────── King of Greed ───────────── */
  def('palace', { type: 'base', king: 'greed', en: 'Palace', zh: '宮殿', ic: '👑', beh: 'palace',
    d: D('Casts a ray that insta-kills target. Golden enemies drop gold.', '射出即死光線（Boss 免疫）。金色敵人會掉落金幣。'),
    base: { dmg: 999, hps: 0.29, dmgMul: 1, hpsMul: 1.25, crit: 0 } });
  def('beacon', { type: 'building', king: 'greed', en: 'Beacon', zh: '烽火台', ic: '🔥', fx: 'beacon',
    d: D('Every year, adds +2% attack speed to adjacent troops and constructions.', '每年為相鄰部隊與建築 +2% 攻速。') });
  def('vault', { type: 'building', king: 'greed', en: 'Vault', zh: '金庫', ic: '🏦', fx: 'vault',
    d: D('Receive +3 gold at the end of every year.', '每年結束時 +3 金幣（每級疊加）。') });
  def('dispenser', { type: 'tower', king: 'greed', en: 'Dispenser', zh: '噴金機', ic: '🪙', beh: 'single', range: 420,
    d: D('Single-target tower. Gains +1% attack speed for each 1 gold you receive.', '單體塔。每獲得 1 金幣，攻速 +1%。'),
    lv: [[8, 0.56, 5], [14, 0.56, 5], [24.5, 0.56, 5]] });
  def('midas_touch', { type: 'ench', king: 'greed', en: 'Midas Touch', zh: '點金術', ic: '🖐️',
    d: D('When this troop kills, there is a 2% chance to receive 1 gold.', '此部隊擊殺時有 2% 機率獲得 1 金幣。') });
  def('mortgage', { type: 'tome', king: 'greed', en: 'Mortgage', zh: '抵押', ic: '📜', target: 'plot',
    d: D('Destroy target plot to receive 30 gold for each level it had.', '摧毀目標地塊，每級獲得 30 金幣。') });
  def('over_invest', { type: 'tome', king: 'greed', en: 'Over-Invest', zh: '過度投資', ic: '💰', target: 'plot',
    d: D('Spend 30 gold to increase every stat of a troop or tower by 15%.', '花費 30 金幣，使部隊或塔的所有屬性 +15%。') });
  def('mercenary', { type: 'troop', king: 'greed', en: 'Mercenary', zh: '傭兵', ic: '🪖', atk: 'melee', spr: 'knight',
    d: D('Strong but fickle warriors for hire. You always have 1 unit for each 15 gold you own.', '強大但善變的傭兵。你每持有 15 金幣就有 1 個單位。'),
    lv: [[34, 9, 0.67, 1, 5, 0], [44.2, 11.7, 0.83, 1, 5, 0], [57.46, 15.21, 1.04, 1, 5, 0]], gold15: true });
  def('thief', { type: 'troop', king: 'greed', en: 'Thief', zh: '盜賊', ic: '🥷', atk: 'melee', spr: 'imp', beh: 'jump',
    d: D("Assassin troop that jumps to enemy's backline.", '刺客部隊，開戰後跳躍到敵方後排。'),
    lv: [[9, 9, 0.4, 1.6, 20, 9], [11.25, 11.25, 0.5, 1.6, 20, 18], [14.06, 14.06, 0.63, 1.6, 20, 27]] });

  /* ───────────── King of Blood ───────────── */
  def('pagoda', { type: 'base', king: 'blood', en: 'Pagoda', zh: '寶塔', ic: '⛩️', beh: 'pagoda',
    d: D('Summons imps onto the battlefield (9 in year 1, +1 each year).', '戰鬥中召喚小鬼（第 1 年 9 隻，之後每年 +1）。'),
    base: { hp: 12, dmg: 1.5, hps: 0.67, dmgMul: 2.02, hpMul: 1.25, hpsMul: 1, crit: 0, cap: 99 } });
  def('bomber', { type: 'troop', king: 'blood', en: 'Bomber', zh: '炸彈兵', ic: '💣', atk: 'melee', spr: 'bomb', beh: 'bomber', aoe: 60,
    d: D('Runs towards the enemy and explodes, dealing area damage.', '衝向敵人並自爆，造成範圍傷害。'),
    lv: [[13, 15, 1, 1.4, 0, 6], [16.25, 22.5, 1, 1.4, 0, 12], [20.31, 33.75, 1, 1.4, 0, 18]] });
  def('imp', { type: 'troop', king: 'blood', en: 'Imp', zh: '小鬼', ic: '👿', atk: 'melee', spr: 'imp', size: 0.8,
    d: D('Fast and aggressive troop with many small units.', '快速而好戰的小單位大軍。'),
    lv: [[12, 1.5, 0.67, 2, 5, 13], [15, 2.25, 0.67, 2, 5, 26], [18.75, 3.38, 0.67, 2, 5, 39]] });
  def('carnage', { type: 'ench', king: 'blood', en: 'Carnage', zh: '殺戮', ic: '☠️',
    d: D('Unit explodes when killed, dealing 10% HP as area damage.', '單位死亡時爆炸，造成 10% 生命值的範圍傷害。') });
  def('sacrifice', { type: 'tome', king: 'blood', en: 'Sacrifice', zh: '獻身', ic: '🗡️', target: 'plot',
    d: D('Destroy target plot to level up adjacent plots.', '摧毀目標地塊，使相鄰地塊升 1 級。') });
  def('vampirism', { type: 'ench', king: 'blood', en: 'Vampirism', zh: '吸血', ic: '🦇',
    d: D("Unit's attacks heal it for 25% of damage dealt.", '攻擊時回復 25% 造成的傷害。') });
  def('mangler', { type: 'tower', king: 'blood', en: 'Mangler', zh: '絞肉機', ic: '⚙️', beh: 'aoe', range: 360,
    d: D('Area damage turret. Every year, sacrifices an adjacent unit per level to gain +2 damage.', '範圍傷害砲塔。每年每級犧牲 1 個相鄰單位，獲得 +2 傷害。'),
    lv: [[1, 0.29, 0], [1, 0.29, 0], [1, 0.29, 0]], radius: 55 });
  def('cemetery', { type: 'tower', king: 'blood', en: 'Cemetery', zh: '墓園', ic: '⚰️', beh: 'cemetery',
    d: D('If an adjacent unit dies in battle, summons an imp to fight in its place.', '相鄰單位陣亡時，召喚一隻小鬼代替它戰鬥。'),
    lv: [[1.5, 0.67, 0, 12], [2.25, 0.67, 0, 15], [3.38, 0.67, 0, 18.75]] });
  def('demons_altar', { type: 'tower', king: 'blood', en: "Demon's Altar", zh: '惡魔祭壇', ic: '😈', beh: 'altar',
    d: D('Summons one demon per level. For each dead ally, grows permanently 0.5% stronger.', '每級召喚 1 隻惡魔。每有一名友軍陣亡，永久 +0.5% 強度。'),
    lv: [[12.06, 0.5, 5, 50.25], [12.06, 0.63, 5, 50.25], [12.06, 0.79, 5, 50.25]] });

  /* ───────────── King of Nature ───────────── */
  def('treant', { type: 'base', king: 'nature', en: 'Treant', zh: '樹人', ic: '🌳', beh: 'treant',
    d: D('Creates a healing area on the ground that heals allies and damages enemies.', '在地面創造治療區域，治療友軍並傷害敵人。'),
    base: { dmg: 2, hps: 0.14, dmgMul: 1.3, hpsMul: 1.05, crit: 0, radius: 90, heal: 4 } });
  def('mycelium', { type: 'tower', king: 'nature', en: 'Mycelium', zh: '菌絲體', ic: '🍄', beh: 'mycelium',
    d: D('Summons a fighting spore every 9 seconds in battle. Spores accumulate every battle.', '戰鬥中每 9 秒召喚一個孢子戰士，孢子會逐場累積。'),
    lv: [[6, 0.45, 0], [9, 0.45, 0], [13.5, 0.45, 0]] });
  def('clone', { type: 'tome', king: 'nature', en: 'Clone', zh: '複製', ic: '🧬', target: 'plot', refund: true,
    d: D('Clone the card of the selected plot into your hand.', '複製所選地塊的卡片到手牌。（不結束本年）') });
  def('elf', { type: 'troop', king: 'nature', en: 'Elf', zh: '精靈', ic: '🧝', atk: 'ranged', range: 420, spr: 'archer', beh: 'farthest',
    d: D('Ranged sniper troop. Always attacks the most distant target.', '遠程狙擊手，永遠攻擊最遠的目標。'),
    lv: [[27, 20, 0.11, 1.2, 10, 3], [33.75, 25, 0.14, 1.2, 12, 6], [42.19, 31.25, 0.17, 1.2, 15, 9]] });
  def('boar', { type: 'troop', king: 'nature', en: 'Boar', zh: '野豬', ic: '🐗', atk: 'melee', spr: 'beast', beh: 'boar',
    d: D('Can be mounted by adjacent troops. For each 1 HP it has, increases rider stats by 1%.', '可被相鄰部隊騎乘。它每有 1 點生命，騎手屬性 +1%。'),
    lv: [[15, 6, 0.59, 1.6, 5, 6], [30, 6, 0.59, 1.6, 5, 12], [60, 6, 0.59, 1.6, 5, 18]] });
  def('orchard', { type: 'tower', king: 'nature', en: 'Orchard', zh: '果園', ic: '🍎', beh: 'roots', range: 400,
    d: D('Creates roots that trap enemies. 3 roots per level.', '召喚樹根困住敵人（每級 3 條）。'),
    lv: [[4, 0.1, 0, 3], [6, 0.13, 0, 6], [9, 0.16, 0, 9]] });
  def('procreate', { type: 'tome', king: 'nature', en: 'Procreate', zh: '繁衍', ic: '🥚', target: 'troop',
    d: D('Add 9 units to the selected troop.', '為所選部隊增加 9 個單位。') });
  def('forest', { type: 'building', king: 'nature', en: 'Forest', zh: '森林', ic: '🌲', fx: 'forest',
    d: D('Every year, adds +2% HP to adjacent troops.', '每年為相鄰部隊 +2% 生命值。') });
  def('poison_vial', { type: 'ench', king: 'nature', en: 'Poison Vial', zh: '毒瓶', ic: '🧪',
    d: D("Unit's attacks apply 1 poison stack to the enemy.", '攻擊使敵人中毒 1 層。') });

  /* ───────────── King of Stone ───────────── */
  def('stronghold', { type: 'base', king: 'stone', en: 'Stronghold', zh: '要塞', ic: '🧱', beh: 'stronghold',
    d: D('Summons towers that shoot nearby enemies. One arrow per Stronghold level.', '在戰鬥中不斷建造箭塔攻擊附近敵人（每級每塔 1 箭）。'),
    base: { dmg: 6, hps: 0.5, dmgMul: 1.15, hpsMul: 1.1, crit: 0 } });
  def('cauldron', { type: 'building', king: 'stone', en: 'Cauldron', zh: '大釜', ic: '⚗️', fx: 'cauldron',
    d: D("Adjacent plots' attacks now deal poison damage. One poison stack per level.", '相鄰地塊的攻擊附帶毒素（每級 1 層）。') });
  def('trebuchet', { type: 'tower', king: 'stone', en: 'Trebuchet', zh: '投石機', ic: '🪨', beh: 'trebuchet', range: 440, radius: 40,
    d: D('Multi-projectile tower. Shoots one extra projectile per construction in your kingdom.', '多彈塔。王國中每有一座建築/塔，就多射出一發石彈。'),
    lv: [[15, 0.25, 5], [15, 0.25, 5], [15, 0.25, 5]] });
  def('quarry', { type: 'building', king: 'stone', en: 'Quarry', zh: '採石場', ic: '⛏️', fx: 'quarry',
    d: D('Adds +2% damage to all towers and base every year.', '每年為所有塔與基地 +2% 傷害。') });
  def('earthworks', { type: 'tome', king: 'stone', en: 'Earthworks', zh: '土方工程', ic: '⛰️', target: 'plot', refund: true,
    d: D("Unlocks target's adjacent plots. Target's cards return to your hand, up to 3 copies.", '解鎖目標相鄰地塊，目標的卡片返回手牌（最多 3 張）。') });
  def('ballista', { type: 'troop', king: 'stone', en: 'Ballista', zh: '弩砲', ic: '🎯', atk: 'ranged', range: 380, spr: 'archer', beh: 'pierce',
    d: D('Ranged troop that shoots huge bolts with piercing damage.', '射出貫穿巨箭的遠程部隊。'),
    lv: [[14, 8, 0.08, 1, 20, 3], [17.5, 12, 0.08, 1, 25, 6], [21.88, 18, 0.08, 1, 31, 9]] });
  def('trapper', { type: 'troop', king: 'stone', en: 'Trapper', zh: '陷阱師', ic: '🪤', atk: 'melee', spr: 'rat', beh: 'trapper',
    d: D('Builds traps that inflict damage. Untriggered traps accumulate between battles.', '佈置造成傷害的陷阱，未觸發的陷阱會累積到下一場戰鬥。'),
    lv: [[3, 2, 0.17, 1, 0, 3], [3.75, 3, 0.16, 1, 0, 6], [4.69, 4.5, 0.16, 1, 0, 9]] });
  def('wallmaker', { type: 'building', king: 'stone', en: 'Wallmaker', zh: '築牆匠', ic: '🧱', fx: 'wall', wallHp: [500, 1000, 2000],
    d: D('Builds defensive walls in your kingdom.', '在王國前線建造防禦牆（500/1000/2000 生命）。') });
  def('flametower', { type: 'tower', king: 'stone', en: 'Flametower', zh: '火焰塔', ic: '🔥', beh: 'flame', range: 70, mobile: true,
    d: D('A mobile tower that moves onto the battlefield to burn enemies.', '移動式火焰塔，走上戰場焚燒敵人。'),
    lv: [[1, 10, 0], [1.2, 10, 0], [1.44, 10, 0]] });

  /* ───────────── King of Progress ───────────── */
  def('mothership', { type: 'base', king: 'progress', en: 'Mothership', zh: '母艦', ic: '🛸', beh: 'mothership',
    d: D('Flies toward enemies like a unit. Click the battlefield to steer it.', '像單位一樣飛向敵人，戰鬥中可點擊戰場操控。'),
    base: { dmg: 10, hps: 0.33, dmgMul: 1.25, hpsMul: 1, crit: 5 } });
  def('executioner', { type: 'troop', king: 'progress', en: 'Executioner', zh: '處刑者', ic: '🪓', atk: 'ranged', range: 330, spr: 'archer', beh: 'lowest',
    d: D('Ranged troop. Always attacks the enemy with the lowest health.', '遠程部隊，永遠攻擊生命最低的敵人。'),
    lv: [[17, 1, 1.25, 1.2, 5, 6], [21.25, 1.25, 1.88, 1.2, 5, 12], [26.56, 1.56, 2.81, 1.2, 5, 18]] });
  def('defender', { type: 'troop', king: 'progress', en: 'Defender', zh: '守衛', ic: '🛡', atk: 'melee', spr: 'heavy', beh: 'defender',
    d: D("Tanker unit that doesn't attack but reflects all taken damage.", '不攻擊的坦克，反彈受到的全部傷害。'),
    lv: [[32, 0, 1, 0.9, 0, 3], [64, 0, 1, 0.9, 0, 6], [128, 0, 1, 0.9, 0, 9]] });
  def('lab_rat', { type: 'troop', king: 'progress', en: 'Lab Rat', zh: '實驗鼠', ic: '🐀', atk: 'melee', spr: 'rat', size: 0.8, unlimited: true, ratGrow: 1.04,
    d: D('Disposable melee troop. Levels up whenever adjacent plots level up, with no max level.', '消耗型近戰部隊。相鄰地塊升級時同步升級，沒有等級上限。'),
    lv: [[8, 4, 0.29, 1.6, 0, 2], [8.32, 4.16, 0.29, 1.6, 0, 4], [8.65, 4.33, 0.3, 1.6, 0, 6]] });
  def('concabulator', { type: 'building', king: 'progress', en: 'Concabulator', zh: '萬能機', ic: '🧰', fx: 'conca',
    d: D('When this building reaches level 3, it levels up all your plots.', '升到 3 級時，使你所有地塊升級（之後損壞）。') });
  def('reinforce', { type: 'ench', king: 'progress', en: 'Reinforce', zh: '增援', ic: '⏫',
    d: D('Unit gains +1% damage whenever any plot levels up.', '任何地塊升級時，此單位 +1% 傷害。') });
  def('precision', { type: 'ench', king: 'progress', en: 'Precision', zh: '精準', ic: '🎯',
    d: D("Unit's first hit is always critical.", '單位的第一擊必定暴擊。') });
  def('converter', { type: 'tower', king: 'progress', en: 'Converter', zh: '轉化塔', ic: '♻️', beh: 'converter', range: 440,
    d: D('Turns enemies into rats fighting for you. Rats inherit the Converter stats.', '將敵人轉化為為你而戰的老鼠（繼承轉化塔屬性）。'),
    lv: [[4, 0.29, 0, 8], [4.16, 0.29, 0, 8.32], [4.33, 0.29, 0, 8.65]] });
  def('overhaul', { type: 'tome', king: 'progress', en: 'Overhaul', zh: '大修', ic: '🔧', target: 'plot',
    d: D('Destroy target plot to level up two random plots. Each use, one more plot is leveled up.', '摧毀目標地塊，隨機升級 2 個地塊；每次使用多升級 1 個。') });

  /* ───────────── King of Nomads ───────────── */
  def('warlord', { type: 'base', king: 'nomads', en: 'Warlord', zh: '戰爭領主', ic: '🚩', beh: 'warlord', isTroopBase: true, atk: 'ranged', range: 260, spr: 'knight', size: 1.3,
    d: D("Base and ranged troop. Shoots banners that add Warlord's stats to target allies.", '同時是基地與遠程部隊，射出戰旗將自身屬性加給友軍。'),
    lv: [[30, 6, 0.4, 1.2, 5, 3], [45, 9, 0.4, 1.2, 5, 6], [67, 13.5, 0.4, 1.2, 5, 9]], guess: true });
  def('mob', { type: 'troop', king: 'nomads', en: 'Mob', zh: '暴民', ic: '👥', atk: 'ranged', range: 190, spr: 'archer',
    d: D('Stone-throwing units. Gain a unit whenever a different adjacent card gains one.', '投石單位。相鄰的不同卡片每新增一個單位，它就 +1 單位。'),
    lv: [[10, 3, 0.7, 1.4, 5, 6], [12.5, 4, 0.8, 1.4, 5, 12], [15.6, 5.2, 0.9, 1.4, 5, 18]], guess: true });
  def('raptor', { type: 'troop', king: 'nomads', en: 'Raptor', zh: '迅猛龍', ic: '🦖', atk: 'melee', spr: 'beast', beh: 'raptor', size: 1.1,
    d: D('Can be mounted by adjacent troops. Sums its stats with rider and pierces through the frontline.', '可被相鄰部隊騎乘，與騎手屬性相加，並直衝穿過前線。'),
    lv: [[20, 5, 0.6, 2.4, 5, 6], [25, 6.5, 0.6, 2.4, 5, 12], [31, 8.4, 0.6, 2.4, 5, 18]], guess: true });
  def('frost', { type: 'ench', king: 'nomads', en: 'Frost', zh: '寒霜', ic: '❄️',
    d: D("Attacks slow the enemy's movement and attack speed by 20%.", '攻擊使敵人移動與攻速降低 20%。') });
  def('dragons_den', { type: 'tower', king: 'nomads', en: "Dragon's Den", zh: '龍穴', ic: '🐉', beh: 'dragon', range: 460,
    d: D('Summons powerful single-strike dragons. Gets 20% stronger each time a plot is destroyed.', '召喚一擊必殺的巨龍。每摧毀一個地塊強度 +20%。'),
    lv: [[60, 0.12, 5], [90, 0.12, 5], [135, 0.12, 5]], guess: true });
  def('camp', { type: 'building', king: 'nomads', en: 'Camp', zh: '營地', ic: '⛺', fx: 'camp',
    d: D("When a card is placed on an empty plot, Camp's adjacent plots gain +2% to all stats.", '每當有卡片放到空地塊，營地相鄰地塊全屬性 +2%（每級疊加）。') });
  def('migration', { type: 'tome', king: 'nomads', en: 'Migration', zh: '遷徙', ic: '🧭', target: 'plot',
    d: D('Moves target to an empty adjacent plot. Moved card gains +10% damage and HP.', '將目標移到相鄰空地塊，移動的卡片 +10% 傷害與生命。') });
  def('swords', { type: 'tome', king: 'nomads', en: 'Swords', zh: '刀劍', ic: '⚔️', target: 'plot',
    d: D('Adds 5 damage or 5% damage to target, whichever is higher.', '目標 +5 傷害或 +5% 傷害（取較高者）。') });
  def('shields', { type: 'tome', king: 'nomads', en: 'Shields', zh: '盾牌', ic: '🔰', target: 'plot',
    d: D('Adds 5 HP or 5% HP to target, whichever is higher.', '目標 +5 生命或 +5% 生命（取較高者）。') });

  /* ───────────── Rainbow Army（特殊卡） ───────────── */
  def('razing', { type: 'tome', king: 'rainbow', en: 'Razing', zh: '夷平', ic: '🌋', target: 'plot',
    d: D('Destroys target plot forever. Automatically triggers a Royal Council event.', '永久摧毀目標地塊，並自動觸發一次王室議會。') });
  def('shrine', { type: 'building', king: 'rainbow', en: 'Shrine', zh: '神龕', ic: '⛩', fx: 'shrine',
    d: D('Spends 9 gold every year to level up one random plot. Costs 3 less gold per level.', '每年花 9 金幣升級一個隨機地塊，每級便宜 3 金幣。') });
  def('unify', { type: 'tome', king: 'rainbow', en: 'Unify', zh: '合一', ic: '🔗', target: 'plot',
    d: D('Sacrifices all troops adjacent to target. Target plot gains the number of units sacrificed.', '犧牲目標相鄰的所有部隊，目標獲得等量單位。') });
  def('temple', { type: 'building', king: 'rainbow', en: 'Temple', zh: '神殿', ic: '🛕', fx: 'temple',
    d: D('Increases 10% of a random stat of a random plot.', '每年隨機使一個地塊的隨機屬性 +10%。') });
  def('haste', { type: 'tome', king: 'rainbow', en: 'Haste', zh: '加速', ic: '💨', target: 'troop',
    d: D("Increases target's movement speed by 200%.", '目標移動速度 +200%。') });
  def('echoform', { type: 'tome', king: 'rainbow', en: 'Echoform', zh: '回響', ic: '🪞', target: 'plot',
    d: D('Duplicates target plot and all its stats to one empty adjacent plot.', '將目標地塊與其全部屬性複製到相鄰空地塊。') });
  def('gigantify', { type: 'tome', king: 'rainbow', en: 'Gigantify', zh: '巨大化', ic: '🦣', target: 'troop',
    d: D('Doubles the size, damage, and HP of target troop.', '目標部隊體型、傷害、生命翻倍。') });
  def('patronage', { type: 'tome', king: 'rainbow', en: 'Patronage', zh: '庇護', ic: '🎖️', target: 'none',
    d: D('Levels up your base plot by 3 levels.', '基地地塊升 3 級。') });
  def('xray', { type: 'tome', king: 'rainbow', en: 'X-Ray', zh: 'X 光', ic: '✖️', target: 'plot',
    d: D('Levels up all plots diagonal to the target plot.', '目標斜向的所有地塊升 1 級。') });
  def('scapegoat', { type: 'troop', king: 'rainbow', en: 'Scapegoat', zh: '代罪羔羊', ic: '🐐', atk: 'melee', spr: 'beast', beh: 'scapegoat',
    d: D('Passive backline unit. If killed in battle, generates 3 gold per level.', '待在後排的被動單位，陣亡時每級產生 3 金幣。'),
    lv: [[30, 1, 1, 1, 0, 9], [30, 1, 1, 1, 0, 18], [30, 1, 1, 1, 0, 27]] });
  def('ogre', { type: 'troop', king: 'rainbow', en: 'Ogre', zh: '食人魔', ic: '👹', atk: 'melee', spr: 'heavy', size: 1.4, beh: 'ogre',
    d: D('Lonely unit. Every year, increases stats for each adjacent empty plot.', '孤僻的單位。每年每有一個相鄰空地塊，全屬性提升。'),
    lv: [[20, 4, 0.25, 0.9, 5, 3], [24, 4.8, 0.28, 0.9, 5, 6], [28.8, 5.76, 0.3, 0.9, 5, 9]] });
  def('slime', { type: 'troop', king: 'rainbow', en: 'Slime', zh: '史萊姆', ic: '🟢', atk: 'melee', spr: 'slime', beh: 'slime',
    d: D('Proliferating troop that multiplies itself to one empty adjacent plot every year.', '每年複製自己到一個相鄰空地塊。'),
    lv: [[14, 1.5, 0.71, 1, 5, 3], [17.5, 2.25, 0.71, 1, 5, 6], [21.88, 3.88, 0.71, 1, 5, 9]] });

  /* ───────────── 特殊：垃圾牌（Junkyard 詔令用） ───────────── */
  def('trash', { type: 'tome', king: 'none', en: 'Junk', zh: '廢料', ic: '🗑️', target: 'plot', junk: true,
    d: D('Useless junk. Throw it into the pit.', '沒用的廢料，丟進坑洞吧。') });
})(globalThis.NK = globalThis.NK || {});
