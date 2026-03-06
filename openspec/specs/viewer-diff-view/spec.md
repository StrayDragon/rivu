# viewer-diff-view Specification

## Purpose
TBD - created by archiving change viewer-diff-view-v1. Update Purpose after archive.
## Requirements
### Requirement: UI kit ships `DiffView@1` as a Viewer stateless component

The UI kit MUST ship a Viewer-only, stateless `DiffView` component:
- `type = "DiffView"`
- `schemaVersion = 1`

It MUST render deterministically from props and MUST NOT perform network requests.

#### Scenario: Same input renders deterministically
- **WHEN** the same snapshot props are rendered twice
- **THEN** the diff output is stable (same added/removed/unchanged lines and ordering)

### Requirement: DiffView supports `unified` and `split` modes

`DiffView@1` MUST support:
- `mode="unified"` (default)
- `mode="split"`

#### Scenario: Split mode shows before/after side-by-side
- **WHEN** `mode="split"`
- **THEN** the UI renders before/after in two columns (or an equivalent stable split layout)

### Requirement: Oversized inputs degrade safely via truncation

`DiffView@1` props MUST allow specifying truncation limits (`maxChars`, `maxLines`).

If limits are exceeded, implementations MUST truncate deterministically and render a viewer-safe indication that content was truncated; the page and export MUST remain usable.

#### Scenario: Truncation prevents UI blow-ups
- **WHEN** `before/after` exceed the configured limits
- **THEN** the component truncates and renders without crashing

### Requirement: HTML export renders DiffView deterministically and offline

The HTML export pipeline MUST be able to render `DiffView@1` without external network requests.

#### Scenario: Export includes diff content
- **WHEN** a snapshot includes a mounted `DiffView@1`
- **THEN** HTML export succeeds and includes a deterministic diff representation

