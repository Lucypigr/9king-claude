/* 9 Kings – 介面與遊戲流程控制（瀏覽器） */
(function (NK) {
  'use strict';
  const G = NK.G, C = NK.CARDS, K = NK.KINGS, R = NK.R, tr = NK.tr;
  const $ = (s, r) => (r || document).querySelector(s);
  const UI = (NK.UI = {});
  const EMB = { nothing: '🤴', spells: '🧙', greed: '💰', blood: '🩸', nature: '🌿', stone: '⛰️', progress: '⚙️', nomads: '🐎', rainbow: '🌈' };
  const KTYPE_ICON = { base: '🏰', troop: '⚔', building: '🏠', tower: '🗼', ench: '✨', tome: '📖' };

  let S = null, B = null, sel = null, speed = 1, expand = null, prophecyMarks = null, bgKey = '', bgCanvas = null, raf = 0, lastT = 0, acc = 0, battleEnding = false;
  let pickKing = 'nothing', pickDiff = 'peasant', use3d = false, last3 = 0;
  const SAVE = 'nineKings.save.v1';

  function h(tag, cls, html, parent) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (parent) parent.appendChild(e); return e; }
  const nm = (o) => NK.name(o);
  const cname = (id) => nm(C[id]);
  const cdesc = (id) => NK.t(C[id].d);
  const kcol = (k) => (K[k] ? K[k].color : '#888');

  /* ───── 縮放舞台 ───── */
  function fit() { const s = Math.min(innerWidth / 1280, innerHeight / 800); const st = $('#stage'); st.style.transform = `translate(-50%,-50%) scale(${s})`; UI.scale = s; }
  addEventListener('resize', fit);

  /* ───── 提示 ───── */
  function tipShow(html, ev) { const t = $('#tip'); t.innerHTML = html; t.hidden = false; tipMove(ev); }
  function tipMove(ev) { const t = $('#tip'), st = $('#stage').getBoundingClientRect(), s = UI.scale || 1; let x = (ev.clientX - st.left) / s + 16, y = (ev.clientY - st.top) / s + 12; const w = t.offsetWidth, hh = t.offsetHeight; if (x + w > 1270) x = (ev.clientX - st.left) / s - w - 16; if (y + hh > 790) y = 790 - hh; t.style.left = x + 'px'; t.style.top = Math.max(4, y) + 'px'; }
  function tipHide() { $('#tip').hidden = true; }
  function attachTip(elm, fn) { elm.addEventListener('mouseenter', (e) => { const html = fn(); if (html) tipShow(html, e); }); elm.addEventListener('mousemove', tipMove); elm.addEventListener('mouseleave', tipHide); }
  function toast(msg) { const t = h('div', '', msg, $('#toast')); setTimeout(() => t.remove(), 2500); }

  /* ───── 卡片元件 ───── */
  function cardEl(id, o) {
    o = o || {}; const cd = C[id];
    const e = h('div', `card t-${cd.type} ${o.size || ''} ${cd.king === 'rainbow' ? 'rainbow' : ''}`);
    e.style.setProperty('--kc', kcol(cd.king));
    const th = NK.V3.ok ? NK.V3.thumb(id) : null;
    e.innerHTML = `<div class="c-head"><span>${cname(id)}</span><span class="c-type">${NK.typeName(cd.type)}</span></div>
      <div class="c-art ${th ? 'has3d' : ''}">${th ? `<img class="c-img" src="${th}" alt="">` : `<span class="c-emoji">${cd.ic}</span>`}</div><div class="c-desc">${cdesc(id)}</div>
      <div class="c-foot"><span>${K[cd.king] ? nm(K[cd.king]).replace(/^King of |之王$/g, '') : ''}</span><span>${cd.guess ? '≈' : ''}</span></div>`;
    if (o.count > 1) h('span', 'cnt', '×' + o.count, e);
    attachTip(e, () => cardTip(id));
    return e;
  }
  function cardTip(id) {
    const cd = C[id]; let s = `<h4>${cd.ic} ${cname(id)}</h4><div class="t">${NK.typeName(cd.type)} · ${K[cd.king] ? nm(K[cd.king]) : ''}</div><div>${cdesc(id)}</div>`;
    if (cd.lv && (cd.type === 'troop')) { s += '<table>'; cd.lv.forEach((r, i) => { s += `<tr><td>Lv${i + 1}</td><td>${tr('hp')} ${r[0]} · ${tr('dmg')} ${r[1]} · ${tr('hps')} ${r[2]} · ×${r[5] || '?'}</td></tr>`; }); s += '</table>'; }
    if (cd.guess) s += `<div class="t">${NK.lang === 'zh' ? '≈ 此卡數值為估算（wiki 未提供）' : '≈ stats estimated (not on wiki)'}</div>`;
    return s;
  }

  function plotTip(p) {
    const cd = C[p.card], st = G.unitStats(S, p);
    let s = `<h4>${cd.ic} ${cname(p.card)} · ${tr('level')} ${p.level}</h4><div class="t">${NK.typeName(cd.type)}</div><div>${cdesc(p.card)}</div><table>`;
    const f = (v) => (Math.round(v * 100) / 100);
    if (cd.type === 'troop' || cd.isTroopBase) s += `<tr><td>${tr('units')}</td><td>${st.count}</td></tr><tr><td>${tr('hp')}</td><td>${f(st.hp)}</td></tr><tr><td>${tr('dmg')}</td><td>${f(st.dmg)}</td></tr><tr><td>${tr('hps')}</td><td>${f(st.hps)}</td></tr><tr><td>${tr('spd')}</td><td>${f(st.spd)}</td></tr><tr><td>${tr('crit')}</td><td>${f(st.crit)}%</td></tr>`;
    else if (cd.type === 'tower' || cd.type === 'base') s += `<tr><td>${tr('dmg')}</td><td>${f(st.dmg)}</td></tr><tr><td>${tr('hps')}</td><td>${f(st.hps)}</td></tr><tr><td>${tr('crit')}</td><td>${f(st.crit)}%</td></tr>`;
    s += '</table>';
    const en = Object.keys(p.ench); if (en.length) s += '<div>' + en.map(k => `${C[k].ic}${cname(k)}×${p.ench[k]}`).join('  ') + '</div>';
    return s;
  }

  /* ───── 頂欄 ───── */
  function renderTop() {
    const T = $('#topbar'); const k = K[S.king], fin = NK.CONST.FINAL_YEAR;
    const hearts = '❤️'.repeat(Math.max(0, S.lives)) + '🖤'.repeat(Math.max(0, S.maxLives - S.lives));
    const dec = Object.keys(S.decrees).filter(id => NK.DECREE_BY_ID[id]).map(id => `<span class="dchip" data-d="${id}">${nm(NK.DECREE_BY_ID[id])}${S.decrees[id] > 1 ? '×' + S.decrees[id] : ''}</span>`).join('');
    T.innerHTML = `<div class="kemb"><span class="em">${EMB[S.king]}</span><b>${nm(k)}</b></div>
      <div class="yr">${tr('year')} ${S.year}${S.endless ? '' : `<small> / ${fin}</small>`}</div>
      <div class="hearts" title="${tr('lives')}">${hearts}</div><div class="gold">🪙 ${S.gold}</div>
      <div class="decrees">${dec}</div><div class="sp"></div>
      <button class="btn sm" id="bAim" style="display:none"></button><button class="btn sm" id="bMenu">☰ ${tr('menu')}</button>`;
    T.querySelectorAll('.dchip').forEach(c => attachTip(c, () => { const d = NK.DECREE_BY_ID[c.dataset.d]; return `<h4>${nm(d)}</h4><div>${NK.t(d.d)}</div>`; }));
    $('#bMenu').onclick = openMenu;
  }

  /* ───── 網格 ───── */
  function renderGrid() {
    const grid = $('#grid'); grid.innerHTML = '';
    const cands = expand ? expand.cells : null;
    const lay = NK.layout(S, cands);
    grid.style.setProperty('--cs', lay.cs);
    const key = lay.right + ':' + S.king;
    if (!use3d && key !== bgKey) { bgKey = key; bgCanvas = R.makeBackground(lay, K[S.king].dark); const c = $('#bg'), x = c.getContext('2d'); x.clearRect(0, 0, 1280, 620); x.drawImage(bgCanvas, 0, 0); }
    const valid = new Set(); const selTargets = sel ? G.validTargets(S, sel) : null;
    if (selTargets) selTargets.forEach(([r, c]) => valid.add(r + ',' + c));
    if (S.phase === 'setup') for (let r = 0; r < NK.CONST.GRID; r++) for (let c = 0; c < NK.CONST.GRID; c++) if (G.isOpen(S, r, c) && !S.grid[r][c]) valid.add(r + ',' + c);
    const pm = new Set((prophecyMarks || []).map(([r, c]) => r + ',' + c));
    for (let r = 0; r < NK.CONST.GRID; r++) for (let c = 0; c < NK.CONST.GRID; c++) {
      const isC = cands && cands.some(x => x[0] === r && x[1] === c);
      if (!S.open[r][c] && !isC) continue;
      const pos = lay.pos(r, c), size = lay.cs - 10;
      const p = S.grid[r][c];
      const e = h('div', 'plot', null, grid);
      if (use3d) { const q = NK.V3.plotRect(lay, r, c); e.style.cssText = `left:${q.x}px;top:${q.y}px;width:${q.w}px;height:${q.h}px;`; e.classList.add('p3'); }
      else e.style.cssText = `left:${pos.x - size / 2}px;top:${pos.y - size / 2}px;width:${size}px;height:${size}px;`;
      e.dataset.r = r; e.dataset.c = c;
      if (isC) { e.classList.add('candidate'); e.onclick = () => onExpand(r, c); continue; }
      if (S.razed[r][c]) e.classList.add('locked-razed');
      if (pm.has(r + ',' + c)) e.classList.add('prophecy');
      if (!p) { e.classList.add('empty'); if (valid.has(r + ',' + c)) { e.classList.add('valid'); } e.onclick = () => onPlot(r, c); continue; }
      const cd = C[p.card];
      e.classList.add('filled'); e.style.setProperty('--tc', { troop: '#c4583c', building: '#78a656', tower: '#8b96ab', base: '#e3b23a' }[cd.type] || '#888');
      if (cd.isTroopBase) e.style.setProperty('--tc', '#e3b23a');
      const en = Object.keys(p.ench).map(k => `<span>${C[k].ic}${p.ench[k] > 1 ? p.ench[k] : ''}</span>`).join('');
      const cnt = (cd.type === 'troop' || cd.isTroopBase) ? `<div class="p-cnt" data-cnt="1">${cd.gold15 ? G.unitStats(S, p).count : p.units}</div>` : '';
      e.innerHTML = `<div class="p-name">${cname(p.card)}</div>${use3d ? '' : `<div class="p-art">${cd.ic}</div>`}<div class="p-ench">${en}</div>${use3d ? '' : `<div class="p-lv">${'★'.repeat(Math.min(p.level, 6))}${p.level > 6 ? '+' + (p.level - 6) : ''}</div>`}${cnt}`;
      if (valid.has(r + ',' + c)) e.classList.add('valid');
      e.onclick = () => onPlot(r, c);
      attachTip(e, () => plotTip(p));
    }
    if (use3d) NK.V3.setPlots(S, lay, { valid, cands, prophecy: pm });
  }

  /* ───── 手牌 / 操作列 ───── */
  function renderHand() {
    const hand = $('#hand'); hand.innerHTML = '';
    const canPlay = S.phase === 'play' || S.phase === 'setup';
    if (!S.hand.length) h('div', 'info', tr('emptyHand'), hand).style.color = 'var(--mute)';
    for (const it of S.hand) {
      const e = cardEl(it.id, { size: 'sm', count: it.n });
      if (sel === it.id) e.classList.add('sel');
      if (!canPlay) e.classList.add('dis');
      e.onclick = (ev) => { ev.stopPropagation(); if (canPlay) selectCard(it.id); };
      e.oncontextmenu = (ev) => { ev.preventDefault(); if (canPlay && S.phase === 'play') { /* 右鍵：丟進坑洞 */ } };
      hand.appendChild(e);
    }
    const A = $('#actions'); A.innerHTML = '';
    if (S.phase === 'play') {
      h('div', 'info', `${tr('usesLeft')}: <b>${S.uses > 100 ? '∞' : S.uses}</b>`, A);
      const pit = h('button', 'btn sm', '🕳 ' + tr('pit'), A); pit.disabled = !sel; pit.onclick = () => { if (!sel) return; const id = sel; G.pit(S, id); sel = null; toast('🕳 +' + (9 * Math.pow(3, G.dc(S, 'salvage'))) + ' 🪙'); afterPlay(); };
      if (S.year === NK.CONST.FINAL_YEAR && !S.endless || S.uses > 100) { const b = h('button', 'btn primary', tr('startBattle'), A); b.onclick = startBattle; }
    } else if (S.phase === 'battle') {
      const row = h('div', '', '', A); row.style.cssText = 'display:flex;gap:4px;justify-content:center;align-items:center';
      h('span', 'info', tr('speed'), row);
      [1, 2, 4].forEach(v => { const b = h('button', 'btn sm', '×' + v, row); if (speed === v) b.classList.add('primary'); b.onclick = () => { speed = v; renderHand(); }; });
      const sk = h('button', 'btn sm', '⏩ ' + tr('skipBattle'), A); sk.onclick = () => { speed = 24; renderHand(); };
      h('div', 'info', tr('aimHint'), A);
    }
  }

  /* ───── 敵軍預覽 ───── */
  function renderPreview() {
    const P = $('#preview'); const cur = S.cur;
    if (!cur || (S.phase !== 'play' && S.phase !== 'battle' && S.phase !== 'events')) { P.hidden = true; return; }
    P.hidden = false; const wave = cur.wave, k = K[wave.king];
    let rows = wave.specs.map(sp => { const cd = C[sp.card]; const ic = R.iconCanvas(cd.spr || 'knight', k.color, 3); return `<span class="u"><img src="${ic.toDataURL()}" width="24" height="29" style="image-rendering:pixelated"> ${sp.boss ? '👑' : '×' + sp.count}</span>`; }).join('');
    P.innerHTML = `<h4>${EMB[wave.king]} ${tr('enemy')}: ${nm(k)}</h4><div class="row">${rows}</div>`;
    if (S.phase === 'battle' && B) { const left = B.u.filter(u => u.alive && u.side === 1).length; P.innerHTML += `<div>${tr('kills')}: ${B.kills}　⚔ ${left}</div>`; }
  }

  function banner(txt) { const b = $('#banner'); if (!txt) { b.classList.remove('show'); return; } b.textContent = txt; b.classList.add('show'); }
  function renderAll() { renderTop(); renderGrid(); renderHand(); renderPreview(); }
  function save() { try { if (S && !S.done) localStorage.setItem(SAVE, G.serialize(S)); else localStorage.removeItem(SAVE); } catch (e) { /* ignore */ } }

  /* ───── 選牌 / 出牌 ───── */
  function selectCard(id) {
    if (S.phase !== 'play' && S.phase !== 'setup') return;
    if (sel === id) { cancelSel(); return; }
    const cd = C[id];
    if (S.phase === 'setup' && cd.type !== 'base') return;
    if (cd.type === 'tome' && cd.target === 'none') { if (confirm(`${cname(id)}?`)) { doPlay(id); } return; }
    sel = id; banner(tr('selectTarget')); renderGrid(); renderHand();
    if (!G.validTargets(S, id).length && S.phase !== 'setup') { toast('⚠ ' + (NK.lang === 'zh' ? '沒有可用目標' : 'No valid target')); }
  }
  function cancelSel() { sel = null; banner(S && S.phase === 'setup' ? tr('placeBase') : ''); if (S) { renderGrid(); renderHand(); } }
  function onPlot(r, c) {
    if (S.phase === 'setup') { doPlay(K[S.king].base, r, c); return; }
    if (!sel || S.phase !== 'play') return;
    if (!G.canTarget(S, sel, r, c)) return;
    doPlay(sel, r, c);
  }
  function doPlay(id, r, c) {
    const setup = S.phase === 'setup';
    const res = G.play(S, id, r, c);
    if (!res.ok) { toast('⚠ ' + res.msg); return; }
    sel = null; banner('');
    if (setup) { G.makeLoot(S, S.king); save(); afterState(); return; }
    afterPlay();
  }
  function afterPlay() {
    sel = null; banner('');
    if (S.uses <= 0 || !S.hand.length) { renderAll(); setTimeout(startBattle, 250); }
    else { save(); renderAll(); }
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cancelSel(); });
  document.addEventListener('contextmenu', (e) => { if (sel) { e.preventDefault(); cancelSel(); } });

  /* ───── 流程分派 ───── */
  function afterState() {
    tipHide();
    if (S.done) return gameEnd();
    switch (S.phase) {
      case 'setup': renderAll(); banner(tr('placeBase')); sel = null; break;
      case 'loot': renderAll(); showLoot(); break;
      case 'events': renderAll(); runEvents(); break;
      case 'play': G.previewWave(S); renderAll(); save(); if (S.year === NK.CONST.FINAL_YEAR && !S.endless) banner(tr('final') + ' ' + tr('finalHint')); break;
      default: renderAll();
    }
  }

  /* ───── 彈窗工具 ───── */
  function modal(build) { const o = $('#overlay'); o.innerHTML = ''; o.hidden = false; const m = h('div', 'modal', null, o); build(m); return m; }
  function closeModal() { const o = $('#overlay'); o.hidden = true; o.innerHTML = ''; tipHide(); }

  /* ───── 戰利品 ───── */
  function showLoot() {
    const L = S.loot; if (!L) return afterState();
    modal((m) => {
      m.innerHTML = `<h2>${tr('pickLoot')}</h2><p class="hint">${tr('lootFrom')}：${EMB[L.king]} ${nm(K[L.king])}</p>`;
      const row = h('div', 'row', null, m);
      for (const id of L.options) { const c = cardEl(id, { size: 'big' }); c.onclick = () => { closeModal(); G.pickLoot(S, id); toast('+ ' + cname(id)); save(); afterState(); }; row.appendChild(c); }
      const f = h('div', 'foot', null, m);
      const cost = G.rerollCost(S);
      const rb = h('button', 'btn', `🎲 ${tr('reroll')} (${cost === 0 ? tr('free') : cost + '🪙'})`, f); rb.disabled = S.gold < cost && S.freeRerolls <= 0 && !(G.dc(S, 'payroll') && !S.payrollUsed);
      rb.onclick = () => { if (G.rerollLoot(S)) { renderTop(); showLoot(); } };
    });
  }

  /* ───── 事件 ───── */
  function runEvents() {
    const e = G.nextEvent(S);
    if (!e) { closeModal(); return afterState(); }
    const nxt = () => { renderAll(); runEvents(); };
    ({ council: evCouncil, merchant: evMerchant, prophet: evProphet, blessing: evBlessing, diplomat: evDiplomat, tower: evTower, final: evFinal }[e] || nxt)(nxt);
  }
  function evFinal(next) { modal((m) => { m.innerHTML = `<h2>⚔ ${tr('final')}</h2><p class="hint">${tr('finalHint')}</p>`; const f = h('div', 'foot', null, m); h('button', 'btn primary', 'OK', f).onclick = () => { closeModal(); next(); }; }); }

  function evCouncil(next, picks) {
    picks = picks || (S.longtermism ? 3 : 1); if (S.longtermism) S.longtermism = false;
    const pool = G.councilOptions(S);
    let left = picks;
    const draw = () => modal((m) => {
      m.innerHTML = `<h2>👑 ${tr('council')}</h2><p class="hint">${tr('councilHint')}${picks > 1 ? ` (${left}/${picks})` : ''}</p>`;
      const row = h('div', 'row', null, m);
      pool.forEach((d, i) => {
        const c = h('div', 'decreeCard' + (d.kind === 'rainbow' ? ' rainbow' : ''), `<div class="tag">${d.kind === 'king' ? nm(K[d.king]) : d.kind === 'rainbow' ? '🌈' : (NK.lang === 'zh' ? '通用' : 'Universal')} · ${NK.lang === 'zh' ? '上限' : 'max'} ${d.max}</div><h3>${nm(d)}</h3><p>${NK.t(d.d)}</p>`, row);
        c.onclick = () => { G.applyDecree(S, d.id); toast('📜 ' + nm(d)); pool.splice(i, 1); left--; renderAll(); if (left > 0 && pool.length) draw(); else { closeModal(); next(); } };
      });
    });
    draw();
  }

  function evMerchant(next) {
    const type = S.rng.pick(['architect', 'sage', 'warmonger']);
    const names = { architect: ['建築師', 'Architect'], sage: ['賢者', 'Sage'], warmonger: ['戰爭販子', 'Warmonger'] }[type][NK.lang === 'zh' ? 0 : 1];
    let offers = G.merchantOffers(S, type); const bought = new Set();
    const draw = () => modal((m) => {
      m.innerHTML = `<h2>🃏 ${tr('merchant')} — ${names}</h2><p class="hint">${tr('merchantHint')}　🪙 ${S.gold}</p>`;
      const row = h('div', 'row', null, m); const price = G.merchantPrice(S);
      offers.forEach((id, i) => {
        const w = h('div', '', null, row); const c = cardEl(id, { size: '' }); w.appendChild(c);
        h('div', 'priceTag', bought.has(i) ? '✔' : `🪙 ${price}`, w);
        if (bought.has(i) || S.gold < price) c.classList.add('dis');
        c.onclick = () => { if (bought.has(i) || S.gold < price) return; if (G.buyCard(S, id)) { bought.add(i); toast('+ ' + cname(id) + ' (+1 ' + (NK.lang === 'zh' ? '出牌' : 'play') + ')'); renderTop(); draw(); } };
      });
      const f = h('div', 'foot', null, m);
      h('button', 'btn primary', tr('done'), f).onclick = () => { closeModal(); next(); };
    });
    draw();
  }

  function evProphet(next) {
    const pr = G.startProphecy(S), b = NK.BLESSINGS[pr.id]; prophecyMarks = pr.targets; renderGrid();
    modal((m) => { m.innerHTML = `<h2>🔮 ${tr('prophet')}</h2><p class="hint">${NK.lang === 'zh' ? '九年後（第 16 年）降臨的祝福：' : 'A blessing will fall in year 16:'}</p><div class="bigres" style="font-size:34px">${b.ic} ${nm(b)}</div><p>${NK.t(b.d)}</p><p class="statline">${b.n ? (NK.lang === 'zh' ? '目標地塊已標成藍色——記得在那裡放好卡片！' : 'Target plots are marked in blue – fill them before then!') : ''}</p>`; const f = h('div', 'foot', null, m); h('button', 'btn primary', 'OK', f).onclick = () => { closeModal(); next(); }; });
  }
  function evBlessing(next) {
    const r = G.resolveBlessing(S), b = NK.BLESSINGS[r.id]; prophecyMarks = null; renderAll();
    modal((m) => { m.innerHTML = `<h2>${b.ic} ${tr('blessing')}: ${nm(b)}</h2><p class="hint">${NK.t(b.d)}</p><div class="bigres ${r.ok ? 'win' : 'lose'}">${r.ok ? '✔' : '✘'}</div>`; const f = h('div', 'foot', null, m); h('button', 'btn primary', 'OK', f).onclick = () => { closeModal(); next(); }; });
  }

  function evDiplomat(next) {
    let step = 1, out = null;
    const draw = () => modal((m) => {
      if (step === 1) {
        m.innerHTML = `<h2>🕊 ${tr('diplomat')}</h2><p class="hint">${tr('diplomatHint')}</p>`;
        const row = h('div', 'row', null, m);
        S.opponents.forEach((k, i) => { const b = h('div', 'kingBtn', `<div class="em">${EMB[k]}</div><div class="n">${nm(K[k])}</div>`, row); b.style.cssText = `--kc:${K[k].color};--kd:${K[k].dark}`; b.onclick = () => { out = i; step = 2; draw(); }; });
        h('div', 'foot', null, m).appendChild(Object.assign(h('button', 'btn', tr('skip')), { onclick: () => { closeModal(); next(); } }));
      } else {
        const cand = S.rng.shuffle(NK.KING_ORDER.filter(k => k !== S.king && !S.opponents.includes(k))).slice(0, 3);
        m.innerHTML = `<h2>⚔ ${tr('diplomat')}</h2><p class="hint">${NK.lang === 'zh' ? '選擇新的敵人' : 'Choose a new enemy'}</p>`;
        const row = h('div', 'row', null, m);
        cand.forEach(k => { const b = h('div', 'kingBtn', `<div class="em">${EMB[k]}</div><div class="n">${nm(K[k])}</div>`, row); b.style.cssText = `--kc:${K[k].color};--kd:${K[k].dark}`; b.onclick = () => { S.opponents[out] = k; S.cur = null; closeModal(); toast(EMB[k] + ' ' + nm(K[k])); next(); }; });
      }
    });
    draw();
  }

  function evTower(next) {
    const free = S.year <= NK.CONST.FINAL_YEAR;
    const cells = G.expandCandidates(S); if (!cells.length) return next();
    expand = { cells, free }; renderGrid();
    banner(tr('towerHint') + (free ? '' : ` (${NK.CONST.EXPAND_COST}🪙)`));
    expand.done = () => { expand = null; banner(''); renderAll(); next(); };
    const f = h('div', '', null, $('#field')); f.id = 'expandBar'; f.style.cssText = 'position:absolute;left:50%;bottom:10px;transform:translateX(-50%);z-index:6;display:flex;gap:8px';
    h('button', 'btn', tr('skip'), f).onclick = () => { f.remove(); expand.done(); };
    expand.bar = f;
  }
  function onExpand(r, c) {
    if (!expand) return;
    if (!expand.free && !G.buyExpand(S, r, c)) { toast('🪙 ✘'); return; }
    if (expand.free) G.unlockPlot(S, r, c);
    if (expand.bar) expand.bar.remove(); const d = expand.done; d();
  }

  /* ───── 戰鬥 ───── */
  function startBattle() {
    if (S.phase !== 'play' && S.phase !== 'events') return;
    if (!S.cur) G.planBattle(S);
    S.phase = 'battle'; sel = null; banner(''); prophecyMarks = null; tipHide();
    B = new NK.Battle(S, S.cur.wave); speed = 1; acc = 0; lastT = performance.now(); battleEnding = false;
    if (use3d) NK.V3.setBattle(B);
    renderAll(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  }
  function loop(t) {
    const dt = Math.min(0.1, (t - lastT) / 1000); lastT = t; acc += dt * speed;
    let n = 0; while (acc >= 0.05 && n++ < 40 && !B.done) { B.step(0.05); acc -= 0.05; }
    if (B.t > 180 && !B.done) { B.baseHit = true; }
    const ctx = $('#fx').getContext('2d'); if (!use3d) { ctx.clearRect(0, 0, 1280, 620); R.drawBattle(ctx, B, { aim: B.aim }); }
    updateBattlePlots();
    if (B.done && !battleEnding) { battleEnding = true; renderPreview(); setTimeout(endBattle, 900); }
    if (!B.done || battleEnding) raf = requestAnimationFrame(loop);
    if (B.done && !use3d) { ctx.clearRect(0, 0, 1280, 620); R.drawBattle(ctx, B, {}); }
    if ((B.tick = (B.tick || 0) + 1) % 15 === 0) renderPreview();
  }
  function updateBattlePlots() {
    document.querySelectorAll('.plot.filled').forEach(e => {
      const p = S.grid[+e.dataset.r][+e.dataset.c]; const arr = p && B && B.byPlot.get(p.id); if (!arr) return;
      const cnt = e.querySelector('[data-cnt]'); if (cnt) { let n = 0; for (const u of arr) if (u.alive) n += u.k || 1; cnt.textContent = Math.round(n); }
    });
  }
  function endBattle() {
    cancelAnimationFrame(raf); const res = B.result || { win: B.win, kills: B.kills, gold: 0 };
    const rainbow = S.cur.king === 'rainbow', final = S.cur.final;
    modal((m) => {
      m.innerHTML = `<div class="bigres ${res.win ? 'win' : 'lose'}">${res.win ? '⚔ ' + tr('victory') : '💀 ' + tr('defeat')}</div>
        <div class="statline">${tr('kills')}: ${res.kills}　·　${Math.round(res.time)}s${res.gold ? '　·　+' + res.gold + '🪙' : ''}</div>`;
      const f = h('div', 'foot', null, m); h('button', 'btn primary', 'OK', f).onclick = () => { closeModal(); B = null; if (use3d) NK.V3.setBattle(null); const r = G.finishBattle(S, { win: res.win }); $('#fx').getContext('2d').clearRect(0, 0, 1280, 620); save(); afterState(); };
    });
  }
  function gameEnd() {
    try { localStorage.removeItem(SAVE); } catch (e) { /* */ }
    renderAll();
    modal((m) => {
      m.innerHTML = `<div class="bigres ${S.won ? 'win' : 'lose'}">${S.won ? '👑 ' + tr('champion') : '⚰ ' + tr('gameOver')}</div>
        <div class="statline">${nm(K[S.king])} · ${nm(S.diff)} · ${tr('year')} ${S.year}</div><div class="statline">${tr('kills')}: ${S.stats.kills}</div>`;
      const f = h('div', 'foot', null, m);
      if (S.won) h('button', 'btn', tr('endless'), f).onclick = () => { closeModal(); G.continueEndless(S); save(); afterState(); };
      h('button', 'btn primary', tr('again'), f).onclick = () => { closeModal(); showScreen('select'); };
      h('button', 'btn', tr('toTitle'), f).onclick = () => { closeModal(); showScreen('title'); };
    });
  }

  /* 點擊戰場：瞄準 / 操控基地 */
  function initFieldClick() {
    const f = $('#field');
    f.addEventListener('pointerdown', (ev) => {
      if (!B || B.done) return; const r = f.getBoundingClientRect(), s = r.width / 1280;
      let x = (ev.clientX - r.left) / s, y = (ev.clientY - r.top) / s;
      if (use3d) { const w = NK.V3.pick(ev.clientX, ev.clientY, r); if (!w) return; x = w.x; y = w.y; }
      if (x < B.lay.right + 30) return; B.aim = { x, y }; B.aimT = 3;
    });
  }

  /* ───── 選單 ───── */
  function openMenu() {
    modal((m) => {
      m.innerHTML = `<h2>☰ ${tr('menu')}</h2>`; const f = h('div', 'foot', null, m); f.style.flexDirection = 'column';
      h('button', 'btn big', tr('resume'), f).onclick = closeModal;
      h('button', 'btn', tr('lang'), f).onclick = () => { toggleLang(); closeModal(); if (S) renderAll(); };
      h('button', 'btn', tr('how'), f).onclick = showHow;
      h('button', 'btn', tr('toTitle'), f).onclick = () => { closeModal(); cancelAnimationFrame(raf); B = null; showScreen('title'); };
    });
  }
  function showHow() { modal((m) => { m.innerHTML = `<h2>${tr('how')}</h2><div class="how">${tr('howText')}</div>`; const f = h('div', 'foot', null, m); h('button', 'btn primary', 'OK', f).onclick = closeModal; }); }

  /* ───── 畫面切換 / 標題 / 選王 ───── */
  function showScreen(name) {
    ['title', 'select', 'game'].forEach(n => { $('#' + n).hidden = n !== name; });
    if (name === 'title') { renderTitle(); }
    if (name === 'select') renderSelect();
  }
  function applyI18n() { document.querySelectorAll('[data-i]').forEach(e => { e.textContent = tr(e.dataset.i); }); document.title = NK.lang === 'zh' ? '九王 9 Kings – 王國建造 Roguelike 卡牌' : '9 Kings – Kingdom builder roguelike'; }
  function toggleLang() { NK.lang = NK.lang === 'zh' ? 'en' : 'zh'; try { localStorage.setItem('nineKings.lang', NK.lang); } catch (e) { /* */ } applyI18n(); renderTitleBtns(); if (!$('#select').hidden) renderSelect(); }
  function renderTitleBtns() { $('#btnNew').textContent = tr('newGame'); $('#btnHow').textContent = tr('how'); $('#btnLang').textContent = tr('lang'); $('#btnContinue').textContent = tr('cont'); $('#btnBack').textContent = tr('back'); $('#btnStart').textContent = tr('start'); }
  function renderTitle() { applyI18n(); renderTitleBtns(); let has = false; try { has = !!localStorage.getItem(SAVE); } catch (e) { /* */ } $('#btnContinue').hidden = !has; }
  function renderSelect() {
    applyI18n(); renderTitleBtns();
    const row = $('#kingRow'); row.innerHTML = '';
    NK.KING_ORDER.forEach(k => {
      const ki = K[k], c = h('div', 'kingCard' + (pickKing === k ? ' sel' : ''), `<div class="em">${EMB[k]}</div><div class="kn">${nm(ki)}</div><div class="kb">${C[ki.base].ic}</div>`, row);
      c.style.cssText = `--kc:${ki.color};--kd:${ki.dark}`; c.onclick = () => { pickKing = k; renderSelect(); };
    });
    const ki = K[pickKing], info = $('#kingInfo'); info.innerHTML = `<div class="desc"><h3>${EMB[pickKing]} ${nm(ki)}</h3><p>${NK.t(ki.desc)}</p></div><div class="deck"></div>`;
    const deck = info.querySelector('.deck'); G.kingCards(pickKing).forEach(id => deck.appendChild(cardEl(id, { size: 'sm' })));
    const db = $('#diffBtns'); db.innerHTML = '';
    NK.DIFFICULTIES.forEach(d => { const b = h('button', 'btn' + (pickDiff === d.id ? ' on' : ''), nm(d), db); b.onclick = () => { pickDiff = d.id; renderSelect(); }; });
  }

  function newRun() {
    S = G.newRun(pickKing, pickDiff); B = null; sel = null; expand = null; prophecyMarks = null; bgKey = '';
    showScreen('game'); afterState();
  }
  function continueRun() {
    try { S = G.deserialize(localStorage.getItem(SAVE)); } catch (e) { return; }
    B = null; sel = null; expand = null; bgKey = ''; showScreen('game');
    if (S.phase === 'battle') { S.phase = 'play'; }
    afterState();
  }

  UI.init = function () {
    try { const l = localStorage.getItem('nineKings.lang'); if (l) NK.lang = l; } catch (e) { /* */ }
    fit(); initFieldClick();
    use3d = NK.V3.ok || NK.V3.init($('#gl')); NK.V3.ok = !!use3d; if (!use3d) $('#gl').style.display = 'none'; else $('#stage').classList.add('use3d');
    if (use3d) { let lt = performance.now(); (function tick(t) { NK.V3.frame(Math.min(0.1, (t - lt) / 1000)); lt = t; requestAnimationFrame(tick); })(lt); }
    $('#btnNew').onclick = () => showScreen('select'); $('#btnHow').onclick = showHow; $('#btnLang').onclick = toggleLang;
    $('#btnContinue').onclick = continueRun; $('#btnBack').onclick = () => showScreen('title'); $('#btnStart').onclick = newRun;
    showScreen('title');
    UI.get = () => ({ S, B });
    UI.debug = { use3d: () => use3d, renderAll, startBattle, afterState, setState: (s) => { S = s; bgKey = ''; showScreen('game'); } };
  };
})(globalThis.NK = globalThis.NK || {});
