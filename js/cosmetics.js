import { Resources } from './resources.js';
import { Bus } from './events.js';

// ============================================================
// SISTEMA DE COSMÉTICOS (SKINS Y SONIDOS)
// ============================================================

// Sonidos disponibles para armas
const SOUND_POOL = [
{ id: 'default', name: 'CLÁSICO' },
{ id: 'guitar', name: 'GUITARRA' },
{ id: 'piano', name: 'PIANO' },
{ id: 'synth', name: 'SYNTH' },
{ id: 'drum', name: 'TAMBOR' },
{ id: 'bass', name: 'BAJO' },
{ id: 'flute', name: 'FLAUTA' },
{ id: 'bell', name: 'CAMPANA' },
{ id: 'laser', name: 'LÁSER' },
{ id: 'retro', name: 'RETRO' },
{ id: 'thunder', name: 'TRUENO' },
{ id: 'wind', name: 'VIENTO' },
{ id: 'metal', name: 'METAL' },
{ id: 'water', name: 'AGUA' },
{ id: 'fire', name: 'FUEGO' },
];

// Nombres de colores para generar
const COLOR_ADJ = ['NEÓN','PASTEL','VIVO','SUAVE','INTENSO','CLARO','OSCURO','FRÍO','CÁLIDO','ELÉCTRICO','FANTASMA','DORADO','PLATA','COBRE','JADE','RUBÍ','ZAFIRO','ÁMBAR','CORAL','MENTA'];
const COLOR_NOUN = ['FUEGO','HIELO','SOMBRA','LUZ','TORMENTA','AURORA','ABISMO','ESTRELLA','LUNA','SOL','BOSQUE','OCÉANO','ARENA','CIELO','TIERRA','CRISTAL','ACERO','MÁRMOL','ÓPALO','VENENO'];

const GACHA_COST = 5; // PINK, fijo (no sube)

let uidCounter = 1;

export const Cosmetics = {
inventory: [],       // [{ uid, type:'base'|'secondary'|'sound', value, name, rarity }]
equipped: {},        // { heroId: { base: uid|null, secondary: uid|null, sound: uid|null } }

init(saved) {
if (saved) {
this.inventory = saved.inventory || [];
this.equipped = saved.equipped || {};
uidCounter = saved.uidCounter || (this.inventory.length + 1);
} else {
this.inventory = [];
this.equipped = {};
}
},

// ---- COSTE FIJO (no sube con inventario) ----
cost() { return GACHA_COST; },

// ---- GENERAR COLOR ALEATORIO (hex random) ----
_randomColor() {
const hex = '#' + Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0');
return { hex, name: hex.toUpperCase() };
},

// ---- ROLL DE GACHA ----
roll() {
const rollType = Math.random();
let type, value, name;
let rarity;

// Elegir rareza ponderada
const totalW = [50, 25, 15, 7, 2.5, 0.5].reduce((a, b) => a + b, 0);
let r = Math.random() * totalW;
rarity = 0;
const weights = [50, 25, 15, 7, 2.5, 0.5];
for (let i = 0; i < weights.length; i++) {
r -= weights[i];
if (r <= 0) { rarity = i; break; }
}

if (rollType < 0.40) {
// Color base (40%)
type = 'base';
const col = this._randomColor();
value = col.hex;
name = col.name;
} else if (rollType < 0.80) {
// Color secundario (40%)
type = 'secondary';
const col = this._randomColor();
value = col.hex;
name = col.name;
} else {
// Sonido (20%)
type = 'sound';
const snd = SOUND_POOL[Math.floor(Math.random() * SOUND_POOL.length)];
value = snd.id;
name = snd.name;
}

const item = { uid: uidCounter++, type, value, name, rarity };
this.inventory.push(item);
Bus.emit('cosmeticRolled', { item });
return item;
},

// ---- COMPRAR GACHA ----
buy() {
if (!Resources.spend('PINK', this.cost())) return null;
return this.roll();
},

// ---- EQUIPAR ----
equip(heroId, slot, uid) {
if (!this.equipped[heroId]) this.equipped[heroId] = { base: null, secondary: null, sound: null };
this.equipped[heroId][slot] = uid;
Bus.emit('cosmeticChanged', { heroId });
},

// ---- DESEQUIPAR ----
unequip(heroId, slot) {
if (!this.equipped[heroId]) return;
this.equipped[heroId][slot] = null;
Bus.emit('cosmeticChanged', { heroId });
},

// ---- OBTENER COLORES DE UN HÉROE ----
getColors(heroId) {
const eq = this.equipped[heroId] || { base: null, secondary: null, sound: null };
let primary = '#000', secondary = '#fff';
if (eq.base) {
const item = this.inventory.find(i => i.uid === eq.base);
if (item) primary = item.value;
}
if (eq.secondary) {
const item = this.inventory.find(i => i.uid === eq.secondary);
if (item) secondary = item.value;
}
return { primary, secondary };
},

// ---- OBTENER SONIDO DE UN HÉROE ----
getSound(heroId) {
const eq = this.equipped[heroId] || { base: null, secondary: null, sound: null };
if (eq.sound) {
const item = this.inventory.find(i => i.uid === eq.sound);
if (item) return item.value;
}
return 'default';
},

// ---- HELPERS ----
getItem(uid) { return this.inventory.find(i => i.uid === uid); },
getEquipped(heroId) { return this.equipped[heroId] || { base: null, secondary: null, sound: null }; },
rarityColor(r) { return ['#333','#666','#E53935','#9C27B0','#FFD700','#FFD700'][r]; },
rarityName(r) { return ['COMÚN','POCO COMÚN','RARO','ÉPICO','LEGENDARIO','MÍTICO'][r]; },

serialize() {
return {
inventory: this.inventory,
equipped: this.equipped,
uidCounter
};
}
};