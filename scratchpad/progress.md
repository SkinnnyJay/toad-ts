# Scratchpad Progress

## Current Focus
- All milestones M0-M11 complete
- Quality gates: typecheck, lint, build, test all passing

## Status
- [X] M0: Foundation Fix (bun, deps, sqlite, test harness)
- [X] M1: Test Verification (85+ tests pass)
- [X] M2: Slash Commands (40+ commands, /add-dir /permissions /status /login /config /init /review /security-review)
- [X] M3: Checkpointing (cleanupOldCheckpoints, retention, git stash/apply)
- [X] M4: Configuration (expanded schema: compaction, permissions, themes, providers, compatibility, formatters, instructions)
- [X] M5: Context Management (ContextManager, token counting, auto-compaction, pruneToolOutputs)
- [X] M6: Session Management (forking, diff tracking, retention policy, findByNameOrId)
- [X] M7: Provider Expansion (AnthropicProvider, OpenAIProvider, OllamaProvider, ProviderRegistry)
- [X] M8: Cross-Tool Compatibility (universal loaders: skills, commands, agents, Cursor .mdc rules)
- [X] M9: Server Mode & CLI (subcommands: run/serve/models/auth/version, headless -p mode)
- [X] M10: Advanced Features (code formatter, model variant cycling, PR status)
- [X] M11: Distribution (CI workflow for Bun, npm publish workflow)

## Deferred Items (Future PRs)
- [ ] SVG export of conversations
- [ ] LSP integration
- [ ] Plugin system
- [ ] Prompt suggestions
- [ ] Image paste
- [ ] Workspace management
- [ ] Block navigation (TOAD-style)
- [ ] Additional provider adapters (Azure, Bedrock, Vertex, Mistral, Groq, OpenRouter)
- [ ] Custom tool files (.ts)
- [ ] OpenAPI 3.1 spec generation
- [ ] Full REST endpoints
- [ ] README overhaul
- [ ] CONTRIBUTING.md
