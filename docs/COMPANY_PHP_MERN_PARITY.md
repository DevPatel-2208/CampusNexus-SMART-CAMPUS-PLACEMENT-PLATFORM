# Company PHP → MERN Parity

## Goal
Map every original PHP company page to its MERN counterpart and confirm field/workflow parity. MERN is the implementation target; PHP is the source of truth for fields and business rules.

## Route parity

| PHP file | MERN route | Component | Parity |
|----------|-----------|-----------|--------|
| company/dashboard.php | /company | Dashboard | KPIs + recent apps + verification banner — parity |
| company/manage_jobs.php, jobs.php | /company/jobs | Jobs | list, search, status/approval filters, pagination, toggle, delete — parity |
| company/job_details.php | /company/jobs/:id | JobDetails | details + skills + recent apps — parity |
| company/create_job.php, edit_job.php | /company/jobs/new, :id/edit | JobForm | all fields (title, description, location, qualification, jobType, workMode, deadline, internshipDuration, stipend, salaryMin/Max, vacancies, skills) — parity |
| company/applications.php | /company/applications | Applications | status + job filters, pagination, match score — parity |
| company/application-details.php, candidate_details.php | /company/applications/:id | ApplicationDetails | profile, skills, resume, education, projects, certs, cover letter, actions (shortlist/under review/select/reject/on hold/schedule) — parity |
| company/shortlisted_candidates.php | /company/shortlisted | Shortlisted | list — parity |
| company/selection.php | /company/selection | Selection | list + status filter + draft offer CTA — parity |
| company/assessments.php, create_assessment.php | /company/assessments | Assessments | create + list + publish + delete — parity |
| company/questions.php, assessment_results.php, assessment_violations.php | /company/assessments/:id | AssessmentDetail | questions CRUD, AI generate, results, violations — parity |
| company/interviews.php | /company/interviews | Interviews | list + result/status update — parity |
| company/schedule_interview.php | /company/interviews/new | InterviewForm | schedule with validation — parity |
| company/offers.php | /company/offers | Offers | list + preview/download/edit/issue/withdraw — parity |
| company/create_offer.php, edit_offer.php | /company/offers/new, :id/edit | OfferForm | all fields + file upload — parity |
| company/offer_letter.php, offer_pdf.php | /company/offers/:id/letter | OfferLetterPreview (shared) | preview + download — parity |
| company/profile.php | /company/profile | CompanyProfile | all profile fields + logo upload — parity |
| company/verification.php | /company/verification | Verification | doc upload + list + delete — parity |
| company/notifications.php | /company/notifications | Notifications (shared) | list + read — parity |

## Field parity notes
- Job form preserves internship fields (duration, stipend) toggled by jobType === 'Internship'.
- Assessment form preserves negative marking toggle + negativeMarks.
- Offer form preserves selectionId/studentId/jobId resolution and file upload.
- Application status change actions preserved (shortlist, under review, select, reject w/ reason, on hold, schedule interview).
- Interview result/status updates preserved.

## Business rules preserved
- Jobs go to TPO approval (approvalStatus pending/approved/rejected); rejection reason shown.
- Assessments move to draft on any question edit; publish notifies applicants.
- Offers editable only in draft/pending; issue/withdraw gated by status.
- Company scoped to own jobs/applications via backend authorization.

## Gaps
- No dedicated company "Reports/Analytics" page in MERN (PHP has none company-side beyond offers). N/A.
- Company settings route (`/company/settings`) maps to shared Settings component — parity via shared page.
