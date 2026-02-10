# OpenTUI and Stack

TOADSTOOL uses **OpenTUI** for the terminal UI, **Prisma with SQLite** for persistence, and **Commander** for CLI arguments. This doc summarizes the stack and points to resources for learning and richer experiences.

## Stack

| Layer        | Technology        | Purpose                                      |
| ------------ | ----------------- | -------------------------------------------- |
| **TUI**      | OpenTUI           | Terminal UI (`@opentui/core`, `@opentui/react`) |
| **Persistence** | Prisma + SQLite | Session and message storage                  |
| **CLI**      | Commander         | Commands and flags (`--setup`, `--server`, `--port`, `--host`) |

## Awesome OpenTUI

The [awesome-opentui](https://github.com/msmps/awesome-opentui) list curates resources and apps built with OpenTUI. Use it to explore patterns, components, and ideas for richer TUI experiences.

### Official

- [OpenTUI](https://github.com/sst/opentui) – Main OpenTUI project.
- [create-tui](https://github.com/msmps/create-tui) – Quick start for new OpenTUI apps.
- [OpenCode](https://opencode.ai/) – AI coding agent in the terminal (same stack as TOADSTOOL).

### Libraries

- [opentui-spinner](https://github.com/msmps/opentui-spinner) – Spinner component.
- [opentui-skill](https://github.com/msmps/opentui-skill) – Reference docs for OpenCode (Core, React, Solid).
- [opentui-ui](https://github.com/msmps/opentui-ui) – UI component library on `@opentui/core`.

### Developer tools (ideas / patterns)

- [cftop](https://github.com/NWBY/cftop) – Cloudflare Workers TUI.
- [critique](https://github.com/remorses/critique) – Git change review TUI.
- [opendocker](https://github.com/flat6solutions/opendocker) – Docker containers TUI.
- [red](https://github.com/evertdespiegeleer/red-cli) – Redis TUI.
- [tokscale](https://github.com/junhoyeo/tokscale) – Token usage TUI.
- [restman](https://github.com/cadamsdev/restman) – REST API testing TUI.

### Starters and examples

- [opentui-examples](https://github.com/msmps/opentui-examples) – Example OpenTUI projects.

### Testing and automation

- [pilotty](https://github.com/msmps/pilotty) – CLI for AI agents to automate and control TUI apps (terminal analogue of agent-browser).

## Using these resources

- **UI components and patterns**: Browse [opentui-ui](https://github.com/msmps/opentui-ui) and [opentui-examples](https://github.com/msmps/opentui-examples) for reusable components and layout ideas.
- **Rich experiences**: Study apps like OpenCode, critique, and restman for flows and interactions to adapt.
- **Testing/automation**: Use pilotty and opentui-examples to align with TUI automation and E2E patterns.
