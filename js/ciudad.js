// ================= Ciudad Marea → Minimal Horde =================
// Tu ciudad alimenta este juego:
//  · ORO: toda la ganancia de tus inversiones se vuelve ORO (sin tope; 1 ORO por cada $10, ajustable en la hoja).
//  · BONOS: el tamaño de tu ciudad da daño y vida; tu rendimiento da XP y monedas; seguir tu plan duplica el ORO dorado.
//  · CLIMA: el mercado de hoy en tu ciudad cambia el juego (día verde, rebajas en días rojos, tormentas).
//  · JEFES DEL MERCADO: los jefes llevan el nombre de tus emisoras; entre más rinde la emisora, más ORO suelta.
//  · OBRAS: gasta ORO en edificios que suben sin límite (cada nivel cuesta más).
//  · COFRE: tus rentas, intereses y dividendos de un día, una vez al día, con racha.
//  · RANKING: récords del juego entre gobernadores (nunca montos de dinero).
//  · META FINAL: ganas el juego cuando tu ciudad llega a $1,000,000 de ganancias (se cambia en la hoja Juego).
// El servidor (Horda.gs) lleva el ORO total que tu ciudad te ha dado; aquí se guarda, por usuario y por dispositivo,
// cuánto ya entró a la partida. Al sincronizar solo se suma la diferencia: nunca llega dos veces.
// El ORO es virtual: no se compra con dinero ni se cambia por dinero o premios. Jugar nunca toca tus posiciones.
import { Resources } from './resources.js';
import { Save } from './save.js';
import { Bus } from './events.js';
import { Global, Heroes } from './heroes.js';
import { Combat } from './combat.js';
import { World } from './world.js';
import { Shop } from './shop.js';
import { Accelerator } from './inventory.js';
import { BAL } from './config.js';

const CONFIG = {
  // la misma URL /exec de tu Apps Script que usa la ciudad. Vacío = modo demostración
  API_URL: 'https://script.google.com/macros/s/AKfycbwQ27XpCTCNOmOPxSGCu7gB8UJx40QPaoAlyXx2rvORM31OER6X9GQABBMS88Do-wCGIw/exec',
  // dirección de tu ciudad, para el botón "Ir a mi ciudad" y para crear cuenta
  CIUDAD_URL: 'https://ehm949.github.io/ciudad.html/'
};

// ---------- AJUSTES DEL JUEGO (cámbialos aquí para balancear) ----------
const AJ = {
  tamano: 15,          // % de daño y vida por cada escalón de tamaño: $10 mil ≈ 1 escalón, $100 mil ≈ 2, $1 millón ≈ 3
  rendimiento: 1.5,    // % de XP y de monedas por cada 1% que rinde tu ciudad (sin tope)
  equilibrio: { oro: 2, todo: 10 },              // tus barrios dentro de tus metas: ORO dorado ×2 y +10% a todo
  verde: { monedas: 25, dorados: 1.5 },          // tu ciudad sube hoy
  rojo: { descuento: 30 },                       // tu ciudad baja hoy: la tienda tiene rebajas
  tormenta: { enemigos: 1.4, monedas: 50 },      // caída fuerte o tormenta del Ayuntamiento
  jefeBase: 5,         // ORO base por jefe del mercado; se suma el rendimiento % de la emisora
  obraCosto: 15, obraCrece: 1.2                  // costo de una obra: 15 × 1.2^nivel
};
const OBRAS = [
  { id: 'torre',    nombre: 'TORRE DE BOLSA',   efecto: 'dmg', por: 6, txt: 'daño' },
  { id: 'muralla',  nombre: 'MURALLA DE CETES', efecto: 'hp',  por: 6, txt: 'vida' },
  { id: 'mercado',  nombre: 'MERCADO DE RENTAS', efecto: 'cur', por: 6, txt: 'monedas' },
  { id: 'academia', nombre: 'ACADEMIA',          efecto: 'xp',  por: 6, txt: 'experiencia' },
  { id: 'faro',     nombre: 'FARO DORADO',       efecto: 'dorados', por: 4, txt: 'enemigos dorados' }
];
const CLIMA = {
  VERDE:    { ico: '▲', nombre: 'DÍA VERDE', cls: 'cm-verde', txt: `Tu ciudad sube hoy: +${AJ.verde.monedas}% monedas y ${Math.round((AJ.verde.dorados - 1) * 100)}% más enemigos dorados.` },
  ROJO:     { ico: '▼', nombre: 'DÍA ROJO · REBAJAS', cls: 'cm-rojo', txt: `Tu ciudad baja hoy: la tienda tiene ${AJ.rojo.descuento}% de descuento. Las caídas también traen oportunidades.` },
  TORMENTA: { ico: '⚡', nombre: 'TORMENTA', cls: 'cm-tormenta', txt: `Caída fuerte en tu ciudad: ${Math.round((AJ.tormenta.enemigos - 1) * 100)}% más enemigos, pero +${AJ.tormenta.monedas}% monedas.` },
  CALMA:    { ico: '●', nombre: 'MERCADO EN CALMA', cls: 'cm-calma', txt: 'Hoy tu ciudad casi no se movió. Sin efectos de clima.' }
};

const DEMO = !CONFIG.API_URL;
const CADA_MIN = 10;   // cada cuánto se revisa si tu ciudad dio más ORO
const $ = id => document.getElementById(id);
const ss = { get: k => { try { return sessionStorage.getItem(k); } catch (_) { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (_) {} }, del: k => { try { sessionStorage.removeItem(k); } catch (_) {} } };
const ls = { get: k => { try { return localStorage.getItem(k); } catch (_) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} } };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = n => Math.round(Number(n) || 0).toLocaleString('es-MX');
const pesos = n => '$' + num(n);
const signo = n => (n > 0 ? '+' : '') + (Math.round(n * 10) / 10).toLocaleString('es-MX') + '%';

let token = ss.get('hm_token'), usuario = ss.get('hm_user') || '', estado = null, timer = 0, ocupado = false, pestana = 'ciudad';

// ---------- servidor ----------
const demo = { oro: 25, pico: 18000, cofre: true, racha: 3, dia: 0 };
async function api(accion, data = {}) {
  if (DEMO) {
    await new Promise(r => setTimeout(r, 200));
    if (accion === 'login') return { ok: true, token: 'demo', nombre: data.usuario || 'Gobernador' };
    if (accion === 'horda_cofre') { if (!demo.cofre) throw new Error('Ya abriste el cofre de hoy. Vuelve mañana.'); demo.cofre = false; demo.oro += 18; }
    demo.pico += 420; demo.oro = Math.max(demo.oro, 25 + Math.floor(demo.pico / 10) + (demo.cofre ? 0 : 18));
    return { ok: true, nombre: 'Gobernador de ejemplo', oro_total: demo.oro, pesos_por_oro: 10, prosperidad: demo.pico, pico: demo.pico, siguiente: 10 - demo.pico % 10,
      ciudad: { valor: 185000, rend_pct: 14.6, hoy_pct: -0.8, ingreso_diario: 38, equilibrio: true,
        grupos: [{ grupo: 'Acciones', peso: 51, objetivo: 50, en_rango: true }, { grupo: 'FIBRAs', peso: 19, objetivo: 20, en_rango: true }, { grupo: 'Renta fija', peso: 30, objetivo: 30, en_rango: true }],
        clima: { tipo: 'ROJO', tormentas: [] }, rentas: ['FUNO11'],
        activos: [{ activo: 'VUAA', clase: 'ACCIONES', rend_pct: 22.4 }, { activo: 'FUNO11', clase: 'FIBRAS', rend_pct: 8.1 }, { activo: 'VEA', clase: 'ACCIONES', rend_pct: -3.2 }] },
      meta: { pesos: 1000000, progreso: Math.min(100, demo.pico / 10000), cumplida: demo.pico >= 1000000, fecha: '' },
      cofre: { disponible: demo.cofre, oro: 18, racha: demo.racha, rentas: true, abierto: accion === 'horda_cofre' ? 18 : 0 },
      ranking: { lista: [{ lugar: 1, nombre: 'Maur', record_m: 4200, jefes: 8, nivel: 52 }, { lugar: 2, nombre: 'Tú', record_m: 2500, jefes: 4, nivel: 33, yo: true }, { lugar: 3, nombre: 'Ana', record_m: 900, jefes: 1, nivel: 14 }], mi_lugar: 2, total: 3 },
      movimientos: [{ fecha: new Date().toISOString(), tipo: 'CREDITO', monto: 42, detalle: 'Datos de ejemplo' }, { fecha: new Date().toISOString(), tipo: 'BONO', monto: 25, detalle: '' }] };
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

// ---------- récords del juego (para el ranking) ----------
const claveUsr = k => 'hm_' + k + '_' + (usuario || 'demo').toLowerCase();
function records() {
  let r = {}; try { r = JSON.parse(ls.get(claveUsr('record')) || '{}'); } catch (_) {}
  const nivel = Math.max(0, ...Heroes.list.map(h => h.level || 0));
  r = { record_m: Math.max(r.record_m || 0, Math.floor(World.dist || 0)), jefes: Math.max(r.jefes || 0, World.bossesKilled || 0), nivel: Math.max(r.nivel || 0, nivel) };
  ls.set(claveUsr('record'), JSON.stringify(r));
  return r;
}

// ---------- ORO: solo entra la diferencia ----------
async function sincronizar(avisar, accion = 'horda_estado') {
  if (!token || ocupado) return null;
  ocupado = true; pintarBoton('…');
  try {
    const prev = estado;
    estado = await api(accion, { juego: records() });
    const total = Math.max(0, Math.floor(Number(estado.oro_total) || 0));
    const ya = Math.max(0, Math.floor(Number(ls.get(claveUsr('recibido'))) || 0));
    const nuevo = total - ya;
    if (nuevo > 0) {
      Resources.add('ORO', nuevo);
      ls.set(claveUsr('recibido'), String(total));
      Save.write();
      Bus.emit('toast', { msg: `+${num(nuevo)} ORO DE TU CIUDAD` });
    } else if (avisar) Bus.emit('toast', { msg: 'TU CIUDAD NO TIENE ORO NUEVO TODAVÍA' });
    aplicar(!prev || (prev.ciudad && estado.ciudad && prev.ciudad.clima.tipo !== estado.ciudad.clima.tipo));
    revisarMeta(prev);
    return estado;
  } catch (e) {
    if (avisar) Bus.emit('toast', { msg: String(e.message || e).toUpperCase() });
    return null;
  } finally {
    ocupado = false; pintarBoton(); if (!$('cm-panel').hidden) pintarPanel();
  }
}

// ---------- OBRAS: el ORO se invierte en edificios que nunca llegan al tope ----------
function leerObras() { try { return JSON.parse(ls.get(claveUsr('obras')) || '{}'); } catch (_) { return {}; } }
let obras = {};
const costoObra = lv => Math.ceil(AJ.obraCosto * Math.pow(AJ.obraCrece, lv));
function comprarObra(id, max) {
  let n = 0;
  do {
    const c = costoObra(obras[id] || 0);
    if (!Resources.spend('ORO', c)) break;
    obras[id] = (obras[id] || 0) + 1; n++;
  } while (max && n < 500);
  if (!n) { Bus.emit('toast', { msg: 'TE FALTA ORO PARA ESA OBRA' }); return; }
  ls.set(claveUsr('obras'), JSON.stringify(obras)); Save.write();
  const o = OBRAS.find(x => x.id === id);
  Bus.emit('toast', { msg: `${o.nombre} NIVEL ${obras[id]}` });
  aplicar(false); pintarPanel();
}

// ---------- BONOS: lo que tu ciudad le da a tu héroe ----------
const MOD = { spawn: 1, oro: 1, dorados: 1, precio: 1 };
function bonos() {
  const C = estado && estado.ciudad, L = [];
  const ef = { dmg: 0, hp: 0, cur: 0, xp: 0 };
  if (C) {
    const esc10 = Math.log10(1 + (C.valor || 0) / 1000);
    const t = AJ.tamano * esc10;
    if (t > 0) { ef.dmg += t; ef.hp += t; L.push({ n: 'TAMAÑO DE TU CIUDAD', v: `+${Math.round(t)}% daño y vida`, d: `Tu ciudad vale ${pesos(C.valor)}.` }); }
    const r = Math.max(0, (C.rend_pct || 0) * AJ.rendimiento);
    if (r > 0) { ef.xp += r; ef.cur += r; L.push({ n: 'RENDIMIENTO', v: `+${Math.round(r)}% XP y monedas`, d: `Tu ciudad rinde ${signo(C.rend_pct)} sobre lo invertido.` }); }
    else L.push({ n: 'RENDIMIENTO', v: 'sin bono por ahora', d: `Tu ciudad rinde ${signo(C.rend_pct || 0)}. Cuando esté en positivo, da XP y monedas.`, off: true });
    if (C.equilibrio === true) {
      ef.dmg += AJ.equilibrio.todo; ef.hp += AJ.equilibrio.todo; ef.cur += AJ.equilibrio.todo; ef.xp += AJ.equilibrio.todo;
      L.push({ n: 'CIUDAD EN EQUILIBRIO', v: `ORO dorado ×${AJ.equilibrio.oro} y +${AJ.equilibrio.todo}% a todo`, d: 'Todos tus barrios están dentro de las metas que tú pusiste.' });
    } else if (C.equilibrio === false) {
      const fuera = (C.grupos || []).filter(g => !g.en_rango).map(g => `${g.grupo} ${num(g.peso)}% (meta ${num(g.objetivo)}%)`).join(', ');
      L.push({ n: 'CIUDAD EN EQUILIBRIO', v: 'inactivo', d: `Fuera de tu meta: ${fuera}. Rebalancea en tu ciudad para activarlo.`, off: true });
    } else L.push({ n: 'CIUDAD EN EQUILIBRIO', v: 'inactivo', d: 'Define tus metas en el Ayuntamiento de tu ciudad para activarlo.', off: true });
    const k = CLIMA[C.clima && C.clima.tipo] || CLIMA.CALMA;
    if (C.clima.tipo === 'VERDE') ef.cur += AJ.verde.monedas;
    if (C.clima.tipo === 'TORMENTA') ef.cur += AJ.tormenta.monedas;
  }
  let dorados = 1;
  for (const o of OBRAS) {
    const lv = obras[o.id] || 0; if (!lv) continue;
    if (o.efecto === 'dorados') dorados *= 1 + o.por * lv / 100; else ef[o.efecto] += o.por * lv;
  }
  return { L, ef, dorados };
}
const BASE = { gb: BAL.goldenChanceBase, gm: BAL.goldenChanceMax };
function aplicar(avisarClima) {
  const B = bonos(), C = estado && estado.ciudad, tipo = C ? C.clima.tipo : 'CALMA';
  for (const k of ['dmg', 'hp', 'cur', 'xp']) Global.put(k, 'ciudad', { add: B.ef[k] / 100 });
  MOD.oro = C && C.equilibrio === true ? AJ.equilibrio.oro : 1;
  MOD.spawn = tipo === 'TORMENTA' ? AJ.tormenta.enemigos : 1;
  MOD.dorados = B.dorados * (tipo === 'VERDE' ? AJ.verde.dorados : 1);
  MOD.precio = tipo === 'ROJO' ? 1 - AJ.rojo.descuento / 100 : 1;
  BAL.goldenChanceBase = BASE.gb * MOD.dorados; BAL.goldenChanceMax = BASE.gm * MOD.dorados;
  reprecio();
  try { Combat.refreshStats(); } catch (_) {}
  if (avisarClima && C) {
    const k = CLIMA[tipo] || CLIMA.CALMA;
    if (tipo !== 'CALMA') Bus.emit('toast', { msg: `${k.ico} ${k.nombre} EN TU CIUDAD` });
    if (C.rentas && C.rentas.length && estado.cofre && estado.cofre.disponible) Bus.emit('toast', { msg: `DÍA DE RENTAS DE ${C.rentas[0]} · TU COFRE DA EL DOBLE` });
  }
}

// ---------- cambios mínimos al juego (sin tocar sus archivos) ----------
const spawnOrig = Accelerator.spawnMul.bind(Accelerator);
Accelerator.spawnMul = () => spawnOrig() * MOD.spawn;
const oroOrig = Shop.oroMul.bind(Shop);
Shop.oroMul = () => oroOrig() * MOD.oro;
const precio = c => Math.max(1, Math.ceil(c * MOD.precio));
function reprecio() {
  for (const o of Shop.offers) { if (o.base == null) o.base = o.cost; o.cost = precio(o.base); }
}
const ofertaOrig = Shop.makeOffer.bind(Shop);
Shop.makeOffer = () => { const o = ofertaOrig(); o.base = o.cost; o.cost = precio(o.base); return o; };
const rerollOrig = Shop.rerollCost.bind(Shop);
Shop.rerollCost = () => precio(rerollOrig());

// ---------- JEFES DEL MERCADO: tus emisoras son los jefes ----------
let jefe = null;
Bus.on('bossSpawn', () => {
  const A = estado && estado.ciudad && estado.ciudad.activos;
  if (!A || !A.length || !World.boss) { jefe = null; return; }
  jefe = A[(World.bossesKilled || 0) % A.length];
  World.boss.bossName = `${jefe.activo.toUpperCase()} ${jefe.rend_pct >= 0 ? '▲' : '▼'}${Math.abs(jefe.rend_pct).toLocaleString('es-MX')}%`;
  Bus.emit('toast', { msg: `JEFE DEL MERCADO: ${jefe.activo.toUpperCase()}` });
});
Bus.on('bossKill', () => {
  if (!jefe) return;
  const oro = Math.max(AJ.jefeBase, Math.round(AJ.jefeBase + (jefe.rend_pct || 0)));
  Resources.add('ORO', oro);
  Bus.emit('toast', { msg: `VENCISTE A ${jefe.activo.toUpperCase()} · +${num(oro)} ORO` });
  jefe = null;
  setTimeout(() => sincronizar(false), 1500);   // sube tu récord de jefes al ranking
});

// ---------- COFRE ----------
async function abrirCofre() {
  const r = await sincronizar(true, 'horda_cofre');
  if (!r || !r.cofre || !r.cofre.abierto) return;
  // además del ORO, dos minutos de botín al ritmo actual
  for (const k of ['CIR', 'TRI', 'CUA', 'HEX']) {
    const v = Math.round((Resources.rates[k] || 0) * 120 + (k === 'HEX' ? 0 : 25));
    if (v > 0) Resources.add(k, v);
  }
  Bus.emit('toast', { msg: `COFRE ABIERTO · RACHA ${r.cofre.racha} ${r.cofre.racha === 1 ? 'DÍA' : 'DÍAS'}` });
}

// ---------- pantalla para conectar la ciudad ----------
function montar() {
  const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'css/ciudad.css'; document.head.appendChild(css);
  const gate = document.createElement('div'); gate.id = 'cm-gate'; gate.hidden = true;
  gate.innerHTML = `<form class="cm-card" id="cm-form" autocomplete="on">
      <div class="cm-k">CIUDAD MAREA // MINIMAL HORDE</div>
      <h1>CONECTA TU CIUDAD</h1>
      <p>Lo que ganan tus inversiones llega a este juego como <b class="cm-oro">ORO</b>, y tu ciudad le da poder a tu héroe.</p>
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
      obras = leerObras();
      gate.hidden = true; Bus.emit('pause', false);
      await sincronizar(false);
      programar();
    } catch (err) { $('cm-err').textContent = err.message; }
    b.disabled = false;
  });

  const hud = $('hud-right');
  const btn = document.createElement('button'); btn.id = 'btn-ciudad'; btn.className = 'hudbtn cm-btn'; btn.type = 'button';
  if (hud) hud.insertBefore(btn, hud.firstChild);
  btn.addEventListener('pointerdown', e => { e.preventDefault(); abrirPanel(); });
  const panel = document.createElement('div'); panel.id = 'cm-panel'; panel.hidden = true;
  panel.addEventListener('pointerdown', e => { if (e.target === panel) cerrarPanel(); });
  document.body.appendChild(panel);
  pintarBoton();
}
function pintarBoton(txt) {
  const b = $('btn-ciudad'); if (!b) return;
  const k = estado && estado.ciudad ? CLIMA[estado.ciudad.clima.tipo] || CLIMA.CALMA : null;
  b.className = 'hudbtn cm-btn' + (k ? ' ' + k.cls : '') + (estado && estado.cofre && estado.cofre.disponible ? ' cm-hay-cofre' : '');
  const gano = estado && estado.meta && estado.meta.cumplida;
  b.innerHTML = txt ? esc(txt) : estado ? `<i>${k ? k.ico : ''}</i> ${gano ? '★ ' : ''}CIUDAD · ${num(Resources.data.ORO || 0)} ORO` : 'CIUDAD';
}
setInterval(() => { if (estado && !ocupado) pintarBoton(); }, 1000);   // el ORO cambia al jugar y al comprar
function abrirPanel() { $('cm-panel').hidden = false; Bus.emit('pause', true); pintarPanel(); }
function cerrarPanel() { $('cm-panel').hidden = true; Bus.emit('pause', false); }

// ---------- panel con pestañas ----------
const TABS = [['ciudad', 'CIUDAD'], ['obras', 'OBRAS'], ['cofre', 'COFRE'], ['ranking', 'RANKING']];
function pintarPanel() {
  const p = $('cm-panel'), E = estado;
  if (!E) {
    p.innerHTML = `<div class="cm-card"><div class="cm-k">CIUDAD MAREA</div><h1>TU CIUDAD</h1><p>Todavía no se conecta con tu ciudad.</p>
      <div class="cm-acts"><button type="button" class="hudbtn" id="cm-sync">${ocupado ? 'REVISANDO…' : 'REINTENTAR'}</button><button type="button" class="hudbtn" id="cm-close">CERRAR</button></div></div>`;
    $('cm-sync').onclick = () => sincronizar(true); $('cm-close').onclick = cerrarPanel; return;
  }
  const tabs = TABS.map(([id, t]) => `<button type="button" class="cm-tab${pestana === id ? ' on' : ''}${id === 'cofre' && E.cofre && E.cofre.disponible ? ' cm-dot' : ''}" data-t="${id}">${t}</button>`).join('');
  const cuerpo = { ciudad: vistaCiudad, obras: vistaObras, cofre: vistaCofre, ranking: vistaRanking }[pestana]();
  p.innerHTML = `<div class="cm-card cm-wide">
    <div class="cm-top"><div><div class="cm-k">CIUDAD MAREA</div><h1>${esc(String(E.nombre).toUpperCase())}</h1></div>
      <div class="cm-orobig"><b class="cm-oro">${num(Resources.data.ORO || 0)}</b><span>ORO</span></div></div>
    ${barraMeta()}
    <div class="cm-tabs">${tabs}</div>
    <div class="cm-body">${cuerpo}</div>
    <div class="cm-acts">
      <button type="button" class="hudbtn" id="cm-sync">${ocupado ? 'REVISANDO…' : 'REVISAR ORO NUEVO'}</button>
      <a class="hudbtn" id="cm-ir" target="_blank" rel="noopener">IR A MI CIUDAD</a>
      <button type="button" class="hudbtn" id="cm-out">SALIR</button>
      <button type="button" class="hudbtn cm-cerrar" id="cm-close">CERRAR</button>
    </div>
    <p class="cm-note">El ORO es virtual: no se compra con dinero ni se cambia por dinero o premios.</p>
  </div>`;
  p.querySelectorAll('.cm-tab').forEach(b => b.onclick = () => { pestana = b.dataset.t; pintarPanel(); });
  p.querySelectorAll('[data-obra]').forEach(b => b.onclick = () => comprarObra(b.dataset.obra, b.dataset.max === '1'));
  const cf = $('cm-cofre'); if (cf) cf.onclick = () => { cf.disabled = true; abrirCofre(); };
  $('cm-ir').href = CONFIG.CIUDAD_URL;
  $('cm-sync').onclick = () => sincronizar(true);
  $('cm-out').onclick = () => { cerrarPanel(); salir(false); };
  $('cm-close').onclick = cerrarPanel;
}

// ---------- META FINAL: $1,000,000 de ganancias de tu ciudad ----------
function barraMeta() {
  const M = estado && estado.meta; if (!M) return '';
  const p = Math.max(0, Math.min(100, Number(M.progreso) || 0));
  return `<div class="cm-meta${M.cumplida ? ' hecha' : ''}"><div class="cm-meta-t"><span>${M.cumplida ? '★ META CUMPLIDA' : 'META FINAL DEL JUEGO'}</span>
    <b>${pesos(estado.pico ?? estado.prosperidad)} / ${pesos(M.pesos)}</b></div>
    <div class="cm-meta-bar"><i style="width:${p}%"></i>${[25, 50, 75].map(h => `<u style="left:${h}%"></u>`).join('')}</div>
    <small>${M.cumplida ? 'Ganaste el juego. Puedes seguir jugando en modo libre.' : `${p < 10 ? p.toLocaleString('es-MX', { maximumFractionDigits: 2 }) : num(p)}% · el juego se gana cuando tu ciudad genera ${pesos(M.pesos)} de ganancias.`}</small></div>`;
}
function revisarMeta(prev) {
  const M = estado && estado.meta; if (!M) return;
  // hitos del camino: 25%, 50% y 75%
  const antes = prev && prev.meta ? Number(prev.meta.progreso) || 0 : Number(ls.get(claveUsr('hito'))) || 0;
  const hito = [25, 50, 75].filter(h => M.progreso >= h && antes < h).pop();
  if (hito && !M.cumplida) Bus.emit('toast', { msg: `★ TU CIUDAD VA AL ${hito}% DE LA META FINAL` });
  ls.set(claveUsr('hito'), String(M.progreso));
  if (M.cumplida && ls.get(claveUsr('victoria')) !== '1') victoria();
}
function victoria() {
  const M = estado.meta, r = records();
  let v = $('cm-victoria');
  if (!v) { v = document.createElement('div'); v.id = 'cm-victoria'; document.body.appendChild(v); }
  const fecha = M.fecha ? new Date(M.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  v.innerHTML = `<div class="cm-card cm-win">
    <div class="cm-k">CIUDAD MAREA // MINIMAL HORDE</div>
    <div class="cm-win-star">★</div>
    <h1>¡GANASTE EL JUEGO!</h1>
    <p>Tu ciudad generó <b class="cm-oro">${pesos(M.pesos)}</b> de ganancias${fecha ? ' el ' + esc(fecha) : ''}. Lo construiste invirtiendo con paciencia, barrio por barrio.</p>
    <div class="cm-stats">
      <div><span>ORO QUE TE DIO TU CIUDAD</span><b class="cm-oro">${num(estado.oro_total)}</b></div>
      <div><span>RÉCORD DE DISTANCIA</span><b>${num(r.record_m)} m</b></div>
      <div><span>JEFES DEL MERCADO VENCIDOS</span><b>${num(r.jefes)}</b></div>
      <div><span>NIVEL MÁS ALTO</span><b>${num(r.nivel)}</b></div>
    </div>
    <div class="cm-acts"><button type="button" class="hudbtn cm-go" id="cm-seguir">SEGUIR JUGANDO</button><a class="hudbtn" href="${esc(CONFIG.CIUDAD_URL)}" target="_blank" rel="noopener">IR A MI CIUDAD</a></div>
    <p class="cm-note">En modo libre tu ciudad sigue dando ORO y bonos como siempre.</p>
  </div>`;
  v.hidden = false; Bus.emit('pause', true);
  $('cm-seguir').onclick = () => { ls.set(claveUsr('victoria'), '1'); v.hidden = true; Bus.emit('pause', false); };
}

function vistaCiudad() {
  const E = estado, C = E.ciudad || {}, k = CLIMA[C.clima && C.clima.tipo] || CLIMA.CALMA, B = bonos();
  const torm = C.clima && C.clima.tormentas && C.clima.tormentas.length ? ` (${C.clima.tormentas.map(x => x.toLowerCase()).join(', ')})` : '';
  const jefes = (C.activos || []).slice(0, 4).map(a => `<span class="cm-chip ${a.rend_pct >= 0 ? 'up' : 'down'}">${esc(a.activo)} ${a.rend_pct >= 0 ? '▲' : '▼'}${Math.abs(a.rend_pct).toLocaleString('es-MX')}%</span>`).join('');
  return `
    <div class="cm-clima ${k.cls}"><b>${k.ico} ${k.nombre}</b><span>hoy ${signo(C.hoy_pct || 0)}${esc(torm)}</span><p>${k.txt}</p></div>
    <div class="cm-stats">
      <div><span>PROSPERIDAD MÁXIMA DE TU PUEBLO</span><b>${pesos(E.pico ?? E.prosperidad)}</b></div>
      <div><span>FALTAN PARA EL SIGUIENTE ORO</span><b>${pesos(E.siguiente)}</b></div>
    </div>
    <p class="cm-mini">Cada <b>${pesos(E.pesos_por_oro)}</b> que gana tu ciudad = <b class="cm-oro">1 ORO</b>, sin tope. Si baja, no pierdes ORO.</p>
    <div class="cm-sub">BONOS DE TU CIUDAD</div>
    <ul class="cm-bonos">${B.L.map(b => `<li class="${b.off ? 'off' : ''}"><div><b>${b.n}</b><small>${esc(b.d)}</small></div><em>${esc(b.v)}</em></li>`).join('')}</ul>
    ${jefes ? `<div class="cm-sub">JEFES DEL MERCADO</div><p class="cm-mini">Cada jefe lleva el nombre de una de tus emisoras. Al vencerlo te da ${AJ.jefeBase} ORO más su rendimiento.</p><div class="cm-chips">${jefes}</div>` : ''}`;
}

function vistaObras() {
  const oro = Resources.data.ORO || 0;
  return `<p class="cm-mini">Invierte tu ORO en tu ciudad. Las obras no tienen tope, pero cada nivel cuesta más. Se conservan al renacer.</p>
    <ul class="cm-obras">${OBRAS.map(o => {
      const lv = obras[o.id] || 0, c = costoObra(lv), ok = oro >= c;
      return `<li><div><b>${o.nombre} <small>NV ${lv}</small></b><small>+${o.por}% ${o.txt} por nivel · ahora +${num(o.por * lv)}%</small></div>
        <span class="cm-ob-btns"><button type="button" class="hudbtn${ok ? '' : ' cm-no'}" data-obra="${o.id}">${num(c)} ORO</button>
        <button type="button" class="hudbtn${ok ? '' : ' cm-no'}" data-obra="${o.id}" data-max="1">MÁX</button></span></li>`;
    }).join('')}</ul>`;
}

function vistaCofre() {
  const F = estado.cofre || {}, C = estado.ciudad || {};
  const rentas = C.rentas && C.rentas.length ? `<p class="cm-mini cm-oro">Hoy es día de rentas de ${esc(C.rentas.join(', '))}: el cofre da el doble.</p>` : '';
  return `<div class="cm-cofre-box">
      <div class="cm-cofre-ico${F.disponible ? ' listo' : ''}"></div>
      <div><b>${F.disponible ? 'TU COFRE DE HOY ESTÁ LISTO' : 'YA ABRISTE EL COFRE DE HOY'}</b>
      <p class="cm-mini">Trae las rentas, intereses y dividendos que tu ciudad produce en un día (unos ${pesos(C.ingreso_diario)}), en ORO, y dos minutos de botín.</p></div></div>
    ${rentas}
    <div class="cm-stats"><div><span>RACHA</span><b>${num(F.racha || 0)} ${F.racha === 1 ? 'día' : 'días'}</b></div>
      <div><span>${F.disponible ? 'ORO DE ESTE COFRE' : 'VUELVE MAÑANA'}</span><b class="cm-oro">${F.disponible ? '+' + num(F.oro) : '—'}</b></div></div>
    <p class="cm-mini">Cada día seguido suma 10% más (hasta el doble). Si faltas un día, la racha vuelve a empezar.</p>
    ${F.disponible ? '<button type="button" class="hudbtn cm-go" id="cm-cofre">ABRIR COFRE</button>' : ''}`;
}

function vistaRanking() {
  const R = estado.ranking;
  if (!R) return '<p class="cm-mini">El ranking está apagado en esta ciudad.</p>';
  const r = records();
  return `<p class="cm-mini">Los gobernadores que más lejos han llegado. Solo se comparten récords del juego y el primer nombre, nunca dinero.</p>
    <table class="cm-rank"><tr><th>#</th><th>GOBERNADOR</th><th>RÉCORD</th><th>JEFES</th><th>NV</th></tr>
    ${R.lista.map(x => `<tr class="${x.yo ? 'yo' : ''}"><td>${x.lugar}</td><td>${esc(x.nombre)}${x.yo ? ' (tú)' : ''}</td><td>${num(x.record_m)} m</td><td>${num(x.jefes)}</td><td>${num(x.nivel)}</td></tr>`).join('') || '<tr><td colspan="5">Nadie ha jugado todavía.</td></tr>'}
    </table>
    <p class="cm-mini">Tu récord en este dispositivo: <b>${num(r.record_m)} m</b>, ${num(r.jefes)} jefes, nivel ${num(r.nivel)}${R.mi_lugar ? ` · lugar ${R.mi_lugar} de ${R.total}` : ''}. Se actualiza cada vez que revisas tu ORO.</p>`;
}

function programar() { clearInterval(timer); timer = setInterval(() => { if (!document.hidden) sincronizar(false); }, CADA_MIN * 60000); }
function salir(expirada) {
  if (!expirada && token && !DEMO) api('salir').catch(() => {});
  token = null; estado = null; ss.del('hm_token'); clearInterval(timer);
  aplicar(false);
  pintarBoton();
  $('cm-err').textContent = expirada ? 'Tu sesión terminó. Vuelve a entrar.' : '';
  $('cm-gate').hidden = false; Bus.emit('pause', true);
}

montar();
if (token) { obras = leerObras(); aplicar(false); sincronizar(false); programar(); }
else { $('cm-gate').hidden = false; Bus.emit('pause', true); }
document.addEventListener('visibilitychange', () => { if (!document.hidden && token) sincronizar(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('cm-panel').hidden) cerrarPanel(); });
