import { Achievements } from './achievements.js';
import { Missions, Track } from './missions.js';
import { Heroes, deriveStats, Global } from './heroes.js';
import { Trees } from './heroTree.js';
import { LevelUps } from './levelUps.js';
import { Accelerator } from './inventory.js';
import { Game } from './game.js';
import { Shop } from './shop.js';
import { Resources } from './resources.js';
import { Audio } from './audio.js';
import { fmt } from './utils.js';
import { t, tr, cur } from './localization.js';
import { openSettingsScreen } from './settingsScreen.js';

const panel = () => document.getElementById('panel');
const box = () => document.getElementById('panel-box');
let panelTimer = null;

export function closePanel() {
  if (panelTimer) { clearInterval(panelTimer); panelTimer = null; }
  panel().classList.add('hidden');
  panel().classList.remove('panel-shop');
}

export function openPanel(html) {
  if (panelTimer) { clearInterval(panelTimer); panelTimer = null; }
  box().innerHTML = `<button class="close">✕</button>` + html;
  box().querySelector('.close').onclick = closePanel;
  panel().classList.remove('hidden');
}

panel().addEventListener('click', e => { if (e.target === panel()) closePanel(); });

// ---------- AJUSTES ----------
export function openSettings() {
  closePanel();
  openSettingsScreen();
}

// ---------- LOGROS / MISIONES ----------
export function openProgress() {
  openPanel(`<div class="tabs"> <button class="tab active" id="tab-ach">${t('prog.ach')} ${Achievements.unlocked.size}/${Achievements.total()}</button> <button class="tab" id="tab-mis">${t('prog.mis')}</button> </div> <div id="tab-content"></div>`);
  const content = box().querySelector('#tab-content');
  const btnA = box().querySelector('#tab-ach');
  const btnM = box().querySelector('#tab-mis');

  const row = (done, title, desc, reward, prog, nums) => `<div class="ach-row ${done ? '' : 'locked'}"> <div style="flex:1"> <div class="a-n">${title}</div> <div class="a-d">${desc}</div> <div class="m-bar"><div class="m-fill" style="width:${Math.min(100, prog * 100).toFixed(0)}%"></div></div> <div class="a-d" style="margin-top:3px">${fmt(nums.cur)} / ${fmt(nums.max)}</div> </div> <div class="a-s" style="font-size:11px;text-align:right">${reward}<br>${done ? '■' : '□'}</div> </div>`;

  const renderAch = () => {
    content.innerHTML =
      `<div class="lu-sub" style="margin:0 0 8px">${t('prog.gen')}</div>` +
      Achievements.genDefs().map(([id, name, desc]) =>
        row(Achievements.unlocked.has(id), tr(name), tr(desc), '+0.5% ' + t('st.dmg'),
          Achievements.progress(id), Achievements.numbers(id))).join('') +
      `<div class="lu-sub" style="margin:14px 0 8px">${t('prog.heroes')}</div>` +
      Achievements.heroDefs().map(([id, name, desc, heroId]) =>
        row(Achievements.unlocked.has(id), tr(name), tr(desc), '→ ' + tr(Heroes.get(heroId).def.name),
          Achievements.progress(id), Achievements.numbers(id))).join('');
  };

  const renderMis = () => {
    let html = `<div class="mis-est">★ ${t('mis.est')}: <b>${Missions.est}</b></div>`;
    html += Missions.list.map((m, i) => {
      const def = Missions.defOf(m), p = Missions.progress(m);
      return `<div class="ach-row ${m.done ? 'mis-done' : ''}">
        <div style="flex:1">
          <div class="a-n">${t(def.nKey).replace('{n}', fmt(m.need))}</div>
          <div class="m-bar"><div class="m-fill" style="width:${(p * 100).toFixed(0)}%"></div></div>
          <div class="a-d">${t('mis.reward')}: ★ ${Missions.estReward(m)}</div>
        </div>
        ${m.done ? `<button class="mis-claim" data-i="${i}">${t('mis.claim')}</button>` : `<div class="a-s">□</div>`}
      </div>`;
    }).join('');
        html += `<div class="mis-shop">`;
        html += `<div class="lu-sub" style="margin:14px 0 8px">${t('mis.shop')}</div>`;
        html += `<div class="shop-offers">` + Missions.offers.map((o, i) => {
          const name = o.type === 'PR' ? t('mis.kitPR') : t('mis.kit' + o.amount).replace('{c}', cur(o.type));
          return `<div class="shop-card" style="border-left:6px solid ${o.rar.color}">
            <div class="shop-card-rarity" style="color:${o.rar.color}">${t('shop.rarity.' + o.rar.cls.replace('r-', ''))}</div>
            <div class="shop-card-desc">${name}</div>
            <button class="shop-buy" data-buy="${i}">${t('shop.buy')} · ${o.cost} ★</button>
          </div>`;
    }).join('') + `</div>`;
    html += `<button class="shop-reroll" id="mis-reroll">${t('mis.reroll')} · ${Missions.rerollCost()} ORO</button>`;
    html += `</div>`;
    content.innerHTML = html;
    content.querySelectorAll('.mis-claim').forEach(b => b.onclick = () => { Missions.claim(+b.dataset.i); renderMis(); });
    content.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => { Missions.buyOffer(+b.dataset.buy); renderMis(); });
    const rr = content.querySelector('#mis-reroll');
    if (rr) rr.onclick = () => { Missions.reroll(); renderMis(); };
  };

  let active = 'mis';
  const show = () => {
    btnA.classList.toggle('active', active === 'ach');
    btnM.classList.toggle('active', active === 'mis');
    active === 'ach' ? renderAch() : renderMis();
  };
  btnA.onclick = () => { active = 'ach'; show(); };
  btnM.onclick = () => { active = 'mis'; show(); };
  panelTimer = setInterval(() => { if (!panel().classList.contains('hidden')) show(); }, 1000);
  show();
}
// ---------- STATS ----------
export function openStats() {
  openPanel(`<h3>${t('st.title')}</h3><div id="stats-content"></div>`);
  const content = box().querySelector('#stats-content');
  const render = () => {
    const G = Global.calc();
    const ms = Game.milestoneInfo();
    let html = '';
    html += `<div class="lu-sub" style="margin:0 0 8px">${t('st.global')}</div>`;
    html += `<div class="st-grid">
      <div class="st-box"><span>${t('st.dmg')}</span><b>×${G.dmg.toFixed(2)}</b></div>
      <div class="st-box"><span>${t('st.loot')}</span><b>×${G.cur.toFixed(2)}</b></div>
      <div class="st-box"><span>${t('st.xp')}</span><b>×${G.xp.toFixed(2)}</b></div>
      <div class="st-box"><span>${t('st.hp')}</span><b>×${G.hp.toFixed(2)}</b></div>
      <div class="st-box"><span>${t('st.luck')}</span><b>+${G.luck.toFixed(1)}</b></div>
      <div class="st-box"><span>${t('st.tree')}</span><b>-${Math.round((1 - LevelUps.treeCostMul()) * 100)}%</b></div>
    </div>`;
    html += `<div class="lu-sub" style="margin:12px 0 6px">${t('st.milestone')}</div>`;
    html += `<div class="st-row"><span>${t('st.nodesTotal')}</span><b>${ms.total} · ${t('st.next')} ${25 - (ms.total % 25)}</b></div>`;
    html += `<div class="lu-sub" style="margin:12px 0 6px">${t('st.lvlups')}</div>`;
    html += LevelUps.pool.map(p =>
      `<div class="st-row"><span>${p.icon} ${t(p.nameKey)}</span><b>${t('hud.lv')} ${LevelUps.lv(p.id)}</b></div>`).join('');

    // ---- MEJORAS DE TIENDA (acumuladas) ----
    const shopSum = Shop.summary();
    if (shopSum.length) {
      html += `<div class="lu-sub" style="margin:12px 0 6px">${t('st.shop')}</div>`;
      html += shopSum.map(s =>
        `<div class="st-row"><span>${Shop.describe(s)}</span><b>${s.count > 1 ? '×' + s.count : '■'}</b></div>`
      ).join('');
    }

    const s = Trees.get(Heroes.active).stats();
    const rows = [
      [t('st.dmg'), s.dmg, '%'], [t('st.flat'), s.dmgFlat, ''], [t('st.hp'), s.hp, '%'],
      [t('st.cad'), s.atk, '%'], [t('st.crit'), s.crit, '%'], [t('st.critdmg'), s.critdmg, '%'],
      [t('st.range'), s.range, '%'], [t('st.speed'), s.speed, '%'], [t('st.loot'), s.cur, '%'],
      [t('st.xp'), s.xp, '%'], [t('st.luck'), s.luck, ''], [t('st.boss'), s.bossDmg, '%'],
      [t('st.elite'), s.eliteDmg, '%'], [t('st.distkill'), s.distKill, ''], [t('st.headstart'), s.headStart, '']
    ].filter(r => r[1]);
    html += `<div class="lu-sub" style="margin:12px 0 6px">${t('st.contrib')} · ${tr(Heroes.activeHero().def.name)}</div>`;
    html += (rows.length
      ? rows.map(([lab, v, suf]) => `<div class="st-row"><span>${lab}</span><b>+${Math.round(v * 100) / 100}${suf}</b></div>`).join('')
      : `<div class="st-row"><span>${t('st.none')}</span><b>—</b></div>`);
    html += `<div class="lu-sub" style="margin:12px 0 8px">${t('st.track')}</div>`;
    html += `<div class="st-grid">
      <div class="st-box"><span>${t('st.kills')}</span><b>${fmt(Track.kills)}</b></div>
      <div class="st-box"><span>${t('st.maxdist')}</span><b>${fmt(Track.dist)} m</b></div>
      <div class="st-box"><span>${t('st.bosses')}</span><b>${Track.bosses}</b></div>
      <div class="st-box"><span>${t('hud.nodes')}</span><b>${fmt(Track.nodes)}</b></div>
      <div class="st-box"><span>${t('st.coins')}</span><b>${fmt(Track.cur)}</b></div>
      <div class="st-box"><span>${t('st.heroes')}</span><b>${Heroes.unlockedCount()}/16</b></div>
    </div>`;
    html += `<div class="lu-sub" style="margin:12px 0 8px">${t('st.per')}</div>`;
    for (const h of Heroes.list) {
      if (!h.unlocked) continue;
      const st = deriveStats(h);
      html += `<div class="st-hero">
        <div class="st-hero-h">${tr(h.def.name)} <span class="st-sub">${t('hud.lv')} ${h.level}</span></div>
        <div class="st-grid">
          <div class="st-box"><span>${t('st.dmg')}</span><b>${fmt(st.dmg)}</b></div>
          <div class="st-box"><span>${t('st.hp')}</span><b>${fmt(st.maxHp)}</b></div>
          <div class="st-box"><span>${t('st.cad')}</span><b>${(1 / st.interval).toFixed(1)}/s</b></div>
          <div class="st-box"><span>${t('st.crit')}</span><b>${Math.round(st.crit)}%</b></div>
          <div class="st-box"><span>${t('st.range')}</span><b>${Math.round(st.range)}</b></div>
          <div class="st-box"><span>${t('hud.nodes')}</span><b>${Trees.get(h.def.id).owned.size}</b></div>
        </div>
      </div>`;
    }
    content.innerHTML = html;
  };
  render();
  panelTimer = setInterval(() => { if (!panel().classList.contains('hidden')) render(); }, 1000);
}

// ---------- TIENDA ----------
export function openShop() {
  const offerDesc = (offer) => {
    if (offer.type === 'special') {
      let desc = offer.descKey ? t(offer.descKey) : (offer.desc || '');
      if (offer.heroId) {
        const heroName = tr(Heroes.get(offer.heroId)?.def.name || '');
        desc += ' · ' + heroName;
      }
      return desc;
    }
    const heroName = offer.heroId ? tr(Heroes.get(offer.heroId)?.def.name || '') : '';
    switch (offer.id) {
      case 'xp_hero':     return t('shop.desc.xp_hero').replace('{v}', offer.value).replace('{h}', heroName);
      case 'dmg_hero':    return t('shop.desc.dmg_hero').replace('{v}', offer.value).replace('{h}', heroName);
      case 'res_hero':    return t('shop.desc.res_hero').replace('{v}', offer.value).replace('{r}', cur(offer.res)).replace('{h}', heroName);
      case 'xp_global':   return t('shop.desc.xp_global').replace('{v}', offer.value);
      case 'dmg_global':  return t('shop.desc.dmg_global').replace('{v}', offer.value);
      case 'loot_global': return t('shop.desc.loot_global').replace('{v}', offer.value);
      case 'oro_boost':   return t('shop.desc.oro_boost').replace('{v}', offer.value);
      default:            return '+' + offer.value + '%';
    }
  };

  const render = () => {
    let html = `<h3>${t('shop.title')}</h3>`;
    html += `<div class="shop-oro-card"><span class="shop-oro-ico"></span><span id="shop-oro-val" class="shop-oro-num">${Resources.data.ORO || 0}</span></div>`;
    html += `<div class="shop-offers">`;
    Shop.offers.forEach((offer, i) => {
      const rarityColor = offer.rarity ? offer.rarity.color : '#E53935';
      const rarityName = offer.rarity ? t('shop.rarity.' + offer.rarity.cls.replace('r-', '')) : t('shop.special');
      const name = offer.type === 'special' && offer.nameKey ? t(offer.nameKey) : '';
      html += `<div class="shop-card" style="border-left:6px solid ${rarityColor}">
        <div class="shop-card-rarity" style="color:${rarityColor}">${rarityName}</div>
        <canvas class="shop-card-icon" data-hero="${offer.heroId || ''}" data-general="${!offer.heroId}" width="60" height="60"></canvas>
        ${name ? `<div class="shop-card-name">${name}</div>` : ''}
        <div class="shop-card-desc">${offerDesc(offer)}</div>
        <button class="shop-buy" data-i="${i}">${t('shop.buy')} · ${offer.cost} ORO</button>
      </div>`;
    });
    html += `</div>`;
    html += `<button class="shop-reroll" id="shop-reroll-btn">${t('shop.reroll')} · ${Shop.rerollCost()} ORO</button>`;
    return html;
  };

  const drawIcons = () => {
    box().querySelectorAll('.shop-card-icon').forEach(cv => {
      const ctx = cv.getContext('2d');
      const heroId = cv.dataset.hero;
      const isGeneral = cv.dataset.general === 'true';
      ctx.clearRect(0, 0, 60, 60);
      if (heroId && !isGeneral) {
        const def = Heroes.get(heroId)?.def;
        if (def) def.draw(ctx, 30, 30, 22);
      } else {
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(30, 30, 22, 0, 6.28); ctx.fill();
      }
    });
  };

  const refresh = () => {
    openPanel(render());
    panel().classList.add('panel-shop');
    drawIcons();
    bind();
    // Actualización en tiempo real del contador de ORO
    panelTimer = setInterval(() => {
      const oroEl = box().querySelector('#shop-oro-val');
      if (oroEl) oroEl.textContent = Resources.data.ORO || 0;
    }, 200);
  };

  const bind = () => {
    box().querySelectorAll('.shop-buy').forEach(b => {
      b.onclick = () => {
        if (Shop.buy(parseInt(b.dataset.i))) refresh();
        else Audio.deny();
      };
    });
    const rerollBtn = box().querySelector('#shop-reroll-btn');
    if (rerollBtn) {
      rerollBtn.onclick = () => {
        if (Shop.reroll()) refresh();
        else Audio.deny();
      };
    }
  };

  refresh();
}