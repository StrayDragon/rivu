## ADDED Requirements

### Requirement: Rust SDK provides a built-in FileUploadCard event processor

The Rust SDK MUST provide a built-in `FileUploadCard` processor that:
- validates `eventName/payload` for `file.add/file.remove/file.submit`
- enforces idempotency using `clientRequestId`
- enforces optimistic concurrency using `baseRevision` vs component `revision`
- outputs JSON Patch ops targeting `/ui/components/<componentId>/state` and `/ui/components/<componentId>/revision`

#### Scenario: Processor removes a file ref by id
- **WHEN** the SDK processes a valid `file.remove` event with a matching `baseRevision`
- **THEN** it outputs patch ops that remove the referenced file from `state.files` and increment `revision`
