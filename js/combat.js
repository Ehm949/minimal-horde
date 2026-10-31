import { Heroes, deriveStats } from './heroes.js';
import { World } from './world.js';
import { Boss } from './boss.js';
import { makeEnemy } from './enemies.js';
import { Loot } from './loot.js';
import { FX } from './effects.js';
import { Bus } from './events.js';
import { Audio } from './audio.js';
import { BAL } from './config.js';
import { clamp, dist, dist2, rand } from './utils.js';
import { Resources } from './resources.js';
import { Settings } from './settings.js';
import { Input } from './input.js';
import { t } from './localization.js';
import { registerSpawnWarning, clearSpawnWarnings, updateSpawnWarnings } from './spawnWarnings.js';
import { Cosmetics } from './cosmetics.js';

const T = Math.PI * 2;

export const Combat = {
W: 800, H: 600, time: 0,
hero: null, enemies: [], projs: [], ebullets: [],
orbs: [], drones: [],
stats: null, statT: 0, reviveT: 0, invuln: 0,
hurtGlow: 0,
beam: null, burst: null, dragging: false,
anchor: null, anchorT: 0,
moveTarget: null,

init() {
this.hero = { x: 0, y: 0, vx: 0, vy: 0, hp: 1, shield: 0, aim: 0, lastHit: -99, radius: 16 };
this.anchor = null; this.anchorT = 0;
this.resize(this.W, this.H);
this.refreshStats();
this.hero.hp = this.stats.maxHp;
['nodeBought','heroLevel','forgeUp','achUnlocked','heroSwapped']
.forEach(e => Bus.on(e, () => this.refreshStats()));
},

resize(w, h) { this.W = w; this.H = h; this.hero.x = w * 0.32; this.hero.y = h * 0.5; },
worldDist() { return World.dist; },
activeDef() { return Heroes.activeHero().def; },

refreshStats() {
this.stats = deriveStats(Heroes.activeHero());
this.statT = 0;
this.hero.hp = Math.min(this.hero.hp, this.stats.maxHp);
},

gainXp(v) { Heroes.gainXp(Heroes.activeHero(), v); },

swapHero() {
this.refreshStats();
this.hero.hp = this.stats.maxHp;
this.hero.shield = 0;
this.moveTarget = null;
this.projs.length = 0; this.ebullets.length = 0;
this.beam = null; this.burst = null; this.orbs = [];
World.resetRun();
this.enemies.length = 0;
clearSpawnWarnings();
this.reviveT = 0;
this.invuln = 0;
FX.ring(this.hero.x, this.hero.y, '#000', 90);
Audio.swap();
},

warnEdge(p) {
const color = p.type === 'purple' ? 'purple'
: (p.type === 'golden' ? 'golden'
: (p.type === 'pink' ? 'pink' : 'red'));
registerSpawnWarning(p.edge, p.pos, color);
},

addEnemy(type, x, y, elite) {
const e = makeEnemy(World.dist, type, x, y, { elite });
this.enemies.push(e); return e;
},

nearest(x, y, maxR) {
let best = null, bd = maxR * maxR;
for (const e of this.enemies) { const d = dist2(x, y, e.x, e.y); if (d < bd) { bd = d; best = e; } }
return best;
},

pickTarget() {
const st = this.stats;
const boss = World.boss;
if (boss && !boss.dead && !boss.spawning) {
if (dist(this.hero.x, this.hero.y, boss.x, boss.y) <= st.range + boss.radius) return boss;
}
return this.nearest(this.hero.x, this.hero.y, st.range);
},

moveHero(dt) {
if (this.reviveT > 0) return;
const h = this.hero, st = this.stats;
const ax = Input.axis();
if (ax.x !== 0 || ax.y !== 0) {
this.moveTarget = null;
const len = Math.hypot(ax.x, ax.y);
const maxSpd = 160 * st.speed;
h.vx += ((ax.x / len) * maxSpd - h.vx) * Math.min(1, dt * 8);
h.vy += ((ax.y / len) * maxSpd - h.vy) * Math.min(1, dt * 8);
h.x = clamp(h.x + h.vx * dt, 30, this.W - 30);
h.y = clamp(h.y + h.vy * dt, 30, this.H - 30);
this.anchorT = 1.5;
return;
}
if (this.moveTarget) {
const dx = this.moveTarget.x - h.x;
const dy = this.moveTarget.y - h.y;
const d = Math.hypot(dx, dy);
if (d < 12) {
this.moveTarget = null;
h.vx *= 0.8; h.vy *= 0.8;
} else {
const maxSpd = 160 * st.speed;
h.vx += ((dx / d) * maxSpd - h.vx) * Math.min(1, dt * 8);
h.vy += ((dy / d) * maxSpd - h.vy) * Math.min(1, dt * 8);
h.x = clamp(h.x + h.vx * dt, 30, this.W - 30);
h.y = clamp(h.y + h.vy * dt, 30, this.H - 30);
}
this.anchorT = 1.5;
return;
}
const kind = this.activeDef().weapon.kind;
const melee = kind === 'flame' || kind === 'pulse' || kind === 'area' || kind === 'orbital' || st.range < 150;
const avoidR = clamp(st.range * 0.6, 40, 140);
let dx = 0, dy = 0;
const boss = World.boss;
if (boss && !boss.dead && !boss.spawning) {
const bd = Math.max(1, dist(h.x, h.y, boss.x, boss.y));
const keepMax = Math.max(60, st.range * 0.9);
const keep = clamp(st.range * 0.7, 40, keepMax);
if (bd < keep) {
const f = (keep - bd) / keep;
dx += (h.x - boss.x) / bd * f * 420;
dy += (h.y - boss.y) / bd * f * 420;
} else if (bd > keepMax) {
const f = Math.min(1, (bd - keepMax) / 240);
dx += (boss.x - h.x) / bd * f * 320;
dy += (boss.y - h.y) / bd * f * 320;
}
dx += -(boss.y - h.y) / bd * 50;
dy += (boss.x - h.x) / bd * 50;
} else if (melee) {
const near = this.nearest(h.x, h.y, 2000);
if (near) {
const d = Math.max(1, dist(h.x, h.y, near.x, near.y));
if (d > avoidR) {
dx += (near.x - h.x) / d * 240;
dy += (near.y - h.y) / d * 240;
}
} else {
this.anchorT -= dt;
if (!this.anchor || this.anchorT <= 0) {
this.anchor = { x: rand(this.W * 0.15, this.W * 0.8), y: rand(this.H * 0.18, this.H * 0.82) };
this.anchorT = rand(2.5, 5);
}
dx = this.anchor.x - h.x;
dy = this.anchor.y - h.y;
}
} else {
this.anchorT -= dt;
if (!this.anchor || this.anchorT <= 0) {
this.anchor = { x: rand(this.W * 0.15, this.W * 0.8), y: rand(this.H * 0.18, this.H * 0.82) };
this.anchorT = rand(2.5, 5);
}
dx = this.anchor.x - h.x;
dy = this.anchor.y - h.y;
}
for (const e of this.enemies) {
if (e.boss) continue;
const rr = avoidR + e.radius, d2 = dist2(h.x, h.y, e.x, e.y);
if (d2 < rr * rr && d2 > 1) {
const d = Math.sqrt(d2), f = (rr - d) / rr;
dx += (h.x - e.x) / d * f * 300;
dy += (h.y - e.y) / d * f * 300;
}
}
for (const b of this.ebullets) {
const rr = 90, d2 = dist2(h.x, h.y, b.x, b.y);
if (d2 < rr * rr && d2 > 1) {
const d = Math.sqrt(d2), f = (rr - d) / rr;
dx += (h.x - b.x) / d * f * 220;
dy += (h.y - b.y) / d * f * 220;
}
}
const len = Math.hypot(dx, dy);
if (len > 1) {
const maxSpd = 120 * st.speed;
const step = Math.min(maxSpd, len * 2);
h.vx += ((dx / len) * step - h.vx) * Math.min(1, dt * 4);
h.vy += ((dy / len) * step - h.vy) * Math.min(1, dt * 4);
h.x = clamp(h.x + h.vx * dt, 30, this.W - 30);
h.y = clamp(h.y + h.vy * dt, 30, this.H - 30);
}
},

hitEnemy(e, dmg, opts = {}) {
if (e.boss && (e.spawning || this.time < e.invulnT)) return false;
const st = this.stats;
let m = 1;
if (e.boss) m *= 1 + st.bossDmg / 100;
if (e.elite) m *= 1 + st.eliteDmg / 100;
if (st.vs && st.vs[e.type]) m *= 1 + st.vs[e.type] / 100;
if (e.markT > 0) m *= 1 + st.markDmg / 100;
dmg *= m;
dmg *= 1 + st.berserk * (1 - clamp(this.hero.hp / st.maxHp, 0, 1));
// AURA ROSA: enemigos buffados hacen +10% de daño al héroe (se aplica en damageHero)
let crit = false;
if (!opts.noCrit && Math.random() * 100 < st.crit) { crit = true; dmg *= st.critDmg / 100; }
e.hp -= dmg; e.flash = 0.09;
if (Settings.s.dmgNumbers)
FX.text(e.x, e.y - e.radius - 4, crit ? Math.round(dmg) + '!' : String(Math.round(dmg)),
crit ? '#E53935' : '#000', crit ? 15 : 11);
if (crit) {
Audio.crit();
if (st.critexplode > 0) this.explode(e.x, e.y, st.explodeRadius, dmg * st.critexplode / 100, e);
if (st.critchain > 0) {
let src = e, n = st.critchain, sd = dmg * 0.4;
const hit = new Set([e.uid]);
for (let i = 0; i < n; i++) {
let best = null, bd = 150 * 150;
for (const o of this.enemies) {
if (hit.has(o.uid) || o.hp <= 0) continue;
const d = dist2(src.x, src.y, o.x, o.y);
if (d < bd) { bd = d; best = o; }
}
if (!best) break;
FX.zap(src.x, src.y, best.x, best.y);
this.hitEnemy(best, sd, { noCrit: true, noProc: true });
hit.add(best.uid); src = best; sd *= 0.6;
}
}
}
if (st.life > 0 && this.reviveT <= 0) {
const heal = dmg * st.life / 100;
const room = st.maxHp - this.hero.hp;
if (heal > room && st.overheal > 0) {
this.hero.hp = st.maxHp;
const cap = st.maxHp * (st.shield / 100 + st.overhealCap);
this.hero.shield = Math.min(cap, this.hero.shield + (heal - room) * st.overheal);
} else {
this.hero.hp = Math.min(st.maxHp, this.hero.hp + heal);
}
}
if (!opts.noProc) this.applyProcs(e, dmg);
if (!opts.noProc && st.markChance > 0 && e.hp > 0 && Math.random() * 100 < st.markChance) e.markT = 3;
if (opts.impact && st.explodeChance > 0 && Math.random() * 100 < st.explodeChance)
this.explode(e.x, e.y, st.explodeRadius, dmg * st.explodeDmg / 100, e);
if (e.hp <= 0) this.killEnemy(e);
return crit;
},

applyProcs(e, dmg) {
const st = this.stats;
if (st.burnChance && Math.random() * 100 < st.burnChance) { e.burn = { dps: st.dmg * st.burnDmg / 100, t: 3 }; FX.status(e.x, e.y, 'burn'); }
if (st.frostChance && Math.random() * 100 < st.frostChance) { e.slow = Math.min(0.8, 0.25 + st.frostPower / 100); e.slowT = 1.6; FX.status(e.x, e.y, 'frost'); }
if (st.poisonChance && Math.random() * 100 < st.poisonChance) { e.poison = Math.min(10, e.poison + 1); e.poisonT = 4; FX.status(e.x, e.y, 'poison'); }
if (st.shockChance && Math.random() * 100 < st.shockChance) {
let jumps = 1 + Math.floor(st.shockCount), src = e, sd = dmg * (0.2 + st.shockDmg / 100);
const hitSet = new Set([e.uid]);
for (let i = 0; i < jumps; i++) {
let best = null, bd = 130 * 130;
for (const o of this.enemies) {
if (hitSet.has(o.uid) || o.hp <= 0) continue;
const d = dist2(src.x, src.y, o.x, o.y);
if (d < bd) { bd = d; best = o; }
}
if (!best) break;
FX.zap(src.x, src.y, best.x, best.y);
this.hitEnemy(best, sd, { noCrit: true, noProc: true });
hitSet.add(best.uid); src = best; sd *= 0.7;
}
}
},

explode(x, y, r, dmg, src) {
FX.ring(x, y, '#E53935', r); Audio.boom(); FX.shake(2);
for (const e of this.enemies) {
if (e.hp <= 0 || e === src) continue;
if (dist2(x, y, e.x, e.y) < (r + e.radius) ** 2) this.hitEnemy(e, dmg, { noCrit: true });
}
},

killEnemy(e) {
if (e.dead) return;
e.dead = true;
FX.burst(e.x, e.y, e.boss ? '#000' : (e.color === 'purple' ? '#9C27B0' : (e.color === 'golden' ? '#FFD700' : (e.color === 'pink' ? '#FF69B4' : '#E53935'))),
e.boss ? 40 : (e.elite ? 24 : 10), e.boss ? 300 : (e.elite ? 240 : 150), e.boss ? 7 : (e.elite ? 5.5 : 3.5));
Audio.hit();
Loot.dropFor(this, e);
World.onKill(e, this.stats.distKill || 0);
},

damageHero(dmg, enemyType) {
if (this.invuln > 0 || this.reviveT > 0) return;
const h = this.hero, st = this.stats;
if (Math.random() * 100 < st.dodge) { FX.text(h.x, h.y - 26, t('combat.dodge'), '#000', 11); return; }
if (enemyType && st.vsDef && st.vsDef[enemyType]) dmg *= 1 - clamp(st.vsDef[enemyType] / 100, 0, 0.8);
this.hurtGlow = Math.min(1, this.hurtGlow + Math.max(0.4, (dmg / st.maxHp) * 2.5));
dmg *= 1 - clamp(st.armor / 100, 0, 0.5);
h.lastHit = this.time;
if (h.shield > 0) { const s = Math.min(h.shield, dmg); h.shield -= s; dmg -= s; }
h.hp -= dmg;
FX.shake(1.5);
Bus.emit('heroHurt', {});
if (h.hp <= 0) {
h.hp = 0; this.reviveT = BAL.reviveTime;
FX.burst(h.x, h.y, '#000', 26, 240, 4);
Audio.boom();
this.resetRun();
}
},

resetRun() {
this.moveTarget = null;
World.resetRun();
this.enemies.length = 0;
this.projs.length = 0;
this.ebullets.length = 0;
clearSpawnWarnings();
FX.ring(this.hero.x, this.hero.y, '#E53935', 140);
Bus.emit('toast', { msg: t('toast.fallen') });
},

fireWeapon() {
const st = this.stats, w = this.activeDef().weapon, h = this.hero;
const target = this.pickTarget();
const sndId = Cosmetics.getSound(Heroes.active);
switch (w.kind) {
case 'bullet':
if (!target) return 0.12;
this.aimAt(target);
for (let i = 0; i < st.projCount; i++) this.shoot(h.aim + (i - (st.projCount - 1) / 2) * 0.08, st.dmg, {});
Audio.shootCustom(sndId); return st.interval;
case 'burst':
if (!target) return 0.12;
this.aimAt(target);
this.burst = { n: 2 + st.projCount, t: 0 };
Audio.shootCustom(sndId); return st.interval;
case 'shotgun': {
if (!target) return 0.12;
this.aimAt(target);
const pellets = 5 + (st.projCount - 1) * 2;
const totalSpread = 1.6, step = totalSpread / (pellets - 1);
for (let i = 0; i < pellets; i++) this.shoot(h.aim - totalSpread / 2 + i * step, st.dmg, { size: 4 });
Audio.shootCustom(sndId); return st.interval;
}
case 'mg':
if (!target) return 0.12;
this.aimAt(target);
this.shoot(h.aim + rand(-0.1, 0.1), st.dmg, { size: 3 });
Audio.shootCustom(sndId); return st.interval;
case 'sniper': {
if (!target) return 0.15;
this.aimAt(target);
const crit = Math.random() * 100 < st.crit;
this.shoot(h.aim, crit ? st.dmg * st.critDmg / 100 : st.dmg, { size: 6, pierce: 999, spdMul: 2, red: crit, noCrit: true });
if (crit) Audio.crit(); else Audio.shootCustom(sndId);
return st.interval;
}
case 'laser': return 0.1;
case 'flame': {
if (!target) return 0.08;
this.aimAt(target);
const flames = 3 + (st.projCount - 1);
for (let i = 0; i < flames; i++) this.shoot(h.aim + rand(-0.3, 0.3), st.dmg, { size: 6, life: st.range / st.projSpeed, spdMul: rand(0.8, 1.2), flame: true });
return st.interval;
}
case 'missile':
if (!target) return 0.12;
for (let i = 0; i < st.projCount; i++) this.shoot(h.aim + (i - (st.projCount - 1) / 2) * 0.25, st.dmg, { size: 7, homing: true, spdMul: 0.7, life: 3 });
Audio.shootCustom(sndId); return st.interval;
case 'orbital': return 0.3;
case 'ricochet':
if (!target) return 0.12;
this.aimAt(target);
for (let i = 0; i < st.projCount; i++) this.shoot(h.aim + (i - (st.projCount - 1) / 2) * 0.1, st.dmg, { size: 5, ricochet: 2 + st.bounce, pierce: 100, spdMul: 1.1, life: 2.5 });
Audio.shootCustom(sndId); return st.interval;
case 'chakram':
if (!target) return 0.12;
this.aimAt(target);
for (let i = 0; i < st.projCount; i++) this.shoot(h.aim + (i - (st.projCount - 1) / 2) * 0.18, st.dmg, { size: 8, chakram: true, maxDist: st.range, spdMul: 0.9 });
Audio.shootCustom(sndId); return st.interval;
case 'metralla':
if (!target) return 0.12;
this.aimAt(target);
this.shoot(h.aim, st.dmg, { size: 10, spray: true, pierce: 999, life: 1.4, spdMul: 0.85 });
Audio.shootCustom(sndId); return st.interval;
case 'fragment':
if (!target) return 0.12;
this.aimAt(target);
this.shoot(h.aim, st.dmg, { size: 6, fragile: true });
Audio.shootCustom(sndId); return st.interval;
case 'sentry':
if (!target) return 0.12;
this.aimAt(target);
for (let i = 0; i < st.projCount; i++) this.shoot(h.aim + (i - (st.projCount - 1) / 2) * 0.18, st.dmg, { size: 5 });
Audio.shootCustom(sndId); return st.interval;
case 'graviton':
if (!target) return 0.12;
this.aimAt(target);
for (let i = 0; i < st.projCount; i++) this.shoot(h.aim + (i - (st.projCount - 1) / 2) * 0.25, st.dmg, { size: 6, gravity: true, travelDist: clamp(dist(h.x, h.y, target.x, target.y), 120, 500), pierce: 999, life: 4 });
Audio.shootCustom(sndId); return st.interval;
case 'pulse': {
let any = false;
for (const e of this.enemies) if (dist2(h.x, h.y, e.x, e.y) < (st.range * 2 + e.radius) ** 2) { any = true; break; }
if (!any) return 0.15;
this.projs.push({ kind: 'ring', x: h.x, y: h.y, radius: 12, maxRadius: st.range * 2, ringSpeed: 220 * (1 + st.pspd / 100), dmg: st.dmg, hitSet: new Set(), life: 2 });
Audio.boom(); return st.interval;
}
case 'area': {
const areaRadius = (st.size * st.range) / 2;
for (const e of this.enemies) {
if (dist2(h.x, h.y, e.x, e.y) < (areaRadius + e.radius) ** 2) {
this.hitEnemy(e, st.dmg, { impact: false });
}
}
return st.interval;
}
}
return 0.2;
},

aimAt(tg) { this.hero.aim = Math.atan2(tg.y - this.hero.y, tg.x - this.hero.x); },

shoot(ang, dmg, o = {}) {
const st = this.stats, h = this.hero, spd = st.projSpeed * (o.spdMul || 1);
this.projs.push({
kind: o.chakram ? 'chakram' : o.gravity ? 'graviton' : o.homing ? 'missile' : 'bullet',
x: h.x + Math.cos(ang) * 18, y: h.y + Math.sin(ang) * 18,
vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
dmg, size: (o.size || 5) * st.size,
pierce: (o.pierce ?? st.pierce), ricochet: o.ricochet || 0,
life: o.life ?? (st.range / spd) * 1.4,
hitSet: new Set(), homing: o.homing, flame: o.flame, red: o.red,
noCrit: o.noCrit, spray: o.spray, sprayT: 0, fragile: o.fragile,
chakram: o.chakram, returning: false, traveled: 0, maxDist: o.maxDist || 0,
gravity: o.gravity, phase: o.gravity ? 'travel' : null,
travelDist: o.travelDist || 0, orbitA: 0, impact: true
});
},

update(dt) {
this.time += dt;
this.statT += dt;
this.hurtGlow = Math.max(0, this.hurtGlow - dt * 1.6);
if (this.statT > 0.3) this.refreshStats();
const h = this.hero, st = this.stats, kind = this.activeDef().weapon.kind;
World.update(dt, this, st.speed);
this.moveHero(dt);
if (World.boss && !World.boss.dead) Boss.update(this, World.boss, dt);
if (this.reviveT > 0) {
this.reviveT -= dt;
if (this.reviveT <= 0) {
h.hp = st.maxHp; this.invuln = 2;
if (st.headStart > 0) { World.dist += st.headStart; FX.text(h.x, h.y - 34, `+${Math.round(st.headStart)} m`, '#000', 11); }
FX.ring(h.x, h.y, '#000', 70);
}
} else {
const face = (World.boss && !World.boss.dead) ? World.boss : this.nearest(h.x, h.y, Infinity);
if (face) h.aim = Math.atan2(face.y - h.y, face.x - h.x);
this.invuln = Math.max(0, this.invuln - dt);
if (st.regen > 0) h.hp = Math.min(st.maxHp, h.hp + st.maxHp * st.regen / 100 * dt);
const shMax = st.maxHp * st.shield / 100;
if (shMax > 0 && this.time - h.lastHit > 4) h.shield = Math.min(shMax, h.shield + shMax / 3 * dt);
if (st.passive > 0) Resources.add('CIR', st.passive * (1 + World.dist / 500) * dt * st.curMul);
if (st.auraDmg > 0) this.auraTick(dt, st);
h.cd = (h.cd || 0) - dt;
if (kind === 'laser') this.laserTick(dt, st);
else if (h.cd <= 0) h.cd = this.fireWeapon();
if (this.burst) {
this.burst.t -= dt;
if (this.burst.t <= 0) { this.burst.t = 0.08; this.shoot(h.aim, st.dmg, { size: 4 }); Audio.shoot(); if (--this.burst.n <= 0) this.burst = null; }
}
if (kind === 'orbital') this.orbTick(dt, st);
this.droneTick(dt, st);
}
this.updateProjectiles(dt, st);
this.updateEnemies(dt, st);
this.updateEBullets(dt, st);
updateSpawnWarnings();
this.enemies = this.enemies.filter(e => !e.dead);
},

auraTick(dt, st) {
const h = this.hero;
for (const e of this.enemies)
if (dist2(h.x, h.y, e.x, e.y) < (st.auraRadius + e.radius) ** 2)
this.hitEnemy(e, st.dmg * st.auraDmg / 100 * dt * 3, { noCrit: true, noProc: true });
},

laserTick(dt, st) {
const h = this.hero;
const tg = this.pickTarget();
if (!tg) { this.beam = null; return; }
const want = Math.atan2(tg.y - h.y, tg.x - h.x);
let da = want - (this.beam ? this.beam.a : want);
while (da > Math.PI) da -= T; while (da < -Math.PI) da += T;
const a = (this.beam ? this.beam.a : want) + da * Math.min(1, dt * 10);
const x2 = h.x + Math.cos(a) * st.range, y2 = h.y + Math.sin(a) * st.range;
this.beam = { a, x2, y2, w: 6 * st.size };
const dps = st.dmg * 10;
for (const e of this.enemies)
if (segDist(h.x, h.y, x2, y2, e.x, e.y) < e.radius + this.beam.w)
this.hitEnemy(e, dps * dt, { noCrit: Math.random() > dt * 2, impact: true });
if (Math.random() < dt * 6) Audio.laser();
},

orbTick(dt, st) {
const h = this.hero, count = 3 + Math.floor(st.proj || 0);
while (this.orbs.length < count) this.orbs.push({ a: this.orbs.length * 2.1, cd: 0 });
while (this.orbs.length > count) this.orbs.pop();
const orbR = 70 * (1 + (st.range - 60) / 240);
for (const o of this.orbs) {
o.a += dt * 2.4; o.cd -= dt;
o.x = h.x + Math.cos(o.a) * orbR; o.y = h.y + Math.sin(o.a) * orbR;
if (o.cd <= 0) {
for (const e of this.enemies) {
if (dist2(o.x, o.y, e.x, e.y) < (10 + e.radius) ** 2) { this.hitEnemy(e, st.dmg, { impact: false }); o.cd = 0.35; break; }
}
}
}
},

droneTick(dt, st) {
const h = this.hero;
while (this.drones.length < st.drone) this.drones.push({ a: this.drones.length * 2, cd: 0 });
while (this.drones.length > st.drone) this.drones.pop();
for (const d of this.drones) {
d.a += dt * 2.2; d.cd -= dt;
d.x = h.x + Math.cos(d.a) * 46; d.y = h.y + Math.sin(d.a) * 46;
if (d.cd <= 0) {
const tg = this.nearest(d.x, d.y, 280);
if (tg) {
const a = Math.atan2(tg.y - d.y, tg.x - d.x);
this.projs.push({ kind: 'bullet', x: d.x, y: d.y, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420,
dmg: st.dmg * 0.25 * (1 + st.droneDmg / 100), size: 3, pierce: 0, ricochet: 0, life: 0.9, hitSet: new Set(), impact: true });
d.cd = 0.8;
}
}
}
},

updateProjectiles(dt, st) {
const h = this.hero;
for (let i = this.projs.length - 1; i >= 0; i--) {
const p = this.projs[i];
if (!p) break;
p.life -= dt;
if (p.kind === 'ring') {
p.radius += p.ringSpeed * dt;
for (const e of this.enemies) {
if (p.hitSet.has(e.uid)) continue;
if (Math.abs(dist(p.x, p.y, e.x, e.y) - p.radius) < 20 + e.radius) { p.hitSet.add(e.uid); this.hitEnemy(e, p.dmg, {}); }
}
if (p.radius >= p.maxRadius) this.projs.splice(i, 1);
continue;
}
if (p.spray) {
p.sprayT -= dt;
if (p.sprayT <= 0) {
p.sprayT = 0.15;
for (let s = 0; s < 2 + (st.projCount - 1); s++) {
const a = rand(0, T);
this.projs.push({ kind: 'bullet', x: p.x, y: p.y, vx: Math.cos(a) * 320, vy: Math.sin(a) * 320, dmg: p.dmg * 0.25, size: 2.5, pierce: 0, ricochet: 0, life: 0.5, hitSet: new Set(), impact: true });
}
}
}
if (p.homing) {
const tg = this.nearest(p.x, p.y, 500);
if (tg) {
const want = Math.atan2(tg.y - p.y, tg.x - p.x), cur = Math.atan2(p.vy, p.vx);
let da = want - cur; while (da > Math.PI) da -= T; while (da < -Math.PI) da += T;
const spd = Math.hypot(p.vx, p.vy), na = cur + clamp(da, -4 * dt, 4 * dt);
p.vx = Math.cos(na) * spd; p.vy = Math.sin(na) * spd;
}
}
if (p.kind === 'chakram') {
p.traveled += Math.hypot(p.vx, p.vy) * dt;
if (!p.returning && p.traveled > p.maxDist) p.returning = true;
if (p.returning) {
const a = Math.atan2(h.y - p.y, h.x - p.x), spd = Math.hypot(p.vx, p.vy) * 1.04;
p.vx = Math.cos(a) * spd; p.vy = Math.sin(a) * spd;
if (dist2(p.x, p.y, h.x, h.y) < 400) { this.projs.splice(i, 1); continue; }
}
}
if (p.kind === 'graviton') {
for (const e of this.enemies) {
const d2 = dist2(p.x, p.y, e.x, e.y);
if (d2 < 150 * 150 && d2 > 100) { const d = Math.sqrt(d2), f = 80 * dt / d; e.x -= (e.x - p.x) * f; e.y -= (e.y - p.y) * f; }
}
}
if (p.kind !== 'graviton' || p.phase === 'travel') { p.x += p.vx * dt; p.y += p.vy * dt; }
if (p.ricochet > 0) {
let bounced = false;
if (p.x < 0 || p.x > this.W) { p.vx *= -1; p.x = clamp(p.x, 0, this.W); bounced = true; }
if (p.y < 0 || p.y > this.H) { p.vy *= -1; p.y = clamp(p.y, 0, this.H); bounced = true; }
if (bounced) { p.ricochet--; p.dmg *= 1.25; FX.burst(p.x, p.y, '#000', 3, 80, 2); }
}
let dead = p.life <= 0 || p.x < -40 || p.x > this.W + 40 || p.y < -40 || p.y > this.H + 40;
for (const e of this.enemies) {
if (e.dead || p.hitSet.has(e.uid)) continue;
if (dist2(p.x, p.y, e.x, e.y) < (e.radius + p.size) ** 2) {
p.hitSet.add(e.uid);
if (p.kind === 'chakram') { if (e.czT && this.time - e.czT < 0.25) continue; e.czT = this.time; }
this.hitEnemy(e, p.dmg, { impact: p.impact !== false, noCrit: p.noCrit });
if (p.fragile) {
for (let s = 0; s < 3 + (st.projCount - 1); s++) {
const a = rand(0, T);
this.projs.push({ kind: 'bullet', x: p.x, y: p.y, vx: Math.cos(a) * 380, vy: Math.sin(a) * 380, dmg: p.dmg * 0.4, size: 3, pierce: 0, ricochet: 0, life: 0.6, hitSet: new Set(), impact: true });
}
dead = true; break;
}
if (p.pierce > 0) p.pierce--;
else if (p.kind !== 'chakram' && p.kind !== 'graviton') { dead = true; break; }
}
}
if (dead) this.projs.splice(i, 1);
}
},

updateEnemies(dt, st) {
const h = this.hero, heroR = this.activeDef().id === 'tank' ? 20 : 16;
const chronoMul = 1 - clamp(st.chrono / 100, 0, 0.6);

// ---- Calcular buff del aura rosa (NO estaqueable) ----
for (const e of this.enemies) { e._pinkBuffed = false; e._pinkSpeedMul = 1; }
const pinkEnemies = this.enemies.filter(e => e.support && !e.dead);
for (const pink of pinkEnemies) {
for (const e of this.enemies) {
if (e === pink || e.boss || e.support || e.dead) continue;
if (dist2(pink.x, pink.y, e.x, e.y) < (pink.auraRadius + e.radius) ** 2) {
e._pinkBuffed = true;
e._pinkSpeedMul = 1.10;
}
}
}

for (const e of this.enemies) {
e.flash = Math.max(0, e.flash - dt);
e.hitCd -= dt;
if (e.markT > 0) e.markT -= dt;
if (e.slowT > 0) {
e.slowT -= dt;
if (Math.random() < dt * 4) FX.status(e.x, e.y, 'frost');
if (e.slowT <= 0) e.slow = 0;
}
if (e.burn) {
e.burn.t -= dt; e.hp -= e.burn.dps * dt;
if (Math.random() < dt * 8) FX.status(e.x, e.y - e.radius * 0.5, 'burn');
if (e.burn.t <= 0) e.burn = null;
if (e.hp <= 0) { this.killEnemy(e); continue; }
}
if (e.poison > 0) {
e.poisonT -= dt; e.hp -= st.dmg * st.poisonDmg / 100 * e.poison * dt;
if (Math.random() < dt * 6) FX.status(e.x, e.y - e.radius * 0.5, 'poison');
if (e.poisonT <= 0) e.poison = 0;
if (e.hp <= 0) { this.killEnemy(e); continue; }
}

// ---- ROSA: enemigo de soporte, se queda a media distancia ----
if (e.support && !e.boss) {
const d = dist(e.x, e.y, h.x, h.y);
const wantDist = e.preferredRange || 300;
let dir = 0;
if (d < wantDist - 50) dir = -1;
else if (d > wantDist + 80) dir = 1;
if (dir !== 0) {
const a = Math.atan2(h.y - e.y, h.x - e.x);
e.x += Math.cos(a) * e.speed * dir * chronoMul * dt * 0.6;
e.y += Math.sin(a) * e.speed * dir * chronoMul * dt * 0.6;
}
continue; // El rosa no hace daño directo
}

// ---- DORADO: orbita y dispara láser ----
if (e.orbit) {
if (e.phase === 'approach') {
const d = dist(e.x, e.y, h.x, h.y);
if (d <= BAL.goldenOrbitRadius + 20) {
e.phase = 'orbit';
e.orbitA = Math.atan2(e.y - h.y, e.x - h.x);
e.orbitR = Math.max(d, BAL.goldenOrbitRadius);
e.atkPhase = 'idle';
e.atkT = BAL.goldenFirstAtk;
} else {
const speed = 90;
e.x += (h.x - e.x) / d * speed * chronoMul * dt;
e.y += (h.y - e.y) / d * speed * chronoMul * dt;
}
} else {
if (e.atkPhase === 'aim') {
e.atkT -= dt * chronoMul;
e.x = h.x + Math.cos(e.orbitA) * e.orbitR;
e.y = h.y + Math.sin(e.orbitA) * e.orbitR;
if (e.atkT <= 0) { e.atkPhase = 'fire'; e.atkT = BAL.goldenLaserT; e.laserHit = false; }
} else if (e.atkPhase === 'fire') {
e.atkT -= dt * chronoMul;
e.x = h.x + Math.cos(e.orbitA) * e.orbitR;
e.y = h.y + Math.sin(e.orbitA) * e.orbitR;
if (!e.laserHit) {
e.laserHit = true;
if (segDist(e.x, e.y, e.aimX, e.aimY, h.x, h.y) < BAL.goldenLaserWidth / 2 + heroR) {
this.damageHero(e.dmg, 'golden');
}
Audio.laser();
}
if (e.atkT <= 0) { e.atkPhase = 'idle'; e.atkT = BAL.goldenAtkInterval; }
} else {
e.atkT -= dt * chronoMul;
e.orbitA = (e.orbitA || 0) + BAL.goldenOrbitSpeed * chronoMul * dt;
e.orbitR = Math.min(BAL.goldenOrbitMax, (e.orbitR || BAL.goldenOrbitRadius) + BAL.goldenOrbitGrow * dt);
e.x = h.x + Math.cos(e.orbitA) * e.orbitR;
e.y = h.y + Math.sin(e.orbitA) * e.orbitR;
if (e.atkT <= 0) { e.atkPhase = 'aim'; e.atkT = BAL.goldenTelegraphT; e.aimX = h.x; e.aimY = h.y; }
}
}
continue;
}

if (!e.boss) {
const d = dist(e.x, e.y, h.x, h.y);
if (e.ranged) {
let dir = 0;
if (d > e.preferredRange + 30) dir = 1;
else if (d < e.preferredRange - 60) dir = -1;
const a = Math.atan2(h.y - e.y, h.x - e.x);
e.x += Math.cos(a) * e.speed * dir * chronoMul * dt;
e.y += Math.sin(a) * e.speed * dir * chronoMul * dt;
e.lastShot -= dt;
if (e.lastShot <= 0 && d < e.preferredRange + 100) {
e.lastShot = e.fireInterval;
this.ebullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 210, vy: Math.sin(a) * 210, radius: 7, dmg: e.dmg * 0.8, type: e.type });
}
} else if (d > e.radius + heroR - 2) {
const f = e.speed * (1 - e.slow) * chronoMul * (e._pinkSpeedMul || 1) * dt / d;
e.x += (h.x - e.x) * f; e.y += (h.y - e.y) * f;
}
if (d < e.radius + heroR + 2 && e.hitCd <= 0 && this.reviveT <= 0) {
e.hitCd = 0.6;
let dmg = e.dmg;
if (e._pinkBuffed) dmg *= 1.10;
this.damageHero(dmg, e.type);
if (this.reviveT > 0) return;
if (st.thorns > 0) this.hitEnemy(e, st.dmg * st.thorns / 100, { noCrit: true, noProc: true });
}
} else if (dist(e.x, e.y, h.x, h.y) < e.radius + heroR + 2 && e.hitCd <= 0 && this.reviveT <= 0) {
e.hitCd = 0.6;
this.damageHero(e.dmg, e.type || 'boss');
if (this.reviveT > 0) return;
}
}
},

updateEBullets(dt, st) {
const h = this.hero;
for (let i = this.ebullets.length - 1; i >= 0; i--) {
const b = this.ebullets[i];
if (!b) break;
if (b.homing) {
const a = Math.atan2(h.y - b.y, h.x - b.x);
b.vx += Math.cos(a) * 150 * dt; b.vy += Math.sin(a) * 150 * dt;
const s = Math.hypot(b.vx, b.vy), cap = b.cap || 260;
if (s > cap) { b.vx = b.vx / s * cap; b.vy = b.vy / s * cap; }
}
b.x += b.vx * dt; b.y += b.vy * dt;
let blocked = false;
for (const o of this.orbs) {
if (dist2(o.x, o.y, b.x, b.y) < (10 + b.radius) ** 2) { blocked = true; FX.burst(b.x, b.y, '#9C27B0', 5, 90, 2); break; }
}
if (blocked) { this.ebullets.splice(i, 1); continue; }
if (dist2(b.x, b.y, h.x, h.y) < (b.radius + 16) ** 2) {
this.ebullets.splice(i, 1);
this.damageHero(b.dmg, b.type);
if (this.reviveT > 0) break;
continue;
}
if (b.x < -50 || b.x > this.W + 50 || b.y < -50 || b.y > this.H + 50) this.ebullets.splice(i, 1);
}
}
};

function segDist(x1, y1, x2, y2, px, py) {
const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
if (l2 === 0) return dist(x1, y1, px, py);
let t = clamp(((px - x1) * dx + (py - y1) * dy) / l2, 0, 1);
return dist(x1 + t * dx, y1 + t * dy, px, py);
}