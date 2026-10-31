# CareerConnect Public Website UI Audit

**Project:** `D:\DEV\MERN\careerconnect` (MERN frontend + PHP source of truth at `C:\xampp\htdocs\careerconnect_new`)
**Audited:** All publicly accessible routes (no login required). Internal dashboards (Student / Company / TPO / Admin) are out of scope.
**Status:** Audit complete **and redesign implemented + verified** (2026-10-18). See `docs/PUBLIC_WEBSITE_VERIFICATION_REPORT.md` for verification evidence.

## 1. Public Routes Inventory

| Route | React component/file | PHP equivalent | API endpoints used | Auth required |
|---|---|---|---|---|
| `/` | `Home` — `frontend/src/pages/public.jsx` | `index.php` | `GET /jobs?limit=6`, `GET /jobs/companies?limit=6`, `GET /jobs/stats` | No |
| `/about` | `About` — `frontend/src/pages/public.jsx` | `about.php` | `GET /jobs/stats` | No |
| `/contact` | `Contact` / `ContactForm` — `frontend/src/pages/public.jsx` | `contact.php` | `POST /contact` | No |
| `/jobs` | `JobsPublic` / `JobGrid` — `frontend/src/pages/public.jsx` | `jobs.php` | `GET /jobs`, `GET /saved-jobs` (students only) | No (save requires login) |
| `/jobs/:id` | `JobDetails` — `frontend/src/pages/shared.jsx` | `job-details.php` | `GET /jobs/:id`, `GET /jobs/:id/eligibility`, `POST /applications` | No (apply requires login) |
| `/companies` | `CompaniesPublic` — `frontend/src/pages/public.jsx` | `companies.php` | `GET /jobs/companies`, `GET /jobs/stats` | No |
| `/login` | `Login` — `frontend/src/pages/auth.jsx` | `login.php` | `POST /auth/login` | No (public-only) |
| `/register` | `Register` — `frontend/src/pages/auth.jsx` | `register.php` | `POST /auth/register` | No (public-only) |
| `/verify-email` | `VerifyEmail` — `frontend/src/pages/auth.jsx` | `verify_otp.php` | email-verification flow | No |
| `/forgot-password` | `ForgotPassword` — `frontend/src/pages/auth.jsx` | (PHP: reset flow) | password-reset flow | No |
| `/oauth/callback` | `OAuthCallback` — `frontend/src/pages/auth.jsx` | — | OAuth callback | No |
| `*` | `NotFound` — `frontend/src/pages/shared.jsx` | — | — | No |

Shared public components: `PublicHeader` (`frontend/src/components/public/Header.jsx` — framer-motion drawer, scroll state), `PublicFooter` (`frontend/src/components/public/Footer.jsx`), `PageShell`. Shared UI primitives in `frontend/src/components/ui.jsx`. Styles: `tokens.css` → `app.css` → `public.css` (public.css last, restates differing app.css properties). Theme context: `frontend/src/context/ThemeContext.jsx` (`data-theme="dark"`, `localStorage cc-theme`).

Real backend data shapes observed (live API):
- `GET /jobs/stats` → `{ openJobs: 14, companies: 8, students: 12 }`
- `GET /jobs` → `{ data: [{_id, title, description, qualification, experience, salaryMin, salaryMax, location, jobType, workMode, vacancies, deadline, status, approvalStatus, createdAt, company: {_id, companyName, city, logo, verificationStatus}}], pagination }`
- `GET /jobs/:id` → `{ data: { job, skills: [{skill: {skillName, category}, isRequired}] } }`
- `GET /jobs/companies` → `{ data: [{company: {..., verificationStatus}, approvedJobs}], pagination, meta: {industries: [...]}}`
- `POST /applications` → student-only apply; login required for visitors

## 2. Design Problems Found → Resolutions

### Shared header/footer
- **Found:** Bootstrap navbar, no drawer animation/backdrop/scroll lock; no active-page indicator; inconsistent tokens.
- **Resolved:** Custom `PublicHeader` with `is-scrolled` shadow state, framer-motion mobile drawer + backdrop + body scroll lock, active-link indicator, theme toggle (desktop + drawer). `PublicFooter` with brand/platform/students/contact columns, social row, back-to-top.

### Home (`/`)
- **Found:** Hardcoded `"95%"` placement rate mixed with live stats; inline styles; inconsistent card spacing.
- **Resolved:** All stat values come from `GET /jobs/stats` (show `—` on loading/error — never fake numbers). Premium hero, `Reveal` scroll animations, `cc-steps` 4-column process, featured-job semantic cards, `.cc-stat-grid` numbers band, testimonial cards, gradient CTA banner. Sections that fail to load show an error `Empty` state with Retry.

### Jobs (`/jobs`)
- **Found:** Filters crowded on small viewports; misleading work-mode icon; no empty/error distinction; plain pagination.
- **Resolved:** Responsive `cc-pub-filters` grid (single row on desktop via `display: contents`; animated `0fr→1fr` collapsible "Filters" panel on ≤767.98px with `aria-expanded`/`aria-controls`). Debounced search (300 ms) + location, sort (`Newest first` / `Deadline soonest`), results bar with count/clear/updating indicator, `Page X of Y` pager that scrolls to `#jobs-results`. Error state only when the request actually failed (`res.error && !res.data`); empty state when filters match nothing. Job cards show deadline line, correct icons, save-job (students).

### Companies (`/companies`)
- **Found:** Tall hero; Search button triggered `reload()` instead of filtering; no error distinction; duplicated stats.
- **Resolved:** Compact centered hero with real stat chips, debounced search + industry select + Search action, always-visible result count, verified-badge logic preserved (GreenGrid pending → no badge), `cc-co-industry-badge` non-stretching, stats band kept as intentional "why recruit" proof point.

### Job Details (`/jobs/:id`)
- **Found:** No back affordance for guests; skills buried; narrow fixed container; no closed-job clarity.
- **Resolved:** "Back to Jobs" pill (guests only), "Open for applications"/"Closed" status badge, posted-date line, "Required Skills" section with badges, responsive info grid. Student view (`/student/jobs/:id`) unchanged in behavior (shared component, `canApply` variant).

### About (`/about`)
- **Found:** Hardcoded 95%; inconsistent cards.
- **Resolved:** Live stats only (`Students`/`Companies`/`Open Jobs` in `cc-stat-grid`), mission/journey/values/timeline content preserved from PHP, uniform `cc-mkt-card` styling.

### Contact (`/contact`)
- **Found:** Alerts only; no inline field validation; no duplicate-submit guard.
- **Resolved:** Per-field validation (`touched`/`fieldError`/`isValid`, Bootstrap `is-invalid` + `invalid-feedback`, `aria-invalid`), summary alert, submitting spinner state, SweetAlert2 success dialog on `POST /contact` success. Info rows are `mailto:`/`tel:` links; compact map card.

### Theme
- **Resolved:** Full light/dark support across all public routes via `data-theme` + tokens; verified visually (dark screenshots) and programmatically.

## 3. Functional Gaps → Resolutions

1. **Mobile navigation** → framer-motion drawer, backdrop, body-scroll lock, focus-safe close button. **Done.**
2. **Filter drawer on `/jobs`** → collapsible animated panel with active-filter count badge. **Done.**
3. **Empty vs error states** → distinct branches everywhere (`res.error && !data` → error + Retry; else empty). **Done.**
4. **Contact notifications** → SweetAlert2 on success (kept Bootstrap alerts for inline submit errors). **Done.**
5. **Hardcoded "95%" placement rate** → removed; all numbers from backend; `—` shown when unavailable. **Done.**
6. **Active nav indicator** → `cc-nav-link-active` + drawer equivalent. **Done.**
7. **Work-mode icon** → appropriate `MapPin`/`Building2`/`Laptop` icons per field. **Done.**

### Backend fixes shipped alongside (parity/robustness)
- `backend/src/utils/helpers.js` — `paginate()` now reads `query.page` / `query.limit` (was ignoring them for every paginated public endpoint).
- `backend/src/controllers/job.controller.js` — job search also matches **company names** (`CompanyProfile` lookup into `$or`), matching PHP behaviour (verified: `search=CloudNest` returns CloudNest jobs, including "DevOps Trainee" whose title lacks "Cloud").

## 4. Verification Status

| Check | Status |
|---|---|
| All public routes identified | Complete |
| API contracts confirmed against live backend | Complete (`/jobs`, `/jobs/stats`, `/jobs/companies`, `/jobs/:id`) |
| Real data shapes recorded | Complete |
| Visual rendering verification | Complete (desktop 1440 + mobile 375 full-page screenshots) |
| Mobile breakpoint verification | Complete (zero horizontal overflow on all routes) |
| Theme switch verification | Complete (dark + light) |
| Lint + build verification | Complete (`eslint` clean, production build OK) |
| Backend test suite | Complete (9 suites / 32 tests passed) |
| Functional QA (filters, sort, pagination, validation, drawer) | Complete |

Details, test evidence and screenshot paths: `docs/PUBLIC_WEBSITE_VERIFICATION_REPORT.md`.
