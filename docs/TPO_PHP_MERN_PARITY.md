# TPO Panel — PHP → MERN Parity

Source of truth: original PHP panel `C:\xampp\htdocs\careerconnect_new\tpo\`
(read-only). Target: MERN React pages `frontend/src/pages/tpo1.jsx`,
`tpo2.jsx` + Express API under `/api/v1/tpo/*` and related routes.

## Page-by-page parity

| PHP TPO page | MERN route | Component | Parity notes |
|--------------|-----------|-----------|--------------|
| Dashboard | `/tpo` | `tpo1.Dashboard` | KPI grid + recent activity; counts from `/tpo/dashboard`. |
| Analytics | `/tpo/analytics` | `tpo1.Analytics` | Lazy `AnalyticsCharts` (recharts), token-coloured. |
| Students list | `/tpo/students` | `tpo1.Students` | Full PHP filters: search, branch, course, year, status + sort (name/branch/cgpa/year). Server-side over full set, returns summary + filter facets. |
| Student detail | `/tpo/students/:id` | `tpo1.StudentDetails` | Profile, applications, offers. |
| Companies | `/tpo/companies` | `tpo1.Companies` | Search + verification filters, pagination. |
| Company detail | `/tpo/companies/:id` | `tpo1.CompanyDetails` | Profile, jobs, drives, contacts. |
| Jobs / approvals | `/tpo/jobs` | `tpo1.Jobs` | Approve/reject with reason (SweetAlert2), status filter. |
| Drives | `/tpo/drives` | `tpo2.Drives` | List + create/edit, registration counts. |
| New/Edit drive | `/tpo/drives/new`, `/tpo/drives/:id/edit` | `tpo2.DriveForm` | `react-hook-form` + `zod` validation. |
| Drive registrations | `/tpo/drives/:id` | `tpo2.DriveRegs` | Registered students, approve/reject. |
| Drive calendar | `/tpo/calendar` | `tpo2.TpoCalendar` | Month grid with drives + interviews. |
| Drive history | `/tpo/history` | `tpo2.DriveHistory` | Search (regex-escaped) + history feed. |
| Applications | `/tpo/applications` | `tpo2.TpoApplications` | Search + status filter + pagination. |
| Application detail | `/tpo/applications/:id` | `tpo2.TpoApplicationDetail` | Status timeline, stage actions (uses previously-unused detail endpoint). |
| Assessments | `/tpo/assessments` | `tpo2.TpoAssessments` | Status filter on real enum `active/inactive/draft`; results/violations. |
| Assessment detail | `/tpo/assessments/:id` | `tpo2.TpoAssessmentDetail` | Questions, attempts, results (new `GET /assessments/:id`). |
| Interviews | `/tpo/interviews` | `tpo2.TpoInterviews` | Search (student/company/round) + schedule/cancel/reschedule modal. |
| Offers | `/tpo/offers` | `tpo2.TpoOffers` | Search by student/company/position; letter preview. |
| Selections | `/tpo/selections` | `tpo2.Selections` | Search + status filter. |
| Placements | `/tpo/placements` | `tpo2.Placements` | Status filter on real enum `Placed/Joined/Not Joined`. |
| Announcements | `/tpo/announcements` | `tpo2.Announcements` | Create/publish/unpublish/delete. |
| Reports | `/tpo/reports` | `tpo2.Reports` | Filters + preview + CSV/PDF export. |
| Contact messages | `/tpo/contacts` | `tpo2.Contacts` | Search, status filter, reply, pagination. |
| Audit logs | `/tpo/audit` | `tpo2.Audit` | From/To date range + text search across action/module/description. |
| Notifications | `/tpo/notifications` | `shared.Notifications` | Shared component. |
| Settings | `/tpo/settings` | `shared.Settings` | Shared component. |

## Backend changes supporting parity

| File | Change |
|------|--------|
| `src/controllers/tpo.controller.js` | `students`: in-memory filter/sort (search, branch, course, year, status; sort name/branch/cgpa/year) over the full set; returns `summary` (`total/placed/notPlaced/avgCgpa`) + `filters` (`branches/courses/years`). `applications`: added `search`. |
| `src/controllers/misc.controller.js` | `listAudit`: `from`/`to` (inclusive end-of-day) + `search` over description/action/module; regex-escaped. |
| `src/controllers/interview.controller.js` | `all`: `search` over student name/email, company name, round. |
| `src/controllers/offer.controller.js` | `listSelections`, `allOffers` (+ position), `allPlacements`: `search`. |
| `src/controllers/drive.controller.js` | Regex-escaped `q` and history `search` (fixes regex-injection crash); non-student drive list returns per-drive `regCount`. |
| `src/controllers/assessment.controller.js` | Added `getOne` (populates company/job, ownership check). |
| `src/routes/api.routes.js` | Added `GET /assessments/:id` (`protect`, `requireRole('company','tpo','admin')`). |

## Preserved invariants

- All existing routes, named exports, endpoints, roles/permissions and business
  rules are unchanged. New endpoints/params are additive.
- Regex input is escaped everywhere user text is interpolated into `$regex`.
- Original PHP source was not modified.
