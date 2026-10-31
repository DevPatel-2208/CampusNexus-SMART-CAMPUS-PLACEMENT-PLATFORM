# Database Migration — MySQL → MongoDB

Source: SQL dump pasted by user (MariaDB 10.4.32, DB `careerconnect`, generated Sep 26 2026). 48 tables → 27 Mongoose collections.
Strategy: unify dual legacy/new tables; keep `legacyId` for traceability; never silently discard — all rows migrated or quarantined with reason.

## 1. Table → Collection map
| MySQL table(s) | Mongo collection (model) | Strategy |
|---|---|---|
| `users` | `users` (User) | Direct. `role: student/tpo/company`; `status: active/inactive/blocked`. bcrypt `$2y$` hashes kept verbatim (bcryptjs verifies after `$2y$`→`$2a$` normalize). Preserve `id`→`legacyId`. |
| `admins` + TPO `users(role=tpo)` | `users` (role=tpo merged) | `admins` row (Rahul Mehta) matches `users.id=1` by email → merge into one tpo user, keep `legacyAdminId`. No separate admins collection. |
| `students`(legacy 1–5) + `student_profiles`(users 12–17) | `studentprofiles` (+ `users`) | Legacy `students` rows have no `users` counterpart; create `users` stubs? NO — legacy students table is superseded; migrate `student_profiles` only, and record legacy `students` rows in migration report as superseded-duplicates (same emails? legacy emails differ: `nitya.jaradi@…` vs same? actually same names different ids). Keep `legacyStudentId` where email matches a user. |
| `companies`(legacy) + `companies_new` | `companyprofiles` (+`users`) | `companies_new` is live (user_id FK). Legacy `companies` merged by email → same profile; keep `legacyCompanyId`. |
| `jobs`(legacy 1–6) + `jobs_new`(1–14) | `jobs` | `jobs_new` live. Legacy `jobs` titles overlap but are distinct rows (old schema); migrate `jobs_new` only; legacy `jobs`+`applications`+`interviews`+`saved_jobs`+`notifications` reported as superseded (counts logged, not imported) to avoid double-counting. Rationale documented in report. |
| `applications`(legacy) + `application_events` | — (superseded, counted only) | Same reason. Events for legacy app ids have no new counterpart. |
| `applications_new` | `applications` | Direct. `status` enum 9 values. Preserve `id`→`legacyId`. Unique `(job,student)`. |
| `selections` | `selections` | Direct, unique application. |
| `offers` | `offers` | Direct. Code superset statuses (8) allowed though DB ENUM had 4. |
| `placements` | `placements` | Direct. |
| `placement_drives` + `drive_eligibility` (1-1) | `placementdrives` (eligibility embedded) + `driveeligibility` NOT separate — embedded subdoc `eligibility` | 1-1 + always read together → embed. Keep separate `driveregistrations` (many). |
| `drive_registrations` | `driveregistrations` | Direct, unique (drive,student). |
| `interviews`(legacy) | — (superseded) | Mirrors of `interviews_new` rows (notes say "Legacy mirror"). Counted only. |
| `interviews_new` | `interviews` | Direct. |
| `assessments` / `assessment_questions` | `assessments` / `assessmentquestions` | Referenced (questions many, paginated) → separate collection. |
| `assessment_attempts` / `assessment_answers` | `assessmentattempts` / `assessmentanswers` | Separate; answers reference attempt+question. |
| `exam_violations` | `examviolations` | Direct. |
| `skills` / `student_skills` / `job_skills` | `skills` / `studentskills` / `jobskills` | Direct join collections with unique pairs. |
| `skill_gap` | `skillgaps` | Direct. |
| `education` / `projects` / `certifications` / `resumes` | same names | Direct, indexed by student user id. |
| `career_preferences` (1-1) | `careerpreferences` | Separate collection (sparse updates), unique student. |
| `career_roadmaps` + `roadmap_items` | `careerroadmaps` (items embedded) | 1-few, always together → embed `items[]`. |
| `saved_jobs`(legacy) | — (superseded) | Counted only. |
| `saved_jobs_new` | `savedjobs` | Direct, unique (student,job). |
| `job_alerts` | `jobalerts` | Direct. |
| `notifications`(legacy) | — (superseded) | Counted only. |
| `notifications_new` | `notifications` | Direct (`user`, `type`, `referenceId`, `isRead`, `priority`). |
| `announcements` | `announcements` | Direct. |
| `contacts` | `contacts` | Direct. |
| `support_tickets` (empty) | `supporttickets` | Schema only. |
| `audit_logs` | `auditlogs` | Direct (`user` nullable → SET NULL preserved as null). |
| `email_verification_otps` / `password_reset_otps` / `password_resets` | `emailverificationotps` / `passwordresetotps` | OTP hashes re-hash? NO — sha256 hashes migrate verbatim but all expired (Sep 2026) → migrated as expired records; live OTPs start fresh. `password_resets` empty → schema only. |
| `external_jobs_cache` (empty) | `externaljobscache` | Schema only + TTL index. |
| `mail_queue` (empty) | — | Not migrated; MERN sends synchronously via Nodemailer (documented). |

## 2. Type conversions
- `INT PK` → `legacyId:Number` (unique sparse) + new `ObjectId`. All FKs remapped via id-maps (users, jobs, companies, drives, applications, assessments, questions, attempts).
- `ENUM` → Mongoose `enum` validator (same values; offers extended to 8).
- `DECIMAL(4,2)` (cgpa) → `Number` (round 2). `YEAR` → `Number`. `DATE/DATETIME/TIMESTAMP` → `Date` (MySQL `+00:00` dump vs app `+05:30`: stored instants are absolute — no shift; display in IST on frontend).
- `TEXT` CSV (`allowed_branches`) → kept as CSV string + accessor returning array (parity with PHP `explode`), avoiding query rewrites.
- `TINYINT(1)` (is_read) → `Boolean`. `JSON-ish TEXT` (question_order) → `Mixed`.
- Passwords: bcrypt `$2y$10$…` kept; login normalizes prefix for bcryptjs.

## 3. Relationship decisions (embed vs reference)
- Embed: drive eligibility (1-1, co-read), roadmap items (1-few, co-read).
- Reference: everything else (many-side growth, independent pagination, cross-role queries, integrity needs).
- Denormalized snapshots: `applications` keeps `jobTitle/companyName` snapshot? NO — populate at read; keeps single source of truth.

## 4. Migration utility (`backend/scripts/migrate-mysql-to-mongodb.js`)
- No MySQL server required: parses the SQL dump file directly (`--sql "C:\Users\DEV PATEL\Downloads\careerconnect (1).sql"`), extracting `INSERT INTO` tuples with a tokenizer handling quotes/NULL/`current_timestamp()`.
- Modes: `--dry-run` (parse + validate + counts, no writes), default live with `--mongo <uri>`.
- Safety: wipes NOTHING; uses upserts keyed by `legacyId` → safe re-run; `--fresh` flag required to drop collections first.
- Order: users → profiles/companies → skills → jobs → jobSkills → drives(+elig) → applications → selections/offers/placements → interviews → assessments/questions/attempts/answers/violations → student data (education/skills/projects/certs/resumes/prefs/roadmaps/alerts/saved/gaps) → notifications/announcements/contacts/tickets/audit/otps.
- Validation: per-table parsed vs inserted vs skipped counts; FK orphan detection (e.g., `applications_new.student_id` must map to a user, else quarantine); duplicate detection (unique pairs); error log `migration-errors.json`; final report table + recovery notes.
- Recovery: re-run is idempotent (upsert on legacyId); quarantined rows listed with reasons; original SQL file never modified.

## 5. Seed (`backend/scripts/seed.js`)
- Dev-only demo accounts (tpo/student/company) + 2 jobs + 1 drive, guarded by `ALLOW_SEED=true` and refusal on non-empty DB unless `--force`. Never replaces migrated data.

## 6. Assumptions & quarantines
1. Legacy tables (`jobs/applications/interviews/saved_jobs/notifications/companies/students/application_events`) are superseded mirrors — counted, not imported (avoids doubling 6 legacy applications vs 16 live ones).
2. `offers.status` widened to 8 values (code superset) — old rows (`accepted/pending`) fit.
3. `placement_drives` rows lack `start_time/end_time/max_students` in this dump (pre-v2 migration) → default null/unlimited.
4. All OTP rows expired → imported as history; fresh OTPs issued on demand.
5. `audit_logs.user_id` nulls preserved (ON DELETE SET NULL semantics).
6. Timezone: instants preserved; UI renders Asia/Kolkata.
7. Infrastructure/dead tables (verified zero PHP references, safely not imported as collections):
   - `mail_queue` — internal async-mail outbox (`includes/mailer.php` queue+flush); MERN sends directly via Nodemailer (SMTP configured in `.env`), so no queue collection is needed.
   - `password_resets` — legacy token-link reset flow (`auth/reset-password.php`); superseded by the OTP reset flow (`password_reset_otps` → history; fresh OTPs on demand).
   - `external_jobs_cache` — runtime cache with no PHP readers; MERN fetches external jobs live (`GET /api/v1/external-jobs`), cache regenerates at runtime.
   - `support_tickets` — no PHP file or query references it anywhere in `careerconnect_new`; dead table, not migrated (documented here instead of silently dropped).
