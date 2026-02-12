# Literal Hunter – 4 Sub-Agents

Run **4 agents in parallel**, each in its own Cursor/Codex session. Copy the contents of `LITERAL_HUNTER_AGENT_1.md` … `LITERAL_HUNTER_AGENT_4.md` into a new chat and run.

**Order (optional):** Agent 1 creates new constant modules; Agents 2–4 can start in parallel and will consume those constants (merge Agent 1 first if you want zero follow-up).

| Agent | Focus | Todo IDs | Main files |
|-------|--------|----------|------------|
| **1** | Constants + env/platform/keyboard/boolean | lit-1, lit-2, lit-3, lit-17, lit-23, lit-26 | constants/*, 5 env files, 2 platform files, Sidebar, ui-symbols, update-check, universal-loader, cli-output-parser |
| **2** | UI literal replacements | lit-6, lit-7, lit-11, lit-18, lit-21, lit-22, lit-25, lit-28, lit-29 | ui/components/*, ui/hooks/*, ui/theme/* |
| **3** | Core / providers / tools literal replacements | lit-4, lit-5, lit-8, lit-9, lit-10, lit-12, lit-13, lit-14, lit-15, lit-16, lit-19, lit-20, lit-24 | core/*, tools/*, store/*, server/* |
| **4** | Magic numbers, config, CI & lock-in | lit-27, lit-30–lit-41 | config/*, scripts/*, and all files with magic numbers |

**Handoff:** After all 4 finish, run `bun run lint && bun run typecheck && bun run test && bun run build` and fix any merge/conflict issues.
