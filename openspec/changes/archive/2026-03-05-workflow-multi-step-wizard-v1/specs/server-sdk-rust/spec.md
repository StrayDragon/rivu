## ADDED Requirements

### Requirement: Rust SDK provides a built-in MultiStepWizard event processor

The Rust SDK MUST provide a built-in `MultiStepWizard` processor that:
- validates `eventName/payload` for `wizard.setField/next/prev/submit/reset`
- enforces idempotency using `clientRequestId`
- enforces optimistic concurrency using `baseRevision` vs component `revision`
- outputs JSON Patch ops targeting `/ui/components/<componentId>/state` and `/ui/components/<componentId>/revision`

#### Scenario: Processor outputs patch ops for next step
- **WHEN** the SDK processes a valid `wizard.next` event with a matching `baseRevision`
- **THEN** it outputs patch ops that update `state.currentStepId` (or an equivalent pointer) and increment `revision`
