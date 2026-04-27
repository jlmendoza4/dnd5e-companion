# D&D 5e Companion

Aplicación de escritorio/web para gestionar una ficha de personaje de D&D 5e, consultar compendio y lanzar cálculos de combate.

## Desarrollo

```bash
npm install
npm run dev
```

## Calidad

```bash
npm run lint
npm run test
```

## Electron

```bash
npm run electron
```

## Build

Web:

```bash
npm run build
```

Windows con Electron Builder:

```bash
npm run electron:build
```

## Notas

- La ficha y el tema usan una capa de almacenamiento centralizada en `src/services/storage.js`.
- Las reglas compartidas de clases, subclases y bonificador de competencia viven en `src/services/dndRules.js`.
- En Electron, el estado de personajes también se sincroniza en `public/characters.shared.json` para poder versionarlo en Git y recuperarlo en otro equipo tras clonar/actualizar.n