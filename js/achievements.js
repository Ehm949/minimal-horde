import { Bus } from './events.js';
import { Track } from './missions.js';
import { Heroes, Global } from './heroes.js';
import { Accelerator } from './inventory.js';
import { Audio } from './audio.js';
import { t } from './localization.js';
import { Rebirth } from './rebirth.js';

// Métricas de logros: se miden DESDE el último renacimiento (línea base).
// Así los logros se reinician en cada renacimiento aunque Track (récords de por vida) no se toque.
function metrics() {
const b = Rebirth.baseline || {};
const bt = b.byType || {};
return {
kills:  Track.kills  - (b.kills  || 0),
nodes:  Track.nodes  - (b.nodes  || 0),
bosses: Track.bosses - (b.bosses || 0),
dist:   Track.dist   - (b.dist   || 0),
heroes: Heroes.unlockedCount(),
accel:  Accelerator.level,
cir: (Track.byType.circle   || 0) - (bt.circle   || 0),
tri: (Track.byType.triangle || 0) - (bt.triangle || 0),
sq:  (Track.byType.square   || 0) - (bt.square   || 0),
hex: (Track.byType.hexagon  || 0) - (bt.hexagon  || 0),
pen: (Track.byType.pentagon || 0) - (bt.pentagon || 0),
pur: (Track.byType.purple   || 0) - (bt.purple   || 0)
};
}

// [id, nombre, descripcion, claveMetrica, objetivo]
const GEN = [
['kill1', 'PRIMERA SANGRE', 'Elimina tu primer enemigo.', 'kills', 1],
['kill100', 'CAZADOR', 'Elimina 100 enemigos.', 'kills', 100],
['kill1000', 'SEGADOR', 'Elimina 1.000 enemigos.', 'kills', 1000],
['kill2500', 'EXTERMINADOR', 'Elimina 2.500 enemigos.', 'kills', 2500],
['kill50k', 'HORDA ROTA', 'Elimina 50.000 enemigos.', 'kills', 50000],
['node1', 'PRIMER NODO', 'Compra tu primer nodo del árbol.', 'nodes', 1],
['node50', 'ARQUITECTO', 'Compra 50 nodos.', 'nodes', 50],
['node400', 'CARTÓGRAFO', 'Compra 400 nodos.', 'nodes', 400],
['heroes5', 'ESCUADRÓN', 'Desbloquea 5 héroes.', 'heroes', 5],
['heroes16', 'LEGIÓN', 'Desbloquea los 16 héroes.', 'heroes', 16],
['accel5', 'ACELERADO', 'Sube el acelerador 5 veces.', 'accel', 5],
['boss10', 'MATAREYES', 'Derrota 10 jefes.', 'bosses', 10]
];

// [id, nombre, descripcion, heroeQueDesbloquea, claveMetrica, objetivo]
const HERO = [
['h_burst', 'AL GRANO', 'Elimina 150 círculos.', 'burst', 'cir', 150],
['h_machinegun', 'ÁNGULO PERFECTO', 'Elimina 2.500 enemigos.', 'machinegun', 'kills', 2500],
['h_shotgun', 'LLUVIA DE PLOMO', 'Elimina 500 enemigos.', 'shotgun', 'kills', 500],
['h_sniper', 'OJO DE HALCÓN', 'Recorre 1.000 m.', 'sniper', 'dist', 1000],
['h_laser', 'QUEMADURA SOLAR', 'Compra 25 nodos.', 'laser', 'nodes', 25],
['h_ghost', 'ENTRE SOMBRAS', 'Recorre 2.500 m.', 'ghost', 'dist', 2500],
['h_tank', 'MURO INQUEBRANTABLE', 'Derrota 3 jefes.', 'tank', 'bosses', 3],
['h_orbital', 'CONSTELACIÓN', 'Elimina 100 hexágonos.', 'orbital', 'hex', 100],
['h_ricochet', 'EN CADENA', 'Elimina 75 triángulos.', 'ricochet', 'tri', 75],
['h_chakram', 'IDA Y VUELTA', 'Elimina 50 pentágonos.', 'chakram', 'pen', 50],
['h_metralla', 'CAOS ABSOLUTO', 'Elimina 7.500 enemigos.', 'metralla', 'kills', 7500],
['h_fragmento', 'AÑICOS', 'Recorre 10.000 m.', 'fragmento', 'dist', 10000],
['h_centinela', 'VIGILANTE ETERNO', 'Compra 100 nodos.', 'centinela', 'nodes', 100],
['h_graviton', 'POZO SIN FONDO', 'Derrota 10 jefes.', 'graviton', 'bosses', 10],
['h_pulso', 'ONDA FINAL', 'Elimina 25.000 enemigos.', 'pulso', 'kills', 25000],
['h_area', 'NÚCLEO EXPANDIDO', 'Compra 200 nodos.', 'area', 'nodes', 200]
];

export const Achievements = {
unlocked: new Set(),
_t: 0,

init(saved = []) {
this.unlocked = new Set(saved || []);
this._t = 0;
},

// Llamado por game.js cada frame: comprueba logros cada ~0.8 s
update(dt) {
this._t += (typeof dt === 'number' ? dt : 0.5);
if (this._t >= 0.8) {
this._t = 0;
this.check();
}
},

total() { return GEN.length + HERO.length; },
genDefs() { return GEN.map(([id, n, d]) => [id, n, d]); },
heroDefs() { return HERO.map(([id, n, d, h]) => [id, n, d, h]); },

// Progreso 0..1 de un logro (para las barras)
progress(id) {
const m = metrics();
const g = GEN.find(a => a[0] === id);
if (g) return Math.min(1, (m[g[3]] || 0) / g[4]);
const h = HERO.find(a => a[0] === id);
if (h) return Math.min(1, (m[h[4]] || 0) / h[5]);
return 0;
},

// Valor actual y objetivo (para mostrar números)
numbers(id) {
const m = metrics();
const g = GEN.find(a => a[0] === id);
if (g) return { cur: Math.floor(m[g[3]] || 0), max: g[4] };
const h = HERO.find(a => a[0] === id);
if (h) return { cur: Math.floor(m[h[4]] || 0), max: h[5] };
return { cur: 0, max: 1 };
},

check() {
const m = metrics();
for (const [id, , , key, max] of GEN) {
if (!this.unlocked.has(id) && (m[key] || 0) >= max) this._unlockGen(id);
}
for (const [id, , , heroId, key, max] of HERO) {
if (!this.unlocked.has(id) && (m[key] || 0) >= max) this._unlockHero(id, heroId);
}
},

_unlockGen(id) {   // antes era "unlockGen" y check() llamaba "_unlockGen" (bug corregido)
this.unlocked.add(id);
Global.put('dmg', 'ach' + id, { add: 0.005 });
const def = GEN.find(a => a[0] === id);
Bus.emit('toast', { msg: t('toast.ach').replace('{n}', def[1]) });
Bus.emit('achUnlocked', { id });
Audio.ach();
},

_unlockHero(id, heroId) {
this.unlocked.add(id);
const h = Heroes.get(heroId);
if (h && !h.unlocked) { h.unlocked = true; Bus.emit('heroUnlocked', { id: heroId }); }
const def = HERO.find(a => a[0] === id);
Bus.emit('toast', { msg: t('toast.hero').replace('{a}', def[1]).replace('{n}', h ? h.def.name : '') });
Bus.emit('achUnlocked', { id });
Audio.ach();
},

serialize() { return [...this.unlocked]; }
};