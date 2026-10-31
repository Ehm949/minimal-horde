import { Resources } from './resources.js';
import { Bus } from './events.js';

export const Accelerator = {
level: 0,

init(lv = 0) { this.level = lv || 0; },

cost() { return 1 + this.level; },
spawnMul() { return 1 + 0.02 * this.level; },

buy() {
const cost = this.cost();
if (!Resources.spend('PUR', cost)) return false;
this.level++;
Bus.emit('accelUp', { level: this.level });
Bus.emit('toast', { msg: `+2% ENEMIGOS · -${cost} PUR` });
return true;
},

serialize() { return this.level; }
};