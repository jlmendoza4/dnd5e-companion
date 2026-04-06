// ── Nombres de hechizos (inglés → español), índice de dnd5eapi.co ──
// Fuente: SRD oficial en español + nivel20.com
const SPELL_NAME_MAP = {
  'Acid Arrow':                   'Flecha ácida',
  'Acid Splash':                  'Salpicadura ácida',
  'Aid':                          'Ayuda',
  'Alarm':                        'Alarma',
  'Alter Self':                   'Cambiar de forma',
  'Animal Friendship':            'Amistad con animales',
  'Animal Messenger':             'Mensajero animal',
  'Animal Shapes':                'Formas animales',
  'Animate Dead':                 'Animar muertos',
  'Animate Objects':              'Animar objetos',
  'Antilife Shell':               'Escudo antivida',
  'Antimagic Field':              'Campo antimagia',
  'Antipathy/Sympathy':           'Antipatía/Simpatía',
  'Arcane Eye':                   'Ojo arcano',
  'Arcane Gate':                  'Portal arcano',
  'Arcane Hand':                  'Mano arcana',
  'Arcane Lock':                  'Cerrojo arcano',
  'Arcane Sword':                 'Espada arcana',
  'Arcanist\'s Magic Aura':       'Aura mágica de arcano',
  'Astral Projection':            'Proyección astral',
  'Augury':                       'Augurio',
  'Awaken':                       'Despertar',
  'Bane':                         'Maldición',
  'Banishment':                   'Destierro',
  'Barkskin':                     'Corteza de árbol',
  'Beacon of Hope':               'Faro de esperanza',
  'Bestow Curse':                 'Maldecir',
  'Bigby\'s Hand':                'Mano de Bigby',
  'Blade Barrier':                'Barrera de cuchillas',
  'Bless':                        'Bendecir',
  'Blight':                       'Plaga',
  'Blindness/Deafness':           'Ceguera/Sordera',
  'Blink':                        'Parpadeo',
  'Blur':                         'Desenfoque',
  'Branding Smite':               'Castigo candente',
  'Burning Hands':                'Manos ardientes',
  'Call Lightning':               'Convocar relámpago',
  'Calm Emotions':                'Calmar emociones',
  'Chain Lightning':              'Cadena de relámpagos',
  'Charm Person':                 'Hechizar persona',
  'Chill Touch':                  'Toque helado',
  'Circle of Death':              'Círculo de la muerte',
  'Clairvoyance':                 'Clarividencia',
  'Clone':                        'Clonar',
  'Cloud of Daggers':             'Nube de dagas',
  'Cloudkill':                    'Bruma letal',
  'Color Spray':                  'Chorro de colores',
  'Command':                      'Orden',
  'Commune':                      'Comunión',
  'Commune with Nature':          'Comunión con la naturaleza',
  'Compulsion':                   'Compulsión',
  'Cone of Cold':                 'Cono de frío',
  'Confusion':                    'Confusión',
  'Conjure Animals':              'Conjurar animales',
  'Conjure Barrage':              'Conjurar descarga',
  'Conjure Celestial':            'Conjurar celestial',
  'Conjure Elemental':            'Conjurar elemental',
  'Conjure Fey':                  'Conjurar ser feérico',
  'Conjure Minor Elementals':     'Conjurar elementales menores',
  'Conjure Volley':               'Conjurar salva',
  'Conjure Woodland Beings':      'Conjurar seres del bosque',
  'Contact Other Plane':          'Contactar otro plano',
  'Contagion':                    'Contagio',
  'Contingency':                  'Contingencia',
  'Continual Flame':              'Llama continua',
  'Control Water':                'Controlar agua',
  'Control Weather':              'Controlar el tiempo',
  'Cordon of Arrows':             'Cordón de flechas',
  'Counterspell':                 'Contrahechizo',
  'Create Food and Water':        'Crear comida y agua',
  'Create or Destroy Water':      'Crear o destruir agua',
  'Create Undead':                'Crear no muertos',
  'Creation':                     'Creación',
  'Cure Wounds':                  'Curar heridas',
  'Dancing Lights':               'Luces danzantes',
  'Darkness':                     'Oscuridad',
  'Darkvision':                   'Visión en la oscuridad',
  'Daylight':                     'Luz del día',
  'Death Ward':                   'Protección contra la muerte',
  'Delayed Blast Fireball':       'Bola de fuego de detonación retardada',
  'Demiplane':                    'Demiplano',
  'Detect Evil and Good':         'Detectar el bien y el mal',
  'Detect Magic':                 'Detectar magia',
  'Detect Poison and Disease':    'Detectar veneno y enfermedad',
  'Detect Thoughts':              'Detectar pensamientos',
  'Dimension Door':               'Puerta dimensional',
  'Disguise Self':                'Disfrazarse',
  'Disintegrate':                 'Desintegrar',
  'Dispel Evil and Good':         'Disipar el bien y el mal',
  'Dispel Magic':                 'Disipar magia',
  'Dissonant Whispers':           'Susurros disonantes',
  'Divination':                   'Adivinación',
  'Divine Favor':                 'Favor divino',
  'Divine Word':                  'Palabra divina',
  'Dominate Beast':               'Dominar bestia',
  'Dominate Monster':             'Dominar monstruo',
  'Dominate Person':              'Dominar persona',
  'Drawmij\'s Instant Summons':   'Invocación instantánea de Drawmij',
  'Druidcraft':                   'Artesanía druídica',
  'Earthquake':                   'Terremoto',
  'Eldritch Blast':               'Explosión sobrenatural',
  'Enhance Ability':              'Aumentar característica',
  'Enlarge/Reduce':               'Agrandar/Reducir',
  'Entangle':                     'Enredar',
  'Enthrall':                     'Cautivar',
  'Etherealness':                 'Paso al Plano Etéreo',
  'Evard\'s Black Tentacles':     'Tentáculos negros de Evard',
  'Expeditious Retreat':          'Retirada expeditiva',
  'Eyebite':                      'Mal de ojo',
  'Fabricate':                    'Fabricar',
  'Faerie Fire':                  'Fuego feérico',
  'False Life':                   'Vida falsa',
  'Fear':                         'Terror',
  'Feather Fall':                 'Caída de pluma',
  'Feeblemind':                   'Debilitar mente',
  'Find Familiar':                'Hallar familiar',
  'Find Steed':                   'Hallar corcel',
  'Find the Path':                'Encontrar el camino',
  'Find Traps':                   'Detectar trampas',
  'Finger of Death':              'Dedo de la muerte',
  'Fire Bolt':                    'Rayo de fuego',
  'Fire Shield':                  'Escudo de fuego',
  'Fire Storm':                   'Tormenta de fuego',
  'Fireball':                     'Bola de fuego',
  'Flame Blade':                  'Filo de llama',
  'Flame Strike':                 'Golpe de llamas',
  'Flaming Sphere':               'Esfera llameante',
  'Flesh to Stone':               'Carne a piedra',
  'Fly':                          'Volar',
  'Fog Cloud':                    'Nube de niebla',
  'Forbiddance':                  'Prohibición',
  'Forcecage':                    'Jaula de fuerza',
  'Foresight':                    'Presciencia',
  'Freedom of Movement':          'Libertad de movimiento',
  'Freezing Sphere':              'Esfera de hielo',
  'Gaseous Form':                 'Forma gaseosa',
  'Gate':                         'Portal',
  'Geas':                         'Geas',
  'Gentle Repose':                'Reposo tranquilo',
  'Giant Insect':                 'Insecto gigante',
  'Glibness':                     'Elocuencia',
  'Globe of Invulnerability':     'Globo de invulnerabilidad',
  'Glyph of Warding':             'Glifo de protección',
  'Goodberry':                    'Bayas buenas',
  'Grease':                       'Grasa',
  'Greater Invisibility':         'Invisibilidad superior',
  'Greater Restoration':          'Restauración superior',
  'Guardian of Faith':            'Guardián de la fe',
  'Guards and Wards':             'Guardianes y protecciones',
  'Guidance':                     'Guía',
  'Guiding Bolt':                 'Rayo guía',
  'Gust of Wind':                 'Ráfaga de viento',
  'Hallow':                       'Consagrar',
  'Hallucinatory Terrain':        'Terreno alucinatorio',
  'Harm':                         'Dañar',
  'Haste':                        'Prisa',
  'Heal':                         'Sanar',
  'Healing Word':                 'Palabra curativa',
  'Heat Metal':                   'Calentar metal',
  'Hellish Rebuke':               'Represalia infernal',
  'Heroes\' Feast':               'Festín de héroes',
  'Heroism':                      'Heroísmo',
  'Hex':                          'Maldición oscura',
  'Hold Monster':                 'Paralizar monstruo',
  'Hold Person':                  'Paralizar persona',
  'Holy Aura':                    'Aura sagrada',
  'Hunter\'s Mark':               'Marca del cazador',
  'Hypnotic Pattern':             'Patrón hipnótico',
  'Ice Storm':                    'Tormenta de hielo',
  'Identify':                     'Identificar',
  'Illusory Script':              'Escritura ilusoria',
  'Imprisonment':                 'Encarcelamiento',
  'Incendiary Cloud':             'Nube incendiaria',
  'Inflict Wounds':               'Infligir heridas',
  'Insect Plague':                'Plaga de insectos',
  'Invisibility':                 'Invisibilidad',
  'Jump':                         'Saltar',
  'Knock':                        'Golpe',
  'Legend Lore':                  'Resa de leyendas',
  'Leomund\'s Secret Chest':      'Cofre secreto de Leomund',
  'Leomund\'s Tiny Hut':          'Choza minúscula de Leomund',
  'Lesser Restoration':           'Restauración menor',
  'Levitate':                     'Levitar',
  'Light':                        'Luz',
  'Lightning Arrow':              'Flecha de relámpago',
  'Lightning Bolt':               'Rayo',
  'Locate Animals or Plants':     'Localizar animales o plantas',
  'Locate Creature':              'Localizar criatura',
  'Locate Object':                'Localizar objeto',
  'Longstrider':                  'Caminante veloz',
  'Mage Armor':                   'Armadura de mago',
  'Mage Hand':                    'Mano del mago',
  'Magic Circle':                 'Círculo mágico',
  'Magic Jar':                    'Jarra mágica',
  'Magic Missile':                'Proyectil mágico',
  'Magic Mouth':                  'Boca mágica',
  'Magic Weapon':                 'Arma mágica',
  'Major Image':                  'Imagen mayor',
  'Mass Cure Wounds':             'Curar heridas en grupo',
  'Mass Heal':                    'Curación en masa',
  'Mass Healing Word':            'Palabra curativa en grupo',
  'Mass Suggestion':              'Sugestión en masa',
  'Maze':                         'Laberinto',
  'Melfs Acid Arrow':             'Flecha ácida de Melf',
  'Melf\'s Acid Arrow':           'Flecha ácida de Melf',
  'Mending':                      'Reparar',
  'Message':                      'Mensaje',
  'Meteor Swarm':                 'Lluvia de meteoritos',
  'Mind Blank':                   'Mente en blanco',
  'Minor Illusion':               'Ilusión menor',
  'Mirage Arcane':                'Espejismo arcano',
  'Mirror Image':                 'Imagen especular',
  'Mislead':                      'Confundir',
  'Misty Step':                   'Paso brumoso',
  'Modify Memory':                'Modificar recuerdo',
  'Moonbeam':                     'Rayo de luna',
  'Mordenkainen\'s Faithful Hound':  'Sabueso fiel de Mordenkainen',
  'Mordenkainen\'s Magnificent Mansion': 'Magnífica mansión de Mordenkainen',
  'Mordenkainen\'s Private Sanctum': 'Santuario privado de Mordenkainen',
  'Mordenkainen\'s Sword':        'Espada de Mordenkainen',
  'Move Earth':                   'Mover tierra',
  'Nondetection':                 'Indetectable',
  'Nystul\'s Magic Aura':         'Aura mágica de Nystul',
  'Otiluke\'s Freezing Sphere':   'Esfera gélida de Otiluke',
  'Otiluke\'s Resilient Sphere':  'Esfera resistente de Otiluke',
  'Otto\'s Irresistible Dance':   'Danza irresistible de Otto',
  'Pass without Trace':           'Pasar sin dejar rastro',
  'Passwall':                     'Atravesar muros',
  'Phantasmal Force':             'Fuerza fantasmal',
  'Phantasmal Killer':            'Asesino fantasmal',
  'Phantom Steed':                'Corcel fantasmal',
  'Planar Ally':                  'Aliado planar',
  'Planar Binding':               'Vincular planar',
  'Plane Shift':                  'Cambio de plano',
  'Plant Growth':                 'Crecer plantas',
  'Poison Spray':                 'Chorro de veneno',
  'Polymorph':                    'Polimorfismo',
  'Power Word Kill':              'Matar de una palabra',
  'Power Word Stun':              'Aturdir de una palabra',
  'Prayer of Healing':            'Oración curativa',
  'Prestidigitation':             'Prestidigitación',
  'Prismatic Spray':              'Rociada prismática',
  'Prismatic Wall':               'Muro prismático',
  'Private Sanctum':              'Santuario privado',
  'Produce Flame':                'Producir llama',
  'Programmed Illusion':          'Ilusión programada',
  'Project Image':                'Proyectar imagen',
  'Protection from Energy':       'Protección contra energía',
  'Protection from Evil and Good': 'Protección contra el bien y el mal',
  'Protection from Poison':       'Protección contra el veneno',
  'Purify Food and Drink':        'Purificar comida y bebida',
  'Raise Dead':                   'Resucitar muertos',
  'Rary\'s Telepathic Bond':      'Vínculo telepático de Rary',
  'Ray of Enfeeblement':          'Rayo de debilitamiento',
  'Ray of Frost':                 'Rayo de escarcha',
  'Ray of Sickness':              'Rayo de enfermedad',
  'Regenerate':                   'Regenerar',
  'Reincarnate':                  'Reencarnación',
  'Remove Curse':                 'Eliminar maldición',
  'Resilient Sphere':             'Esfera resistente',
  'Resistance':                   'Resistencia',
  'Resurrection':                 'Resurrección',
  'Reverse Gravity':              'Revertir gravedad',
  'Revivify':                     'Revivir',
  'Rope Trick':                   'Truco de la cuerda',
  'Sacred Flame':                 'Llama sagrada',
  'Sanctuary':                    'Santuario',
  'Scorching Ray':                'Rayo abrasador',
  'Scrying':                      'Escrutinio',
  'Secret Chest':                 'Cofre secreto',
  'See Invisibility':             'Ver invisibilidad',
  'Seeming':                      'Apariencia',
  'Sending':                      'Enviar',
  'Sequester':                    'Secuestrar',
  'Shapechange':                  'Cambiar de forma',
  'Shatter':                      'Añicos',
  'Shield':                       'Escudo',
  'Shield of Faith':              'Escudo de la fe',
  'Shillelagh':                   'Shillelagh',
  'Shocking Grasp':               'Toque descargante',
  'Silence':                      'Silencio',
  'Silent Image':                 'Imagen silenciosa',
  'Simulacrum':                   'Simulacro',
  'Sleep':                        'Dormir',
  'Sleet Storm':                  'Tormenta de aguanieve',
  'Slow':                         'Ralentizar',
  'Spare the Dying':              'Evitar la muerte',
  'Speak with Animals':           'Hablar con animales',
  'Speak with Dead':              'Hablar con los muertos',
  'Speak with Plants':            'Hablar con plantas',
  'Spider Climb':                 'Trepar como araña',
  'Spike Growth':                 'Crecimiento de pinchos',
  'Spirit Guardians':             'Guardianes espirituales',
  'Spiritual Weapon':             'Arma espiritual',
  'Staggering Smite':             'Castigo tambaleante',
  'Stinking Cloud':               'Nube apestosa',
  'Stone Shape':                  'Moldear piedra',
  'Stoneskin':                    'Piel pétrea',
  'Storm of Vengeance':           'Tormenta de venganza',
  'Suggestion':                   'Sugestión',
  'Sunbeam':                      'Rayo solar',
  'Sunburst':                     'Estallido solar',
  'Swift Quiver':                 'Carcaj veloz',
  'Symbol':                       'Símbolo',
  'Telekinesis':                  'Telequinesis',
  'Telepathy':                    'Telepatía',
  'Teleport':                     'Teletransportarse',
  'Teleportation Circle':         'Círculo de teletransporte',
  'Tenser\'s Floating Disk':      'Disco flotante de Tenser',
  'Thaumaturgy':                  'Taumaturgia',
  'Thunderous Smite':             'Castigo atronador',
  'Thunderwave':                  'Ola de trueno',
  'Time Stop':                    'Detener el tiempo',
  'Tiny Hut':                     'Choza minúscula',
  'Tongues':                      'Lenguas',
  'Transport via Plants':         'Transporte por plantas',
  'Tree Stride':                  'Paso arbóreo',
  'True Polymorph':               'Polimorfismo verdadero',
  'True Resurrection':            'Resurrección verdadera',
  'True Seeing':                  'Visión verdadera',
  'True Strike':                  'Golpe certero',
  'Tsunami':                      'Tsunami',
  'Unseen Servant':               'Sirviente invisible',
  'Vampiric Touch':               'Toque vampírico',
  'Vicious Mockery':              'Burla cruel',
  'Wall of Fire':                 'Muro de fuego',
  'Wall of Force':                'Muro de fuerza',
  'Wall of Ice':                  'Muro de hielo',
  'Wall of Stone':                'Muro de piedra',
  'Wall of Thorns':               'Muro de espinas',
  'Warding Bond':                 'Vínculo de protección',
  'Water Breathing':              'Respirar bajo el agua',
  'Water Walk':                   'Caminar sobre el agua',
  'Web':                          'Telaraña',
  'Wind Walk':                    'Caminar en el viento',
  'Wind Wall':                    'Muro de viento',
  'Wish':                         'Deseo',
  'Word of Recall':               'Palabra de regreso',
  'Wrathful Smite':               'Castigo colérico',
  'Zone of Truth':                'Zona de verdad',
}

export function tSpellName(name) {
  if (!name) return name
  return SPELL_NAME_MAP[name] || name
}

const CLASS_BY_INDEX = {
  barbarian: 'Bárbaro',
  bard: 'Bardo',
  cleric: 'Clérigo',
  druid: 'Druida',
  fighter: 'Guerrero',
  monk: 'Monje',
  paladin: 'Paladín',
  ranger: 'Explorador',
  rogue: 'Pícaro',
  sorcerer: 'Hechicero',
  warlock: 'Brujo',
  wizard: 'Mago'
}

const RACE_BY_INDEX = {
  dragonborn: 'Dracónido',
  dwarf: 'Enano',
  elf: 'Elfo',
  gnome: 'Gnomo',
  'half-elf': 'Semielfo',
  halfling: 'Mediano',
  'half-orc': 'Semiorco',
  human: 'Humano',
  tiefling: 'Tiefling'
}

const SCHOOL_BY_INDEX = {
  abjuration: 'Abjuración',
  conjuration: 'Conjuración',
  divination: 'Adivinación',
  enchantment: 'Encantamiento',
  evocation: 'Evocación',
  illusion: 'Ilusión',
  necromancy: 'Nigromancia',
  transmutation: 'Transmutación'
}

const DAMAGE_TYPE_BY_INDEX = {
  acid: 'Ácido',
  bludgeoning: 'Contundente',
  cold: 'Frío',
  fire: 'Fuego',
  force: 'Fuerza',
  lightning: 'Relámpago',
  necrotic: 'Necrótico',
  piercing: 'Perforante',
  poison: 'Veneno',
  psychic: 'Psíquico',
  radiant: 'Radiante',
  slashing: 'Cortante',
  thunder: 'Trueno'
}

const ABILITY_BY_INDEX = {
  str: 'Fuerza',
  dex: 'Destreza',
  con: 'Constitución',
  int: 'Inteligencia',
  wis: 'Sabiduría',
  cha: 'Carisma'
}

const EQUIPMENT_CATEGORY_BY_INDEX = {
  adventuring_gear: 'Equipo de aventura',
  armor: 'Armadura',
  mount: 'Montura',
  potion: 'Poción',
  ring: 'Anillo',
  rod: 'Vara',
  scroll: 'Pergamino',
  shield: 'Escudo',
  staff: 'Bastón',
  tool: 'Herramienta',
  wand: 'Varita',
  weapon: 'Arma',
  wondrous_items: 'Objeto maravilloso'
}

const SIMPLE_TEXT = {
  // Subclases y términos frecuentes de clases
  Life: 'Vida',
  Knowledge: 'Conocimiento',
  Light: 'Luz',
  Nature: 'Naturaleza',
  Tempest: 'Tempestad',
  Trickery: 'Engaño',
  War: 'Guerra',
  Grave: 'Tumba',
  Forge: 'Forja',
  Arcana: 'Arcana',
  Death: 'Muerte',
  Order: 'Orden',
  Peace: 'Paz',
  Twilight: 'Crepúsculo',

  // Rasgos de progresión comunes
  'Spellcasting: Cleric': 'Lanzamiento de conjuros: Clérigo',
  'Spellcasting:': 'Lanzamiento de conjuros:',
  'Divine Domain': 'Dominio divino',
  'Domain Spells': 'Conjuros de dominio',
  'Channel Divinity': 'Canalizar divinidad',
  'Turn Undead': 'Expulsar no muertos',
  'Divine Domain feature': 'Rasgo de dominio divino',
  'Ability Score Improvement': 'Mejora de puntuación de característica',
  'Destroy Undead': 'Destruir no muertos',
  '(1/rest)': '(1/descanso)',

  // Equipo común
  Shield: 'Escudo',

  Tiny: 'Diminuto',
  Small: 'Pequeño',
  Medium: 'Mediano',
  Large: 'Grande',
  Huge: 'Enorme',
  Gargantuan: 'Gargantuesco',
  Common: 'Común',
  Dwarvish: 'Enano',
  Elvish: 'Élfico',
  Giant: 'Gigante',
  Gnomish: 'Gnómico',
  Goblin: 'Goblin',
  Halfling: 'Mediano',
  Orc: 'Orco',
  Infernal: 'Infernal',
  Celestial: 'Celestial',
  Draconic: 'Dracónico',
  Abyssal: 'Abisal',
  gp: 'po',
  sp: 'pp',
  cp: 'pc',
  'lb.': 'lb',
  feet: 'pies',
  foot: 'pie'
}

const PHRASE_TRANSLATIONS = {
  'Spellcasting: Cleric': 'Lanzamiento de conjuros: Clérigo',
  'Spellcasting: Druid': 'Lanzamiento de conjuros: Druida',
  'Spellcasting: Bard': 'Lanzamiento de conjuros: Bardo',
  'Spellcasting: Paladin': 'Lanzamiento de conjuros: Paladín',
  'Spellcasting: Ranger': 'Lanzamiento de conjuros: Explorador',
  'Spellcasting: Sorcerer': 'Lanzamiento de conjuros: Hechicero',
  'Spellcasting: Warlock': 'Lanzamiento de conjuros: Brujo',
  'Spellcasting: Wizard': 'Lanzamiento de conjuros: Mago',
  'Spellcasting': 'Lanzamiento de conjuros',
  'Ability Score Improvement': 'Mejora de puntuación de característica',
  'Extra Attack': 'Ataque adicional',
  'Fighting Style': 'Estilo de combate',
  'Second Wind': 'Segundo aliento',
  'Action Surge': 'Arrebato de acción',
  'Indomitable': 'Indomable',
  'Arcane Recovery': 'Recuperación arcana',
  'Arcane Tradition': 'Tradición arcana',
  'Sorcerous Origin': 'Origen sortílego',
  'Font of Magic': 'Fuente de magia',
  'Metamagic': 'Metamagia',
  'Eldritch Invocations': 'Invocaciones sobrenaturales',
  'Pact Boon': 'Don del pacto',
  'Divine Domain': 'Dominio divino',
  'Domain Spells': 'Conjuros de dominio',
  'Channel Divinity': 'Canalizar divinidad',
  'Turn Undead': 'Expulsar no muertos',
  'Destroy Undead': 'Destruir no muertos',
  'Rage': 'Furia',
  'Unarmored Defense': 'Defensa sin armadura',
  'Reckless Attack': 'Ataque temerario',
  'Danger Sense': 'Sentido del peligro',
  'Primal Path': 'Senda primitiva',
  'Sneak Attack': 'Ataque furtivo',
  'Thieves\' Cant': 'Germanía',
  'Cunning Action': 'Acción astuta',
  'Expertise': 'Pericia',
  'Bardic Inspiration': 'Inspiración bardica',
  'Jack of All Trades': 'Aprendiz de todo',
  'Song of Rest': 'Canción de descanso',
  'Ki': 'Ki',
  'Martial Arts': 'Artes marciales',
  'Unarmored Movement': 'Movimiento sin armadura',
  'Divine Smite': 'Castigo divino',
  'Lay on Hands': 'Imposición de manos',
  'Hunter\'s Mark': 'Marca del cazador',
  'Darkvision': 'Visión en la oscuridad',
  'Fey Ancestry': 'Ascendencia feérica',
  'Trance': 'Trance',
  'Dwarven Resilience': 'Resistencia enana',
  'Brave': 'Valentía',
  'Halfling Nimbleness': 'Agilidad mediana',
  'Hellish Resistance': 'Resistencia infernal',
  'Breath Weapon': 'Arma de aliento',
  'Damage Resistance': 'Resistencia al daño',
  'Ritual Casting': 'Lanzamiento ritual',
  'At Higher Levels': 'A niveles superiores',
  'Saving Throw': 'Tirada de salvación',
  'Saving Throws': 'Tiradas de salvación',
  'Hit Die': 'Dado de golpe',
  'Hit Dice': 'Dados de golpe',
  'Armor Class': 'Clase de armadura',
  'Armor Proficiencies': 'Competencias con armaduras',
  'Weapon Proficiencies': 'Competencias con armas',
  'Tool Proficiencies': 'Competencias con herramientas',
  // Tiempos de lanzamiento
  '1 action': '1 acción',
  '1 bonus action': '1 acción adicional',
  '1 reaction': '1 reacción',
  '1 minute': '1 minuto',
  '10 minutes': '10 minutos',
  '1 hour': '1 hora',
  '8 hours': '8 horas',
  '24 hours': '24 horas',
  '12 hours': '12 horas',
  // Duraciones
  'Instantaneous': 'Instantáneo',
  'instantaneous': 'Instantáneo',
  'Until dispelled': 'Hasta ser disipado',
  'until dispelled': 'hasta ser disipado',
  'Up to 1 minute': 'Hasta 1 minuto',
  'Up to 10 minutes': 'Hasta 10 minutos',
  'Up to 1 hour': 'Hasta 1 hora',
  'Up to 8 hours': 'Hasta 8 horas',
  'Up to 24 hours': 'Hasta 24 horas',
  'Concentration, up to 1 minute': 'Concentración, hasta 1 minuto',
  'Concentration, up to 10 minutes': 'Concentración, hasta 10 minutos',
  'Concentration, up to 1 hour': 'Concentración, hasta 1 hora',
  'Concentration, up to 8 hours': 'Concentración, hasta 8 horas',
  'Concentration, up to 24 hours': 'Concentración, hasta 24 horas',
  // Alcances comunes
  'Self (10-foot radius)': 'Uno mismo (radio de 3 metros)',
  'Self (15-foot cone)': 'Uno mismo (cono de 4,5 metros)',
  'Self (60-foot line)': 'Uno mismo (línea de 18 metros)',
  'Self (30-foot cone)': 'Uno mismo (cono de 9 metros)',
  // Propiedades de arma
  'Ammunition': 'Munición',
  'Finesse': 'Finura',
  'Heavy': 'Pesada',
  'Light': 'Ligera',
  'Loading': 'Recarga',
  'Reach': 'Alcance extra',
  'Thrown': 'Arrojadiza',
  'Two-Handed': 'A dos manos',
  'Versatile': 'Versátil',
  'Silvered': 'Plateada'
}

const TOKEN_TRANSLATIONS = {
  life: 'vida',
  knowledge: 'conocimiento',
  light: 'luz',
  nature: 'naturaleza',
  tempest: 'tempestad',
  trickery: 'engaño',
  war: 'guerra',
  grave: 'tumba',
  forge: 'forja',
  order: 'orden',
  peace: 'paz',
  twilight: 'crepúsculo',
  fire: 'fuego',
  cold: 'frío',
  lightning: 'relámpago',
  thunder: 'trueno',
  acid: 'ácido',
  poison: 'veneno',
  force: 'fuerza',
  radiant: 'radiante',
  necrotic: 'necrótico',
  psychic: 'psíquico',
  slashing: 'cortante',
  piercing: 'perforante',
  bludgeoning: 'contundente',
  charm: 'encantar',
  fear: 'miedo',
  shield: 'escudo',
  bolt: 'rayo',
  blast: 'explosión',
  strike: 'golpe',
  touch: 'toque',
  hand: 'mano',
  hands: 'manos',
  weapon: 'arma',
  weapons: 'armas',
  armor: 'armadura',
  attack: 'ataque',
  attacks: 'ataques',
  healing: 'curación',
  heal: 'curar',
  wounds: 'heridas',
  word: 'palabra',
  magic: 'magia',
  divine: 'divino',
  arcane: 'arcano',
  domain: 'dominio',
  undead: 'no muertos',
  concentration: 'concentración',
  ritual: 'ritual',
  range: 'alcance',
  duration: 'duración',
  school: 'escuela',
  level: 'nivel',
  bonus: 'bonificador',
  // Tiempos de lanzamiento
  action: 'acción',
  reaction: 'reacción',
  minute: 'minuto',
  minutes: 'minutos',
  hour: 'hora',
  hours: 'horas',
  round: 'asalto',
  rounds: 'asaltos',
  // Duraciones
  instantaneous: 'instantáneo',
  // Alcances
  self: 'uno mismo',
  feet: 'pies',
  foot: 'pie',
  mile: 'milla',
  miles: 'millas',
  sight: 'línea de visión',
  unlimited: 'ilimitado',
  special: 'especial',
  // Otros términos frecuentes
  dispelled: 'disipado',
  triggered: 'activada',
  turns: 'turnos',
  turn: 'turno',
  creature: 'criatura',
  creatures: 'criaturas',
  target: 'objetivo',
  targets: 'objetivos',
  effect: 'efecto',
  effects: 'efectos',
  damage: 'daño',
  point: 'punto',
  points: 'puntos',
  roll: 'tirar',
  save: 'salvación',
  check: 'prueba',
  ability: 'característica',
  score: 'puntuación',
  modifier: 'modificador',
  proficiency: 'competencia',
  spell: 'conjuro',
  spells: 'conjuros',
  slot: 'espacio',
  slots: 'espacios',
  cantrip: 'truco',
  cantrips: 'trucos',
  reaction: 'reacción',
  hit: 'impacto',
  miss: 'fallo',
  succeed: 'superar',
  fail: 'fallar',
  failure: 'fallo',
  success: 'éxito',
  advantage: 'ventaja',
  disadvantage: 'desventaja',
  resistance: 'resistencia',
  immunity: 'inmunidad',
  vulnerability: 'vulnerabilidad',
  condition: 'condición',
  conditions: 'condiciones',
  blinded: 'cegado',
  charmed: 'encantado',
  deafened: 'ensordecido',
  frightened: 'asustado',
  grappled: 'agarrado',
  incapacitated: 'incapacitado',
  invisible: 'invisible',
  paralyzed: 'paralizado',
  petrified: 'petrificado',
  poisoned: 'envenenado',
  prone: 'tumbado',
  restrained: 'restringido',
  stunned: 'aturdido',
  unconscious: 'inconsciente',
  exhaustion: 'agotamiento'
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function preserveCase(source, translated) {
  if (source.toUpperCase() === source) return translated.toUpperCase()
  if (source[0] && source[0].toUpperCase() === source[0]) {
    return translated.charAt(0).toUpperCase() + translated.slice(1)
  }
  return translated
}

function replacePhrases(text) {
  let out = text
  const entries = Object.entries(PHRASE_TRANSLATIONS)
    .sort((a, b) => b[0].length - a[0].length)

  for (const [src, dst] of entries) {
    const rx = new RegExp(escapeRegex(src), 'gi')
    out = out.replace(rx, (match) => preserveCase(match, dst))
  }
  return out
}

function replaceTokens(text) {
  let out = text
  for (const [src, dst] of Object.entries(TOKEN_TRANSLATIONS)) {
    const rx = new RegExp(`\\b${escapeRegex(src)}\\b`, 'gi')
    out = out.replace(rx, (match) => preserveCase(match, dst))
  }
  return out
}

function translateByIndex(entry, map) {
  if (!entry) return ''
  if (typeof entry === 'string') return map[entry] || entry
  if (entry.index && map[entry.index]) return map[entry.index]
  return entry.name || ''
}

export function tClass(entry) {
  return translateByIndex(entry, CLASS_BY_INDEX)
}

export function tRace(entry) {
  return translateByIndex(entry, RACE_BY_INDEX)
}

export function tSchool(entry) {
  return translateByIndex(entry, SCHOOL_BY_INDEX)
}

export function tDamageType(entry) {
  return translateByIndex(entry, DAMAGE_TYPE_BY_INDEX)
}

export function tAbility(entry) {
  return translateByIndex(entry, ABILITY_BY_INDEX)
}

export function tEquipmentCategory(entry) {
  return translateByIndex(entry, EQUIPMENT_CATEGORY_BY_INDEX)
}

export function tSimpleText(text) {
  if (!text) return text
  let out = String(text)

  // 1) Reemplazos exactos heredados
  for (const [src, dst] of Object.entries(SIMPLE_TEXT)) {
    out = out.replaceAll(src, dst)
  }

  // 2) Reemplazos por frases completas
  out = replacePhrases(out)

  // 3) Reemplazos por tokens individuales
  out = replaceTokens(out)

  return out
}

export function tComponent(component) {
  if (component === 'V') return 'V (Verbal)'
  if (component === 'S') return 'S (Somático)'
  if (component === 'M') return 'M (Material)'
  return component
}

export function tErrorMessage(message) {
  if (!message) return 'Error desconocido'
  const msg = String(message)

  if (msg.includes('JSON.parse') || msg.includes('Unexpected token') || msg.includes('JSON inválido')) {
    return 'La API devolvió una respuesta inválida. Intenta de nuevo en unos segundos.'
  }
  if (msg.includes('Failed to fetch') || msg.includes('Fallo de red')) {
    return 'No se pudo conectar con dnd5eapi.co. Revisa tu conexión e inténtalo otra vez.'
  }
  if (msg.includes('404')) {
    return 'No se encontró el recurso solicitado en la API de D&D 5e.'
  }
  if (msg.includes('429')) {
    return 'Demasiadas solicitudes a la API. Espera unos segundos e inténtalo de nuevo.'
  }

  return msg
}
