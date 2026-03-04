## 1. Spec + vectors (`rivu-ui-spec`)

- [ ] 1.1 Add `PivotTable@1` props schema + exports in `packages/rivu-ui-spec`
- [ ] 1.2 Add `Heatmap@1` props schema + exports in `packages/rivu-ui-spec`
- [ ] 1.3 Add golden vectors (valid + invalid) for both components, consumable by TS/Python/Rust validators
- [ ] 1.4 Regenerate `json-schema.generated.ts` and keep build green

## 2. React UI kit implementation (`rivu-react`)

- [ ] 2.1 Implement `PivotTable` viewer component (datasets + pure aggregation + viewer-safe fallbacks + tokens)
- [ ] 2.2 Implement `Heatmap` viewer component (encoding + palette from `--rivu-chart-*` + viewer-safe fallbacks + tokens)
- [ ] 2.3 Add registry registrations and export from `packages/rivu-react/src/index.ts`
- [ ] 2.4 Add minimal slots/overrides for key sub-areas (title/header/cell) to keep customization viable

## 3. Export pipeline

- [ ] 3.1 Extend HTML export renderer to support `PivotTable@1`
- [ ] 3.2 Extend HTML export renderer to support `Heatmap@1`
- [ ] 3.3 Add export regression fixtures to ensure deterministic output (no network, stable markup)

## 4. Examples + docs

- [ ] 4.1 Add demo fixtures mounting `PivotTable` + `Heatmap` (prefer dataset references)
- [ ] 4.2 Add a new Viewer gallery section in `examples/rivu-react-demo` for PivotTable/Heatmap
- [ ] 4.3 Add a short doc page describing the two components, their props, and dataset/limits guidance

## 5. Verification

- [ ] 5.1 Run repo typecheck/build and ensure examples start (`pnpm test`, `pnpm -C examples/rivu-react-demo typecheck`)
- [ ] 5.2 Add unit tests for pivot aggregation and heatmap encoding validation (use existing test stack)
