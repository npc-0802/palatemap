# Deployment And Domain Runbook

## Current State (as found locally)
- Hosting artifact path: `docs/` (GitHub Pages style)
- Build script: `vite build && echo palatemap.com > dist/CNAME`
- Existing `docs/CNAME`: `palatemap.com`
- Vite base: `/` in `vite.config.js`
- Git remote currently points to: `https://github.com/npc-0802/palatemap.git`

## Canonical Decisions
1. Canonical repo: `npc-0802/palatemap`
2. Canonical host: GitHub Pages
3. Deploy trigger: manual build and publish via `/docs` output

Remaining action: update local git remote from `ledger` to `palatemap`.

## Safe Deployment Checklist
1. `npm run build`
2. Verify `dist/index.html` loads assets correctly.
3. Ensure `dist/CNAME` contains exactly `palatemap.com`.
4. If using GitHub Pages from `/docs`:
   - replace `docs/` with fresh build output
   - commit and push to publishing branch
5. Confirm HTTPS cert is valid and page resolves on:
   - `https://palatemap.com`
   - `https://www.palatemap.com` (if used)

## DNS Baseline (Provider-Agnostic)
At DNS provider for `palatemap.com`:
- Apex/root (`@`): records required by hosting provider
- `www`: CNAME to host target (or redirect to apex)

Keep DNS TTL moderate (e.g., 300s) during migration windows.

## GitHub Pages Pattern (selected)
- Repo settings -> Pages
- Source: branch/path that serves `docs/`
- Custom domain: `palatemap.com`
- Enforce HTTPS on
- Keep `CNAME` file in published output

## Netlify Pattern (not selected)
- Connect canonical repo
- Build command: `npm run build`
- Publish directory: `dist`
- Domain management in Netlify + DNS provider records
- Configure apex + `www` redirect policy

## Rollback
1. Revert to last known-good deploy commit.
2. Re-publish previous stable artifact.
3. Validate homepage + key app flow.
4. Only then retry migration.

## Security Notes
- Never commit secret keys to repo.
- Anthropic key stays in Worker env vars only.
- Rotate keys immediately if exposure is suspected.
