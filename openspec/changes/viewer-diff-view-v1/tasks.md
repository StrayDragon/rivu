## 1. Spec + vectors (`rivu-ui-spec`)

- [ ] 1.1 Add `DiffView@1` props schema + exports in `packages/rivu-ui-spec`
- [ ] 1.2 Add golden vectors (valid + invalid), consumable by TS/Python/Rust validators
- [ ] 1.3 Regenerate `json-schema.generated.ts` and keep build green

## 2. React UI kit implementation (`rivu-react`)

- [ ] 2.1 Implement `DiffView` (line-diff + unified/split modes + truncation + tokens)
- [ ] 2.2 Add registry registration and export from `packages/rivu-react/src/index.ts`
- [ ] 2.3 Add minimal styling hooks (`className/style`) and viewer-safe error/truncation rendering

## 3. Export pipeline

- [ ] 3.1 Extend HTML export renderer to support `DiffView@1`
- [ ] 3.2 Add export regression fixture for `DiffView@1` (deterministic + offline)

## 4. Examples + docs

- [ ] 4.1 Add demo fixtures mounting `DiffView` (e.g. “Before vs After” report snippet)
- [ ] 4.2 Add a Viewer gallery section in `examples/rivu-react-demo` for DiffView
- [ ] 4.3 Add docs describing DiffView usage, payload sizing guidance, and export expectations

## 5. Verification

- [ ] 5.1 Run repo typecheck/build and ensure examples start (`pnpm test`, `pnpm -C examples/rivu-react-demo typecheck`)
- [ ] 5.2 Add unit tests for truncation behavior and mode rendering (use existing test stack)
