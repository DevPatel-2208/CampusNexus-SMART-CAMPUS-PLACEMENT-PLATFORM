# PHP → MERN Page Parity Audit

- **Source of truth (PHP):** `C:\xampp\htdocs\careerconnect_new`
- **Target (MERN):** `D:\DEV\MERN\careerconnect`
- **Date:** 2026-10-17
- **Severity:** P0 = missing page / broken workflow / security · P1 = missing major section, field, column, filter, important button or business feature · P2 = layout, spacing, typography, card structure, responsive · P3 = icon, hover, animation polish

## 0. Method & limitations

- Inspection is **source-and-asset based**. Every PHP page and every MERN route/component/controller/model was read from disk.
- **Live visual comparison is BLOCKED:** the PHP app (`http://localhost/careerconnect_new/`) is not served (Apache down) and MySQL (port 3306) is not listening in this environment. No screenshots could be captured. Findings are derived from PHP source, CSS assets, and rendered-template markup, not from side-by-side rendered pixels.
- Backend controllers/models were inspected to confirm data/API gaps.

---

## 1. Route coverage summary

Every PHP page has a MERN counterpart (some consolidated). **No page is entirely missing** except `auth/reset-password.php` (token-link reset page), which has no MERN route. Backend, auth, role-permission, and business logic already exist in MERN; gaps below are content/UX/behavioral.

| Module | PHP pages | MERN routes | Coverage |
|---|---|---|---|
| Public | 9 | 9 | Full (content gaps) |
| Auth | 8 | 7 + OAuth | `/reset-password` missing |
| Student | 38 | 33 | Full (content gaps) |
| Company | 31 | 21 | Full (content gaps) |
| TPO | 32 | 25 | Full (content gaps) |
| Admin | 10 | 13 | Full + extras (Users/Settings) |

---

## 2. Public & Auth

### Design tokens
| Token | PHP `assets/style.css` | MERN `styles/tokens.css` |
|---|---|---|
| font | **Poppins** | **Inter** |
| primary | `#4F46E5` | `#4f46e5` OK |
| accent | `#38BDF8` (sky) | `#7c3aed` (violet) ✗ |
| bg | `#F8FAFC` | `#f4f6fb` |
| success | `#059669` | `#0f9d6b` |
| warning | `#D97706` | `#d98207` |
| danger | `#DC2626` | `#e11d48` ✗ |
| info | `#0891B2` | `#0284c7` ✗ |
| radius | 14px | 14px OK |

PHP has **no dark mode** anywhere (no `[data-theme]`, no toggle). MERN adds full light/dark via `ThemeContext` + tokens.

### Shared layout
| Element | PHP | MERN | Gap |
|---|---|---|---|
| Public navbar auth state | shows Dashboard + bell when logged in (`navbar.php:65-89`) | always "Sign in / Register" (`public.jsx:31-58`) | **P1** |
| Footer | 4 columns | matches | OK |
| Sidebar (dashboard) | role sections (`includes/sidebar.php`) | `NAV` (`layout.jsx:11-83`) | see §6 |
| Mobile nav | off-canvas + backdrop + Escape | off-canvas + backdrop + Escape | OK |
| Dark mode | none | full | extra |

### Page findings
- **Home** (`index.php` → `Home`): sections match 1:1 (hero, featured jobs, why, how, companies, stats, testimonials, CTA). **P1** Students stat hardcoded "5,000" in hero+band; PHP dynamic. **P2** no company logos (initials only). **P3** extra hero icon row invented.
- **About** (`about.php` → `About`): all sections present. **P1** all statistics hardcoded (PHP computes students/companies/jobs from DB).
- **Contact** (`contact.php` → `Contact`): parity good (4 info cards, form name/email/subject/message, FAQ accordion, map placeholder). **P3** no CSRF (JWT model, acceptable).
- **Companies** (`companies.php` → `CompaniesPublic`): search + industry + cards. **P1** verification badge **hardcoded verified** (`public.jsx:757`) — PHP conditional on `verification_status==='verified'`. **P1** stats hardcoded. **P2** no logo, Prev/Next vs numbered pagination, double live-filter+button.
- **Jobs public** (`jobs.php` → `JobsPublic`/`JobBrowser`): **P1** no Save/bookmark button on cards (PHP `jobs.php:178-184`). **P2** jobType options drift (PHP: Full Time/Part Time/Internship/Remote; MERN drops Remote, adds Fresher/Experienced + separate workMode). **P3** live-filter vs submit.
- **Job details public** (`job-details.php` → `JobDetails`): "Login to Apply" CTA present ✅. **P3** MERN adds status/approval badges + eligibility panel (invented vs public PHP); PHP "Requirements" block always blank (PHP latent bug) so MERN omits it.
- **Login** (`login.php` → `Login`): PHP uses **role radio cards** (Student/Company/TPO only); MERN uses card buttons ✅ but adds **admin** role and a **Google button** not on PHP login page. **P1**.
- **Register** (`register.php` → `Register`): role cards, password strength meter (5-bar, 4 rules) ✅. **P2** company field labelled "Contact Person Name" (PHP "Full Name"); MERN adds Google button.
- **Verify OTP** (`auth/verify-email.php` → `VerifyEmail`): **P1** MERN uses a single input vs PHP **6 separate boxes** with auto-advance/backspace/paste; **P1** no expiry countdown timer; **P2** resend cooldown not shown on load, no attempts-left display; attempts enforced backend in PHP (must verify MERN backend does same).
- **Forgot password** (`auth/forgot-password.php` → `ForgotPassword`): **P1** Step 1 uses a `<select>` **dropdown** vs PHP **role radio cards**; **P1** no 6-box OTP / timer / cooldown; **P2** no password-strength meter on step 3.
- **Reset password** (`auth/reset-password.php`): **P1** no MERN route/component; emailed token link would hit NotFound.
- **OAuth** (`auth/google-*.php` → `OAuthCallback`): **P1** no role-completion screen for new Google accounts (PHP `google-complete.php`); **P2** Google entry surfaced on login/register (PHP only on its dedicated page).

---

## 3. Student

Route map confirmed (`App.jsx:51-81`) — all routed. Key content gaps:

- **Dashboard** (`dashboard.php` → `Dashboard`): greeting, strength ring, placed banner, KPIs, quick actions, recommended, recent apps, timeline, journey, notifications, insights — all present. **P3** journey off-by-one.
- **Jobs** (`jobs.php` → `Jobs` + `JobBrowser`): **P1** no save toggle, no eligibility verdict badge, no applied state, no skills chips, no deadline block, no vacancies, no per-card apply. **P2** no result count, plain cards vs premium `fj-*`.
- **Recommended** (`recommended_jobs.php` → `Recommended`): **P2** PHP weighted breakdown (Skills50/Loc15/Type15/Course10/Branch10) not shown; MERN thin.
- **External** (`external_jobs.php` → `External`): **P1** no location filter, no "N found" counts. **P2** flat grid vs internal/external split.
- **Saved jobs** (`saved_jobs.php` → `Saved`): **P1** no keyword search, no pagination. **P2** rows omit saved date/deadline/description.
- **Drives** (`placement_drives.php` → `Drives`): **P1** no search/status/mode filters, no summary cards, no per-card eligibility badge, no registration-window state, no pagination (hard limit 50). **P2** plain cards.
- **Drive details** (`drive_details.php` → `DriveDetails`): **P0/P1** PHP allows **"Register Anyway"** for ineligible students; MERN hard-disables. **P1** missing eligibility-rules panel, profile comparison, seat-cap "X/Y", registered-state card, linked-job/about-company. **P2** no hero/chips.
- **Applications** (`applications.php` → `Applications`): **P1** no pipeline progress indicator. **P2** no KPI row, no keyword search, no pagination, no filter chips.
- **Application details** (`application_details.php` → `ApplicationDetails`): **P1** no resume/document download, no job snapshot. **P2** no linked interview/assessment/offer.
- **Assessments / Start / Exam / Result**: strong parity (violations, heartbeat, autosave, expiry auto-submit, 3-strike block). **P2** PHP gates fullscreen + question palette; MERN optional. **P2** result missing correct/incorrect/unanswered summary.
- **Interviews / Interview details**: good parity.
- **Offers / Offer letter** (`offer_details.php`,`offer_letter.php` → `Offers`/`OfferDetails`/`OfferLetterPreview`): **P1** no company logo; **P1** OfferDetails missing department + work mode. **P2** letter missing address/phone/issue-date/response history.
- **Placement status** (`placement_status.php` → `PlacementStatus`): **P0/P1** entire placed→not-placed status + Applied→Placed **timeline visualization missing** (PHP 705 lines → MERN 6).
- **Profile / Education / Projects / Certifications**: **P1** `CrudList` flat form — Education missing `stream`/`university`, no qualification-driven fields, no validation; Projects missing start/end date; Certifications missing stats + credential link + validation.
- **Skills**: **P2** PHP richer chip manager.
- **Resume**: parity good (upload/list/download/delete/ATS).
- **Preferences** (`career_preferences.php`): **P1** no delete action, no enum validation, `experienceLevel` free-text (PHP select).
- **Alerts** (`job_alerts.php`): **P2** PHP auto-renders top-5 inline.
- **Notifications** (`notifications.php`+`notification_center.php` → `Notifications`): **P1** no All/Unread/Read tabs w/ counts, no type filter, no search, no load-more pagination (fixed 30). **P2** thin card.
- **AI chat**: parity (verify student-only mount).

Cross-cutting: **P1** `StatusBadge` regex color map vs PHP semantic tones; **P2** no `sp_*` premium design primitives.

---

## 4. Company

- **Dashboard** (`dashboard.php` → `Dashboard`): **P1** missing approvedJobs/newApps/shortlisted/pendingOffers KPIs; **P2** missing verification banner + quick actions.
- **Jobs list** (`manage_jobs.php`,`jobs.php` → `Jobs`): **P1** no search/status/approval filters, no pagination, no My-Jobs stats row. **P3** MERN adds Delete.
- **Create/Edit job** (`create_job.php`,`edit_job.php` → `JobForm`): **P1** **skills tag input missing** (PHP stores `job_skills`; model has no skills → recommender has no source). **P2** experience free-text vs select; intern-only fields. **P0 divergence** MERN blocks unverified companies (PHP allows).
- **Job details** (`job_details.php` → `/company/jobs/:id` → shared `JobDetails`): **P1** missing skills chips, applications-count badge, "View all applications"; **P2** missing quick-stats sidebar.
- **Applications** (`applications.php` → `Applications`): **P1** no job-selection dropdown (backend supports `jobId`), no pagination. **P2** match%/auto-rank render verify.
- **Candidate details** (`candidate_details.php` → `ApplicationDetails`): **P0 workflow** no UI path sets `Shortlisted` (`decide` only Selected/Rejected/On Hold; `updateStatus` never called) → **Shortlisted page unpopulatable**. **P1** `Under Review` unreachable. **P2** placement_status not shown.
- **Shortlisted** (`shortlisted_candidates.php` → `Shortlisted`): **P0** unpopulatable (see above). **P2** inline Schedule Interview action.
- **Selection** (`selection.php`): **P1** no dedicated `/company/selection` page (inlined).
- **Assessments** (`assessments.php` → `Assessments`): **P0** create UI collects **only a title** — no duration/marks/passing%/difficulty/category/negative marks/**job binding**. **P1** publish enabled on empty draft.
- **Questions** (`questions.php`): **P1** no edit, no AI-generate in UI.
- **Results/Violations** (`assessment_results.php`,`assessment_violations.php`): **P1** no dedicated pages/drill-down.
- **Interviews** (`interviews.php`,`schedule_interview.php` → `Interviews`/`InterviewForm`): **P1** no interview `result` field.
- **Offers** (`create_offer.php`,`edit_offer.php`,`offers.php` → `Offers`/`OfferForm`): **P1** missing department/workMode/issueDate/representative/terms/remarks/offer-file; no student/job dropdown; **issue does not set application status to Offer**. **P2** letter fields will show `—`.
- **Profile** (`profile.php` → `CompanyProfile`): **P2** no inline logo preview/verification/member-since/designation. **P0 security** `patchProfile` mass-assignment.
- **Verification** (`verification.php` → `Verification`): **P2** doc-type text; **P3** MERN adds delete.
- **Notifications**: **P1** same as student (tabs/type-filter/search/load-more).
- **Security P0**: `company.controller.patchJob` (`:115`) and `patchProfile` (`:41`) use `Object.assign(doc, req.body)` → self-approve job / self-verify company.

---

## 5. TPO

- **Dashboard** (`dashboard.php` → `Dashboard`): **P1** no hero/greeting, no Needs-attention, no quick-actions, no timeline, missing KPIs (placed/rate/pendingVerif/activeJobs/upcomingDrives/appsToday).
- **Analytics** (`analytics.php`): **P1** missing 4 top-line KPI stat cards; **P2** no insight tiles/chart-card headers.
- **Students** (`students.php` → `Students`): **P1** no branch/course/status/year filters, no sorting, no summary, no pagination. **P2** missing year/phone/enrollment columns.
- **Student details** (`student_details.php`): mostly parity; **P2** styling.
- **Companies** (`companies.php`): **P1** no filters/search, no summary, no industries dropdown. **P3** no report link.
- **Company details** (`company_details.php`): good parity; **P2** badge variants.
- **Company verification** (`company_verification.php`): inline; ensure backend notify+audit (**P1** if absent).
- **Jobs** (`jobs.php` → `Jobs`): **P1** no search/status/type/company filters, no summary, no apps count. **P1** approval sends only `{status}` — **no rejection reason**.
- **Drives** (`placement_drives.php` → `Drives`): **P1** no filters/summary/inline status-change/reg counts.
- **Drive form** (`create_drive.php`,`edit_drive.php` → `DriveForm`): **P0** **raw "Company ID"/"Job ID" text inputs** vs PHP dropdowns of verified companies + approved jobs. **P1** `max_students` missing, `drive_type` uneditable, skills/experience absent in eligibility.
- **Drive details** (`drive_details.php` → `DriveRegs`): **P1** no drive info header, eligibility panel, eligible/shortlisted/selected counts.
- **Calendar / History**: parity good.
- **Applications** (`applications.php`): **P1** no search; **P2** columns/pagination.
- **Assessments** (`assessments.php`,`assessment_attempts.php`,`assessment_violations.php`): **P1** no filters/counts; **P1** no dedicated attempts page; **P1** no per-attempt violations detail page.
- **Interviews** (`interviews.php`): **P1** no filters.
- **Offers** (`offers.php`): **P1** no filters/sort; **P2** no row PDF.
- **Selections** (`selections.php` → `Selections`): route complete; **P2** missing Total stat, no search.
- **Placements** (`placements.php`): **P1** no filters/sort.
- **Announcements** (`announcements.php`): **P1** no course/branch targeting, no edit; **P2** no audience preview, expiry field unstored.
- **Reports** (`reports.php` → `Reports`): CSV/PDF for 10 types — parity good.
- **Audit logs** (`audit_logs.php` → `Audit`): **P1** no q/module/action/date filters, no pagination.
- **Contacts**: extra (PHP admin domain).

Cross-cutting **P2**: PHP premium `tpo-*`/`dash-*`/`analytics-*` design system has no MERN equivalent (generic `cc-*`).

---

## 6. Admin

- **Dashboard** (`dashboard.php`): **P1** missing Open Jobs + Pending Applications KPIs; **P2** welcome card; MERN adds interviews/placements + recent activity (divergence).
- **Analytics** (`analytics.php`): **P1** missing 4 KPI stat cards.
- **Students** (`students.php`): **P1** missing Mobile/College/Passing-Year/Skills/Registered columns. **P2** no count badge/pagination.
- **Companies** (`companies.php`): **P1** missing Mobile/Website/Description/Registered. **P2** no pagination.
- **Jobs** (`jobs.php`): **P1** missing Type/Salary/Description/Requirements/Posted columns; **P1** no admin-specific detail (reuses public). **P2** MERN adds approve/reject.
- **Job details** (`admin/job-details.php`): **P1** missing Applications count, Company Information panel, Requirements, Back button.
- **Applications** (`admin/applications.php`): **P1** missing Application #/Location/Applied columns. **P2** MERN adds status override.
- **Application details** (`admin/application-details.php` → reuses student `ApplicationDetails`): **P0** missing entire **Student Information** block (mobile/course/college/degree/branch/year/CGPA/skills), **Status History timeline**, **Interview Details**. **P1** missing applied-job + company panels.
- **Contact messages** (`contact-messages.php`): **P1** missing Received timestamp. **P2** message not `nl2br`. **P3** MERN adds "New" reset.
- **Users**: extra (no PHP page).
- Auth note: PHP admin = `tpo` role; MERN uses distinct `admin` role.

### Shared layout / nav
- **Student nav**: missing **Notifications** item; MERN adds Offers (PHP has none).
- **Company nav**: missing **Post Job** link (route exists) and **Selection**; MERN adds Verification.
- **TPO nav**: missing **Verification Requests**; MERN adds Contact Messages.
- **Admin nav**: MERN adds Users + promotes Analytics; no PHP page lost.

### Design system / dark mode hazards (hardcoded colors bypassing tokens)
- `admin.jsx:17-21,56-57` Stat colors; `AnalyticsCharts.jsx:4,37,46,47` chart colors; `app.css:322,324` button hovers; `app.css:352` form-select arrow; `student2.jsx:78` success icon. These do not adapt in dark mode.

---

## 7. Severity roll-up (headline)

**P0**
1. `company.controller.patchJob` mass assignment → self-approve.
2. `company.controller.patchProfile` mass assignment → self-verify.
3. Company **Shortlist** workflow unreachable → Shortlisted page unpopulatable.
4. Company **assessment create** collects only a title (no config/job binding).
5. Admin application-details reuses student component (missing student info/status history/interview).
6. TPO **drive form** raw Company/Job ID text inputs.
7. Student **drive register-anyway** blocked (regression).
8. Student **placement status** timeline missing.
9. `auth/reset-password` route missing.

**P1** (major, ~40 items) — see `PHP_MERN_GAP_REPORT.md`.

**P2/P3** — design-system primitives (`cc-detail`/`cc-stack`/`cc-chip`), table→card parity, count badges, palette/font drift, hardcoded hex, responsive deltas.
