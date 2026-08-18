# Contributing to dsh-chat-import

Thanks for considering a contribution! `dsh-chat-import` imports external agent
conversation histories into DeepSeek Harness as full-fidelity, resumable
sessions. The user-facing contract lives in [README.md](README.md) (bilingual),
and the repo's engineering rules — layout, commit discipline, DSH plugin
constraints, quality conventions — live in [AGENTS.md](AGENTS.md).

## Dev setup

- **Node.js >= 22.13** (first release where `node:sqlite` is available without a flag)
- `npm ci` — install dependencies (zero runtime deps; peers auto-installed)
- `npm test` — the `node:test` suite (converter unit + export unit + host mock integration)
- `npm run check:linux` — cross-platform path-discipline guard (enforced in CI)
- `npm run lint` — eslint (flat config)
- `npm run build` — publish-surface self-check (files whitelist + syntax + lockfile version)

## What counts as a change

- **Behavior changes stay honest**: README.md and README.zh-CN.md must stay in
  sync (CI compares heading structure), tests describe the behavior, and any
  file newly referenced by `index.mjs` or the READMEs must join the `files`
  whitelist in `package.json`.
- **Plugin, not engine**: new behavior goes through public dsh host services
  (`sessionPersistence` / `fs` / `tools` / `workspaceRegistry`, optional
  `webServer` / `commands`). Never modify the dsh engine, apiproxy, or official
  UI packages.
- **Imported session logs are append-only and deep-frozen**: never rewrite
  history events; surface events carry `surfaceOp: 'append'`.
- **Fail loudly**: malformed lines and suspected secrets are counted and
  reported, never silently swallowed.

## Commits & PRs

- Conventional commits (`feat:` / `fix:` / `refactor:` / `chore:` / `docs:` /
  `test:`), one logical change per commit; existing history uses Chinese
  descriptions.
- Before pushing: `npm test` + `npm run check:linux` green, working tree clean
  (no `dev/`, `node_modules/` or snapshots staged), `git diff --cached --check`
  clean.
- Fork → `feature/<name>` branch → open a PR (template included). The repo
  pushes straight to `main`; please don't rewrite published history.
- PRs are welcome for new import sources, fidelity upgrades, and the items on
  [ROADMAP.md](ROADMAP.md).

## Security & privacy

Never commit credentials, real user transcripts, or anything under `dev/` (the
local engineering surface, gitignored). In issues and PRs, use **synthetic**
fixtures — no real conversation content.
