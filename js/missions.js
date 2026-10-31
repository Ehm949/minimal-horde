import { Bus } from './events.js';
import { Resources, CUR_KEYS } from './resources.js';
import { fmt, pick, clamp } from './utils.js';
import { t } from './localization.js';
import { Shop } from './shop.js';
import { Audio } from './audio.js';

export const Track = {
  kills: 0, dist: 0, nodes: 0, bosses: 0, cur: 0, byType: {},
  init(s = {}) {
    s = s || {};
    this.kills = s.kills || 0; this.dist = s.dist || 0; this.nodes = s.nodes || 0;
    this.bosses = s.bosses || 0; this.cur = s.cur || 0; this.byType = s.byType || {};
  },
  serialize() {
    return { kills: this.kills, dist: this.dist, nodes: this.nodes,
      bosses: this.bosses, cur: this.cur, byType: this.byType };
  }
};

Bus.on('kill', d => {
  Track.kills++;
  if (d && d.e) Track.byType[d.e.type] = (Track.byType[d.e.type] || 0) + 1;
});
Bus.on('gain', d => { if (CUR_KEYS.includes(d.k)) Track.cur += d.v; });
Bus.on('nodeBought', () => Track.nodes++);
Bus.on('bossKill', () => Track.bosses++);

// ============ MISIONES: inicio mucho más suave, crecimiento lento ============
const POOL = [
  { k: 'kills',  nKey: 'mis.kills',  base: 50,  g: 1.15, est: m => 1 + Math.floor(m.round / 3) },
  { k: 'cur',    nKey: 'mis.cur',    base: 150, g: 1.20, est: m => 1 + Math.floor(m.round / 3) },
  { k: 'nodes',  nKey: 'mis.nodes',  base: 4,   g: 1.15, est: m => 2 + Math.floor(m.round / 3) },
  { k: 'dist',   nKey: 'mis.dist',   base: 200, g: 1.15, est: m => 2 + Math.floor(m.round / 3) },
  { k: 'bosses', nKey: 'mis.boss',   base: 1,   g: 1.10, est: m => 3 + Math.floor(m.round / 2) }
];

// Rarezas de la Tienda Estelar (precio fijo)
const RARITIES = [
  { prob: 0.60, cls: 'r-common', color: '#888888', cost: 1, amount: 1 },
  { prob: 0.25, cls: 'r-rare',   color: '#2196F3', cost: 3, amount: 5 },
  { prob: 0.12, cls: 'r-epic',   color: '#9C27B0', cost: 5, amount: 10 },
  { prob: 0.03, cls: 'r-legend', color: '#FFD700', cost: 5, amount: 0 }   // 0 = +1 PR
];
const KIT_COINS = ['CIR', 'TRI', 'CUA', 'HEX', 'PEN'];

export const Missions = {
  list: [], est: 0, offers: [], rerolls: 0,
  kit: { CIR: 0, TRI: 0, CUA: 0, HEX: 0, PEN: 0, PR: 0 },

  init(saved) {
    if (saved) {
      // ---- Reparar valores corruptos / NaN de saves antiguos ----
      this.est = Number.isFinite(saved.est) ? saved.est : 0;
      this.rerolls = Number.isFinite(saved.rerolls) ? saved.rerolls : 0;
      this.kit = Object.assign({ CIR: 0, TRI: 0, CUA: 0, HEX: 0, PEN: 0, PR: 0 }, saved.kit || {});
      for (const k in this.kit) if (!Number.isFinite(this.kit[k])) this.kit[k] = 0;
      this.offers = Array.isArray(saved.offers)
        ? saved.offers.filter(o => o && o.rar && Number.isFinite(o.cost))
        : [];
      // ---- Solo aceptar misiones con formato válido (descarta el formato viejo con "tier") ----
      if (Array.isArray(saved.list)) {
        this.list = saved.list
          .filter(m => m && POOL.some(p => p.k === m.k) &&
            Number.isFinite(m.round) && Number.isFinite(m.need) && m.need > 0)
          .map(m => ({ k: m.k, round: m.round, need: m.need,
            start: Number.isFinite(m.start) ? m.start : 0, done: !!m.done }));
      }
    }
    while (this.list.length < 3) this.list.push(this.make(this.list.length));
    if (!this.offers.length) this.rollOffers();
  },

  make(round) {
    round = Math.max(0, Math.floor(Number.isFinite(round) ? round : 0));
    const def = pick(POOL);
    let need = Math.ceil(def.base * Math.pow(def.g, round));
    if (def.k === 'dist') need = Math.max(need, Math.floor(Track.dist / 100) * 100 + 200);
    return { k: def.k, round, need, start: def.k === 'dist' ? 0 : Track[def.k], done: false };
  },
  defOf(m) { return POOL.find(p => p.k === m.k); },
  progress(m) {
    const def = this.defOf(m);
    if (!def || !Number.isFinite(m.need) || m.need <= 0) return 0;
    const v = m.k === 'dist' ? Track.dist : Track[m.k] - (m.start || 0);
    return clamp(v / m.need, 0, 1);
  },
  estReward(m) { return this.defOf(m).est({ round: m.round || 0 }); },

  update() {
    for (const m of this.list) {
      if (!m.done && this.progress(m) >= 1) {
        m.done = true;
        Bus.emit('toast', { msg: t('mis.ready') });
      }
      if (!m.done && this.progress(m) >= 1) {
m.done = true;
Audio.mission();                       // ← NUEVO: suena al completarse
Bus.emit('toast', { msg: t('mis.ready') });
}
    }
  },

  claim(i) {
    const m = this.list[i];
    if (!m || !m.done) return false;
    this.est += this.estReward(m);
    this.list[i] = this.make((m.round || 0) + 1);   // nueva misión, un poco más difícil
    return true;
  },

  // ---- Tienda Estelar ----
  rollRarity() {
    const r = Math.random(); let acc = 0;
    for (const x of RARITIES) { acc += x.prob; if (r < acc) return x; }
    return RARITIES[0];
  },
  makeOffer() {
    const rar = this.rollRarity();
    if (rar.amount === 0) return { type: 'PR', rar, cost: rar.cost };
    return { type: pick(KIT_COINS), rar, cost: rar.cost, amount: rar.amount };
  },
  rollOffers() { this.offers = []; for (let i = 0; i < 4; i++) this.offers.push(this.makeOffer()); },
  rerollCost() {
    const disc = Shop.countPurchases('cheap_reroll');
    return Math.max(1, 3 + this.rerolls - disc);
  },
  reroll() {
    const c = this.rerollCost();
    if (!Resources.spend('ORO', c)) return false;
    this.rerolls++;
    this.rollOffers();
    return true;
  },
  buyOffer(i) {
    const o = this.offers[i];
    if (!o || !Number.isFinite(this.est) || this.est < o.cost) return false;
    this.est -= o.cost;
    if (o.type === 'PR') this.kit.PR += 1;
    else this.kit[o.type] = (this.kit[o.type] || 0) + o.amount;
    this.offers[i] = this.makeOffer();
    return true;
  },

  serialize() {
    return { list: this.list, est: this.est, offers: this.offers, rerolls: this.rerolls, kit: this.kit };
  }
};