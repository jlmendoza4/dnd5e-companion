# D&D 5e Companion

Aplicación de escritorio/web para gestionar una ficha de personaje de D&D 5e, consultar compendio, lanzar cálculos de combate y usar un consejero IA.

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

- En entorno Electron, la API key de IA se guarda fuera de `localStorage` mediante un puente `preload`.
- La ficha y el tema usan una capa de almacenamiento centralizada en `src/services/storage.js`.
- Las reglas compartidas de clases, subclases y bonificador de competencia viven en `src/services/dndRules.js`.