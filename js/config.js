export const COL = {
red: '#E53935', redDark: '#B71C1C', redLight: '#FF8A80',
purple: '#9C27B0', purpleLight: '#CE93D8',
gold: '#FFD700', goldDark: '#B8860B', goldLight: '#FFEC8B',
black: '#000000', white: '#FFFFFF', gray: '#888888'
};

export const BAL = {
bulletSpeed: 620,
hpG: 1.07, hpPer: 25,
dmgG: 1.05,
curG: 1.065,
treeCostG: 1.10,
treeCostBase: 8,
treeInflation: 1.03,
lvlXpBase: 25, lvlXpG: 1.33,
bossEvery: 500,
reviveTime: 4,
saveEvery: 15,
offlineCap: 8 * 3600,
maxEnemies: 120,
spawnLead: 0.65,
// ---- ENEMIGO DORADO ----
goldenMinDist: 300,
goldenChanceBase: 0.02,
goldenChanceMax: 0.06,
goldenOrbitRadius: 120,
goldenOrbitGrow: 8,
goldenOrbitMax: 340,
goldenOrbitSpeed: 1.2,
// ---- ATAQUE LÁSER DEL DORADO ----
goldenAtkInterval: 3.5,
goldenFirstAtk: 1.5,
goldenTelegraphT: 0.7,
goldenLaserT: 0.25,
goldenLaserWidth: 12,      // ← COMA AÑADIDA
// ---- PUBLICACIÓN ----
showCredits: true,   // false = CrazyGames (oculta créditos) · true = versión normal
};

export const RARITY_NAME = ['COMÚN', 'POCO COMÚN', 'RARO', 'ÉPICO', 'LEGENDARIO', 'MÍTICO'];
export const RARITY_COST = [1, 1.5, 2.5, 5, 10, 20];
export const RARITY_RING = ['#000000', '#666666', '#E53935', '#9C27B0', '#E53935', '#9C27B0'];