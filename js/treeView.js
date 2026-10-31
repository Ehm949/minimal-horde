import { Trees } from './heroTree.js';
import { Heroes } from './heroes.js';
import { fxDesc } from './treeGenerator.js';
import { RARITY_NAME, RARITY_RING } from './config.js';
import { Resources } from './resources.js';
import { clamp, fmt } from './utils.js';
import { Audio } from './audio.js';
import { Bus } from './events.js';
import { LegacyView } from './legacyView.js';
import { t, tr, cur } from './localization.js';
import { openCosmeticsModal } from './cosmeticsModal.js';

export const TreeView = {
cv: null, ctx: null, w: 0, h: 0,
tip: null, hover: null, pan: null, downPt: null, time: 0,
mini: null, miniCtx: null, miniMap: null, miniDrag: false,
mode: 'hero', toggle: null,
wanted: null, holdTarget: null, holdT: 0, holdMode: null,
autoBuyMode: false,
autoBuyT: 0,

init(cv) {
this.cv = cv; this.ctx = cv.getContext('2d');
this.wanted = new Set();
this.pointers = new Map();
this.pinchDist = 0;
this.pinchZ = 1;
this.tip = document.createElement('div');
this.tip.id = 'tree-tip'; this.tip.style.display = 'none';
cv.parentElement.appendChild(this.tip);

// ---- BOTÓN DE AUTOCOMPRA ----
this.autoBtn = document.createElement('button');
this.autoBtn.id = 'autobuy-toggle';
this.autoBtn.textContent = t('tree.autobuy.off');
cv.parentElement.appendChild(this.autoBtn);
this.autoBtn.addEventListener('pointerdown', e => {
e.preventDefault();
this.autoBuyMode = !this.autoBuyMode;
this.autoBtn.textContent = this.autoBuyMode ? t('tree.autobuy.on') : t('tree.autobuy.off');
this.autoBtn.classList.toggle('active', this.autoBuyMode);
});

// ---- BOTÓN DE ASPECTO (COSMÉTICOS) ----
this.cosBtn = document.createElement('button');
this.cosBtn.id = 'cosmetics-toggle';
this.cosBtn.textContent = t('cos.btn');
cv.parentElement.appendChild(this.cosBtn);
this.cosBtn.addEventListener('pointerdown', e => {
e.preventDefault();
openCosmeticsModal();
});

this.mini = document.createElement('canvas');
this.mini.id = 'tree-mini';
this.mini.width = 150; this.mini.height = 150;
cv.parentElement.appendChild(this.mini);
this.miniCtx = this.mini.getContext('2d');

Bus.on('heroSwapped', () => { this.wanted.clear(); this.holdTarget = null; this.holdMode = null; });

const miniMove = e => {
const tree = this.tree();
if (!tree || !this.miniMap) return;
const r = this.mini.getBoundingClientRect();
const p = this.miniMap;
tree.cam.x = p.minX + (e.clientX - r.left - p.ox) / p.sc;
tree.cam.y = p.minY + (e.clientY - r.top - p.oy) / p.sc;
};
this.mini.addEventListener('pointerdown', e => { this.miniDrag = true; miniMove(e); this.mini.setPointerCapture(e.pointerId); });
this.mini.addEventListener('pointermove', e => { if (this.miniDrag) miniMove(e); });
this.mini.addEventListener('pointerup', () => this.miniDrag = false);

cv.addEventListener('wheel', e => {
if (this.mode === 'legacy') return LegacyView.onWheel(e);
e.preventDefault();
const tree = this.tree();
if (!tree) return;
const r = cv.getBoundingClientRect();
const sx = e.clientX - r.left, sy = e.clientY - r.top;
const wx = tree.cam.x + (sx - this.w / 2) / tree.cam.z;
const wy = tree.cam.y + (sy - this.h / 2) / tree.cam.z;
tree.cam.z = clamp(tree.cam.z * Math.exp(-e.deltaY * 0.0012), 0.12, 2.4);
tree.cam.x = wx - (sx - this.w / 2) / tree.cam.z;
tree.cam.y = wy - (sy - this.h / 2) / tree.cam.z;
}, { passive: false });

// ---- POINTER DOWN con soporte multi-touch ----
cv.addEventListener('pointerdown', e => {
if (this.mode === 'legacy') return LegacyView.onDown(e);
const tree = this.tree();
if (!tree) return;
cv.setPointerCapture(e.pointerId);
this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

// Si hay 2 dedos, iniciar pinch
if (this.pointers.size === 2) {
const pts = [...this.pointers.values()];
this.pinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
this.pinchZ = tree.cam.z;
this.pan = null;
this.downPt = null;
this.holdTarget = null;
return;
}

// Un solo dedo: pan + click + hold
this.pan = { x: e.clientX, y: e.clientY, cx: tree.cam.x, cy: tree.cam.y };
this.downPt = { x: e.clientX, y: e.clientY };
cv.classList.add('grabbing');
this.updateHover(e);
const hn = this.hover;
if (hn && !tree.owned.has(hn.id)) {
if (this.wanted.has(hn.id)) {
this.holdTarget = hn; this.holdT = 0; this.holdMode = 'remove';
} else {
this.holdTarget = hn; this.holdT = 0; this.holdMode = 'add';
}
}
});

// ---- POINTER MOVE con soporte pinch ----
cv.addEventListener('pointermove', e => {
if (this.mode === 'legacy') return LegacyView.onMove(e);
const tree = this.tree();
if (!tree) return;

if (this.pointers.has(e.pointerId)) {
this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
}

// PINCH con 2 dedos
if (this.pointers.size === 2) {
const pts = [...this.pointers.values()];
const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
if (this.pinchDist > 0) {
const r = cv.getBoundingClientRect();
const midX = (pts[0].x + pts[1].x) / 2 - r.left;
const midY = (pts[0].y + pts[1].y) / 2 - r.top;
const wx = tree.cam.x + (midX - this.w / 2) / tree.cam.z;
const wy = tree.cam.y + (midY - this.h / 2) / tree.cam.z;
tree.cam.z = clamp(this.pinchZ * (dist / this.pinchDist), 0.12, 2.4);
tree.cam.x = wx - (midX - this.w / 2) / tree.cam.z;
tree.cam.y = wy - (midY - this.h / 2) / tree.cam.z;
}
return;
}

// Un solo dedo: pan normal
if (this.pan) {
tree.cam.x = this.pan.cx - (e.clientX - this.pan.x) / tree.cam.z;
tree.cam.y = this.pan.cy - (e.clientY - this.pan.y) / tree.cam.z;
if (this.downPt && Math.hypot(e.clientX - this.downPt.x, e.clientY - this.downPt.y) > 5) {
this.downPt = null;
this.holdTarget = null;
}
}
this.updateHover(e);
});

// ---- POINTER UP con soporte multi-touch ----
cv.addEventListener('pointerup', e => {
if (this.mode === 'legacy') return LegacyView.onUp(e);
this.pointers.delete(e.pointerId);
cv.classList.remove('grabbing');
if (this.downPt && this.pointers.size === 0) this.click();
this.pan = null; this.downPt = null; this.holdTarget = null; this.holdMode = null;
});

cv.addEventListener('pointercancel', e => {
this.pointers.delete(e.pointerId);
this.pan = null; this.downPt = null; this.holdTarget = null;
});

cv.addEventListener('pointerleave', () => {
if (this.mode === 'legacy') return LegacyView.onLeave();
this.hover = null; this.tip.style.display = 'none';
});

LegacyView.init(cv);
this.toggle = document.createElement('button');
this.toggle.id = 'legacy-toggle';
this.toggle.textContent = t('legacy.show');
cv.parentElement.appendChild(this.toggle);
this.toggle.addEventListener('pointerdown', e => { e.preventDefault(); this.setMode(this.mode === 'hero' ? 'legacy' : 'hero'); });
},

setMode(m) {
this.mode = m;
this.toggle.textContent = m === 'hero' ? t('legacy.show') : t('legacy.back');
LegacyView.setVisible(m === 'legacy');
this.mini.style.display = m === 'hero' ? '' : 'none';
this.tip.style.display = 'none';
if (this.autoBtn) this.autoBtn.style.display = m === 'hero' ? '' : 'none';
},

tree() { return Trees.get(Heroes.active); },

toWorld(e) {
const tree = this.tree(), r = this.cv.getBoundingClientRect();
if (!tree) return null;
return { x: tree.cam.x + (e.clientX - r.left - this.w / 2) / tree.cam.z,
y: tree.cam.y + (e.clientY - r.top - this.h / 2) / tree.cam.z };
},

nodeAt(wx, wy) {
const tree = this.tree();
if (!tree) return null;
let best = null, bd = (26 / tree.cam.z + 8) ** 2;
for (const n of tree.visible()) {
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
const n = this.hover, tree = this.tree(), owned = tree.owned.has(n.id);
const isForesight = n._foresight || false;
const c = tree.effCost(n);
const costTxt = isForesight
? t('tree.foresight')
: (c ? t('tree.cost').replace('{n}', fmt(c.v)).replace('{k}', cur(c.k)) : t('tree.core'));
this.tip.innerHTML =
`<div>${tr(n.name)}</div>` +
`<div class="tt-r" style="color:${RARITY_RING[n.rarity]}">${t('rarity.' + n.rarity)} · ${t('tree.prof')} ${n.depth}</div>` +
fxDesc(n.fx).map(d => `<div>▸ ${d}</div>`).join('') +
`<div class="tt-c">${owned ? t('tree.owned') : costTxt}</div>`;
const r = this.cv.getBoundingClientRect();
this.tip.style.display = 'block';
this.tip.style.left = Math.min(this.w - 250, e.clientX - r.left + 14) + 'px';
this.tip.style.top = Math.min(this.h - 130, e.clientY - r.top + 10) + 'px';
} else this.tip.style.display = 'none';
},

click() {
if (!this.hover) return;
const tree = this.tree(), n = this.hover;
if (!tree || tree.owned.has(n.id)) return;
const res = tree.buy(n.id);
if (res.ok) Audio.buy();
else { Audio.deny(); n._shake = 0.3; }
},

resize(w, h) { this.w = w; this.h = h; LegacyView.resize(w, h); },

draw(dt) {
this.time += dt;
if (this.mode === 'legacy') { LegacyView.draw(dt); return; }
const ctx = this.ctx, tree = this.tree();
if (!tree) return;
const { x: cx, y: cy, z } = tree.cam;
ctx.fillStyle = '#fff';
ctx.fillRect(0, 0, this.w, this.h);
const gs = 46 * z;
if (gs > 14) {
const ox = ((-cx * z + this.w / 2) % gs + gs) % gs;
const oy = ((-cy * z + this.h / 2) % gs + gs) % gs;
ctx.strokeStyle = '#e7e7e7'; ctx.lineWidth = 1;
ctx.beginPath();
for (let x = ox; x < this.w; x += gs) { ctx.moveTo(x, 0); ctx.lineTo(x, this.h); }
for (let y = oy; y < this.h; y += gs) { ctx.moveTo(0, y); ctx.lineTo(this.w, y); }
ctx.stroke();
}
const X = n => (n.x - cx) * z + this.w / 2;
const Y = n => (n.y - cy) * z + this.h / 2;
const onScreen = n => { const sx = X(n), sy = Y(n); return sx > -70 && sx < this.w + 70 && sy > -70 && sy < this.h + 70; };

// ---- HALO ROJO muy tenue SOLO en el nodo inicial ----
const halo = (sx, sy, rad, aCenter) => {
const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, rad);
g.addColorStop(0.0, `rgba(229,57,53,${aCenter})`);
g.addColorStop(0.25, `rgba(229,57,53,${aCenter * 0.75})`);
g.addColorStop(0.55, `rgba(229,57,53,${aCenter * 0.35})`);
g.addColorStop(0.80, `rgba(229,57,53,${aCenter * 0.12})`);
g.addColorStop(1.0, 'rgba(229,57,53,0)');
ctx.fillStyle = g;
ctx.fillRect(sx - rad, sy - rad, rad * 2, rad * 2);
};
const root = tree.node('0');
if (root && onScreen(root)) halo(X(root), Y(root), Math.max(50, 70 * z), 0.09);

// ---- mantener pulsado → marca/desmarca ----
if (this.holdTarget && this.pan && this.downPt) {
this.holdT += dt;
if (this.holdT > 0.3) {
if (this.holdMode === 'remove') this.wanted.delete(this.holdTarget.id);
else this.wanted.add(this.holdTarget.id);
this.holdTarget = null;
}
}

// ---- AUTOCOMPRA MANUAL (botón): compra todo EXCEPTO los marcados en wanted ----
if (this.autoBuyMode && this.mode === 'hero') {
this.autoBuyT += dt;
if (this.autoBuyT >= 0.4) {
this.autoBuyT = 0;
const fr = tree.frontier().filter(n => tree.canBuy(n) && !this.wanted.has(n.id));
fr.sort((a, b) => tree.effCost(a).v - tree.effCost(b).v);
for (const n of fr) {
const c = tree.effCost(n);
if (c && Resources.has(c.k, c.v)) {
tree.buy(n.id);
Audio.buy();
break;
}
}
}
}

// ---- Cola de wanted: solo en modo normal (en autocompra wanted es lista negra) ----
for (const id of [...this.wanted]) {
if (this.autoBuyMode) break;
const n = tree.ensurePath(id);
if (!n || tree.owned.has(id)) { this.wanted.delete(id); continue; }
if (!tree.canBuy(n)) continue;
const c = tree.effCost(n);
if (c && Resources.has(c.k, c.v) && tree.buy(id).ok) { this.wanted.delete(id); Audio.buy(); }
}

// conexiones
for (const n of tree.visible()) {
if (n.root) continue;
const p = tree.node(n.id.slice(0, n.id.lastIndexOf('.')));
if (!p || !onScreen(n) || !onScreen(p)) continue;
const owned = tree.owned.has(n.id);
ctx.strokeStyle = owned ? '#000' : '#ccc';
ctx.lineWidth = owned ? 2.5 * Math.min(1.2, z) : 1.5 * Math.min(1.2, z);
ctx.beginPath(); ctx.moveTo(X(p), Y(p)); ctx.lineTo(X(n), Y(n)); ctx.stroke();
}

// nodos
for (const n of tree.visible()) {
if (!onScreen(n)) continue;
n._shake = Math.max(0, (n._shake || 0) - dt);
const sx = X(n) + (n._shake > 0 ? Math.sin(this.time * 60) * 4 : 0);
const sy = Y(n);
const owned = tree.owned.has(n.id);
const wanted = this.wanted.has(n.id);
const isForesight = n._foresight || false;
const r = (n.root ? 28 : 12 + n.rarity * 2) * z;
const ring = n.root ? '#000' : RARITY_RING[n.rarity];
const c = tree.effCost(n);
const afford = !owned && !isForesight && c && Resources.has(c.k, c.v);
// Anillo pulsante solo para nodos comprables
if (!owned && !wanted && !isForesight && tree.canBuy(n) && afford) {
ctx.globalAlpha = 0.4 + 0.3 * Math.sin(this.time * 4 + n.depth);
ctx.strokeStyle = '#E53935'; ctx.lineWidth = 2;
ctx.beginPath(); ctx.arc(sx, sy, r + 5 + Math.sin(this.time * 4) * 2, 0, 6.28); ctx.stroke();
ctx.globalAlpha = 1;
}
// Relleno y borde según estado
if (owned) { ctx.fillStyle = '#000'; ctx.strokeStyle = '#000'; }
else if (wanted) { ctx.fillStyle = '#FFEBEE'; ctx.strokeStyle = '#E57373'; }
else if (isForesight) { ctx.fillStyle = '#f5f5f5'; ctx.strokeStyle = '#d0d0d0'; }
else if (afford) { ctx.fillStyle = '#fff'; ctx.strokeStyle = ring; }
else { ctx.fillStyle = '#ececec'; ctx.strokeStyle = '#c5c5c5'; }
// Borde discontinuo para nodos de visión
if (isForesight && !wanted) ctx.setLineDash([4, 4]);
ctx.lineWidth = (n.rarity >= 4 ? 3.5 : 2) * Math.min(1.4, z);
ctx.beginPath(); ctx.arc(sx, sy, r, 0, 6.28); ctx.fill(); ctx.stroke();
ctx.setLineDash([]);
// Anillo de marcado
if (wanted) {
ctx.strokeStyle = '#E57373'; ctx.lineWidth = 1;
ctx.beginPath(); ctx.arc(sx, sy, r + 3, 0, 6.28); ctx.stroke();
}
if (n.rarity >= 4 && !owned) {
ctx.beginPath(); ctx.arc(sx, sy, r + 3 * z, 0, 6.28); ctx.stroke();
}
if (n.root) {
ctx.save();
ctx.beginPath(); ctx.arc(sx, sy, r - 2, 0, 6.28); ctx.clip();
Heroes.activeHero().def.draw(ctx, sx, sy, r * 0.8);
ctx.restore();
} else {
const glyphColor = owned ? '#fff' : (afford || wanted ? '#000' : (isForesight ? '#c0b8d8' : '#aaa'));
const bodyColor = owned ? '#000' : (wanted ? '#FFEBEE' : (afford ? '#fff' : '#ececec'));
currencyGlyph(ctx, sx, sy, r * 0.5, c ? c.k : 'CIR', glyphColor, bodyColor);
}
if (!owned && c && z > 0.5) {
ctx.fillStyle = afford ? '#000' : (isForesight ? '#bbb' : '#aaa');
ctx.font = `bold ${Math.max(9, 10 * z)}px Courier New`;
ctx.textAlign = 'center';
ctx.fillText(`${fmt(c.v)} ${cur(c.k)}`, sx, sy + r + 13 * z);
}
if (this.hover === n) {
ctx.strokeStyle = '#E53935'; ctx.lineWidth = 1.5;
ctx.beginPath(); ctx.arc(sx, sy, r + 3, 0, 6.28); ctx.stroke();
}
}
this.drawMinimap(tree);
},

drawMinimap(tree) {
const mctx = this.miniCtx, S = 150;
mctx.fillStyle = '#fff';
mctx.fillRect(0, 0, S, S);
const nodes = tree.visible();
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
const p = tree.node(n.id.slice(0, n.id.lastIndexOf('.')));
if (!p) continue;
mctx.moveTo(MX(p.x), MY(p.y)); mctx.lineTo(MX(n.x), MY(n.y));
}
mctx.stroke();
for (const n of nodes) {
const owned = tree.owned.has(n.id);
const c = tree.effCost(n);
const wanted = this.wanted.has(n.id);
const isForesight = n._foresight || false;
mctx.fillStyle = owned ? '#000' : (wanted ? '#FF8A80' : (isForesight ? '#e0e0e0' : (c && Resources.has(c.k, c.v) ? '#E53935' : '#bbb')));
const s = n.root ? 5 : owned ? 3 : 2.5;
mctx.fillRect(MX(n.x) - s / 2, MY(n.y) - s / 2, s, s);
}
const { x: cx, y: cy, z } = tree.cam;
const vw = this.w / z, vh = this.h / z;
mctx.strokeStyle = '#E53935'; mctx.lineWidth = 1.5;
mctx.strokeRect(MX(cx - vw / 2), MY(cy - vh / 2), vw * sc, vh * sc);
}
};

function currencyGlyph(ctx, x, y, r, curKey, color, holeColor) {
ctx.save();
ctx.translate(x, y);
ctx.fillStyle = color;
ctx.beginPath();
if (curKey === 'CIR' || curKey === 'PUR') {
ctx.arc(0, 0, r * 0.85, 0, 6.28);
} else if (curKey === 'CUA') {
const s = r * 0.72;
ctx.rect(-s, -s, s * 2, s * 2);
} else {
const sides = curKey === 'TRI' ? 3 : curKey === 'HEX' ? 6 : 5;
const start = curKey === 'HEX' ? 0 : -Math.PI / 2;
for (let i = 0; i < sides; i++) {
const a = start + (i / sides) * 6.28;
const px = Math.cos(a) * r, py = Math.sin(a) * r;
i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
}
}
ctx.closePath();
ctx.fill();
if (curKey === 'PUR') {
ctx.fillStyle = holeColor;
ctx.beginPath();
ctx.arc(0, 0, r * 0.32, 0, 6.28);
ctx.fill();
}
ctx.restore();
}