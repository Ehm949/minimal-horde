import { Heroes, Global } from './heroes.js';
import { Trees } from './heroTree.js';
import { Combat } from './combat.js';
import { World } from './world.js';
import { Missions, Track } from './missions.js';
import { Achievements } from './achievements.js';
import { Resources } from './resources.js';
import { Loot } from './loot.js';
import { LevelUps } from './levelUps.js';
import { Bus } from './events.js';

export const Game = {
  abT: 0, rateT: 0,
  paused: false,
  milestone: { total: 0, lvl: 0 },

  // HITO: cada 25 nodos comprados (entre todos los árboles) → +1% daño global
  recalcMilestone() {
    let total = 0;
    for (const t of Trees.all()) total += t.owned.size - 1;
    const lvl = Math.floor(total / 25);
    Global.put('dmg', 'treeMilestone', { add: lvl * 0.05 });
    this.milestone = { total, lvl };
  },
  milestoneInfo() { return this.milestone; },

  update(dt) {
    if (this.paused) return;
    Combat.update(dt);
    Track.dist = Math.max(Track.dist, World.dist);
    Missions.update();
    Achievements.update(dt);
    this.autoBuyTick(dt);
    this.rateT += dt;
    if (this.rateT >= 1) { Resources.flushRates(); this.rateT = 0; }
  },

  autoBuyTick(dt) {
    const tree = Trees.get(Heroes.active);
    const lvl = tree.stats().autoBuy | 0;
    if (lvl <= 0) return;
    this.abT -= dt;
    if (this.abT > 0) return;
    this.abT = Math.max(0.6, 2.6 - 0.4 * lvl);
    const fr = tree.frontier().filter(n => tree.canBuy(n));
    fr.sort((a, b) => tree.effCost(a).v - tree.effCost(b).v);
    for (const n of fr) {
      const c = tree.effCost(n);
      if (Resources.has(c.k, c.v)) { tree.buy(n.id); break; }
    }
  },

  offline(save) {
    if (!save || !save.ts) return;
    let gap = (Date.now() - save.ts) / 1000;
    if (gap < 30) return;
    gap = Math.min(gap, 8 * 3600);
    const kills = gap * Math.min(14, 3 + World.dist * 0.002) * 0.6;
    Loot.offlineLoot(kills, World.dist);
    Combat.refreshStats();
    Heroes.gainXp(Heroes.activeHero(), kills * 2 * Combat.stats.xpMul * LevelUps.xpMul());
    Bus.emit('toast', { msg: `AUSENTE ${Math.floor(gap / 60)} MIN · BOTÍN RECOGIDO AUTOMÁTICAMENTE` });
  }
};

Bus.on('pause', v => Game.paused = v);
Bus.on('nodeBought', () => Game.recalcMilestone());