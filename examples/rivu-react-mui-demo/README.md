# Rivu + Material UI Demo

This demo shows how Rivu’s UI kit can **blend into an existing Material UI (MUI) design system** with minimal changes:

- host app uses MUI layout/components
- Rivu components inherit theme via `--rivu-*` CSS variables bridged from the MUI theme
- workflow interactions remain server-authoritative (`ui.v1.event` → `STATE_DELTA`)

## Run

From repo root:

```bash
pnpm install
pnpm -C examples/rivu-react-mui-demo dev
```

## What to look at

- `src/App.tsx` — MUI shell + Rivu mounts rendering + theme token bridge
- `src/demo-fixtures.ts` — `sharedState.ui` fixture
- `src/mock-server.ts` — in-browser mock server loop

