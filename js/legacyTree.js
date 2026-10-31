import { rngFrom, TAU, roman } from './utils.js';
import { tr } from './localization.js';

// ============ 5 RAMAS PRINCIPALES + SUB-RAMAS (bifurcaciones) ============
// Más potentes que el renacimiento (8% en vez de ~5%).
// Toda rama que NO sea de XP añade +1% XP para no quedarse atrás.
const LBRANCH = {
  // ===== RAMA DE DAÑO =====
  danio: { stats:['dmg'], names:['DAÑO','FILO','GOLPE','IMPACTO','DEMOLICIÓN'], baseVal:8, valPerDepth:1, addXp:true,
    kids:['critico','cazajefes','perforacion'], kidChance:0.35 },
  critico: { stats:['crit','critdmg'], names:['CRÍTICO','OJO MORTAL','PRECISIÓN','EJECUCIÓN'], baseVal:2, valPerDepth:1, addXp:true, kids:[], kidChance:0 },
  cazajefes: { stats:['bossDmg','eliteDmg'], names:['MATAGIGANTES','CASTIGO','EXTERMINIO'], baseVal:4, valPerDepth:1, addXp:true, kids:[], kidChance:0 },
  perforacion: { stats:['pierce','proj'], names:['PERFORACIÓN','TRASPASO','ASTILLA'], baseVal:1, valPerDepth:1, addXp:true, kids:[], kidChance:0 },
  // ===== RAMA DE EXPERIENCIA =====
  exp: { stats:['xp'], names:['SABIDURÍA','MENTE ÁGIL','ERUDICIÓN','ILUMINACIÓN','OMNISCIENCIA'], baseVal:8, valPerDepth:1, addXp:false,
    kids:['erudito','suerte'], kidChance:0.3 },
  erudito: { stats:['xp'], names:['ESTUDIO','MEDITACIÓN','CONOCIMIENTO','SABER'], baseVal:5, valPerDepth:1, addXp:false, kids:[], kidChance:0 },
  suerte: { stats:['luck'], names:['SUERTE','AZAR','FORTUNA','DESTINO'], baseVal:1, valPerDepth:1, addXp:false, kids:[], kidChance:0 },
  // ===== RAMA DE BOTÍN =====
  botin: { stats:['cur'], names:['BOTÍN','FORTUNA','AVARICIA','CODICIA','OPULENCIA'], baseVal:8, valPerDepth:1, addXp:true,
    kids:['tesoro','magnetismo','doblebotin'], kidChance:0.35 },
  tesoro: { stats:['luck'], names:['OJO DEL TESORO','SUERTE','AZAR'], baseVal:1, valPerDepth:1, addXp:true, kids:[], kidChance:0 },
  magnetismo: { stats:['cur','luck'], names:['IMÁN','ATRACCIÓN','RECOLECTOR'], baseVal:4, valPerDepth:1, addXp:true, kids:[], kidChance:0 },
  doblebotin: { stats:['cur'], names:['DOBLE BOTÍN','COSECHA','ABUNDANCIA'], baseVal:5, valPerDepth:1, addXp:true, kids:[], kidChance:0 },
  // ===== RAMA DE CADENCIA =====
  cadencia: { stats:['atk'], names:['CADENCIA','VELOCIDAD','FRENESÍ','AGILIDAD','VÉRTIGO'], baseVal:6, valPerDepth:1, addXp:true,
    kids:['reflejos','alcance','velocidad'], kidChance:0.35 },
  reflejos: { stats:['dodge'], names:['REFLEJOS','INTUICIÓN','INSTINTO','ESQUIVA'], baseVal:1, valPerDepth:1, addXp:true, kids:[], kidChance:0 },
  alcance: { stats:['range'], names:['ALCANCE','HORIZONTE','MIRADA','VISTA'], baseVal:4, valPerDepth:1, addXp:true, kids:[], kidChance:0 },
  velocidad: { stats:['speed'], names:['ZANCADA','PASO','CORRERÍA','VELOCIDAD'], baseVal:3, valPerDepth:1, addXp:true, kids:[], kidChance:0 },
  // ===== RAMA DE VIDA =====
  vida: { stats:['hp'], names:['VIDA','VITALIDAD','FORTALEZA','MURALLA','BALUARTE'], baseVal:8, valPerDepth:1, addXp:true,
    kids:['defensa','vampiro','escudo','regeneracion'], kidChance:0.35 },
  defensa: { stats:['armor'], names:['PLACAS','BLINDAJE','MURALLA','BASTIÓN'], baseVal:2, valPerDepth:1, addXp:true, kids:[], kidChance:0 },
  vampiro: { stats:['life'], names:['DRENAJE','SED','VAMPIRISMO'], baseVal:1, valPerDepth:1, addXp:true, kids:[], kidChance:0 },
  escudo: { stats:['shield'], names:['ESCUDO','BARRERA','CAPARAZÓN'], baseVal:2, valPerDepth:1, addXp:true, kids:[], kidChance:0 },
  regeneracion: { stats:['regen'], names:['REGENERACIÓN','CURACIÓN','RENACER'], baseVal:1, valPerDepth:1, addXp:true, kids:[], kidChance:0 },
};
const MAIN = ['danio','exp','botin','cadencia','vida'];

export function makeLegacyRoot() {
  return { id:'0', fam:'root', stage:-1, name:'LEGADO', x:0, y:0, ang:0, rad:0, a0:0, a1:TAU, depth:0, root:true, fx:[], cost:null };
}

function place(parent, a0, a1, allNodes, placed, r) {
  const w = Math.max(0.05, a1 - a0);
  const mid = (a0 + a1) / 2;
  const MIN = 90;
  const score = (x, y) => {
    let minD = Infinity;
    for (const n of allNodes.values()) { const d = Math.hypot(n.x - x, n.y - y); if (d < minD) minD = d; }
    for (const p of placed) { const d = Math.hypot(p.x - x, p.y - y); if (d < minD) minD = d; }
    return minD;
  };
  let best = null, bestScore = -1;
  for (let i = 0; i < 6; i++) {
    const ang = mid + (r() - 0.5) * w * 0.35;
    const rad = parent.rad + 115 + r() * 25 + (i >= 3 ? 45 : 0) + (i >= 5 ? 45 : 0);
    const x = Math.cos(ang) * rad, y = Math.sin(ang) * rad;
    const minD = score(x, y);
    if (minD > bestScore) { bestScore = minD; best = { ang, rad, x, y }; }
    if (minD >= MIN) break;
  }
  let guard = 0;
  while (bestScore < MIN && guard++ < 14) {
    best.rad += 50; best.x = Math.cos(best.ang) * best.rad; best.y = Math.sin(best.ang) * best.rad;
    bestScore = score(best.x, best.y);
  }
  return best;
}

export function genLegacyChildren(seed, node, allNodes) {
  const r = rngFrom(seed + '|' + node.id + '|lg');
  const placed = [], out = [];
  const push = (branchKey, localDepth, a0, a1) => {
    const b = LBRANCH[branchKey];
    const pos = place(node, a0, a1, allNodes, placed, r);
    const stat = b.stats[Math.floor(r() * b.stats.length)];
    const nameIdx = localDepth % b.names.length;
    const tier = Math.floor(localDepth / b.names.length);
    let name = b.names[nameIdx];
    if (tier > 0) name += ' ' + roman(tier + 1);
    const val = Math.round(b.baseVal + b.valPerDepth * localDepth);
    const fx = [[stat, val]];
    if (b.addXp) fx.push(['xp', 1]);   // nunca quedarse atrás de XP
    out.push({ id: node.id + '.' + out.length, fam: branchKey, stage: localDepth, name, fx,
      cost: null, x: pos.x, y: pos.y, ang: pos.ang, rad: pos.rad, a0, a1, depth: node.depth + 1, root: false });
    placed.push(out[out.length - 1]);
  };
  if (node.root) {
    const baseAng = r() * TAU;
    MAIN.forEach((k, i) => push(k, 0, baseAng + (i / MAIN.length) * TAU, baseAng + ((i + 1) / MAIN.length) * TAU));
    return out;
  }
  const branch = LBRANCH[node.fam];
  if (!branch) return out;
  const specs = [{ key: node.fam, depth: node.stage + 1 }];   // siempre continúa => infinito
  const availableKids = (branch.kids || []).filter(k => LBRANCH[k]);
  if (availableKids.length > 0 && r() < branch.kidChance) {   // bifurcación
    specs.push({ key: availableKids[Math.floor(r() * availableKids.length)], depth: 0 });
  }
  const w = node.a1 - node.a0;
  specs.forEach((spec, i) => {
    push(spec.key, spec.depth, node.a0 + (w * i) / specs.length, node.a0 + (w * (i + 1)) / specs.length);
  });
  return out;
}

export const LEGACY_FXTEXT = {
  dmg: '+{v}% daño', xp: '+{v}% experiencia', cur: '+{v}% botín', atk: '+{v}% cadencia', hp: '+{v}% vida',
  crit: '+{v}% prob. crítico', critdmg: '+{v}% daño crítico', bossDmg: '+{v}% daño a jefes', eliteDmg: '+{v}% daño a élites',
  luck: '+{v} suerte', armor: '-{v}% daño recibido', speed: '+{v}% velocidad', range: '+{v}% alcance',
  dodge: '+{v}% esquiva', life: '+{v}% vampirismo', regen: '+{v}% vida/s', shield: 'Escudo ({v}% vida)',
  pierce: '+{v} perforación', proj: '+{v} proyectiles',
};
export function fxDescLegacy(node) {
  return node.fx.map(([k, v]) => tr(LEGACY_FXTEXT[k] || '+{v} ' + k).replace('{v}', v));
}

export class LegacyTree {
  constructor(heroId, seed) {
    this.heroId = heroId; this.seed = seed;
    this.nodes = new Map(); this.owned = new Set();
    this.cam = { x: 0, y: 0, z: 0.85 };
    const root = makeLegacyRoot();
    this.nodes.set(root.id, root); this.owned.add(root.id);
    this.ensureChildren(root);
    this._v = null; this._s = null;
  }
  node(id) { return this.nodes.get(id); }
  ensureChildren(node) {
    if (node.kids) return node.kids.map(i => this.nodes.get(i));
    node.kids = [];
    for (const k of genLegacyChildren(this.seed, node, this.nodes)) {
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
  visible() {
    if (this._v) return this._v;
    const seen = new Set(), out = [];
    for (const id of this.owned) {
      const n = this.ensurePath(id);
      if (!n) continue;
      if (!seen.has(n.id)) { seen.add(n.id); out.push(n); }
      for (const c of this.ensureChildren(n)) if (!seen.has(c.id)) { seen.add(c.id); out.push(c); }
    }
    return this._v = out;
  }
  frontier() { return this.visible().filter(n => !this.owned.has(n.id) && !n.root); }
  canBuy(n) {
    if (!n || n.root || this.owned.has(n.id)) return false;
    const pid = n.id.slice(0, n.id.lastIndexOf('.'));
    return pid === '' || this.owned.has(pid);
  }
  grantRandom() {
    const fr = this.frontier().filter(n => this.canBuy(n));
    if (!fr.length) return null;
    const n = fr[Math.floor(Math.random() * fr.length)];
    this.owned.add(n.id);
    this.ensureChildren(n);
    this.invalidate();
    return n;
  }
  bonuses() {
    if (this._s) return this._s;
    const t = {};
    for (const id of this.owned) {
      const n = this.nodes.get(id);
      if (!n) continue;
      for (const [k, v] of n.fx) t[k] = (t[k] || 0) + v;
    }
    return this._s = t;
  }
}

export const Legacy = {
  map: new Map(), records: {}, _saved: {},
  init(saved = {}) {
    this.records = saved.records || {};
    this._saved = saved.trees || {};
    this.map.clear();
  },
  get(id) {
    if (!this.map.has(id)) {
      const t = new LegacyTree(id, 'LEGACY|' + id);
      const s = this._saved[id];
      if (s && s.owned) for (const nid of s.owned) { t.owned.add(nid); t.ensurePath(nid); }
      t.invalidate();
      this.map.set(id, t);
    }
    return this.map.get(id);
  },
  getRecord(id) { return this.records[id] || 1; },
  setRecord(id, v) { this.records[id] = v; },
  grantNode(id) { return this.get(id).grantRandom(); },
  getBonuses(id) { return this.get(id).bonuses(); },
 serialize() {
const trees = {};
// 1) Guardar árboles accedidos durante esta sesión (tienen los nodos más recientes)
for (const [id, t] of this.map) trees[id] = { owned: [...t.owned].filter(i => i !== '0') };
// 2) Guardar también árboles de _saved que NO se accedieron esta sesión
//    (sin esto, se pierden al recargar si el jugador no abre el legado)
for (const id in this._saved) {
if (!trees[id]) trees[id] = this._saved[id];
}
return { records: this.records, trees };
}
};