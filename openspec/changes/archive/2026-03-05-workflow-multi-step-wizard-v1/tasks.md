## 1. Spec + vectors (`rivu-ui-spec`)

- [x] 1.1 Add `MultiStepWizard@1` props schema (steps + fields) in `packages/rivu-ui-spec`
- [x] 1.2 Add `MultiStepWizard@1` state schema in `packages/rivu-ui-spec`
- [x] 1.3 Add golden vectors (valid + invalid) for wizard props/state and `ui.v1.event` payloads
- [x] 1.4 Regenerate `json-schema.generated.ts` and keep build green

## 2. React UI kit (`rivu-react`)

- [x] 2.1 Implement `MultiStepWizard` component (stepper + fields + server-authoritative loop)
- [x] 2.2 Add registry registration + export from `packages/rivu-react/src/index.ts`
- [x] 2.3 Add minimal overrides/slots for header/stepper/actions/field renderer
- [x] 2.4 Ensure tokens (`--rivu-*`) cover all visible styling

## 3. Server SDKs (processors)

- [x] 3.1 Python: add a built-in wizard processor producing patch ops + revision increment
- [x] 3.2 Rust: add a built-in wizard processor producing patch ops + revision increment
- [x] 3.3 Add unit tests for idempotency + revision conflicts in both SDKs

## 4. Examples + docs

- [x] 4.1 Update `examples/rivu-react-demo` fixtures to include a Wizard component entry + mounts
- [x] 4.2 Extend demo mock server to process wizard events and emit `STATE_DELTA` updates
- [x] 4.3 Add docs: wizard contract, recommended audit fields, and “server executes tools” boundary guidance

## 5. Verification

- [x] 5.1 Run repo typecheck/build and ensure demo typechecks (`pnpm test`, `pnpm -C examples/rivu-react-demo typecheck`)
- [x] 5.2 Run Python + Rust unit tests for new processors (`uv run pytest`, `cargo test`)
