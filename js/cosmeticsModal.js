import { Cosmetics } from './cosmetics.js';
import { Resources } from './resources.js';
import { Heroes } from './heroes.js';
import { Audio } from './audio.js';
import { Bus } from './events.js';
import { t, tr } from './localization.js';

// ============================================================
// MODAL DE COSMÉTICOS (ASPECTO)
// Arquitectura: delegación de eventos, sin recursión
// ============================================================

const RARITY_COLORS = ['#333','#666','#E53935','#9C27B0','#FFD700','#FFD700'];
const RARITY_NAMES = ['COMÚN','POCO COMÚN','RARO','ÉPICO','LEGENDARIO','MÍTICO'];

let modal = null, box = null;
let viewHeroId = 'pistol';
let filterType = 'all'; // all | base | secondary | sound
let sortMode = 'rarity';

function getFilteredInventory() {
let inv = [...Cosmetics.inventory];
if (filterType !== 'all') inv = inv.filter(i => i.type === filterType);
if (sortMode === 'rarity') inv.sort((a, b) => b.rarity - a.rarity);
else if (sortMode === 'alpha') inv.sort((a, b) => a.name.localeCompare(b.name));
else if (sortMode === 'type') inv.sort((a, b) => a.type.localeCompare(b.type));
return inv;
}

function buildCardHtml(item, equipped) {
const isEquipped = equipped.base === item.uid || equipped.secondary === item.uid || equipped.sound === item.uid;
let html = `<div class="cos-card ${isEquipped ? 'equipped' : ''}" data-uid="${item.uid}" style="border-left-color:${RARITY_COLORS[item.rarity]}">`;
html += `<div class="cos-card-top">`;
if (item.type === 'sound') {
html += `<span class="cos-card-sym">♪</span>`;
} else {
html += `<span class="cos-color-preview" style="background:${item.value}"></span>`;
html += `<span class="cos-color-code">${item.value}</span>`;
}
html += `<span class="cos-card-name">${item.value}</span>`;
html += `<span class="cos-card-type">${item.type === 'base' ? t('cos.base') : item.type === 'secondary' ? t('cos.secondary') : t('cos.sound')}</span>`;
html += `<span class="cos-card-rarity" style="color:${RARITY_COLORS[item.rarity]}">${RARITY_NAMES[item.rarity]}</span>`;
html += `</div>`;
if (isEquipped) html += `<span class="cos-eq-tag">${t('cos.equipped')}</span>`;
else html += `<span class="cos-drag-hint">${t('cos.dragHint')}</span>`;
html += `</div>`;
return html;
}

function updateView() {
if (!box) return;
const equipped = Cosmetics.getEquipped(viewHeroId);
const cost = Cosmetics.cost();
const heroDef = Heroes.get(viewHeroId)?.def;
const unlockedHeroes = Heroes.list.filter(h => h.unlocked);
const heroIdx = unlockedHeroes.findIndex(h => h.def.id === viewHeroId);
const colors = Cosmetics.getColors(viewHeroId);

let html = '';

// HEADER
html += `<div class="cos-header">
<span class="cos-title">${t('cos.title')}</span>
<button class="cos-close-x" data-action="close">✕</button>
</div>`;

// HERO PREVIEW
html += `<div class="cos-hero-card">
<div class="cos-hero-left">
<canvas id="cos-hero-cv" width="80" height="80"></canvas>
<div class="cos-hero-info">
<div class="cos-hero-name">${tr(heroDef.name)}</div>
<div class="cos-hero-colors">${colors.primary} / ${colors.secondary}</div>
</div>
</div>
<div class="cos-hero-switch">
<button class="cos-switch-btn" data-action="hero-prev">◀</button>
<span class="cos-hero-count">${heroIdx + 1}/${unlockedHeroes.length}</span>
<button class="cos-switch-btn" data-action="hero-next">▶</button>
</div>
</div>`;

// SLOTS (base, secondary, sound)
html += `<div class="cos-slots">`;
const slotDefs = [
{ key: 'base', label: t('cos.base') },
{ key: 'secondary', label: t('cos.secondary') },
{ key: 'sound', label: t('cos.sound') }
];
for (const sd of slotDefs) {
const uid = equipped[sd.key];
const item = uid ? Cosmetics.getItem(uid) : null;
if (item) {
html += `<div class="cos-slot filled" data-slot="${sd.key}" style="border-left-color:${RARITY_COLORS[item.rarity]}">
<button class="cos-unequip" data-action="unequip" data-slot="${sd.key}">✕</button>
${item.type !== 'sound' ? `<span class="cos-slot-preview" style="background:${item.value}"></span>` : `<span class="cos-slot-sym">♪</span>`}
<span class="cos-slot-name">${item.name}</span>
${item.type !== 'sound' ? `<span class="cos-slot-code">${item.value}</span>` : ''}
</div>`;
} else {
html += `<div class="cos-slot empty" data-slot="${sd.key}">
<span class="cos-slot-empty-txt">${sd.label}</span>
<span class="cos-slot-drag">${t('cos.dragHere')}</span>
</div>`;
}
}
html += `</div>`;

// GACHA
html += `<div class="cos-gacha-row">
<button class="cos-roll" data-action="roll" ${!Resources.has('PINK', cost) ? 'disabled' : ''}>${t('cos.gacha')} · ${cost} PINK</button>
</div>`;

// FILTERS
html += `<div class="cos-filters">
<div class="cos-filter-row">
<span class="cos-filter-label">${t('cos.filter')}:</span>
<button class="cos-filter-btn ${filterType === 'all' ? 'active' : ''}" data-action="filter" data-val="all">${t('cos.all')}</button>
<button class="cos-filter-btn ${filterType === 'base' ? 'active' : ''}" data-action="filter" data-val="base">${t('cos.base')}</button>
<button class="cos-filter-btn ${filterType === 'secondary' ? 'active' : ''}" data-action="filter" data-val="secondary">${t('cos.secondary')}</button>
<button class="cos-filter-btn ${filterType === 'sound' ? 'active' : ''}" data-action="filter" data-val="sound">${t('cos.sound')}</button>
</div>
<div class="cos-filter-row">
<span class="cos-filter-label">${t('cos.sort')}:</span>
<button class="cos-filter-btn ${sortMode === 'rarity' ? 'active' : ''}" data-action="sort" data-val="rarity">${t('cos.byRarity')}</button>
<button class="cos-filter-btn ${sortMode === 'alpha' ? 'active' : ''}" data-action="sort" data-val="alpha">A-Z</button>
<button class="cos-filter-btn ${sortMode === 'type' ? 'active' : ''}" data-action="sort" data-val="type">${t('cos.byType')}</button>
</div>
</div>`;

// INVENTORY
const inv = getFilteredInventory();
html += `<div class="cos-inv-title">${t('cos.inventory')} (${inv.length})</div>`;
html += `<div class="cos-inv">`;
for (const item of inv) {
html += buildCardHtml(item, equipped);
}
html += `</div>`;

box.innerHTML = html;

// Post-render: dibujar preview del héroe con colores
drawHeroPreview();
}

function drawHeroPreview() {
const cv = box.querySelector('#cos-hero-cv');
if (!cv) return;
const ctx = cv.getContext('2d');
const heroDef = Heroes.get(viewHeroId)?.def;
const colors = Cosmetics.getColors(viewHeroId);
ctx.clearRect(0, 0, 80, 80);
ctx.save();
ctx.translate(40, 40);
if (heroDef) heroDef.draw(ctx, 0, 0, 16, colors.primary, colors.secondary);
ctx.restore();
}

function showReveal(item) {
const reveal = document.createElement('div');
reveal.className = 'cos-reveal-overlay';
let content = '';
if (item.type === 'sound') {
content = `<div class="cos-reveal-sym">♪</div>`;
} else {
content = `<div class="cos-reveal-color" style="background:${item.value}"></div>
<div class="cos-reveal-code">${item.value}</div>`;
}
reveal.innerHTML = `<div class="cos-reveal-card" style="border-left-color:${RARITY_COLORS[item.rarity]}">
${content}
<div class="cos-reveal-name">${item.value}</div>
<div class="cos-reveal-type">${item.type === 'base' ? t('cos.base') : item.type === 'secondary' ? t('cos.secondary') : t('cos.sound')}</div>
<div class="cos-reveal-rarity" style="color:${RARITY_COLORS[item.rarity]}">${RARITY_NAMES[item.rarity]}</div>
<div class="cos-reveal-tap">${t('cos.tapContinue')}</div>
</div>`;
document.body.appendChild(reveal);
const closeReveal = () => {
if (!document.body.contains(reveal)) return;
reveal.classList.add('closing');
setTimeout(() => { reveal.remove(); updateView(); }, 300);
};
reveal.addEventListener('pointerdown', e => { e.preventDefault(); closeReveal(); });
setTimeout(closeReveal, 3500);
}

// ---- DELEGACIÓN DE EVENTOS ----
function handleAction(e) {
const el = e.target.closest('[data-action]');
if (!el) return;
e.preventDefault();
const action = el.dataset.action;

switch (action) {
case 'close': closeModal(); break;
case 'roll': {
const result = Cosmetics.buy();
if (result) { Audio.buy(); showReveal(result); }
else Audio.deny();
break;
}
case 'hero-prev': {
const unlocked = Heroes.list.filter(h => h.unlocked);
const idx = unlocked.findIndex(h => h.def.id === viewHeroId);
viewHeroId = unlocked[(idx - 1 + unlocked.length) % unlocked.length].def.id;
updateView();
break;
}
case 'hero-next': {
const unlocked = Heroes.list.filter(h => h.unlocked);
const idx = unlocked.findIndex(h => h.def.id === viewHeroId);
viewHeroId = unlocked[(idx + 1) % unlocked.length].def.id;
updateView();
break;
}
case 'unequip':
Cosmetics.unequip(viewHeroId, el.dataset.slot);
Audio.deny();
updateView();
break;
case 'filter':
filterType = el.dataset.val;
updateView();
break;
case 'sort':
sortMode = el.dataset.val;
updateView();
break;
}
}

// ---- DRAG & DROP ----
let dragUid = null, dragGhost = null, dragStartX = 0, dragStartY = 0, dragActive = false;

function onCardPointerDown(e) {
const card = e.target.closest('.cos-card:not(.equipped)');
if (!card) return;
e.preventDefault();
dragUid = parseInt(card.dataset.uid);
dragStartX = e.clientX; dragStartY = e.clientY;
dragActive = false;

const onMove = ev => {
if (!dragUid) return;
if (!dragActive && Math.hypot(ev.clientX - dragStartX, ev.clientY - dragStartY) > 10) {
dragActive = true;
const item = Cosmetics.getItem(dragUid);
dragGhost = document.createElement('div');
dragGhost.className = 'cos-drag-ghost';
if (item.type === 'sound') {
dragGhost.innerHTML = `♪ ${item.name}`;
} else {
dragGhost.innerHTML = `<span class="cos-drag-color" style="background:${item.value}"></span> ${item.value}`;
}
document.body.appendChild(dragGhost);
card.classList.add('dragging');
}
if (dragActive && dragGhost) {
dragGhost.style.left = ev.clientX + 'px';
dragGhost.style.top = ev.clientY + 'px';
box.querySelectorAll('.cos-slot').forEach(s => s.classList.remove('drag-over'));
const el = document.elementFromPoint(ev.clientX, ev.clientY);
const target = el && el.closest ? el.closest('.cos-slot') : null;
if (target) target.classList.add('drag-over');
}
};

const onUp = ev => {
window.removeEventListener('pointermove', onMove);
window.removeEventListener('pointerup', onUp);
if (dragActive && dragGhost) {
const el = document.elementFromPoint(ev.clientX, ev.clientY);
const slotEl = el && el.closest ? el.closest('.cos-slot') : null;
if (slotEl) {
const slotKey = slotEl.dataset.slot;
const item = Cosmetics.getItem(dragUid);
// Validar que el tipo coincide con el slot
if (item.type === slotKey) {
Cosmetics.equip(viewHeroId, slotKey, dragUid);
Audio.buy();
} else {
Bus.emit('toast', { msg: t('cos.wrongSlot') });
Audio.deny();
}
}
dragGhost.remove(); dragGhost = null;
card.classList.remove('dragging');
box.querySelectorAll('.cos-slot').forEach(s => s.classList.remove('drag-over'));
updateView();
}
dragUid = null; dragActive = false;
};

window.addEventListener('pointermove', onMove);
window.addEventListener('pointerup', onUp);
}

// ---- OPEN / CLOSE ----
export function openCosmeticsModal() {
const prev = document.getElementById('cos-modal');
if (prev) prev.remove();

viewHeroId = Heroes.active;

modal = document.createElement('div');
modal.id = 'cos-modal';
modal.className = 'cos-overlay';
box = document.createElement('div');
box.className = 'cos-box';
modal.appendChild(box);
document.body.appendChild(modal);

modal.addEventListener('pointerdown', e => { if (e.target === modal) closeModal(); });
box.addEventListener('pointerdown', handleAction);
box.addEventListener('pointerdown', onCardPointerDown);

updateView();
}

function closeModal() {
if (modal) { modal.remove(); modal = null; box = null; }
}