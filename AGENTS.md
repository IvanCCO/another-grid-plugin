# AGENTS.md

## Project Context
This project is a browser extension for overlaying configurable grid systems on any webpage.

**Project language:** English. Use English for UI copy, labels, comments, commit messages, documentation, and agent responses unless the user explicitly asks for another language.

The conceptual reference for the product is **_Grid Systems in Graphic Design_ by Josef Muller-Brockmann**. Decisions about spacing, proportion, rhythm, alignment, and visual restraint should stay grounded in that tradition:

- clarity over decoration
- structure over novelty
- consistency over arbitrary variation
- visual rhythm through spacing and alignment
- strong hierarchy with minimal visual noise

## Design Source Of Truth
Always use [DESIGN.md](./DESIGN.md) as the primary design reference before changing UI, visual styling, layout, color, spacing, or interaction details.

If a new UI change conflicts with the current implementation, prefer aligning the code with `DESIGN.md` unless the user explicitly asks to evolve the design system. If the design evolves materially, update `DESIGN.md` as part of the same work.

Colors that are no longer used in the implementation must be removed from `DESIGN.md`. The document should describe the active palette only, not historical or abandoned tokens.

## UI And Motion Rules
For animation, interaction polish, hover behavior, micro-interactions, and visual refinement, always use the `emil-design-eng` skill as the default reference.

Apply these principles consistently:

- keep animations short and purposeful
- prefer `transform` and `opacity`
- avoid decorative motion that slows repeated interactions
- use motion to clarify state, not to show off
- preserve calm, precise, tool-like behavior

## Extension Development Rules
When implementing extension behavior, architecture, permissions, manifest changes, content scripts, popup behavior, messaging, storage, or browser APIs, always use the `chrome-extension-development` skill as the default reference.

Assume this project should be built like a production-quality browser extension:

- secure by default
- minimal permissions
- clear separation between popup, background, and content responsibilities
- predictable messaging and persistence
- compatibility with Manifest V3 patterns

## Minimal Implementation
On any coding task — writing, refactoring, fixing, reviewing, or choosing dependencies — always use the [`ponytail`](./.agents/skills/ponytail/SKILL.md) skill as the default approach.

Reach for the shortest working solution: question whether work is needed at all (YAGNI), reuse what already exists in the codebase, prefer stdlib and native platform features over new dependencies, and keep diffs as small as the problem allows.

## Working Style
Before coding, identify the leanest and clearest solution.

Prefer:

- concise code
- shared abstractions over duplication
- small pure functions
- extending existing patterns instead of inventing parallel systems

Avoid:

- unnecessary `useEffect`-style reactive complexity
- adding new colors or design tokens when existing ones already solve the problem
- ad hoc UI that drifts from the project’s established system

## Practical Default
When working on this repository:

1. use `ponytail` for any coding task — simplest solution that actually works
2. read `DESIGN.md` first for any UI-facing change
3. use `emil-design-eng` for animation and polish decisions
4. use `chrome-extension-development` for extension architecture and implementation decisions
5. preserve the Muller-Brockmann-inspired grid logic: disciplined, rational, minimal
