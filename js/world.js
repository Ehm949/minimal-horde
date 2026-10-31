import { BAL } from './config.js';
import { Bus } from './events.js';
import { pickType, makeEnemy } from './enemies.js';
import { Boss } from './boss.js';
import { Accelerator } from './inventory.js';

export const World = {
  dist: 0, boss: null, bossesKilled: 0, nextBoss: BAL.bossEvery,
  spawnT: 0, pending: [],

  init(s = {}) {
    this.dist = s.dist || 0;
    this.bossesKilled = s.bossesKilled || 0;
    this.nextBoss = s.nextBoss || BAL.bossEvery;
    this.boss = null; this.pending = []; this.spawnT = 0;
  },

  update(dt, combat, speedStat) {
    // la distancia avanza sola, salvo con jefe activo
    if (!this.boss) {
      this.dist += dt * 1.0 * speedStat;
      if (this.dist >= this.nextBoss) this.requestBoss(combat);
    }

    // spawns con aviso previo (650 ms); el ACELERADOR acorta el intervalo
    this.spawnT -= dt;
    if (this.spawnT <= 0 && combat.enemies.length < BAL.maxEnemies) {
      this.spawnT = (Math.max(0.3, 1.5 - this.dist * 0.0004) * (this.boss ? 2 : 1)) / Accelerator.spawnMul();
      const type = pickType(this.dist, this.bossesKilled);
      const elite = this.dist >= 400 && Math.random() < Math.min(0.1, 0.01 + this.dist * 0.00003);
      this.pending.push({ type, elite, at: combat.time + BAL.spawnLead, ...this.edgePos(combat) });
      combat.warnEdge(this.pending[this.pending.length - 1]);
    }

    for (let i = this.pending.length - 1; i >= 0; i--) {
      const p = this.pending[i];
      if (combat.time >= p.at) { combat.addEnemy(p.type, p.x, p.y, p.elite); this.pending.splice(i, 1); }
    }

 // ---- ENEMIGO DORADO: sin límite de cantidad; probabilidad por segundo (baja) ----
 if (this.dist >= BAL.goldenMinDist) {
   const chance = Math.min(BAL.goldenChanceMax, BAL.goldenChanceBase + (this.dist - BAL.goldenMinDist) * 0.00004);
   if (Math.random() < chance * dt) {
     const pos = this.edgePos(combat);
     const e = makeEnemy(this.dist, 'golden', pos.x, pos.y, {});
     e.phase = 'approach';
     e.orbitA = 0;
     e.orbitR = BAL.goldenOrbitRadius;
     combat.enemies.push(e);
     combat.warnEdge({ ...pos, type: 'golden' });
     Bus.emit('goldenSpawn', {});
   }
 }
 // ---- ENEMIGO ROSA: soporte con aura, sin límite de cantidad ----
if (this.dist >= 200) {
const pinkChance = Math.min(0.12, 0.02 + (this.dist - 200) * 0.10 / 2800);
if (Math.random() < pinkChance * dt) {
const pos = this.edgePos(combat);
const e = makeEnemy(this.dist, 'pink', pos.x, pos.y, {});
combat.enemies.push(e);
combat.warnEdge({ ...pos, type: 'pink' });
}
}
  },

  edgePos(combat) {
    const side = Math.floor(Math.random() * 4);
    switch (side) {
      case 0: return { x: Math.random() * combat.W, y: -30, edge: 'top', pos: Math.random() * combat.W };
      case 1: return { x: combat.W + 30, y: Math.random() * combat.H, edge: 'right', pos: Math.random() * combat.H };
      case 2: return { x: Math.random() * combat.W, y: combat.H + 30, edge: 'bottom', pos: Math.random() * combat.W };
      default: return { x: -30, y: Math.random() * combat.H, edge: 'left', pos: Math.random() * combat.H };
    }
  },

requestBoss(combat) {
  if (this.boss) return;
  this.boss = Boss.spawn(combat, this.bossesKilled, this.nextBoss);
  Bus.emit('bossSpawn', { name: this.boss.bossName });
},

  // extra = metros por baja (stat distKill del árbol)
  onKill(e, extra = 0) {
    this.dist += e.distVal + extra;
    if (e.boss) {
      this.boss = null;
      this.bossesKilled++;
      this.nextBoss += BAL.bossEvery;
      this.dist += 50;
      Bus.emit('bossKill', {});
      return;
    }
    Bus.emit('kill', { e });
  },

  // MUERTE DEL HÉROE: la distancia vuelve a 0
  resetRun() {
    this.dist = 0;
    this.nextBoss = BAL.bossEvery;
    this.boss = null;
    this.pending = [];
    this.spawnT = 0;
  },

  serialize() { return { dist: this.dist, bossesKilled: this.bossesKilled, nextBoss: this.nextBoss }; }
};