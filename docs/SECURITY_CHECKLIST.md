# Security Checklist — CareerConnect MERN

## Implemented (backend)
- [x] Passwords: bcrypt (12 rounds) via bcryptjs; `$2y$` legacy hashes verified via prefix normalize; never returned in API (select `-password`); strength enforced (≥8 + upper + lower + digit + special, blocklist) on register/reset/change.
- [x] Auth: short-lived access JWT (15m) + rotating refresh JWT (7d) in HttpOnly SameSite=Lax cookie (Secure in production); logout clears + revokes (tokenVersion bump); refresh reuse detected → revoke all.
- [x] OTP: 6-digit `crypto.randomInt`, stored SHA-256 only, 10-min expiry, ≥5 attempts lock, 60s resend cooldown, invalidated after use, single active OTP per scope; generic responses to prevent enumeration on forgot-password.
- [x] RBAC: `protect` + `requireRole(...)` + resource ownership checks (student own rows; company own jobs/apps; tpo global). Every route tested for cross-role 403.
- [x] Validation: express-validator on all inputs (email, enums, ranges: CGPA 0–10, backlogs 0–50, year 1950–2100, phone patterns, URL, dates not-past where required); centralized `validate` middleware; consistent 400 shape.
- [x] NoSQL injection: `express-mongo-sanitize` (replaces `$`/`.` keys); no raw `$where`; ObjectId validation before queries.
- [x] XSS: no `dangerouslySetInnerHTML` in frontend; user content rendered as text;_ai chat markdown-lite escapes HTML first.
- [x] File uploads: multer memory→disk with random names (`<type>_<id>_<rand>_<ts>.<ext>`), ext+MIME allowlist + magic-number sniff (PDF `%PDF`, PNG, JPG, ZIP for docx), size caps (resume/offer/doc 5MB, images 2MB), `is_uploaded` equivalent, old-file unlink on replace, `uploads/.gitignore`d, served with `Content-Disposition` + ownership check + realpath containment.
- [x] Headers/CORS/rate-limit: helmet, CORS allowlist (`CLIENT_URL`), 100 req/15min global, 10/15min auth, 5/hr OTP-sensitive, 2s AI chat per-user; `express-rate-limit` with `Retry-After`.
- [x] Secrets: `.env` never committed (`.gitignore`); `.env.example` placeholders; `validateEnv()` fails fast on missing `MONGO_URI/JWT_*` in production; SMTP creds env-only; Groq key env-only.
- [x] Audit: `auditlogs` written for login, register, verify, job create/approve, company verify, application status, selection, offer issue/withdraw/accept, drive create/status, announcement publish, contact triage (actor, module, description, IP).
- [x] Errors: production hides stack; 404/403/409/410/422/429 used correctly; no OTP/password/token/SMTP secret in logs (OTP only `issued for user <id>`).
- [x] CSRF: JWT Bearer (not cookie) for API auth → no CSRF surface; refresh cookie is SameSite=Lax + rotated; state-changing routes require access token.

## Fixed vs PHP
- `job_alerts` DELETE via GET without CSRF → now `DELETE` + JWT + ownership.
- Google OAuth dead constants → removed (documented in README).
- `external_jobs_cache` unused → now TTL-cached server fetch.
- TPO-only `admin/` shim → explicit `tpo` role gates (no hidden legacy bypass).

## Still requires operator action (NOT code gaps)
- [ ] Set real SMTP creds (`SMTP_HOST/USER/PASS`) — without them OTP email falls back to console log in development only; production refuses to start with `MAIL_REQUIRED=true` unset creds (see README).
- [ ] Set `GROQ_API_KEY` for live AI chat (offline fallback otherwise — documented on the widget).
- [ ] MongoDB Atlas IP allowlist / local `mongod` (commands in README).
- [ ] Review `JWT_ACCESS_SECRET/JWT_REFRESH_SECRET` strength (≥32 chars) before production.
