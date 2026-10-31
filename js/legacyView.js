import { Legacy, fxDescLegacy } from './legacyTree.js';
import { Heroes } from './heroes.js';
import { clamp } from './utils.js';
import { t, tr } from './localization.js';

const ACCENT = '#092073';
const ACCENT_LIGHT = '#2743c9';

export const LegacyView = {
cv: null, ctx: null, w: 0, h: 0,
tip: null, mini: null, miniCtx: null, miniMap: null,
hover: null, pan: null, downPt: null, time: 0, miniDrag: false,
visible: false,
pointers: new Map(),
pinchDist: 0,
pinchZ: 1,

init(cv) {
this.cv = cv; this.ctx = cv.getContext('2d');
this.pointers = new Map();
this.pinchDist = 0;
this.pinchZ = 1;

this.tip = document.createElement('div');
this.tip.id = 'legacy-tip'; this.tip.style.display = 'none';
cv.parentElement.appendChild(this.tip);

this.mini = document.createElement('canvas');
this.mini.id = 'legacy-mini'; this.mini.width = 150; this.mini.height = 150;
this.mini.style.display = 'none';
cv.parentElement.appendChild(this.mini);
this.miniCtx = this.mini.getContext('2d');

const miniMove = e => {
if (!this.miniMap) return;
const r = this.mini.getBoundingClientRect();
const k = this.mini.width / r.width;
const p = this.miniMap;
this.tree().cam.x = p.minX + ((e.clientX - r.left) * k - p.ox) / p.sc;
this.tree().cam.y = p.minY + ((e.clientY - r.top) * k - p.oy) / p.sc;
};
this.mini.addEventListener('pointerdown', e => { this.miniDrag = true; miniMove(e); this.mini.setPointerCapture(e.pointerId); });
this.mini.addEventListener('pointermove', e => { if (this.miniDrag) miniMove(e); });
this.mini.addEventListener('pointerup', () => this.miniDrag = false);
},

tree() { return Legacy.get(Heroes.active); },
setVisible(v) { this.visible = v; this.tip.style.display = 'none'; this.mini.style.display = v ? '' : 'none'; },
resize(w, h) { this.w = w; this.h = h; },
uiScale() { return this.w >= 460 ? 1 : this.w >= 320 ? 0.8 : 0.62; },

toWorld(e) {
const cam = this.tree().cam, r = this.cv.getBoundingClientRect();
return { x: cam.x + (e.clientX - r.left - this.w / 2) / cam.z, y: cam.y + (e.clientY - r.top - this.h / 2) / cam.z };
},

nodeAt(wx, wy) {
let best = null, bd = (26 / this.tree().cam.z + 8) ** 2;
for (const n of this.tree().visible()) {
const d = (n.x - wx) ** 2 + (n.y - wy) ** 2;
if (d < bd) { bd = d; best = n; }
}
return best;
},

onWheel(e) {
e.preventDefault();
const cam = this.tree().cam, r = this.cv.getBoundingClientRect();
const sx = e.clientX - r.left, sy = e.clientY - r.top;
const wx = cam.x + (sx - this.w / 2) / cam.z, wy = cam.y + (sy - this.h / 2) / cam.z;
cam.z = clamp(cam.z * Math.exp(-e.deltaY * 0.0012), 0.35, 2.4);
cam.x = wx - (sx - this.w / 2) / cam.z; cam.y = wy - (sy - this.h / 2) / cam.z;
},

// ---- POINTER DOWN con soporte multi-touch ----
onDown(e) {
const cam = this.tree().cam;
this.cv.setPointerCapture(e.pointerId);
this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

// Si hay 2 dedos, iniciar pinch
if (this.pointers.size === 2) {
const pts = [...this.pointers.values()];
this.pinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
this.pinchZ = cam.z;
this.pan = null;
this.downPt = null;
return;
}

// Un solo dedo: pan
this.pan = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y };
this.downPt = { x: e.clientX, y: e.clientY };
this.cv.classList.add('grabbing');
},

// ---- POINTER MOVE con soporte pinch ----
onMove(e) {
const cam = this.tree().cam;

// Actualizar posición del puntero
if (this.pointers.has(e.pointerId)) {
this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
}

// PINCH con 2 dedos
if (this.pointers.size === 2) {
const pts = [...this.pointers.values()];
const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
if (this.pinchDist > 0) {
const r = this.cv.getBoundingClientRect();
const midX = (pts[0].x + pts[1].x) / 2 - r.left;
const midY = (pts[0].y + pts[1].y) / 2 - r.top;
const wx = cam.x + (midX - this.w / 2) / cam.z;
const wy = cam.y + (midY - this.h / 2) / cam.z;
cam.z = clamp(this.pinchZ * (dist / this.pinchDist), 0.35, 2.4);
cam.x = wx - (midX - this.w / 2) / cam.z;
cam.y = wy - (midY - this.h / 2) / cam.z;
}
return;
}

// Un solo dedo: pan normal
if (this.pan) {
cam.x = this.pan.cx - (e.clientX - this.pan.x) / cam.z;
cam.y = this.pan.cy - (e.clientY - this.pan.y) / cam.z;
if (this.downPt && Math.hypot(e.clientX - this.downPt.x, e.clientY - this.downPt.y) > 5) {
this.downPt = null;
}
}
this.updateHover(e);
},

// ---- POINTER UP con soporte multi-touch ----
onUp(e) {
this.pointers.delete(e.pointerId);
this.cv.classList.remove('grabbing');
this.pan = null; this.downPt = null;
},

// ---- POINTER CANCEL ----
onCancel(e) {
this.pointers.delete(e.pointerId);
this.pan = null; this.downPt = null;
},

onLeave() { this.hover = null; this.tip.style.display = 'none'; },

updateHover(e) {
const p = this.toWorld(e);
this.hover = this.nodeAt(p.x, p.y);
if (this.hover) {
const n = this.hover, owned = this.tree().owned.has(n.id);
this.tip.innerHTML =
`<div>${tr(n.name)}</div>` +
`<div class="tt-r" style="color:${ACCENT}">${t('legacy.depth').replace('{n}', n.depth)}</div>` +
fxDescLegacy(n).map(d => `<div>▸ ${d}</div>`).join('') +
`<div class="tt-c">${owned ? t('legacy.owned') : t('legacy.auto')}</div>`;
const r = this.cv.getBoundingClientRect();
this.tip.style.display = 'block';
this.tip.style.left = Math.min(this.w - 250, e.clientX - r.left + 14) + 'px';
this.tip.style.top = Math.min(this.h - 130, e.clientY - r.top + 10) + 'px';
} else this.tip.style.display = 'none';
},

draw(dt) {
this.time += dt;
if (!this.visible) return;
const ctx = this.ctx, tree = this.tree();
const { x: cx, y: cy, z } = tree.cam;
const X = n => (n.x - cx) * z + this.w / 2;
const Y = n => (n.y - cy) * z + this.h / 2;

ctx.fillStyle = '#f5f8ff';
ctx.fillRect(0, 0, this.w, this.h);

const gs = 46 * z;
if (gs > 14) {
const ox = ((-cx * z + this.w / 2) % gs + gs) % gs, oy = ((-cy * z + this.h / 2) % gs + gs) % gs;
ctx.strokeStyle = '#e2e9f8'; ctx.lineWidth = 1; ctx.beginPath();
for (let x = ox; x < this.w; x += gs) { ctx.moveTo(x, 0); ctx.lineTo(x, this.h); }
for (let y = oy; y < this.h; y += gs) { ctx.moveTo(0, y); ctx.lineTo(this.w, y); }
ctx.stroke();
}

const root = tree.node('0');
if (root) {
const rx = X(root), ry = Y(root);
const hr = Math.max(70, 110 * z);
const g = ctx.createRadialGradient(rx, ry, 0, rx, ry, hr);
g.addColorStop(0, 'rgba(219,230,255,0.7)');
g.addColorStop(1, 'rgba(219,230,255,0)');
ctx.fillStyle = g;
ctx.fillRect(rx - hr, ry - hr, hr * 2, hr * 2);
}

const onScreen = n => { const sx = X(n), sy = Y(n); return sx > -70 && sx < this.w + 70 && sy > -70 && sy < this.h + 70; };

for (const n of tree.visible()) {
if (n.root) continue;
const p = tree.node(n.id.slice(0, n.id.lastIndexOf('.')));
if (!p || !onScreen(n) || !onScreen(p)) continue;
const owned = tree.owned.has(n.id);
ctx.strokeStyle = owned ? '#000' : '#ccc';
ctx.lineWidth = owned ? 2.5 * Math.min(1.2, z) : 1.5 * Math.min(1.2, z);
ctx.beginPath(); ctx.moveTo(X(p), Y(p)); ctx.lineTo(X(n), Y(n)); ctx.stroke();
}

for (const n of tree.visible()) {
if (!onScreen(n)) continue;
const sx = X(n), sy = Y(n), owned = tree.owned.has(n.id);
const r = (n.root ? 28 : 14) * z;
const avail = !owned && tree.canBuy(n);
if (avail) {
ctx.globalAlpha = 0.4 + 0.3 * Math.sin(this.time * 4 + n.depth);
ctx.strokeStyle = ACCENT; ctx.lineWidth = 2;
ctx.beginPath(); ctx.arc(sx, sy, r + 5 + Math.sin(this.time * 4) * 2, 0, 6.28); ctx.stroke();
ctx.globalAlpha = 1;
}
if (owned) { ctx.fillStyle = '#000'; ctx.strokeStyle = '#000'; }
else if (avail) { ctx.fillStyle = '#fff'; ctx.strokeStyle = ACCENT; }
else { ctx.fillStyle = '#ececec'; ctx.strokeStyle = '#c5c5c5'; }
ctx.lineWidth = 2 * Math.min(1.4, z);
ctx.beginPath(); ctx.arc(sx, sy, r, 0, 6.28); ctx.fill(); ctx.stroke();
if (n.root) {
ctx.save(); ctx.beginPath(); ctx.arc(sx, sy, r - 2, 0, 6.28); ctx.clip();
Heroes.activeHero().def.draw(ctx, sx, sy, r * 0.8); ctx.restore();
} else {
legacyGlyph(ctx, sx, sy, r * 0.5, owned ? '#fff' : (avail ? ACCENT : '#aaa'));
}
if (this.hover === n) { ctx.strokeStyle = ACCENT; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(sx, sy, r + 3, 0, 6.28); ctx.stroke(); }
}

this.drawBadge(ctx);
this.drawSummary(ctx);
this.drawMinimap();
},

drawBadge(ctx) {
const hero = Heroes.activeHero();
if (!hero) return;
const id = hero.def.id;
let rec = Legacy.getRecord(id);
if (hero.level > rec) { rec = hero.level; Legacy.setRecord(id, rec); }
const s = this.uiScale();
const x = Math.floor(20 * s), y = Math.floor(12 * s);
const w = Math.floor(78 * s), h = Math.floor(78 * s);
const borde = Math.floor(8 * s);
ctx.fillStyle = '#333';
ctx.fillRect(x + Math.floor(3 * s), y + Math.floor(3 * s), w, h);
ctx.fillStyle = '#000';
ctx.fillRect(x, y, w, h);
ctx.fillStyle = ACCENT;
ctx.fillRect(x, y, borde, h);
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillStyle = ACCENT_LIGHT;
ctx.font = `bold ${Math.max(8, Math.round(10 * s))}px Courier New`;
ctx.fillText('LV.MAX', x + borde + (w - borde) / 2, y + Math.floor(20 * s));
ctx.fillStyle = '#fff';
ctx.font = `bold ${Math.max(16, Math.round(34 * s))}px Courier New`;
ctx.fillText(String(rec), x + borde + (w - borde) / 2, y + h / 2 + Math.floor(10 * s));
ctx.textAlign = 'left';
ctx.textBaseline = 'alphabetic';
},

drawSummary(ctx) {
const b = this.tree().bonuses();
const entries = Object.entries(b).sort((a, c) => a[0].localeCompare(c[0]));
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
ctx.fillStyle = '#fff'; ctx.fillRect(boxX, boxY, boxW, boxH);
ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.strokeRect(boxX, boxY, boxW, boxH);
ctx.fillStyle = ACCENT; ctx.fillRect(boxX, boxY, Math.floor(6 * s), boxH);
ctx.textBaseline = 'top'; ctx.textAlign = 'left';
ctx.fillStyle = '#000';
ctx.font = `bold ${Math.max(9, Math.round(12 * s))}px Courier New`;
ctx.fillText(tr('LEGADO ACTIVO'), boxX + padX, boxY + Math.floor(7 * s));
if (!entries.length) {
ctx.fillStyle = '#aaa';
ctx.font = `${Math.max(8, Math.round(11 * s))}px Courier New`;
ctx.fillText(tr('Sin nodos de legado'), boxX + padX, boxY + titleH + Math.floor(2 * s));
} else {
ctx.font = `${Math.max(8, Math.round(11 * s))}px Courier New`;
entries.forEach(([k, v], i) => {
ctx.fillStyle = '#000';
const fmtStr = LEGACY_FMT[k] ? tr(LEGACY_FMT[k]) : '+{v} ' + k;
ctx.fillText(fmtStr.replace('{v}', v), boxX + padX, boxY + titleH + Math.floor(2 * s) + i * lineH);
});
}
ctx.textBaseline = 'alphabetic';
},

drawMinimap() {
const mctx = this.miniCtx, S = 150, tree = this.tree();
mctx.fillStyle = '#f5f8ff'; mctx.fillRect(0, 0, S, S);
const nodes = tree.visible();
if (!nodes.length) return;
let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
for (const n of nodes) { if (n.x < minX) minX = n.x; if (n.x > maxX) maxX = n.x; if (n.y < minY) minY = n.y; if (n.y > maxY) maxY = n.y; }
minX -= 80; minY -= 80; maxX += 80; maxY += 80;
const sc = Math.min(S / (maxX - minX), S / (maxY - minY));
const ox = (S - (maxX - minX) * sc) / 2, oy = (S - (maxY - minY) * sc) / 2;
const MX = x => ox + (x - minX) * sc, MY = y => oy + (y - minY) * sc;
this.miniMap = { minX, minY, sc, ox, oy };
mctx.strokeStyle = '#ddd'; mctx.lineWidth = 1; mctx.beginPath();
for (const n of nodes) {
if (n.root) continue;
const p = tree.node(n.id.slice(0, n.id.lastIndexOf('.')));
if (!p) continue;
mctx.moveTo(MX(p.x), MY(p.y)); mctx.lineTo(MX(n.x), MY(n.y));
}
mctx.stroke();
for (const n of nodes) {
const owned = tree.owned.has(n.id);
mctx.fillStyle = owned ? '#000' : (tree.canBuy(n) ? ACCENT : '#bbb');
const sz = n.root ? 5 : owned ? 3 : 2.5;
mctx.fillRect(MX(n.x) - sz / 2, MY(n.y) - sz / 2, sz, sz);
}
const cam = tree.cam, vw = this.w / cam.z, vh = this.h / cam.z;
mctx.strokeStyle = ACCENT; mctx.lineWidth = 1.5;
mctx.strokeRect(MX(cam.x - vw / 2), MY(cam.y - vh / 2), vw * sc, vh * sc);
}
};

const LEGACY_FMT = {
dmg: '+{v}% daño', xp: '+{v}% experiencia', cur: '+{v}% botín', atk: '+{v}% cadencia', hp: '+{v}% vida',
crit: '+{v}% prob. crítico', critdmg: '+{v}% daño crítico', bossDmg: '+{v}% daño a jefes', eliteDmg: '+{v}% daño a élites',
luck: '+{v} suerte', armor: '-{v}% daño recibido', speed: '+{v}% velocidad', range: '+{v}% alcance',
dodge: '+{v}% esquiva', life: '+{v}% vampirismo', regen: '+{v}% vida/s', shield: 'Escudo ({v}% vida)',
pierce: '+{v} perforación', proj: '+{v} proyectiles',
};

function legacyGlyph(ctx, x, y, r, color) {
ctx.save(); ctx.translate(x, y); ctx.fillStyle = color;
ctx.beginPath();
for (let i = 0; i < 8; i++) {
const a = (i / 8) * 6.28 - Math.PI / 2;
const rad = i % 2 === 0 ? r : r * 0.45;
ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
}
ctx.closePath(); ctx.fill(); ctx.restore();
}

