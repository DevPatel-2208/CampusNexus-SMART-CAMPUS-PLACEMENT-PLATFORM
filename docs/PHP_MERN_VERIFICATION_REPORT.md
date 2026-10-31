# PHP → MERN Verification Report

Living document. Updated as fixes land. Verification is **source/build-based** because the PHP runtime and MySQL are unavailable in this environment (see Audit §0). Visual screenshot comparison is **BLOCKED** and documented as such.

## Environment
- PHP app `http://localhost/careerconnect_new/` — **unreachable** (Apache down).
- MySQL `localhost:3306` — **not listening**.
- Node v24.19.0 / npm 11.17.0 — available.
- MERN frontend build tool: Vite. Backend: Express + Jest tests (`backend/tests`).

## Verification method used per change
1. Source read of PHP page + MERN component before editing.
2. Implement minimal, targeted change preserving API contracts.
3. `npm run build` (frontend) and `npm test` / lint (backend) where applicable.
4. Manual code trace of data flow (endpoint → model → render).
5. Responsive/dark-mode reviewed via CSS token usage and breakpoint rules.

## Status legend
- PASS — implemented and build/lint verified.
- PARTIAL — implemented for main path, edge cases pending.
- BLOCKED — cannot verify (env/service/credentials).
- TODO — not started.

## Change log
| Date | Item | Files | Verification |
|---|---|---|---|
| 2026-10-17 | Initial audit produced | `docs/PHP_MERN_PAGE_PARITY_AUDIT.md` | Source read; live render BLOCKED |
| 2026-10-17 | P0-1/P0-2 mass-assignment hardening | `company.controller.js`, `helpers.js` | Controller load OK |
| 2026-10-17 | P0-3 Shortlist/Under Review actions | `company1.jsx` | Build PASS |
| 2026-10-17 | P0-4 assessment create form + P1-24 edit question | `company2.jsx` | Build + lint PASS |
| 2026-10-17 | P0-5 admin application detail | `admin.jsx`, `App.jsx`, `application.controller.js` | Build + lint PASS; controller load OK |
| 2026-10-17 | P0-6 TPO drive dropdowns + fields | `tpo2.jsx` | Build + lint PASS |
| 2026-10-17 | P0-7 drive eligibility consistency (enforce; no dead button) | `eligibility.service.js`, `drive.controller.js`, `student2.jsx`, `tests/eligibility.test.js` | Build + lint PASS; service/controller load OK |
| 2026-10-17 | P0-8 placement status rebuild | `student3.jsx` | Build + lint PASS |
| 2026-10-17 | P0-9 recorded as consolidated (3-step forgot flow) | `auth.jsx` | Source read |

## Consistency principle (standing)
Per project directive: every button, form, validation message, status and workflow must reflect what the backend actually permits. No contradictory UI, dead confirmations, or misleading errors. Applied to drive registration (P0-7); to be applied to each remaining P1 item as it lands.

## Remaining blockers
- PHP/MySQL offline → no rendered visual diff, no live data assertions.
- Google OAuth, SMTP, and Groq AI key not available → OAuth/email/AI paths BLOCKED for runtime test.
- Backend Jest suite BLOCKED: `mongodb-memory-server` cannot start mongod (env issue, pre-existing).
