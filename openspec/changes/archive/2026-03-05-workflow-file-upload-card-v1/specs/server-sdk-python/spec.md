## ADDED Requirements

### Requirement: Python SDK provides a built-in FileUploadCard event processor

The Python SDK MUST provide a built-in `FileUploadCard` processor that:
- validates `eventName/payload` for `file.add/file.remove/file.submit`
- enforces idempotency using `clientRequestId`
- enforces optimistic concurrency using `baseRevision` vs component `revision`
- outputs JSON Patch ops targeting `/ui/components/<componentId>/state` and `/ui/components/<componentId>/revision`

#### Scenario: Processor appends a file ref
- **WHEN** the SDK processes a valid `file.add` event with a matching `baseRevision`
- **THEN** it outputs patch ops that append the file ref into `state.files` and increment `revision`
