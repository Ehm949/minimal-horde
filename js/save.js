import { Settings } from './settings.js';
import { Resources } from './resources.js';
import { Heroes } from './heroes.js';
import { Trees } from './heroTree.js';
import { World } from './world.js';
import { Accelerator } from './inventory.js';
import { Track, Missions } from './missions.js';
import { Achievements } from './achievements.js';
import { LevelUps } from './levelUps.js';
import { Rebirth } from './rebirth.js';
import { Shop } from './shop.js';
import { Legacy } from './legacyTree.js';
import { Modifiers } from './modifiers.js';
import { Cosmetics } from './cosmetics.js';

const KEY = 'mhs_save';
const ser = m => (m && typeof m.serialize === 'function') ? m.serialize() : undefined;

export const Save = {
wiping: false,
read() {
try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; }
catch (e) { return null; }
},
write() {
if (this.wiping) return;
try {
localStorage.setItem(KEY, JSON.stringify({
ts: Date.now(),
settings: ser(Settings), res: Resources.data, heroes: ser(Heroes),
trees: ser(Trees), world: ser(World), forge: ser(Accelerator),
track: ser(Track), missions: ser(Missions), ach: ser(Achievements),
levelUps: ser(LevelUps), rebirth: ser(Rebirth), shop: ser(Shop),
legacy: ser(Legacy), modifiers: ser(Modifiers),
cosmetics: ser(Cosmetics),
foresight: Rebirth.foresight || 0,
accelerator: Accelerator.level || 0,
accumulated: LevelUps.accumulated || 0
}));
} catch (e) {}
},
wipe() {
this.wiping = true;
try {
localStorage.removeItem(KEY);
localStorage.removeItem('mhs_tutorial_done');
localStorage.removeItem('mhs_lang');
} catch (e) {}
location.reload();
}
};