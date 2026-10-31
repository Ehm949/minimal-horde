// ============ HAZ DE PREAVISO DE SPAWN (portado del juego original) ============
// Un cono de luz perpendicular al borde, en degradado: nace intenso en la
// pared (origen del enemigo) y se disipa hacia dentro. Se registra con
// antelación (leadMs) al spawn real para que el jugador LEA el peligro
// antes de que el enemigo cruce. El haz respira y reacciona al tiempo que
// falta: largo y tenue al marcarse, contraído e intenso justo antes de
// salir, con estrías que fluyen hacia dentro y una onda de activación que
// lo barre de fuera a dentro al encenderse.

const DEFAULT_LEAD_MS = 650;   // antelación con la que se enciende el haz
const LINGER_MS = 280;         // cuánto tarda en apagarse tras el spawn
const BEAM_LENGTH = 168;       // penetración máxima del haz hacia dentro
const BEAM_THICKNESS = 52;     // grosor del haz (abraza al enemigo más grande)
const SCAN_COUNT = 5;          // estrías que fluyen dentro del haz
const SCAN_SPEED = 0.00042;    // velocidad de flujo de las estrías
const WAVE_MS = 320;           // duración de la onda de activación al marcarse

const ACCENT = '229, 57, 53';         // rojo del juego, en componentes RGB
const ACCENT_PURPLE = '156, 39, 176'; // morado para el enemigo PUR
const ACCENT_GOLD = '255, 140, 0';    // naranja para el enemigo ORO (#FF8C00)
const ACCENT_PINK = '255, 105, 180';  // rosa para el enemigo PINK (#FF69B4)

let warnings = [];
let W = 800, H = 600;

export function setWarningSize(w, h) { W = w; H = h; }

function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
function clamp01(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
function lerp(a, b, t) { return a + (b - a) * t; }

function edgeGeometry(edge, pos) {
  if (edge === 'top') return { ax: pos, ay: 0, dx: 0, dy: 1 };
  if (edge === 'bottom') return { ax: pos, ay: H, dx: 0, dy: -1 };
  if (edge === 'left') return { ax: 0, ay: pos, dx: 1, dy: 0 };
  return { ax: W, ay: pos, dx: -1, dy: 0 }; // 'right' por defecto
}

export function registerSpawnWarning(edge, pos, color = 'red', leadMs = DEFAULT_LEAD_MS) {
  const now = Date.now();
const accent = color === 'purple' ? ACCENT_PURPLE
: (color === 'golden' ? ACCENT_GOLD
: (color === 'pink' ? ACCENT_PINK : ACCENT));
  warnings.push({
    edge, pos,
    start: now,
    spawnAt: now + leadMs,
    scanSeed: Math.random(),
    accent
  });
}

export function clearSpawnWarnings() { warnings = []; }

export function updateSpawnWarnings() {
  if (warnings.length === 0) return;
  const now = Date.now();
  for (let i = warnings.length - 1; i >= 0; i--) {
    if (now > warnings[i].spawnAt + LINGER_MS) warnings.splice(i, 1);
  }
}

export function drawSpawnWarnings(ctx) {
  if (warnings.length === 0) return;
  const now = Date.now();

  for (const w of warnings) {
    const g = edgeGeometry(w.edge, w.pos);
    const A = w.accent;

    const leadSpan = Math.max(1, w.spawnAt - w.start);
    const urgency = clamp01((now - w.start) / leadSpan);
    const fadeIn = easeOut(clamp01((now - w.start) / 120));
    const fadeOut = now > w.spawnAt ? clamp01(1 - (now - w.spawnAt) / LINGER_MS) : 1;
    const alpha = fadeIn * fadeOut;
    if (alpha <= 0.001) continue;

    const freq = lerp(2.0, 8.0, urgency);
    const pulse = 0.5 + 0.5 * Math.sin(now * 0.006 * freq + w.scanSeed * 6.28);
    const live = alpha * (0.5 + 0.5 * pulse);
    const length = BEAM_LENGTH * lerp(1.0, 0.6, urgency);
    const thick = BEAM_THICKNESS * (1 + 0.06 * pulse);
    const bodyMul = lerp(0.7, 1.0, urgency);
    const angle = Math.atan2(g.dy, g.dx);

    ctx.save();
    ctx.translate(g.ax, g.ay);
    ctx.rotate(angle);

    // ---- 1) Cuerpo del haz ----
    const body = ctx.createLinearGradient(0, 0, length, 0);
    body.addColorStop(0, `rgba(${A}, ${0.55 * live * bodyMul})`);
    body.addColorStop(0.25, `rgba(${A}, ${0.30 * live * bodyMul})`);
    body.addColorStop(0.7, `rgba(${A}, ${0.08 * live * bodyMul})`);
    body.addColorStop(1, `rgba(${A}, 0)`);
    ctx.fillStyle = body;
    ctx.fillRect(0, -thick / 2, length, thick);

    // ---- 2) Núcleo caliente ----
    const coreH = thick * 0.34;
    const core = ctx.createLinearGradient(0, 0, length * 0.92, 0);
    core.addColorStop(0, `rgba(${A}, ${0.78 * live})`);
    core.addColorStop(0.4, `rgba(${A}, ${0.34 * live})`);
    core.addColorStop(1, `rgba(${A}, 0)`);
    ctx.fillStyle = core;
    ctx.fillRect(0, -coreH / 2, length * 0.92, coreH);

    // ---- 3) Bordes del cono ----
    const edgeGrad = ctx.createLinearGradient(0, 0, length, 0);
    edgeGrad.addColorStop(0, `rgba(${A}, ${0.7 * live})`);
    edgeGrad.addColorStop(0.6, `rgba(${A}, ${0.18 * live})`);
    edgeGrad.addColorStop(1, `rgba(${A}, 0)`);
    ctx.strokeStyle = edgeGrad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -thick / 2); ctx.lineTo(length, -thick / 2);
    ctx.moveTo(0, thick / 2); ctx.lineTo(length, thick / 2);
    ctx.stroke();

    // ---- 4) Estrías que fluyen hacia dentro ----
    ctx.lineWidth = 2;
    for (let s = 0; s < SCAN_COUNT; s++) {
      const prog = ((now * SCAN_SPEED + w.scanSeed + s / SCAN_COUNT) % 1);
      const sx = prog * length;
      const posFade = 1 - prog;
      const a = 0.26 * live * posFade * (0.6 + 0.4 * pulse);
      if (a <= 0.01) continue;
      ctx.strokeStyle = `rgba(${A}, ${a})`;
      ctx.beginPath();
      ctx.moveTo(sx, -thick / 2 * 0.82);
      ctx.lineTo(sx, thick / 2 * 0.82);
      ctx.stroke();
    }

    // ---- 5) Boca del haz ----
    const mouthGlow = ctx.createLinearGradient(-14, 0, 16, 0);
    mouthGlow.addColorStop(0, `rgba(${A}, 0)`);
    mouthGlow.addColorStop(0.5, `rgba(${A}, ${0.6 * live})`);
    mouthGlow.addColorStop(1, `rgba(${A}, 0)`);
    ctx.fillStyle = mouthGlow;
    ctx.fillRect(-14, -thick / 2, 30, thick);
    ctx.lineCap = 'round';
    ctx.strokeStyle = `rgba(${A}, ${0.95 * live})`;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, -thick / 2); ctx.lineTo(0, thick / 2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * live})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -thick / 2); ctx.lineTo(0, thick / 2);
    ctx.stroke();

    // ---- 6) Punto pulsante en la altura del enemigo ----
    const pr = 4 + 2.5 * pulse;
    ctx.fillStyle = `rgba(${A}, ${0.55 * live})`;
    ctx.beginPath(); ctx.arc(0, 0, pr + 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(255, 255, 255, ${live})`;
    ctx.beginPath(); ctx.arc(0, 0, pr, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(${A}, ${live})`;
    ctx.beginPath(); ctx.arc(0, 0, pr * 0.42, 0, Math.PI * 2); ctx.fill();

    // ---- 7) Flecha de dirección ----
    const ap = 10 + 6 * pulse;
    const tipX = length - 4 + ap * 0.4;
    const aw = 8;
    ctx.fillStyle = `rgba(${A}, ${0.85 * live})`;
    ctx.beginPath();
    ctx.moveTo(tipX, 0);
    ctx.lineTo(tipX - 12, -aw);
    ctx.lineTo(tipX - 12, aw);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // ---- 8) Onda de activación ----
    const sinceStart = now - w.start;
    if (sinceStart < WAVE_MS) {
      const wp = easeOut(sinceStart / WAVE_MS);
      const wx = wp * length;
      ctx.save();
      ctx.translate(g.ax, g.ay);
      ctx.rotate(angle);
      const trail = ctx.createLinearGradient(Math.max(0, wx - 26), 0, wx, 0);
      trail.addColorStop(0, 'rgba(255, 255, 255, 0)');
      trail.addColorStop(1, `rgba(255, 255, 255, ${0.5 * (1 - wp) * fadeIn})`);
      ctx.fillStyle = trail;
      ctx.fillRect(Math.max(0, wx - 26), -thick / 2, 26, thick);
      ctx.lineCap = 'round';
      ctx.strokeStyle = `rgba(${A}, ${0.8 * (1 - wp) * fadeIn})`;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(wx, -thick / 2); ctx.lineTo(wx, thick / 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - wp) * fadeIn})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(wx, -thick / 2); ctx.lineTo(wx, thick / 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}