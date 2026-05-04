# Lista de mejoras priorizadas

Basada en análisis del codebase (abril 2026).

---

## Prioridad 1 — Fundación ✅ COMPLETADO

**1. Context API para estado del personaje** ✅
`src/contexts/CharacterContext.jsx` — `CharacterProvider` + `useCharacter()`. Elimina todo el prop drilling de `character`/`onUpdate`/`theme` en los 7 componentes principales.

**2. Extraer constantes a `src/constants/`** ✅
`dndData.js`, `stats.js`, `weapons.js`, `spellSlots.js`, `hexblade.js` — arrays duplicados centralizados e importados desde cada componente.

---

## Prioridad 2 — Estabilidad y mantenibilidad ✅ COMPLETADO

**3. Error boundaries en componentes async** ✅
`src/components/Common/ErrorBoundary.jsx` — Envuelve Compendio y AI Advisor en App.jsx. Captura crashes silenciosos y muestra UI de recuperación con botón "Reintentar".

**4. Dividir `DamageCalculator.jsx` (1.909 → 1.437 líneas)** ✅
- `src/components/DamageCalculator/damageUtils.js` — Funciones puras extraídas (rollDice, normalizeSpellSlots, getDefaultSpellSlotsByClassLevel, etc.)
- `src/hooks/useSpellSlots.js` — Gestión de espacios de conjuro con preset automático
- `src/hooks/useAttackHistory.js` — Historial de ataques con persistencia y migración legacy
- `src/hooks/useSkillRolls.js` — Tiradas de habilidad/salvación con persistencia

**5. Custom hooks reutilizables** ✅
- `src/hooks/useDiceRoll.js` — Tiradas genéricas, usado por DiceRoller
- `src/hooks/useAIChat.js` — Lógica de chat IA extraída de AIAdvisor (sanitización, detección de idioma, historial)

---

## Prioridad 3 — Rendimiento

**6. Code splitting con `React.lazy`**✅
Una línea por componente-pestaña. Mejora notable en tiempo de arranque. Toda la app (~7.000 líneas JSX) se carga de golpe actualmente.

**7. Debounce en localStorage + memoización en DamageCalculator**✅
Dos cambios pequeños con impacto directo en fluidez. El guardado ocurre en cada cambio del personaje sin debounce.

---

## Prioridad 4 — UX y pulido

**8. Toasts en lugar de `alert()`**
Elimina el mayor punto de fricción de UX con poco esfuerzo. `DiceRoller` usa `alert()` para errores de validación.

**9. Loading skeletons en el Compendio**
Percepción de velocidad mucho mejor al cargar la API. Ahora hay cambios bruscos de estado.

**10. Responsividad móvil**
El esfuerzo más grande, pero potencialmente el más valioso si se usa en mesa. Hay breakpoints parciales pero la app no está diseñada para móvil.

---

## Prioridad 5 — Deuda técnica

**11. PropTypes / JSDoc en componentes**
Actualmente ningún componente tiene validación de props.

**12. Tests para lógica crítica**
Solo hay 2 archivos de test para toda la app. Priorizar `dndRules.js` y `DamageCalculator`.

---

## Prioridad 6 — Mayo 2026 (análisis profundo del codebase)

### Funcionalidades de alto impacto

**13. Descanso Largo y Descanso Corto automatizados** ✅
Botones en la cabecera de la ficha que restauran PG al máximo y resetean todos los slots de conjuro (largo), o solo los pact slots del brujo (corto). Ahora hay que hacerlo campo a campo manualmente.

**14. Rastreador de condiciones de combate** ✅
Panel en la ficha con las 15 condiciones oficiales de D&D 5e (Cegado, Paralizado, Envenenado, etc.), activables con un clic. Cada condición muestra su efecto mecánico. Estado persistido en el personaje.

**15. Rastreador de iniciativa / encuentro** ✅
Nueva pestaña `⚔️ Encuentro` con lista de combatientes (nombre, iniciativa, HP, CA), ordenación automática por iniciativa, seguimiento del turno activo y contador de rondas.

**16. Lazy loading con `React.lazy` + `Suspense`** ✅
Todos los componentes de pestaña importados con `React.lazy`. Solo se carga el bundle de la pestaña activa, reduciendo el tiempo de arranque.

**17. `React.memo` en componentes pesados** ✅
`DamageCalculator`, `Compendium`, `EquipmentPanel` y `SessionNotes` envueltos con `React.memo` para evitar re-renders innecesarios al cambiar datos de otros módulos.

### Calidad de código

**18. Error handling en escritura a localStorage**
`writeStoredJSON` silencia `QuotaExceededError`. Añadir notificación al usuario si el almacenamiento está lleno.

**19. Debounce en búsqueda del Compendio**
El campo de búsqueda de hechizos re-filtra en cada pulsación de tecla. Con un debounce de 300 ms sobre una lista de +300 entradas se mejora la fluidez.

**20. Descanso largo de partido (multi-personaje)**
Cuando hay varios personajes activos, aplicar el descanso largo a todos de una vez.
