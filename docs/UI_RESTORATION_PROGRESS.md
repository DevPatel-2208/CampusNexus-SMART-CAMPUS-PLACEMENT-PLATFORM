# UI Restoration Progress

Goal: restore the original PHP visual identity of `careerconnect_new` in the MERN app
`D:\DEV\MERN\careerconnect` **without changing any functionality or data**.

Approach: the PHP project (`assets/style.css`, `assets/css/*.css`, PHP includes) is the
visual source of truth. MERN CSS was rebuilt around PHP-derived tokens and each shared
component class was restyled to match. Because pages share components
(`PageHeader`, `SectionCard`, `KpiGrid`, `DataTable`, `StatusBadge`, `JobCard`,
`Toolbar`, …), restyling the shared classes cascades to every page.

---

## Files changed

| File | Change |
|---|---|
| `frontend/index.html` | Added Poppins webfont (Inter kept as fallback). |
| `frontend/src/styles/tokens.css` | Rewritten with PHP colours, radii, shadows, gradients, layout dims; dark-theme block; base/utility styles. |
| `frontend/src/styles/app.css` | Appended "restoration override" layer: dark navy sidebar, `cc-ss-*`, topbar, page header, buttons, cards, KPI, badges, tables, forms, welcome card, quick actions, timeline, auth pages, dark mobile topbar. Added role-specific content shells and dark-mode token tweaks. |
| `frontend/src/styles/public.css` | Appended restoration layer: glass light navbar (theme-aware), light hero/page-hero, dark footer, dark stats band, job-type badge, sections. |
| `frontend/src/components/layout.jsx` | `Sidebar` rebuilt to PHP `cc-ss-*` structure (brand, profile card, sections, nav items, foot/logout, collapse, mobile drawer); `AppLayout` uses fluid `cc-main` + role class. |
| `frontend/src/pages/StudentJobs.jsx` | Student welcome card rewritten to PHP `.nd-welcome` structure (avatar, meta tags, light panel with gradients, placed banner). |

No PHP files were modified. No MERN markup was removed and no existing class names were renamed.

---

## Restored to PHP identity

- **Colour & type system** — Poppins, `#4F46E5` primary, `#F8FAFC` bg, `#1E293B` text,
  `14px` radius, PHP shadows and gradients (see `PHP_MERN_VISUAL_PARITY.md`).
- **Authenticated shell** — dark navy sidebar with brand block, profile mini-card,
  grouped sections, active gradient pill, red logout, collapse state, mobile drawer
  with backdrop; light glass sticky topbar turns dark navy on mobile; fluid content.
- **Public shell** — light navbar with animated underline, light hero (dark heading,
  gradient accent word), light sub-page heroes, dark footer, dark stats band.
- **Page header** — page-head styling (icon chip, uppercase eyebrow, title,
  description, meta, right-aligned actions) matches PHP.
- **Components** — buttons, cards, KPI/metric cards, stat cards, badges, tables,
  forms, job cards, list rows, timeline, profile ring, quick actions, auth cards.

---

## Key fixes

1. **Glass tokens** — `--cc-glass`, `--cc-glass-border` theme-aware (light/dark).
2. **Welcome card** — Restored PHP light `.nd-welcome` (gradients, avatar, meta tags,
   completion ring) with dark-mode variant; removed unintended lift.
3. **Layout shells** — Added role classes (`cc-role-student/tpo/company/admin`) and
   PHP-matching content widths/paddings (`max-width 1730px/1600px`, 28px student pad).
4. **Auth parity** — Visual gradient, shell max-width 1240px verified.

---

## Verification

Headless browser against live dev stack:
- `/`, `/login` — correct glass/dark styles, auth split-panel matches, mobile 375px
  no horizontal scroll, drawer works, dark theme toggles correctly.
- `npm run lint` → clean. `npm run build` → succeeds.

---

## Follow-ups
- Spot-check remaining role dashboards against PHP specifics if layout regressions appear.
- Dark mode remains MERN-only and functional.

---

## Round 2 — deep parity pass

Went class-by-class against the PHP source (`navbar.php`, `index.php`, `about.php`,
`companies.php`, `auth/verify-email.php`, `auth/forgot-password.php`,
`student/dashboard.php`, `tpo/dashboard.php`, `tpo/analytics.php`, `admin/dashboard.php`)
and closed the remaining visual gaps. No MERN functionality removed; no new backend
endpoints except enriching the existing `/tpo/analytics` (also served as `/admin/analytics`).

### Public site (`public.css`, `public.jsx`)
- Full-bleed hero + page-hero (`width:100vw`, negative inline margins, square corners) with
  inner rows re-centred to the public max-width; `overflow-x: clip` prevents scroll bleed.
- `.cc-icon-box` system (+ size/colour variants) used across hero highlights and stats.
- Home: 4 hero highlight tiles incl. **Placement Rate 95%**; stats band 4th card +
  matching labels (Registered Students / Partner Companies / Jobs Posted / Placement Success).
- About: Journey converted to PHP 2×2 grid with 4 mini-stats (incl. 95%); hero copy extended.
- Companies: 4th stats-band tile (95% Placement Rate).

### Navbar (`Header.jsx`)
- Rebuilt to PHP order **Home / About / Jobs / Companies / Contact** with Home icon.
- Notification bell with unread badge + lazily-loaded dropdown (`GET /notifications?limit=4`,
  `timeAgo` helper). User menu now shows name + chevron with a Dashboard/Sign-out dropdown.
  Independent drawer/profile/notification state.

### Auth (`auth.jsx`)
- Verify-email & forgot-password reworked into `AuthShell` with PHP OTP step indicator,
  boxed OTP inputs, countdown timer, resend row, help text and a verified note.
- Forgot-password role selector reworked to the PHP option-grid with per-role hints.

### Dashboards
- **Student** — KPI grid expanded to 6 cards (open opportunities, applications, saved jobs,
  assessments, upcoming interviews, offers) sourced from existing endpoints.
- **TPO** — added **Today's Placement Schedule** table and upgraded "Needs your attention"
  to PHP's four icon cards (company verification / job approvals / pending applications /
  selections on hold) with Review/View actions and a pending-count badge.
- **TPO Analytics** — added the 9-tile stats strip and 4 missing charts (Placement Funnel,
  Drive-wise Performance, Course-wise Placements, Most Demanded Skills) → 8 charts total.
  `/tpo/analytics` extended with `stats`, `funnel`, `byCourse`, `bySkill`, `byDrive`.
- **Admin** — dashboard already exceeded PHP's 6 stat cards; Analytics now shows the same
  stats strip (endpoint is aliased to the TPO analytics controller).

### CSS gap layer (`app.css`)
Appended the previously-undefined class set (`.cc-section-body`, `.cc-stack*`, `.cc-bar*`,
`.cc-journey*`, `.cc-drop`, `.cc-score-*`, `.cc-chat-*`, `.swal2-popup.cc-swal`, `.cc-success-*`,
`.cc-welcome-*`, `.cc-footer-col*`, `.cc-pending`, `.cc-exam-session`, …) plus nav-active
aliases, `.cc-text-gradient`, `.cc-select`, the full OTP UI, `.auth-signin-roles`, the
notification dropdown and `.cc-att-grid` / `.cc-att-card` for the dashboard attention cards.

### Verification
- `npm run lint` → clean.
- `npm run build` → succeeds (2565 modules; CSS ≈ 368 kB, JS ≈ 1.50 MB; only the usual
  chunk-size advisory). Backend controller syntax-checked with `node --check`.
