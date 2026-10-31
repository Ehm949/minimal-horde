import { makeRebirthRoot, genRebirthChildren } from './rebirthTree.js';
import { Bus } from './events.js';

const MIN_LEVEL = 5;

export const Rebirth = {
count: 0, points: 0, spent: 0,
convertedLevels: 0, seenIntro: false,
seed: 1, heroSeed: 1,
baseline: null,
nodes: new Map(), owned: new Set(),
autoQueue: new Set(),
_expanded: new Set(),
_bonusCache: null,
foresight: 0,   // ← AÑADIR
foresight: 0,
_processingQueue: false,
cam: { x: 0, y: 0, z: 1 },

init(saved, savedForesight) {
if (saved) {
this.count = saved.count || 0;
this.points = saved.points || 0;
this.spent = saved.spent || 0;
this.convertedLevels = saved.convertedLevels || 0;
this.seenIntro = !!saved.seenIntro;
this.seed = saved.seed || 1;
this.heroSeed = saved.heroSeed || 1;
this.baseline = saved.baseline || null;
this.owned = new Set(saved.owned || []);
} else {
this.seed = (Math.floor(Math.random() * 1e9) + 1);
this.heroSeed = (Math.floor(Math.random() * 1e9) + 1);
this.baseline = null;
}
this.rebuild();
// Cargar foresight desde la clave aparte del save
this.foresight = savedForesight || 0;
},

rebuild() {
this.nodes.clear();
this._expanded = new Set();
this._bonusCache = null;
const root = makeRebirthRoot();
this.nodes.set(root.id, root);
this._expandAll();
this._bonusCache = null;   // ← AÑADIR: forza recálculo con todos los nodos ya generados
},

_ensureChildren(node) {
if (this._expanded.has(node.id)) {
const kids = [];
for (const [cid, cn] of this.nodes) {
const pid = cid.slice(0, cid.lastIndexOf('.'));
if (pid === node.id) kids.push(cn);
}
return kids;
}
this._expanded.add(node.id);
const kids = genRebirthChildren(this.seed, node, this.nodes);
for (const k of kids) this.nodes.set(k.id, k);
return kids;
},

_expandAll() {
this._bonusCache = null;
const foresight = this.getBonuses().foresight || 0;
const queue = [{ id: '0', gap: 0 }];
const visited = new Set(['0']);
while (queue.length) {
const { id, gap } = queue.shift();
const node = this.nodes.get(id);
if (!node) continue;
const isOwned = node.root || this.owned.has(id);
const childGap = isOwned ? 1 : gap + 1;
if (isOwned || childGap <= foresight + 1) {
const kids = this._ensureChildren(node);
for (const k of kids) {
if (!visited.has(k.id)) { visited.add(k.id); queue.push({ id: k.id, gap: childGap }); }
}
}
}
},

node(id) { return this.nodes.get(id); },

visible() {
const foresight = this.getBonuses().foresight || 0;
const childrenOf = {};
for (const [id, n] of this.nodes) {
if (n.root) continue;
const pid = id.slice(0, id.lastIndexOf('.'));
if (!childrenOf[pid]) childrenOf[pid] = [];
childrenOf[pid].push(n);
}
const out = [];
const queue = [{ node: this.node('0'), gap: 0 }];
while (queue.length) {
const { node, gap } = queue.shift();
if (!node) continue;
const isOwned = node.root || this.owned.has(node.id);
if (isOwned || gap <= foresight + 1) out.push(node);
const childGap = isOwned ? 1 : gap + 1;
for (const k of (childrenOf[node.id] || [])) queue.push({ node: k, gap: childGap });
}
return out;
},

totalLevelsOf(heroes) { return heroes.filter(h => h.unlocked).reduce((s, h) => s + h.level, 0); },
pointsToGain(heroes) { return Math.max(0, this.totalLevelsOf(heroes) - this.convertedLevels); },
canRebirth(heroes) { return this.totalLevelsOf(heroes) >= MIN_LEVEL; },

doRebirth(heroes, track) {
const tl = this.totalLevelsOf(heroes);
const gain = Math.max(0, tl - this.convertedLevels);
this.points += gain;
this.convertedLevels = Math.max(this.convertedLevels, tl);
this.count++;
this.heroSeed = (Math.floor(Math.random() * 1e9) + 1);
if (track) {
this.baseline = {
kills: track.kills || 0, nodes: track.nodes || 0, bosses: track.bosses || 0,
dist: track.dist || 0, cur: track.cur || 0, byType: { ...(track.byType || {}) }
};
}
return gain;
},

resetTree() {
this.points += this.spent;
this.spent = 0;
this.owned.clear();
this.autoQueue.clear();
this.seed = (Math.floor(Math.random() * 1e9) + 1);
this.cam = { x: 0, y: 0, z: 1 };
this.rebuild();
this.updateForesight();
},

canBuy(id) {
const n = this.nodes.get(id);
if (!n || this.owned.has(id) || !n.cost) return false;
const pid = id.slice(0, id.lastIndexOf('.'));
if (pid && pid !== '0' && !this.owned.has(pid)) return false;
return this.points >= n.cost.v;
},

buy(id) {
if (!this.canBuy(id)) return { ok: false };
const n = this.nodes.get(id);
this.points -= n.cost.v;
this.spent += n.cost.v;
this.owned.add(id);
this.autoQueue.delete(id);
this._bonusCache = null;
this._expandAll();
this.updateForesight();
Bus.emit('rebirthNodeBought', {});
return { ok: true };
},

updateForesight() {
const f = this.getBonuses().foresight || 0;
if (f !== this.foresight) {
this.foresight = f;
Bus.emit('foresightChanged', { value: f });
}
},

toggleAuto(id) {
if (this.owned.has(id)) return;
if (this.autoQueue.has(id)) this.autoQueue.delete(id);
else this.autoQueue.add(id);
},

processAutoQueue() {
if (this._processingQueue) return;
this._processingQueue = true;
let bought = true;
while (bought) {
bought = false;
for (const id of [...this.autoQueue]) {
if (this.canBuy(id)) {
const n = this.nodes.get(id);
this.points -= n.cost.v;
this.spent += n.cost.v;
this.owned.add(id);
this.autoQueue.delete(id);
this._bonusCache = null;
this._ensureChildren(n);
bought = true;
}
}
}
this._expandAll();
this.updateForesight();
this._processingQueue = false;
},

getBonuses() {
if (this._bonusCache) return this._bonusCache;
const b = {};
for (const id of this.owned) {
const n = this.nodes.get(id);
if (!n) continue;
for (const [stat, val] of n.fx) b[stat] = (b[stat] || 0) + val;
}
return this._bonusCache = b;
},

updateForesight() {
const f = this.getBonuses().foresight || 0;
if (f !== this.foresight) {
this.foresight = f;
Bus.emit('foresightChanged', { value: f });
}
},

treeDiscount() { return this.getBonuses().treeCost || 0; },

serialize() {
return {
count: this.count, points: this.points, spent: this.spent,
convertedLevels: this.convertedLevels, seenIntro: this.seenIntro,
seed: this.seed, heroSeed: this.heroSeed, owned: [...this.owned],
autoQueue: [...this.autoQueue],
baseline: this.baseline || null,
foresight: this.foresight
};
}
};