// ================= Ciudad Marea → Minimal Horde =================
// La prosperidad nueva de tu pueblo llega a este juego como ORO.
// El servidor (Horda.gs) lleva el ORO total que tu ciudad te ha dado; aquí se guarda, por usuario y por
// dispositivo, cuánto ya entró a la partida. Al sincronizar solo se suma la diferencia: nunca llega dos veces.
// El ORO es virtual: no se compra con dinero ni se cambia por dinero o premios. Jugar nunca toca tus posiciones.
import { Resources } from './resources.js';
import { Save } from './save.js';
import { Bus } from './events.js';

const CONFIG = {
  // la misma URL /exec de tu Apps Script que usa la ciudad. Vacío = modo demostración
  API_URL: 'https://script.google.com/macros/s/AKfycbwQ27XpCTCNOmOPxSGCu7gB8UJx40QPaoAlyXx2rvORM31OER6X9GQABBMS88Do-wCGIw/exec',
  // dirección de tu ciudad, para el botón "Ir a mi ciudad" y para crear cuenta
  CIUDAD_URL: 'https://TU-USUARIO.github.io/TU-CIUDAD/'
};
const DEMO = !CONFIG.API_URL;
const CADA_MIN = 10;   // cada cuánto se revisa si tu ciudad dio más ORO
const $ = id => document.getElementById(id);
const ss = { get: k => { try { return sessionStorage.getItem(k); } catch (_) { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (_) {} }, del: k => { try { sessionStorage.removeItem(k); } catch (_) {} } };
const ls = { get: k => { try { return localStorage.getItem(k); } catch (_) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} } };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pesos = n => '$' + Math.round(Number(n) || 0).toLocaleString('es-MX');

let token = ss.get('hm_token'), usuario = ss.get('hm_user') || '', estado = null, timer = 0, ocupado = false;

// ---------- servidor ----------
let demoOro = 10, demoProsp = 1200;
async function api(accion, data = {}) {
  if (DEMO) {
    await new Promise(r => setTimeout(r, 250));
    if (accion === 'login') return { ok: true, token: 'demo', nombre: data.usuario || 'Gobernador' };
    demoProsp += 180; const nuevo = Math.floor((demoProsp - 1200) / 100) + 10;
    if (nuevo > demoOro) demoOro = nuevo;
    return { ok: true, nombre: 'Gobernador de ejemplo', oro_total: demoOro, pesos_por_oro: 100, prosperidad: demoProsp, siguiente: 100 - (demoProsp - 1200) % 100,
      movimientos: [{ fecha: new Date().toISOString(), tipo: 'CREDITO', monto: 1, detalle: 'Datos de ejemplo' }] };
  }
  const res = await fetch(CONFIG.API_URL, { method: 'POST', body: JSON.stringify({ accion, token, ...data }) });
  if (!res.ok) throw new Error('El servidor respondió ' + res.status + '. Inténtalo en un momento.');
  const j = await res.json();
  if (!j.ok) {
    if (String(j.error).startsWith('SESION:')) { salir(true); throw new Error(j.error.slice(7).trim()); }
    throw new Error(j.error || 'Algo falló en el servidor.');
  }
  return j;
}

// ---------- ORO: solo entra la diferencia ----------
const claveRecibido = () => 'hm_recibido_' + (usuario || 'demo').toLowerCase();
async function sincronizar(avisar) {
  if (!token || ocupado) return;
  ocupado = true; pintarBoton('…');
  try {
    estado = await api('horda_estado');
    const total = Math.max(0, Math.floor(Number(estado.oro_total) || 0));
    const ya = Math.max(0, Math.floor(Number(ls.get(claveRecibido())) || 0));
    const nuevo = total - ya;
    if (nuevo > 0) {
      Resources.add('ORO', nuevo);
      ls.set(claveRecibido(), String(total));
      Save.write();
      Bus.emit('toast', { msg: `+${nuevo} ORO DE TU CIUDAD` });
    } else if (avisar) Bus.emit('toast', { msg: 'TU CIUDAD NO TIENE ORO NUEVO TODAVÍA' });
    estado.recibido_aqui = Math.max(total, ya);
    estado.nuevo = Math.max(0, nuevo);
  } catch (e) {
    if (avisar) Bus.emit('toast', { msg: String(e.message || e).toUpperCase() });
  } finally {
    ocupado = false; pintarBoton(); if (!$('cm-panel').hidden) pintarPanel();
  }
}

// ---------- pantalla para conectar la ciudad ----------
function montar() {
  const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'css/ciudad.css'; document.head.appendChild(css);
  const gate = document.createElement('div'); gate.id = 'cm-gate'; gate.hidden = true;
  gate.innerHTML = `<form class="cm-card" id="cm-form" autocomplete="on">
      <div class="cm-k">CIUDAD MAREA // MINIMAL HORDE</div>
      <h1>CONECTA TU CIUDAD</h1>
      <p>La prosperidad nueva de tu pueblo llega a este juego como <b class="cm-oro">ORO</b>: ganancias, ventas con ganancia e intereses.</p>
      <label>USUARIO<input id="cm-user" name="username" autocomplete="username" required></label>
      <label>CONTRASEÑA<input id="cm-pin" name="password" type="password" autocomplete="current-password" required></label>
      <div class="cm-err" id="cm-err"></div>
      <button type="submit" class="hudbtn cm-go" id="cm-go">ENTRAR Y JUGAR</button>
      <p class="cm-note">Usa el mismo usuario y contraseña de tu ciudad. ¿No tienes cuenta? <a id="cm-crear" target="_blank" rel="noopener">Créala en tu ciudad</a>.</p>
      ${DEMO ? '<p class="cm-note cm-demo">MODO DEMOSTRACIÓN: escribe cualquier usuario y contraseña.</p>' : ''}
      <p class="cm-note">El ORO es virtual: no se compra con dinero ni se cambia por dinero o premios. Jugar nunca toca tus inversiones.</p>
      <p class="cm-note cm-cred">Minimal Horde es un juego de vicen, usado con su permiso.</p>
    </form>`;
  document.body.appendChild(gate);
  $('cm-crear').href = CONFIG.CIUDAD_URL;
  if (usuario) $('cm-user').value = usuario;
  $('cm-form').addEventListener('submit', async e => {
    e.preventDefault();
    const b = $('cm-go'); b.disabled = true; $('cm-err').textContent = '';
    try {
      const r = await api('login', { usuario: $('cm-user').value.trim(), pin: $('cm-pin').value });
      token = r.token; usuario = $('cm-user').value.trim().toLowerCase();
      ss.set('hm_token', token); ss.set('hm_user', usuario); $('cm-pin').value = '';
      gate.hidden = true; Bus.emit('pause', false);
      await sincronizar(false);
      programar();
    } catch (err) { $('cm-err').textContent = err.message; }
    b.disabled = false;
  });

  // botón en la barra del juego y panel con el detalle
  const hud = $('hud-right');
  const btn = document.createElement('button'); btn.id = 'btn-ciudad'; btn.className = 'hudbtn cm-btn'; btn.type = 'button';
  if (hud) hud.insertBefore(btn, hud.firstChild);
  btn.addEventListener('pointerdown', e => { e.preventDefault(); abrirPanel(); });
  const panel = document.createElement('div'); panel.id = 'cm-panel'; panel.hidden = true;
  document.body.appendChild(panel);
  pintarBoton();
}
function pintarBoton(txt) {
  const b = $('btn-ciudad'); if (!b) return;
  b.textContent = txt || (estado ? `CIUDAD · ${estado.oro_total} ORO` : 'CIUDAD');
}
function abrirPanel() { $('cm-panel').hidden = false; Bus.emit('pause', true); pintarPanel(); }
function cerrarPanel() { $('cm-panel').hidden = true; Bus.emit('pause', false); }
function pintarPanel() {
  const p = $('cm-panel'), E = estado;
  const movs = E && E.movimientos ? E.movimientos.slice(0, 6).map(m => `<li><span>${m.tipo === 'BONO' ? 'BIENVENIDA' : 'PROSPERIDAD'}</span><b>+${esc(m.monto)} ORO</b><small>${esc(String(m.fecha).slice(0, 10))}</small></li>`).join('') : '';
  p.innerHTML = `<div class="cm-card">
    <div class="cm-k">CIUDAD MAREA</div>
    <h1>${E ? esc(String(E.nombre).toUpperCase()) : 'TU CIUDAD'}</h1>
    ${E ? `<div class="cm-stats">
        <div><span>ORO QUE TU CIUDAD TE HA DADO</span><b class="cm-oro">${E.oro_total}</b></div>
        <div><span>PROSPERIDAD DE TU PUEBLO</span><b>${pesos(E.prosperidad)}</b></div>
        <div><span>FALTAN PARA EL SIGUIENTE ORO</span><b>${pesos(E.siguiente)}</b></div>
      </div>
      <p>Cada <b>${pesos(E.pesos_por_oro)}</b> de prosperidad nueva = <b class="cm-oro">1 ORO</b>. Si tu pueblo baja, no pierdes ORO; vuelve a contar cuando supera su máximo anterior.</p>
      ${movs ? `<ul class="cm-movs">${movs}</ul>` : ''}` : '<p>Todavía no se conecta con tu ciudad.</p>'}
    <div class="cm-acts">
      <button type="button" class="hudbtn" id="cm-sync">${ocupado ? 'REVISANDO…' : 'REVISAR ORO NUEVO'}</button>
      <a class="hudbtn" id="cm-ir" target="_blank" rel="noopener">IR A MI CIUDAD</a>
      <button type="button" class="hudbtn" id="cm-out">SALIR</button>
      <button type="button" class="hudbtn" id="cm-close">CERRAR</button>
    </div>
    <p class="cm-note">El ORO es virtual: no se compra con dinero ni se cambia por dinero o premios.</p>
  </div>`;
  $('cm-ir').href = CONFIG.CIUDAD_URL;
  $('cm-sync').onclick = () => sincronizar(true);
  $('cm-out').onclick = () => { cerrarPanel(); salir(false); };
  $('cm-close').onclick = cerrarPanel;
}

function programar() { clearInterval(timer); timer = setInterval(() => { if (!document.hidden) sincronizar(false); }, CADA_MIN * 60000); }
function salir(expirada) {
  if (!expirada && token && !DEMO) api('salir').catch(() => {});
  token = null; estado = null; ss.del('hm_token'); clearInterval(timer);
  pintarBoton();
  $('cm-err').textContent = expirada ? 'Tu sesión terminó. Vuelve a entrar.' : '';
  $('cm-gate').hidden = false; Bus.emit('pause', true);
}

montar();
if (token) { sincronizar(false); programar(); }
else { $('cm-gate').hidden = false; Bus.emit('pause', true); }
document.addEventListener('visibilitychange', () => { if (!document.hidden && token) sincronizar(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('cm-panel').hidden) cerrarPanel(); });
