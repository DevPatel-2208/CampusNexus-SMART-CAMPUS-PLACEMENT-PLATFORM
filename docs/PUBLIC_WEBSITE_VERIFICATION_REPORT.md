# CareerConnect Public Website — Verification Report

**Date:** 2026-10-18
**Scope:** Public routes `/`, `/jobs`, `/jobs/:id`, `/companies`, `/about`, `/contact` (redesign delivered per `docs/PUBLIC_WEBSITE_UI_AUDIT.md`).
**Environment:** Frontend `http://localhost:5173` (vite), backend `http://localhost:5000` (node --watch), seeded data (14 open jobs, 8 companies, 12 students).

## 1. Automated UI verification (headless browser)

Full-page captures of every route at desktop **1440×900** and mobile **375×812**, with scripted scroll-through so every `.cc-reveal` element intersects the viewport.

| Route | Desktop overflow | Mobile overflow | Hidden reveals (desktop) | Hidden reveals (mobile) |
|---|---|---|---|---|
| `/` | None | None | 0 / 32 | 0 / 32 |
| `/jobs` | None | None | 0 / 12 | 0 / 12 |
| `/companies` | None | None | 0 / 13 | 0 / 13 |
| `/about` | None | None | 0 / 23 | 0 / 23 |
| `/contact` | None | None | 0 / 8 | 0 / 8 |
| `/jobs/:id` | None | None | n/a (no reveals) | n/a |

> Before the redesign the same probe measured **422 / 485 / 385 / 460 px** of horizontal overflow on several mobile routes; it is now **0 px everywhere**.

One repeatable capture-timing artifact: on fast *programmatic* scrolling, 1–2 late-mounted Home sections (testimonials) can still be at `opacity < 1` when the screenshot is taken. A second, human-speed scroll pass reveals them (`afterSecondPass: 0` hidden) — IntersectionObserver behaviour is correct; no user-facing issue.

Screenshots: `docs/shots/after/{desktop,mobile}-{home,jobs,companies,about,contact,jobdetail,login}.png`; QA shots in `docs/shots/qa/` (dark mode, mobile filter panel open, mobile drawer, scrolled header, API-failure state).

## 2. Functional QA (scripted browser interactions)

| Check | Result |
|---|---|
| Jobs default order (newest) | First card = "Data Analyst - Operations" ✓ |
| Jobs sort by deadline (soonest) | First card = "Full Stack Developer (MERN)" — matches seed (`deadline = today + 20d`, soonest) ✓ |
| Pagination | "12 of 14 jobs" → Next → "Page 2 of 2", "2 of 14 jobs · page 2" ✓ |
| Clear Filters | Resets sort to default ("") ✓ |
| Debounced search (300 ms) | "Cloud" → 2 of 2; nonsense query → "No Opportunities Found" ✓ |
| Search by **company name** (backend) | `?search=CloudNest` → 2 of 2, including "DevOps Trainee" (title has no "Cloud") — proves company-name `$or` works ✓ |
| Mobile filter panel | Collapsed height 0 → expands to 152 px, 3 fields; chevron rotates; `aria-expanded` toggles ✓ |
| Mobile drawer | Opens with backdrop; `body { overflow: hidden }`; burger label flips to "Close menu"; closes and restores scroll ✓ |
| Header scroll state | `header.cc-public-header` gains `is-scrolled` + shadow after 400 px ✓ |
| Contact inline validation | Empty submit → 4 × `invalid-feedback` + summary alert ✓ |
| Contact submit (happy path) | "Your message has been sent successfully…" + SweetAlert2 dialog (dismissed) ✓ |
| Dark mode | `data-theme="dark"`, body bg `rgb(10,17,32)`; all pages render; 0 overflow ✓ |
| Stats failure resilience | With `stats`/`jobs`/`companies` requests aborted: stats show `—` (never "0+"), Home shows "Unable to load featured jobs" / "Unable to load companies" with working Retry ✓ |
| Stats success path | Highlights/bands show `14+ / 8+ / 12+` from live `/jobs/stats` ✓ |

## 3. Code quality gates

| Gate | Result |
|---|---|
| `npm run lint` (frontend) | Clean, 0 errors 0 warnings |
| `npm run build` (frontend) | Built in ~24 s; only the pre-existing >500 kB chunk warning (non-blocking) |
| `npm test` (backend) | **9 suites, 32 tests, all passing** (covers `paginate()` change in `helpers.js` and job controller) |

## 4. Console / network notes

- The only console errors on public routes are **`401 /api/v1/auth/refresh`** for logged-out visitors — expected token-probe noise, pre-existing, not introduced by this work.
- Backend global rate limit is **200 requests / 15 min per IP** (`app.js`). Heavy automated capture runs can exhaust it (HTTP 429) and momentarily blank stats/featured sections; restarting the dev backend resets the in-memory counter. Real usage is unaffected. This also motivated the stats `—` fallback (§2) so a throttled API never renders misleading "0+" numbers.

## 5. Changes verified in this pass

- `frontend/src/styles/public.css` — desktop filter-row `display: contents` fix (`.cc-filter-extra-in` no longer stacks in one grid cell), industry-badge alignment, steps grid, highlights last-tile span, hero chips, results bar, empty/refreshing states.
- `frontend/src/pages/public.jsx` — Jobs/Companies rewrite (debounce, keepPrevious, results bar, mobile filter toggle), ContactForm validation, Home error branches, stats fallbacks (`?? '—'` / null-safe `plus`).
- `frontend/src/pages/shared.jsx` — job details back link, posted date, open/closed badge, required-skills section.
- `frontend/src/components/public/Header.jsx` — scroll state + drawer body-scroll lock.
- `frontend/src/hooks/useUnread.js` — `useFetch` `keepPrevious`/`refreshing`, `useDebounced`.
- `backend/src/utils/helpers.js` — `paginate()` honours `page`/`limit`.
- `backend/src/controllers/job.controller.js` — search matches company names.

## 6. Residual / accepted notes (not defects)

1. `auth/refresh` 401s for guests (pre-existing pattern).
2. Vite chunk-size warning on the main bundle (pre-existing; code-splitting is out of scope).
3. Full-page screenshots show the fixed header at the scroll offset (Playwright artifact, not duplicated DOM).
4. Stats fetch has no independent retry trigger; after a transient failure the page shows `—` until reload (honest degradation by design).
5. Seed deadlines are relative to seed time (`at(20 + i*3)`); absolute dates in screenshots reflect the seed date.
