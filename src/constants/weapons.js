// ── Armas predefinidas para acceso rápido ──
export const QUICK_WEAPONS = [
  { name: 'Daga',              dmgDice: '1d4',  dmgType: 'perforante',   atkMod: 'DES', range: 'CaC/20/60' },
  { name: 'Espada corta',      dmgDice: '1d6',  dmgType: 'perforante',   atkMod: 'DES', range: 'CaC' },
  { name: 'Espada larga',      dmgDice: '1d8',  dmgType: 'cortante',     atkMod: 'FUE', range: 'CaC' },
  { name: 'Espadón',           dmgDice: '2d6',  dmgType: 'cortante',     atkMod: 'FUE', range: 'CaC', twoHanded: true },
  { name: 'Hacha de mano',     dmgDice: '1d6',  dmgType: 'cortante',     atkMod: 'FUE', range: 'CaC/20/60' },
  { name: 'Hacha de guerra',   dmgDice: '1d8',  dmgType: 'cortante',     atkMod: 'FUE', range: 'CaC' },
  { name: 'Arco corto',        dmgDice: '1d6',  dmgType: 'perforante',   atkMod: 'DES', range: '80/320' },
  { name: 'Arco largo',        dmgDice: '1d8',  dmgType: 'perforante',   atkMod: 'DES', range: '150/600' },
  { name: 'Ballesta ligera',   dmgDice: '1d8',  dmgType: 'perforante',   atkMod: 'DES', range: '80/320' },
  { name: 'Maza',              dmgDice: '1d6',  dmgType: 'contundente',  atkMod: 'FUE', range: 'CaC' },
  { name: 'Martillo de guerra',dmgDice: '1d8',  dmgType: 'contundente',  atkMod: 'FUE', range: 'CaC' },
  { name: 'Lanza',             dmgDice: '1d6',  dmgType: 'perforante',   atkMod: 'FUE', range: 'CaC/20/60' },
]

// ── Hechizos ofensivos predefinidos ──
export const QUICK_SPELLS = [
  { name: 'Rayo de Fuego (truco)',      dmgDice: '1d10', dmgType: 'fuego',       saveMod: 'INT', level: 0 },
  { name: 'Toque Helado (truco)',        dmgDice: '1d8',  dmgType: 'frío',        atkMod: 'INT',  level: 0 },
  { name: 'Bola de Fuego (3er)',         dmgDice: '8d6',  dmgType: 'fuego',       saveMod: 'DES', saveType: 'DEX', level: 3 },
  { name: 'Rayo (3er)',                  dmgDice: '8d6',  dmgType: 'relámpago',   saveMod: 'DES', level: 3 },
  { name: 'Proyectil Mágico (1er)',      dmgDice: '1d4',  dmgType: 'de fuerza',   bonus: 1, extras: 2, level: 1, noRoll: true },
  { name: 'Ola de Trueno (1er)',         dmgDice: '2d8',  dmgType: 'trueno',      saveMod: 'CON', level: 1 },
  { name: 'Rayo de Escarcha (truco)',    dmgDice: '1d8',  dmgType: 'frío',        saveMod: 'CON', level: 0 },
  { name: 'Llamarada (1er)',             dmgDice: '1d6',  dmgType: 'fuego',       atkMod: 'SAB',  level: 1 },
  { name: 'Mordisco del Caos (truco)',   dmgDice: '1d10', dmgType: 'ácido',       saveMod: 'INT', level: 0 },
  { name: 'Palabra Atronadora (1er)',    dmgDice: '3d8',  dmgType: 'trueno',      saveMod: 'CON', level: 1 },
]
