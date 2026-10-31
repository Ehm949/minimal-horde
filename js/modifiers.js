import { Resources } from './resources.js';
import { Bus } from './events.js';
import { getLang } from './localization.js';

// ============================================================
// MULTIPLICADORES Y PROBABILIDADES DE RAREZA
// ============================================================
const RARITY_MUL = [1.0, 1.3, 1.6, 2.0, 2.5, 3.0];
// Reductor de penalización: cuanto más raro, MENOS contra
// Común=100% contra → Mítico=35% contra
const CONTRA_MUL = [1.0, 0.9, 0.8, 0.65, 0.5, 0.35];
const RARITY_W   = [50, 25, 15, 7, 2.5, 0.5];

// Stats que puede elegir el modificador EQUILIBRIO
const BALANCE_STATS = ['dmg','hp','atk','speed','range','crit','critdmg','xp','cur','luck','armor','dodge','life','regen','pierce','proj'];

// ============================================================
// POOL DE MODIFICADORES (~75)
// pros/contras: [[stat, min, max], ...]
// minRarity: rareza mínima para que aparezca (0=Común, 3=Épico)
// ============================================================
const MOD_POOL = [
// ---- DAÑO Y ATAQUE ----
{ id:'furia',      sym:'†', name:'FURIA',      minRarity:0, pros:[['dmg',15,35]],       contras:[['hp',-25,-10]] },
{ id:'cadencia',   sym:'‡', name:'CADENCIA',   minRarity:0, pros:[['atk',10,25]],       contras:[['dmg',-18,-8]] },
{ id:'golpeSeco',  sym:'×', name:'GOLPE SECO', minRarity:0, pros:[['dmg',25,50]],       contras:[['atk',-35,-20]] },
{ id:'vidrio',     sym:'▽', name:'VIDRIO',     minRarity:1, pros:[['dmg',20,45]],       contras:[['armor',-40,-20]] },
{ id:'sobrecarga', sym:'!', name:'SOBRECARGA', minRarity:2, pros:[['dmg',30,60]],       contras:[['hp',-20,-10],['atk',-20,-10]] },
// ---- CRÍTICO ----
{ id:'cristal',    sym:'◇', name:'CRISTAL',    minRarity:0, pros:[['critdmg',50,150]],  contras:[['crit',-30,-15]] },
{ id:'precision',  sym:'◎', name:'PRECISIÓN',  minRarity:0, pros:[['crit',15,40]],      contras:[['atk',-30,-15]] },
{ id:'filo',       sym:'◈', name:'FILO',       minRarity:1, pros:[['crit',10,20],['critdmg',20,40]], contras:[['dmg',-25,-15]] },
// ---- PROYECTILES Y PERFORACIÓN ----
{ id:'multiBala',  sym:'+', name:'MULTI-BALA',     minRarity:1, pros:[['proj',1,1]],       contras:[['dmg',-35,-25]] },
{ id:'disparoDoble',sym:'=',name:'DISPARO DOBLE',  minRarity:1, pros:[['proj',1,1]],       contras:[['range',-35,-20]] },
{ id:'escopeta',   sym:'≡', name:'ESCOPETA',       minRarity:2, pros:[['proj',2,2]],       contras:[['range',-60,-40]] },
{ id:'perforante', sym:'→', name:'PERFORANTE',     minRarity:0, pros:[['pierce',1,1]],     contras:[['atk',-25,-15]] },
{ id:'atraviesa',  sym:'↠', name:'ATRAVIESA',      minRarity:1, pros:[['pierce',2,2]],     contras:[['dmg',-35,-20]] },
{ id:'punzon',     sym:'⊶', name:'PUNZÓN',         minRarity:2, pros:[['pierce',2,2]],     contras:[['atk',-40,-25]] },
{ id:'fusil',      sym:'║', name:'FUSIL',          minRarity:0, pros:[['range',30,60]],    contras:[['atk',-35,-20]] },
{ id:'largoAlcance',sym:'↔',name:'LARGO ALCANCE',  minRarity:0, pros:[['range',25,50]],    contras:[['dmg',-20,-10]] },
{ id:'cortoAlcance',sym:'↕',name:'CORTO ALCANCE',  minRarity:0, pros:[['atk',20,40]],      contras:[['range',-50,-30]] },
{ id:'balaFugaz',  sym:'⇉', name:'BALA FUGAZ',     minRarity:2, pros:[['pierce',1,1],['proj',1,1]], contras:[['dmg',-40,-25]] },
// ---- DRONES ----
{ id:'enjambre',   sym:'∴', name:'ENJAMBRE',       minRarity:1, pros:[['drones',1,1]],     contras:[['droneDmg',-40,-25]] },
{ id:'dronPesado', sym:'◆', name:'DRON PESADO',    minRarity:1, pros:[['droneDmg',40,80]], contras:[['drones',-1,-1]] },
{ id:'colmena',    sym:'∵', name:'COLMENA',        minRarity:2, pros:[['drones',2,2]],     contras:[['droneDmg',-60,-40]] },
{ id:'dronLetal',  sym:'⊙', name:'DRON LETAL',     minRarity:1, pros:[['droneDmg',30,60]], contras:[['drones',-1,-1]] },
{ id:'dronExtra',  sym:'⊕', name:'DRON EXTRA',     minRarity:0, pros:[['drones',1,1]],     contras:[['dmg',-20,-10]] },
// ---- SUPERVIVENCIA ----
{ id:'tanque',     sym:'Ω', name:'TANQUE',         minRarity:0, pros:[['hp',30,80]],       contras:[['speed',-40,-20]] },
{ id:'espectral',  sym:'ψ', name:'ESPECTRAL',      minRarity:0, pros:[['dodge',10,30]],    contras:[['hp',-50,-25]] },
{ id:'vampirismo', sym:'V', name:'VAMPIRISMO',     minRarity:1, pros:[['life',3,8]],       contras:[['dmg',-20,-10]] },
{ id:'regeneracion',sym:'R',name:'REGENERACIÓN',   minRarity:0, pros:[['regen',1,3]],      contras:[['atk',-30,-15]] },
{ id:'escudo',     sym:'Σ', name:'ESCUDO',         minRarity:1, pros:[['shield',10,25]],   contras:[['speed',-30,-15]] },
{ id:'blindaje',   sym:'Φ', name:'BLINDAJE',       minRarity:0, pros:[['armor',15,35]],    contras:[['dmg',-25,-10]] },
{ id:'veloz',      sym:'λ', name:'VELOZ',          minRarity:0, pros:[['speed',30,80]],    contras:[['range',-40,-20]] },
{ id:'agilidad',   sym:'μ', name:'AGILIDAD',       minRarity:0, pros:[['speed',20,50]],    contras:[['hp',-30,-15]] },
{ id:'resistencia',sym:'ξ', name:'RESISTENCIA',    minRarity:1, pros:[['armor',20,40]],    contras:[['speed',-45,-25]] },
{ id:'fortaleza',  sym:'Π', name:'FORTALEZA',      minRarity:0, pros:[['hp',40,90]],       contras:[['atk',-35,-20]] },
// ---- ECONOMÍA Y XP ----
{ id:'avaricia',   sym:'§', name:'AVARICIA',       minRarity:0, pros:[['cur',20,50]],      contras:[['armor',-20,-10]] },
{ id:'fortuna',    sym:'¤', name:'FORTUNA',        minRarity:0, pros:[['cur',15,40]],      contras:[['dmg',-25,-10]] },
{ id:'mercader',   sym:'€', name:'MERCADER',       minRarity:0, pros:[['cur',25,55]],      contras:[['xp',-40,-20]] },
{ id:'erudito',    sym:'∴', name:'ERUDITO',        minRarity:0, pros:[['xp',25,55]],       contras:[['cur',-40,-20]] },
{ id:'oroCircular',sym:'Θ', name:'ORO CIRCULAR',   minRarity:0, pros:[['curCIR',30,60]],   contras:[['curTRI',-45,-25]] },
{ id:'oroTriangular',sym:'Λ',name:'ORO TRIANGULAR',minRarity:0, pros:[['curTRI',30,60]],   contras:[['curCUA',-45,-25]] },
{ id:'oroCuadrado',sym:'Ξ', name:'ORO CUADRADO',   minRarity:0, pros:[['curCUA',30,60]],   contras:[['curHEX',-45,-25]] },
{ id:'oroHexagonal',sym:'Ψ',name:'ORO HEXAGONAL',  minRarity:0, pros:[['curHEX',30,60]],   contras:[['curPEN',-45,-25]] },
{ id:'oroPentagonal',sym:'Φ',name:'ORO PENTAGONAL',minRarity:0, pros:[['curPEN',30,60]],   contras:[['curPUR',-45,-25]] },
{ id:'oroMorado',  sym:'◈', name:'ORO MORADO',     minRarity:0, pros:[['curPUR',30,60]],   contras:[['curCIR',-45,-25]] },
// ---- UTILIDAD Y SUERTE ----
{ id:'suerteNegra',sym:'♠', name:'SUERTE NEGRA',   minRarity:0, pros:[['luck',2,6]],       contras:[['xp',-40,-15]] },
{ id:'suerteRoja', sym:'♥', name:'SUERTE ROJA',    minRarity:0, pros:[['luck',2,5]],       contras:[['dmg',-20,-10]] },
{ id:'vision',     sym:'◐', name:'VISIÓN',         minRarity:0, pros:[['range',20,40]],    contras:[['dmg',-20,-10]] },
{ id:'impaciente', sym:'»', name:'IMPACIENTE',     minRarity:0, pros:[['atk',15,30]],      contras:[['xp',-35,-20]] },
{ id:'paciente',   sym:'«', name:'PACIENTE',       minRarity:0, pros:[['xp',20,35]],       contras:[['atk',-30,-15]] },
{ id:'equilibrio', sym:'≈', name:'EQUILIBRIO',     minRarity:0, special:'balance' },
{ id:'caotico',    sym:'∞', name:'CAÓTICO',        minRarity:1, pros:[['chaos',50,100]],   contras:[['dmg',-20,-10]] },
{ id:'berserker',  sym:'Δ', name:'BERSERKER',      minRarity:1, pros:[['berserk',1,2]],    contras:[['hp',-30,-15]] },
// ---- VS TIPO DE ENEMIGO (ofensivo) ----
{ id:'azoteCircular',sym:'●',name:'AZOTE CIRCULAR',  minRarity:0, pros:[['vsCircle',30,60]],   contras:[['vsTriangle',-40,-20]] },
{ id:'azoteTriangular',sym:'▲',name:'AZOTE TRIANGULAR',minRarity:0,pros:[['vsTriangle',30,60]], contras:[['vsSquare',-40,-20]] },
{ id:'azoteCuadrado',sym:'■', name:'AZOTE CUADRADO',  minRarity:0, pros:[['vsSquare',30,60]],   contras:[['vsHexagon',-40,-20]] },
{ id:'azoteHexagonal',sym:'⬢',name:'AZOTE HEXAGONAL', minRarity:0, pros:[['vsHexagon',30,60]],  contras:[['vsPentagon',-40,-20]] },
{ id:'azotePentagonal',sym:'⬟',name:'AZOTE PENTAGONAL',minRarity:0,pros:[['vsPentagon',30,60]], contras:[['vsPurple',-40,-20]] },
{ id:'azoteMorado',sym:'◉', name:'AZOTE MORADO',    minRarity:0, pros:[['vsPurple',30,60]],   contras:[['vsCircle',-40,-20]] },
{ id:'matagigantes',sym:'☠',name:'MATAGIGANTES',    minRarity:1, pros:[['bossDmg',40,100]],   contras:[['dmg',-40,-20]] },
{ id:'castigador', sym:'‡', name:'CASTIGADOR',      minRarity:1, pros:[['eliteDmg',40,100]],  contras:[['hp',-30,-15]] },
// ---- VS TIPO DE ENEMIGO (defensivo) ----
{ id:'pielCircular',sym:'○', name:'PIEL CIRCULAR',   minRarity:0, pros:[['recCircle',-35,-15]],   contras:[['recTriangle',25,10]] },
{ id:'pielTriangular',sym:'△',name:'PIEL TRIANGULAR',minRarity:0, pros:[['recTriangle',-35,-15]], contras:[['recSquare',25,10]] },
{ id:'pielCuadrada',sym:'□', name:'PIEL CUADRADA',   minRarity:0, pros:[['recSquare',-35,-15]],   contras:[['recHexagon',25,10]] },
{ id:'pielHexagonal',sym:'⬡',name:'PIEL HEXAGONAL',  minRarity:0, pros:[['recHexagon',-35,-15]],  contras:[['recPentagon',25,10]] },
{ id:'pielPentagonal',sym:'⬠',name:'PIEL PENTAGONAL',minRarity:0, pros:[['recPentagon',-35,-15]], contras:[['recPurple',25,10]] },
{ id:'pielMorada', sym:'◍', name:'PIEL MORADA',     minRarity:0, pros:[['recPurple',-35,-15]],   contras:[['recCircle',25,10]] },
{ id:'muralla',    sym:'⊘', name:'MURALLA',         minRarity:1, pros:[['recCircle',-25,-10],['recSquare',-25,-10]], contras:[['recTriangle',20,10],['recHexagon',20,10]] },
{ id:'fortin',     sym:'⊗', name:'FORTÍN',          minRarity:1, pros:[['recTriangle',-25,-10],['recPentagon',-25,-10]], contras:[['recCircle',20,10],['recPurple',20,10]] },
// ---- COMBOS ÉPICO+ (2 pros, 2 contras) ----
{ id:'pesado',     sym:'W', name:'PESADO',     minRarity:3, pros:[['dmg',10,20],['hp',15,30]],     contras:[['speed',-35,-20],['atk',-25,-15]] },
{ id:'ligero',     sym:'w', name:'LIGERO',     minRarity:3, pros:[['speed',15,25],['atk',10,20]],  contras:[['hp',-40,-25],['dmg',-25,-15]] },
{ id:'oscilante',  sym:'±', name:'OSCILANTE',  minRarity:3, pros:[['atk',10,20],['dmg',10,20]],    contras:[['hp',-15,-10],['speed',-15,-10]] },
{ id:'nova',       sym:'⊛', name:'NOVA',       minRarity:3, pros:[['critdmg',30,60],['crit',10,20]], contras:[['atk',-35,-20],['range',-30,-15]] },
{ id:'pulso',      sym:'⊜', name:'PULSO',      minRarity:3, pros:[['atk',15,25],['proj',1,1]],     contras:[['dmg',-40,-25],['range',-30,-15]] },
{ id:'eterno',     sym:'∞', name:'ETERNO',     minRarity:3, pros:[['regen',1,2],['hp',20,35]],     contras:[['dmg',-35,-20],['atk',-25,-15]] },
{ id:'artillero',  sym:'⊶', name:'ARTILLERO',  minRarity:3, pros:[['proj',1,1],['pierce',1,1]],    contras:[['dmg',-35,-20],['atk',-30,-15]] },
{ id:'bastion',    sym:'⊷', name:'BASTIÓN',    minRarity:3, pros:[['hp',25,40],['armor',15,25]],   contras:[['speed',-35,-20],['dmg',-25,-15]] },
{ id:'cazador',    sym:'⊹', name:'CAZADOR',    minRarity:3, pros:[['vsCircle',20,35],['vsTriangle',20,35]], contras:[['vsSquare',-30,-15],['vsHexagon',-30,-15]] },
{ id:'antimorado', sym:'⊺', name:'ANTIMORADO', minRarity:3, pros:[['vsPurple',30,50],['recPurple',-25,-10]], contras:[['dmg',-25,-15],['hp',-25,-15]] },
];

// ============================================================
// TEXTO DE STATS (para descripciones)
// ============================================================
const STAT_TEXT = {
dmg:'{v}% daño', hp:'{v}% vida', atk:'{v}% cadencia', speed:'{v}% velocidad',
range:'{v}% alcance', crit:'{v}% prob.crit', critdmg:'{v}% dmg.crit',
xp:'{v}% experiencia', cur:'{v}% botín', luck:'{v} suerte',
armor:'{v}% daño recibido', dodge:'{v}% esquiva', life:'{v}% vampirismo',
regen:'{v}% vida/s', shield:'{v}% escudo', pierce:'{v} perforación', proj:'{v} proyectiles',
bossDmg:'{v}% daño a jefes', eliteDmg:'{v}% daño a élites',
vsCircle:'{v}% daño a círculos', vsTriangle:'{v}% daño a triángulos',
vsSquare:'{v}% daño a cuadrados', vsHexagon:'{v}% daño a hexágonos',
vsPentagon:'{v}% daño a pentágonos', vsPurple:'{v}% daño a morados',
curCIR:'{v}% CIR', curTRI:'{v}% TRI', curCUA:'{v}% CUA',
curHEX:'{v}% HEX', curPEN:'{v}% PEN', curPUR:'{v}% PUR',
recCircle:'{v}% daño recibido de círculos', recTriangle:'{v}% daño recibido de triángulos',
recSquare:'{v}% daño recibido de cuadrados', recHexagon:'{v}% daño recibido de hexágonos',
recPentagon:'{v}% daño recibido de pentágonos', recPurple:'{v}% daño recibido de morados',
drones:'{v} drones', droneDmg:'{v}% daño de drones',
chaos:'Daño aleatorio ±{v}%', berserk:'+{v}% daño por 1% vida perdida',
};

// ---- TRADUCCIÓN DE NOMBRES DE MODIFICADORES ----
const MOD_NAMES_EN = {
furia:'FURY', cadencia:'CADENCE', golpeSeco:'DRY STRIKE', vidrio:'GLASS', sobrecarga:'OVERLOAD',
cristal:'CRYSTAL', precision:'PRECISION', filo:'EDGE',
multiBala:'MULTI-SHOT', disparoDoble:'DOUBLE SHOT', escopeta:'SHOTGUN', perforante:'PIERCING',
atraviesa:'PENETRATOR', punzon:'AWL', fusil:'RIFLE', largoAlcance:'LONG RANGE',
cortoAlcance:'SHORT RANGE', balaFugaz:'FLEETING BULLET',
enjambre:'SWARM', dronPesado:'HEAVY DRONE', colmena:'HIVE', dronLetal:'LETHAL DRONE', dronExtra:'EXTRA DRONE',
tanque:'TANK', espectral:'SPECTRAL', vampirismo:'VAMPIRISM', regeneracion:'REGENERATION',
escudo:'SHIELD', blindaje:'ARMOR', veloz:'SWIFT', agilidad:'AGILITY',
resistencia:'RESISTANCE', fortaleza:'FORTRESS',
avaricia:'GREED', fortuna:'FORTUNE', mercader:'MERCHANT', erudito:'SCHOLAR',
oroCircular:'CIRCLE GOLD', oroTriangular:'TRIANGLE GOLD', oroCuadrado:'SQUARE GOLD',
oroHexagonal:'HEXAGON GOLD', oroPentagonal:'PENTAGON GOLD', oroMorado:'PURPLE GOLD',
suerteNegra:'BLACK LUCK', suerteRoja:'RED LUCK', vision:'VISION',
impaciente:'IMPATIENT', paciente:'PATIENT', equilibrio:'BALANCE', caotico:'CHAOTIC', berserker:'BERSERKER',
azoteCircular:'CIRCLE SCOURGE', azoteTriangular:'TRIANGLE SCOURGE', azoteCuadrado:'SQUARE SCOURGE',
azoteHexagonal:'HEXAGON SCOURGE', azotePentagonal:'PENTAGON SCOURGE', azoteMorado:'PURPLE SCOURGE',
matagigantes:'GIANT SLAYER', castigador:'PUNISHER',
pielCircular:'CIRCLE SKIN', pielTriangular:'TRIANGLE SKIN', pielCuadrada:'SQUARE SKIN',
pielHexagonal:'HEXAGON SKIN', pielPentagonal:'PENTAGON SKIN', pielMorada:'PURPLE SKIN',
muralla:'WALL', fortin:'FORT',
pesado:'HEAVY', ligero:'LIGHT', oscilante:'OSCILLATING', nova:'NOVA',
pulso:'PULSE', eterno:'ETERNAL', artillero:'ARTILLERIST', bastion:'BASTION',
cazador:'HUNTER', antimorado:'ANTI-PURPLE'
};

let uidCounter = 1;

// ============================================================
// OBJETO PRINCIPAL
// ============================================================
export const Modifiers = {
inventory: [],       // [{ uid, poolId, sym, name, rarity, pros:[[stat,val],...], contras:[[stat,val],...] }]
equipped: {},        // { heroId: [uid1, uid2] }
gachaCount: 0,

init(saved) {
if (saved) {
this.inventory = saved.inventory || [];
this.equipped = saved.equipped || {};
this.gachaCount = saved.gachaCount || 0;
uidCounter = saved.uidCounter || (this.inventory.length + 1);
} else {
this.inventory = [];
this.equipped = {};
this.gachaCount = 0;
}
},

// ---- COSTE DEL GACHA: base 10 PUR + 5% por cada mod en inventario ----
cost() {
return Math.max(1, Math.round(10 * (1 + 0.05 * this.inventory.length)));
},

// ---- TIRAR UN VALOR DENTRO DEL RANGO, CON RAREZA Y VARIABILIDAD ----
_rollPro(min, max, rarity) {
const base = min + Math.random() * (max - min);
const mul = RARITY_MUL[rarity];
const variance = 0.8 + Math.random() * 0.4;
return Math.round(base * mul * variance * 10) / 10;
},

_rollCon(min, max, rarity) {
const base = min + Math.random() * (max - min);
const mul = RARITY_MUL[rarity] * CONTRA_MUL[rarity];   // ← penalización reducida
const variance = 0.8 + Math.random() * 0.4;
return Math.round(base * mul * variance * 10) / 10;
},

// ---- GENERAR UN MODIFICADOR ALEATORIO ----
roll() {
// 1) Elegir rareza ponderada
const total = RARITY_W.reduce((a, b) => a + b, 0);
let r = Math.random() * total, rarity = 0;
for (let i = 0; i < RARITY_W.length; i++) {
r -= RARITY_W[i];
if (r <= 0) { rarity = i; break; }
}
// 2) Filtrar pool por rareza mínima
const avail = MOD_POOL.filter(m => m.minRarity <= rarity);
const def = avail[Math.floor(Math.random() * avail.length)];
// 3) Generar pros y contras
let pros = [], contras = [];
if (def.special === 'balance') {
// EQUILIBRIO: +X% a un stat aleatorio, -X% a otro
const shuffled = [...BALANCE_STATS].sort(() => Math.random() - 0.5);
const statPro = shuffled[0], statCon = shuffled[1];
const valPro = this._rollPro(10, 20, rarity);
const valCon = -Math.abs(this._rollCon(10, 20, rarity));
pros = [[statPro, valPro]];
contras = [[statCon, valCon]];
} else {
pros = def.pros.map(([s, mn, mx]) => [s, this._rollPro(mn, mx, rarity)]);
contras = def.contras.map(([s, mn, mx]) => [s, this._rollCon(mn, mx, rarity)]);
}
const mod = {
uid: uidCounter++,
poolId: def.id,
sym: def.sym,
name: def.name,
rarity,
pros,
contras
};
this.inventory.push(mod);
this.gachaCount++;
Bus.emit('modRolled', { mod });
return mod;
},

// ---- COMPRAR GACHA ----
buy() {
const cost = this.cost();
if (!Resources.spend('PUR', cost)) return null;
return this.roll();
},

// ---- EQUIPAR / DESEQUIPAR ----
equip(heroId, slot, uid) {
if (!this.equipped[heroId]) this.equipped[heroId] = [null, null];
// Si el mod ya está en otro slot del mismo héroe, intercambiar
const idx = this.equipped[heroId].indexOf(uid);
if (idx >= 0 && idx !== slot) {
this.equipped[heroId][idx] = this.equipped[heroId][slot];
}
this.equipped[heroId][slot] = uid;
Bus.emit('modChanged', { heroId });
},

unequip(heroId, slot) {
if (!this.equipped[heroId]) return;
this.equipped[heroId][slot] = null;
Bus.emit('modChanged', { heroId });
},

// ---- FUSIÓN: 3 misma rareza → 1 superior ----
canFuse(uids) {
if (uids.length !== 3) return false;
const mods = uids.map(u => this.inventory.find(m => m.uid === u)).filter(Boolean);
if (mods.length !== 3) return false;
if (mods[0].rarity >= 5) return false; // mítico no se fusiona
return mods.every(m => m.rarity === mods[0].rarity);
},

fuse(uids) {
if (!this.canFuse(uids)) return null;
const mods = uids.map(u => this.inventory.find(m => m.uid === u));
const rarity = mods[0].rarity;
// Quitar del inventario y de cualquier slot equipado
for (const uid of uids) {
this.inventory = this.inventory.filter(m => m.uid !== uid);
for (const hid in this.equipped) {
this.equipped[hid] = this.equipped[hid].map(u => u === uid ? null : u);
}
}
// Generar uno nuevo de la siguiente rareza
const avail = MOD_POOL.filter(m => m.minRarity <= rarity + 1);
const def = avail[Math.floor(Math.random() * avail.length)];
let pros = [], contras = [];
if (def.special === 'balance') {
const shuffled = [...BALANCE_STATS].sort(() => Math.random() - 0.5);
const valPro = this._rollPro(10, 20, rarity + 1);
const valCon = Math.abs(this._rollCon(10, 20, rarity + 1));
pros = [[shuffled[0], valPro]];
contras = [[shuffled[1], -valCon]];
} else {
pros = def.pros.map(([s, mn, mx]) => [s, this._rollPro(mn, mx, rarity + 1)]);
contras = def.contras.map(([s, mn, mx]) => [s, this._rollCon(mn, mx, rarity + 1)]);
}
const mod = {
uid: uidCounter++,
poolId: def.id,
sym: def.sym,
name: def.name,
rarity: rarity + 1,
pros,
contras
};
this.inventory.push(mod);
Bus.emit('modFused', { mod });
return mod;
},

// ---- OBTENER EFECTOS COMBINADOS DE UN HÉROE ----
getEffects(heroId) {
const slots = this.equipped[heroId] || [null, null];
const fx = {};
for (const uid of slots) {
if (!uid) continue;
const mod = this.inventory.find(m => m.uid === uid);
if (!mod) continue;
for (const [stat, val] of mod.pros) fx[stat] = (fx[stat] || 0) + val;
for (const [stat, val] of mod.contras) fx[stat] = (fx[stat] || 0) + val;
}
return fx;
},

// ---- HELPERS PARA UI ----
getMod(uid) { return this.inventory.find(m => m.uid === uid); },
getEquipped(heroId) { return this.equipped[heroId] || [null, null]; },
rarityColor(r) { return ['#000','#666','#E53935','#9C27B0','#E53935','#9C27B0'][r]; },
rarityName(r) { return ['COMÚN','POCO COMÚN','RARO','ÉPICO','LEGENDARIO','MÍTICO'][r]; },

// ---- COLOR DEL MODIFICADOR (para aura en combate) ----
getModColor(mod) {
const stat = mod.pros[0] ? mod.pros[0][0] : 'dmg';
const colorMap = {
dmg: '#E53935', hp: '#4CAF50', atk: '#FF6D00', speed: '#2196F3',
range: '#00BCD4', crit: '#FFD700', critdmg: '#FFC107',
xp: '#8BC34A', cur: '#FFC107', luck: '#E040FB',
armor: '#607D8B', dodge: '#B2EBF2', life: '#F44336',
regen: '#66BB6A', shield: '#90A4AE', pierce: '#FF8A65',
proj: '#FF7043', bossDmg: '#B71C1C', eliteDmg: '#D32F2F',
vsCircle: '#00BCD4', vsTriangle: '#00BCD4', vsSquare: '#00BCD4',
vsHexagon: '#00BCD4', vsPentagon: '#00BCD4', vsPurple: '#00BCD4',
recCircle: '#607D8B', recTriangle: '#607D8B', recSquare: '#607D8B',
recHexagon: '#607D8B', recPentagon: '#607D8B', recPurple: '#607D8B',
curCIR: '#FFD700', curTRI: '#FFD700', curCUA: '#FFD700',
curHEX: '#FFD700', curPEN: '#FFD700', curPUR: '#FFD700',
drones: '#2196F3', droneDmg: '#2196F3',
chaos: '#E040FB', berserk: '#FF1744'
};
return colorMap[stat] || '#9C27B0';
},

// ---- DESCRIPCIÓN DE UN MODIFICADOR ----
desc(mod) {
const fmt = (arr) => arr.map(([s, v]) => {
const txt = STAT_TEXT[s] || '{v} ' + s;
return txt.replace('{v}', v > 0 ? '+' + v : v);
});
return { pros: fmt(mod.pros), contras: fmt(mod.contras) };
},

serialize() {
return {
inventory: this.inventory,
equipped: this.equipped,
gachaCount: this.gachaCount,
uidCounter
};
}
};

// ---- NOMBRE TRADUCIDO DE UN MODIFICADOR ----
export function getModDisplayName(mod) {
if (getLang() === 'en' && MOD_NAMES_EN[mod.poolId]) return MOD_NAMES_EN[mod.poolId];
return mod.name;
}