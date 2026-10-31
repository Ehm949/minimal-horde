import { Settings } from './settings.js';
import { rand } from './utils.js';

export const FX = {
  parts: [], rings: [], texts: [], zaps: [], shakeMag: 0,

  text(x, y, str, color = '#000', size = 12) {
    this.texts.push({ x, y, str, color, size, life: 0.9, vy: -40 });
  },

  burst(x, y, color, count = 8, speed = 150, size = 3) {
    if (!Settings.s.particles) return;
    for (let i = 0; i < count; i++) {
      const a = rand(0, Math.PI * 2), s = rand(speed * 0.4, speed);
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        size: rand(size * 0.6, size * 1.4), color, life: rand(0.3, 0.6), kind: 'sq' });
    }
  },

  ring(x, y, color, radius = 60) {
    if (!Settings.s.particles) return;
    this.rings.push({ x, y, color, r: 6, max: radius, life: 0.35 });
  },

  // ---- partículas de estado: fuego / escarcha / veneno ----
  status(x, y, type) {
    if (!Settings.s.particles) return;
    if (type === 'burn')
      this.parts.push({ x: x + rand(-6, 6), y: y + rand(-4, 4), vx: rand(-20, 20), vy: rand(-90, -40),
        size: rand(2, 4), color: '#FF6D00', life: rand(0.3, 0.5), kind: 'burn' });
    if (type === 'frost')
      this.parts.push({ x: x + rand(-8, 8), y: y + rand(-8, 8), vx: rand(-15, 15), vy: rand(-12, 12),
        size: rand(2, 3.5), color: '#81D4FA', life: rand(0.4, 0.6), kind: 'frost' });
    if (type === 'poison')
      this.parts.push({ x: x + rand(-6, 6), y: y + rand(-2, 6), vx: rand(-15, 15), vy: rand(-60, -30),
        size: rand(2, 4), color: '#7CB342', life: rand(0.4, 0.6), kind: 'poison' });
  },

  // ---- rayo (descarga / crítico en cadena) ----
  zap(x1, y1, x2, y2) {
    if (!Settings.s.particles) return;
    this.zaps.push({ x1, y1, x2, y2, life: 0.18, max: 0.18 });
  },

  shake(mag) { this.shakeMag = Math.max(this.shakeMag, mag); },

  shakeOffset() {
    if (this.shakeMag <= 0.01) return [0, 0];
    return [rand(-this.shakeMag, this.shakeMag), rand(-this.shakeMag, this.shakeMag)];
  },

  update(dt) {
    this.shakeMag = Math.max(0, this.shakeMag - dt * 8);
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.kind === 'burn') p.vy -= 60 * dt;
      if (p.kind === 'poison') p.vy -= 30 * dt;
      if (p.kind === 'frost') { p.vx *= 0.95; p.vy *= 0.95; }
      p.vx *= 0.98;
      if (p.life <= 0) this.parts.splice(i, 1);
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt; r.r += (r.max - r.r) * Math.min(1, dt * 20);
      if (r.life <= 0) this.rings.splice(i, 1);
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt; t.y += t.vy * dt;
      if (t.life <= 0) this.texts.splice(i, 1);
    }
    for (let i = this.zaps.length - 1; i >= 0; i--) {
      const z = this.zaps[i];
      z.life -= dt;
      if (z.life <= 0) this.zaps.splice(i, 1);
    }
  },

  draw(ctx) {
    // ---- partículas ----
    for (const p of this.parts) {
      ctx.globalAlpha = Math.min(1, Math.max(0, p.life / 0.6));
      ctx.fillStyle = p.color;
      if (p.kind === 'burn') {
        const f = p.size * (0.8 + Math.random() * 0.4);   // llama que parpadea
        ctx.fillRect(p.x - f / 2, p.y - f / 2, f, f);
      } else if (p.kind === 'frost') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.PI / 4);   // copo (rombo)
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      } else if (p.kind === 'poison') {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size / 2, 0, 6.28); ctx.fill();   // burbuja
      } else {
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
    }
    ctx.globalAlpha = 1;

    // ---- anillos ----
    for (const r of this.rings) {
      ctx.globalAlpha = Math.max(0, r.life / 0.35);
      ctx.strokeStyle = r.color; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 6.28); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // ---- rayos quebrados ----
    for (const z of this.zaps) {
      const a = Math.max(0, z.life / z.max);
      const segs = 6;
      ctx.globalAlpha = a;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#FFEB3B'; ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(z.x1, z.y1);
      for (let i = 1; i < segs; i++) {
        const tt = i / segs;
        ctx.lineTo(z.x1 + (z.x2 - z.x1) * tt + rand(-7, 7), z.y1 + (z.y2 - z.y1) * tt + rand(-7, 7));
      }
      ctx.lineTo(z.x2, z.y2);
      ctx.stroke();
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1;   // núcleo blanco
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // ---- números de daño: grandes y con buffer blanco ----
    for (const t of this.texts) {
      const size = Math.round(t.size * 1.3);
      ctx.font = `bold ${size}px Courier New`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = Math.max(0, Math.min(1, t.life / 0.4));
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(3, size * 0.28);
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.strokeText(t.str, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.str, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }
};