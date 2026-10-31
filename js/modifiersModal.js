import { Modifiers, getModDisplayName } from './modifiers.js';
import { Resources } from './resources.js';
import { Heroes } from './heroes.js';
import { Audio } from './audio.js';
import { Bus } from './events.js';
import { t, tr } from './localization.js';

// ============================================================
// MODAL DE MODIFICADORES (GACHA)
// Arquitectura: delegación de eventos + updateView() sin recursión
// Estilo: blanco + morado, línea gruesa izquierda
// ============================================================

const RARITY_COLORS = ['#333','#666','#E53935','#9C27B0','#FFD700','#FFD700'];
const RARITY_NAMES = ['COMÚN','POCO COMÚN','RARO','ÉPICO','LEGENDARIO','MÍTICO'];

let modal = null, box = null;
let viewHeroId = 'pistol';
let displayMode = 'normal';
let filterRarity = -1;
let sortMode = 'rarity';
let fuseSlots = [null, null, null];
let lockedMods = new Set();

// ---- HELPERS ----
function getFilteredInventory() {
let inv = [...Modifiers.inventory];
if (filterRarity >= 0) inv = inv.filter(m => m.rarity === filterRarity);
if (sortMode === 'alpha') inv.sort((a, b) => getModDisplayName(a).localeCompare(getModDisplayName(b)));
else if (sortMode === 'rarity') inv.sort((a, b) => b.rarity - a.rarity);
else if (sortMode === 'type') inv.sort((a, b) => (a.pros[0]?.[0] || '').localeCompare(b.pros[0]?.[0] || ''));
return inv;
}

function buildCardHtml(mod, equipped) {
const isEquipped = equipped.includes(mod.uid);
const isLocked = lockedMods.has(mod.uid);
const d = Modifiers.desc(mod);
let html = `<div class="mod-card ${isEquipped ? 'equipped' : ''} ${isLocked ? 'locked' : ''}" data-uid="${mod.uid}" style="border-left-color:${RARITY_COLORS[mod.rarity]}">`;
html += `<div class="mod-card-top">
<span class="mod-card-sym" style="color:${RARITY_COLORS[mod.rarity]}">${mod.sym}</span>
<span class="mod-card-name">${getModDisplayName(mod)}</span>
<div class="mod-lock-check ${isLocked ? 'checked' : ''}" data-action="lock" data-uid="${mod.uid}"></div>
</div>`;
if (displayMode !== 'compact') {
html += `<div class="mod-card-fx">${d.pros.map(p => `<div class="mod-pro">▸ ${p}</div>`).join('')}${d.contras.map(c => `<div class="mod-con">▸ ${c}</div>`).join('')}</div>`;
}
if (displayMode === 'full') {
html += `<canvas class="mod-card-hero" width="50" height="50" data-mod-uid="${mod.uid}"></canvas>`;
}
if (isEquipped) html += `<span class="mod-eq-tag">${t('mod.equipped')}</span>`;
else if (!isLocked) html += `<span class="mod-drag-hint">${t('mod.dragHint')}</span>`;
html += `</div>`;
return html;
}

// ---- UPDATE VIEW (solo pinta HTML, NUNCA se llama a sí misma) ----
function updateView() {
if (!box) return;
const equipped = Modifiers.getEquipped(viewHeroId);
const cost = Modifiers.cost();
const heroDef = Heroes.get(viewHeroId)?.def;
const unlockedHeroes = Heroes.list.filter(h => h.unlocked);
const heroIdx = unlockedHeroes.findIndex(h => h.def.id === viewHeroId);

let html = '';

// ==== HEADER ====
html += `<div class="mod-header">
<span class="mod-title">${t('mod.title')}</span>
<button class="mod-close-x" data-action="close">✕</button>
</div>`;

// ==== HERO CARD ====
html += `<div class="mod-hero-card">
<div class="mod-hero-left">
<canvas id="mod-hero-cv" width="80" height="80"></canvas>
<div class="mod-hero-info">
<div class="mod-hero-name">${tr(heroDef.name)} · ${t('hud.lv')} ${Heroes.get(viewHeroId)?.level || 1}</div>
<div class="mod-hero-slots-label">${t('mod.slots')}</div>
</div>
</div>
<div class="mod-hero-switch">
<button class="mod-switch-btn" data-action="hero-prev">◀</button>
<span class="mod-hero-count">${heroIdx + 1}/${unlockedHeroes.length}</span>
<button class="mod-switch-btn" data-action="hero-next">▶</button>
</div>
</div>`;

// ==== SLOTS ====
html += `<div class="mod-slots">`;
for (let i = 0; i < 2; i++) {
const uid = equipped[i];
const mod = uid ? Modifiers.getMod(uid) : null;
if (mod) {
const d = Modifiers.desc(mod);
html += `<div class="mod-slot filled" data-slot="${i}" style="border-left-color:${RARITY_COLORS[mod.rarity]}">
<button class="mod-unequip" data-action="unequip" data-slot="${i}">✕</button>
<span class="mod-slot-sym" style="color:${RARITY_COLORS[mod.rarity]}">${mod.sym}</span>
<span class="mod-slot-name">${getModDisplayName(mod)}</span>
<div class="mod-slot-fx">${d.pros.map(p => `<div class="mod-pro">▸ ${p}</div>`).join('')}${d.contras.map(c => `<div class="mod-con">▸ ${c}</div>`).join('')}</div>
</div>`;
} else {
html += `<div class="mod-slot empty" data-slot="${i}"><span class="mod-slot-empty-txt">${t('mod.dragHere')}</span></div>`;
}
}
html += `</div>`;

// ==== GACHA ====
html += `<div class="mod-gacha-row">
<button class="mod-roll" data-action="roll" ${!Resources.has('PUR', cost) ? 'disabled' : ''}>${t('mod.gacha')} · ${cost} PUR</button>
</div>`;

// ==== FILTERS ====
html += `<div class="mod-filters">
<div class="mod-filter-row">
<span class="mod-filter-label">${t('mod.view')}:</span>
<button class="mod-filter-btn ${displayMode === 'compact' ? 'active' : ''}" data-action="view" data-val="compact">${t('mod.compact')}</button>
<button class="mod-filter-btn ${displayMode === 'normal' ? 'active' : ''}" data-action="view" data-val="normal">${t('mod.normal')}</button>
<button class="mod-filter-btn ${displayMode === 'full' ? 'active' : ''}" data-action="view" data-val="full">${t('mod.full')}</button>
</div>
<div class="mod-filter-row">
<span class="mod-filter-label">${t('mod.rarity')}:</span>
<button class="mod-filter-btn ${filterRarity === -1 ? 'active' : ''}" data-action="rarity" data-val="-1">${t('mod.all')}</button>
${RARITY_NAMES.map((n, i) => `<button class="mod-filter-btn ${filterRarity === i ? 'active' : ''}" data-action="rarity" data-val="${i}" style="border-left-color:${RARITY_COLORS[i]}">${n.charAt(0)}</button>`).join('')}
</div>
<div class="mod-filter-row">
<span class="mod-filter-label">${t('mod.sort')}:</span>
<button class="mod-filter-btn ${sortMode === 'rarity' ? 'active' : ''}" data-action="sort" data-val="rarity">${t('mod.byRarity')}</button>
<button class="mod-filter-btn ${sortMode === 'alpha' ? 'active' : ''}" data-action="sort" data-val="alpha">A-Z</button>
<button class="mod-filter-btn ${sortMode === 'type' ? 'active' : ''}" data-action="sort" data-val="type">${t('mod.byType')}</button>
</div>
</div>`;

// ==== INVENTORY ====
const inv = getFilteredInventory();
html += `<div class="mod-inv-title">${t('mod.inventory')} (${inv.length})</div>`;
html += `<div class="mod-inv ${displayMode}">`;
for (const mod of inv) {
html += buildCardHtml(mod, equipped);
}
html += `</div>`;

// ==== FUSION ZONE (debajo del inventario) ====
html += `<div class="mod-fuse-zone">
<div class="mod-fuse-title">${t('mod.fuseTitle')}</div>
<div class="mod-fuse-slots">`;
for (let i = 0; i < 3; i++) {
const uid = fuseSlots[i];
const mod = uid ? Modifiers.getMod(uid) : null;
if (mod) {
html += `<div class="mod-fuse-slot filled" data-fuse="${i}" style="border-left-color:${RARITY_COLORS[mod.rarity]}">
<span style="color:${RARITY_COLORS[mod.rarity]}">${mod.sym}</span>
<button class="mod-fuse-remove" data-action="fuse-remove" data-fuse="${i}">✕</button>
</div>`;
} else {
html += `<div class="mod-fuse-slot empty" data-fuse="${i}"><span>+</span></div>`;
}
}
html += `</div>
<div class="mod-fuse-actions">
<button class="mod-fuse-auto" data-action="fuse-auto">${t('mod.autoFill')}</button>
<button class="mod-fuse-btn" data-action="fuse" ${!Modifiers.canFuse(fuseSlots.filter(Boolean)) ? 'disabled' : ''}>${t('mod.fuse')}</button>
</div>
</div>`;

box.innerHTML = html;

// Post-render
drawHeroPreview();
if (displayMode === 'full') drawCardPreviews();
}

// ---- DRAW HERO PREVIEW ----
function drawHeroPreview() {
const cv = box.querySelector('#mod-hero-cv');
if (!cv) return;
const ctx = cv.getContext('2d');
const equipped = Modifiers.getEquipped(viewHeroId);
const modA = equipped[0] ? Modifiers.getMod(equipped[0]) : null;
const modB = equipped[1] ? Modifiers.getMod(equipped[1]) : null;
const heroDef = Heroes.get(viewHeroId)?.def;
ctx.clearRect(0, 0, 80, 80);
ctx.save();
ctx.translate(40, 40);
if (modA || modB) {
const auraR = 32;
if (modA && modB) {
const colA = Modifiers.getModColor(modA);
const colB = Modifiers.getModColor(modB);
ctx.globalAlpha = 0.4;
ctx.strokeStyle = colA; ctx.lineWidth = 3;
ctx.beginPath(); ctx.arc(0, 0, auraR, 0, Math.PI); ctx.stroke();
ctx.strokeStyle = colB;
ctx.beginPath(); ctx.arc(0, 0, auraR, Math.PI, Math.PI * 2); ctx.stroke();
ctx.globalAlpha = 0.12;
ctx.fillStyle = colA;
ctx.beginPath(); ctx.arc(0, 0, auraR - 3, 0, Math.PI); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
ctx.fillStyle = colB;
ctx.beginPath(); ctx.arc(0, 0, auraR - 3, Math.PI, Math.PI * 2); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
} else {
const col = Modifiers.getModColor(modA || modB);
ctx.globalAlpha = 0.4;
ctx.strokeStyle = col; ctx.lineWidth = 3;
ctx.beginPath(); ctx.arc(0, 0, auraR, 0, 6.28); ctx.stroke();
ctx.globalAlpha = 0.1;
ctx.fillStyle = col;
ctx.beginPath(); ctx.arc(0, 0, auraR - 3, 0, 6.28); ctx.fill();
}
}
ctx.globalAlpha = 1;
if (heroDef) heroDef.draw(ctx, 0, 0, 16);
ctx.restore();
}

// ---- DRAW CARD PREVIEWS (modo full) ----
function drawCardPreviews() {
box.querySelectorAll('.mod-card-hero').forEach(cv => {
const uid = parseInt(cv.dataset.modUid);
const mod = Modifiers.getMod(uid);
if (!mod) return;
const ctx = cv.getContext('2d');
const col = Modifiers.getModColor(mod);
ctx.clearRect(0, 0, 50, 50);
ctx.globalAlpha = 0.3;
ctx.strokeStyle = col; ctx.lineWidth = 3;
ctx.beginPath(); ctx.arc(25, 25, 18, 0, 6.28); ctx.stroke();
ctx.globalAlpha = 0.1;
ctx.fillStyle = col;
ctx.beginPath(); ctx.arc(25, 25, 16, 0, 6.28); ctx.fill();
ctx.globalAlpha = 1;
ctx.fillStyle = '#000';
ctx.beginPath(); ctx.arc(25, 25, 10, 0, 6.28); ctx.fill();
ctx.fillStyle = '#fff';
ctx.beginPath(); ctx.arc(25, 25, 4, 0, 6.28); ctx.fill();
});
}

// ---- REVEAL ANIMATION ----
function showReveal(mod) {
const d = Modifiers.desc(mod);
const reveal = document.createElement('div');
reveal.className = 'mod-reveal-overlay';
reveal.innerHTML = `<div class="mod-reveal-card" style="border-left-color:${RARITY_COLORS[mod.rarity]}">
<div class="mod-reveal-sym" style="color:${RARITY_COLORS[mod.rarity]}">${mod.sym}</div>
<div class="mod-reveal-name">${getModDisplayName(mod)}</div>
<div class="mod-reveal-rarity" style="color:${RARITY_COLORS[mod.rarity]}">${RARITY_NAMES[mod.rarity]}</div>
<div class="mod-reveal-fx">${d.pros.map(p => `<div class="mod-pro">▸ ${p}</div>`).join('')}${d.contras.map(c => `<div class="mod-con">▸ ${c}</div>`).join('')}</div>
<div class="mod-reveal-tap">${t('mod.tapContinue')}</div>
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

// ---- DELEGACIÓN DE EVENTOS (UN solo listener) ----
function handleAction(e) {
const el = e.target.closest('[data-action]');
if (!el) return;
e.preventDefault();
const action = el.dataset.action;

switch (action) {
case 'close':
closeModal();
break;
case 'roll': {
const result = Modifiers.buy();
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
Modifiers.unequip(viewHeroId, parseInt(el.dataset.slot));
Audio.deny();
updateView();
break;
case 'view':
displayMode = el.dataset.val;
updateView();
break;
case 'rarity':
filterRarity = parseInt(el.dataset.val);
updateView();
break;
case 'sort':
sortMode = el.dataset.val;
updateView();
break;
case 'lock': {
const uid = parseInt(el.dataset.uid);
if (lockedMods.has(uid)) lockedMods.delete(uid);
else lockedMods.add(uid);
updateView();
break;
}
case 'fuse-remove':
fuseSlots[parseInt(el.dataset.fuse)] = null;
updateView();
break;
case 'fuse-auto': {
const available = Modifiers.inventory.filter(m =>
!lockedMods.has(m.uid) &&
!Modifiers.getEquipped(viewHeroId).includes(m.uid) &&
!fuseSlots.includes(m.uid)
);
const byRarity = {};
for (const m of available) {
if (!byRarity[m.rarity]) byRarity[m.rarity] = [];
byRarity[m.rarity].push(m);
}
let filled = false;
for (const r in byRarity) {
if (byRarity[r].length >= 3 && parseInt(r) < 5) {
fuseSlots = [byRarity[r][0].uid, byRarity[r][1].uid, byRarity[r][2].uid];
filled = true;
break;
}
}
if (!filled) Bus.emit('toast', { msg: t('mod.noFuseAvail') });
updateView();
break;
}
case 'fuse': {
const uids = fuseSlots.filter(Boolean);
if (Modifiers.canFuse(uids)) {
const result = Modifiers.fuse(uids);
if (result) {
Audio.buy();
fuseSlots = [null, null, null];
Bus.emit('toast', { msg: `${t('mod.fused')} ${result.sym} ${getModDisplayName(result)} (${RARITY_NAMES[result.rarity]})` });
updateView();
}
}
break;
}
}
}

// ---- DRAG & DROP ----
let dragUid = null, dragGhost = null, dragStartX = 0, dragStartY = 0, dragActive = false;

function onCardPointerDown(e) {
const card = e.target.closest('.mod-card:not(.equipped)');
if (!card) return;
e.preventDefault();
dragUid = parseInt(card.dataset.uid);
dragStartX = e.clientX; dragStartY = e.clientY;
dragActive = false;

const onMove = ev => {
if (!dragUid) return;
if (!dragActive && Math.hypot(ev.clientX - dragStartX, ev.clientY - dragStartY) > 10) {
dragActive = true;
const mod = Modifiers.getMod(dragUid);
dragGhost = document.createElement('div');
dragGhost.className = 'mod-drag-ghost';
dragGhost.innerHTML = `<span style="color:${RARITY_COLORS[mod.rarity]}">${mod.sym}</span> ${getModDisplayName(mod)}`;
document.body.appendChild(dragGhost);
card.classList.add('dragging');
}
if (dragActive && dragGhost) {
dragGhost.style.left = ev.clientX + 'px';
dragGhost.style.top = ev.clientY + 'px';
box.querySelectorAll('.mod-slot, .mod-fuse-slot').forEach(s => s.classList.remove('drag-over'));
const el = document.elementFromPoint(ev.clientX, ev.clientY);
const target = el && el.closest ? el.closest('.mod-slot, .mod-fuse-slot') : null;
if (target) target.classList.add('drag-over');
}
};

const onUp = ev => {
window.removeEventListener('pointermove', onMove);
window.removeEventListener('pointerup', onUp);
if (dragActive && dragGhost) {
const el = document.elementFromPoint(ev.clientX, ev.clientY);
const slotEl = el && el.closest ? el.closest('.mod-slot') : null;
const fuseEl = el && el.closest ? el.closest('.mod-fuse-slot') : null;
if (slotEl) {
Modifiers.equip(viewHeroId, parseInt(slotEl.dataset.slot), dragUid);
Audio.buy();
} else if (fuseEl) {
const fuseIdx = parseInt(fuseEl.dataset.fuse);
const mod = Modifiers.getMod(dragUid);
const existing = fuseSlots.filter(Boolean).map(u => Modifiers.getMod(u)).filter(Boolean);
if (existing.length > 0 && existing[0].rarity !== mod.rarity) {
Bus.emit('toast', { msg: t('mod.sameRarityOnly') });
Audio.deny();
} else if (lockedMods.has(dragUid)) {
Bus.emit('toast', { msg: t('mod.locked') });
Audio.deny();
} else {
fuseSlots[fuseIdx] = dragUid;
Audio.buy();
}
}
dragGhost.remove(); dragGhost = null;
card.classList.remove('dragging');
box.querySelectorAll('.mod-slot, .mod-fuse-slot').forEach(s => s.classList.remove('drag-over'));
updateView();
}
dragUid = null; dragActive = false;
};

window.addEventListener('pointermove', onMove);
window.addEventListener('pointerup', onUp);
}

// ---- OPEN / CLOSE ----
export function openModifiersModal() {
const prev = document.getElementById('mod-modal');
if (prev) prev.remove();

viewHeroId = Heroes.active;
fuseSlots = [null, null, null];

modal = document.createElement('div');
modal.id = 'mod-modal';
modal.className = 'mod-overlay';
box = document.createElement('div');
box.className = 'mod-box';
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