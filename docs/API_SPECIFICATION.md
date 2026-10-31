# API Specification — CareerConnect MERN (`/api/v1`)

Base URL: `http://localhost:5000/api/v1` (frontend `VITE_API_URL`). Auth: Bearer access JWT (`Authorization: Bearer <token>`) + refresh in HttpOnly cookie `cc_refresh`. All errors: `{ "success": false, "message", "errors?": [{field,message}] }`. Success: `{ "success": true, "data", "pagination?": {page,limit,total,pages} }`.

## Health
- `GET /health` → `{ success, data: { status:'ok', db, time } }`

## Auth `/auth`
| Method & Path | Body | Auth | Notes |
|---|---|---|---|
| `POST /auth/register` | `{name,email,password,confirm,role: student\|company}` | public (rate-limited) | Creates inactive user + profile + OTP; 201 + `pendingVerification:true` |
| `POST /auth/login` | `{email,password,role?}` | public (rate-limited) | 403 `EMAIL_NOT_VERIFIED` if unverified (OTP re-issued); updates lastLogin |
| `POST /auth/logout` | — | access | Clears refresh cookie |
| `POST /auth/refresh` | — (cookie) | refresh cookie | Rotates refresh, returns access |
| `GET /auth/me` | — | access | Current user + profile summary |
| `POST /auth/verify-email` | `{userId,email,code}` | public (rate-limited) | 410 expired, 429 locked (≥5 attempts) |
| `POST /auth/resend-otp` | `{userId?,email?}` | public (60s cooldown → 429 + `resendAfter`) | |
| `POST /auth/forgot-password` | `{email,role}` | public | Generic message (anti-enumeration); issues OTP if account exists |
| `POST /auth/verify-reset-otp` | `{email,role,code}` | public | → `resetToken` (10 min, single-use) |
| `POST /auth/reset-password` | `{email,role,resetToken,password,confirm}` | public | Strict strength; invalidates OTP |
| `PATCH /auth/change-password` | `{currentPassword,password,confirm}` | access | |
| `PATCH /auth/profile` | `{name}` | access | |

## Students `/students`, `/education`, `/student-skills`, `/projects`, `/certifications`, `/resumes`, `/preferences`, `/job-alerts`
- `GET /students/me`, `PATCH /students/me` (course/branch/semester/cgpa/backlogs/passing_year/phone/dob/gender/address/city/about), `POST /students/me/photo` (multipart image ≤2MB)
- `GET/POST /education`, `PATCH/DELETE /education/:id` (ownership)
- `GET /skills` (public list), `GET/POST /student-skills` (`skillId|skillName`, proficiency enum), `DELETE /student-skills/:skillId`
- CRUD `/projects`, `/certifications` (ownership)
- `GET/POST /resumes` (single active; multipart pdf/doc/docx ≤5MB), `GET /resumes/:id/download` (owner, company-with-application, tpo), `DELETE /resumes/:id`, `GET /resumes/ats` (score breakdown)
- `GET/PUT /preferences` (upsert single row)
- `GET/POST /job-alerts`, `DELETE /job-alerts/:id`, `GET /job-alerts/:id/matches`

## Jobs `/jobs`
- `GET /jobs?search=&location=&jobType=&workMode=&page=&limit=&sort=` → only `status=Open, approvalStatus=approved, deadline>=today` for students/public; tpo/company see all with `?scope=all` (role-gated)
- `GET /jobs/recommended` (student; weighted score + breakdown)
- `GET /jobs/:id`, `GET /jobs/:id/eligibility` (student; `{eligible,reasons[]}`)
- `GET /external-jobs?q=&location=` (student; internal top-20 + cached/live Arbeitnow)

## Saved jobs `/saved-jobs` (student)
- `GET/POST /saved-jobs` (`{jobId}`; job must be Open+approved+future), `DELETE /saved-jobs/:jobId`

## Applications `/applications`
- `POST /applications` (student; `{jobId,driveId?,coverLetter?}`; server eligibility + dup 409)
- `GET /applications/mine` (student; `?status=`), `GET /applications/:id` (owner/company-of-job/tpo)
- `PATCH /applications/:id/status` (tpo/company-of-job; enum transition; Rejected allows reason; creates notification + audit)

## Drives `/drives`
- `GET /drives` (student: upcoming-ish + registration window; tpo/company: all, filters)
- `POST /drives` (tpo; + `eligibility{}` embedded), `GET /drives/:id`, `PATCH /drives/:id`, `DELETE /drives/:id` (tpo)
- `PUT /drives/:id/eligibility` (tpo), `GET /drives/:id/eligibility` (student → `{eligible,reasons[]}`)
- `POST /drives/:id/register` (student; guards dup/closed/ineligible/full), `GET /drives/:id/registrations` (tpo/company-of-drive), `PATCH /drives/:id/registrations/:regId` (tpo; registered/shortlisted/rejected/selected)

## Interviews `/interviews`
- `GET /interviews/mine` (student own), `GET /interviews/company` (company own), `GET /interviews` (tpo all; filters mode/result/status)
- `POST /interviews` (company; `{applicationId,roundName,date,time,mode,meetingLink?,location?,interviewer?,notes?}`; past-date block; Online needs link; flips app→Interview; notifies student)
- `PATCH /interviews/:id` (company-own/tpo), `DELETE /interviews/:id` (company-own/tpo)

## Assessments `/assessments`, `/attempts`
- `GET /assessments` (student: active + applied-job only; company: own; tpo: all; `?jobId=&status=`)
- `POST /assessments` (company; config validation), `PATCH /assessments/:id` (company-own; active→draft on structural edit), `POST /assessments/:id/publish` (company-own; active + notifies applicants), `DELETE /assessments/:id` (company-own draft only)
- CRUD `/assessments/:id/questions` (company-own; correctAnswer A-D; dup-question guard)
- `POST /assessments/:id/start` (student; applied-job gate; single active else resume; returns questions WITHOUT correct answers + shuffled display order)
- `POST /attempts/:id/answer` (`{questionId,selected:A-D|null}`; active + not expired), `POST /attempts/:id/heartbeat`, `POST /attempts/:id/violation` (`{type,description?,metadata?}`; warn/flag/BLOCK≥3 auto-submit), `POST /attempts/:id/submit` (deterministic scoring; negative marking honored; clamps ≥0)
- `GET /attempts/:id/result` (owner/company-of-assessment/tpo; correct answers only after submit)
- `GET /assessments/:id/results`, `GET /assessments/:id/violations` (company-own/tpo)

## Selections/Offers/Placements
- `POST /selections` (company; `{applicationId,status:Selected\|Rejected\|On Hold,remarks?}`; Rejected needs remarks; syncs application), `GET /selections` (company-own/tpo)
- `POST /offers` (company; draft; letter upload ≤5MB), `GET /offers/company` (company), `GET /offers/mine` (student), `GET /offers` (tpo all), `POST /offers/:id/issue` (company; draft→issued+notify), `POST /offers/:id/withdraw` (company-own/tpo; reason required), `POST /offers/:id/accept` (student-own; creates placement + placed + app→Placed), `POST /offers/:id/reject` (student-own; reason 5–1000ch)
- `GET /placements/mine` (student), `GET /placements` (tpo; company-own filter)

## Company `/company`
- `GET /company/dashboard` (company), `GET/PATCH /company/profile`, `POST /company/profile/logo` (image ≤2MB), `GET/POST /company/documents` (pdf/img/doc ≤5MB), `DELETE /company/documents/:id`
- `POST /company/jobs` (→pending + skills[] + TPO notify), `GET /company/jobs` (own; filters), `PATCH /company/jobs/:id` (own), `POST /company/jobs/:id/toggle` (Open↔Closed), `DELETE /company/jobs/:id` (own, no applications)
- `GET /company/applications` (`?jobId=&status=`; auto-rank score), `GET /company/applications/:id`, `GET /company/shortlisted`

## TPO `/tpo`
- `GET /tpo/dashboard`, `GET /tpo/analytics`
- `GET /tpo/students?search=&branch=&course=&status=` + `GET /tpo/students/:id` + `PATCH /tpo/students/:id/status` (active/inactive/blocked)
- `GET /tpo/companies` + `POST /tpo/companies/:id/verify` (`{status:verified\|rejected\|suspended}`)
- `GET /tpo/jobs` + `POST /tpo/jobs/:id/approve` (`{status:approved\|rejected}`)
- `GET /tpo/applications?status=&jobId=`, `GET /tpo/attempts`, `GET /tpo/violations`, `GET /tpo/assessments`
- `GET /reports/:type?type=students|companies|placements|applications|branch|drives|interviews|selections|offers|audit&format=csv` (CSV download)

## Announcements/Notifications/Contact/AI/Audit
- CRUD `/announcements` (tpo) + `POST /announcements/:id/publish` (fanout once); `GET /announcements/active` (all roles; targeted)
- `GET /notifications?unread=` + `GET /notifications/unread-count` + `PATCH /notifications/:id/read` + `PATCH /notifications/read-all` + `DELETE /notifications/:id` (all scoped to self)
- `POST /contact` (public; rate-limited), `GET /contact` + `PATCH /contact/:id` (tpo; New/Read/Resolved)
- `POST /ai/chat` (student; `{message}`; 2s rate-limit; Groq if `GROQ_API_KEY`, else offline fallback; 403 without key is documented, still 200 with fallback note)
- `GET /audit-logs?module=&action=&page=` (tpo)
