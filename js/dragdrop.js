import { Heroes } from './heroes.js';
import { Combat } from './combat.js';
import { TrayIdle } from './trayIdle.js';
import { Audio } from './audio.js';
import { drawHeroIcon } from './ui.js';
import { World } from './world.js';
import { Bus } from './events.js';
import { t } from './localization.js';

export function initDragDrop() {
const ghost = document.getElementById('drag-ghost');
const battleWrap = document.getElementById('battle-wrap');
const trayCv = document.getElementById('trayCanvas');
let dragging = null;
let lastX = 0, lastY = 0, lastT = 0, pvx = 0, pvy = 0;

trayCv.addEventListener('pointerdown', e => {
const r = trayCv.getBoundingClientRect();
const id = TrayIdle.pickAt(e.clientX - r.left, e.clientY - r.top);
if (!id) return;
dragging = id;
TrayIdle.hold(id);
ghost.innerHTML = '';
const c = document.createElement('canvas');
c.width = 44; c.height = 44;
ghost.appendChild(c);
drawHeroIcon(c, Heroes.get(id).def);
ghost.classList.remove('hidden');
lastX = e.clientX; lastY = e.clientY; lastT = performance.now();
pvx = pvy = 0;
battleWrap.classList.add('droppable');
Combat.dragging = true;
e.preventDefault();
});

window.addEventListener('pointermove', e => {
if (!dragging) return;
e.preventDefault();
const now = performance.now();
const dt = Math.max(1, now - lastT) / 1000;
pvx = (e.clientX - lastX) / dt; pvy = (e.clientY - lastY) / dt;
lastX = e.clientX; lastY = e.clientY; lastT = now;
ghost.style.left = e.clientX + 'px';
ghost.style.top = e.clientY + 'px';
});

window.addEventListener('pointerup', e => {
if (!dragging) return;
const id = dragging; dragging = null;
ghost.classList.add('hidden');
battleWrap.classList.remove('droppable');
Combat.dragging = false;
const r = battleWrap.getBoundingClientRect();
const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;

// ---- NO se puede cambiar de héroe durante un jefe ----
const bossActive = World.boss && !World.boss.dead;
if (inside && bossActive) {
Bus.emit('toast', { msg: t('toast.noSwapBoss') });
Audio.deny();
const tr = trayCv.getBoundingClientRect();
TrayIdle.release(id, e.clientX - tr.left, e.clientY - tr.top, pvx, pvy);
} else if (inside && Heroes.swap(id)) {
Combat.swapHero();
Audio.swap();
TrayIdle.remove(id);      // el héroe se va al combate
TrayIdle.syncRoster();    // el héroe anterior vuelve a la zona de espera
} else {
const tr = trayCv.getBoundingClientRect();
TrayIdle.release(id, e.clientX - tr.left, e.clientY - tr.top, pvx, pvy);
}
});
}