## ADDED Requirements

### Requirement: React adapter is optional and Provider-free by default
`rivu-react` MUST allow consumers to use the kernel without a required React Context Provider.

If a Provider is offered, it MUST be optional sugar and MUST NOT be required by core components.

#### Scenario: Use ComponentRenderer without Provider
- **WHEN** a React app creates a kernel instance and passes it directly into a Rivu renderer component
- **THEN** the renderer works without requiring a Provider

### Requirement: React adapter uses external-store subscription semantics
`rivu-react` MUST use React’s external-store subscription mechanism (e.g., `useSyncExternalStore`) to subscribe to kernel state.

#### Scenario: UI re-renders on kernel updates
- **WHEN** a server envelope is applied via `kernel.dispatch(...)`
- **THEN** React components consuming kernel state re-render consistently without tearing

### Requirement: Svelte adapter exposes a readable store
`rivu-svelte` MUST expose a Svelte `readable` store (or equivalent) that reflects kernel state updates.

#### Scenario: Svelte subscribers receive updates
- **WHEN** a Svelte component subscribes to the Rivu store
- **THEN** it receives updates after each applied envelope

### Requirement: Adapters provide a registry and a component renderer primitive
Both adapters MUST provide a registry mechanism mapping `componentType` to renderer implementations.

Adapters MUST provide a `ComponentRenderer` primitive that can:
- lookup `componentId` in `state.ui`
- validate component props/state using registered schemas
- render a known component, or fall back to an `UnknownComponent` renderer

#### Scenario: Unknown component degrades without crashing
- **WHEN** a component type is not registered or schema validation fails
- **THEN** the UI renders an UnknownComponent fallback and the page remains functional

### Requirement: TS packages are ESM-first and tree-shakable
All TypeScript packages produced by Rivu MUST be ESM-first and SHOULD support Vite tree-shaking.

Browser-facing code MUST avoid Node-only APIs.

#### Scenario: Vite can bundle adapters
- **WHEN** a Vite 7 + React 19 project imports `rivu-kernel` and `rivu-react`
- **THEN** the build succeeds without requiring Node polyfills

