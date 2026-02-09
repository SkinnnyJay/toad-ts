# Code Review

## Overview

Review current changes for quality, correctness, and project conventions. Report findings with clear severity and file:line references.

## Steps

1. **Inspect changes**
   - Run `git diff` to see all changes

2. **Review against criteria**
   - Logic errors, null handling, race conditions
   - No `any` types; no `biome-ignore` or `eslint-disable` without justification
   - Zod schemas for external data validation
   - Constants in `src/constants/` (no magic strings/numbers in control flow)
   - Logger usage (no console.log), Env usage (no process.env)
   - Functions under ~500 lines, files under ~2500 lines

3. **Report findings**
   - Use severity: MUST FIX, SHOULD FIX, SUGGESTION
   - Include file:line references for each finding

## Review Checklist

- [ ] Logic and edge cases reviewed
- [ ] Naming and style match project conventions
- [ ] No inappropriate `any` or disables
- [ ] Constants pattern followed (no magic literals)
- [ ] Size limits (function/file) respected
