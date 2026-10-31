import { Combat } from './combat.js';
import { World } from './world.js';
import { Boss } from './boss.js';
import { FX } from './effects.js';
import { Heroes } from './heroes.js';
import { darkenColor, ENEMY_RGB } from './enemies.js';
import { drawSpawnWarnings, setWarningSize } from './spawnWarnings.js';
import { t } from './localization.js';
import { Cosmetics } from './cosmetics.js';
import { Modifiers } from './modifiers.js';

export const BattleView = {
cv: null, ctx: null, w: 0, h: 0, time: 0,
bossTint: 0,
modParticles: [],

init(cv) { this.cv = cv; this.ctx = cv.getContext('2d'); },

resize(w, h) { this.w = w; this.h = h; Combat.resize(w, h); setWarningSize(w, h); },

updateBossTint(dt) {
const target = (World.boss && !World.boss.dead) ? 1 : 0;
const speed = 2.2;
if (this.bossTint < target) this.bossTint = Math.min(target, this.bossTint + dt * speed);
else if (this.bossTint > target) this.bossTint = Math.max(target, this.bossTint - dt * speed);
},

draw(dt) {
this.time += dt;
const ctx = this.ctx, C = Combat, h = C.hero;
FX.update(dt);
this.updateBossTint(dt);
ctx.fillStyle = '#fff';
ctx.fillRect(0, 0, this.w, this.h);
ctx.lineWidth = 1;
ctx.strokeStyle = '#ebebeb';
ctx.beginPath();
for (let x = 0; x <= this.w; x += 40) { ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, this.h); }
for (let y = 0; y <= this.h; y += 40) { ctx.moveTo(0, y + .5); ctx.lineTo(this.w, y + .5); }
ctx.stroke();
ctx.strokeStyle = '#dedede';
ctx.beginPath();
for (let x = 0; x <= this.w; x += 200) { ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, this.h); }
for (let y = 0; y <= this.h; y += 200) { ctx.moveTo(0, y + .5); ctx.lineTo(this.w, y + .5); }
ctx.stroke();
if (this.bossTint > 0.005) {
ctx.fillStyle = 'rgba(45,48,60,' + (0.28 * this.bossTint).toFixed(3) + ')';
ctx.fillRect(0, 0, this.w, this.h);
}
const [ox, oy] = FX.shakeOffset();
ctx.save(); ctx.translate(ox, oy);
drawSpawnWarnings(ctx);
for (const b of C.ebullets) {
if (b.boss) {
ctx.fillStyle = '#000';
ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, 6.28); ctx.fill();
ctx.strokeStyle = '#E53935'; ctx.lineWidth = 2;
ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, 6.28); ctx.stroke();
} else {
ctx.fillStyle = '#9C27B0';
ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, 6.28); ctx.fill();
ctx.strokeStyle = '#CE93D8'; ctx.lineWidth = 2;
ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, 6.28); ctx.stroke();
ctx.fillStyle = '#fff';
ctx.beginPath(); ctx.arc(b.x, b.y, b.radius * 0.35, 0, 6.28); ctx.fill();
}
}
for (const e of C.enemies) {
if (e.boss) continue;
drawEnemy(ctx, e, this.time);
}
if (World.boss && !World.boss.dead) Boss.draw(ctx, World.boss, C, this.time);
if (C.beam && C.reviveT <= 0) {
ctx.strokeStyle = '#000'; ctx.lineWidth = C.beam.w; ctx.lineCap = 'round';
ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(C.beam.x2, C.beam.y2); ctx.stroke();
}
for (const p of C.projs) drawProj(ctx, p, this.time);
for (const o of C.orbs) {
ctx.fillStyle = '#000';
ctx.beginPath(); ctx.arc(o.x, o.y, 9, 0, 6.28); ctx.fill();
ctx.strokeStyle = '#E53935'; ctx.lineWidth = 2;
ctx.beginPath(); ctx.arc(o.x, o.y, 9, 0, 6.28); ctx.stroke();
}
for (const d of C.drones) {
ctx.fillStyle = '#000';
ctx.beginPath(); ctx.arc(d.x, d.y, 5, 0, 6.28); ctx.fill();
ctx.fillStyle = '#fff';
ctx.beginPath(); ctx.arc(d.x, d.y, 2, 0, 6.28); ctx.fill();
}
if (C.reviveT <= 0 && C.activeDef().weapon.kind === 'area') {
drawArea(ctx, h.x, h.y, (C.stats.size * C.stats.range) / 2, this.time);
}

// ---- AURA DE MODIFICADORES + HÉROE CON COLORES COSMÉTICOS ----
if (C.reviveT <= 0) {
const def = C.activeDef();
const cosColors = Cosmetics.getColors(Heroes.active);

// Aura de modificadores
const equipped = Modifiers.getEquipped(Heroes.active);
const modA = equipped[0] ? Modifiers.getMod(equipped[0]) : null;
const modB = equipped[1] ? Modifiers.getMod(equipped[1]) : null;
const heroR = def.id === 'tank' ? 20 : 16;

if (modA || modB) {
ctx.save();
ctx.translate(h.x, h.y);
const auraR = heroR + 14;
const pulse = 0.6 + 0.4 * Math.sin(this.time * 3);
if (modA && modB) {
const colA = Modifiers.getModColor(modA);
const colB = Modifiers.getModColor(modB);
ctx.globalAlpha = 0.35 * pulse;
ctx.strokeStyle = colA; ctx.lineWidth = 4;
ctx.beginPath(); ctx.arc(0, 0, auraR, this.time * 1.5, this.time * 1.5 + Math.PI); ctx.stroke();
ctx.strokeStyle = colB;
ctx.beginPath(); ctx.arc(0, 0, auraR, this.time * 1.5 + Math.PI, this.time * 1.5 + Math.PI * 2); ctx.stroke();
ctx.globalAlpha = 0.12 * pulse;
ctx.fillStyle = colA;
ctx.beginPath(); ctx.arc(0, 0, auraR - 4, this.time * 1.5, this.time * 1.5 + Math.PI); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
ctx.fillStyle = colB;
ctx.beginPath(); ctx.arc(0, 0, auraR - 4, this.time * 1.5 + Math.PI, this.time * 1.5 + Math.PI * 2); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
} else {
const col = Modifiers.getModColor(modA || modB);
ctx.globalAlpha = 0.35 * pulse;
ctx.strokeStyle = col; ctx.lineWidth = 4;
ctx.beginPath(); ctx.arc(0, 0, auraR, 0, 6.28); ctx.stroke();
ctx.globalAlpha = 0.10 * pulse;
ctx.fillStyle = col;
ctx.beginPath(); ctx.arc(0, 0, auraR - 4, 0, 6.28); ctx.fill();
}
ctx.restore();
}

// Partículas de modificadores Épico+
for (const uid of equipped) {
if (!uid) continue;
const mod = Modifiers.getMod(uid);
if (!mod || mod.rarity < 3) continue;
const col = Modifiers.getModColor(mod);
if (Math.random() < dt * 7) {
const a = Math.random() * 6.28;
const distP = heroR + 10 + Math.random() * 8;
this.modParticles.push({
x: h.x + Math.cos(a) * distP, y: h.y + Math.sin(a) * distP,
vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 25,
life: 0, maxLife: 0.6 + Math.random() * 0.4,
color: col, size: 1.5 + Math.random() * 2
});
}
}
if (this.modParticles.length > 40) this.modParticles.splice(0, this.modParticles.length - 40);

// Dibujar héroe con colores cosméticos
ctx.save();
ctx.translate(h.x, h.y);
if (C.invuln > 0 && Math.floor(this.time * 12) % 2 === 0) ctx.globalAlpha = 0.35;
ctx.rotate(h.aim);
def.draw(ctx, 0, 0, heroR, cosColors.primary, cosColors.secondary);
ctx.restore();

if (C.dragging) {
ctx.strokeStyle = '#E53935'; ctx.setLineDash([6, 8]); ctx.lineWidth = 2;
ctx.beginPath(); ctx.arc(h.x, h.y, C.stats.range, 0, 6.28); ctx.stroke();
ctx.setLineDash([]);
}
} else {
ctx.fillStyle = '#000'; ctx.font = 'bold 16px Courier New'; ctx.textAlign = 'center';
ctx.fillText(`${t('combat.revive')} ${Math.ceil(C.reviveT)}...`, this.w * 0.32, this.h * 0.45);
}

// Partículas de modificadores: update y draw
for (let i = this.modParticles.length - 1; i >= 0; i--) {
const p = this.modParticles[i];
p.life += dt;
if (p.life >= p.maxLife) { this.modParticles.splice(i, 1); continue; }
p.x += p.vx * dt;
p.y += p.vy * dt;
const alpha = 1 - (p.life / p.maxLife);
ctx.globalAlpha = alpha * 0.7;
ctx.fillStyle = p.color;
ctx.beginPath(); ctx.arc(p.x, p.y, p.size * alpha, 0, 6.28); ctx.fill();
}
ctx.globalAlpha = 1;

FX.draw(ctx);
ctx.restore();
if (C.hurtGlow > 0.01) {
const cx = this.w / 2, cy = this.h / 2;
const inner = Math.min(this.w, this.h) * 0.38;
const outer = Math.max(this.w, this.h) * 0.72;
const g = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer);
g.addColorStop(0, 'rgba(229,57,53,0)');
g.addColorStop(1, 'rgba(229,57,53,' + (0.38 * C.hurtGlow).toFixed(3) + ')');
ctx.fillStyle = g;
ctx.fillRect(0, 0, this.w, this.h);
ctx.strokeStyle = 'rgba(229,57,53,' + (0.5 * C.hurtGlow).toFixed(3) + ')';
ctx.lineWidth = 6;
ctx.strokeRect(3, 3, this.w - 6, this.h - 6);
}
}
};

function drawEnemyShape(ctx, shape, x, y, r) {
switch (shape) {
case 'square': ctx.fillRect(x - r, y - r, r * 2, r * 2); break;
case 'triangle':
ctx.beginPath();
ctx.moveTo(x, y - r);
ctx.lineTo(x - r * 0.866, y + r * 0.5);
ctx.lineTo(x + r * 0.866, y + r * 0.5);
ctx.closePath(); ctx.fill(); break;
case 'pentagon': poly(ctx, x, y, r, 5, -Math.PI / 2); ctx.fill(); break;
case 'hexagon': poly(ctx, x, y, r, 6, 0); ctx.fill(); break;
default: ctx.beginPath(); ctx.arc(x, y, r, 0, 6.28); ctx.fill(); break;
}
}

function drawEnemy(ctx, e, time) {
const r = e.radius;
if (e.burn) {
ctx.globalAlpha = 0.45;
ctx.fillStyle = '#FF6D00';
ctx.beginPath(); ctx.arc(e.x, e.y, r + 3 + Math.random() * 1.5, 0, 6.28); ctx.fill();
ctx.globalAlpha = 1;
}
if (e.poison > 0) {
ctx.globalAlpha = 0.4;
ctx.fillStyle = '#7CB342';
ctx.beginPath(); ctx.arc(e.x, e.y, r + 2, 0, 6.28); ctx.fill();
ctx.globalAlpha = 1;
}

// ---- ROSA: aura de soporte ----
if (e.color === 'pink') {
const auraR = e.auraRadius || 120;
ctx.globalAlpha = 0.08 + 0.03 * Math.sin(time * 2);
ctx.fillStyle = '#FF69B4';
ctx.beginPath(); ctx.arc(e.x, e.y, auraR, 0, 6.28); ctx.fill();
ctx.globalAlpha = 0.25 + 0.1 * Math.sin(time * 3);
ctx.strokeStyle = '#FF69B4'; ctx.lineWidth = 1.5;
ctx.setLineDash([6, 4]);
ctx.beginPath(); ctx.arc(e.x, e.y, auraR, 0, 6.28); ctx.stroke();
ctx.setLineDash([]);
ctx.globalAlpha = 1;
}

const col = darkenColor(Math.max(0, e.hp / e.maxHp), ENEMY_RGB[e.color]);
ctx.fillStyle = col;
drawEnemyShape(ctx, e.shape, e.x, e.y, r);
if (e.flash > 0) {
ctx.globalAlpha = e.flash * 8;
ctx.fillStyle = '#fff';
drawEnemyShape(ctx, e.shape, e.x, e.y, r);
ctx.globalAlpha = 1;
}

// ---- ROSA: aro pulsante + símbolo de soporte ----
if (e.color === 'pink') {
ctx.globalAlpha = 0.5 + 0.3 * Math.sin(time * 4);
ctx.strokeStyle = '#FF69B4'; ctx.lineWidth = 2;
ctx.beginPath(); ctx.arc(e.x, e.y, r + 4, 0, 6.28); ctx.stroke();
ctx.globalAlpha = 1;
ctx.fillStyle = '#FF69B4';
ctx.font = `bold ${Math.max(10, r * 0.6)}px Courier New`;
ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
ctx.fillText('+', e.x, e.y);
ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
}

if (e.elite) {
const ep = 0.5 + 0.5 * Math.sin(time * 4);
ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
ctx.beginPath(); ctx.arc(e.x, e.y, r + 5, 0, 6.28); ctx.stroke();
ctx.globalAlpha = 0.35 + 0.3 * ep;
ctx.strokeStyle = '#E53935'; ctx.lineWidth = 2;
ctx.beginPath(); ctx.arc(e.x, e.y, r + 9 + ep * 3, 0, 6.28); ctx.stroke();
ctx.globalAlpha = 1;
const cy = e.y - r - 13;
ctx.fillStyle = '#FFD700';
ctx.beginPath();
ctx.moveTo(e.x - 6, cy + 4);
ctx.lineTo(e.x - 6, cy - 2);
ctx.lineTo(e.x - 3, cy + 1);
ctx.lineTo(e.x, cy - 4);
ctx.lineTo(e.x + 3, cy + 1);
ctx.lineTo(e.x + 6, cy - 2);
ctx.lineTo(e.x + 6, cy + 4);
ctx.closePath();
ctx.fill();
}

if (e.color === 'golden') {
const ringCol = darkenColor(Math.max(0, e.hp / e.maxHp), ENEMY_RGB.golden);
ctx.globalAlpha = 0.5 + 0.3 * Math.sin(time * 5);
ctx.strokeStyle = ringCol; ctx.lineWidth = 2.5;
ctx.beginPath(); ctx.arc(e.x, e.y, r + 5, 0, 6.28); ctx.stroke();
ctx.globalAlpha = 1;
if (e.atkPhase === 'aim' && e.aimX !== undefined) {
ctx.save();
ctx.strokeStyle = '#FF8C00'; ctx.lineWidth = 2;
ctx.setLineDash([8, 8]);
ctx.globalAlpha = 0.4 + 0.3 * Math.sin(time * 12);
ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.aimX, e.aimY); ctx.stroke();
ctx.setLineDash([]);
ctx.beginPath(); ctx.arc(e.aimX, e.aimY, 9, 0, 6.28); ctx.stroke();
ctx.restore();
}
else if (e.atkPhase === 'fire' && e.aimX !== undefined) {
ctx.save();
ctx.lineCap = 'round';
ctx.strokeStyle = 'rgba(255,140,0,0.30)'; ctx.lineWidth = 14;
ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.aimX, e.aimY); ctx.stroke();
ctx.strokeStyle = '#FF8C00'; ctx.lineWidth = 5;
ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.aimX, e.aimY); ctx.stroke();
ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.5;
ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.aimX, e.aimY); ctx.stroke();
ctx.restore();
}
}

if (e.slow > 0) {
ctx.strokeStyle = '#81D4FA'; ctx.lineWidth = 2;
ctx.beginPath(); ctx.arc(e.x, e.y, r + 4, 0, 6.28); ctx.stroke();
ctx.fillStyle = '#81D4FA';
for (let i = 0; i < 3; i++) {
const a = time * 2 + i * 2.09;
ctx.save();
ctx.translate(e.x + Math.cos(a) * (r + 5), e.y + Math.sin(a) * (r + 5));
ctx.rotate(Math.PI / 4);
ctx.fillRect(-2, -2, 4, 4);
ctx.restore();
}
}

if (e.hp < e.maxHp) {
ctx.fillStyle = '#000'; ctx.fillRect(e.x - r, e.y - r - 9, r * 2, 4);
ctx.fillStyle = '#E53935'; ctx.fillRect(e.x - r, e.y - r - 9, r * 2 * Math.max(0, e.hp / e.maxHp), 4);
}

if (e.markT > 0) {
const mx = e.x, my = e.y - r - 10, s = 4;
ctx.lineCap = 'round';
ctx.strokeStyle = '#fff'; ctx.lineWidth = 3.5;
ctx.beginPath();
ctx.moveTo(mx - s, my - s); ctx.lineTo(mx + s, my + s);
ctx.moveTo(mx + s, my - s); ctx.lineTo(mx - s, my + s);
ctx.stroke();
ctx.strokeStyle = '#E53935'; ctx.lineWidth = 1.8;
ctx.beginPath();
ctx.moveTo(mx - s, my - s); ctx.lineTo(mx + s, my + s);
ctx.moveTo(mx + s, my - s); ctx.lineTo(mx - s, my + s);
ctx.stroke();
}
}

function drawProj(ctx, p, time) {
if (p.kind === 'ring') {
ctx.strokeStyle = '#000'; ctx.lineWidth = 4;
ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, 6.28); ctx.stroke();
return;
}
if (p.kind === 'chakram') {
ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(time * 12);
ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
ctx.beginPath(); ctx.arc(0, 0, p.size, 0, 6.28); ctx.stroke();
ctx.beginPath(); ctx.moveTo(-p.size, 0); ctx.lineTo(p.size, 0); ctx.stroke();
ctx.restore(); return;
}
if (p.kind === 'graviton') {
ctx.fillStyle = '#000';
ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 6.28); ctx.fill();
ctx.strokeStyle = '#E53935'; ctx.lineWidth = 1.5;
ctx.beginPath(); ctx.arc(p.x, p.y, p.size + 3, 0, 6.28); ctx.stroke();
return;
}
ctx.fillStyle = p.red ? '#E53935' : '#000';
ctx.beginPath();
ctx.arc(p.x, p.y, p.flame ? p.size * (0.7 + Math.random() * 0.5) : p.size, 0, 6.28);
ctx.fill();
if (p.flame) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.3, 0, 6.28); ctx.fill(); }
}

function poly(ctx, x, y, r, n, rot) {
ctx.beginPath();
for (let i = 0; i < n; i++) {
const a = rot + i / n * Math.PI * 2;
i === 0 ? ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
}
ctx.closePath();
}

function drawArea(ctx, x, y, radius, time) {
ctx.save();
const pulse = 0.08 + 0.02 * Math.sin(time * 2);
ctx.fillStyle = `rgba(120,120,120,${pulse})`;
ctx.beginPath(); ctx.arc(x, y, radius, 0, 6.28); ctx.fill();
ctx.strokeStyle = 'rgba(120,120,120,0.25)';
ctx.lineWidth = 1.5;
ctx.beginPath(); ctx.arc(x, y, radius, 0, 6.28); ctx.stroke();
for (let i = 0; i < 2; i++) {
const phase = ((time * 0.35 + i * 0.5) % 1);
const waveR = radius * phase;
if (waveR < 2) continue;
ctx.strokeStyle = `rgba(140,140,140,${0.10 * (1 - phase)})`;
ctx.lineWidth = 1;
ctx.beginPath(); ctx.arc(x, y, waveR, 0, 6.28); ctx.stroke();
}
ctx.restore();
}