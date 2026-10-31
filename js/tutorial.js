import { Bus } from './events.js';
import { t } from './localization.js';
import { isStarted } from './cover.js';

const KEY = 'mhs_tutorial_done';

const STEPS = [
  { sel: '#battle-wrap', key: 'combat' },
  { sel: '#tree-wrap',   key: 'tree' },
  { sel: '#hud',         key: 'hud' }
];

function renderMd(str) {
  const esc = String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return esc.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
}

function ensureDom() {
  let el = document.getElementById('tutorial');
  if (!el) {
    el = document.createElement('div');
    el.id = 'tutorial';
    el.className = 'hidden';
    el.innerHTML =
      '<div id="tut-spot"></div>' +
      '<div id="tut-box">' +
        '<div id="tut-head"><span id="tut-title"></span><span id="tut-count"></span></div>' +
        '<div id="tut-text"></div>' +
        '<button id="tut-skip">OMITIR</button>' +
        '<button id="tut-next">SIGUIENTE</button>' +
      '</div>';
    document.body.appendChild(el);
  }
  // Si ya existía el HTML antiguo sin botón de omitir, lo inyectamos
  if (!el.querySelector('#tut-skip')) {
    const next = el.querySelector('#tut-next');
    const skip = document.createElement('button');
    skip.id = 'tut-skip';
    next.parentElement.insertBefore(skip, next);
  }
  return el;
}

export const Tutorial = {
  active: false, step: 0,
  el: null, spot: null, box: null, titleEl: null, textEl: null,
  nextBtn: null, skipBtn: null, countEl: null,
  _onResize: null,

  shouldRun() { try { return !localStorage.getItem(KEY); } catch (e) { return true; } },
  isActive() { return this.active; },
  reset() { try { localStorage.removeItem(KEY); } catch (e) {} },

  start() {
    if (this.active || !this.shouldRun()) return;
    this.el = ensureDom();
    this.spot = this.el.querySelector('#tut-spot');
    this.box = this.el.querySelector('#tut-box');
    this.titleEl = this.el.querySelector('#tut-title');
    this.textEl = this.el.querySelector('#tut-text');
    this.nextBtn = this.el.querySelector('#tut-next');
    this.skipBtn = this.el.querySelector('#tut-skip');
    this.countEl = this.el.querySelector('#tut-count');
    this.active = true;
    this.step = 0;
    this.el.classList.remove('hidden');
    this.nextBtn.onclick = () => this.advance();
    this.skipBtn.onclick = () => this.finish();
    this._onResize = () => this.show();
    window.addEventListener('resize', this._onResize);
    Bus.emit('pause', true);
    this.show();
  },

  show() {
    const s = STEPS[this.step];
    const target = document.querySelector(s.sel);
    if (!target) { this.advance(); return; }
    const r = target.getBoundingClientRect();
    const pad = 6;
    this.spot.style.left = (r.left - pad) + 'px';
    this.spot.style.top = (r.top - pad) + 'px';
    this.spot.style.width = (r.width + pad * 2) + 'px';
    this.spot.style.height = (r.height + pad * 2) + 'px';
    this.titleEl.textContent = t('tut.' + s.key + '.title');
    this.textEl.innerHTML = renderMd(t('tut.' + s.key + '.text'));
    this.countEl.textContent = (this.step + 1) + '/' + STEPS.length;
    this.nextBtn.textContent = this.step === STEPS.length - 1 ? t('tut.start') : t('tut.next');
    this.skipBtn.textContent = t('tut.skip');
    const bw = this.box.offsetWidth || 360;
    const bh = this.box.offsetHeight || 180;
    let x = r.left + r.width / 2 - bw / 2;
    let y = r.bottom + pad + 14;
    if (y + bh > innerHeight - 10) y = r.top - bh - pad - 14;
    if (y < 10) y = Math.min(innerHeight - bh - 10, r.top + r.height / 2 - bh / 2);
    x = Math.max(10, Math.min(innerWidth - bw - 10, x));
    this.box.style.left = x + 'px';
    this.box.style.top = y + 'px';
  },

  advance() {
    this.step++;
    if (this.step >= STEPS.length) { this.finish(); return; }
    this.show();
  },

  finish() {
    this.active = false;
    this.el.classList.add('hidden');
    window.removeEventListener('resize', this._onResize);
    try { localStorage.setItem(KEY, '1'); } catch (e) {}
    Bus.emit('pause', false);
  }
};

if (typeof window !== 'undefined') window.Tutorial = Tutorial;

const boot = setInterval(() => {
  if (isStarted() && !Tutorial.active && Tutorial.shouldRun()) {
    clearInterval(boot);
    setTimeout(() => Tutorial.start(), 900);
  }
}, 400);