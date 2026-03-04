## ADDED Requirements

### Requirement: A host-configurable render hooks contract exists

The system MUST define a Render hooks contract that hosts can provide to control rendering behavior without modifying `sharedState.ui`.

At minimum, the contract MUST support:
- value formatting (numbers/dates/currency or a unified value formatter)
- URL sanitization
- optional markdown rendering
- optional code highlighting
- optional component-props sanitization before render

#### Scenario: Host supplies custom formatting
- **WHEN** a host provides a custom formatter hook
- **THEN** components that render values (e.g. tables/metrics/charts) use the host formatter instead of hard-coded formatting

### Requirement: URL sanitizer is used for all rendered URLs

The system MUST define a `sanitizeUrl(url) -> string|null` hook.

Components MUST use this hook (or an equivalent centralized policy) when rendering any user/model-provided URL, and MUST block URLs that sanitize to `null`.

The default sanitizer MUST deny non-`http(s):` and non-`mailto:` protocols.

#### Scenario: Unsafe URL is blocked
- **WHEN** a component receives a URL with an unsafe protocol (e.g. `javascript:`)
- **THEN** the component renders a blocked/disabled URL state and does not create a clickable unsafe link

### Requirement: Markdown rendering is optional and safe by default

The system MUST allow a host to provide a markdown renderer hook.

When no markdown renderer is provided, the default behavior MUST render content as plain text (no HTML injection).

#### Scenario: No markdown renderer falls back to plain text
- **WHEN** a host does not provide a markdown renderer hook
- **THEN** markdown-like input is rendered as plain text without interpreting HTML

### Requirement: Component props can be sanitized by the host before rendering

The system MUST allow a host to provide a component-props sanitizer hook.

The sanitizer MUST run in the rendering pipeline before a component is rendered, and the component MUST render using the sanitized props.

#### Scenario: Host strips a dangerous field
- **WHEN** a host sanitizer removes or replaces a dangerous prop value (e.g. an unsafe URL)
- **THEN** the rendered component reflects the sanitized value while `sharedState.ui` remains unchanged

