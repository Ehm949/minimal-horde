import { Settings } from './settings.js';

// ============================================================
// AUDIO: SFX sintetizados + música generativa "lobby"
// ============================================================

let audioCtx = null, sfxGain = null, musicGain = null, noiseBuffer = null;
let schedulerId = null, nextNoteTime = 0, currentStep = 0;

function initAudio() {
if (audioCtx) return;
try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
sfxGain = audioCtx.createGain();
sfxGain.gain.value = 0.35 * (Settings.s.sfxVolume ?? 0.8);
sfxGain.connect(audioCtx.destination);
musicGain = audioCtx.createGain();
musicGain.gain.value = 0.45 * (Settings.s.musicVolume ?? 0.7);
musicGain.connect(audioCtx.destination);
const len = audioCtx.sampleRate;
noiseBuffer = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
const data = noiseBuffer.getChannelData(0);
for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
startMusic();
}

function ensureAudio() {
if (!audioCtx) initAudio();
if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
if (audioCtx && !schedulerId) startMusic();
}

if (typeof window !== 'undefined') {
window.addEventListener('pointerdown', ensureAudio);
window.addEventListener('keydown', ensureAudio);
}

// ---------- Helpers ----------
function tone({ freq, freqEnd = null, type = 'square', duration = 0.1, volume = 0.3, delay = 0 }) {
if (!audioCtx || !Settings.s.sound) return;
const t0 = audioCtx.currentTime + delay;
const osc = audioCtx.createOscillator();
const gain = audioCtx.createGain();
osc.type = type;
osc.frequency.setValueAtTime(Math.max(20, freq), t0);
if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + duration);
gain.gain.setValueAtTime(volume, t0);
gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
osc.connect(gain); gain.connect(sfxGain);
osc.start(t0); osc.stop(t0 + duration + 0.02);
}

function noise({ duration = 0.1, volume = 0.3, delay = 0, lowpass = null }) {
if (!audioCtx || !noiseBuffer || !Settings.s.sound) return;
const t0 = audioCtx.currentTime + delay;
const src = audioCtx.createBufferSource();
src.buffer = noiseBuffer; src.loop = true;
const gain = audioCtx.createGain();
gain.gain.setValueAtTime(volume, t0);
gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
let node = src;
if (lowpass) {
const f = audioCtx.createBiquadFilter();
f.type = 'lowpass'; f.frequency.value = lowpass;
src.connect(f); node = f;
}
node.connect(gain); gain.connect(sfxGain);
src.start(t0); src.stop(t0 + duration + 0.02);
}

// ---------- SFX ----------
let lastShoot = 0, lastHit = 0;

const sfx = {
shoot() { const n = Date.now(); if (n - lastShoot < 150) return; lastShoot = n;
tone({ freq: 750, freqEnd: 220, type: 'square', duration: 0.07, volume: 0.07 }); },

hit() { const n = Date.now(); if (n - lastHit < 80) return; lastHit = n;
tone({ freq: 320, freqEnd: 120, type: 'sawtooth', duration: 0.05, volume: 0.08 }); },

crit() { tone({ freq: 900, freqEnd: 300, type: 'square', duration: 0.08, volume: 0.12 }); },

boom() { noise({ duration: 0.3, volume: 0.2, lowpass: 900 });
tone({ freq: 160, freqEnd: 40, type: 'sawtooth', duration: 0.3, volume: 0.25 }); },

level() { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone({ freq: f, type: 'square', duration: 0.14, volume: 0.15, delay: i * 0.08 })); },

buy() { tone({ freq: 620, type: 'square', duration: 0.06, volume: 0.1 });
tone({ freq: 830, type: 'square', duration: 0.08, volume: 0.1, delay: 0.06 }); },

deny() { tone({ freq: 180, freqEnd: 120, type: 'square', duration: 0.12, volume: 0.15 }); },

swap() { tone({ freq: 400, freqEnd: 700, type: 'sine', duration: 0.12, volume: 0.15 }); },

boss() { tone({ freq: 90, freqEnd: 38, type: 'sawtooth', duration: 0.9, volume: 0.24 });
tone({ freq: 45, freqEnd: 30, type: 'sine', duration: 1.0, volume: 0.24, delay: 0.05 }); },

laser() { tone({ freq: 1200, freqEnd: 200, type: 'sawtooth', duration: 0.05, volume: 0.03 }); },

summon() { [523.25, 783.99, 1046.5].forEach((f, i) => tone({ freq: f, type: 'triangle', duration: 0.15, volume: 0.15, delay: i * 0.08 })); },

ach() { tone({ freq: 880, type: 'triangle', duration: 0.12, volume: 0.18 });
tone({ freq: 1108.73, type: 'triangle', duration: 0.14, volume: 0.16, delay: 0.09 });
tone({ freq: 1318.51, type: 'triangle', duration: 0.30, volume: 0.14, delay: 0.18 }); },

mission() { tone({ freq: 587.33, type: 'triangle', duration: 0.09, volume: 0.13 });
tone({ freq: 739.99, type: 'triangle', duration: 0.09, volume: 0.12, delay: 0.07 });
tone({ freq: 880, type: 'triangle', duration: 0.16, volume: 0.11, delay: 0.14 }); },

// ---- SONIDOS DE ARMA ALTERNATIVOS (COSMÉTICOS) ----
shootGuitar() { const n = Date.now(); if (n - lastShoot < 150) return; lastShoot = n;
tone({ freq: 196, freqEnd: 98, type: 'sawtooth', duration: 0.15, volume: 0.08 });
tone({ freq: 392, freqEnd: 196, type: 'sawtooth', duration: 0.1, volume: 0.04, delay: 0.02 }); },

shootPiano() { const n = Date.now(); if (n - lastShoot < 150) return; lastShoot = n;
tone({ freq: 523.25, type: 'sine', duration: 0.12, volume: 0.10 });
tone({ freq: 1046.5, type: 'sine', duration: 0.08, volume: 0.05, delay: 0.03 }); },

shootSynth() { const n = Date.now(); if (n - lastShoot < 150) return; lastShoot = n;
tone({ freq: 440, freqEnd: 880, type: 'square', duration: 0.08, volume: 0.07 }); },

shootDrum() { const n = Date.now(); if (n - lastShoot < 150) return; lastShoot = n;
noise({ duration: 0.08, volume: 0.12, lowpass: 600 });
tone({ freq: 120, freqEnd: 60, type: 'sine', duration: 0.1, volume: 0.12 }); },

shootBass() { const n = Date.now(); if (n - lastShoot < 150) return; lastShoot = n;
tone({ freq: 82.41, freqEnd: 55, type: 'sawtooth', duration: 0.18, volume: 0.10 }); },

shootFlute() { const n = Date.now(); if (n - lastShoot < 150) return; lastShoot = n;
tone({ freq: 880, freqEnd: 1100, type: 'sine', duration: 0.1, volume: 0.06 }); },

shootBell() { const n = Date.now(); if (n - lastShoot < 150) return; lastShoot = n;
tone({ freq: 1567.98, type: 'sine', duration: 0.2, volume: 0.08 });
tone({ freq: 2349.32, type: 'sine', duration: 0.15, volume: 0.04, delay: 0.02 }); },

shootLaser() { const n = Date.now(); if (n - lastShoot < 150) return; lastShoot = n;
tone({ freq: 2000, freqEnd: 400, type: 'sawtooth', duration: 0.06, volume: 0.05 }); },

shootRetro() { const n = Date.now(); if (n - lastShoot < 150) return; lastShoot = n;
tone({ freq: 600, freqEnd: 200, type: 'square', duration: 0.05, volume: 0.09 }); },

shootThunder() { const n = Date.now(); if (n - lastShoot < 150) return; lastShoot = n;
noise({ duration: 0.15, volume: 0.15, lowpass: 1200 });
tone({ freq: 80, freqEnd: 30, type: 'sawtooth', duration: 0.2, volume: 0.15 }); },

shootWind() { const n = Date.now(); if (n - lastShoot < 150) return; lastShoot = n;
noise({ duration: 0.12, volume: 0.06, lowpass: 2000 }); },

shootMetal() { const n = Date.now(); if (n - lastShoot < 150) return; lastShoot = n;
tone({ freq: 3000, freqEnd: 2000, type: 'square', duration: 0.04, volume: 0.06 });
noise({ duration: 0.06, volume: 0.08, lowpass: 4000 }); },

shootWater() { const n = Date.now(); if (n - lastShoot < 150) return; lastShoot = n;
tone({ freq: 400, freqEnd: 200, type: 'sine', duration: 0.1, volume: 0.07 });
noise({ duration: 0.08, volume: 0.04, lowpass: 1500 }); },

shootFire() { const n = Date.now(); if (n - lastShoot < 150) return; lastShoot = n;
noise({ duration: 0.12, volume: 0.10, lowpass: 800 });
tone({ freq: 200, freqEnd: 80, type: 'sawtooth', duration: 0.1, volume: 0.06 }); },

// ---- ELEGIR SONIDO SEGÚN COSMÉTICO ----
shootCustom(soundId) {
const map = {
default: () => this.shoot(), guitar: () => this.shootGuitar(),
piano: () => this.shootPiano(), synth: () => this.shootSynth(),
drum: () => this.shootDrum(), bass: () => this.shootBass(),
flute: () => this.shootFlute(), bell: () => this.shootBell(),
laser: () => this.shootLaser(), retro: () => this.shootRetro(),
thunder: () => this.shootThunder(), wind: () => this.shootWind(),
metal: () => this.shootMetal(), water: () => this.shootWater(),
fire: () => this.shootFire()
};
(map[soundId] || map.default)();
}
};

// ---------- MÚSICA "LOBBY" ----------
const LOBBY_BPM = 84;
const LOBBY_CHORDS = [
{ bass: 130.81, tones: [261.63, 329.63, 392.00, 493.88] },
{ bass: 110.00, tones: [220.00, 261.63, 329.63, 392.00] },
{ bass: 87.31, tones: [174.61, 220.00, 261.63, 329.63] },
{ bass: 98.00, tones: [196.00, 246.94, 293.66, 349.23] }
];

function musicTone(freq, type, duration, volume, time) {
if (!audioCtx) return;
const osc = audioCtx.createOscillator();
const gain = audioCtx.createGain();
osc.type = type; osc.frequency.value = freq;
gain.gain.setValueAtTime(0.0001, time);
gain.gain.exponentialRampToValueAtTime(volume, time + 0.015);
gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
osc.connect(gain); gain.connect(musicGain);
osc.start(time); osc.stop(time + duration + 0.05);
}

function scheduleLobby(step, time) {
const st = 60 / LOBBY_BPM / 4;
const bar = Math.floor(step / 16) % LOBBY_CHORDS.length;
const s = step % 16;
const chord = LOBBY_CHORDS[bar];
if (s === 0) { for (const tn of chord.tones) musicTone(tn, 'triangle', st * 15, 0.04, time); }
if (s === 0) musicTone(chord.bass, 'sine', st * 7, 0.18, time);
if (s === 8) musicTone(chord.bass * 1.5, 'sine', st * 5, 0.10, time);
if (s % 2 === 0) {
const idx = (s / 2) % chord.tones.length;
musicTone(chord.tones[idx] * 2, 'sine', st * 1.7, 0.06, time);
}
}

function scheduler() {
if (!audioCtx) return;
musicGain.gain.value = 0.45 * (Settings.s.musicVolume ?? 0.7);
const st = 60 / LOBBY_BPM / 4;
while (nextNoteTime < audioCtx.currentTime + 0.18) {
scheduleLobby(currentStep, nextNoteTime);
nextNoteTime += st;
currentStep++;
}
}

function startMusic() {
if (schedulerId || !audioCtx) return;
currentStep = 0;
nextNoteTime = audioCtx.currentTime + 0.1;
schedulerId = setInterval(scheduler, 40);
}

export const Audio = {
...sfx,
setVolumes(music, sfx) {
if (musicGain) musicGain.gain.value = 0.45 * music;
if (sfxGain) sfxGain.gain.value = 0.35 * sfx;
}
};