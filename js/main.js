import { Save } from './save.js';
import { Settings } from './settings.js';
import { Resources } from './resources.js';
import { Heroes, HERO_DEFS } from './heroes.js';
import { Trees } from './heroTree.js';
import { World } from './world.js';
import { Combat } from './combat.js';
import { Accelerator } from './inventory.js';
import { Track, Missions } from './missions.js';
import { Achievements } from './achievements.js';
import { LevelUps } from './levelUps.js';
import { Rebirth } from './rebirth.js';
import { RebirthView } from './rebirthView.js';
import { Shop } from './shop.js';
import { Legacy } from './legacyTree.js';
import { Game } from './game.js';
import { UI } from './ui.js';
import { TreeView } from './treeView.js';
import { BattleView } from './battleView.js';
import { TrayIdle } from './trayIdle.js';
import { initDragDrop } from './dragdrop.js';
import { Input } from './input.js';
import { BAL } from './config.js';
import { initCover, isStarted, updateIntro, skipCover } from './cover.js';
import { setTransitionCanvas, updateTransition, drawTransition } from './transition.js';
import { applyLanguage, t, tr } from './localization.js';
import { Tutorial } from './tutorial.js';
import { Bus } from './events.js';
import { Modifiers } from './modifiers.js';
import { Audio } from './audio.js';
import { openModifiersModal } from './modifiersModal.js';
import { Cosmetics } from './cosmetics.js';

// ---- PREVENIR GESTOS NATIVOS EN MÓVIL ----
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault());

// ---------- arranque ----------
const save = Save.read() || {};
Settings.init(save.settings);
Resources.data = Object.assign(Resources.data, save.res || {});
Heroes.init(save.heroes);
Legacy.init(save.legacy);

// ---- LEGADO: re-compra de seguridad al arrancar ----
for (const h of Heroes.list) {
if (h.unlocked) {
const rec = Legacy.getRecord(h.def.id);
const tree = Legacy.get(h.def.id);
const owned = tree ? tree.owned.size : 0;
for (let i = owned; i < rec; i++) Legacy.grantNode(h.def.id);
}
}

Trees.init(HERO_DEFS.map(d => d.id), save.trees);
World.init(save.world);
Accelerator.init(save.accelerator || save.forge || 0);
Track.init(save.track);
Missions.init(save.missions);
Achievements.init(save.ach);
LevelUps.init(save.levelUps, save.accumulated);
Rebirth.init(save.rebirth, save.foresight);
Modifiers.init(save.modifiers);
Cosmetics.init(save.cosmetics);
Shop.init(save.shop);
Shop.applyUnlockedHeroes();
Combat.init();
Game.recalcMilestone();

Bus.on('rebirthNodeBought', () => {
for (const t of Trees.all()) t.invalidate();
});

// ---------- lienzos ----------
const bCv = document.getElementById('battle');
const tCv = document.getElementById('tree');
const trayCv = document.getElementById('trayCanvas');
const fxCv = document.getElementById('fxCanvas');
const rbCv = document.getElementById('rebirth');

BattleView.init(bCv);
TreeView.init(tCv);
RebirthView.init(rbCv);
setTransitionCanvas(fxCv);
const fxCtx = fxCv.getContext('2d');

function fit(cv) {
const w = cv.clientWidth, h = cv.clientHeight;
const d = window.devicePixelRatio || 1;
cv.width = Math.max(1, Math.round(w * d));
cv.height = Math.max(1, Math.round(h * d));
cv.getContext('2d').setTransform(d, 0, 0, d, 0, 0);
return { w, h };
}
function fitFx() {
const d = window.devicePixelRatio || 1;
fxCv.width = innerWidth * d; fxCv.height = innerHeight * d;
fxCtx.setTransform(d, 0, 0, d, 0, 0);
}
function resize() {
const b = fit(bCv); BattleView.resize(b.w, b.h);
const tv = fit(tCv); TreeView.resize(tv.w, tv.h);
const tr2 = fit(trayCv); TrayIdle.resize(tr2.w, tr2.h);
if (rbCv) { const rb = fit(rbCv); RebirthView.resize(rb.w, rb.h); }
fitFx();
}
window.addEventListener('resize', resize);
resize();
TrayIdle.init(trayCv);

// ---------- UI, arrastre, cruceta y portada ----------
UI.init();
initDragDrop();

// ---- BOTÓN MODIFICADORES ----
const modBtn = document.getElementById('btn-accel');
if (modBtn) {
modBtn.textContent = t('mod.btn');
modBtn.addEventListener('pointerdown', e => {
e.preventDefault();
openModifiersModal();
});
}

// ---- CLICK-TO-MOVE ----
bCv.addEventListener('pointerdown', e => {
if (!isStarted()) return;
const r = bCv.getBoundingClientRect();
Combat.moveTarget = { x: e.clientX - r.left, y: e.clientY - r.top };
});

Input.init();

const isRebirthReturn = sessionStorage.getItem('mhs_rebirth_skip') === '1';
sessionStorage.removeItem('mhs_rebirth_skip');
if (isRebirthReturn) {
skipCover(() => {
applyLanguage();
UI.tick();
updateRebirthTexts();
setTimeout(() => openRebirthTree(), 500);
});
} else {
initCover(() => {
applyLanguage();
UI.tick();
updateRebirthTexts();
setTimeout(() => Tutorial.start(), 900);
});
}

// ---------- RENACIMIENTO ----------
function performRebirth() {
Rebirth.doRebirth(Heroes.list, Track);
Rebirth.seenIntro = true;
for (const h of Heroes.list) {
if (h.unlocked) {
const rec = Legacy.getRecord(h.def.id);
const tree = Legacy.get(h.def.id);
const owned = tree ? tree.owned.size : 0;
for (let i = owned; i < rec; i++) Legacy.grantNode(h.def.id);
}
}
const oroKeep = Resources.data.ORO || 0;
Resources.data = { CIR: 10, TRI: 0, CUA: 0, HEX: 0, PEN: 0, PUR: 0, ORO: oroKeep };
Resources.rates = {}; Resources._acc = {};
Heroes.init({});
Heroes.active = 'pistol';
Shop.applyUnlockedHeroes();
const ids = HERO_DEFS.map(d => d.id);
const newTrees = {};
for (const id of ids) newTrees[id] = { seed: Rebirth.heroSeed + '|' + id };
Trees.init(ids, newTrees);
Shop.applyStartNodes();
Achievements.init([]);
Missions.list = [];
Missions.init(null);
LevelUps.accumulated = 0;
LevelUps.state = {};
LevelUps.pending = 0;
LevelUps.showing = false;
LevelUps.lastLevel = 1;
if (LevelUps.overlay) LevelUps.overlay.classList.add('hidden');
Accelerator.init(0);
World.resetRun();
Game.recalcMilestone();
Save.write();
sessionStorage.setItem('mhs_rebirth_skip', '1');
location.reload();
}

function openRebirthModal() {
const prev = document.getElementById('rebirth-modal');
if (prev) prev.remove();
const gain = Rebirth.pointsToGain(Heroes.list);
const canDo = Rebirth.canRebirth(Heroes.list);
const firstTime = !Rebirth.seenIntro;
const modal = document.createElement('div');
modal.id = 'rebirth-modal';
modal.className = 'rebirth-overlay-modal';
let html = '<div class="rebirth-box">';
html += `<div class="rebirth-title">${t('rebirth.title')}</div>`;
if (firstTime) html += `<div class="rebirth-desc">${t('rebirth.desc')}</div>`;
html += '<div class="rebirth-gain">' +
(canDo ? t('rebirth.gain').replace('{n}', gain).replace('{s}', gain === 1 ? '' : 's') : t('rebirth.need')) +
'</div>';
html += '<div class="rebirth-btns">';
if (canDo) html += `<button id="rebirth-yes" class="rebirth-yes">${t('rebirth.do')}</button>`;
html += `<button id="rebirth-tree-btn" class="rebirth-tree-btn">${t('rebirth.tree')}</button>`;
html += `<button id="rebirth-no" class="rebirth-no">${t('rebirth.cancel')}</button>`;
html += '</div></div>';
modal.innerHTML = html;
document.body.appendChild(modal);
document.getElementById('rebirth-no').onclick = () => modal.remove();
document.getElementById('rebirth-tree-btn').onclick = () => { modal.remove(); openRebirthTree(); };
if (canDo) document.getElementById('rebirth-yes').onclick = () => { modal.remove(); performRebirth(); };
}

function openRebirthTree() {
const overlay = document.getElementById('rebirth-overlay');
if (!overlay) return;
overlay.classList.remove('hidden');
overlay.classList.remove('closing');
RebirthView.visible = true;
updateRebirthPoints();
resize();
}

function closeRebirthTree() {
const overlay = document.getElementById('rebirth-overlay');
if (!overlay) return;
RebirthView.visible = false;
overlay.classList.add('closing');
setTimeout(() => {
overlay.classList.add('hidden');
overlay.classList.remove('closing');
}, 300);
}

function updateRebirthPoints() {
const el = document.getElementById('rebirth-points-val');
if (el) el.textContent = Rebirth.points;
}

function updateRebirthTexts() {
const btn = document.getElementById('btn-rebirth');
if (btn) btn.textContent = t('rebirth.btn');
const title = document.querySelector('#rebirth-overlay .rebirth-title');
if (title) title.textContent = t('rebirth.tree');
const pts = document.getElementById('rebirth-points');
if (pts) pts.innerHTML = `${t('rebirth.points')}: <span id="rebirth-points-val">${Rebirth.points}</span>`;
const close = document.getElementById('rebirth-close');
if (close) close.textContent = t('rebirth.close');
}

const btnRebirth = document.getElementById('btn-rebirth');
if (btnRebirth) btnRebirth.onclick = openRebirthModal;
const btnRebirthClose = document.getElementById('rebirth-close');
if (btnRebirthClose) btnRebirthClose.onclick = closeRebirthTree;
setInterval(() => { if (RebirthView.visible) updateRebirthPoints(); }, 500);

// ---------- bucle principal ----------
let last = performance.now();
document.addEventListener('visibilitychange', () => {
if (document.hidden) Save.write();
else last = performance.now();
});
window.addEventListener('beforeunload', () => Save.write());
setInterval(() => { if (isStarted()) Save.write(); }, BAL.saveEvery * 1000);

function frame(now) {
const dt = Math.min(0.05, (now - last) / 1000);
last = now;
updateIntro();
updateTransition();
drawTransition(fxCtx);
const paused = Game.paused || LevelUps.showing;
if (isStarted()) {
if (!paused) Game.update(dt);
BattleView.draw(dt);
TreeView.draw(dt);
RebirthView.draw(dt);
TrayIdle.update(dt);
TrayIdle.draw();
}
requestAnimationFrame(frame);
}
requestAnimationFrame(frame);