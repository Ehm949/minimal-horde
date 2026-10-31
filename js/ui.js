import { Resources, RES_META, CUR_KEYS } from './resources.js';
import { Heroes, deriveStats, xpNeed } from './heroes.js';
import { Trees } from './heroTree.js';
import { Accelerator } from './inventory.js';
import { Achievements } from './achievements.js';
import { LevelUps } from './levelUps.js';
import { World } from './world.js';
import { Combat } from './combat.js';
import { TrayIdle } from './trayIdle.js';
import { Track } from './missions.js';
import { Bus } from './events.js';
import { Audio } from './audio.js';
import { fmt } from './utils.js';
import { t, tr } from './localization.js';
import { openSettings, openProgress, openStats, openShop } from './menus.js';

export function toast(msg) {
const el = document.createElement('div');
el.className = 'toast'; el.textContent = msg;
const box = document.getElementById('toasts');
box.appendChild(el);
while (box.children.length > 4) box.removeChild(box.firstChild);
setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .5s'; setTimeout(() => el.remove(), 500); }, 3200);
}
Bus.on('toast', d => toast(d.msg));

export function drawHeroIcon(canvas, def, r = 15) {
const s = canvas.width;
const ctx = canvas.getContext('2d');
ctx.clearRect(0, 0, s, canvas.height);
def.draw(ctx, s / 2, canvas.height / 2, r);
}

const fmtM = n => Math.floor(n).toLocaleString('es-ES') + ' m';

export const UI = {
resEls: {},

init() {
const bar = document.getElementById('res-bar');
bar.innerHTML = '';
for (const k of CUR_KEYS) {
if (k === 'ORO') continue;   // ORO solo se muestra en la tienda
const m = RES_META[k];
const el = document.createElement('div');
el.className = 'res'; el.title = m.name;
let clip = '';
if (m.shape === 'circle') clip = 'border-radius:50%';
if (m.shape === 'tri') clip = 'clip-path:polygon(50% 0,100% 100%,0 100%)';
if (m.shape === 'hex') clip = 'clip-path:polygon(25% 5%,75% 5%,100% 50%,75% 95%,25% 95%,0 50%)';
if (m.shape === 'penta') clip = 'clip-path:polygon(50% 0,100% 38%,82% 100%,18% 100%,0 38%)';
// ORO en dorado, PUR en morado, resto en rojo
const bg = m.purple ? '#9C27B0' : (m.gold ? '#FFD700' : '#E53935');
el.innerHTML = `<span class="ico" style="background:${bg};${clip}"></span><b id="res-${k}">0</b><span class="rate" id="rate-${k}"></span>`;
bar.appendChild(el);
this.resEls[k] = { v: el.querySelector(`#res-${k}`), r: el.querySelector(`#rate-${k}`) };
}

// ---- ACELERADOR: botón cuadrado en la esquina inferior derecha de la zona de combate ----
const battleWrap = document.getElementById('battle-wrap');
let accelBtn = document.getElementById('accel-battle');
if (!accelBtn) {
accelBtn = document.createElement('button');
accelBtn.id = 'accel-battle';
accelBtn.innerHTML = `<span class="accel-cost"></span><span class="accel-pct"></span>`;
battleWrap.appendChild(accelBtn);
}
accelBtn.addEventListener('pointerdown', e => {
e.preventDefault();
if (Accelerator.buy()) { Audio.buy(); this.tick(); } else Audio.deny();
});

// ---- MODIFICADORES: botón en el HUD (donde estaba el acelerador) ----
const modBtn = document.getElementById('btn-accel');
if (modBtn) {
modBtn.textContent = t('mod.btn');
modBtn.addEventListener('pointerdown', e => {
e.preventDefault();
// TODO: abrir modal de modificadores (Fase 2)
});
}
document.getElementById('btn-settings').onclick = openSettings;
document.getElementById('btn-stats').onclick = openStats;
document.getElementById('btn-progress').onclick = openProgress;
document.getElementById('btn-shop').onclick = openShop;

Bus.on('heroUnlocked', () => TrayIdle.syncRoster());
Bus.on('heroSwapped', () => TrayIdle.syncRoster());
Bus.on('heroLevel', d => Audio.level());
Bus.on('bossSpawn', () => { toast(t('toast.boss')); Audio.boss(); });
Bus.on('heroHurt', () => {
const el = document.getElementById('healthBarOuter');
el.classList.remove('damaged'); void el.offsetWidth; el.classList.add('damaged');
});

// ---- ACUMULADOR DE NIVELES ----
let accEl = document.getElementById('levelAccumulator');
if (!accEl) {
accEl = document.createElement('div');
accEl.id = 'levelAccumulator';
accEl.className = 'level-accumulator hidden';
accEl.title = t('acc.spend');
accEl.innerHTML = `<span class="acc-label">${t('hud.lv')}</span><b id="acc-count">0</b>`;
accEl.onclick = () => LevelUps.spendAccumulated();
// Insertar DENTRO de battle-wrap para que se posicione respecto a la zona de combate
const battleWrap = document.getElementById('battle-wrap');
if (battleWrap) battleWrap.appendChild(accEl);
else document.body.appendChild(accEl);
}

this.tick();
setInterval(() => this.tick(), 200);
},

tick() {
for (const k in this.resEls) {
this.resEls[k].v.textContent = fmt(Resources.data[k] || 0);
const rate = Resources.rates[k];
this.resEls[k].r.textContent = rate > 0 ? '+' + fmt(rate) + '/s' : '';
}

const h = Heroes.activeHero();
if (h) {
const s = deriveStats(h);
document.getElementById('tree-hero').textContent = `${tr(h.def.name)} · ${t('hud.lv')} ${h.level}`;
document.getElementById('tree-info').textContent =
`${t('hud.dmg')} ${fmt(s.dmg)} · ${t('hud.cad')} ${(1 / s.interval).toFixed(1)}/s · ${t('hud.crit')} ${Math.round(s.crit)}% · ${t('st.hp')} ${fmt(s.maxHp)} · ${s.speed.toFixed(1)} m/s · ${t('hud.nodes')} ${Trees.get(h.def.id).owned.size}`;
document.getElementById('levelValue').textContent = h.level;
document.getElementById('xpBarFillVertical').style.height = (100 * h.xp / xpNeed(h.level)).toFixed(1) + '%';
document.getElementById('xpBarTextVertical').textContent = `${fmt(h.xp)} / ${fmt(xpNeed(h.level))}`;
}

const st = Combat.stats;
if (st) {
const pct = Math.max(0, Combat.hero.hp / st.maxHp);
document.getElementById('healthBarFill').style.transform = `scaleX(${pct})`;
document.getElementById('healthBarDamage').style.transform = `scaleX(${pct})`;
document.getElementById('healthBarText').innerHTML =
`${Math.ceil(Combat.hero.hp)}<span class="health-separator">/</span>${Math.round(st.maxHp)}`;
}

document.getElementById('distanceValue').textContent = fmtM(World.dist);
document.getElementById('distSub').textContent = `${t('hud.max')}: ${fmtM(Track.dist)}`;

const bb = document.getElementById('bossBar');
if (World.boss && !World.boss.dead) {
bb.classList.remove('hidden');
document.getElementById('bossName').textContent = World.boss.bossName;
document.getElementById('bossFill').style.transform = `scaleX(${Math.max(0, World.boss.hp / World.boss.maxHp)})`;
} else bb.classList.add('hidden');

// ---- Actualizar botón del acelerador en zona de combate ----
const accelBtn = document.getElementById('accel-battle');
if (accelBtn) {
accelBtn.querySelector('.accel-cost').textContent = `${Accelerator.cost()} PUR`;
accelBtn.querySelector('.accel-pct').textContent = `+${Accelerator.level * 2}%`;
accelBtn.classList.toggle('cant-afford', !Resources.has('PUR', Accelerator.cost()));
}

document.getElementById('btn-progress').textContent = `${t('hud.logros')} ${Achievements.unlocked.size}/${Achievements.total()}`;

// ---- Actualizar y posicionar el acumulador de niveles ----
const accEl = document.getElementById('levelAccumulator');
if (accEl) {
const distBox = document.getElementById('distanceBox');
if (distBox) {
accEl.style.left = distBox.offsetLeft + 'px';
accEl.style.top = (distBox.offsetTop + distBox.offsetHeight + 8) + 'px';
}
const cap = LevelUps.capacity();
const acc = LevelUps.accumulated;
if (cap > 0) {
accEl.classList.remove('hidden');
document.getElementById('acc-count').textContent = acc + '/' + cap;
accEl.classList.toggle('full', acc >= cap);
} else {
accEl.classList.add('hidden');
}
}
}
};