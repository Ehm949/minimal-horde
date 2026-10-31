import { Rebirth } from './rebirth.js';
import { Heroes } from './heroes.js';
import { fxDescRebirth } from './rebirthTree.js';
import { clamp, fmt } from './utils.js';
import { Audio } from './audio.js';
import { t, tr } from './localization.js';

const ACCENT = '#673AB7';
const ACCENT_LIGHT = '#9575CD';

export const RebirthView = {
cv: null, ctx: null, w: 0, h: 0,
tip: null, hover: null, pan: null, downPt: null, time: 0,
mini: null, miniCtx: null, miniMap: null, miniDrag: false,
visible: false,

init(cv) {
this.cv = cv; this.ctx = cv.getContext('2d');
this.pointers = new Map();
this.pinchDist = 0;
this.pinchZ = 1;
this.tip = document.createElement('div');
this.tip.id = 'rebirth-tip'; this.tip.style.display = 'none';
cv.parentElement.appendChild(this.tip);

this.mini = document.createElement('canvas');
this.mini.id = 'rebirth-mini';
this.mini.width = 150; this.mini.height = 150;
cv.parentElement.appendChild(this.mini);
this.miniCtx = this.mini.getContext('2d');

const miniMove = e => {
if (!this.miniMap) return;
const r = this.mini.getBoundingClientRect();
const k = this.mini.width / r.width;
const p = this.miniMap;
Rebirth.cam.x = p.minX + ((e.clientX - r.left) * k - p.ox) / p.sc;
Rebirth.cam.y = p.minY + ((e.clientY - r.top) * k - p.oy) / p.sc;
};
this.mini.addEventListener('pointerdown', e => { this.miniDrag = true; miniMove(e); this.mini.setPointerCapture(e.pointerId); });
this.mini.addEventListener('pointermove', e => { if (this.miniDrag) miniMove(e); });
this.mini.addEventListener('pointerup', () => this.miniDrag = false);

cv.addEventListener('wheel', e => {
e.preventDefault();
const r = cv.getBoundingClientRect();
const sx = e.clientX - r.left, sy = e.clientY - r.top;
const wx = Rebirth.cam.x + (sx - this.w / 2) / Rebirth.cam.z;
const wy = Rebirth.cam.y + (sy - this.h / 2) / Rebirth.cam.z;
Rebirth.cam.z = clamp(Rebirth.cam.z * Math.exp(-e.deltaY * 0.0012), 0.12, 2.4);
Rebirth.cam.x = wx - (sx - this.w / 2) / Rebirth.cam.z;
Rebirth.cam.y = wy - (sy - this.h / 2) / Rebirth.cam.z;
}, { passive: false });

cv.addEventListener('pointerdown', e => {
cv.setPointerCapture(e.pointerId);
this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
if (this.pointers.size === 2) {
const pts = [...this.pointers.values()];
this.pinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
this.pinchZ = Rebirth.cam.z;
this.pan = null;
this.downPt = null;
return;
}
this.pan = { x: e.clientX, y: e.clientY, cx: Rebirth.cam.x, cy: Rebirth.cam.y };
this.downPt = { x: e.clientX, y: e.clientY };
cv.classList.add('grabbing');
});

cv.addEventListener('pointermove', e => {
if (this.pointers.has(e.pointerId)) {
this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
}
if (this.pointers.size === 2) {
const pts = [...this.pointers.values()];
const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
if (this.pinchDist > 0) {
const r = cv.getBoundingClientRect();
const midX = (pts[0].x + pts[1].x) / 2 - r.left;
const midY = (pts[0].y + pts[1].y) / 2 - r.top;
const wx = Rebirth.cam.x + (midX - this.w / 2) / Rebirth.cam.z;
const wy = Rebirth.cam.y + (midY - this.h / 2) / Rebirth.cam.z;
Rebirth.cam.z = clamp(this.pinchZ * (dist / this.pinchDist), 0.12, 2.4);
Rebirth.cam.x = wx - (midX - this.w / 2) / Rebirth.cam.z;
Rebirth.cam.y = wy - (midY - this.h / 2) / Rebirth.cam.z;
}
return;
}
if (this.pan) {
Rebirth.cam.x = this.pan.cx - (e.clientX - this.pan.x) / Rebirth.cam.z;
Rebirth.cam.y = this.pan.cy - (e.clientY - this.pan.y) / Rebirth.cam.z;
if (this.downPt && Math.hypot(e.clientX - this.downPt.x, e.clientY - this.downPt.y) > 5) {
this.downPt = null;
}
}
this.updateHover(e);
});

cv.addEventListener('pointerup', e => {
this.pointers.delete(e.pointerId);
cv.classList.remove('grabbing');
if (this.downPt && this.pointers.size === 0) this.click();
this.pan = null; this.downPt = null;
});

cv.addEventListener('pointercancel', e => {
this.pointers.delete(e.pointerId);
this.pan = null; this.downPt = null;
});

cv.addEventListener('pointerleave', () => { this.hover = null; this.tip.style.display = 'none'; });
},

toWorld(e) {
const r = this.cv.getBoundingClientRect();
return {
x: Rebirth.cam.x + (e.clientX - r.left - this.w / 2) / Rebirth.cam.z,
y: Rebirth.cam.y + (e.clientY - r.top - this.h / 2) / Rebirth.cam.z
};
},

nodeAt(wx, wy) {
let best = null, bd = (26 / Rebirth.cam.z + 8) ** 2;
for (const n of Rebirth.visible()) {
const d = (n.x - wx) ** 2 + (n.y - wy) ** 2;
if (d < bd) { bd = d; best = n; }
}
return best;
},

updateHover(e) {
const p = this.toWorld(e);
if (!p) return;
this.hover = this.nodeAt(p.x, p.y);
if (this.hover) {
const n = this.hover, owned = Rebirth.owned.has(n.id);
const canBuy = !owned && Rebirth.canBuy(n.id);
const queued = Rebirth.autoQueue.has(n.id);
const costTxt = n.cost ? t('rebirth.cost').replace('{n}', fmt(n.cost.v)) : t('rebirth.core');
let statusTxt;
if (owned) statusTxt = t('rebirth.owned');
else if (canBuy) statusTxt = costTxt;
else if (queued) statusTxt = t('rebirth.queued');
else statusTxt = t('rebirth.foresight');
this.tip.innerHTML =
`<div>${tr(n.name)}</div>` +
`<div class="tt-r" style="color:${ACCENT}">${t('rebirth.depth').replace('{n}', n.depth)}</div>` +
fxDescRebirth(n).map(d => `<div>▸ ${d}</div>`).join('') +
`<div class="tt-c">${statusTxt}</div>`;
const r = this.cv.getBoundingClientRect();
this.tip.style.display = 'block';
this.tip.style.left = Math.min(this.w - 250, e.clientX - r.left + 14) + 'px';
this.tip.style.top = Math.min(this.h - 130, e.clientY - r.top + 10) + 'px';
} else this.tip.style.display = 'none';
},

click() {
if (!this.hover) return;
const n = this.hover;
if (Rebirth.owned.has(n.id)) return;
if (Rebirth.canBuy(n.id)) {
const res = Rebirth.buy(n.id);
if (res.ok) Audio.buy();
else { Audio.deny(); n._shake = 0.3; }
} else {
// Nodo visible por visión pero aún no comprable: marcar/desmarcar para autocompra
Rebirth.toggleAuto(n.id);
Audio.buy();
}
},

resize(w, h) { this.w = w; this.h = h; },
uiScale() { return this.w >= 460 ? 1 : this.w >= 320 ? 0.8 : 0.62; },

draw(dt) {
this.time += dt;
if (!this.visible) return;
Rebirth.processAutoQueue();   // autocompra nodos en cola si ya se pueden
const ctx = this.ctx;
const cam = Rebirth.cam;
const cx = cam.x, cy = cam.y, z = cam.z;
const X = n => (n.x - cx) * z + this.w / 2;
const Y = n => (n.y - cy) * z + this.h / 2;
ctx.fillStyle = '#f9f5ff';
ctx.fillRect(0, 0, this.w, this.h);
const gs = 46 * z;
if (gs > 14) {
const ox = ((-cx * z + this.w / 2) % gs + gs) % gs;
const oy = ((-cy * z + this.h / 2) % gs + gs) % gs;
ctx.strokeStyle = '#ebe0f7'; ctx.lineWidth = 1;
ctx.beginPath();
for (let x = ox; x < this.w; x += gs) { ctx.moveTo(x, 0); ctx.lineTo(x, this.h); }
for (let y = oy; y < this.h; y += gs) { ctx.moveTo(0, y); ctx.lineTo(this.w, y); }
ctx.stroke();
}
const root = Rebirth.node('0');
if (root) {
const rx = X(root), ry = Y(root);
const hr = Math.max(50, 70 * z);
const g = ctx.createRadialGradient(rx, ry, 0, rx, ry, hr);
g.addColorStop(0.0, 'rgba(103,58,183,0.18)');
g.addColorStop(0.25, 'rgba(103,58,183,0.13)');
g.addColorStop(0.55, 'rgba(103,58,183,0.06)');
g.addColorStop(0.80, 'rgba(103,58,183,0.02)');
g.addColorStop(1.0, 'rgba(103,58,183,0)');
ctx.fillStyle = g;
ctx.fillRect(rx - hr, ry - hr, hr * 2, hr * 2);
}
const onScreen = n => { const sx = X(n), sy = Y(n); return sx > -70 && sx < this.w + 70 && sy > -70 && sy < this.h + 70; };
// conexiones
for (const n of Rebirth.visible()) {
if (n.root) continue;
const p = Rebirth.node(n.id.slice(0, n.id.lastIndexOf('.')));
if (!p || !onScreen(n) || !onScreen(p)) continue;
const owned = Rebirth.owned.has(n.id);
const canBuy = !owned && Rebirth.canBuy(n.id);
ctx.strokeStyle = owned ? '#000' : (canBuy ? '#ccc' : '#e2d9f0');
ctx.lineWidth = owned ? 2.5 * Math.min(1.2, z) : 1.5 * Math.min(1.2, z);
ctx.beginPath(); ctx.moveTo(X(p), Y(p)); ctx.lineTo(X(n), Y(n)); ctx.stroke();
}
// nodos
for (const n of Rebirth.visible()) {
if (!onScreen(n)) continue;
n._shake = Math.max(0, (n._shake || 0) - dt);
const sx = X(n) + (n._shake > 0 ? Math.sin(this.time * 60) * 4 : 0);
const sy = Y(n);
const owned = Rebirth.owned.has(n.id);
const canBuy = !owned && Rebirth.canBuy(n.id);
const queued = Rebirth.autoQueue.has(n.id);
const foresightNode = !owned && !canBuy;   // visible por visión, aún no comprable
const r = (n.root ? 28 : 14) * z;
// anillo pulsante solo para nodos comprables
if (canBuy) {
ctx.globalAlpha = 0.4 + 0.3 * Math.sin(this.time * 4 + n.depth);
ctx.strokeStyle = ACCENT; ctx.lineWidth = 2;
ctx.beginPath(); ctx.arc(sx, sy, r + 5 + Math.sin(this.time * 4) * 2, 0, 6.28); ctx.stroke();
ctx.globalAlpha = 1;
}
// relleno y borde según estado
if (owned) { ctx.fillStyle = '#000'; ctx.strokeStyle = '#000'; }
else if (canBuy) { ctx.fillStyle = '#fff'; ctx.strokeStyle = ACCENT; }
else if (queued) { ctx.fillStyle = '#ede7f6'; ctx.strokeStyle = ACCENT_LIGHT; }
else { ctx.fillStyle = '#f5f5f5'; ctx.strokeStyle = '#d5cbe8'; }   // visión, no comprable
ctx.lineWidth = 2 * Math.min(1.4, z);
if (foresightNode && !queued) ctx.setLineDash([4, 4]);   // borde discontinuo = futuro
ctx.beginPath(); ctx.arc(sx, sy, r, 0, 6.28); ctx.fill(); ctx.stroke();
ctx.setLineDash([]);
if (n.root) {
ctx.save();
ctx.beginPath(); ctx.arc(sx, sy, r - 2, 0, 6.28); ctx.clip();
const pistol = Heroes.get('pistol');
if (pistol) pistol.def.draw(ctx, sx, sy, r * 0.8);
ctx.restore();
} else {
const glyphColor = owned ? '#fff' : (canBuy ? '#000' : (queued ? ACCENT : '#c0b8d8'));
rebirthGlyph(ctx, sx, sy, r * 0.5, glyphColor);
}
// estrella de autocompra para nodos en cola
if (queued) {
ctx.fillStyle = ACCENT;
ctx.font = `bold ${Math.max(10, 13 * z)}px Courier New`;
ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
ctx.fillText('★', sx + r * 0.8, sy - r * 0.8);
ctx.textBaseline = 'alphabetic';
}
// coste
if (!owned && n.cost && z > 0.5) {
ctx.fillStyle = canBuy ? '#000' : (queued ? ACCENT_LIGHT : '#bbb');
ctx.font = `bold ${Math.max(9, 10 * z)}px Courier New`;
ctx.textAlign = 'center';
ctx.fillText(`${fmt(n.cost.v)} PR`, sx, sy + r + 13 * z);
}
if (this.hover === n) {
ctx.strokeStyle = ACCENT; ctx.lineWidth = 1.5;
ctx.beginPath(); ctx.arc(sx, sy, r + 3, 0, 6.28); ctx.stroke();
}
}
this.drawSummary(ctx);
this.drawMinimap();
},

drawSummary(ctx) {
const bonuses = {};
for (const id of Rebirth.owned) {
const n = Rebirth.node(id);
if (!n || n.root) continue;
for (const [stat, val] of n.fx) bonuses[stat] = (bonuses[stat] || 0) + val;
}
const entries = Object.entries(bonuses).sort((a, b) => a[0].localeCompare(b[0]));
const s = this.uiScale();
const boxW = Math.floor(210 * s);
const lineH = Math.floor(17 * s);
const padX = Math.floor(16 * s);
const titleH = Math.floor(26 * s);
const gap = Math.floor(6 * s);
const contentH = entries.length ? entries.length * lineH + gap : lineH + gap;
const boxH = titleH + contentH;
const boxX = this.w - boxW - Math.floor(12 * s);
const boxY = Math.floor(12 * s);
ctx.fillStyle = '#fff';
ctx.fillRect(boxX, boxY, boxW, boxH);
ctx.strokeStyle = '#000';
ctx.lineWidth = 2;
ctx.strokeRect(boxX, boxY, boxW, boxH);
ctx.fillStyle = ACCENT;
ctx.fillRect(boxX, boxY, Math.floor(6 * s), boxH);
ctx.textBaseline = 'top';
ctx.textAlign = 'left';
ctx.fillStyle = '#000';
ctx.font = `bold ${Math.max(9, Math.round(12 * s))}px Courier New`;
ctx.fillText(tr('MEJORAS ACTIVAS'), boxX + padX, boxY + Math.floor(7 * s));
if (!entries.length) {
ctx.fillStyle = '#aaa';
ctx.font = `${Math.max(8, Math.round(11 * s))}px Courier New`;
ctx.fillText(tr('Sin mejoras compradas'), boxX + padX, boxY + titleH + Math.floor(2 * s));
} else {
ctx.font = `${Math.max(8, Math.round(11 * s))}px Courier New`;
entries.forEach(([stat, val], i) => {
const fmtStr = rebirthFxFormat(stat);
ctx.fillStyle = '#000';
ctx.fillText(fmtStr.replace('{v}', val), boxX + padX, boxY + titleH + Math.floor(2 * s) + i * lineH);
});
}
ctx.textBaseline = 'alphabetic';
},

drawMinimap() {
const mctx = this.miniCtx, S = 150;
mctx.fillStyle = '#f9f5ff';
mctx.fillRect(0, 0, S, S);
const nodes = Rebirth.visible();
if (!nodes.length) return;
let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
for (const n of nodes) {
if (n.x < minX) minX = n.x; if (n.x > maxX) maxX = n.x;
if (n.y < minY) minY = n.y; if (n.y > maxY) maxY = n.y;
}
minX -= 80; minY -= 80; maxX += 80; maxY += 80;
const sc = Math.min(S / (maxX - minX), S / (maxY - minY));
const ox = (S - (maxX - minX) * sc) / 2, oy = (S - (maxY - minY) * sc) / 2;
const MX = x => ox + (x - minX) * sc, MY = y => oy + (y - minY) * sc;
this.miniMap = { minX, minY, sc, ox, oy };
mctx.strokeStyle = '#ddd'; mctx.lineWidth = 1;
mctx.beginPath();
for (const n of nodes) {
if (n.root) continue;
const p = Rebirth.node(n.id.slice(0, n.id.lastIndexOf('.')));
if (!p) continue;
mctx.moveTo(MX(p.x), MY(p.y)); mctx.lineTo(MX(n.x), MY(n.y));
}
mctx.stroke();
for (const n of nodes) {
const owned = Rebirth.owned.has(n.id);
const queued = Rebirth.autoQueue.has(n.id);
mctx.fillStyle = owned ? '#000' : (queued ? ACCENT_LIGHT : (Rebirth.canBuy(n.id) ? ACCENT : '#cfc4e6'));
const sz = n.root ? 5 : owned ? 3 : 2.5;
mctx.fillRect(MX(n.x) - sz / 2, MY(n.y) - sz / 2, sz, sz);
}
const cam = Rebirth.cam;
const vw = this.w / cam.z, vh = this.h / cam.z;
mctx.strokeStyle = ACCENT; mctx.lineWidth = 1.5;
mctx.strokeRect(MX(cam.x - vw / 2), MY(cam.y - vh / 2), vw * sc, vh * sc);
}
};

function rebirthFxFormat(stat) {
const MAP = {
dmg: '+{v}% daño', xp: '+{v}% experiencia', cur: '+{v}% botín',
hp: '+{v}% vida', atk: '+{v}% cadencia', treeCost: '-{v}% coste de nodos',
luck: '+{v} suerte', foresight: '+{v} profundidad de visión',
vsCircle: '+{v}% daño a círculos', vsTriangle: '+{v}% daño a triángulos',
vsSquare: '+{v}% daño a cuadrados', vsHexagon: '+{v}% daño a hexágonos',
vsPentagon: '+{v}% daño a pentágonos', vsPurple: '+{v}% daño a morados',
curCIR: '+{v}% CIR', curTRI: '+{v}% TRI', curCUA: '+{v}% CUA',
curHEX: '+{v}% HEX', curPEN: '+{v}% PEN', curPUR: '+{v}% PUR',
bossDmg: '+{v}% daño a jefes', eliteDmg: '+{v}% daño a élites'
};
return tr(MAP[stat] || '+{v} ' + stat);
}

function rebirthGlyph(ctx, x, y, r, color) {
ctx.save();
ctx.translate(x, y);
ctx.fillStyle = color;
ctx.beginPath();
ctx.moveTo(0, -r);
ctx.lineTo(r * 0.7, 0);
ctx.lineTo(0, r);
ctx.lineTo(-r * 0.7, 0);
ctx.closePath();
ctx.fill();
ctx.restore();
}