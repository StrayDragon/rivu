## 1. Workspace

- [x] 1.1 Ensure `pnpm-workspace.yaml` includes `examples/*`
- [x] 1.2 Add `examples/rivu-react-demo/` Vite React TS project scaffold

## 2. Demo app

- [x] 2.1 Build demo kernel + registry wiring (no Provider required)
- [x] 2.2 Implement mounts-based chat layout (`inline` + `sidebar`)
- [x] 2.3 Add in-browser mock server for `ui.v1.event` round-trip (ApprovalCard/FormCard)
- [x] 2.4 Add minimal debug panel for `lastSeq`, outbox, and `sharedState.ui`

## 3. Docs

- [x] 3.1 Write `examples/rivu-react-demo/README.md` with run instructions + what it demonstrates
- [x] 3.2 Link demo from root `README.md`

## 4. Validation

- [x] 4.1 Run `pnpm -C examples/rivu-react-demo build` and `typecheck`
