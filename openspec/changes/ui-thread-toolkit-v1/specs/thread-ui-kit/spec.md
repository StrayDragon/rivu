## ADDED Requirements

### Requirement: Thread UI Kit is optional and Provider-free

The system MUST provide a Thread UI Kit (Layer 2) that is optional to adopt.

Thread UI Kit components MUST work without requiring a global Provider. They MUST accept `kernel` (and where relevant a component registry) explicitly.

#### Scenario: Host renders ThreadView without Provider
- **WHEN** a host creates a kernel instance and a registry
- **THEN** it can render a `ThreadView` by passing `{ kernel, registry }` directly, without wrapping a Provider

### Requirement: ThreadView renders messages in kernel order

The system MUST provide a `ThreadView` (or equivalent top-level component) that renders the message stream using `kernel.state.messageOrder` and `kernel.state.messages`.

Message rendering MUST reflect message roles and streaming status (`streaming|done`) in a stable way.

#### Scenario: Streaming assistant message renders progressively
- **WHEN** the kernel applies `TEXT_MESSAGE_START` + repeated `TEXT_MESSAGE_CHUNK`
- **THEN** the corresponding message bubble updates progressively until `TEXT_MESSAGE_END`

### Requirement: ThreadView supports mounts layout (inline and sidebar)

Thread UI Kit MUST support rendering UI component mounts produced in `sharedState.ui.components[*].mounts` using the standard mount slots `inline|sidebar`.

Thread UI Kit MUST render mounted UI components through the standard renderer primitive (`ComponentRenderer` or equivalent) using the host-provided registry.

#### Scenario: Inline mounts render under the message bubble
- **WHEN** a component is mounted for a given message with `{ slot: "inline" }`
- **THEN** `ThreadView` renders that component under the corresponding message bubble

#### Scenario: Sidebar mounts render in a sidebar region
- **WHEN** a component is mounted for a given message with `{ slot: "sidebar" }`
- **THEN** `ThreadView` renders that component in a sidebar region of the thread layout

### Requirement: ThreadView can render tool calls and results via ToolCards

Thread UI Kit MUST support rendering tool call / tool result information from kernel tool state using ToolCards primitives.

The default mapping MUST be derived from `kernel.state.toolCalls` and any linked tool result messages.

#### Scenario: Tool call and result are visible in thread
- **WHEN** the kernel state includes a tool call and a linked tool result message
- **THEN** `ThreadView` renders a tool call card and a tool result card in a stable, viewer-safe way

### Requirement: RunStatus exposes resync and gap states

Thread UI Kit MUST provide a `RunStatus` (or equivalent) component that can surface kernel resync state:
- `needsResync`
- `resyncReason`
- gap metadata (`expectedSeq` vs `gotSeq`) when available

#### Scenario: Gap state is visible to developers
- **WHEN** the kernel enters a gap state (`seq > lastSeq + 1`)
- **THEN** `RunStatus` can render a readable summary of the gap and the need to resync

### Requirement: Thread UI Kit is themable and override-friendly

Thread UI Kit components MUST:
- use Rivu theme tokens (`--rivu-*`) with fallbacks
- accept `className` overrides (and SHOULD accept `style` overrides)
- expose a small set of slots/overrides entry-points for hosts to replace key sub-areas (message content, header, tool cards area, mounts container)

#### Scenario: Host customizes message rendering via slots
- **WHEN** a host supplies a custom message content renderer via slots/overrides
- **THEN** `ThreadView` uses the host renderer while keeping mounts and tool rendering functional
