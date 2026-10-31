# PHP → MERN Gap Report (prioritized backlog)

Derived from `PHP_MERN_PAGE_PARITY_AUDIT.md`. Each item lists the evidence and required fix. Status column is updated as work lands.

## P0 — Critical (must fix first)

| # | Area | Gap | Evidence | Required fix | Status |
|---|---|---|---|---|---|
| P0-1 | Backend security | `patchJob` mass assignment → company can self-approve | `company.controller.js:115` `Object.assign(job, req.body)` | Whitelist editable fields; ignore `approvalStatus`/`company`/`status`(except toggle) | DONE — `assignFields()`/`COMPANY_JOB_FIELDS`/`syncJobSkills()` whitelist in `company.controller.js` |
| P0-2 | Backend security | `patchProfile` mass assignment → self-verify | `company.controller.js:41` `Object.assign(cp, req.body)` | Whitelist editable fields; ignore `verificationStatus`/`user` | DONE — `COMPANY_PROFILE_FIELDS` whitelist in `company.controller.js` |
| P0-3 | Company workflow | No UI path sets application `Shortlisted` → Shortlisted page never populates | `company2.jsx` candidate actions call `decide` (Selected/Rejected/On Hold only); `updateStatus` unused | Add Shortlist + Under Review actions; wire status update | DONE — `setStatus()` + Shortlist/Under Review buttons in `company1.jsx` `ApplicationDetails` → `PATCH /applications/:id/status` |
| P0-4 | Company assessments | Create assessment collects only a title | `company2.jsx` create Swal title-only; PHP `create_assessment.php` has full config | Full create form: job bind, duration, marks, per-Q marks, passing %, difficulty, category, technology, negative marks, description | DONE — full config form in `company2.jsx` (`Assessments`); + question Edit/Cancel (P1-24) |
| P0-5 | Admin | `/admin/applications/:id` reuses student component | `App.jsx:144` → `S2.ApplicationDetails` | Admin-specific detail: student info block, applied-job, company info, status-history timeline, interview details | DONE — new `A.AdminApplicationDetails` (`admin.jsx`) wired in `App.jsx`; `application.controller.getOne` now nests `job.company`; list links through |
| P0-6 | TPO | Drive form uses raw Company/Job ID text inputs | `tpo2.jsx:49-50` | Dropdowns populated from verified companies + approved jobs | DONE — `DriveForm` company select (`/tpo/companies`) + job select (`/tpo/jobs?approvalStatus=approved`); added driveType/maxStudents/requiredSkills/requiredExperience |
| P0-7 | Student | Drive "Register Anyway" blocked for ineligible students (PHP allowed) | `student2.jsx:40` disables on `!elig.eligible` | Allow register-anyway with warning when PHP allows; respect reg window | DONE (decided: enforce, no dead button) — PHP's own handler rejects non-eligible POST (`drive_details.php:57`), so its "Register Anyway" button is a defect. MERN now consistent: structured `{label,detail}` reasons from `eligibility.service.js`, exact reasons + professional warning in `student2.jsx` `DriveDetails`, register disabled for not-eligible/closed/full/already-registered, backend unchanged enforcement; `drive.controller.getOne` returns `myRegistration`/`registrationOpen`/`seatsFull`; success only after backend confirms |
| P0-8 | Student | Placement status timeline/hero missing | `student3.jsx:249-255` vs `placement_status.php` (705 lines) | Rebuild hero + status progression + Applied→Placed timeline | DONE — `student3.jsx` `PlacementStatus` rebuilt: KPI row, status banner, placement cards + accepted-offer fallback, empty state, journey stepper |
| P0-9 | Auth | `/reset-password` route missing | `App.jsx:42-46` | Standalone token reset page + invalid/expired state + strength meter | DONE (consolidated) — `/forgot-password` is a 3-step flow (email → OTP → new password; `auth.jsx:412-448`) covering PHP `forgot_password`+`reset_password`; strength meter only = P3 polish |

## P1 — High

### Public/Auth
| # | Gap | Evidence | Status |
|---|---|---|---|
| P1-1 | PublicNav ignores auth state (no Dashboard/bell) | `public.jsx:31-58` vs `navbar.php:65-89` | TODO |
| P1-2 | Companies verification badge hardcoded verified | `public.jsx:757` | TODO |
| P1-3 | Home/About/Companies statistics hardcoded | `public.jsx:215,338,410,711,786` | TODO |
| P1-4 | Jobs public: Save/bookmark button missing | `public.jsx:658-701` | TODO |
| P1-5 | Verify OTP: no 6-box UI, no expiry timer | `auth.jsx:375-410` | TODO |
| P1-6 | Forgot password: dropdown vs radio cards; no OTP boxes/timer/strength | `auth.jsx:412-448` | TODO |
| P1-7 | OAuth role-completion screen missing | `auth.jsx:450-470` vs `google-complete.php` | DONE (Register prefills email/name from `?google=1`, role cards + notice) |
| P1-8 | Login exposes admin tab + Google button not in PHP | `auth.jsx:146-151` | Intentional (MERN adds admin role) |

### Student
| # | Gap | Evidence | Status |
|---|---|---|---|
| P1-9 | Job cards: no save/apply/eligibility/skills/deadline/vacancies | `student1.jsx:182-187`,`public.jsx` | TODO |
| P1-10 | External jobs: no location filter / counts | `student1.jsx:202-212` | TODO |
| P1-11 | Saved jobs: no search/pagination | `student1.jsx:214-223` | TODO |
| P1-12 | Drives: no filters/summary/eligibility/window/pagination | `student2.jsx:8-17` | TODO |
| P1-13 | Drive details: eligibility panel/profile/seat-cap/linked job | `student2.jsx:19-42` | TODO |
| P1-14 | Applications: no pipeline progress | `student2.jsx:44-53` | TODO |
| P1-15 | Application details: no docs download/job snapshot | `student2.jsx:55-69` | DONE |
| P1-16 | Offers: no logo; OfferDetails missing department/workMode | `student3.jsx:206-247`,`shared.jsx:66-124` | DONE (logo via initials; dept/workMode N/A — offers table has no such columns) |
| P1-17 | Education/Projects/Certifications: missing fields + validation | `student4.jsx:84-92` | DONE (stream/university, project dates; qualification select; date/url/number inputs) |
| P1-18 | Preferences: no delete/enum validation | `student4.jsx:142-159` | DONE (enum selects; Clear all via `DELETE /students/preferences`; whitelist + runValidators) |
| P1-19 | Notifications: no tabs/type-filter/search/load-more | `shared.jsx:126-147` | DONE |

### Company
| # | Gap | Evidence | Status |
|---|---|---|---|
| P1-20 | Jobs list: no search/status/approval filter/pagination/stats | `company1.jsx:Jobs` | DONE |
| P1-21 | Job form: skills tag input + model field | `company1.jsx:JobForm` | DONE (tag input + internshipDuration/stipend; skills in JobSkill) |
| P1-22 | Applications: job-selection filter + pagination | `company2.jsx:Applications` | DONE |
| P1-23 | No `/company/selection` page; Under Review transition | `App.jsx:84-103` | DONE (`/company/selection` + nav; Under Review via ApplicationDetails) |
| P1-24 | Questions: no edit/AI generate; results/violations pages | `company2.jsx:AssessmentDetail` | DONE |
| P1-25 | Offers: missing fields + selection dropdown + issue→Offer status | `company2.jsx:OfferForm` | DONE (Selection dropdown; issue action) |
| P1-26 | Interviews: no result field | `company2.jsx:InterviewForm` | DONE (result/status selects; candidate dropdown) |
| P1-27 | Dashboard: missing approvedJobs/newApps/shortlisted/pendingOffers KPIs | `company1.jsx:Dashboard` | DONE |

### TPO
| # | Gap | Evidence | Status |
|---|---|---|---|
| P1-28 | Dashboard: hero/attention/quick-actions/timeline/KPIs | `tpo1.jsx:10` | DONE (full KPI set, Needs-attention, Quick actions) |
| P1-29 | Students: filters/sort/summary/pagination | `tpo1.jsx:40` | DONE (search + branch + placed filters, summary, Pager) |
| P1-30 | Companies: filters/search/summary | `tpo1.jsx:102` | DONE (status chips + search + Pager) |
| P1-31 | Jobs: filters/summary/apps-count + rejection reason | `tpo1.jsx:160` | DONE (search/type/approval + summary + `appsCount` + reject reason prompt) |
| P1-32 | Drives: filters/summary/inline status/reg counts | `tpo2.jsx:9` | DONE (search/status/mode + summary + inline status) |
| P1-33 | Drive details: info header/eligibility/counts | `tpo2.jsx:72` | DONE (info header + eligibility chips + KPI counts) |
| P1-34 | Assessments: filters/counts; attempts page; violations detail | `tpo2.jsx:96` | DONE (KPI counts, search/status, attempts Pager, violations severity) |
| P1-35 | Interviews/Placements/Offers: filters + sort | `tpo2.jsx:107-140` | DONE (status/result/search filters on all three) |
| P1-36 | Announcements: course/branch targeting + edit | `tpo2.jsx:147` | DONE (targetCourse/targetBranch + expiry + edit via PATCH) |
| P1-37 | Audit logs: filters + pagination | `tpo2.jsx:186` | DONE (module/action/search + Pager) |
| P1-38 | Nav: student Notifications; company Post Job/Selection; TPO Verification Requests | `layout.jsx:11-83` | DONE (student Notifications + company Post Job/Selection added; TPO verification is functionally covered inside Companies with pending filter — no separate route needed) |

### Admin
| # | Gap | Evidence | Status |
|---|---|---|---|
| P1-39 | Dashboard: Open Jobs + Pending Applications KPIs | `admin.jsx:10-25` | DONE (`openJobs`, `pendingApps` in tpo.dashboard kpis) |
| P1-40 | Students/Companies/Jobs/Applications table columns + pagination | `admin.jsx:72-177` | DONE (search/status filters + Pager on Users/Students/Jobs/Applications) |
| P1-41 | Admin job detail: apps count/company info/requirements/back | `App.jsx:142` | DONE (`A.AdminJobDetails` — job + company + apps count + skills + back) |
| P1-42 | Contacts: Received timestamp | `admin.jsx:179-187` | DONE |

## P2 / P3 — Medium / Low

- Add design primitives `cc-detail` (`d-item/d-label/d-value`), `cc-stack`, `cc-chip` (`app.css`) and apply to detail/skills/type pills.
- Table↔card parity, count badges, "My Jobs/Drives/Applications" summary chips.
- Palette/font alignment (accent/danger/info, Poppins vs Inter) — decide intentional design or restore.
- Remove hardcoded hex in `admin.jsx`, `AnalyticsCharts.jsx`, `app.css` hovers, `student2.jsx:78` → tokens for dark mode.
- Numbered pagination option vs Prev/Next.
- Icon/hover/animation polish; journey off-by-one; invented extra elements (hero icon row, public job badges).
