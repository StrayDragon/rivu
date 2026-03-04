## 1. Spec + vectors (`rivu-ui-spec`)

- [ ] 1.1 Add `UploadedFileRef` schema in `packages/rivu-ui-spec`
- [ ] 1.2 Add `FileUploadCard@1` props schema in `packages/rivu-ui-spec`
- [ ] 1.3 Add `FileUploadCard@1` state schema in `packages/rivu-ui-spec`
- [ ] 1.4 Add golden vectors (valid + invalid) for props/state and `ui.v1.event` payloads
- [ ] 1.5 Regenerate `json-schema.generated.ts` and keep build green

## 2. React UI kit (`rivu-react`)

- [ ] 2.1 Implement `FileUploadCard` UI (file picker + viewer-safe list + local upload progress)
- [ ] 2.2 Provide `fileUploadCardRegistrationV1({ uploadFile })` factory and export it
- [ ] 2.3 Ensure tokens (`--rivu-*`) cover all visible styling; add minimal overrides/slots for list/actions

## 3. Server SDKs (processors)

- [ ] 3.1 Python: add a built-in FileUploadCard processor producing patch ops + revision increment
- [ ] 3.2 Rust: add a built-in FileUploadCard processor producing patch ops + revision increment
- [ ] 3.3 Add unit tests for idempotency + revision conflicts in both SDKs

## 4. Examples + docs

- [ ] 4.1 Add demo fixtures mounting `FileUploadCard`
- [ ] 4.2 Implement a demo `uploadFile` hook (mock upload + returns fake refs) and wire it into registration
- [ ] 4.3 Extend demo mock server to process file events and emit `STATE_DELTA`
- [ ] 4.4 Add docs: upload boundary, security notes (URL sanitizer), and audit guidance

## 5. Verification

- [ ] 5.1 Run repo typecheck/build and ensure demo typechecks (`pnpm test`, `pnpm -C examples/rivu-react-demo typecheck`)
- [ ] 5.2 Run Python + Rust unit tests for new processors (`uv run pytest`, `cargo test`)
