import { BAL } from './config.js';
import { Bus } from './events.js';
import { clamp } from './utils.js';
import { Trees } from './heroTree.js';
import { LevelUps } from './levelUps.js';
import { Rebirth } from './rebirth.js';
import { Shop } from './shop.js';
import { Legacy } from './legacyTree.js';
import { Modifiers } from './modifiers.js';
import { t, tr } from './localization.js';

const TAU = Math.PI * 2;

export const HERO_DEFS = [
{ id:'pistol', name:'PISTOLA', stats:{health:1, speed:1, damage:1, fireRate:1},
weapon:{kind:'bullet', dmg:10, interval:0.30, range:330, spd:1}, crit:5, critDmg:150,
desc:'Disparo único preciso.',
draw(ctx,x,y,r,c1='#000',c2='#fff'){ ctx.fillStyle=c1; ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.fill();
ctx.fillStyle=c2; ctx.beginPath();
ctx.moveTo(x+r*0.8,y); ctx.lineTo(x+r*0.4,y-r*0.3); ctx.lineTo(x+r*0.4,y+r*0.3);
ctx.closePath(); ctx.fill(); } },

{ id:'burst', name:'RÁFAGA', stats:{health:0.8, speed:1.2, damage:0.75, fireRate:1},
weapon:{kind:'burst', dmg:12, interval:0.6, range:320, spd:1}, crit:5, critDmg:150,
desc:'Ráfagas de 3 balas.',
draw(ctx,x,y,r,c1='#000',c2='#fff'){ ctx.fillStyle=c1; ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.fill();
ctx.fillStyle=c2; const d=r*0.15;
ctx.beginPath(); ctx.arc(x+r*0.5,y,d,0,TAU); ctx.fill();
ctx.beginPath(); ctx.arc(x+r*0.25,y,d,0,TAU); ctx.fill();
ctx.beginPath(); ctx.arc(x,y,d,0,TAU); ctx.fill(); } },

{ id:'shotgun', name:'ESCOPETA', stats:{health:1.5, speed:0.8, damage:1.2, fireRate:0.7},
weapon:{kind:'shotgun', dmg:15, interval:0.6, range:210, spd:0.8}, crit:5, critDmg:150,
desc:'Abanico de perdigones.',
draw(ctx,x,y,r,c1='#000',c2='#fff'){ ctx.fillStyle=c1; ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.fill();
ctx.strokeStyle=c2; ctx.lineWidth=r*0.2;
ctx.beginPath(); ctx.arc(x,y,r*0.6,0,TAU); ctx.stroke(); } },

{ id:'machinegun', name:'AMETRALLADORA', stats:{health:0.9, speed:1.1, damage:0.7, fireRate:1.5},
weapon:{kind:'mg', dmg:5, interval:0.08, range:310, spd:1.2}, crit:4, critDmg:150,
desc:'Velocidad de ataque extrema.',
draw(ctx,x,y,r,c1='#000',c2='#fff'){ ctx.fillStyle=c1; ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.fill();
ctx.strokeStyle=c2; ctx.lineWidth=r*0.15;
ctx.beginPath(); ctx.moveTo(x-r*0.4,y-r*0.4); ctx.lineTo(x+r*0.4,y+r*0.4);
ctx.moveTo(x+r*0.4,y-r*0.4); ctx.lineTo(x-r*0.4,y+r*0.4); ctx.stroke(); } },

{ id:'sniper', name:'SNIPER', stats:{health:0.85, speed:0.9, damage:2.5, fireRate:0.4},
weapon:{kind:'sniper', dmg:50, interval:1.0, range:620, spd:2}, crit:15, critDmg:250,
desc:'Perforación infinita. Críticos 2.5x.',
draw(ctx,x,y,r,c1='#000',c2='#fff'){ ctx.fillStyle=c1; ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.fill();
ctx.fillStyle=c2; ctx.beginPath(); ctx.arc(x,y,r*0.2,0,TAU); ctx.fill();
ctx.strokeStyle=c2; ctx.lineWidth=2;
ctx.beginPath();
ctx.moveTo(x-r*0.6,y); ctx.lineTo(x-r*0.3,y);
ctx.moveTo(x+r*0.3,y); ctx.lineTo(x+r*0.6,y);
ctx.moveTo(x,y-r*0.6); ctx.lineTo(x,y-r*0.3);
ctx.moveTo(x,y+r*0.3); ctx.lineTo(x,y+r*0.6); ctx.stroke(); } },

{ id:'laser', name:'LÁSER', stats:{health:0.95, speed:1, damage:0.5, fireRate:2},
weapon:{kind:'laser', dmg:4, interval:0.1, range:500, spd:0}, crit:5, critDmg:150,
desc:'Rayo continuo que quema.',
draw(ctx,x,y,r,c1='#000',c2='#fff'){ ctx.fillStyle=c1; ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.fill();
ctx.strokeStyle=c2; ctx.lineWidth=r*0.15;
ctx.beginPath(); ctx.moveTo(x-r*0.7,y); ctx.lineTo(x+r*0.7,y); ctx.stroke(); } },

{ id:'ghost', name:'FANTASMA', stats:{health:0.7, speed:1.4, damage:0.45, fireRate:1.8},
weapon:{kind:'flame', dmg:2, interval:0.05, range:170, spd:0.6}, crit:5, critDmg:150,
desc:'Llamas que queman en área.',
draw(ctx,x,y,r,c1='#000',c2='#fff'){ ctx.globalAlpha=0.5; ctx.fillStyle=c1; ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.fill(); ctx.globalAlpha=1;
ctx.fillStyle=c2; const er=r*0.18, ed=r*0.35;
ctx.beginPath(); ctx.arc(x+ed,y,er,0,TAU); ctx.fill();
ctx.beginPath(); ctx.arc(x-ed*0.5,y-ed*0.6,er,0,TAU); ctx.fill();
ctx.beginPath(); ctx.arc(x-ed*0.5,y+ed*0.6,er,0,TAU); ctx.fill();
ctx.fillStyle=c1; const pr=r*0.07;
ctx.beginPath(); ctx.arc(x+ed,y,pr,0,TAU); ctx.fill();
ctx.beginPath(); ctx.arc(x-ed*0.5,y-ed*0.6,pr,0,TAU); ctx.fill();
ctx.beginPath(); ctx.arc(x-ed*0.5,y+ed*0.6,pr,0,TAU); ctx.fill(); } },

{ id:'tank', name:'TANQUE', stats:{health:2, speed:0.7, damage:1.8, fireRate:0.6},
weapon:{kind:'missile', dmg:25, interval:0.8, range:380, spd:0.7}, crit:5, critDmg:150,
desc:'Misiles teledirigidos. Mucha vida.',
draw(ctx,x,y,r,c1='#000',c2='#fff'){ ctx.fillStyle=c1; ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.fill();
ctx.strokeStyle=c2; ctx.lineWidth=r*0.25;
ctx.beginPath(); ctx.arc(x,y,r*0.65,0,TAU); ctx.stroke();
ctx.fillStyle=c2; ctx.beginPath(); ctx.arc(x,y,r*0.2,0,TAU); ctx.fill();
const d=r*0.08, D=r*0.45;
ctx.beginPath(); ctx.arc(x+D,y,d,0,TAU); ctx.fill();
ctx.beginPath(); ctx.arc(x-D,y,d,0,TAU); ctx.fill();
ctx.beginPath(); ctx.arc(x,y+D,d,0,TAU); ctx.fill();
ctx.beginPath(); ctx.arc(x,y-D,d,0,TAU); ctx.fill(); } },

{ id:'orbital', name:'ORBITAL', stats:{health:0.9, speed:1, damage:0.7, fireRate:1},
weapon:{kind:'orbital', dmg:20, interval:0.35, range:60, spd:0}, crit:5, critDmg:150,
desc:'Esferas orbitales que dañan y bloquean balas.',
draw(ctx,x,y,r,c1='#000',c2='#fff'){ ctx.fillStyle=c1; ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.fill();
ctx.strokeStyle=c2; ctx.lineWidth=2;
ctx.beginPath(); ctx.arc(x,y,r*0.4,0,TAU); ctx.stroke();
ctx.beginPath(); ctx.arc(x,y,r*0.7,0,TAU); ctx.stroke();
ctx.fillStyle=c2; ctx.beginPath(); ctx.arc(x,y,r*0.15,0,TAU); ctx.fill();
const t2=Date.now()*0.002;
for(let i=0;i<3;i++){ const a=t2+i*TAU/3;
ctx.fillStyle='#E53935';
ctx.beginPath(); ctx.arc(x+Math.cos(a)*r*0.55,y+Math.sin(a)*r*0.55,r*0.08,0,TAU); ctx.fill(); } } },

{ id:'ricochet', name:'REBOTE', stats:{health:0.9, speed:1.1, damage:0.8, fireRate:0.9},
weapon:{kind:'ricochet', dmg:12, interval:0.35, range:420, spd:1.1}, crit:5, critDmg:150,
desc:'Balas que rebotan en las paredes.',
draw(ctx,x,y,r,c1='#000',c2='#fff'){ ctx.fillStyle=c1; ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.fill();
ctx.strokeStyle=c2; ctx.lineWidth=r*0.14; ctx.lineCap='round'; ctx.lineJoin='round';
ctx.beginPath();
ctx.moveTo(x-r*0.55,y-r*0.4); ctx.lineTo(x,y+r*0.35); ctx.lineTo(x+r*0.55,y-r*0.4); ctx.stroke();
ctx.fillStyle=c2; ctx.beginPath(); ctx.arc(x+r*0.55,y-r*0.4,r*0.1,0,TAU); ctx.fill(); } },

{ id:'chakram', name:'CHAKRAM', stats:{health:0.95, speed:1.1, damage:1.1, fireRate:0.9},
weapon:{kind:'chakram', dmg:10, interval:0.65, range:260, spd:0.9}, crit:8, critDmg:170,
desc:'Discos que van y vuelven.',
draw(ctx,x,y,r,c1='#000',c2='#fff'){ ctx.fillStyle=c1; ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.fill();
ctx.strokeStyle=c2; ctx.lineWidth=r*0.18;
ctx.beginPath(); ctx.arc(x,y,r*0.62,0,TAU); ctx.stroke();
ctx.lineWidth=r*0.12;
for(let i=0;i<4;i++){ const a=(Math.PI/2)*i+Math.PI/4;
ctx.beginPath();
ctx.moveTo(x+Math.cos(a)*r*0.78,y+Math.sin(a)*r*0.78);
ctx.lineTo(x+Math.cos(a)*r*0.95,y+Math.sin(a)*r*0.95); ctx.stroke(); }
ctx.fillStyle=c2; ctx.beginPath(); ctx.arc(x,y,r*0.16,0,TAU); ctx.fill(); } },

{ id:'metralla', name:'METRALLA', stats:{health:0.95, speed:1, damage:0.9, fireRate:1},
weapon:{kind:'metralla', dmg:10, interval:0.4, range:360, spd:0.85}, crit:5, critDmg:150,
desc:'La bala siembra disparitos en todas direcciones.',
draw(ctx,x,y,r,c1='#000',c2='#fff'){ ctx.fillStyle=c1; ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.fill();
ctx.fillStyle=c2; ctx.beginPath(); ctx.arc(x,y,r*0.2,0,TAU); ctx.fill();
const sparks=[{a:.3,d:.55,s:.09},{a:1.4,d:.72,s:.07},{a:2.5,d:.5,s:.08},
{a:3.6,d:.78,s:.06},{a:4.7,d:.6,s:.09},{a:5.6,d:.82,s:.07}];
for(const p of sparks) { ctx.beginPath();
ctx.arc(x+Math.cos(p.a)*p.d*r,y+Math.sin(p.a)*p.d*r,p.s*r,0,TAU); ctx.fill(); } } },

{ id:'fragmento', name:'FRAGMENTO', stats:{health:1, speed:1, damage:1.1, fireRate:0.85},
weapon:{kind:'fragment', dmg:12, interval:0.5, range:360, spd:0.95}, crit:5, critDmg:150,
desc:'La bala estalla en 3 esquirlas al impactar.',
draw(ctx,x,y,r,c1='#000',c2='#fff'){ ctx.fillStyle=c1; ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.fill();
ctx.strokeStyle=c2; ctx.lineWidth=r*0.2; ctx.lineCap='round';
const gap=0.42, arcLen=(TAU-gap*3)/3;
for(let i=0;i<3;i++){ const start=-Math.PI/2+i*(arcLen+gap), mid=start+arcLen/2;
ctx.beginPath();
ctx.arc(x+Math.cos(mid)*r*0.1,y+Math.sin(mid)*r*0.1,r*0.56,start,start+arcLen); ctx.stroke(); }
ctx.fillStyle=c2; ctx.beginPath(); ctx.arc(x,y,r*0.16,0,TAU); ctx.fill(); } },

{ id:'centinela', name:'CENTINELA', stats:{health:0.9, speed:1.1, damage:0.9, fireRate:0.5},
weapon:{kind:'sentry', dmg:9, interval:0.35, range:440, spd:1}, crit:6, critDmg:160,
desc:'Radar de largo alcance. Doble cañón.',
draw(ctx,x,y,r,c1='#000',c2='#fff'){ ctx.fillStyle=c1; ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.fill();
ctx.strokeStyle=c2; ctx.lineWidth=2;
ctx.beginPath(); ctx.arc(x,y,r*0.72,0,TAU); ctx.stroke();
for(let i=0;i<8;i++){ const a=i/8*TAU;
ctx.beginPath();
ctx.moveTo(x+Math.cos(a)*r*0.62,y+Math.sin(a)*r*0.62);
ctx.lineTo(x+Math.cos(a)*r*0.72,y+Math.sin(a)*r*0.72); ctx.stroke(); }
const sweep=(Date.now()*0.003)%TAU;
ctx.strokeStyle='#E53935'; ctx.lineWidth=r*0.1;
ctx.beginPath(); ctx.arc(x,y,r*0.48,sweep,sweep+0.9); ctx.stroke();
ctx.fillStyle=c2; ctx.beginPath(); ctx.arc(x,y,r*0.2,0,TAU); ctx.fill();
ctx.fillStyle='#E53935'; ctx.beginPath(); ctx.arc(x,y,r*0.09,0,TAU); ctx.fill(); } },

{ id:'graviton', name:'GRAVITÓN', stats:{health:0.95, speed:1, damage:1, fireRate:0.9},
weapon:{kind:'graviton', dmg:11, interval:0.45, range:320, spd:1}, crit:5, critDmg:150,
desc:'Balas gravitatorias que orbitan y atraen.',
draw(ctx,x,y,r,c1='#000',c2='#fff'){ ctx.fillStyle=c1; ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.fill();
ctx.strokeStyle=c2; ctx.lineWidth=1.5;
ctx.beginPath(); ctx.arc(x,y,r*0.45,0,TAU); ctx.stroke();
ctx.beginPath(); ctx.arc(x,y,r*0.7,0,TAU); ctx.stroke();
const a=Date.now()*0.004;
ctx.fillStyle='#E53935';
ctx.beginPath(); ctx.arc(x+Math.cos(a)*r*0.7,y+Math.sin(a)*r*0.7,r*0.12,0,TAU); ctx.fill();
ctx.fillStyle=c2; ctx.beginPath(); ctx.arc(x,y,r*0.18,0,TAU); ctx.fill(); } },

{ id:'pulso', name:'PULSO', stats:{health:1, speed:1, damage:1, fireRate:0.85},
weapon:{kind:'pulse', dmg:18, interval:0.7, range:130, spd:0}, crit:5, critDmg:150,
desc:'Ondas expansivas que nacen de él.',
draw(ctx,x,y,r,c1='#000',c2='#fff'){ ctx.fillStyle=c1; ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.fill();
ctx.strokeStyle=c2; ctx.lineWidth=2;
ctx.beginPath(); ctx.arc(x,y,r*0.6,0,TAU); ctx.stroke();
const pulse=0.5+0.5*Math.sin(Date.now()*0.006);
ctx.fillStyle='#E53935';
ctx.beginPath(); ctx.arc(x,y,r*(0.25+pulse*0.08),0,TAU); ctx.fill();
ctx.fillStyle=c2; ctx.beginPath(); ctx.arc(x,y,r*0.12,0,TAU); ctx.fill(); } },

{ id:'area', name:'AREA', stats:{health:0.9, speed:1, damage:1, fireRate:1.2},
weapon:{kind:'area', dmg:6, interval:1, range:70, spd:0}, crit:5, critDmg:150,
desc:'Un área de daño a su alrededor.',
draw(ctx,x,y,r,c1='#000',c2='#fff'){ ctx.fillStyle=c1; ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.fill();
ctx.strokeStyle=c2; ctx.lineWidth=r*0.12;
ctx.beginPath(); ctx.arc(x,y,r*0.4,0,TAU); ctx.stroke();
ctx.beginPath(); ctx.arc(x,y,r*0.72,0,TAU); ctx.stroke();
ctx.fillStyle=c2; ctx.beginPath(); ctx.arc(x,y,r*0.14,0,TAU); ctx.fill(); } }
];

HERO_DEFS.forEach(d => { d.nameEs = d.name; });

export function localizeHeroes() {
for (const d of HERO_DEFS) d.name = tr(d.nameEs) || d.nameEs;
}

export const STARTERS = ['pistol'];

const reg = new Map();
export const Global = {
put(k, id, { add = 0, mul = 1 }) {
if (!reg.has(k)) reg.set(k, new Map());
reg.get(k).set(id, { add, mul });
},
calc() {
const o = { dmg: 1, cur: 1, xp: 1, hp: 1, luck: 0 };
for (const [k, m] of reg) {
let add = 0, mul = 1;
for (const v of m.values()) { add += v.add; mul *= v.mul; }
if (k === 'luck') o.luck += add;
else o[k] = (o[k] || 1) * mul * (1 + add);
}
return o;
}
};

export const xpNeed = l => Math.floor(BAL.lvlXpBase * Math.pow(BAL.lvlXpG, l - 1));

export const Heroes = {
list: [], active: 'pistol',
init(saved = {}) {
this.list = HERO_DEFS.map(d => {
const s = saved[d.id] || {};
return { def: d, level: s.level || 1, xp: s.xp || 0, rank: s.rank || 0,
unlocked: s.unlocked !== undefined ? s.unlocked : STARTERS.includes(d.id),
dupes: s.dupes || 0 };
});
if (saved.__active && this.get(saved.__active)?.unlocked) this.active = saved.__active;
},
get(id) { return this.list.find(h => h.def.id === id); },
activeHero() { return this.get(this.active); },
unlockedCount() { return this.list.filter(h => h.unlocked).length; },
swap(id) {
const h = this.get(id);
if (!h || !h.unlocked || id === this.active) return false;
this.active = id;
Bus.emit('heroSwapped', { id });
return true;
},
gainXp(h, v) {
if (!h || !h.unlocked || v <= 0) return;
h.xp += v;
let need = xpNeed(h.level), gained = 0;
while (h.xp >= need) { h.xp -= need; h.level++; need = xpNeed(h.level); gained++; }
if (gained > 0) Bus.emit('heroLevel', { hero: h, levels: gained });
const rec = Legacy.getRecord(h.def.id);
if (h.level > rec) {
for (let i = 0; i < h.level - rec; i++) Legacy.grantNode(h.def.id);
Legacy.setRecord(h.def.id, h.level);
Bus.emit('toast', { msg: t('legacy.toast').replace('{h}', tr(h.def.name)) });
}
},
serialize() {
const o = { __active: this.active };
for (const h of this.list) o[h.def.id] = { level: h.level, xp: h.xp, rank: h.rank, unlocked: h.unlocked, dupes: h.dupes };
return o;
}
};

export function deriveStats(h) {
const d = h.def, w = d.weapon, t = Trees.get(d.id).stats();
const rb = Rebirth.getBonuses();
const rankMul = 1 + 0.10 * h.rank;
const G = Global.calc();
const s = {};
s.maxHp = 100 * d.stats.health * rankMul * (1 + (t.hp || 0) / 100) * (t.hpMul || 1) * G.hp * (1 + (rb.hp || 0) / 100);
s.dmg = (w.dmg * d.stats.damage * rankMul + (t.dmgFlat || 0)) * (1 + (t.dmg || 0) / 100) * (t.dmgMul || 1) * G.dmg * (1 + (rb.dmg || 0) / 100) * Shop.heroDmgMul(d.id) * Shop.globalDmgMul();
s.atkSpd = d.stats.fireRate * (1 + (t.atk || 0) / 100) * (1 + (rb.atk || 0) / 100);
s.interval = w.interval / s.atkSpd;
s.speed = 1 * d.stats.speed * (1 + (t.speed || 0) / 100);
s.crit = clamp(d.crit + (t.crit || 0), 0, 80);
s.critDmg = d.critDmg + (t.critdmg || 0) + 2 * LevelUps.lv('critdmg');
s.range = w.range * (1 + (t.range || 0) / 100);
s.projSpeed = BAL.bulletSpeed * w.spd * (1 + (t.pspd || 0) / 100);
s.size = 1 + (t.size || 0) / 100;
s.projCount = 1 + Math.floor(t.proj || 0);
s.pierce = Math.floor(t.pierce || 0);
s.bounce = Math.floor(t.bounce || 0);
s.explodeChance = t.explodeChance || 0;
s.explodeRadius = 55 * (1 + (t.explodeRadius || 0) / 100);
s.explodeDmg = 60 + (t.explodeDmg || 0);
s.critexplode = t.critexplode || 0;
s.burnChance = t.burnChance || 0; s.burnDmg = t.burnDmg || 0;
s.frostChance = t.frostChance || 0; s.frostPower = t.frostPower || 0;
s.shockChance = t.shockChance || 0; s.shockCount = t.shockCount || 0; s.shockDmg = t.shockDmg || 0;
s.poisonChance = t.poisonChance || 0; s.poisonDmg = t.poisonDmg || 0;
s.life = t.life || 0; s.thorns = t.thorns || 0;
s.shield = t.shield || 0; s.regen = t.regen || 0;
s.dodge = (d.id === 'ghost' ? 20 : 0) + (t.dodge || 0);
s.curMul = (1 + (t.cur || 0) / 100) * (t.curMul || 1) * G.cur * (1 + (rb.cur || 0) / 100) * Shop.globalLootMul();
s.xpMul = (1 + (t.xp || 0) / 100) * (t.xpMul || 1) * G.xp * (1 + (rb.xp || 0) / 100) * Shop.heroXpMul(d.id) * Shop.globalXpMul();
s.luck = (t.luck || 0) + G.luck + (rb.luck || 0);
s.passive = t.passive || 0;
s.drone = Math.floor(t.drone || 0) + Shop.startDrones(d.id);
s.droneDmg = t.droneDmg || 0;
s.auraDmg = t.auraDmg || 0; s.auraRadius = 95 * (1 + (t.auraRadius || 0) / 100);
s.autoBuy = Math.floor(t.autoBuy || 0);
s.bossDmg = (t.bossDmg || 0) + 1 * LevelUps.lv('bossDmg') + (rb.bossDmg || 0);
s.eliteDmg = (t.eliteDmg || 0) + (rb.eliteDmg || 0);
s.vs = {
circle: (t.vsCircle || 0) + (rb.vsCircle || 0),
triangle: (t.vsTriangle || 0) + (rb.vsTriangle || 0),
square: (t.vsSquare || 0) + (rb.vsSquare || 0),
hexagon: (t.vsHexagon || 0) + (rb.vsHexagon || 0),
pentagon: (t.vsPentagon || 0) + (rb.vsPentagon || 0),
purple: (t.vsPurple || 0) + (rb.vsPurple || 0)
};
s.distKill = t.distKill || 0;
s.headStart = (t.headStart || 0) + 10 * LevelUps.lv('headStart');
s.armor = t.armor || 0;
s.berserk = (t.berserk || 0) / 100;
s.overheal = (t.overheal || 0) / 100;
s.overhealCap = (t.overhealCap || 0) / 100;
s.critchain = Math.floor(t.critchain || 0);
s.vsDef = { circle: t.vdCircle || 0, triangle: t.vdTriangle || 0, square: t.vdSquare || 0,
hexagon: t.vdHexagon || 0, pentagon: t.vdPentagon || 0, purple: t.vdPurple || 0 };
s.markChance = t.markChance || 0;
s.markDmg = t.markDmg || 0;
s.chrono = t.chrono || 0;
s.doubleLoot = { circle: t.dlCircle || 0, triangle: t.dlTriangle || 0, square: t.dlSquare || 0,
hexagon: t.dlHexagon || 0, pentagon: t.dlPentagon || 0, purple: t.dlPurple || 0 };
s.curByType = {
CIR: rb.curCIR || 0, TRI: rb.curTRI || 0, CUA: rb.curCUA || 0,
HEX: rb.curHEX || 0, PEN: rb.curPEN || 0, PUR: rb.curPUR || 0
};

// ---- Bonos del ÁRBOL DEL LEGADO ----
const lb = Legacy.getBonuses(d.id);
if (lb.dmg)  s.dmg *= 1 + lb.dmg / 100;
if (lb.hp)   s.maxHp *= 1 + lb.hp / 100;
if (lb.atk)  { s.atkSpd *= 1 + lb.atk / 100; s.interval = w.interval / s.atkSpd; }
if (lb.cur)  s.curMul *= 1 + lb.cur / 100;
if (lb.xp)   s.xpMul *= 1 + lb.xp / 100;
if (lb.crit) s.crit = clamp(s.crit + lb.crit, 0, 80);
if (lb.critdmg) s.critDmg += lb.critdmg;
if (lb.bossDmg) s.bossDmg += lb.bossDmg;
if (lb.eliteDmg) s.eliteDmg += lb.eliteDmg;
if (lb.luck) s.luck += lb.luck;
if (lb.armor) s.armor += lb.armor;
if (lb.speed) s.speed *= 1 + lb.speed / 100;
if (lb.range) s.range *= 1 + lb.range / 100;
if (lb.dodge) s.dodge += lb.dodge;
if (lb.life) s.life += lb.life;
if (lb.regen) s.regen += lb.regen;
if (lb.shield) s.shield += lb.shield;
if (lb.pierce) s.pierce += Math.floor(lb.pierce);
if (lb.proj) s.projCount += Math.floor(lb.proj);

// ---- MODIFICADORES (GACHA) ----
const mf = Modifiers.getEffects(d.id);
if (mf.dmg)       s.dmg *= 1 + mf.dmg / 100;
if (mf.hp)        s.maxHp *= 1 + mf.hp / 100;
if (mf.atk)       { s.atkSpd *= 1 + mf.atk / 100; s.interval = w.interval / s.atkSpd; }
if (mf.speed)     s.speed *= 1 + mf.speed / 100;
if (mf.range)     s.range *= 1 + mf.range / 100;
if (mf.crit)      s.crit = clamp(s.crit + mf.crit, 0, 80);
if (mf.critdmg)   s.critDmg += mf.critdmg;
if (mf.xp)        s.xpMul *= 1 + mf.xp / 100;
if (mf.cur)       s.curMul *= 1 + mf.cur / 100;
if (mf.luck)      s.luck += mf.luck;
if (mf.armor)     s.armor += mf.armor;
if (mf.dodge)     s.dodge += mf.dodge;
if (mf.life)      s.life += mf.life;
if (mf.regen)     s.regen += mf.regen;
if (mf.shield)    s.shield += mf.shield;
if (mf.pierce)    s.pierce += Math.floor(mf.pierce);
if (mf.proj)      s.projCount += Math.floor(mf.proj);
if (mf.bossDmg)   s.bossDmg += mf.bossDmg;
if (mf.eliteDmg)  s.eliteDmg += mf.eliteDmg;
if (mf.drones)    s.drone += Math.floor(mf.drones);
if (mf.droneDmg)  s.droneDmg += mf.droneDmg;
if (mf.berserk)   s.berserk += mf.berserk / 100;
if (mf.chaos)     s.chaos = mf.chaos;
if (mf.vsCircle)   s.vs.circle += mf.vsCircle;
if (mf.vsTriangle) s.vs.triangle += mf.vsTriangle;
if (mf.vsSquare)   s.vs.square += mf.vsSquare;
if (mf.vsHexagon)  s.vs.hexagon += mf.vsHexagon;
if (mf.vsPentagon) s.vs.pentagon += mf.vsPentagon;
if (mf.vsPurple)   s.vs.purple += mf.vsPurple;
if (mf.recCircle)   s.vsDef.circle += mf.recCircle;
if (mf.recTriangle) s.vsDef.triangle += mf.recTriangle;
if (mf.recSquare)   s.vsDef.square += mf.recSquare;
if (mf.recHexagon)  s.vsDef.hexagon += mf.recHexagon;
if (mf.recPentagon) s.vsDef.pentagon += mf.recPentagon;
if (mf.recPurple)   s.vsDef.purple += mf.recPurple;
if (mf.curCIR) s.curByType.CIR += mf.curCIR;
if (mf.curTRI) s.curByType.TRI += mf.curTRI;
if (mf.curCUA) s.curByType.CUA += mf.curCUA;
if (mf.curHEX) s.curByType.HEX += mf.curHEX;
if (mf.curPEN) s.curByType.PEN += mf.curPEN;
if (mf.curPUR) s.curByType.PUR += mf.curPUR;

localizeHeroes();
Bus.on('langChanged', () => localizeHeroes());
return s;
}