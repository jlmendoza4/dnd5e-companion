/**
 * localSpells.js — Conjuros locales no incluidos en SRD/API
 */

const LOCAL_SPELLS = [
  {
    index: 'custom:green-flame-blade',
    name: 'Green-Flame Blade',
    esName: 'Filo de llamas verdes',
    aliases: ['filo de llamas verdes', 'llamas verdes', 'green flame blade', 'gfb'],
    classes: ['wizard', 'sorcerer', 'warlock'],
    detail: {
      index: 'custom:green-flame-blade',
      name: 'Green-Flame Blade',
      level: 0,
      school: { name: 'Evocation' },
      casting_time: '1 acción',
      range: 'Self (5-foot radius)',
      duration: 'Instantaneous',
      components: ['S', 'M'],
      material: 'A melee weapon worth at least 1 sp',
      desc: [
        'As part of the action used to cast this spell, you must make a melee attack with a weapon against one creature within 5 feet of you.',
        'On a hit, the target suffers the attack\'s normal effects, and you can cause green fire to leap to a different creature that you can see within 5 feet of it.',
        'The second creature takes fire damage equal to your spellcasting ability modifier.'
      ],
      damage: {
        damage_type: { name: 'Fire' },
        damage_at_character_level: {
          1: 'Secondary target: spellcasting modifier',
          5: 'Target: +1d8, Secondary: +1d8 + modifier',
          11: 'Target: +2d8, Secondary: +2d8 + modifier',
          17: 'Target: +3d8, Secondary: +3d8 + modifier'
        }
      }
    }
  },
  {
    index: 'custom:booming-blade',
    name: 'Booming Blade',
    esName: 'Filo atronador',
    aliases: ['filo atronador', 'boom blade', 'booming blade', 'trueno'],
    classes: ['wizard', 'sorcerer', 'warlock'],
    detail: {
      index: 'custom:booming-blade',
      name: 'Booming Blade',
      level: 0,
      school: { name: 'Evocation' },
      casting_time: '1 acción',
      range: 'Self (5-foot radius)',
      duration: '1 round',
      components: ['S', 'M'],
      material: 'A melee weapon worth at least 1 sp',
      desc: [
        'As part of the action used to cast this spell, you must make a melee attack with a weapon against one creature within 5 feet of you.',
        'On a hit, the target suffers the attack\'s normal effects and becomes sheathed in booming energy until the start of your next turn.',
        'If the target willingly moves 5 feet or more before then, it takes thunder damage, and the spell ends.'
      ],
      damage: {
        damage_type: { name: 'Thunder' },
        damage_at_character_level: {
          1: 'On move: 1d8',
          5: 'On hit: +1d8, On move: 2d8',
          11: 'On hit: +2d8, On move: 3d8',
          17: 'On hit: +3d8, On move: 4d8'
        }
      }
    }
  },
  {
    index: 'custom:hunger-of-hadar',
    name: 'Hunger of Hadar',
    esName: 'Hambre de Hadar',
    aliases: ['hambre de hadar', 'hunger of hadar', 'hadar'],
    classes: ['warlock'],
    detail: {
      index: 'custom:hunger-of-hadar',
      name: 'Hunger of Hadar',
      level: 3,
      school: { name: 'Conjuration' },
      casting_time: '1 acción',
      range: '150 feet',
      duration: 'Concentration, up to 1 minute',
      components: ['V', 'S', 'M'],
      material: 'A pickled octopus tentacle',
      concentration: true,
      desc: [
        'You open a gateway to the dark between the stars, creating a 20-foot-radius sphere of blackness and bitter cold.',
        'No light can illuminate the area, and creatures fully inside it are blinded.',
        'Any creature that starts its turn in the area takes 2d6 cold damage.',
        'Any creature that ends its turn in the area must succeed on a Dexterity saving throw or take 2d6 acid damage.'
      ],
      damage: {
        damage_type: { name: 'Cold / Acid' },
        damage_dice: '2d6 (inicio de turno) + 2d6 (fin de turno si falla salvación DES)'
      },
      dc: {
        dc_type: { name: 'DEX' },
        dc_success: 'none'
      }
    }
  },
  {
    index: 'custom:spirit-shroud',
    name: 'Spirit Shroud',
    esName: 'Velo espiritual',
    aliases: ['velo espiritual', 'spirit shroud', 'manto espiritual', 'sudario espiritual'],
    classes: ['warlock', 'wizard', 'cleric', 'paladin'],
    detail: {
      index: 'custom:spirit-shroud',
      name: 'Spirit Shroud',
      level: 3,
      school: { name: 'Necromancy' },
      casting_time: '1 acción adicional',
      range: 'Self',
      duration: 'Concentration, up to 1 minute',
      components: ['V', 'S'],
      concentration: true,
      desc: [
        'Invocas espiritus que te rodean durante la duracion del conjuro.',
        'Hasta el final de tu turno, los ataques que impactes a criaturas dentro de 10 pies infligen 1d8 de daño adicional (frio, necrotico o radiante, a tu eleccion al lanzar).',
        'Las criaturas afectadas no pueden recuperar puntos de golpe hasta el inicio de tu siguiente turno.',
        'La velocidad de cualquier criatura afectada por este daño se reduce en 10 pies hasta el inicio de tu siguiente turno.'
      ],
      damage: {
        damage_type: { name: 'Cold / Necrotic / Radiant' },
        damage_at_slot_level: {
          3: '1d8',
          4: '2d8',
          5: '3d8',
          6: '4d8',
          7: '5d8',
          8: '6d8',
          9: '7d8'
        }
      }
    }
  },
  {
    index: 'custom:armor-of-agathys',
    name: 'Armor of Agathys',
    esName: 'Armadura de Agathys',
    aliases: ['armadura de agathys', 'armor of agathys', 'agathys', 'armadura agathys'],
    classes: ['warlock'],
    detail: {
      index: 'custom:armor-of-agathys',
      name: 'Armor of Agathys',
      level: 1,
      school: { name: 'Abjuration' },
      casting_time: '1 acción adicional',
      range: 'Self',
      duration: '1 hour',
      components: ['V', 'S', 'M'],
      material: 'A cup of water',
      concentration: false,
      ritual: false,
      desc: [
        'Aparece una capa mágica de hielo protectora alrededor de ti. Ganas 5 puntos de golpe temporales por nivel de espacio usado (5 a nivel 1, 10 a nivel 2, etc.).',
        'Si una criatura te golpea con un ataque de cuerpo a cuerpo mientras tienes estos puntos de golpe temporales, recibe 5 puntos de daño de frío por nivel de espacio usado.',
        'Los puntos de golpe temporales desaparecen cuando el conjuro termina. Mientras tengas puntos de golpe temporales de este conjuro, el efecto de retribución persiste.'
      ],
      higher_level: [
        'Al lanzarlo usando un espacio de conjuro de nivel 2 o superior, los puntos de golpe temporales y el daño de frío aumentan en 5 por cada nivel por encima del 1.º (máximo 5× nivel del slot).'
      ],
      damage: {
        damage_type: { name: 'Cold' },
        damage_at_slot_level: {
          1: '5 PG temp. / 5 frío',
          2: '10 PG temp. / 10 frío',
          3: '15 PG temp. / 15 frío',
          4: '20 PG temp. / 20 frío',
          5: '25 PG temp. / 25 frío',
        }
      }
    }
  },
  {
    index: 'custom:shadow-of-moil',
    name: 'Shadow of Moil',
    esName: 'Sombra de Moil',
    aliases: [
      'sombra de moil', 'shadow of moil', 'moil', 'sombra moil'
    ],
    classes: ['warlock'],
    detail: {
      index: 'custom:shadow-of-moil',
      name: 'Shadow of Moil',
      level: 4,
      school: { name: 'Necromancy' },
      casting_time: '1 acción',
      range: 'Self',
      duration: 'Up to 1 minute',
      components: ['V', 'S', 'M'],
      material: 'An undead eyeball encased in a gem worth at least 150 gp',
      concentration: true,
      ritual: false,
      desc: [
        'Flame-like shadows wreathe your body until the spell ends, causing you to become heavily obscured to others.',
        'The shadows turn dim light within 10 feet of you into darkness, and bright light in the same area to dim light.',
        'Until the spell ends, you have resistance to radiant damage.',
        'In addition, whenever a creature within 10 feet of you hits you with an attack, the shadows lash out at that creature, dealing it 2d8 necrotic damage.'
      ],
      higher_level: [],
      damage: {
        damage_type: { name: 'Necrotic' },
        damage_at_slot_level: { 4: '2d8 necrotic (retribution)' }
      }
    }
  },
  {
    index: 'custom:comprehend-languages',
    name: 'Comprehend Languages',
    esName: 'Comprensión de lenguas',
    aliases: [
      'comprension de lenguas', 'comprensión de lenguas', 'comprehend languages',
      'entender idiomas', 'comprender idiomas', 'lenguas'
    ],
    classes: ['warlock', 'wizard', 'sorcerer', 'bard'],
    detail: {
      index: 'custom:comprehend-languages',
      name: 'Comprehend Languages',
      level: 1,
      school: { name: 'Divination' },
      casting_time: '1 acción (o 10 minutos como ritual)',
      range: 'Self',
      duration: '1 hour',
      components: ['V', 'S', 'M'],
      material: 'A pinch of soot and salt',
      concentration: false,
      ritual: true,
      desc: [
        'Durante la duración, entiendes el significado literal de cualquier idioma hablado que escuches.',
        'También entiendes cualquier lengua escrita que veas, pero debes estar tocando la superficie sobre la que están escritas las palabras.',
        'Se tarda aproximadamente 1 minuto en leer una página de texto.',
        'Este conjuro no te permite comprender los mensajes ocultos en un texto ni los glifos mágicos que no formen parte de un idioma, como los de un glifo de guardia.'
      ],
      higher_level: []
    }
  },
  {
    index: 'custom:mind-sliver',
    name: 'Mind Sliver',
    esName: 'Romper la mente',
    aliases: [
      'romper la mente', 'mind sliver', 'esquirla mental', 'mente'
    ],
    classes: ['warlock', 'wizard', 'sorcerer'],
    detail: {
      index: 'custom:mind-sliver',
      name: 'Mind Sliver',
      level: 0,
      school: { name: 'Enchantment' },
      casting_time: '1 acción',
      range: '60 feet',
      duration: '1 round',
      components: ['V'],
      concentration: false,
      ritual: false,
      desc: [
        'Conduces una desorientadora punta de energía psíquica hacia la mente de una criatura que puedas ver dentro del alcance.',
        'El objetivo debe superar una tirada de salvación de Inteligencia o sufre 1d6 de daño psíquico.',
        'Hasta el final de tu siguiente turno, el objetivo resta 1d4 de la próxima tirada de salvación que haga.'
      ],
      higher_level: [
        'El daño aumenta en 1d6 cuando alcanzas nivel 5 (2d6), nivel 11 (3d6) y nivel 17 (4d6).'
      ],
      damage: {
        damage_type: { name: 'Psychic' },
        damage_at_character_level: {
          1: '1d6',
          5: '2d6',
          11: '3d6',
          17: '4d6'
        }
      },
      dc: {
        dc_type: { name: 'INT' },
        dc_success: 'none'
      }
    }
  },
  {
    index: 'custom:maddening-darkness',
    name: 'Maddening Darkness',
    esName: 'Oscuridad enloquecedora',
    aliases: [
      'oscuridad enloquecedora', 'maddening darkness', 'maddening-darkness', 'enloquecedora'
    ],
    classes: ['warlock', 'wizard', 'sorcerer'],
    detail: {
      index: 'custom:maddening-darkness',
      name: 'Maddening Darkness',
      level: 8,
      school: { name: 'Evocation' },
      casting_time: '1 acción',
      range: '150 feet',
      duration: 'Concentration, up to 10 minutes',
      components: ['V', 'M'],
      material: 'A drop of pitch mixed with a drop of mercury',
      concentration: true,
      ritual: false,
      desc: [
        'Magical darkness spreads from a point you choose within range to fill a 60-foot-radius sphere until the spell ends.',
        'The darkness spreads around corners. A creature with darkvision cannot see through this darkness, and nonmagical light cannot illuminate it.',
        'If the point you choose is on the ground, the darkness is 10 feet high.',
        'When a creature starts its turn in the darkness, it takes 8d8 psychic damage.'
      ],
      higher_level: [],
      damage: {
        damage_type: { name: 'Psychic' },
        damage_dice: '8d8'
      }
    }
  }
]

export const SPELL_SEARCH_ALIASES = {
  'descarga sobrenatural': ['eldritch blast'],
  'filo de llamas verdes': ['green-flame blade'],
  'filo atronador': ['booming blade'],
  'hambre de hadar': ['hunger of hadar'],
  'velo espiritual': ['spirit shroud'],
  'sudario espiritual': ['spirit shroud'],
  'manto espiritual': ['spirit shroud'],
  'hadar': ['hunger of hadar'],
  'hoja atronadora': ['booming blade'],
  'mano de mago': ['mage hand'],
  'misil magico': ['magic missile'],
  'misil mágico': ['magic missile'],
  'armadura de agathys': ['armor of agathys'],
  'agathys': ['armor of agathys'],
  'comprension de lenguas': ['comprehend languages'],
  'comprensión de lenguas': ['comprehend languages'],
  'entender idiomas': ['comprehend languages'],
  'lenguas': ['comprehend languages'],
  'sombra de moil': ['shadow-of-moil'],
  'shadow of moil': ['shadow-of-moil'],
  'moil': ['shadow-of-moil'],
  'romper la mente': ['mind sliver'],
  'romper la  mente': ['mind sliver'],
  'mind sliver': ['mind sliver'],
  'esquirla mental': ['mind sliver'],
  'oscuridad enloquecedora': ['maddening darkness'],
  'maddening darkness': ['maddening darkness'],
  'maddening-darkness': ['maddening darkness'],
}

export function getLocalSpellsByClass(classIndex) {
  if (!classIndex) return LOCAL_SPELLS
  return LOCAL_SPELLS.filter(s => s.classes.includes(classIndex))
}

export function getLocalSpellDetail(index) {
  const spell = LOCAL_SPELLS.find(s => s.index === index)
  return spell?.detail || null
}
