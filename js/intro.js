import { startTransition } from './transition.js';

let introCanvas = null;
let introCtx = null;
let introStartTime = 0;
let introSkipped = false;
let introMaxProgress = 0;
let active = false;
let onEnd = null;

export function startIntroSequence(canvas, callback) {
  introCanvas = canvas;
  introCtx = canvas.getContext('2d');
  introStartTime = Date.now();
  introSkipped = false;
  introMaxProgress = 0;
  active = true;
  onEnd = callback;
}

export function isIntroActive() { return active; }

function finishIntro() {
  if (!active) return;
  active = false;
  if (introCanvas) {
    introCanvas.classList.add('fadeout');
    introCanvas.style.display = 'none';
  }
  if (onEnd) onEnd();
}

export function skipIntroSequence() {
  if (!active || introSkipped) return;
  introSkipped = true;
  startTransition(finishIntro, 'introToGame');
}

export function drawIntro() {
  if (!active || !introCtx) return;
  const ctx = introCtx;
  const W = introCanvas.clientWidth;
  const H = introCanvas.clientHeight;
  const elapsed = Date.now() - introStartTime;
  const TARGET_DURATION = 3000;
  const progress = Math.min(elapsed / TARGET_DURATION, 1);
  introMaxProgress = Math.max(introMaxProgress, progress);
  const displayProgress = introMaxProgress;

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, H);

  // FASE 1: líneas rojas diagonales
  if (displayProgress > 0) {
    const phase1Progress = Math.min(displayProgress / 0.33, 1);
    const easePhase1 = phase1Progress * phase1Progress * (3 - 2 * phase1Progress);
    ctx.save();
    ctx.strokeStyle = '#E53935';
    ctx.lineWidth = 3;
    const numLines = 15;
    for (let i = 0; i < numLines; i++) {
      const lineProgress = Math.max(0, Math.min(1, easePhase1 * numLines - i));
      if (lineProgress <= 0) continue;
      const startX = (W / numLines) * i;
      const endX = startX + H;
      const currentEndX = startX + (endX - startX) * lineProgress;
      const currentEndY = H * lineProgress;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(startX, 0);
      ctx.lineTo(currentEndX, currentEndY);
      ctx.stroke();
    }
    ctx.restore();
  }

  // FASE 2: título (monospace, centrado, con glitch rojo)
  if (displayProgress > 0.18) {
    const phase2Progress = Math.min((displayProgress - 0.18) / 0.38, 1);
    const easePhase2 = 1 - Math.pow(1 - phase2Progress, 4);
    ctx.save();
    const glitchOffset = phase2Progress < 0.3 ? (Math.random() - 0.5) * 20 * (1 - phase2Progress / 0.3) : 0;
    if (phase2Progress > 0.1) {
      ctx.fillStyle = '#E53935';
      ctx.font = 'bold 96px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = 0.5;
      ctx.fillText('MINIMAL', W / 2 + 5 + glitchOffset, H / 2 - 50 - 5);
      ctx.fillText('HORDE', W / 2 - 5 - glitchOffset, H / 2 + 50 + 5);
    }
    ctx.globalAlpha = easePhase2;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 96px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const revealWidth = W * easePhase2;
    ctx.save();
    ctx.beginPath();
    ctx.rect(W / 2 - revealWidth / 2, 0, revealWidth, H);
    ctx.clip();
    ctx.fillText('MINIMAL', W / 2 + glitchOffset, H / 2 - 50);
    ctx.fillText('HORDE', W / 2 - glitchOffset, H / 2 + 50);
    ctx.restore();
    ctx.restore();
  }

  // FASE 3: línea roja + subtítulo
  if (displayProgress > 0.55) {
    const phase3Progress = Math.min((displayProgress - 0.55) / 0.2, 1);
    const easePhase3 = phase3Progress * phase3Progress * (3 - 2 * phase3Progress);
    ctx.save();
    ctx.globalAlpha = easePhase3;
    ctx.strokeStyle = '#E53935';
    ctx.lineWidth = 4;
    const lineWidth = 300 * easePhase3;
    ctx.beginPath();
    ctx.moveTo(W / 2 - lineWidth / 2, H / 2 + 120);
    ctx.lineTo(W / 2 + lineWidth / 2, H / 2 + 120);
    ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('IDLE INCREMENTAL GAME', W / 2, H / 2 + 150);
    ctx.restore();
  }

  // FASE 4: "PRESS ANY KEY TO START"
  if (displayProgress > 0.75) {
    const phase4Progress = Math.min((displayProgress - 0.75) / 0.15, 1);
    const blink = Math.sin(Date.now() * 0.008) * 0.5 + 0.5;
    ctx.save();
    ctx.globalAlpha = phase4Progress * blink;
    ctx.fillStyle = '#E53935';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PRESS ANY KEY TO START', W / 2, H / 2 + 210);
    ctx.restore();
  }

  // Partículas
  ctx.save();
  const particleCount = 20;
  for (let i = 0; i < particleCount; i++) {
    const seed = i * 137.5;
    const px = ((seed * 7.3 + elapsed * 0.05) % W);
    const py = ((seed * 13.7 + elapsed * 0.03) % H);
    const size = 2 + (i % 3);
    ctx.globalAlpha = 0.4 + Math.sin(elapsed * 0.003 + i) * 0.3;
    ctx.fillStyle = '#E53935';
    ctx.fillRect(px, py, size, size);
  }
  ctx.restore();

  // Viñeta
  const gradient = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.8);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.7)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);
}