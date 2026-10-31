import { makeRoot, genChildren } from './treeGenerator.js';
import { Resources } from './resources.js';
import { Bus } from './events.js';
import { BAL } from './config.js';
import { LevelUps } from './levelUps.js';
import { Rebirth } from './rebirth.js';

export class HeroTree {
constructor(heroId, seed) {
this.heroId = heroId;
this.seed = seed;
this.nodes = new Map();
this.owned = new Set();
this.cam = { x: 0, y: 0, z: 0.85 };
const root = makeRoot();
this.nodes.set(root.id, root);
this.owned.add(root.id);
this.ensureChildren(root);
this._v = null; this._s = null;
}

node(id) { return this.nodes.get(id); }

ensureChildren(node) {
if (node.kids) return node.kids.map(i => this.nodes.get(i));
node.kids = [];
for (const k of genChildren(this.seed, node, this.nodes, this.heroId)) {
if (!this.nodes.has(k.id)) this.nodes.set(k.id, k);
node.kids.push(k.id);
}
return node.kids.map(i => this.nodes.get(i));
}

ensurePath(id) {
if (this.nodes.has(id)) return this.nodes.get(id);
const pid = id.slice(0, id.lastIndexOf('.'));
if (!pid) return null;
const parent = this.ensurePath(pid);
if (!parent) return null;
this.ensureChildren(parent);
return this.nodes.get(id);
}

invalidate() { this._v = null; this._s = null; }

// ---- VISIBLE CON FORESIGHT ----
visible() {
if (this._v) return this._v;
const foresight = Rebirth.foresight || 0;
const seen = new Set(), out = [];
let frontier = [];

// 1) Nodos comprados + sus hijos directos (frontera comprable)
for (const id of this.owned) {
const n = this.ensurePath(id);
if (!n) continue;
if (!seen.has(n.id)) { seen.add(n.id); n._foresight = false; out.push(n); }
for (const c of this.ensureChildren(n)) {
if (!seen.has(c.id)) {
seen.add(c.id);
c._foresight = false;
out.push(c);
if (!this.owned.has(c.id)) frontier.push(c);
}
}
}

// 2) Expandir niveles de visión más allá de la frontera
let level = frontier;
for (let i = 0; i < foresight && level.length; i++) {
const next = [];
for (const n of level) {
for (const c of this.ensureChildren(n)) {
if (!seen.has(c.id)) {
seen.add(c.id);
c._foresight = true;
out.push(c);
next.push(c);
}
}
}
level = next;
}

return this._v = out;
}

// La frontera solo incluye nodos comprables (no los de visión)
frontier() { return this.visible().filter(n => !this.owned.has(n.id) && !n.root && !n._foresight); }

inflation() { return Math.pow(BAL.treeInflation, Math.max(0, this.owned.size - 1)); }

effCost(n) {
if (!n || !n.cost) return null;
const discount = Rebirth.treeDiscount();
const mul = Math.max(0, 1 - discount / 100);
return { k: n.cost.k, v: Math.max(1, Math.round(n.cost.v * this.inflation() * LevelUps.treeCostMul() * mul)) };
}

canBuy(n) {
if (!n || n.root || this.owned.has(n.id)) return false;
const pid = n.id.slice(0, n.id.lastIndexOf('.'));
return pid === '' || this.owned.has(pid);
}

buy(id) {
const n = this.nodes.get(id);
if (!this.canBuy(n)) return { ok: false };
const c = this.effCost(n);
if (!Resources.spend(c.k, c.v)) return { ok: false, poor: true };
this.owned.add(id);
this.ensureChildren(n);
this.invalidate();
Bus.emit('nodeBought', { hero: this.heroId, node: n });
return { ok: true, node: n };
}

// Compra un nodo SIN gastar monedas (para la mejora start_node de la tienda)
buyFree(id) {
const n = this.nodes.get(id);
if (!this.canBuy(n)) return { ok: false };
this.owned.add(id);
this.ensureChildren(n);
this.invalidate();
Bus.emit('nodeBought', { hero: this.heroId, node: n });
return { ok: true, node: n };
}

stats() {
if (this._s) return this._s;
const t = {};
for (const id of this.owned) {
const n = this.nodes.get(id);
if (!n) continue;
for (const [k, v] of n.fx) {
if (k.endsWith('.mul')) { const b = k.slice(0, -4); t[b] = (t[b] || 1) * v; }
else t[k] = (t[k] || 0) + v;
}
}
return this._s = t;
}
}

export const Trees = {
map: new Map(),
init(ids, saved = {}) {
this.map.clear();
for (const id of ids) {
const s = saved[id] || {};
const seed = s.seed || String((Math.random() * 1e9) | 0) + id;
const t = new HeroTree(id, seed);
if (s.owned) {
for (const nid of s.owned) { t.owned.add(nid); t.ensurePath(nid); }
}
if (s.cam) t.cam = s.cam;
t.invalidate();
this.map.set(id, t);
}
},
get(id) { return this.map.get(id); },
all() { return [...this.map.values()]; },
invalidateAll() { for (const t of this.map.values()) t.invalidate(); },
serialize() {
const o = {};
for (const [id, t] of this.map) {
o[id] = { seed: t.seed, cam: t.cam, owned: [...t.owned].filter(i => i !== '0') };
}
return o;
}
};

// ---- INVALIDAR ÁRBOLES DE HÉROE CUANDO CAMBIA EL FORESIGHT ----
Bus.on('foresightChanged', () => Trees.invalidateAll());