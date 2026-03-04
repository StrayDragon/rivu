set shell := ["bash", "-euo", "pipefail", "-c"]

# Show available commands
_default:
  @just --list

# --- Setup ---

# Install deps + sync generated agent skills
setup: install skills-sync

install:
  pnpm install

skills-sync:
  pnpm agent-skills:sync

# --- Examples ---

# One-click dev servers
examples-demo:
  pnpm -C examples/rivu-react-demo dev

examples-mui:
  pnpm -C examples/rivu-react-mui-demo dev

examples-shadcn:
  pnpm -C examples/rivu-react-shadcn-demo dev

# Friendly aliases (match README)
demo: examples-demo
mui: examples-mui
shadcn: examples-shadcn

# Parametric example commands (pass the folder name under examples/)
ex-dev example="rivu-react-demo":
  pnpm -C examples/{{example}} dev

ex-build example="rivu-react-demo":
  pnpm -C examples/{{example}} build

ex-typecheck example="rivu-react-demo":
  pnpm -C examples/{{example}} typecheck

ex-preview example="rivu-react-demo":
  pnpm -C examples/{{example}} preview

ex-typecheck-all:
  pnpm -C examples/rivu-react-demo typecheck
  pnpm -C examples/rivu-react-mui-demo typecheck
  pnpm -C examples/rivu-react-shadcn-demo typecheck

ex-build-all:
  pnpm -C examples/rivu-react-demo build
  pnpm -C examples/rivu-react-mui-demo build
  pnpm -C examples/rivu-react-shadcn-demo build

# --- Repo checks ---

typecheck:
  pnpm typecheck

build:
  pnpm build

test:
  pnpm test

# --- Language-specific tests ---

cargo-test:
  cargo test

py-test:
  cd python && uv run pytest
