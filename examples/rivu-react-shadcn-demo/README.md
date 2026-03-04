# Rivu + shadcn/ui (Tailwind) Demo

This demo shows how Rivu can **blend into a shadcn/ui Tailwind design system**:

- host app uses Tailwind + shadcn CSS variables (`--background`, `--foreground`, …)
- Rivu theme tokens (`--rivu-*`) are mapped to those variables
- host UI uses real shadcn/ui components (Radix + generated components)
- Rivu components render inside the host shells with consistent borders/radius/colors

## Run

From repo root:

```bash
pnpm install
pnpm -C examples/rivu-react-shadcn-demo dev
```

## What to look at

- `src/styles.css` — shadcn-like CSS variables + `--rivu-*` mapping
- `src/components/ui/*` — generated shadcn/ui components used by the host
- `src/App.tsx` — host shell + Rivu mounts rendering + dark-mode toggle
