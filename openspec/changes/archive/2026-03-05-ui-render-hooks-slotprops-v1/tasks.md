## 1. New host configuration surface (BREAKING)

- [x] 1.1 Define a `RivuHost` (or equivalent) type bundling `registry + renderHooks + slotProps`
- [x] 1.2 Update `rivu-react` public API to accept the host config explicitly (e.g. `ComponentRenderer`, export entrypoints, optional Provider)
- [x] 1.3 Update `rivu-svelte` to expose an equivalent host config surface (Svelte-idiomatic, semantics aligned)
- [x] 1.4 Update `buildUiV1Capabilities` (React/Svelte) to consume the new host/registry surface
- [x] 1.5 Upgrade all in-repo callsites (examples + docs snippets) to the new API in one pass (no compatibility layer)

## 2. Render hooks (formatter / markdown / highlight / sanitize)

- [x] 2.1 Define the `ui-render-hooks` contract (types + defaults) in both adapters
- [x] 2.2 Implement a default URL sanitizer (`http(s)|mailto` allowlist) and wire it into URL-rendering components (e.g. `CitationList`)
- [x] 2.3 Add value formatting hooks and migrate Viewer components to use them (MetricCard/DataTable/Chart tooltips or labels where applicable)
- [x] 2.4 Add optional markdown/code-highlight hooks (default: plain text / no highlight) and document host responsibilities (HTML sanitization)
- [x] 2.5 Add an optional component-props sanitizer hook and integrate it into the rendering pipeline (pre-render, host-only, not persisted)

## 3. `slotProps` for complex components

- [x] 3.1 Define `slotProps` shape and naming conventions (DataTable + workflow cards first)
- [x] 3.2 Implement `slotProps` for `DataTable` key sub-areas (table/head/body/cell/caption/empty state container)
- [x] 3.3 Implement `slotProps` for `ApprovalCard` and `FormCard` key sub-areas (actions/buttons/fields/status)
- [x] 3.4 Add docs examples showing “inject without replace” vs full `slots` replacement

## 4. Tokens expansion (typography / spacing)

- [x] 4.1 Extend `tokens.css` with minimal typography + spacing tokens (with fallbacks)
- [x] 4.2 Refactor UI kit components to consume typography/spacing tokens instead of hard-coded padding/font-size where reasonable
- [x] 4.3 Add a short “token bridge” snippet showing mapping from MUI/shadcn typography/spacing to `--rivu-*`

## 5. Examples, docs, and verification

- [x] 5.1 Upgrade `examples/rivu-react-demo` to the new host API and add a small render-hooks showcase (formatter + URL blocking)
- [x] 5.2 Upgrade `examples/rivu-react-shadcn-demo` to use real `shadcn/ui` components (Radix + generated components) while keeping `--rivu-*` token bridge
- [x] 5.3 Update docs (`docs/design-system.md`, integration quickstart snippets) to cover render hooks + slotProps + BREAKING migration
- [x] 5.4 Add/adjust tests for sanitizer + formatter + slotProps paths; run typecheck/build across all examples
