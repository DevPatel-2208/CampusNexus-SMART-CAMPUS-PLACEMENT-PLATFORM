# PHP → MERN Visual Parity Map

Source of truth: `C:\xampp\htdocs\careerconnect_new` (PHP).
Implementation target: `D:\DEV\MERN\careerconnect\frontend` (React + Bootstrap 5).
Scope: **visual identity only** — no functional or data changes were made to the MERN app.

This document maps the PHP design system to the MERN implementation so future work
can keep the two in sync.

---

## 1. Design tokens

PHP defines tokens as CSS custom properties in `assets/style.css`; MERN mirrors them
in `frontend/src/styles/tokens.css` (loaded after Bootstrap, before `app.css`).

| Token (PHP) | PHP value | MERN variable | Status |
|---|---|---|---|
| Font family | `Poppins` | `--cc-font` → Poppins (Inter fallback) | ✅ |
| primary | `#4F46E5` | `--cc-primary` | ✅ |
| primary-2 / hover | `#4338CA` | `--cc-primary-2` | ✅ |
| primary-dark | `#3730A3` | `--cc-primary-dark` | ✅ |
| primary-light | `#EEF2FF` | `--cc-primary-soft` | ✅ |
| page background | `#F8FAFC` | `--cc-bg` | ✅ |
| text | `#1E293B` | `--cc-text` | ✅ |
| heading / dark | `#0F172A` | `--cc-dark` | ✅ |
| muted | `#64748B` | `--cc-muted` | ✅ |
| border | `#E2E8F0` | `--cc-border` | ✅ |
| success | `#059669` | `--cc-success` | ✅ |
| warning | `#D97706` | `--cc-warning` | ✅ |
| danger | `#DC2626` | `--cc-danger` | ✅ |
| info | `#0891B2` | `--cc-info` | ✅ |
| radius | `14px` (`10` sm / `20` lg / `24` xl) | `--cc-radius*` | ✅ |
| brand gradient | `linear-gradient(135deg,#4F46E5,#7C3AED 50%,#2563EB)` | `--cc-grad` | ✅ |
| hero gradient | `linear-gradient(135deg,#EEF2FF,#F5F7FF 40%,#EFF6FF)` | `--cc-grad-hero` | ✅ |
| sidebar width | `280px` (collapsed `78px`) | `--cc-sidebar-w` / `-collapsed` | ✅ |
| topbar height | `58px` | `--cc-header-h` | ✅ |
| public max width | `1280px` | `--cc-pub-maxw` | ✅ |

A `[data-theme='dark']` block is also defined in `tokens.css` for the existing dark-mode toggle.

---

## 2. Application shell (authenticated)

PHP: `assets/css/student-sidebar.css`, `assets/css/app.css`, `includes/sidebar.php`.

| PHP element | PHP class | MERN markup | MERN CSS |
|---|---|---|---|
| Sidebar | (sidebar markup) | `.cc-sidebar` | `app.css` restoration block |
| Brand + logo | `cc-ss-brand`, `cc-ss-logo` | `.cc-ss-brand`, `.cc-ss-logo` | ✅ |
| Profile mini-card | `cc-ss-profile`, `cc-ss-avatar` | `.cc-ss-profile`, `.cc-ss-avatar` | ✅ |
| Nav list | `cc-ss-nav` | `.cc-ss-nav` | ✅ |
| Section label | `cc-ss-section` | `.cc-ss-section` | ✅ |
| Nav item | `cc-ss-item` (+`.active`) | `.cc-ss-item` (`.active`) | ✅ |
| Footer / logout | `cc-ss-foot`, `cc-ss-logout` | `.cc-ss-foot`, `.cc-ss-logout` | ✅ |
| Mobile drawer | `is-open` + backdrop | `.is-open`, `.cc-sidebar-backdrop` | ✅ |
| Collapse | `is-collapsed` | `.is-collapsed` | ✅ |
| Topbar | `cc-topbar` | `.cc-topbar` | ✅ (light desktop, dark navy mobile) |
| Page head | `page-head` | `.cc-page-header*` | ✅ |

Sidebar is dark navy `linear-gradient(180deg,#172554,#1E1B4B)` at **fixed** width 280px
(78px collapsed); content area is fluid (`container-fluid`, no centered max-width).

---

## 3. Public shell

PHP: `header.php`, `includes/navbar.php`, `footer.php`, `assets/style.css`.

| PHP element | PHP class | MERN markup | MERN CSS |
|---|---|---|---|
| Navbar | `custom-navbar` | `.cc-public-header` | `public.css` block |
| Nav link underline | `.nav-link::after` | `.cc-nav-link::after` | ✅ |
| Hero | `hero` (light gradient) | `.cc-hero` | ✅ |
| Sub-page hero | `page-hero` (light) | `.cc-page-hero` | ✅ |
| Hero chips | `page-hero` stats | `.cc-hero-chip` | ✅ |
| Section heading | `cc-sec-header` | `.cc-sec-head` | ✅ |
| Stats band | `cc-statistics` (dark) | `.cc-stats-band` | ✅ |
| Footer | `cc-footer` (dark `#0F172A`) | `.cc-public-footer` | ✅ |

The previous MERN deviation (indigo hero, light footer) has been replaced with the
PHP light-hero / dark-footer treatment.

---

## 4. Shared components

| PHP component | PHP class | MERN component (`components/ui.jsx`) | Class |
|---|---|---|---|
| Buttons | `.btn*` | `btn` + Bootstrap | `.btn-primary` etc. |
| Card | `cc-card` | `SectionCard` | `.cc-card` |
| Metric card | `metric-card` | `KpiCard` / `KpiGrid` | `.cc-kpi*` |
| Stat card | `stat-card` | `StatCard` | `.cc-stat*` |
| Table | `.table` | `DataTable` | `.cc-table*` |
| Status badge | `.badge` | `StatusBadge` | `.cc-badge` |
| Job card | `job-card`, `job-type-badge` | `JobCard` | `.cc-job-*` |
| List row | — | inline | `.cc-list-row/-body/-ic` |
| Timeline | — | inline | `.cc-timeline`, `.cc-tl-*` |
| Profile ring | — | — | `.cc-ring` |

---

## 5. Known intentional differences

- Responsive breakpoints use Bootstrap 5’s (`991.98px` sidebar drawer) rather than the
  PHP media queries; visual result is equivalent.
- Icons come from `lucide-react`; PHP uses inline SVGs. Sizes are normalised to match.
- Dark mode (`[data-theme='dark']`) is a MERN-only feature and is preserved.
