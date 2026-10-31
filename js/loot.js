import { Resources } from './resources.js';
import { Bus } from './events.js';
import { FX } from './effects.js';
import { LevelUps } from './levelUps.js';
import { curScale } from './enemies.js';
import { irand } from './utils.js';
import { Shop } from './shop.js';
import { Heroes } from './heroes.js';

export const Loot = {
  dropFor(combat, e) {
    const st = combat.stats;
    const scale = curScale(combat.worldDist());

    // ---- ENEMIGO DORADO: suelta ORO + monedas normales ----
    if (e.type === 'golden') {
      const oroAmt = Math.max(1, Math.round(1 * Shop.oroMul()));
      Resources.add('ORO', oroAmt);
      FX.text(e.x, e.y - e.radius - 2, `+${oroAmt} ORO`, '#FFD700', 13);
      for (const k of ['CIR', 'TRI', 'CUA']) Resources.add(k, 5);
      combat.gainXp(e.xpDrop * scale * st.xpMul * LevelUps.xpMul());
      return;
    }

    if (e.boss) {
      for (const k of ['CIR', 'TRI', 'CUA', 'HEX']) Resources.add(k, 20);
      Resources.add('PEN', irand(2, 4));
      Resources.add('PUR', 1);
      FX.text(e.x, e.y - e.radius - 2, '+BOTÍN DE JEFE', '#000', 13);
    } else {
      const base = e.elite ? 4 : 1;
      const heroResMul = Shop.heroResMul(Heroes.active, e.cur);
      const amt = Math.max(1, Math.round(base * Math.pow(scale, 0.6) * st.curMul * LevelUps.curMul(e.cur) * heroResMul));
      Resources.add(e.cur, amt);
      let doubled = false;
      if (st.doubleLoot && st.doubleLoot[e.type] > 0 && Math.random() * 100 < st.doubleLoot[e.type]) {
        Resources.add(e.cur, amt);
        doubled = true;
      }
      const msg = doubled ? `+${amt}×2 ${e.cur}` : `+${amt} ${e.cur}`;
      FX.text(e.x, e.y - e.radius - 2, msg, e.color === 'purple' ? '#9C27B0' : '#E53935', 10);
      if (e.elite && Math.random() < 0.4) Resources.add('PEN', 1);
      if (e.type === 'purple' && Math.random() < 0.15) Resources.add('PUR', 1);
    }
    combat.gainXp(e.xpDrop * scale * st.xpMul * LevelUps.xpMul());
  },

  offlineLoot(kills, dist) {
    const s = curScale(dist);
    Resources.add('CIR', kills * 1.0 * s);
    Resources.add('TRI', kills * 0.4 * s);
    Resources.add('CUA', kills * 0.2 * s);
    if (dist >= 300) Resources.add('HEX', kills * 0.06 * s);
  }
};