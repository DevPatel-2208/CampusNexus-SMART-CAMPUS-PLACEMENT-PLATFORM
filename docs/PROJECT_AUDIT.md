# CareerConnect — Source Audit (PHP → MERN)

Source: `C:\xampp\htdocs\careerconnect_new` · 176 PHP files · 245 total files · DB: `careerconnect` (MariaDB 10.4.32, 48 tables)
Destination: `D:\DEV\MERN\careerconnect` · Stack: React+Vite / Express / Mongoose / JWT+cookies / Nodemailer SMTP / bcrypt

## 1. Entry points & routing (no framework, file-per-page)
Public: `index.php`, `jobs.php`, `job-details.php`, `companies.php`, `about.php`, `contact.php` (AJAX+POST → `contacts`), `login.php`/`register.php` (canonical; `auth/*.php` are shims), `verify_otp.php` → `auth/verify-email.php`, `logout.php`.
Role areas: `student/` 38 files · `tpo/` 32 · `company/` 30 · `admin/` 10 (legacy TPO-gated UI) · `actions/` 4 (login/register/exam/notification AJAX) · `includes/` 25 · `config/` 8 · `student/api/ai_chat.php`.

## 2. Auth & session (PHP `$_SESSION`, no JWT)
- `config/session.php`: secure cookie (HttpOnly, SameSite=Lax, Secure on https), `csrf` token, 2h rolling regen.
- `cc_bridge_session()` (`config/database.php`): bridges `users.id/role` ↔ legacy `students/student_id`, `companies/company_id`, `admins/admin_id` by email.
- `includes/auth_check.php` (login required) + `includes/role_check.php::check_role([...])` + `functions.php::require_login/require_role`.
- Login (`actions/login_action.php`): CSRF; matches ALL `users` rows by email, `password_verify` each; role tab is UX-only (DB authoritative); blocks `status != active`; unverified email → issue OTP + force `auth/verify-email.php`; `session_regenerate_id`, `last_login=NOW()`.
- Register (`actions/register_action.php`): only `student|company` (TPO institution-created); name 3–120, email ≤190 + `FILTER_VALIDATE_EMAIL`, pass ≥8 + letter+digit + confirm; insert `users(status='inactive')` + `student_profiles(ENR######, completion 20)` or `companies_new(pending)` + notify all TPOs + issue OTP.
- Passwords: `password_hash(PASSWORD_DEFAULT)` everywhere; reset flows re-verify with `password_verify` proof + mirror to legacy tables. Reset strength: ≥8, upper+lower+digit+special, blocklist.
- `admin/` uses `cc_legacy_gate('tpo',...)` — effectively TPO-only, no separate admin role in `users` (admins live in legacy `admins` table).

## 3. OTP (both SHA-256 hashed, 6-digit `random_int`, 10-min expiry, 5 attempts, 60s cooldown)
- Email verify (`email_verification_otps`, per `user_id`): `cc_issue_email_otp()` invalidates prior (`verified_at=NOW()`), `INSERT … DATE_ADD(NOW(), INTERVAL 10 MINUTE)`; verify checks expiry → attempts≥5 (429) → `hash_equals(sha256)`; wrong → `attempts+1`; success → txn `verified_at=NOW()` + `users(status='active', email_verified_at=NOW())`.
- Password reset (`password_reset_otps`, per `email+role`): same policy; success sets `pwreset_verified` session step. Separate link flow (`password_resets.token_hash=sha256`, single-use `used_at`, ~30 min).
- Mail: `includes/mailer.php` PHPMailer SMTP → fallback `mail()`; `mail_queue(queued|sending|sent|failed, 3 attempts)`; `config/mail.local.php` (Gmail app-password) overrides env.

## 4. Business modules found
- **Students**: dashboard (match engine `cc_match_breakdown`, journey Profile→Placed), jobs browse (eligibility badge: Eligible/Complete profile/Low CGPA/Backlogs high/Deadline over), drives + `drive_details` register (dup/closed/ineligible/full guards), applications pipeline (9 statuses), assessments center (only for applied jobs), interviews read-only, offers via `offer_details` (accept→creates `placements`+`placed`; reject needs 5–1000ch reason), resume single-row CRUD, ATS score, saved jobs, skills (custom+proficiency), education/projects/certifications CRUD, career_preferences upsert, job_alerts (delete via GET — CSRF gap, fixed in MERN), recommended_jobs (weighted match), external_jobs (live Arbeitnow API, no key), placement_status, notifications.
- **Company**: dashboard KPIs, create_job (→`pending` + `job_skills` + TPO notify; duplicate `create-job.php`), manage/jobs + Open/Close toggle, applications (auto-rank `cc_candidate_match`), shortlisted funnel, selection (`Selected/Rejected/On Hold`; Rejected needs reason; On Hold leaves app unchanged), create_offer (draft→issue; letter upload), offers + withdraw, interviews list + schedule (flips app→`Interview`; Online needs link), assessments + create_assessment (config) + questions (manual + Groq AI regen; any edit flips `active→draft`; publish notifies applicants) + results/violations, profile+logo, verification docs, notifications.
- **TPO**: dashboard KPIs, students/companies registries, company_verification (verified/rejected/suspended), jobs read-only, job_approval (→approved/rejected + notify), drives CRUD + `drive_eligibility` rules + calendar/history/conflict check (`drive_validation.php`: lifecycle upcoming→registration_open→registration_closed→ongoing→completed, cancelled terminal; venue/company overlap strict; reg must close before drive start), applications global + TPO status override, selections read-only, offers global + withdraw-as-TPO, placements registry, interviews global, assessments monitor, reports (10 CSV/PDF via `includes/pdf.php`), analytics (branch/company/skill charts), announcements (targeted fanout to `notifications_new` once), audit_logs read-only, notifications.
- **Admin/**: read-only mirrors of new tables + `contact-messages.php` (New→Read→Resolved). No writes otherwise.
- **AI**: student-only chatbot (`student/api/ai_chat.php`, Groq `qwen3-8b`, 2s rate-limit, session history 30, offline regex fallback); `includes/ai_engine.php` explainable weights Skills 50 + Location 15 + JobType 15 + Course 10 + Branch 10; ATS + roadmap templates; recruiter `cc_candidate_match`.

## 5. Eligibility engine (exact rules, reproduced in MERN `eligibility.service.js`)
- Job browse badge: profile complete? CGPA ≥ job min? backlogs ≤ max? deadline ≥ today? approval approved + Open.
- Drive register: `min_cgpa` (DECIMAL 4,2, default 0), `max_backlogs` (default 10), `allowed_branches`/`allowed_courses` CSV contains student's branch/course, `passing_year` equals, registration window open, status allows, seats (`max_students` if column exists), no duplicate (`uniq_drive_student`).
- Assessment gate: `assessments.status='active'` + question count>0 + (if `job_id` set → must have `applications_new` row for that job, either new or legacy id resolution).
- Application: job `Open` + `approved` + deadline future + no duplicate (`uniq_app(job_id,student_id)`).

## 6. Assessments & integrity
- Attempt: single `active` per (assessment,student) (`uniq_attempt_status`), else resume; `session_id=random_bytes(32)`; mismatch → `MULTIPLE_SESSION/HIGH` 409. `expires_at=NOW()+duration`; auto-submit on expiry. Submitted permanent → result page.
- Scoring deterministic + shuffle-aware (`mt_srand(attemptId*1000003+qid*7919)`), optional negative marking, blanks never penalised, clamp ≥0, `percentage=round(score*100/max,2)`, `result = percentage>=passing_percentage ? Passed : Failed`; sets `integrity_status='SUBMITTED', status='submitted'`.
- Violations: warn≥1, flag≥2 (`integrity_status='FLAGGED'`), auto-submit+BLOCK≥3. Types: TAB_SWITCH, WINDOW_BLUR, FULLSCREEN_EXIT/DENIED, COPY/PASTE/CUT_ATTEMPT, CONTEXT_MENU, MULTIPLE_SESSION, NETWORK_INTERRUPTION, TIME_EXPIRED, SHORTCUT/PRINTSCREEN/SAVE_FAIL, UNKNOWN. Client monitors visibility/blur/clipboard/contextmenu/keys/fullscreen/offline; server authoritative.
- Questions: MCQ/True-False/Technical/Aptitude/Logical Reasoning; difficulty Easy/Medium/Hard/Mixed; categories Technical/Aptitude/Logical Reasoning/Programming/Mixed.

## 7. Status enums (all preserved)
applications_new: Applied, Under Review, Shortlisted, Assessment, Interview, Selected, Rejected, Offer, Placed · jobs_new: Open/Closed + approval pending/approved/rejected · drives: upcoming, registration_open, registration_closed, ongoing, completed, cancelled · drive_registrations: registered/shortlisted/rejected/selected + eligible/not_eligible · interviews_new: scheduled/completed/cancelled/rescheduled; result Pending/Selected/Rejected/On Hold; mode Online/Offline/Hybrid (+Telephonic/Video legacy); round Technical/HR/Final/Other · offers: draft/pending/issued/viewed/accepted/rejected/expired/withdrawn (DB ENUM subset pending/accepted/rejected/expired — code superset) · placements: Placed/Joined/Not Joined · assessments: active/inactive/draft; attempts active/submitted; result Passed/Failed/Pending · selections: Selected/Rejected/On Hold · companies_new: pending/verified/rejected/suspended · users: student/tpo/company + active/inactive/blocked · student_profiles: not_placed/placed · job_type ×5, work_mode Onsite/Remote/Hybrid, proficiency ×4, contacts New/Read/Resolved, announcements all/student/company/tpo + active/inactive/draft, notifications is_read + priority low/normal/high.

## 8. Uploads (5 writers; TPO/admin none)
resumes `student_{uid}_resume_{hex}_{time}.pdf|doc|docx` 5MB finfo+MIME, replace-unlink, realpath guard · profile photos `uploads/profile_photos/` images 2MB + getimagesize · company logos `logo_{cid}_{hex}.jpg|jpeg|png|webp` 2MB finfo+getimagesize, mkdir 0750 · company docs `doc_{cid}_{hex}.pdf|jpg|jpeg|png|doc|docx` 5MB strict ext↔MIME · offer letters `offer_{cid}_{hex}_{time}.pdf|doc|docx` 5MB. `uploads/.htaccess` denies php execution + no indexes. MERN: same rules via multer + magic-number check, random names, per-type dirs, no client filename trust.

## 9. Assets/theme
Bootstrap 5.3.7 CDN + bootstrap-icons + Poppins + CSS vars (`--cc-primary:#4F46E5`, bg #F8FAFC, radius 14px, container 1280px). Per-module premium CSS. MERN keeps indigo theme as design tokens + Bootstrap 5 + custom CSS vars + dark mode.

## 10. Notable gaps fixed in MERN
`job_alerts` delete via GET (no CSRF) → DELETE with auth; Google OAuth constants unused → omitted (documented); `external_jobs_cache` unused (live fetch) → MERN caches Arbeitnow in Mongo with TTL; legacy dual tables → unified collections with `legacyId` maps; `offers` DB ENUM narrower than code → single MERN enum of 8.

## 11. Smart Welcome Alerts & Confetti Celebrations (MERN)
Implemented premium post-auth celebration flow across the existing MERN stack (no new project; all existing login/register/OTP/OAuth/dashboard/RBAC behavior preserved).

**Backend (`backend/`)**
- `src/models/User.js`: added `firstLogin: { Boolean, default: true }`. Tracks whether the user has ever logged in successfully; existing DB accounts (field absent) are treated as returning users.
- `src/controllers/auth.controller.js` `login()`: after password/verification checks pass, atomically flips `firstLogin` true→false via `updateOne({ _id, firstLogin: true }, { $set: { firstLogin: false } })`. Only one concurrent request can match, so simultaneous logins cannot both classify a user as first-time. Returns `isFirstLogin` in the login response; `lastLogin` is still recorded. Google OAuth `googleCallback()` performs the same atomic flip and passes `?firstLogin=1` to `/oauth/callback` for first-time Google sign-ins. No password/role/authorization rules changed.
- `src/routes/auth.routes.js`: unchanged.

**Frontend (`frontend/`)**
- `src/services/celebration.js` (new): `fireConfetti()` using `canvas-confetti`. Single short burst, small variant for returning users, respects `prefers-reduced-motion`, re-render guard to prevent double bursts, self-cleaning (no lingering listeners/overlays).
- `src/services/welcome.js` (new): `showWelcomeDialog()` — themed SweetAlert2 dialog with a brand SVG icon, the user's actual name, first-time vs welcome-back copy, and a CTA. Resolves on confirm or dismiss (Escape/close/backdrop) — never traps. Module-level `showing` guard prevents duplicates.
- `src/services/authSuccess.js` (new): `handleLoginSuccess()` — centralized post-login flow: welcome dialog → set profile → navigate to role-specific dashboard (`/student|/company|/tpo|/admin`). Used by both email login and Google OAuth.
- `src/services/alerts.js`: added `showSuccess()` — themed success alert with optional subtle confetti, reused by reset/register/verify.
- `src/context/AuthContext.jsx`: `login()` no longer sets the profile before the welcome flow (prevents `PublicOnly` redirecting over the dialog); added `postLogin`/`setPostLogin`. `setUser` happens after the dialog, immediately before navigation.
- `src/routes/guards.jsx`: `PublicOnly` skips auto-redirect while `postLogin` is true.
- `src/pages/auth.jsx`: `Login`, `OAuthCallback` (Google), `ForgotPassword` reset step, `Register`, and `VerifyEmail` all route through the celebration utilities. Password reset success → "Password Reset Successful!" + confetti → "Go to Login" → `/login`. Registration + email-verified → success + subtle confetti. Failed operations never trigger success alerts/confetti. Dashboard refresh / React re-renders do not replay the welcome.
- `src/styles/app.css`: theme-aware (light/dark), rounded, shadowed, responsive SweetAlert2 welcome/success styling (`--cc-primary:#4F46E5`, `--cc-success:#0F9D6B`), mobile-friendly.

**Verification**
- Frontend: `npm run lint` clean; `npm run build` succeeds.
- Backend: `npm test` — 9 suites, 32 tests pass (including `auth.test.js` register→verify→login, inactive/bad-password, and refresh rotation).

**Acceptance criteria met:** first login → Welcome; subsequent login → Welcome Back; actual name shown; all four roles reach the correct dashboard; dialog precedes dashboard navigation; single reset celebration; failures silent; refresh/re-render never replay; Google OAuth preserved; light/dark + mobile responsive; existing auth/security intact.

