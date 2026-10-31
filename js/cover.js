import { hasLang, setLang, applyLanguage } from './localization.js';
import { startIntroSequence, skipIntroSequence, isIntroActive, drawIntro } from './intro.js';
import { startTransition } from './transition.js';

let started = false;
export function isStarted() { return started; }

// Arranque directo sin intro ni portada (usado tras el renacimiento)
export function skipCover(onStart) {
  if (started) return;
  started = true;
  const cover = document.getElementById('cover');
  const introCv = document.getElementById('introCanvas');
  if (cover) cover.classList.add('hidden');
  if (introCv) introCv.style.display = 'none';
  applyLanguage();
  window.dispatchEvent(new Event('resize'));
  if (onStart) onStart();
  startTransition(null, 'zoom');
}

export function initCover(onStart) {
  const cover = document.getElementById('cover');
  const introCv = document.getElementById('introCanvas');
  if (!cover || !introCv) return;
  const langScreen = document.getElementById('langScreen');

  const fitIntro = () => {
    const d = window.devicePixelRatio || 1;
    introCv.width = innerWidth * d;
    introCv.height = innerHeight * d;
    introCv.getContext('2d').setTransform(d, 0, 0, d, 0, 0);
  };
  fitIntro();
  window.addEventListener('resize', fitIntro);

  cover.style.display = 'none';

  const begin = () => {
    if (started) return;
    started = true;
    cover.classList.add('hidden');
    applyLanguage();
    window.dispatchEvent(new Event('resize'));
    if (onStart) onStart();
    startTransition(null, 'zoom');
  };

  const afterIntro = () => {
    if (hasLang()) {
      begin();
    } else {
      cover.style.display = '';
      if (langScreen) langScreen.classList.remove('hidden');
      applyLanguage();
    }
  };

  startIntroSequence(introCv, afterIntro);

  const trySkip = () => { if (isIntroActive()) skipIntroSequence(); };
  window.addEventListener('keydown', (e) => {
    if (e.key === 'F5' || e.key === 'F12') return;
    trySkip();
  });
  introCv.addEventListener('pointerdown', trySkip);

  const es = document.getElementById('btn-es');
  const en = document.getElementById('btn-en');
  if (es) es.onclick = () => { setLang('es'); begin(); };
  if (en) en.onclick = () => { setLang('en'); begin(); };
}

export function updateIntro() {
  if (isIntroActive()) drawIntro();
}