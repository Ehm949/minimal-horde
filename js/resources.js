import { Bus } from './events.js';

export const RES_META = {
  CIR: { name: 'Círculos',   shape: 'circle' },
  TRI: { name: 'Triángulos', shape: 'tri' },
  CUA: { name: 'Cuadrados',  shape: 'square' },
  HEX: { name: 'Hexágonos',  shape: 'hex' },
  PEN: { name: 'Pentágonos', shape: 'penta' },
  PUR: { name: 'Púrpura',    shape: 'circle', purple: true },
  ORO: { name: 'Oro',        shape: 'circle', gold: true }
};

export const CUR_KEYS = ['CIR', 'TRI', 'CUA', 'HEX', 'PEN', 'PUR', 'ORO'];

export const Resources = {
  data: { CIR: 10, TRI: 0, CUA: 0, HEX: 0, PEN: 0, PUR: 0, ORO: 0, PINK: 0 },
  rates: {}, _acc: {},
  add(k, v) {
    if (!v) return;
    this.data[k] = (this.data[k] || 0) + v;
    if (v > 0) { this._acc[k] = (this._acc[k] || 0) + v; Bus.emit('gain', { k, v }); }
    Bus.emit('resChanged', { k, v });
  },
  has(k, v) { return (this.data[k] || 0) >= v; },
  spend(k, v) {
    if (!this.has(k, v)) return false;
    this.data[k] -= v;
    Bus.emit('resChanged', { k, v: -v });
    return true;
  },
  flushRates() { this.rates = { ...this._acc }; this._acc = {}; }
};