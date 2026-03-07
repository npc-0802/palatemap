# AGENTS.md

This file is the operating contract for AI collaborators (Codex + Claude) in this repo.

## Project Snapshot
- Product: `Palate Map` (domain: `palatemap.com`, repo: `npc-0802/palatemap`)
- Tagline: "Taste is everything."
- Stack: Vite + vanilla JS modules, Supabase, Claude API via Cloudflare Worker proxy
- Current phase: Phase 2 largely complete; Phase 2.3 (error surfaces) and 2.5/2.6 (rename + Netlify) pending

## Source of Truth
- Product brief: `canon_brief_v3.docx` / `canon_brief_v3.txt`
- Architecture: `docs/architecture.md`
- Deployment + DNS runbook: `docs/deployment-domain.md`
- Task template + handoff protocol: `docs/handoff.md`

If chat instructions conflict with repo docs, follow repo docs and note the conflict in PR/commit notes.

## Agent Roles
- Claude: feature ideation, UX language, product narrative, high-level plans.
- Codex: implementation, refactors, bug fixes, test/build validation, deployment-safe changes.

Both agents must:
- Tie work to a concrete task brief.
- Keep edits minimal and scoped.
- Update docs when architecture/workflow/deploy assumptions change.

## Non-Negotiables
- Never expose or hardcode secrets.
- Never paste API keys/tokens in commits, issue comments, or prompts.
- Keep Anthropic secret in Cloudflare Worker env only.
- Treat Supabase keys as sensitive config even if publishable.

## Code Standards
- Keep vanilla modular structure under `src/modules`, `src/data`, `src/styles`.
- Prefer small pure functions and explicit data flow.
- Avoid global mutable state outside `src/state.js`.
- For UI changes, preserve the existing visual language from the brief.
- Add lightweight comments only where behavior is non-obvious.

## Definition of Done (Per Task)
1. Acceptance criteria in task brief are met.
2. `npm run build` succeeds.
3. No obvious runtime regressions in touched flows.
4. Docs updated if behavior, architecture, or deploy process changed.
5. Commit message explains user-visible change and risk area.

## Standard Commands
- Install deps: `npm install`
- Dev server: `npm run dev`
- Production build: `npm run build`
- Preview build: `npm run preview`

## Branch + PR Discipline
- One task per branch, one focused PR.
- Branch names:
  - `codex/<short-task-name>`
  - `claude/<short-task-name>`
- PR body should include: objective, files touched, risks, validation steps, screenshots (if UI).

## Session Workflow
1. Read `AGENTS.md` + relevant docs in `docs/`.
2. Restate task with explicit acceptance criteria.
3. Implement smallest viable diff.
4. Validate (`npm run build` at minimum).
5. Summarize changes and next steps.

## Canonical Repo + Host
- Repo: `npc-0802/palatemap` (private). Push to `main` = live.
- Host: GitHub Pages, custom domain `palatemap.com`. Netlify migration pending (Phase 2.6).
- Build output goes to `/docs`. CNAME auto-written by build script.
