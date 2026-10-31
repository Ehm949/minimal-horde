import { Settings } from './settings.js';
import { Save } from './save.js';
import { Heroes } from './heroes.js';
import { Audio } from './audio.js';
import { BAL } from './config.js';
import { t, getLang, setLang, applyLanguage } from './localization.js';
import { startTransition } from './transition.js';

let raf = null, sprites = [];

// Helper para abrir URLs: funciona tanto en web como en APK WebView
function openUrl(url) {
try {
const w = window.open(url, '_blank');
if (!w || w.closed || typeof w.closed === 'undefined') {
// Fallback para WebView que bloquea window.open
window.location.href = url;
}
} catch (e) {
window.location.href = url;
}
}

export function openSettingsScreen() {
startTransition(() => {
const ov = document.createElement('div');
ov.id = 'settingsOverlay';

// ---- Construir tabs según showCredits ----
const creditsTabHtml = BAL.showCredits
? `<button class="set-tab" data-tab="credits" id="tabCredits"></button>`
: '';
const creditsContentHtml = BAL.showCredits
? `<div class="set-tab-content" data-content="credits">
<h2 id="creditsTitle"></h2><div class="set-redline"></div>
<h3 class="set-section-title" id="discordTitle"></h3>
<div class="set-credits-list">
<div class="set-creator-card">
<div class="set-creator-name" id="discordName"></div>
<button class="set-small" id="btnDiscord"></button>
</div>
</div>
<h3 class="set-section-title" id="creatorsEnTitle"></h3>
<div class="set-credits-list">
<div class="set-creator-card">
<div class="set-creator-name">Fort Kenmei</div>
<button class="set-small" id="btnFortKenmei"></button>
</div>
</div>
<h3 class="set-section-title" id="creatorsEsTitle"></h3>
<div class="set-credits-list">
<div class="set-credits-empty" id="creatorsEsEmpty"></div>
</div>
<h3 class="set-section-title" id="patronTitle"></h3>
<div class="set-credits-list">
<div class="set-creator-card">
<div class="set-creator-name">Hilobo47</div>
<div class="set-patron-reward">New hero, AREA</div>
</div>
<div class="set-credits-empty" id="morePatrons"></div>
</div>
<button class="set-back" id="creditsBack"></button>
</div>`
: '';

ov.innerHTML = `<div class="set-left">
<div class="set-tabs">
<button class="set-tab active" data-tab="settings" id="tabSettings"></button>
${creditsTabHtml}
</div>
<div class="set-tab-content active" data-content="settings">
<h2 id="setTitle"></h2><div class="set-redline"></div>
<div class="set-item"><span class="set-label" id="lblMusic"></span><input type="range" id="sldMusic" min="0" max="100"></div>
<div class="set-item"><span class="set-label" id="lblSfx"></span><input type="range" id="sldSfx" min="0" max="100"></div>
<div class="set-item"><span class="set-label" id="lblPart"></span><input type="checkbox" id="chkPart"></div>
<div class="set-item"><span class="set-label" id="lblDmg"></span><input type="checkbox" id="chkDmg"></div>
<div class="set-item"><span class="set-label" id="lblLang"></span><button class="set-small" id="btnLang"></button></div>
<div class="set-item"><span class="set-label" id="lblDelete"></span><button class="set-small danger" id="btnDelete"></button></div>
<button class="set-back" id="setBack"></button>
</div>
${creditsContentHtml}
</div>
<div class="set-right"><canvas id="setAnim"></canvas></div>
<div id="setConfirm" class="hidden">
<div class="set-confirm-box">
<div class="sc-title" id="scTitle"></div><div class="sc-msg" id="scMsg"></div>
<div class="sc-btns"><button id="scYes" class="sc-yes"></button><button id="scNo" class="sc-no"></button></div>
</div>
</div>`;

document.body.appendChild(ov);

const $ = id => ov.querySelector('#' + id);

const render = () => {
$('tabSettings').textContent = t('set.title');
$('setTitle').textContent = t('set.title');
$('lblMusic').textContent = t('set.music');
$('lblSfx').textContent = t('set.sfx');
$('lblPart').textContent = t('set.part');
$('lblDmg').textContent = t('set.dmg');
$('lblLang').textContent = t('set.lang');
$('lblDelete').textContent = t('set.wipe');
$('btnLang').textContent = getLang() === 'es' ? 'ESPAÑOL' : 'ENGLISH';
$('btnDelete').textContent = t('set.wipeBtn');
$('setBack').textContent = t('set.back');
$('scTitle').textContent = t('set.deleteTitle');
$('scMsg').textContent = t('set.deleteMsg');
$('scYes').textContent = t('set.yes');
$('scNo').textContent = t('set.no');

if (BAL.showCredits) {
$('tabCredits').textContent = t('set.credits');
$('creditsBack').textContent = t('set.back');
$('creditsTitle').textContent = t('set.credits');
$('discordTitle').textContent = t('set.discord');
$('discordName').textContent = 'Discord';
$('btnDiscord').textContent = t('set.join');
$('creatorsEnTitle').textContent = t('set.creators.en');
$('creatorsEsTitle').textContent = t('set.creators.es');
$('patronTitle').textContent = t('set.patron');
$('btnFortKenmei').textContent = t('set.visit');
$('creatorsEsEmpty').textContent = t('set.soon');
$('morePatrons').textContent = t('set.patron.more');
}
};
render();

// ---- Sistema de pestañas ----
ov.querySelectorAll('.set-tab').forEach(tab => {
tab.addEventListener('pointerdown', e => {
e.preventDefault();
const target = tab.dataset.tab;
ov.querySelectorAll('.set-tab').forEach(t => t.classList.remove('active'));
ov.querySelectorAll('.set-tab-content').forEach(c => c.classList.remove('active'));
tab.classList.add('active');
ov.querySelector(`[data-content="${target}"]`).classList.add('active');
});
});

$('sldMusic').value = Math.round(Settings.s.musicVolume * 100);
$('sldSfx').value = Math.round(Settings.s.sfxVolume * 100);
$('chkPart').checked = Settings.s.particles;
$('chkDmg').checked = Settings.s.dmgNumbers;

$('sldMusic').oninput = e => { Settings.s.musicVolume = e.target.value / 100; applyAudio(); };
$('sldSfx').oninput = e => { Settings.s.sfxVolume = e.target.value / 100; applyAudio(); };
$('chkPart').onchange = e => Settings.s.particles = e.target.checked;
$('chkDmg').onchange = e => Settings.s.dmgNumbers = e.target.checked;
$('btnLang').addEventListener('pointerdown', e => { e.preventDefault(); setLang(getLang() === 'es' ? 'en' : 'es'); applyLanguage(); render(); });
$('btnDelete').addEventListener('pointerdown', e => { e.preventDefault(); $('setConfirm').classList.remove('hidden'); });
$('scNo').addEventListener('pointerdown', e => { e.preventDefault(); $('setConfirm').classList.add('hidden'); });
$('scYes').addEventListener('pointerdown', e => { e.preventDefault(); Save.wipe(); });

if (BAL.showCredits) {
$('btnDiscord').addEventListener('pointerdown', e => {
e.preventDefault();
openUrl('https://discord.gg/aymGbKST9');
});
$('btnFortKenmei').addEventListener('pointerdown', e => {
e.preventDefault();
openUrl('https://www.youtube.com/watch?v=4R8Ri5gSV-4');
});
}

const closeWithTransition = () => {
startTransition(() => { stopAnim(); ov.remove(); }, 'slide');
};
$('setBack').addEventListener('pointerdown', e => { e.preventDefault(); closeWithTransition(); });
if (BAL.showCredits) {
$('creditsBack').addEventListener('pointerdown', e => { e.preventDefault(); closeWithTransition(); });
}

startAnim($('setAnim'));
}, 'slide');
}

function applyAudio() { if (Audio.setVolumes) Audio.setVolumes(Settings.s.musicVolume, Settings.s.sfxVolume); }

function startAnim(cv) {
const ctx = cv.getContext('2d');
const fit = () => { const r = cv.parentElement.getBoundingClientRect(); cv.width = r.width; cv.height = r.height; };
fit();
sprites = [];
const shapes = ['circle', 'triangle', 'square', 'hexagon'];
const loop = () => {
const W = cv.width, H = cv.height;
if (sprites.length < 10 && Math.random() < 0.03) {
const unlocked = Heroes.list.filter(h => h.unlocked);
if (Math.random() > 0.5 && unlocked.length)
sprites.push({ type: 'char', def: unlocked[(Math.random() * unlocked.length) | 0].def, radius: 26, x: W + 40, y: 60 + Math.random() * (H - 120), speed: 1.5 + Math.random() * 2, rot: 0, rs: 0.02 });
else
sprites.push({ type: 'enemy', shape: shapes[(Math.random() * 4) | 0], radius: 14 + Math.random() * 14, x: W + 40, y: 60 + Math.random() * (H - 120), speed: 1.5 + Math.random() * 2.5, rot: 0, rs: (Math.random() - 0.5) * 0.06 });
}
ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
ctx.save(); ctx.fillStyle = 'rgba(229,57,53,0.15)';
for (let i = -H; i < W + H; i += 30) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 15, 0); ctx.lineTo(i + 15 + H, H); ctx.lineTo(i + H, H); ctx.closePath(); ctx.fill(); }
ctx.restore();
for (let i = sprites.length - 1; i >= 0; i--) {
const s = sprites[i]; s.x -= s.speed; s.rot += s.rs;
if (s.x < -60) { sprites.splice(i, 1); continue; }
ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot); ctx.globalAlpha = 0.7;
if (s.type === 'enemy') { ctx.fillStyle = '#E53935'; drawShape(ctx, s.shape, s.radius); }
else if (s.def) s.def.draw(ctx, 0, 0, s.radius);
ctx.restore();
}
raf = requestAnimationFrame(loop);
};
loop();
}

function stopAnim() { if (raf) cancelAnimationFrame(raf); raf = null; }

function drawShape(ctx, shape, r) {
if (shape === 'circle') { ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.28); ctx.fill(); }
else if (shape === 'square') ctx.fillRect(-r, -r, r * 2, r * 2);
else if (shape === 'triangle') { ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(-r * 0.866, r * 0.5); ctx.lineTo(r * 0.866, r * 0.5); ctx.closePath(); ctx.fill(); }
else { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 3 * i; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); }
}