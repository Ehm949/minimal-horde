import { Resources } from './resources.js';
import { Heroes } from './heroes.js';
import { Rebirth } from './rebirth.js';
import { Trees } from './heroTree.js';
import { Bus } from './events.js';
import { Audio } from './audio.js';
import { t, tr, cur } from './localization.js';

// Rareza: multiplicador de efecto, coste en ORO, probabilidad, clase CSS, color
const RARITIES = [
  { name: 'COMÚN',      mul: 1, cost: 3,  prob: 0.60, cls: 'r-common', color: '#888888' },
  { name: 'RARO',       mul: 2, cost: 5,  prob: 0.25, cls: 'r-rare',   color: '#2196F3' },
  { name: 'ÉPICO',      mul: 3, cost: 8,  prob: 0.12, cls: 'r-epic',   color: '#9C27B0' },
  { name: 'LEGENDARIO', mul: 5, cost: 12, prob: 0.03, cls: 'r-legend', color: '#FFD700' },
];

// Objetos repetibles (con rareza)
const REPEATABLE = [
  { id: 'xp_hero',     base: 1,   kind: 'hero' },
  { id: 'dmg_hero',    base: 1,   kind: 'hero' },
  { id: 'res_hero',    base: 1,   kind: 'heroRes' },
  { id: 'xp_global',   base: 0.5, kind: 'global' },
  { id: 'dmg_global',  base: 0.5, kind: 'global' },
  { id: 'loot_global', base: 0.5, kind: 'global' },
  { id: 'oro_boost',   base: 1,   kind: 'global' },
];

// Objetos especiales (coste fijo, sin rareza)
const SPECIAL = [
  { id: 'rebirth_point', cost: 25, nameKey: 'shop.special.rebirth_point.n', descKey: 'shop.special.rebirth_point.d' },
  { id: 'mini_drone',    cost: 15, nameKey: 'shop.special.mini_drone.n',    descKey: 'shop.special.mini_drone.d' },
  { id: 'start_node',    cost: 10, nameKey: 'shop.special.start_node.n',    descKey: 'shop.special.start_node.d' },
  { id: 'cheap_reroll',  cost: 12, nameKey: 'shop.special.cheap_reroll.n',  descKey: 'shop.special.cheap_reroll.d', max: 2 },
  { id: 'unlock_hero',   cost: 30, nameKey: 'shop.special.unlock_hero.n',   descKey: 'shop.special.unlock_hero.d' },
];

const RES_POOL = ['CIR', 'TRI', 'CUA', 'HEX', 'PEN', 'PUR'];

export const Shop = {
  offers: [],
  rerolls: 0,
  purchases: [],   // { id, rarity, heroId, res, value }

  init(saved) {
    if (saved) {
      this.purchases = saved.purchases || [];
      this.rerolls = saved.rerolls || 0;
      this.offers = saved.offers || [];
    }
    if (!this.offers.length) this.rollOffers();
  },

  rerollCost() {
    const discount = this.countPurchases('cheap_reroll');
    return Math.max(1, 1 + this.rerolls - discount);
  },

  rollOffers() {
    this.offers = [];
    for (let i = 0; i < 4; i++) this.offers.push(this.makeOffer());
  },

  makeOffer() {
    // 20% de probabilidad de objeto especial
    if (Math.random() < 0.2) {
      const pool = SPECIAL.filter(s => {
        if (s.max && this.countPurchases(s.id) >= s.max) return false;
        if (s.id === 'unlock_hero' && Heroes.list.every(h => h.unlocked)) return false;
        if (s.id === 'start_node' && Heroes.list.every(h => !h.unlocked)) return false;
        if (s.id === 'mini_drone' && Heroes.list.every(h => !h.unlocked)) return false;
        return true;
      });
      if (pool.length) {
        const item = pool[Math.floor(Math.random() * pool.length)];
        const offer = { type: 'special', id: item.id, cost: item.cost, nameKey: item.nameKey, descKey: item.descKey };
        // Elegir el héroe AQUÍ para mostrarlo en la tienda antes de comprar
        if (item.id === 'unlock_hero') {
          const locked = Heroes.list.filter(h => !h.unlocked);
          if (locked.length) offer.heroId = locked[Math.floor(Math.random() * locked.length)].def.id;
        }
        if (item.id === 'start_node') {
          const unlocked = Heroes.list.filter(h => h.unlocked);
          if (unlocked.length) offer.heroId = unlocked[Math.floor(Math.random() * unlocked.length)].def.id;
        }
        if (item.id === 'mini_drone') {
          const unlocked = Heroes.list.filter(h => h.unlocked);
          if (unlocked.length) offer.heroId = unlocked[Math.floor(Math.random() * unlocked.length)].def.id;
        }
        return offer;
      }
    }
    // Objeto repetible con rareza
    const item = REPEATABLE[Math.floor(Math.random() * REPEATABLE.length)];
    const rarity = this.rollRarity();
    const offer = { type: 'repeat', id: item.id, rarity: rarity, cost: rarity.cost };
    if (item.kind === 'hero' || item.kind === 'heroRes') {
      const unlocked = Heroes.list.filter(h => h.unlocked);
      if (unlocked.length) offer.heroId = unlocked[Math.floor(Math.random() * unlocked.length)].def.id;
    }
    if (item.kind === 'heroRes') {
      offer.res = RES_POOL[Math.floor(Math.random() * RES_POOL.length)];
    }
    offer.value = item.base * rarity.mul;
    return offer;
  },

  rollRarity() {
    const r = Math.random();
    let acc = 0;
    for (const rarity of RARITIES) { acc += rarity.prob; if (r < acc) return rarity; }
    return RARITIES[0];
  },

  reroll() {
    const cost = this.rerollCost();
    if (!Resources.spend('ORO', cost)) return false;
    this.rerolls++;
    this.rollOffers();
    Audio.buy();
    return true;
  },

  buy(index) {
    const offer = this.offers[index];
    if (!offer || !Resources.spend('ORO', offer.cost)) return false;
    if (offer.type === 'special') this.applySpecial(offer);
    else this.purchases.push({ id: offer.id, rarity: offer.rarity.name, heroId: offer.heroId, res: offer.res, value: offer.value });
    this.rerolls = 0;   // resetear coste del reroll al comprar
    this.offers[index] = this.makeOffer();
    Audio.buy();
    Bus.emit('shopBuy', { offer });
    return true;
  },

  applySpecial(offer) {
    switch (offer.id) {
      case 'rebirth_point': Rebirth.points++; break;
      case 'mini_drone': this.purchases.push({ id: 'mini_drone', heroId: offer.heroId, value: 1 }); break;
      case 'cheap_reroll': this.purchases.push({ id: 'cheap_reroll', value: 1 }); break;
      case 'unlock_hero': {
        // Registrar la compra para que sobreviva al renacimiento
        this.purchases.push({ id: 'unlock_hero', heroId: offer.heroId, value: 1 });
        const h = Heroes.get(offer.heroId);
        if (h && !h.unlocked) {
          h.unlocked = true;
          Bus.emit('heroUnlocked', { id: h.def.id });
        }
        break;
      }
      case 'start_node': {
        // Registrar la compra para el héroe concreto
        this.purchases.push({ id: 'start_node', heroId: offer.heroId, value: 1 });
        // Si el héroe YA tiene nodos comprados, auto-compra uno gratis al instante
        const tree = Trees.get(offer.heroId);
        if (tree && tree.owned.size > 1) this.buyFreeNode(tree);
        break;
      }
    }
  },

  // Compra un nodo aleatorio de la frontera a coste 0 (no gasta monedas)
  buyFreeNode(tree) {
    const fr = tree.frontier();
    if (!fr.length) return false;
    const n = fr[Math.floor(Math.random() * fr.length)];
    return tree.buyFree(n.id).ok;
  },

  // Se llama tras el renacimiento: compra gratis N nodos por héroe según las compras de start_node
  applyStartNodes() {
    const counts = {};
    for (const p of this.purchases) {
      if (p.id === 'start_node' && p.heroId) counts[p.heroId] = (counts[p.heroId] || 0) + (p.value || 1);
    }
    for (const heroId in counts) {
      const tree = Trees.get(heroId);
      if (!tree) continue;
      for (let i = 0; i < counts[heroId]; i++) {
        if (!this.buyFreeNode(tree)) break;
      }
    }
  },

  // Se llama tras el renacimiento: vuelve a desbloquear los héroes comprados en la tienda
  applyUnlockedHeroes() {
    for (const p of this.purchases) {
      if (p.id === 'unlock_hero' && p.heroId) {
        const h = Heroes.get(p.heroId);
        if (h && !h.unlocked) h.unlocked = true;
      }
    }
  },

  countPurchases(id) {
    return this.purchases.filter(p => p.id === id).reduce((s, p) => s + (p.value || 1), 0);
  },

  // ---- Consultas de efectos (las usan heroes.js y loot.js) ----
  heroXpMul(heroId) {
    let total = 0;
    for (const p of this.purchases) if (p.id === 'xp_hero' && p.heroId === heroId) total += p.value;
    return 1 + total / 100;
  },
  heroDmgMul(heroId) {
    let total = 0;
    for (const p of this.purchases) if (p.id === 'dmg_hero' && p.heroId === heroId) total += p.value;
    return 1 + total / 100;
  },
  heroResMul(heroId, res) {
    let total = 0;
    for (const p of this.purchases) if (p.id === 'res_hero' && p.heroId === heroId && p.res === res) total += p.value;
    return 1 + total / 100;
  },
  globalXpMul() {
    let total = 0;
    for (const p of this.purchases) if (p.id === 'xp_global') total += p.value;
    return 1 + total / 100;
  },
  globalDmgMul() {
    let total = 0;
    for (const p of this.purchases) if (p.id === 'dmg_global') total += p.value;
    return 1 + total / 100;
  },
  globalLootMul() {
    let total = 0;
    for (const p of this.purchases) if (p.id === 'loot_global') total += p.value;
    return 1 + total / 100;
  },
  oroMul() {
    let total = 0;
    for (const p of this.purchases) if (p.id === 'oro_boost') total += p.value;
    return 1 + total / 100;
  },
  // Drones iniciales POR HÉROE (sin límite de compras)
  startDrones(heroId) {
    return this.purchases.filter(p => p.id === 'mini_drone' && p.heroId === heroId).length;
  },

  // ---- Resumen acumulado (para la pestaña STATS) ----
  summary() {
    const grouped = {};
    for (const p of this.purchases) {
      const key = p.id + '|' + (p.heroId || '') + '|' + (p.res || '');
      if (!grouped[key]) {
        grouped[key] = { id: p.id, heroId: p.heroId, res: p.res, value: 0, count: 0 };
      }
      grouped[key].value += p.value || 1;
      grouped[key].count++;
    }
    return Object.values(grouped);
  },

  // Descripción legible de una compra acumulada (localizada)
  describe(p) {
    const heroName = p.heroId ? tr(Heroes.get(p.heroId)?.def.name || '') : '';
    switch (p.id) {
      case 'xp_hero':      return t('shop.desc.xp_hero').replace('{v}', p.value).replace('{h}', heroName);
      case 'dmg_hero':     return t('shop.desc.dmg_hero').replace('{v}', p.value).replace('{h}', heroName);
      case 'res_hero':     return t('shop.desc.res_hero').replace('{v}', p.value).replace('{r}', cur(p.res)).replace('{h}', heroName);
      case 'xp_global':    return t('shop.desc.xp_global').replace('{v}', p.value);
      case 'dmg_global':   return t('shop.desc.dmg_global').replace('{v}', p.value);
      case 'loot_global':  return t('shop.desc.loot_global').replace('{v}', p.value);
      case 'oro_boost':    return t('shop.desc.oro_boost').replace('{v}', p.value);
      case 'mini_drone':   return t('shop.desc.mini_drone').replace('{v}', p.value).replace('{h}', heroName);
      case 'cheap_reroll': return t('shop.desc.cheap_reroll').replace('{v}', p.value);
      case 'unlock_hero':  return t('shop.special.unlock_hero.n') + (heroName ? ' · ' + heroName : '');
      default:             return '+' + p.value + '%';
    }
  },

  serialize() {
    return { purchases: this.purchases, rerolls: this.rerolls, offers: this.offers };
  }
};