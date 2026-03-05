# tool-cards Specification

## Purpose
TBD - created by archiving change ui-thread-toolkit-v1. Update Purpose after archive.

## Requirements
### Requirement: ToolCallCard renders tool-call state from the kernel

The system MUST provide a `ToolCallCard` UI primitive that renders a single tool call using `rivu-kernel` state.

At minimum, the card MUST be able to display:
- tool name
- tool args (streaming or final)
- tool call status (`streaming|done`)

#### Scenario: Streaming tool args are visible
- **WHEN** the kernel state contains a tool call with `status="streaming"` and incremental args
- **THEN** `ToolCallCard` renders the tool name and the current args buffer

### Requirement: ToolResultCard renders tool result content linked to a tool call

The system MUST provide a `ToolResultCard` UI primitive that renders the result of a tool call.

The primitive MUST be able to resolve the result message using kernel state (e.g. by `toolCallId -> resultMessageId`) and render the result content in a viewer-safe way.

#### Scenario: Missing result degrades gracefully
- **WHEN** a tool call exists but does not yet have an attached result message id
- **THEN** `ToolResultCard` renders a stable “no result yet” state without throwing

### Requirement: ToolCards are themable and override-friendly

`ToolCallCard` and `ToolResultCard` MUST:
- use Rivu theme tokens (`--rivu-*`) with fallbacks
- accept `className` overrides (and SHOULD accept `style` overrides or a framework-equivalent mechanism)
- provide at least one slots/overrides entry-point for hosts to customize key sub-areas (header/body/actions)

#### Scenario: Host overrides tokens and className
- **WHEN** a host overrides `--rivu-bg/--rivu-border` tokens and passes a custom `className`
- **THEN** ToolCards render using the overridden tokens and apply the additional className

### Requirement: ToolCards do not execute tools

ToolCards MUST be display-only primitives:
- they MUST NOT execute side-effecting tools in the browser
- they MAY render user interactions that dispatch `ui.v1.event`, but tool execution remains server-side

#### Scenario: No client-side tool execution
- **WHEN** a user views a `ToolCallCard` and `ToolResultCard`
- **THEN** the browser does not execute any tool side effects as part of rendering

