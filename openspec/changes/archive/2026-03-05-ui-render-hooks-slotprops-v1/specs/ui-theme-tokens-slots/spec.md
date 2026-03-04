## ADDED Requirements

### Requirement: Theme tokens include typography and spacing primitives

The UI kit token set MUST include minimal typography and spacing primitives so hosts can align Rivu components with their design system without forking.

At minimum, the token set MUST include:
- a base font-family token
- at least two font-size tokens (e.g. `sm` and `base`)
- at least three spacing tokens usable for padding/gaps

#### Scenario: Host maps design-system typography tokens
- **WHEN** a host maps its own typography/spacing tokens into `--rivu-*`
- **THEN** Rivu components pick up the host typography/spacing without code changes

### Requirement: Complex components support `slotProps` injection

Complex components that already support `slots` MUST also support a `slotProps` mechanism (or framework-equivalent) to inject props/styling into default sub-areas without replacing the entire slot renderer.

At minimum, `DataTable` and workflow cards MUST expose `slotProps` for their key sub-areas (table/cells/actions/buttons/fields).

#### Scenario: Host injects className into default actions area
- **WHEN** a host provides `slotProps` for a workflow card actions area
- **THEN** the default actions renderer applies the injected props while preserving server-authoritative behavior

