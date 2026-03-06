# spec-governance Specification

## Purpose
TBD - created by archiving change retire-prd-md. Update Purpose after archive.
## Requirements
### Requirement: OpenSpec changes/specs are the single source of truth

The repository MUST treat OpenSpec as the single source of truth for requirements and implementation planning:
- requirements live in `openspec/specs/*`
- executable work lives in `openspec/changes/*` (proposal/design/specs/tasks)

#### Scenario: New work is proposed via a change
- **WHEN** a new feature is requested
- **THEN** it is captured as an OpenSpec change (proposal/design/specs/tasks) rather than appended to a standalone PRD document

### Requirement: Legacy PRD document is removed to prevent drift

The repository MUST NOT keep a root-level PRD document as an authoritative requirements source once OpenSpec-first governance is adopted.

#### Scenario: No duplicate authoritative PRD exists
- **WHEN** a reader looks for the authoritative product definition
- **THEN** they are directed to OpenSpec changes/specs and do not find a competing root `PRD.md`

### Requirement: A PRD-to-OpenSpec index exists during the transition

During the transition, the repository MUST provide an index mapping legacy PRD sections to the corresponding OpenSpec specs/changes, so readers can locate the new authoritative artifacts.

#### Scenario: Reader can locate a migrated section
- **WHEN** a reader searches for a legacy PRD topic (e.g. “thread UI kit”)
- **THEN** the index points them to the relevant OpenSpec change/spec entries

