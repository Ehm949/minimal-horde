import { Audio } from './audio.js';
const TAU = Math.PI * 2;

export const BOSS_DEFS = [
  { id:'cirgran',   name:'CIRGRAN',   shape:'circle',   radius:110, maxHealth:4500,
    contactDamage:18, bulletDamage:8, bulletDamageMult:1,   patternInterval:1.5,
    oscillation:40, angleSpeed:1.2, patterns:[0,1,2,3,4] },
  { id:'cuadrugon', name:'CUADRUGON', shape:'square',   radius:95,  maxHealth:7000,
    contactDamage:26, bulletDamage:8, bulletDamageMult:1.5, patternInterval:1.1,
    oscillation:40, angleSpeed:1.2, patterns:[1,2,5,6,4] },
  { id:'trilon',    name:'TRILON',    shape:'triangle', radius:105, maxHealth:13000,
    contactDamage:34, bulletDamage:8, bulletDamageMult:2.0, patternInterval:0.95,
    oscillation:70, angleSpeed:2.1, patterns:[7,8,5,9,6,4] }
];

export const Boss = {
  // Selección por distancia: 500=CIRGRAN, 1000=CUADRUGON, 1500=TRILON, 2000+=aleatorio
  spawn(C, bossesKilled, bossDist) {
    let defIdx;
    if (bossDist <= 500) defIdx = 0;         // CIRGRAN
    else if (bossDist <= 1000) defIdx = 1;   // CUADRUGON
    else if (bossDist <= 1500) defIdx = 2;   // TRILON
    else defIdx = Math.floor(Math.random() * BOSS_DEFS.length);  // aleatorio

    const def = BOSS_DEFS[defIdx];

    // Escalado de dificultad basado en la distancia (cada 3 jefes = 1 ciclo)
    const bossNumber = Math.max(1, Math.floor(bossDist / 500));
    const cycle = Math.floor((bossNumber - 1) / 3);
    const dm = 1 + (bossNumber - 1) * 0.12;
    const hp = def.maxHealth * Math.pow(1.35, cycle);

    const e = {
      uid: 'boss_' + bossesKilled, boss: true, type: 'boss',
      x: C.W + def.radius, y: C.H / 2, targetX: C.W * 0.82,
      radius: def.radius, shape: def.shape, color: 'red',
      hp, maxHp: hp,
      dmg: def.contactDamage * dm,
      bulletDmg: def.bulletDamage * def.bulletDamageMult * dm,
      bossName: cycle > 0 ? `${def.name} ×${cycle + 1}` : def.name,
      interval: def.patternInterval,
      oscillation: def.oscillation, angleSpeed: def.angleSpeed,
      patterns: def.patterns, patternT: 2.0, patternIdx: 0, shotT: 1.2,
      angle: 0, spawning: true, spawnProgress: 0, invulnT: 0,
      queue: [], flash: 0, hitCd: 0, slow: 0, slowT: 0,
      burn: null, poison: 0, poisonT: 0,
      elite: false, ranged: false,
      xpDrop: 25, distVal: 60, cur: 'CIR'
    };
    C.enemies.push(e);
    Audio.boss();
    return e;
  },

  update(C, b, dt) {
    // animación de entrada
    if (b.spawning) {
      b.spawnProgress += dt * 0.9;
      const p = Math.min(1, b.spawnProgress);
      b.x = C.W + b.radius - (C.W + b.radius - b.targetX) * p;
      if (b.spawnProgress >= 1) { b.spawning = false; b.invulnT = C.time + 2.2; }
      return;
    }

    b.angle += b.angleSpeed * dt;
    b.y = C.H / 2 + Math.sin(b.angle) * b.oscillation;
    if (C.time < b.invulnT) return;   // con escudo no ataca

    // cola de balas programadas
    for (let i = b.queue.length - 1; i >= 0; i--) {
      b.queue[i].t -= dt;
      if (b.queue[i].t <= 0) { b.queue[i].fn(); b.queue.splice(i, 1); }
    }

    // patrones
    b.patternT -= dt;
    if (b.patternT <= 0) {
      b.patternT = b.interval;
      b.patternIdx = (b.patternIdx + 1) % b.patterns.length;
      this.firePattern(b.patterns[b.patternIdx], b, C);
    }

    // bala única dirigida
    b.shotT -= dt;
    if (b.shotT <= 0) {
      b.shotT = 0.5;
      const a = Math.atan2(C.hero.y - b.y, C.hero.x - b.x);
      C.ebullets.push({ x: b.x, y: b.y, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240, radius: 7, dmg: b.bulletDmg * 0.6, boss: true });
    }
  },

  // Los 10 patrones del juego original
  firePattern(idx, b, C) {
    const D = b.bulletDmg;
    const q = (t, fn) => b.queue.push({ t, fn });
    const emit = (a, spd, r, dmg, homing = false) =>
      C.ebullets.push({ x: b.x, y: b.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, radius: r, dmg, boss: true, homing, cap: 260 });

    switch (idx) {
      case 0: // espiral
        for (let i = 0; i < 24; i++) q(i * 0.05, () => { const a = (i / 24) * TAU * 2 + b.angle; emit(a, 180, 8, D); });
        break;
      case 1: // anillo radial
        for (let i = 0; i < 20; i++) emit((i / 20) * TAU, 210, 10, D * 1.5);
        break;
      case 2: { // abanico al jugador
        const a0 = Math.atan2(C.hero.y - b.y, C.hero.x - b.x);
        for (let i = -4; i <= 4; i++) emit(a0 + i * 0.12, 300, 9, D);
        break;
      }
      case 3: // doble espiral
        for (let i = 0; i < 36; i++) q(i * 0.04, () => {
          const a1 = (i / 36) * TAU * 1.5;
          emit(a1, 150, 7, D); emit(a1 + Math.PI, 150, 7, D);
        });
        break;
      case 4: // teledirigidas aleatorias
        for (let i = 0; i < 6; i++) q(i * 0.2, () => emit(Math.random() * TAU, 120, 12, D * 2, true));
        break;
      case 5: { // abanico amplio
        const a0 = Math.atan2(C.hero.y - b.y, C.hero.x - b.x);
        for (let i = -8; i <= 8; i++) emit(a0 + i * 0.1, 270, 9, D * 1.2);
        break;
      }
      case 6: // olas en 4 direcciones
        for (let w = 0; w < 4; w++) q(w * 0.25, () => {
          for (let d = 0; d < 4; d++) {
            const a = (d / 4) * TAU + w * 0.3;
            for (let s = -1; s <= 1; s++) emit(a + s * 0.15, 240, 8, D * 1.1);
          }
        });
        break;
      case 7: { // gran abanico
        const a0 = Math.atan2(C.hero.y - b.y, C.hero.x - b.x);
        for (let i = -12; i <= 12; i++) emit(a0 + i * 0.09, 252, 8, D);
        break;
      }
      case 8: // espiral de 4 brazos
        for (let i = 0; i < 24; i++) q(i * 0.035, () => {
          for (let arm = 0; arm < 4; arm++) {
            const a = (i / 24) * TAU * 1.5 + arm * Math.PI / 2 + b.angle;
            emit(a, 192, 7, D);
          }
        });
        break;
      case 9: // olas teledirigidas
        for (let w = 0; w < 3; w++) q(w * 0.3, () => {
          for (let h = 0; h < 4; h++) emit(Math.random() * TAU, 132, 11, D * 1.5, true);
        });
        break;
    }
  },

  // ---------- dibujo ----------
  draw(ctx, b, C, time) {
    if (!b || b.dead) return;
    const r = b.radius * (b.spawning ? Math.max(0.05, b.spawnProgress) : 1);
    ctx.save();
    ctx.translate(b.x, b.y);
    if (b.spawning) ctx.globalAlpha = Math.min(1, b.spawnProgress + 0.2);
    this.drawBody(ctx, b, r);
    if (b.flash > 0) {
      ctx.globalAlpha = Math.min(1, b.flash * 8);
      ctx.fillStyle = '#fff';
      if (b.shape === 'square') ctx.fillRect(-r, -r, r * 2, r * 2);
      else { ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); }
    }
    ctx.restore();

    // escudo de invulnerabilidad
    if (!b.spawning && C.time < b.invulnT) {
      const sp = 0.5 + 0.5 * Math.sin(time * 12);
      ctx.save();
      ctx.translate(b.x, b.y);
      if (b.shape !== 'circle') ctx.rotate(b.angle);
      ctx.strokeStyle = `rgba(255,255,255,${0.55 + 0.4 * sp})`;
      ctx.lineWidth = 4;
      shieldShape(ctx, b.shape, r + 16 + 4 * sp);
      ctx.strokeStyle = `rgba(229,57,53,${0.4 + 0.35 * sp})`;
      ctx.lineWidth = 2;
      shieldShape(ctx, b.shape, r + 26 + 6 * sp);
      ctx.restore();
    }
  },

  drawBody(ctx, b, r) {
    if (b.shape === 'square') {
      ctx.save(); ctx.rotate(b.angle);
      ctx.fillStyle = '#000'; ctx.fillRect(-r, -r, r * 2, r * 2);
      ctx.strokeStyle = '#E53935'; ctx.lineWidth = 4; ctx.strokeRect(-r, -r, r * 2, r * 2);
      ctx.save(); ctx.rotate(Math.PI / 4);
      ctx.lineWidth = 2; ctx.strokeRect(-r * 0.55, -r * 0.55, r * 1.1, r * 1.1);
      ctx.restore();
      ctx.fillStyle = '#fff'; ctx.fillRect(-r * 0.22, -r * 0.22, r * 0.44, r * 0.44);
      ctx.lineWidth = 3; ctx.strokeRect(-r * 0.22, -r * 0.22, r * 0.44, r * 0.44);
      ctx.fillStyle = '#000'; ctx.fillRect(-r * 0.09, -r * 0.09, r * 0.18, r * 0.18);
      ctx.restore();
    } else if (b.shape === 'triangle') {
      ctx.save(); ctx.rotate(b.angle);
      triPath(ctx, r);
      ctx.fillStyle = '#000'; ctx.fill();
      ctx.strokeStyle = '#E53935'; ctx.lineWidth = 4; ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const a = Math.PI / 2 + i * TAU / 3;
        ctx.lineTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5);
      }
      ctx.closePath();
      ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, r * 0.22, 0, TAU); ctx.fill();
      ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 0, r * 0.1, 0, TAU); ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#E53935'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
      ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, r + 20, r * 0.3, b.angle, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, r * 0.25, 0, TAU); ctx.fill();
      ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 0, r * 0.12, 0, TAU); ctx.fill();
    }
  }
};

function shieldShape(ctx, shape, r) {
  if (shape === 'square') ctx.strokeRect(-r, -r, r * 2, r * 2);
  else if (shape === 'triangle') { triPath(ctx, r); ctx.stroke(); }
  else { ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke(); }
}

function triPath(ctx, r) {
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + i * TAU / 3;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
}