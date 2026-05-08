# CLAUDE.md

@AGENTS.md

## Claude Code
- This file exists so Claude Code loads the `odylith/` contract from the sibling `AGENTS.md`.
- For repo-owned paths outside `odylith/`, follow the repo-root `AGENTS.md` bridge loaded from root `CLAUDE.md` or `.claude/CLAUDE.md`.
- Use the shared Claude project assets under `../.claude/`, including the auto-memory bridge, project commands, rules, hooks, and subagents, but do not skip the repo-local `odylith` launcher or the governed workflow contract.
- First-match help route: if the user says `Odylith, help`, use the CLI help surface and print stdout only. Do not run install, status, intervention, or launcher diagnostics first.
- First-match demo route: if the user says `Odylith, show me what you can do` or asks what Odylith can do for this repo, use the advisory `odylith show` demo. Do not run install, status, intervention, or launcher diagnostics first.
- Capability inventory route: if the user asks to list Odylith capabilities, engines, product architecture, or the capability map, run `odylith capabilities` and print stdout only. Do not infer the taxonomy from `odylith --help`, `odylith show`, Claude Code capability prose, or any host-model surface.
- Claude Code is a first-class Odylith delegation host for this tree. Use the same routed grounding and validation contract as Codex, but execute delegated leaves through Task-tool subagents and the shared `.claude/` project assets.
