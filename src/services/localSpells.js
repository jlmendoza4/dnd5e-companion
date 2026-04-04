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
      casting_time: '1 action',
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
      casting_time: '1 action',
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
      casting_time: '1 action',
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
  }
]

export const SPELL_SEARCH_ALIASES = {
  'descarga sobrenatural': ['eldritch blast'],
  'filo de llamas verdes': ['green-flame blade'],
  'filo atronador': ['booming blade'],
  'hambre de hadar': ['hunger of hadar'],
  'hadar': ['hunger of hadar'],
  'hoja atronadora': ['booming blade'],
  'mano de mago': ['mage hand'],
  'misil magico': ['magic missile'],
  'misil mágico': ['magic missile']
}

export function getLocalSpellsByClass(classIndex) {
  if (!classIndex) return LOCAL_SPELLS
  return LOCAL_SPELLS.filter(s => s.classes.includes(classIndex))
}

export function getLocalSpellDetail(index) {
  const spell = LOCAL_SPELLS.find(s => s.index === index)
  return spell?.detail || null
}
