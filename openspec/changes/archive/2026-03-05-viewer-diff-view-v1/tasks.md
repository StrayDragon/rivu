## 1. Spec + vectors (`rivu-ui-spec`)

- [x] 1.1 Add `DiffView@1` props schema + exports in `packages/rivu-ui-spec`
- [x] 1.2 Add golden vectors (valid + invalid), consumable by TS/Python/Rust validators
- [x] 1.3 Regenerate `json-schema.generated.ts` and keep build green

## 2. React UI kit implementation (`rivu-react`)

- [x] 2.1 Implement `DiffView` (line-diff + unified/split modes + truncation + tokens)
- [x] 2.2 Add registry registration and export from `packages/rivu-react/src/index.ts`
- [x] 2.3 Add minimal styling hooks (`className/style`) and viewer-safe error/truncation rendering

## 3. Export pipeline

- [x] 3.1 Extend HTML export renderer to support `DiffView@1`
- [x] 3.2 Add export regression fixture for `DiffView@1` (deterministic + offline)

## 4. Examples + docs

- [x] 4.1 Add demo fixtures mounting `DiffView` (e.g. “Before vs After” report snippet)
- [x] 4.2 Add a Viewer gallery section in `examples/rivu-react-demo` for DiffView
- [x] 4.3 Add docs describing DiffView usage, payload sizing guidance, and export expectations

## 5. Verification

- [x] 5.1 Run repo typecheck/build and ensure examples start (`pnpm test`, `pnpm -C examples/rivu-react-demo typecheck`)
- [x] 5.2 Add unit tests for truncation behavior and mode rendering (use existing test stack)
