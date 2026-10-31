import { rngFrom, TAU } from './utils.js';
import { tr } from './localization.js';

// ============================================================
// DEFINICIÓN DE RAMAS INFINITAS
// Cada rama escala sus valores y costes con la profundidad local,
// NUNCA se agota, y puede bifurcar en sub-ramas.
// ============================================================
const RBRANCH = {
  // ==== RAMA DE DAÑO ====
  poder: {
    stats: ['dmg'],
    names: ['PODER', 'FUERZA', 'GOLPE', 'IMPACTO', 'DEMOLICIÓN'],
    baseVal: 5, valPerDepth: 1, decimals: false,
    costBase: 1, costPerDepth: 1,
    kids: ['azote', 'cazajefes'],
    kidChance: 0.3,
  },
  azote: {
    stats: ['vsCircle', 'vsTriangle', 'vsSquare', 'vsHexagon', 'vsPentagon', 'vsPurple'],
    names: ['AZOTE'],
    baseVal: 6, valPerDepth: 1, decimals: false,
    costBase: 2, costPerDepth: 1,
    kids: [],
    kidChance: 0,
  },
  cazajefes: {
    stats: ['bossDmg', 'eliteDmg'],
    names: ['MATAGIGANTES', 'CASTIGO', 'EXTERMINIO'],
    baseVal: 4, valPerDepth: 1, decimals: false,
    costBase: 2, costPerDepth: 1,
    kids: [],
    kidChance: 0,
  },

  // ==== RAMA DE RECURSOS / MONEDAS ====
  fortuna: {
    stats: ['cur'],
    names: ['FORTUNA', 'BOTÍN', 'AVARICIA', 'CODICIA', 'OPULENCIA'],
    baseVal: 5, valPerDepth: 1, decimals: false,
    costBase: 1, costPerDepth: 1,
    kids: ['codicia', 'tesoro', 'descuento'],
    kidChance: 0.3,
  },
  codicia: {
    stats: ['curCIR', 'curTRI', 'curCUA', 'curHEX', 'curPEN', 'curPUR'],
    names: ['CODICIA'],
    baseVal: 6, valPerDepth: 1, decimals: false,
    costBase: 2, costPerDepth: 1,
    kids: ["fortuna"],
    kidChance: 0.1,
  },
  tesoro: {
    stats: ['luck'],
    names: ['OJO DEL TESORO', 'SUERTE', 'AZAR', 'FORTUNA'],
    baseVal: 0.5, valPerDepth: 0.1, decimals: true,
    costBase: 2, costPerDepth: 1,
    kids: [],
    kidChance: 0,
  },
  descuento: {
    stats: ['treeCost'],
    names: ['DESCUENTO', 'GANGA', 'CHOLLO', 'OFERTA'],
    baseVal: 0.5, valPerDepth: 0.15, decimals: true,
    costBase: 3, costPerDepth: 1.5,
    kids: [],
    kidChance: 0,
  },

  // ==== RAMA DE EXPERIENCIA ====
  sabiduria: {
    stats: ['xp'],
    names: ['APRENDIZAJE', 'MENTE ÁGIL', 'ERUDICIÓN', 'SABIDURÍA', 'ILUMINACIÓN'],
    baseVal: 5, valPerDepth: 1, decimals: false,
    costBase: 1, costPerDepth: 1,
    kids: ['erudito'],
    kidChance: 0.25,
  },
  erudito: {
    stats: ['xp'],
    names: ['ESTUDIO', 'MEDITACIÓN', 'CONOCIMIENTO', 'SABER'],
    baseVal: 3, valPerDepth: 0.5, decimals: false,
    costBase: 2, costPerDepth: 1,
    kids: [],
    kidChance: 0,
  },

  // ==== RAMA DE UTILIDAD ====
  utilidad: {
    stats: ['hp', 'atk'],
    names: ['VITALIDAD', 'CADENCIA', 'RESISTENCIA', 'AGILIDAD'],
    baseVal: 4, valPerDepth: 1, decimals: false,
    costBase: 1, costPerDepth: 1,
    kids: ['reflejos', 'fortaleza'],
    kidChance: 0.3,
  },
  reflejos: {
    stats: ['luck'],
    names: ['REFLEJOS', 'INTUICIÓN', 'INSTINTO'],
    baseVal: 0.5, valPerDepth: 0.1, decimals: true,
    costBase: 2, costPerDepth: 1,
    kids: [],
    kidChance: 0,
  },
  fortaleza: {
    stats: ['hp'],
    names: ['FORTALEZA', 'MURALLA', 'BASTIÓN', 'BALUARTE'],
    baseVal: 6, valPerDepth: 1, decimals: false,
    costBase: 2, costPerDepth: 1,
    kids: [],
    kidChance: 0,
  },

acumular: {
stats: ['levelCap'],
names: ['ACUMULAR', 'RESERVA', 'ALMACÉN', 'DEPÓSITO', 'ACUMULAR NIVELES'],
randomVal: true, valMin: 1, valMax: 5, decimals: false,
costBase: 1, costPerDepth: 1,
kids: ['vision', 'sabiduria'],
kidChance: 0.3,
},
// ==== RAMA DE VISIÓN (ver nodos más allá) ====
vision: {
stats: ['foresight'],
names: ['VISIÓN', 'PREVISIÓN', 'ORÁCULO', 'CLARIVIDENCIA'],
randomVal: true, valMin: 1, valMax: 2, decimals: false,
costBase: 2, costPerDepth: 1,
kids: [],
kidChance: 0,
},
};

const MAIN_BRANCHES = ['poder', 'fortuna', 'sabiduria', 'utilidad', 'acumular'];

export function makeRebirthRoot() {
  return {
    id: '0', fam: 'root', stage: -1,
    name: 'NÚCLEO DE RENACIMIENTO',
    x: 0, y: 0, ang: 0, rad: 0, a0: 0, a1: TAU, depth: 0, root: true, fx: [], cost: null
  };
}

// Busca una posición libre dentro del sector angular, evitando solapamientos
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
    best.rad += 50;
    best.x = Math.cos(best.ang) * best.rad;
    best.y = Math.sin(best.ang) * best.rad;
    bestScore = score(best.x, best.y);
  }
  return best;
}

// Números romanos para los tiers de nombre
function roman(n) {
  const vals = [50, 40, 10, 9, 5, 4, 1];
  const syms = ['L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
  let result = '';
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) { result += syms[i]; n -= vals[i]; }
  }
  return result;
}

export function genRebirthChildren(seed, node, allNodes) {
  const r = rngFrom(seed + '|' + node.id + '|rk');
  const placed = [], out = [];

  const push = (branchKey, localDepth, a0, a1) => {
    const branch = RBRANCH[branchKey];
    const pos = place(node, a0, a1, allNodes, placed, r);

    // Elegir stat y nombre del pool
    const stat = branch.stats[Math.floor(r() * branch.stats.length)];
    const nameIdx = localDepth % branch.names.length;
    const tier = Math.floor(localDepth / branch.names.length);
    let name = branch.names[nameIdx];
    if (tier > 0) name += ' ' + roman(tier + 1);

// Valor y coste: aleatorio si la rama lo especifica, si no, escalado por profundidad
let val;
if (branch.randomVal) {
val = branch.valMin + Math.floor(r() * (branch.valMax - branch.valMin + 1));
} else {
const rawVal = branch.baseVal + branch.valPerDepth * localDepth;
val = branch.decimals ? Math.round(rawVal * 10) / 10 : Math.round(rawVal);
}
const cost = Math.max(1, Math.round(branch.costBase + branch.costPerDepth * localDepth));

    const child = {
      id: node.id + '.' + out.length,
      fam: branchKey,
      stage: localDepth,
      name: name,
      fx: [[stat, val]],
      cost: { v: cost },
      x: pos.x, y: pos.y, ang: pos.ang, rad: pos.rad,
      a0, a1, depth: node.depth + 1, root: false
    };
    placed.push(child);
    out.push(child);
  };

  // La raíz genera las 4 ramas principales con sectores angulares fijos
  if (node.root) {
    const baseAng = r() * TAU;
    MAIN_BRANCHES.forEach((branchKey, i) => {
      const a0 = baseAng + (i / MAIN_BRANCHES.length) * TAU;
      const a1 = baseAng + ((i + 1) / MAIN_BRANCHES.length) * TAU;
      push(branchKey, 0, a0, a1);
    });
    return out;
  }

  const branch = RBRANCH[node.fam];
  if (!branch) return out;

  const nextLocalDepth = node.stage + 1;

  // SIEMPRE generar la continuación de la rama (hace el árbol infinito)
  const specs = [{ branchKey: node.fam, localDepth: nextLocalDepth }];

  // Con probabilidad kidChance, generar también una bifurcación a una sub-rama
  const availableKids = (branch.kids || []).filter(k => RBRANCH[k]);
  if (availableKids.length > 0 && r() < branch.kidChance) {
    const kidKey = availableKids[Math.floor(r() * availableKids.length)];
    specs.push({ branchKey: kidKey, localDepth: 0 });
  }

  // Generar hijos dentro del sector angular del padre
  const w = node.a1 - node.a0;
  specs.forEach((spec, i) => {
    const a0 = node.a0 + (w * i) / specs.length;
    const a1 = node.a0 + (w * (i + 1)) / specs.length;
    push(spec.branchKey, spec.localDepth, a0, a1);
  });

  return out;
}

// Texto descriptivo de los efectos (EXPORTADO para rebirthView.js)
export const FXTEXT = {
  dmg: '+{v}% daño',
  xp: '+{v}% experiencia',
  cur: '+{v}% botín',
  hp: '+{v}% vida',
  atk: '+{v}% vel.disparo',
  treeCost: '-{v}% coste de nodos',
  luck: '+{v} suerte',
  vsCircle: '+{v}% daño a círculos',
  vsTriangle: '+{v}% daño a triángulos',
  vsSquare: '+{v}% daño a cuadrados',
  vsHexagon: '+{v}% daño a hexágonos',
  vsPentagon: '+{v}% daño a pentágonos',
  vsPurple: '+{v}% daño a morados',
  curCIR: '+{v}% CIR',
  curTRI: '+{v}% TRI',
  curCUA: '+{v}% CUA',
  curHEX: '+{v}% HEX',
  curPEN: '+{v}% PEN',
  curPUR: '+{v}% PUR',
  bossDmg: '+{v}% daño a jefes',
  eliteDmg: '+{v}% daño a élites',
  levelCap: '+{v} capacidad de niveles',
  foresight: '+{v} profundidad de visión',
};

export function fxDescRebirth(node) {
  return node.fx.map(([k, v]) => {
    const fmt = tr(FXTEXT[k] || '+{v} ' + k);
    return fmt.replace('{v}', v);
  });
}