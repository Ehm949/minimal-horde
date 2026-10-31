import { Bus } from './events.js';
import { Audio } from './audio.js';
import { t } from './localization.js';
import { Rebirth } from './rebirth.js';

export const LevelUps = {
state: {},
pending: 0,
accumulated: 0,
showing: false,
lastLevel: 1,
overlay: null, box: null,

pool: [
{ id: 'treeCost', icon: '▼', nameKey: 'lu.treeCost', descKey: 'lu.treeCostD', max: 20 },
{ id: 'xp',       icon: '△', nameKey: 'lu.xp',       descKey: 'lu.xpD',       max: 30 },
{ id: 'CIR',      icon: '●', nameKey: 'lu.CIR',      descKey: 'lu.CIRD',      max: 30 },
{ id: 'TRI',      icon: '▲', nameKey: 'lu.TRI',      descKey: 'lu.TRID',      max: 30 },
{ id: 'CUA',      icon: '■', nameKey: 'lu.CUA',      descKey: 'lu.CUAD',      max: 30 },
{ id: 'HEX',      icon: '⬢', nameKey: 'lu.HEX',      descKey: 'lu.HEXD',      max: 30 },
{ id: 'PEN',      icon: '⬟', nameKey: 'lu.PEN',      descKey: 'lu.PEND',      max: 30 },
{ id: 'PUR',      icon: '◉', nameKey: 'lu.PUR',      descKey: 'lu.PURD',      max: 30 },
{ id: 'headStart', icon: 'S', nameKey: 'lu.headStart', descKey: 'lu.headStartD', max: Infinity },
{ id: 'bossDmg',   icon: 'B', nameKey: 'lu.bossDmg',   descKey: 'lu.bossDmgD',   max: Infinity },
{ id: 'critdmg',   icon: 'C', nameKey: 'lu.critdmg',   descKey: 'lu.critdmgD',   max: Infinity }
],

init(saved = {}) {
if (saved && saved.state) {
this.state = saved.state;
this.accumulated = saved.accumulated || 0;
} else {
this.state = saved || {};
this.accumulated = 0;
}
this.overlay = document.getElementById('levelup-overlay');
this.box = document.getElementById('levelup-box');
Bus.on('heroLevel', d => this.onLevel(d));
},

lv(id) { return this.state[id] || 0; },
treeCostMul() { return Math.pow(0.97, this.lv('treeCost')); },
xpMul() { return 1 + 0.10 * this.lv('xp'); },
curMul(k) { return 1 + 0.10 * (this.state[k] || 0); },

// Capacidad que dan los nodos ACUMULAR del árbol de renacimiento
capacity() { return Rebirth.getBonuses().levelCap || 0; },

onLevel(d) {
const levels = d.levels || 1;
this.lastLevel = d.hero.level;
Audio.level();
const cap = this.capacity();
// Si hay hueco en el acumulador, guarda sin pausar
if (cap > 0 && this.accumulated + levels <= cap) {
this.accumulated += levels;
Bus.emit('levelAccumulated', { count: this.accumulated, cap });
return;
}
// Acumulador lleno o sin capacidad: pausa normal
this.pending += levels;
if (!this.showing) this.openNext();
},

// El jugador hace clic en el cuadradito: gasta los acumulados
spendAccumulated() {
if (this.accumulated <= 0 || this.showing) return;
this.pending = this.accumulated;
this.accumulated = 0;
Bus.emit('levelAccumulated', { count: 0, cap: this.capacity() });
this.openNext();
},

rollOptions() {
const avail = this.pool.filter(o => this.lv(o.id) < o.max);
const out = [];
while (out.length < 3 && avail.length) {
const i = Math.floor(Math.random() * avail.length);
out.push(avail.splice(i, 1)[0]);
}
return out;
},

openNext() {
this.showing = true;
Bus.emit('pause', true);
const opts = this.rollOptions();
this.box.innerHTML = `<div class="lu-title">${t('lu.title').replace('{n}', this.lastLevel)}</div> <div class="lu-sub">${t('lu.sub')}</div> <div class="lu-opts">${opts.map(o => `<button class="lu-opt" data-id="${o.id}"> <div class="lu-icon">${o.icon}</div> <div class="lu-name">${t(o.nameKey)}${this.lv(o.id) ? `<span class="lu-lv">${t('hud.lv')} ${this.lv(o.id)} → ${this.lv(o.id) + 1}</span>` : ''}</div> <div class="lu-desc">${t(o.descKey)}</div> </button>`).join('')}</div>`;
this.box.querySelectorAll('.lu-opt').forEach(b => {
b.onclick = () => this.choose(b.dataset.id);
});
this.overlay.classList.remove('hidden');
},

choose(id) {
this.state[id] = (this.state[id] || 0) + 1;
Audio.buy();
this.pending--;
if (this.pending > 0) {
this.lastLevel++;
this.openNext();
} else {
this.showing = false;
this.overlay.classList.add('hidden');
Bus.emit('pause', false);
}
},

serialize() { return { state: this.state, accumulated: this.accumulated }; }
};