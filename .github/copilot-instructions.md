## Purpose

This file gives concise, codebase-specific guidance for automated coding agents working on this repo.
Reference the concrete files and commands below rather than offering general advice.

## Big picture (what to know quickly)

- Monorepo-style layout: top-level folders `frontend/` and `backend/`.
- The only implemented app today is the React single-page app in `frontend/` (Create React App).
- `backend/` exists but is empty (no server code found). Expect API/server work to be added there.

Key paths to inspect when starting work:
- `frontend/package.json` — scripts and dependencies (React 19, `react-scripts`)
- `frontend/src/index.js` — app entry; renders `App` into the element with id 'root'
- `frontend/src/App.js` — main UI component scaffold; good example for component/CSS placement
- `frontend/README.md` — standard CRA instructions (npm start/test/build)

## How to run & test (concrete commands)

- Development (frontend):
  - cd frontend
  - npm install
  - npm start  # opens on http://localhost:3000 by default

- Run tests (frontend):
  - cd frontend
  - npm test

- Build production bundle (frontend):
  - cd frontend
  - npm run build  # outputs `frontend/build/`

Note: This project uses Create React App (`react-scripts`). Do NOT `eject` unless explicitly requested.

## Project-specific conventions & patterns

- UI lives under `frontend/src/`. Small example components and tests are alongside `App.js` and `App.test.js`.
- Static assets are in `frontend/public/` and `frontend/src` (e.g., `logo.svg`).
- Styling is basic CSS files imported into components (see `App.css`, `index.css`).
- Linting is the CRA default (`eslintConfig` in `frontend/package.json`).

## Integration points & external deps

- External dependencies are declared in `frontend/package.json` (React, react-dom, react-scripts, testing libs).
- There is currently no backend service running in this repo. If you add an API server, put it under `backend/` and document its start/script commands in `backend/README.md`.

## What agents should do first when making changes

1. Inspect `frontend/package.json` and `frontend/README.md` to learn scripts and dev flow.
2. Run `npm install` and `npm start` locally to verify the app boots on :3000 before editing runtime code.
3. Keep edits scoped to `frontend/src/` for UI work; add new components under `frontend/src/components/` if needed.
4. Update or add tests next to components (follow existing `App.test.js` pattern) and run `npm test`.

## Examples to cite in commits/PRs

- "Add `src/components/MyWidget.js` and unit test `MyWidget.test.js`; updated `App.js` to import it. Verified `npm start` boots and `npm test` passes."

## Known gaps and cautions

- `backend/` is empty — do not assume any API endpoints exist. Any work that requires server-side endpoints must create and document them.
- This repo uses CRA defaults; avoid changing build infra (webpack/babel) unless adding a clear migration plan.

## Merge guidance for existing agent docs

If a previous `.github/copilot-instructions.md` exists, preserve any repository-specific examples and replace outdated run commands with the `frontend/` scripts shown above.

## If anything is unclear

Tell me what additional details you want: e.g., a preferred backend stack, CI commands, or example API contracts to include.
