# vite-react-app — esempio manuale

App React minimale per testare `manual-code-coverage` end-to-end in locale.

## Prerequisiti

- Node.js ≥ 20
- pnpm ≥ 9

## Avvio rapido

Dalla **root del monorepo**:

```bash
pnpm install
pnpm build
```

### 1. Avvia il server MCC

```bash
pnpm --filter @manual-code-coverage/server run start
```

Il server ascolta su `http://localhost:3000` per default.

### 2. Avvia l'app con strumentazione

```bash
pnpm --filter vite-react-app-example build:coverage
pnpm --filter vite-react-app-example preview
```

`build:coverage` abilita la variabile `MCC_COVERAGE=true` che attiva il plugin Vite (`mccPlugin`), strumentando il codice con Istanbul a build time.

### 3. Esercita il codice

Apri `http://localhost:4173` nel browser ed esegui le azioni da coprire.  
Il client `MccClient` (inizializzato in `src/main.tsx`) raccoglie i dati e li invia al server a ogni interazione.

### 4. Scarica il report

```bash
pnpm --filter @manual-code-coverage/cli run start -- report <commit-sha> --output coverage/
```

Il report HTML viene generato in `coverage/index.html`.

## Variabili d'ambiente

| Variabile | Default | Descrizione |
|---|---|---|
| `MCC_COVERAGE` | `false` | Abilita la strumentazione del build |
| `MCC_SERVER_URL` | `http://localhost:3000` | URL del server MCC |

## Struttura

```
examples/vite-react-app/
├── src/
│   └── main.tsx        # entry point, inizializza MccClient
├── vite.config.ts      # usa mccPlugin()
├── index.html
└── package.json
```
