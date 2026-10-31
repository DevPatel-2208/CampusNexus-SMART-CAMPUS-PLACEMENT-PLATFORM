# Company UI Audit — CareerConnect MERN vs PHP

## Scope
Complete audit of the Company/Recruiter panel. MERN routes are in `frontend/src/pages/company1.jsx` (Dashboard, Jobs, JobDetails, JobForm, Applications, ApplicationDetails, Shortlisted) and `frontend/src/pages/company2.jsx` (Assessments, AssessmentDetail, Interviews, InterviewForm, Selection, Offers, OfferForm, CompanyProfile, Verification). PHP source: `C:\xampp\htdocs\careerconnect_new\company\`.

## Pages inspected

| # | MERN route | React component | PHP source | Status |
|---|-----------|-----------------|------------|--------|
| 1 | /company | company1.Dashboard | company/dashboard.php | Functional, basic UI |
| 2 | /company/jobs | company1.Jobs | company/manage_jobs.php, jobs.php | Functional, card list |
| 3 | /company/jobs/:id | company1.JobDetails | company/job_details.php | Functional |
| 4 | /company/jobs/new, :id/edit | company1.JobForm | company/create_job.php, edit_job.php | Functional |
| 5 | /company/applications | company1.Applications | company/applications.php | Functional, filters |
| 6 | /company/applications/:id | company1.ApplicationDetails | company/application-details.php, candidate_details.php | Functional, rich detail |
| 7 | /company/shortlisted | company1.Shortlisted | company/shortlisted_candidates.php | Functional |
| 8 | /company/selection | company2.Selection | company/selection.php | Functional |
| 9 | /company/assessments | company2.Assessments | company/assessments.php, create_assessment.php | Functional, inline form |
| 10 | /company/assessments/:id | company2.AssessmentDetail | company/questions.php, assessment_results.php, assessment_violations.php | Functional |
| 11 | /company/interviews | company2.Interviews | company/interviews.php | Functional |
| 12 | /company/interviews/new | company2.InterviewForm | company/schedule_interview.php | Functional |
| 13 | /company/offers | company2.Offers | company/offers.php | Functional |
| 14 | /company/offers/new, :id/edit | company2.OfferForm | company/create_offer.php, edit_offer.php | Functional |
| 15 | /company/offers/:id/letter | (route → OfferLetterPreview) | company/offer_letter.php, offer_pdf.php | Functional |
| 16 | /company/profile | company2.CompanyProfile | company/profile.php | Functional |
| 17 | /company/verification | company2.Verification | company/verification.php | Functional |

## Visual / UX gaps vs premium standard
- Pages use raw Bootstrap classes (`h4`, `cc-card cc-card-body`, `d-flex`) rather than the premium design-system components (`PageHeader`, `SectionCard`, `KpiCard`, `KpiGrid`, `DataTable`, `Toolbar`, `SearchInput`, `SelectFilter`, `DetailGrid`, `Modal`, `Pager`) already available in `components/ui.jsx`.
- Dashboard KPIs use legacy `Stat` with hardcoded hex colors instead of token-driven `KpiCard`.
- Inconsistent page headers; no breadcrumbs/eyebrow on most pages.
- Filters are ad-hoc; no unified Toolbar.
- Lists render as stacked cards even where a table is more appropriate (Applications, Interviews, Offers).
- Forms lack field labels/grouping on several pages (JobForm inputs are placeholder-only).
- No explicit empty/error/retry states on some pages.
- Dark-mode relies on CSS vars (already OK) but several inline styles use hardcoded colors.
- Mobile: some filter rows and card layouts need responsive stacking (already partially handled by Bootstrap grid + cc-* responsive CSS).

## Functional gaps
- All core CRUD and workflows are wired to real backend APIs; no mock data.
- Offer letter preview route exists (`/company/offers/:id/letter` → `OfferLetterPreview`).
- Reports/analytics page for company: not present in MERN (PHP has none dedicated beyond offers); TPO/admin own reports. Documented as N/A.

## Authorization
- Company routes protected by `RoleRoute roles={['company']}`; backend `requireRole('company')` on company endpoints. Preserved.

## Verification status
- Build: PASS (vite build).
- Lint: PASS (eslint src).
- Backend tests: 9 suites / 32 tests PASS.
- Manual responsive: CSS responsive breakpoints present; company pages to be validated after redesign.
