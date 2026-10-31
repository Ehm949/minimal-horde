import { BAL } from './config.js';

export const ETYPES = {
circle:   { radius:18, speed:60,  hp:30,  dmg:5,  cur:'CIR', xp:2, dist:2,  w: d => 10 },
triangle: { radius:15, speed:90,  hp:20,  dmg:3,  cur:'TRI', xp:1, dist:4,  w: d => 8 },
square:   { radius:20, speed:42,  hp:50,  dmg:8,  cur:'CUA', xp:3, dist:3,  w: d => 6 },
hexagon:  { radius:25, speed:30,  hp:80,  dmg:12, cur:'HEX', xp:5, dist:6,  w: d => d >= 300 ? 3.5 : 0 },
pentagon: { radius:23, speed:48,  hp:120, dmg:15, cur:'PEN', xp:7, dist:10, w: () => 0 },
purple:   { radius:20, speed:66,  hp:60,  dmg:10, cur:'PUR', xp:4, dist:8,  w: () => 0,
ranged:true, preferredRange:260, fireInterval:1.5 },
golden:   { radius:20, speed:0, hp:90, dmg:20, cur:'ORO', xp:6, dist:12, w: () => 0, orbit: true },
// ---- ROSA: soporte con aura, no persigue al héroe ----
pink:     { radius:22, speed:50, hp:70, dmg:0, cur:'PINK', xp:5, dist:10, w: () => 0,
support: true, preferredRange: 300, auraRadius: 120 }
};

export function hpScale(dist) { return Math.pow(BAL.hpG, dist / BAL.hpPer); }
export function dmgScale(dist) { return Math.pow(BAL.dmgG, dist / BAL.hpPer); }
export function curScale(dist) { return Math.pow(BAL.curG, dist / BAL.hpPer); }

export function pickType(dist, bossesKilled) {
if (dist >= 1100 && Math.random() < 0.15) return 'pentagon';
// MORADOS: desde el metro 400
if (dist >= 400) {
const purpleChance = Math.min(0.20, 0.02 + (dist - 400) * 0.18 / 2600);
if (Math.random() < purpleChance) return 'purple';
}
// ROSA: desde el metro 200, probabilidad del 2% al 12%
if (dist >= 200) {
const pinkChance = Math.min(0.12, 0.02 + (dist - 200) * 0.10 / 2800);
if (Math.random() < pinkChance) return 'pink';
}
const base = ['circle', 'triangle', 'square', 'hexagon']
.map(k => [k, ETYPES[k].w(dist)]).filter(e => e[1] > 0);
let tot = base.reduce((a, e) => a + e[1], 0), x = Math.random() * tot;
for (const [k, w] of base) { if (x < w) return k; x -= w; }
return 'circle';
}

let uid = 1;

export function makeEnemy(dist, type, x, y, opts = {}) {
const t = ETYPES[type];
const e = {
uid: uid++, type, x, y,
radius: t.radius,
shape: (type === 'purple' || type === 'golden' || type === 'pink')
? ['circle','square','triangle'][Math.floor(Math.random()*3)] : type,
color: type === 'purple' ? 'purple'
: (type === 'golden' ? 'golden'
: (type === 'pink' ? 'pink' : 'red')),
hp: t.hp * hpScale(dist), dmg: t.dmg * dmgScale(dist),
speed: t.speed * (1 + dist * 0.00004),
cur: t.cur, xpDrop: t.xp, distVal: t.dist,
ranged: !!t.ranged, preferredRange: t.preferredRange || 0,
fireInterval: t.fireInterval || 0, lastShot: Math.random(),
orbit: !!t.orbit,
flash: 0, hitCd: 0, slow: 0, slowT: 0,
burn: null, poison: 0, poisonT: 0,
elite: false, boss: false,
_pinkBuffed: false, _pinkSpeedMul: 1
};
e.maxHp = e.hp;
if (opts.elite) {
e.elite = true; e.hp = e.maxHp = e.hp * 3.5; e.dmg *= 1.8;
e.radius *= 1.4; e.xpDrop *= 3; e.distVal *= 3;
}
if (opts.boss) {
e.boss = true; e.shape = 'boss';
e.hp = e.maxHp = 400 * hpScale(dist) * (1 + dist / 1000);
e.dmg *= 2.5; e.radius = 52; e.speed = 26;
e.xpDrop *= 25; e.distVal = 60;
}
// ROSA: propiedades de soporte
if (type === 'pink') {
e.support = true;
e.auraRadius = ETYPES.pink.auraRadius;
e.preferredRange = ETYPES.pink.preferredRange;
}
return e;
}

const RED = [229, 57, 53], PURPLE = [156, 39, 176], GOLD = [255, 140, 0];
const PINK = [255, 105, 180];

export function darkenColor(hpPercent, base) {
const f = 0.2 + hpPercent * 0.8;
return `rgb(${Math.floor(base[0]*f)},${Math.floor(base[1]*f)},${Math.floor(base[2]*f)})`;
}

export const ENEMY_RGB = { red: RED, purple: PURPLE, golden: GOLD, pink: PINK };