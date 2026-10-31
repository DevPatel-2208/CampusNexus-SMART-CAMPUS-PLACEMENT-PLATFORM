# TPO / Faculty Panel — UI Audit

Scope: the TPO (Training & Placement Officer) panel of the CareerConnect MERN app.
Reference source of truth for behaviour: the original PHP panel at
`C:\xampp\htdocs\careerconnect_new\tpo\` (read-only, never modified).

## 1. Goals

1. Redesign every TPO page with a premium, consistent UI (cards, KPI grids, data
   tables, modals, toolbars).
2. Full responsiveness (desktop, tablet, phone).
3. Accessible: semantic markup, focus states, keyboard-operable controls,
   labelled inputs, `aria-*` on icon-only buttons.
4. Dark/light aware: no hardcoded colours; everything driven by `--cc-*` tokens.
5. 100% functional parity with the PHP TPO panel (filters, sorts, actions,
   exports, validation rules) on top of the existing MERN API.

## 2. Current state (before redesign)

- TPO pages lived in two large files: `frontend/src/pages/tpo1.jsx` and
  `frontend/src/pages/tpo2.jsx`.
- Shared primitives were minimal (`StatusBadge`, `Empty`, `Loading`,
  `ErrorState`, `Stat`, `Pager`).
- Several pages used ad-hoc markup, duplicated table code and hardcoded hex
  colours (e.g. the `Stat` component and the recharts palette), which broke
  dark mode.

### 2.1 Bugs / defects found

| # | Area | Defect | Fix |
|---|------|--------|-----|
| 1 | Placements | Status filter used `active/completed/terminated`; backend enum is `Placed/Joined/Not Joined` → filter never matched. | Filter rebuilt from the real enum. |
| 2 | Assessments | Status filter used `draft/published/archived`; enum is `active/inactive/draft`. | Filter rebuilt from the real enum. |
| 3 | Students | `branch`/`status` were applied after pagination and `course` was ignored → wrong pages, missing results. | Filtering/sorting moved to the backend over the full result set. |
| 4 | Applications, Offers, Interviews, Selections, Placements, Contacts | Backend returned `pagination` but the UI never rendered a pager. | `Pager` wired on every list. |
| 5 | Many lists | Requested `limit: 200`, clamped server-side to 100 → silent truncation. | Server-side pagination + facets used everywhere. |
| 6 | Backend | Unused TPO endpoints: application detail, interview `PATCH`/`DELETE`, assessment results/violations. | Wired into the UI (application/assessment detail pages). |
| 7 | Audit | No date-range or text filter (PHP had From/To). | `from`/`to` + `search` added server-side and exposed in the UI. |
| 8 | Theme | `Stat` and charts used hardcoded hex, ignoring dark mode. | Migrated to `--cc-*` tokens. |

## 3. Shared UI foundation

New/expanded primitives in `frontend/src/components/ui.jsx`:

`KpiCard`, `KpiGrid`, `PageHeader`, `SectionCard`, `SearchInput`,
`SelectFilter`, `Toolbar`, `DataTable`, `Modal`, `DetailGrid`, `Spinner`,
plus retained `StatusBadge`, `Empty`, `Loading`, `ErrorState`, `Stat`
(back-compat), `Pager`, `salaryText`.

Theme-aware SweetAlert2 helpers in `frontend/src/services/alerts.js`:
`isDark()`, `swalBase()`, `confirmAction()`, `confirmDanger()`, `promptText()`.

Design tokens: `frontend/src/styles/tokens.css` (`--cc-*`).
Component CSS: `frontend/src/styles/app.css`.

## 4. Navigation

`frontend/src/components/layout.jsx` — TPO sidebar regrouped:

- **Overview**: Dashboard, Analytics
- **People**: Students, Companies
- **Placements**: Jobs, Drives, Applications, Interviews, Offers, Selections, Placements
- **Process**: Assessments, Drive calendar, Drive history
- **Engage**: Announcements, Contact messages, Reports
- **System**: Notifications, Audit logs, Settings

## 5. Verification

- `npm run lint` — clean.
- `npm run build` — success.
- Backend `npm test` — 9 suites / 32 tests pass.
