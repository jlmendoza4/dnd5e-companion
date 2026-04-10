export const WARLOCK_PACT_SLOTS = {
  1:  { slots: 1, slotLevel: 1 }, 2:  { slots: 2, slotLevel: 1 },
  3:  { slots: 2, slotLevel: 2 }, 4:  { slots: 2, slotLevel: 2 },
  5:  { slots: 3, slotLevel: 3 }, 6:  { slots: 3, slotLevel: 3 },
  7:  { slots: 4, slotLevel: 4 }, 8:  { slots: 4, slotLevel: 4 },
  9:  { slots: 4, slotLevel: 5 }, 10: { slots: 4, slotLevel: 5 },
  11: { slots: 3, slotLevel: 5 }, 12: { slots: 3, slotLevel: 5 },
  13: { slots: 3, slotLevel: 5 }, 14: { slots: 3, slotLevel: 5 },
  15: { slots: 3, slotLevel: 5 }, 16: { slots: 3, slotLevel: 5 },
  17: { slots: 4, slotLevel: 5 }, 18: { slots: 4, slotLevel: 5 },
  19: { slots: 4, slotLevel: 5 }, 20: { slots: 4, slotLevel: 5 },
}

export const WLOCK_INVOCATIONS = [
  { name: 'Agonizing Blast',          minLevel: 1,  priority: 'SIEMPRE',    pact: null,     desc: '+CAR a cada rayo de Eldritch Blast. Obligatoria en toda build.' },
  { name: "Devil's Sight",            minLevel: 1,  priority: 'ALTA',       pact: null,     desc: "Visión en oscuridad mágica. Combina con Darkness para ventaja permanente." },
  { name: 'Repelling Blast',          minLevel: 1,  priority: 'ALTA',       pact: null,     desc: 'Empuja 10 pies por EB. Control de mapa sin gastar slots.' },
  { name: 'Grasp of Hadar',           minLevel: 1,  priority: 'ALTA',       pact: null,     desc: 'Tira 10 pies hacia ti con EB. Cierra el escape del boss.' },
  { name: 'Thirsting Blade',          minLevel: 5,  priority: 'ALTA',       pact: 'Hoja',   desc: '(Hoja) Ataque adicional. Imprescindible para Hexblade melee.' },
  { name: 'Lifedrinker',              minLevel: 12, priority: 'ALTA',       pact: 'Hoja',   desc: '(Hoja) +CAR en daño por cada ataque. Brutal en fases tardías.' },
  { name: 'Eldritch Smite',           minLevel: 5,  priority: 'MEDIA',      pact: 'Hoja',   desc: '(Hoja) Pronate + daño masivo en un slot. Burst óptimo si va a concentrar.' },
  { name: 'Book of Ancient Secrets',  minLevel: 5,  priority: 'MEDIA',      pact: 'Tomo',   desc: '(Tomo) Rituales sin slot: Identify, Detect Magic, Find Familiar... Dominio fuera de combate.' },
  { name: 'Investment of Chain Master',minLevel: 9, priority: 'ALTA',       pact: 'Cadena', desc: '(Cadena) Familiar vuela, nada e inflige condiciones. Espía y combatiente.' },
  { name: 'Gift of Ever-Living Ones', minLevel: 1,  priority: 'MEDIA',      pact: 'Cadena', desc: '(Cadena) Dados de vida al máximo en descanso. Más durabilidad.' },
  { name: 'Mask of Many Faces',       minLevel: 1,  priority: 'SITUACIONAL', pact: null,    desc: 'Disguise Self ilimitado. Domina encuentros de infiltración y social.' },
  { name: 'Misty Visions',            minLevel: 1,  priority: 'SITUACIONAL', pact: null,    desc: 'Silent Image a voluntad. Señuelos, bloqueos de línea de visión y trampas.' },
  { name: 'Beguiling Influence',      minLevel: 1,  priority: 'SITUACIONAL', pact: null,    desc: '+Competencia en Engaño y Persuasión. Domina pilares sociales.' },
  { name: 'Voice of Chain Master',    minLevel: 1,  priority: 'MEDIA',      pact: 'Cadena', desc: '(Cadena) Percibe y habla a través del familiar. Reconocimiento ilimitado.' },
]

export const KEY_SPELLS_NO_CONC = [
  {
    name: 'Armor of Agathys',
    slotLvl: 1, type: 'Defensa', ritual: false,
    desc: 'Acción. Ganas 5 PG temp. por nivel de slot (5/10/15…). Mientras dure, cualquier criatura que te golpee en cuerpo a cuerpo recibe el mismo frío como daño. Con Shield activo y alta CA es la combinación más rentable del brujo de melee.',
    tip: 'Escala potente: lanza en slot máximo del brujo para maximizar reacción de daño.',
  },
  {
    name: 'Comprensión de Lenguas',
    slotLvl: 1, type: 'Ritual/Utilidad', ritual: true,
    desc: 'Ritual (10 min sin slot). Durante 1 hora entiendes cualquier idioma hablado o escrito. Sin concentración ni slot si se lanza como ritual.',
    tip: 'Lanza siempre como RITUAL: no gasta slot, domina toda situación de información y negociación.',
  },
  {
    name: 'Shield',
    slotLvl: 1, type: 'Defensa', ritual: false,
    desc: 'Reacción cuando te golpean. +5 CA hasta tu siguiente turno. Nula si el ataque ya falla. Combina con Armor of Agathys: defines si "dejas pasar" para activar el daño frío.',
    tip: 'Lista extendida de Hexblade. Guarda la reacción para decidir: ¿activo Agathys o bloqueo el golpe?',
  },
  {
    name: 'Wrathful Smite',
    slotLvl: 1, type: 'Daño/CC', ritual: false,
    desc: 'Acción adicional antes de atacar. Si golpeas: +1d6 psíquico y el objetivo puede quedar Asustado (SAB CD). Concentración, pero dura mientras el objetivo esté asustado y falle sus tiradas.',
    tip: 'Lista extendida Hexblade. Muy útil contra enemigos de baja SAB o en apertura con ventaja.',
  },
  {
    name: 'Misty Step',
    slotLvl: 2, type: 'Movilidad', ritual: false,
    desc: 'Acción adicional. Teletransporte 30 pies a lugar visible. Sin concentración. Escapa de agarre, reposiciona, flanquea o rompe línea "gratis".',
    tip: 'El slot de nivel 2 más eficiente del brujo. Casi siempre vale más que un slot de daño.',
  },
]

export const CONC_SPELLS = [
  { name: 'Hex',              slotLvl: 1, ctrl: 2, dps: 5, surv: 1, desc: '+1d6 tipo elegido por ataque. Rota cuando el objetivo cae (acción bonus).' },
  { name: 'Darkness',         slotLvl: 2, ctrl: 5, dps: 2, surv: 4, desc: "Con Devil's Sight: ventaja en tus ataques, desventaja en todos los enemigos." },
  { name: 'Hypnotic Pattern', slotLvl: 3, ctrl: 5, dps: 1, surv: 4, desc: 'Incapacita múltiples enemigos. El mejor control de multitud del brujo.' },
  { name: 'Shadow of Moil',   slotLvl: 4, ctrl: 3, dps: 3, surv: 5, desc: 'Ocultación, retribución de fuego. Muy resistente para aguantar daño.' },
  { name: 'Hold Monster',     slotLvl: 5, ctrl: 5, dps: 3, surv: 2, desc: 'Paraliza cualquier criatura. Críticos automáticos en contacto hasta que falle.' },
  { name: 'Banishment',       slotLvl: 4, ctrl: 4, dps: 1, surv: 4, desc: 'Saca al boss del mapa. Tiempo para curar y eliminar secuaces.' },
  { name: 'Forcecage',        slotLvl: 7, ctrl: 5, dps: 1, surv: 3, desc: 'Encierra al boss sin salvación. Termina la lucha si se aplica bien.' },
]
