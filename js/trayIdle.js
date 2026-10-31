import { clamp } from './utils.js';
import { Heroes } from './heroes.js';
import { Cosmetics } from './cosmetics.js';

// ---- Constantes de reacciones (como en el juego original) ----
const HOP_DURATION = 550;     // ms que dura el saltito
const HOP_HEIGHT = 14;        // px que sube el personaje
const SLEEP_TIMEOUT = 20000;  // ms sin interacción para dormirse
const HOVER_RADIUS = 26;      // radio de hover del cursor
const R = 15;                 // radio del personaje en la zona

const states = new Map();
let cv = null, ctx = null, W = 0, H = 0;
const mouse = { x: -9999, y: -9999, over: false };

function getHop(s) {
  if (!s.hopStart) return { offsetY: 0, scaleX: 1, scaleY: 1 };
  const t = (Date.now() - s.hopStart) / HOP_DURATION;
  if (t >= 1) { s.hopStart = 0; return { offsetY: 0, scaleX: 1, scaleY: 1 }; }
  const air = Math.sin(t * Math.PI);
  return { offsetY: -air * HOP_HEIGHT, scaleX: 1 - air * 0.08, scaleY: 1 + air * 0.15 };
}

export const TrayIdle = {
  init(canvas) {
    cv = canvas; ctx = canvas.getContext('2d');
    canvas.addEventListener('pointermove', e => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.over = true;
    });
    canvas.addEventListener('pointerleave', () => { mouse.over = false; mouse.x = -9999; mouse.y = -9999; });
    this.syncRoster();
  },

  resize(w, h) { W = w; H = h; },

  bounds() { return { minX: 30, maxX: Math.max(60, W - 30), minY: 26, maxY: Math.max(60, H - 42) }; },

  // mantiene el estado idle sincronizado con héroes desbloqueados no activos
  syncRoster() {
    const wanted = new Set();
    for (const h of Heroes.list) if (h.unlocked && h.def.id !== Heroes.active) wanted.add(h.def.id);
    for (const id of [...states.keys()]) if (!wanted.has(id)) states.delete(id);
    for (const id of wanted) if (!states.has(id)) this.add(id);
  },

  add(id) {
    const b = this.bounds();
    states.set(id, {
      x: b.minX + Math.random() * (b.maxX - b.minX),
      y: b.minY + Math.random() * (b.maxY - b.minY),
      targetX: 0, targetY: 0, isWaiting: true,
      waitTime: Math.random() * 3000,
      moveSpeed: 20 + Math.random() * 20,
      facingAngle: 0,
      held: false, sliding: false, slideVX: 0, slideVY: 0,
      sleeping: false, lastHoverTime: Date.now(),
      hopStart: 0, hoverT: 0, wasHovered: false
    });
  },

  remove(id) { states.delete(id); },

  hold(id) { const s = states.get(id); if (s) { s.held = true; s.hopStart = 0; } },

  // al soltarlo en la zona: cae con inercia y rebota en los bordes
  release(id, x, y, vx = 0, vy = 0) {
    const s = states.get(id); if (!s) return;
    const b = this.bounds();
    s.held = false;
    s.x = clamp(x, b.minX, b.maxX); s.y = clamp(y, b.minY, b.maxY);
    const MAX = 240, sp = Math.hypot(vx, vy);
    s.slideVX = sp > MAX ? (vx / sp) * MAX : vx;
    s.slideVY = sp > MAX ? (vy / sp) * MAX : vy;
    s.sliding = sp > 20;
    s.isWaiting = !s.sliding;
    s.waitTime = 2000 + Math.random() * 4000;
  },

  pickAt(x, y) {
    let best = null, bd = (R + 8) ** 2;
    for (const [id, s] of states) {
      if (s.held) continue;
      const d = (s.x - x) ** 2 + (s.y - y) ** 2;
      if (d < bd) { bd = d; best = id; }
    }
    return best;
  },

  update(dt) {
    const b = this.bounds();
    const now = Date.now();
    for (const [id, s] of states) {
      if (s.held) continue;

      // inercia al soltar
      if (s.sliding) {
        s.x += s.slideVX * dt; s.y += s.slideVY * dt;
        if (s.x < b.minX) { s.x = b.minX; s.slideVX = -s.slideVX * 0.4; }
        if (s.x > b.maxX) { s.x = b.maxX; s.slideVX = -s.slideVX * 0.4; }
        if (s.y < b.minY) { s.y = b.minY; s.slideVY = -s.slideVY * 0.4; }
        if (s.y > b.maxY) { s.y = b.maxY; s.slideVY = -s.slideVY * 0.4; }
        const fr = Math.pow(0.92, dt * 60);
        s.slideVX *= fr; s.slideVY *= fr;
        if (Math.hypot(s.slideVX, s.slideVY) > 8) s.facingAngle = Math.atan2(s.slideVY, s.slideVX);
        else { s.sliding = false; s.isWaiting = true; s.waitTime = 2000 + Math.random() * 4000; }
        continue;
      }

      // movimiento idle
      if (s.isWaiting) {
        s.waitTime -= dt * 1000;
        if (s.waitTime <= 0) {
          if (s.sleeping) s.waitTime = 3000 + Math.random() * 3000;
          else {
            s.targetX = b.minX + Math.random() * (b.maxX - b.minX);
            s.targetY = b.minY + Math.random() * (b.maxY - b.minY);
            s.isWaiting = false;
          }
        }
      } else {
        const dx = s.targetX - s.x, dy = s.targetY - s.y;
        const d = Math.hypot(dx, dy);
        if (d < 4) { s.isWaiting = true; s.waitTime = 2000 + Math.random() * 4000; }
        else {
          s.x += (dx / d) * s.moveSpeed * dt;
          s.y += (dy / d) * s.moveSpeed * dt;
          s.facingAngle = Math.atan2(dy, dx);
        }
      }

      // ---- reacciones al cursor ----
      const dh = Math.hypot(mouse.x - s.x, mouse.y - s.y);
      const hovered = mouse.over && dh < HOVER_RADIUS;
      if (hovered) {
        s.lastHoverTime = now;
        s.facingAngle = Math.atan2(mouse.y - s.y, mouse.x - s.x);
        if (!s.wasHovered) s.hopStart = now;              // saltito al llegar el cursor
        if (s.sleeping) { s.sleeping = false; s.hopStart = now; }  // el hover despierta
      } else {
        if (s.isWaiting && now - s.lastHoverTime > SLEEP_TIMEOUT) s.sleeping = true;
      }
      s.wasHovered = hovered;
      s.hoverT += ((hovered ? 1 : 0) - s.hoverT) * Math.min(1, dt * 10);
    }
  },

  draw() {
    if (!ctx) return;
    // fondo blanco + cuadrícula gris clara
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#ececec';
    ctx.beginPath();
    for (let x = 0; x <= W; x += 40) { ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, H); }
    for (let y = 0; y <= H; y += 40) { ctx.moveTo(0, y + .5); ctx.lineTo(W, y + .5); }
    ctx.stroke();

    if (states.size === 0) {
      ctx.fillStyle = '#999';
      ctx.font = 'bold 11px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText('DESBLOQUEA HÉROES CON LOGROS', W / 2, H / 2);
      return;
    }

    for (const [id, s] of states) {
      const h = Heroes.get(id);
      const hop = getHop(s);
      const r = R * (1 + s.hoverT * 0.15);   // se infla con el hover

      ctx.save();
      ctx.translate(s.x, s.y + hop.offsetY);
      ctx.scale(hop.scaleX, hop.scaleY);
      ctx.rotate(s.facingAngle);
const cosColors = Cosmetics.getColors(h.def.id);
h.def.draw(ctx, 0, 0, r, cosColors.primary, cosColors.secondary);
      ctx.restore();

      // dormido: z Z
      if (s.sleeping) {
        ctx.fillStyle = '#999';
        ctx.font = 'bold 10px Courier New';
        ctx.textAlign = 'left';
        ctx.fillText('z Z', s.x + r * 0.6, s.y - r - 4);
      }

      // nombre y nivel debajo
      ctx.textAlign = 'center';
      ctx.fillStyle = '#000';
      ctx.font = 'bold 10px Courier New';
      ctx.fillText(h.def.name, s.x, s.y + R + 15);
      ctx.fillStyle = '#888';
      ctx.font = '9px Courier New';
      ctx.fillText('NV ' + h.level, s.x, s.y + R + 25);
    }
  }
};