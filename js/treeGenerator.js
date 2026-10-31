import { rngFrom, TAU, roman } from './utils.js';
import { BAL, RARITY_COST } from './config.js';
import { tr } from './localization.js';

// ============ FAMILIAS ============
// Monedas por temática:
//  CIR = daño · TRI = velocidad/crítico · CUA = XP/botín
//  HEX = vida/defensa · PEN = elementos/especiales · PUR = núcleos
export const FAM = {
  // ===== CIR (daño) =====
  fuerza: { cur:'CIR', g:'off', stages: [
    ['DAÑO',[['dmg',4]]],['FILO',[['dmgFlat',1]]],['GOLPE DURO',[['dmg',5]]],
    ['FUERZA BRUTAL',[['dmg',6]]],['PODER ABSOLUTO',[['dmg',7],['dmg.mul',1.02]],{r:3}],['GRAN FILO',[['dmgFlat',2]],{r:2}]
  ], kids:['critico','proyectil','velocidad','area','nucleo','caza','furia'] },
  area: { cur:'CIR', g:'off', stages: [
    ['EXPLOSIONES AL IMPACTO',[['explodeChance',0.5]]],['ONDA EXPANSIVA',[['explodeRadius',1.5]]],
    ['CARGA DEMOLEDORA',[['explodeDmg',2]]],['DETONACIÓN EN CADENA',[['explodeChance',0.6],['explodeDmg',1.5]],{r:3}]
  ], kids:['fuego','fuerza'] },
  proyectil: { cur:'CIR', g:'off', stages: [
    ['DISPARO AMPLIO',[['size',1.5]]],['PERFORACIÓN',[['pierce',1]],{r:3}],['REBOTE',[['bounce',1]],{r:3}],
    ['PROYECTIL EXTRA',[['proj',1]],{r:4}],['CÁMARA CARGADA',[['proj',1],['dmg',3]],{r:4}]
  ], kids:['area','fuerza','rayo'] },
  furia: { cur:'CIR', g:'off', stages: [
    ['FURIA',[['berserk',5]]],['RABIA',[['berserk',5],['critdmg',2]]],
    ['SANGRE CALIENTE',[['berserk',10]]],['CÓLERA',[['berserk',10],['critdmg',3]],{r:2}]
  ], kids:['fuerza','critico','vampiro'] },
  caza: { cur:'CIR', g:'off', stages: [
    ['AZOTE DE JEFES',[['bossDmg',1]]],['AZOTE DE ÉLITES',[['eliteDmg',1]]],
    ['MATAGIGANTES',[['bossDmg',2]],{r:2}],['CASTIGO A LOS ELEGIDOS',[['eliteDmg',2]],{r:2}]
  ], kids:['fuerza','critico','verdugo_circulos','verdugo_triangulos','verdugo_cuadrados','verdugo_hexagonos','verdugo_pentagonos','verdugo_morados'] },
  marca: { cur:'CIR', g:'off', stages: [
    ['MARCA DEL CAZADOR',[['markChance',15]]],['SEÑAL DE MUERTE',[['markDmg',10]]],
    ['MARCA PROFUNDA',[['markChance',10],['markDmg',8]],{r:2}],['CAZADOR LETAL',[['markChance',15],['markDmg',12]],{r:3}]
  ], kids:['critico','fuerza'] },

  // ===== TRI (velocidad + crítico) =====
  velocidad: { cur:'TRI', g:'off', stages: [
    ['CADENCIA',[['atk',5]]],['ZANCADA',[['speed',1]]],['PROYECTILES VELOCES',[['pspd',1.5]]],
    ['REFLEJOS',[['dodge',0.3]]],['FRENESÍ',[['atk',4],['speed',1.5]],{r:2}]
  ], kids:['proyectil','maquinas','orden','marcha','crono'] },
  critico: { cur:'TRI', g:'off', stages: [
    ['DAÑO CRÍTICO',[['critdmg',3]]],['GOLPE CRÍTICO',[['crit',0.4]]],
    ['CRÍTICOS DEVASTADORES',[['critdmg',4]]],['OJO MORTAL',[['crit',0.5]]],
    ['EJECUCIÓN',[['crit',0.6],['critdmg',5]],{r:3}]
  ], kids:['fuerza','velocidad','fuego','cadena','marca'] },
  cadena: { cur:'TRI', g:'off', stages: [
    ['ARCO CRÍTICO',[['critchain',1]]],['CONDUCTOR',[['critchain',1],['crit',0.3]]],
    ['BOBINA',[['critchain',1],['shockDmg',1]]],['TORRE DE TESLA',[['critchain',1],['critdmg',3]],{r:2}]
  ], kids:['critico','rayo'] },
  crono: { cur:'TRI', g:'off', stages: [
    ['DECELERACIÓN',[['chrono',5]]],['TIEMPO LENTO',[['chrono',6]]],
    ['ESTASIS',[['chrono',7]],{r:2}],['PARALIZACIÓN',[['chrono',8],['crit',0.5]],{r:3}]
  ], kids:['velocidad','hielo'] },

  // ===== CUA (XP / botín) =====
  fortuna: { cur:'CUA', g:'eco', stages: [
    ['AVARICIA',[['cur',5]]],['BOTÍN AMPLIO',[['cur',6]]],['SUERTE',[['luck',0.5]]],
    ['OJO DEL TESORO',[['luck',0.8]],{r:2}],['INTERESES',[['passive',0.1]],{r:3}],['TOQUE DE MIDAS',[['cur',7],['cur.mul',1.02]],{r:4}]
  ], kids:['sabiduria','orden','nucleo','marcha','iman'] },
  sabiduria: { cur:'CUA', g:'eco', stages: [
    ['APRENDIZAJE',[['xp',5]]],['MENTE ÁGIL',[['xp',6]]],
    ['CONCENTRACIÓN',[['xp',4],['luck',0.3]]],['ERUDICIÓN',[['xp',7],['xp.mul',1.02]],{r:3}]
  ], kids:['fortuna','orden'] },
  iman: { cur:'CUA', g:'eco', stages: [
    ['DOBLE BOTÍN CIRCULAR',[['dlCircle',8]]],['DOBLE BOTÍN TRIANGULAR',[['dlTriangle',8]]],
    ['DOBLE BOTÍN CUADRADO',[['dlSquare',8]]],['DOBLE BOTÍN HEXAGONAL',[['dlHexagon',8]]],
    ['DOBLE BOTÍN PENTAGONAL',[['dlPentagon',8]],{r:2}],['DOBLE BOTÍN MORADO',[['dlPurple',10]],{r:3}]
  ], kids:['fortuna','orden'] },

  // ===== HEX (vida / defensa) =====
  defensa: { cur:'HEX', g:'def', stages: [
    ['VITALIDAD',[['hp',1.5]]],['PIEL FÉRREA',[['hp',1],['dodge',0.2]]],['REGENERACIÓN',[['regen',0.05]]],
    ['ESCUDO',[['shield',0.8]],{r:2}],['ESPINAS',[['thorns',1.5]],{r:2}],['BASTIÓN',[['hp',2],['shield',1]],{r:3}]
  ], kids:['vampiro','hielo','nucleo','blindaje','bastion_circulos','bastion_triangulos','bastion_cuadrados','bastion_hexagonos','bastion_pentagonos','bastion_morados'] },
  blindaje: { cur:'HEX', g:'def', stages: [
    ['PLACAS',[['armor',1]]],['LAMINADO',[['armor',1],['hp',1.5]]],
    ['BLINDAJE REACTIVO',[['armor',2]]],['MURALLA',[['armor',2],['regen',0.03]],{r:2}]
  ], kids:['defensa','vampiro'] },
  vampiro: { cur:'HEX', g:'def', stages: [
    ['DRENAJE',[['life',0.1]]],['SED',[['life',0.12],['dmg',2.5]],{r:2}],['SEÑOR DE LA SANGRE',[['life',0.15],['hp',1]],{r:3}]
  ], kids:['veneno','defensa','sobrecarga'] },
  sobrecarga: { cur:'HEX', g:'def', stages: [
    ['CONDENSADOR',[['overheal',20],['overhealCap',10]]],['CAPACITOR',[['overheal',20],['shield',1]]],
    ['BATERÍA',[['overhealCap',15],['life',0.05]]],['NÚCLEO DE SOBRECARGA',[['overheal',30]],{r:2}]
  ], kids:['vampiro','defensa'] },

  // ===== PEN (elementos / especiales) =====
  fuego: { cur:'PEN', g:'elem', stages: [
    ['CHISPAS',[['burnChance',0.5]]],['LLAMAS',[['burnDmg',2]]],
    ['INCENDIO',[['burnChance',0.5],['burnDmg',1.5]],{r:2}],['NOVA ÍGNEA',[['burnChance',0.8],['explodeChance',0.3]],{r:3}]
  ], kids:['area','critico'] },
  hielo: { cur:'PEN', g:'elem', stages: [
    ['ESCARCHA',[['frostChance',0.6]]],['FRÍO INTENSO',[['frostPower',1]]],
    ['CONGELACIÓN',[['frostChance',0.5],['frostPower',1]],{r:2}],['CERO ABSOLUTO',[['frostPower',1.5],['dmg',3]],{r:3}]
  ], kids:['defensa','rayo'] },
  rayo: { cur:'PEN', g:'elem', stages: [
    ['CHISPA',[['shockChance',0.5]]],['ARCO VOLTAICO',[['shockCount',1]],{r:3}],
    ['TORMENTA',[['shockChance',0.4],['shockDmg',2]],{r:2}],['IRA DEL CIELO',[['shockCount',1],['shockDmg',2.5]],{r:4}]
  ], kids:['velocidad','proyectil','cadena'] },
  veneno: { cur:'PEN', g:'elem', stages: [
    ['TOXINA',[['poisonChance',0.6]]],['VENENO CORROSIVO',[['poisonDmg',2]]],
    ['PLAGA',[['poisonChance',0.5],['poisonDmg',1.5]],{r:2}],['MIASMA',[['poisonDmg',2.5],['life',0.05]],{r:3}]
  ], kids:['vampiro','hielo'] },
  maquinas: { cur:'PEN', g:'esp', stages: [
    ['MUNICIÓN DE DRON',[['droneDmg',2]]],['DRON',[['drone',1]],{r:3}],
    ['DRON GEMELO',[['drone',1],['droneDmg',1]],{r:4}],['ENJAMBRE',[['drone',1],['droneDmg',2]],{r:4}]
  ], kids:['velocidad','orden'] },
  orden: { cur:'PEN', g:'esp', stages: [
    ['OJO CLÍNICO',[['luck',0.5]],{r:2}],['GESTOR DE BOTÍN',[['cur',4],['luck',0.3]],{r:2}],
    ['COMPRADOR AUTOMÁTICO',[['autoBuy',1]],{r:4}],['COMPRADOR VELOZ',[['autoBuy',1],['cur',3]],{r:4}]
  ], kids:['fortuna','sabiduria'] },
  marcha: { cur:'PEN', g:'eco', stages: [
    ['BOTÍN DE PASOS',[['distKill',0.1]]],['MARCHA LARGA',[['distKill',0.15]]],
    ['VENTAJA',[['headStart',10]]],['VENTAJA AMPLIA',[['headStart',15]],{r:2}]
  ], kids:['velocidad','fortuna'] },

  // ===== PUR (núcleos) =====
  nucleo: { cur:'PUR', g:'esp', stages: [
    ['NÚCLEO DE GUERRA',[['dmg.mul',1.03]],{r:4}],['NÚCLEO DE RIQUEZA',[['cur.mul',1.03]],{r:4}],['NÚCLEO DE VIDA',[['hp.mul',1.04]],{r:4}]
  ], kids:['fuerza','fortuna','defensa'] },

  // ===== EXCLUSIVAS (sin nodos de cadencia - toda va con TRI) =====
  ex_pistol: { cur:'CIR', g:'off', excl:'pistol', stages: [
    ['MUNICIÓN PESADA',[['dmgFlat',1]]],['PRECISIÓN',[['dmgFlat',1]]],['TIRO SEGURO',[['crit',0.5]]],['BALA DOBLE',[['proj',1]],{r:4}]
  ], kids:['fuerza','critico'] },
  ex_burst: { cur:'CIR', g:'off', excl:'burst', stages: [
    ['RÁFAGA LARGA',[['proj',1]],{r:3}],['BALAS GEMELAS',[['dmg',4]]],['DISPERSIÓN CONTROLADA',[['size',1.5]]],['RÁFAGA PERFORANTE',[['pierce',1]],{r:3}]
  ], kids:['fuerza','velocidad'] },
  ex_shotgun: { cur:'CIR', g:'off', excl:'shotgun', stages: [
    ['ABANICO AMPLIO',[['size',1.5]]],['CARTUCHOS PESADOS',[['dmgFlat',1]]],['DISPARO DENSO',[['dmg',4]]],['PERDIGONES EXTRA',[['proj',1]],{r:3}]
  ], kids:['proyectil','area'] },
  ex_machinegun: { cur:'CIR', g:'off', excl:'machinegun', stages: [
    ['CALIBRE PESADO',[['dmgFlat',1],['size',1]]],['ENFRIAMIENTO',[['dmg',4]]],['PRECISIÓN SOSTENIDA',[['crit',0.5]]],['BALAS ARDIENTES',[['burnChance',0.5]]]
  ], kids:['velocidad','fuego'] },
  ex_sniper: { cur:'CIR', g:'off', excl:'sniper', stages: [
    ['DISPARO CRÍTICO',[['crit',0.6]]],['BALA HUECA',[['size',1.5]]],['MUERTE LEJANA',[['range',1.5]]],['EJECUCIÓN',[['bossDmg',1]],{r:2}]
  ], kids:['critico','caza'] },
  ex_laser: { cur:'CIR', g:'off', excl:'laser', stages: [
    ['HAZ AMPLIO',[['size',1.5]]],['HAZ LARGO',[['range',1.5]]],['SOBRECALENTADO',[['dmg',4]]],['HAZ QUEMANTE',[['burnChance',0.5]]]
  ], kids:['proyectil','fuego'] },
  ex_ghost: { cur:'TRI', g:'off', excl:'ghost', stages: [
    ['LLAMA PERSISTENTE',[['pspd',1.5]]],['PASO ESPECTRAL',[['dodge',0.4]]],['INFIERNO',[['proj',1]],{r:3}],['FRÍO DE ULTRATUMBA',[['frostChance',0.5]]]
  ], kids:['fuego','hielo'] },
  ex_tank: { cur:'HEX', g:'off', excl:'tank', stages: [
    ['BLINDAJE',[['hp',1.5]]],['OJIVA PESADA',[['dmgFlat',1]]],['RASTREADOR',[['pspd',1.5]]],['MULTI-MISIL',[['proj',1]],{r:3}]
  ], kids:['defensa','proyectil'] },
  ex_orbital: { cur:'PEN', g:'esp', excl:'orbital', stages: [
    ['ÓRBITA AMPLIA',[['range',1.5]]],['ESFERAS PESADAS',[['dmg',4]]],['ESFERAS ESCUDO',[['shield',0.5]]],['ESFERAS EXTRA',[['proj',1]],{r:3}]
  ], kids:['maquinas','defensa'] },
  ex_ricochet: { cur:'CIR', g:'off', excl:'ricochet', stages: [
    ['ECO',[['dmg',4]]],['TRAYECTORIA LOCA',[['pspd',1.5]]],['REBOTE CRÍTICO',[['crit',0.5]]],['ÁNGULO VIVO',[['bounce',1]],{r:3}]
  ], kids:['proyectil','critico'] },
  ex_chakram: { cur:'CIR', g:'off', excl:'chakram', stages: [
    ['RETORNO RÁPIDO',[['range',1.5]]],['ÓRBITA AMPLIA',[['range',1.5]]],['DISCO PESADO',[['dmgFlat',1]]],['DOBLE FILO',[['proj',1]],{r:3}]
  ], kids:['proyectil','velocidad'] },
  ex_metralla: { cur:'CIR', g:'off', excl:'metralla', stages: [
    ['ESQUIRLAS PESADAS',[['dmg',4]]],['CAOS AMPLIO',[['size',1.5]]],['LLUVIA ÍGNEA',[['burnChance',0.5]]],['METRALLA DENSA',[['proj',1]],{r:3}]
  ], kids:['area','fuego'] },
  ex_fragmento: { cur:'CIR', g:'off', excl:'fragmento', stages: [
    ['ESQUIRLAS VIVAS',[['pspd',1.5]]],['ROTURA VIOLENTA',[['dmg',4]]],['CRISTALES AFILADOS',[['pierce',1]],{r:3}],['ASTILLAS EXTRA',[['proj',1]],{r:3}]
  ], kids:['proyectil','area'] },
ex_centinela: { cur:'PEN', g:'esp', excl:'centinela', stages: [
['DRON VIGILANTE',[['drone',1]]],
['RADAR AMPLIO',[['range',1.5]]],['RADAR PROFUNDO',[['range',1.5]]],['OJO DE CENTINELA',[['crit',0.5]]],['DOBLE CAÑÓN',[['proj',1]],{r:3}]
], kids:['maquinas','proyectil'] },
  ex_graviton: { cur:'CIR', g:'off', excl:'graviton', stages: [
    ['POZO GRAVITATORIO',[['dmg',4]]],['MASA CRÍTICA',[['size',1.5]]],['ATRACCIÓN FATAL',[['bossDmg',0.8]],{r:2}],['SATÉLITES',[['proj',1]],{r:3}]
  ], kids:['area','caza'] },
  ex_pulso: { cur:'CIR', g:'off', excl:'pulso', stages: [
    ['RADIO DE ONDA',[['range',1.5]]],['VELOCIDAD DE ONDA',[['pspd',1.5]]],['ONDA PESADA',[['dmgFlat',1]]],['ONDA SÍSMICA',[['eliteDmg',1]],{r:2}]
  ], kids:['area','caza'] },
  ex_area: { cur:'TRI', g:'off', excl:'area', stages: [
['RADIO DE ÁREA',[['range',10]]],
['DIÁMETRO AMPLIO',[['range',15]]],
['ZONA EXPANDIDA',[['range',20]]],
['CAMPO EXTENSO',[['range',25]],{r:2}]
], kids:['fuerza','defensa'] },
};

// ---- Generación de las 12 familias anti-enemigo (ofensivas CIR + defensivas HEX) ----
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const SHAPES = [
  ['circulos','circle','CÍRCULOS'],
  ['triangulos','triangle','TRIÁNGULOS'],
  ['cuadrados','square','CUADRADOS'],
  ['hexagonos','hexagon','HEXÁGONOS'],
  ['pentagonos','pentagon','PENTÁGONOS'],
  ['morados','purple','MORADOS']
];

for (const [slug, key, nom] of SHAPES) {
  const K = cap(key);
  FAM['verdugo_' + slug] = { cur:'CIR', g:'off', stages: [
    ['AZOTE ' + nom, [['vs' + K, 2]]],
    ['RUPTURA ' + nom, [['vs' + K, 3]]],
    ['ANIQUILADOR ' + nom, [['vs' + K, 4]], {r:2}],
    ['EXTERMINIO ' + nom, [['vs' + K, 5], ['dmg', 2]], {r:3}]
  ], kids:['caza','fuerza'] };
  FAM['bastion_' + slug] = { cur:'HEX', g:'def', stages: [
    ['ESCUDO ' + nom, [['vd' + K, 2]]],
    ['MURALLA ' + nom, [['vd' + K, 3]]],
    ['FORTALEZA ' + nom, [['vd' + K, 4]], {r:2}],
    ['BASTIÓN ' + nom, [['vd' + K, 5], ['hp', 1.5]], {r:3}]
  ], kids:['defensa','blindaje'] };
}

export const FXTEXT = {
  dmg:'+{v}% daño','dmg.mul':'×{v} daño',dmgFlat:'+{v} daño base',
  hp:'+{v}% vida','hp.mul':'×{v} vida',
  atk:'+{v}% vel.Disparo',speed:'+{v}% velocidad (m/s)',crit:'+{v}% prob. crítico',
  critdmg:'+{v}% daño crítico',range:'+{v}% alcance',pspd:'+{v}% vel. de proyectil',
  size:'+{v}% tamaño',proj:'+{v} proyectiles',pierce:'+{v} perforación',bounce:'+{v} rebotes',
  explodeChance:'+{v}% prob. de explosión',explodeRadius:'+{v}% radio de explosión',
  explodeDmg:'+{v}% daño de explosión',critexplode:'Explosión al crítico ({v}% potencia)',
  burnChance:'+{v}% prob. de quemadura',burnDmg:'+{v}% daño de quemadura',
  frostChance:'+{v}% prob. de escarcha',frostPower:'+{v}% ralentización',
  shockChance:'+{v}% prob. de descarga',shockCount:'+{v} saltos de descarga',
  shockDmg:'+{v}% daño de descarga',poisonChance:'+{v}% prob. de veneno',
  poisonDmg:'+{v}% daño de veneno',life:'+{v}% vampirismo',thorns:'+{v}% espinas',
  shield:'Escudo ({v}% de vida)',regen:'+{v}% vida/s',dodge:'+{v}% esquiva',
  cur:'+{v}% botín de monedas','cur.mul':'×{v} botín',luck:'+{v} suerte',
  passive:'Botín pasivo ({v} CIR×zona/s)',
  xp:'+{v}% experiencia','xp.mul':'×{v} experiencia',
  drone:'+{v} dron',droneDmg:'+{v}% daño de dron',
  auraDmg:'Aura: {v}% del daño/s',auraRadius:'+{v}% radio de aura',
  autoBuy:'Compra automática (nv {v})',
  bossDmg:'+{v}% daño a jefes',eliteDmg:'+{v}% daño a élites',
  vsCircle:'+{v}% daño a círculos',vsTriangle:'+{v}% daño a triángulos',
  vsSquare:'+{v}% daño a cuadrados',vsHexagon:'+{v}% daño a hexágonos',
  vsPentagon:'+{v}% daño a pentágonos',vsPurple:'+{v}% daño a morados',
  vdCircle:'-{v}% daño recibido de círculos',vdTriangle:'-{v}% daño recibido de triángulos',
  vdSquare:'-{v}% daño recibido de cuadrados',vdHexagon:'-{v}% daño recibido de hexágonos',
  vdPentagon:'-{v}% daño recibido de pentágonos',vdPurple:'-{v}% daño recibido de morados',
  markChance:'+{v}% prob. de marcar',markDmg:'+{v}% daño a marcados',
  dlCircle:'+{v}% doble botín de círculos',dlTriangle:'+{v}% doble botín de triángulos',
  dlSquare:'+{v}% doble botín de cuadrados',dlHexagon:'+{v}% doble botín de hexágonos',
  dlPentagon:'+{v}% doble botín de pentágonos',dlPurple:'+{v}% doble botín de morados',
  chrono:'+{v}% ralentización pasiva',
  distKill:'+{v} m por baja',headStart:'+{v} m al reaparecer',
  armor:'-{v}% daño recibido',berserk:'+{v}% daño a vida baja',
  overheal:'{v}% del exceso de cura en escudo',overhealCap:'escudo máx +{v}% vida',
  critchain:'los críticos saltan a {v} enemigo'
};

export const fxDesc = fx => fx.map(([k, v]) => tr(FXTEXT[k] || k + ' {v}').replace('{v}', Math.round(v * 100) / 100));

export function makeRoot() {
  return { id:'0', fam:'root', stage:-1, name:'NÚCLEO', rarity:0, fx:[], cost:null,
           x:0, y:0, ang:0, rad:0, a0:0, a1:TAU, depth:0, root:true };
}

function rollRarity(r, minR = 0) {
  const w = [62, 26, 9, 3, 0.9, 0.14];
  let tot = w.reduce((a, b) => a + b, 0), x = r() * tot, idx = 0;
  for (; idx < 6; idx++) { if (x < w[idx]) break; x -= w[idx]; }
  return Math.max(idx, minR);
}

function stageOf(fam, stage) {
  const st = FAM[fam].stages, i = Math.min(stage, st.length - 1), base = st[i], over = stage - i;
  const scale = 1 + 0.10 * over;
  return {
    name: base[0] + (over > 0 ? ' ' + roman(over + 1) : ''),
    fx: base[1].map(([k, v]) => [k, Math.round(v * scale * 100) / 100]),
    minR: base[2] ? base[2].r : 0
  };
}

function place(parent, a0, a1, allNodes, placed, r) {
  const w = Math.max(0.05, a1 - a0);
  const mid = (a0 + a1) / 2;
  const MIN = 90;
  const score = (x, y) => {
    let minD = Infinity;
    for (const n of allNodes.values()) { const d = Math.hypot(n.x - x, n.y - y); if (d < minD) minD = d; }
    for (const p of placed) { const d = Math.hypot(p.x - x, p.y - y); if (d < minD) minD = d; }
    return minD;
  };
  let best = null, bestScore = -1;
  for (let i = 0; i < 6; i++) {
    const ang = mid + (r() - 0.5) * w * 0.35;
    const rad = parent.rad + 115 + r() * 25 + (i >= 3 ? 45 : 0) + (i >= 5 ? 45 : 0);
    const x = Math.cos(ang) * rad, y = Math.sin(ang) * rad;
    const minD = score(x, y);
    if (minD > bestScore) { bestScore = minD; best = { ang, rad, x, y }; }
    if (minD >= MIN) break;
  }
  let guard = 0;
  while (bestScore < MIN && guard++ < 14) {
    best.rad += 50;
    best.x = Math.cos(best.ang) * best.rad;
    best.y = Math.sin(best.ang) * best.rad;
    bestScore = score(best.x, best.y);
  }
  return best;
}

function buildChild(seed, parent, spec, idx, a0, a1, allNodes, placed, parentRng) {
  const id = parent.id + '.' + idx;
  const r = rngFrom(seed + '|' + id);
  const st = stageOf(spec.fam, spec.stage);
  const rarity = rollRarity(r, st.minR);
  const fx = st.fx.map(([k, v]) => [k, Math.round(v * (1 + rarity * 0.15) * 100) / 100]);
  const cur = FAM[spec.fam].cur;
  const costV = Math.max(1, Math.round(
    BAL.treeCostBase * Math.pow(BAL.treeCostG, parent.depth + 1) * RARITY_COST[rarity] * (1 + spec.stage * 0.1)
  ));
  const pos = place(parent, a0, a1, allNodes, placed, r);
  return { id, fam: spec.fam, stage: spec.stage, name: st.name, fx, rarity,
           cost: { k: cur, v: costV }, x: pos.x, y: pos.y, ang: pos.ang, rad: pos.rad, a0, a1, depth: parent.depth + 1 };
}

export function genChildren(seed, node, allNodes, heroId) {
  const r = rngFrom(seed + '|' + node.id + '|k');
  const placed = [], out = [];
  const push = (spec, a0, a1) => { const c = buildChild(seed, node, spec, out.length, a0, a1, allNodes, placed, r); placed.push(c); out.push(c); };
  const exFam = FAM['ex_' + heroId] ? 'ex_' + heroId : null;

  if (node.root) {
    const picks = [];
    if (exFam) picks.push(exFam);
    const shared = ['fuerza', 'fortuna', 'defensa', 'velocidad', 'sabiduria'];
    const n = 4 + (r() < 0.5 ? 1 : 0);
    while (picks.length < n && shared.length) { const i = Math.floor(r() * shared.length); picks.push(shared.splice(i, 1)[0]); }
    const base = r() * TAU;
    picks.forEach((f, i) => push({ fam: f, stage: 0 }, base + (i / picks.length) * TAU, base + ((i + 1) / picks.length) * TAU));
    return out;
  }

  const roll = r();
  let count = roll < 0.05 ? 0 : roll < 0.60 ? 1 : roll < 0.95 ? 2 : 3;
  if (node.stage === 0 || node.depth <= 2) count = Math.max(count, 1);
  const sectorW = node.a1 - node.a0;
  if (sectorW < 0.30) count = Math.min(count, 1);
  else if (sectorW < 0.60) count = Math.min(count, 2);
  if (count === 0) return out;

  const fam = FAM[node.fam];
  const cont = { fam: node.fam, stage: node.stage };
  const specs = [cont];
  const used = new Set([node.fam + '@' + node.stage]);
  let pool = (fam.kids || []).filter(k => FAM[k] && (!FAM[k].excl || FAM[k].excl === heroId));
  if (exFam && exFam !== node.fam && !pool.includes(exFam) && r() < 0.2) pool.push(exFam);
  const others = pool.slice();

  const pickBranch = () => {
    const advKey = node.fam + '@' + (node.stage + 1);
    const wantOther = others.length > 0 && r() < 0.25;
    if (!wantOther && !used.has(advKey)) return { fam: node.fam, stage: node.stage + 1 };
    if (others.length > 0) { const i = Math.floor(r() * others.length); return { fam: others.splice(i, 1)[0], stage: 0 }; }
    if (!used.has(advKey)) return { fam: node.fam, stage: node.stage + 1 };
    let s = node.stage + 2; while (used.has(node.fam + '@' + s)) s++;
    return { fam: node.fam, stage: s };
  };

  for (let b = 1; b < count; b++) {
    const c = pickBranch();
    const k = c.fam + '@' + c.stage;
    if (used.has(k)) continue;
    used.add(k);
    specs.push(c);
  }

  if (specs.length === 1) { push(specs[0], node.a0, node.a1); return out; }

  const w = node.a1 - node.a0;
  const slices = [];
  for (let i = 0; i < specs.length; i++) slices.push([node.a0 + (w * i) / specs.length, node.a0 + (w * (i + 1)) / specs.length]);
  const ci = Math.floor(specs.length / 2);
  push(specs[0], slices[ci][0], slices[ci][1]);
  let si = 1;
  for (let i = 0; i < slices.length && si < specs.length; i++) { if (i === ci) continue; push(specs[si++], slices[i][0], slices[i][1]); }
  return out;
}