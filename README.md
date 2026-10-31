# CareerConnect — Modern Campus Placement & Internship Management System

[![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?logo=react&logoColor=black)](https://vitejs.dev/)
[![Backend](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-339933?logo=node.js&logoColor=white)](https://expressjs.com/)
[![Database](https://img.shields.io/badge/Database-MongoDB%20Atlas-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/cloud/atlas)
[![Deployment](https://img.shields.io/badge/Deployment-Netlify%20%2B%20Render-00C7B7?logo=netlify&logoColor=white)](https://netlify.com/)

CareerConnect is a production-grade campus recruitment portal and talent pipeline system. It seamlessly bridges university students, verified corporate recruiters, and Training & Placement Officers (TPO) with automated eligibility verification, placement drives, proctored assessments, real-time application pipelines, offer letters, and AI-powered career matching.

---

## Architecture & Technology Stack

| Tier | Technologies | Deployment Target |
|---|---|---|
| **Frontend** | React 18, Vite, React Router v6, Bootstrap 5, Framer Motion, Lucide Icons, Recharts | **Netlify** (Static & SPA) |
| **Backend** | Node.js (v18+), Express.js, Mongoose ODM, JWT, Helmet, CORS, Morgan | **Render** (Web Service) |
| **Database** | MongoDB Atlas (Production) / Local MongoDB Community Edition | **MongoDB Atlas** |
| **Integrations** | Groq Cloud AI / OpenAI API (Chatbot), Nodemailer (SMTP OTPs), Built-in PDF Engine | Cloud APIs |

---

## Core Features

- **3 Dedicated Role Portals:**
  - **Student Portal:** Academic profiles, multi-tier eligibility checks, 1-click applications, online assessments with tab-switch detection, interview schedules, offer letter review & acceptance.
  - **Company Portal:** Organization profile, job postings, candidate resume screening, drive scheduling, technical interviews, offer letter generation.
  - **TPO Central Administration:** Company verification, job approvals, campus placement drive calendar, student academic audits, exam integrity monitoring, recruitment analytics, CSV/PDF reports.
- **Enterprise Security:**
  - Dual-token JWT (short-lived access + httpOnly rotating refresh token).
  - Rate limiting with brute-force protection.
  - NoSQL injection sanitization (`express-mongo-sanitize`).
  - Strict CORS validation with multi-origin parsing.
  - Role-based route authorization guards.
- **AI Career Integration:** Real-time interview coaching, technical query resolution, and resume advice powered by Groq / OpenAI LLM APIs with offline fallbacks.

---

## Directory Structure

```text
CareerConnect/
│
├── frontend/                     # React + Vite Frontend
│   ├── public/                   # Static public assets & _redirects (SPA routing)
│   │   └── _redirects            # Netlify /* /index.html 200 rule
│   ├── src/
│   │   ├── components/           # UI components, layout, public navbar & footer
│   │   ├── context/              # AuthContext & ThemeContext
│   │   ├── hooks/                # useUnread, useFetch, custom hooks
│   │   ├── pages/                # Student, Company, TPO, Auth, and Public views
│   │   ├── routes/               # RoleRoute & ProtectedRoute guards
│   │   ├── services/             # Centralized Axios API client (api.js)
│   │   └── styles/               # CSS modules & responsive styles
│   ├── .env.example              # Frontend environment template
│   ├── .gitignore                # Frontend git ignore rules
│   ├── netlify.toml              # Netlify build & redirect configuration
│   ├── package.json              # Frontend dependencies & build scripts
│   └── vite.config.js            # Vite configuration & dev proxy
│
├── backend/                      # Node.js + Express REST API
│   ├── src/
│   │   ├── config/               # Environment (env.js) & Database (db.js)
│   │   ├── controllers/          # Business logic handlers
│   │   ├── middleware/           # Auth JWT, Role checks, Multer uploads
│   │   ├── models/               # Mongoose schemas (User, Job, Drive, Application, etc.)
│   │   ├── routes/               # API route definitions
│   │   ├── services/             # Email, PDF generation, AI chatbot services
│   │   ├── utils/                # Winston logger & error utilities
│   │   ├── app.js                # Express app initialization & middleware
│   │   └── server.js             # HTTP server listener & graceful shutdown
│   ├── scripts/                  # Seed script & MySQL migration utilities
│   ├── tests/                    # Jest + Supertest test suites
│   ├── uploads/                  # Upload directories (resumes, logos, photos)
│   ├── .env.example              # Backend environment template
│   ├── .gitignore                # Backend git ignore rules
│   └── package.json              # Backend dependencies & run scripts
│
├── docs/                         # Architecture documentation & API specs
├── .gitignore                    # Master root git ignore
├── netlify.toml                  # Root-level Netlify monorepo deployment config
├── package.json                  # Root convenience scripts
└── README.md                     # Comprehensive project documentation
```

---

## Local Development Setup

### Prerequisites
- **Node.js** v18.0.0 or later (`node -v`)
- **npm** v9.0.0 or later (`npm -v`)
- **MongoDB** local instance (`mongod`) or a free [MongoDB Atlas Cluster](https://www.mongodb.com/cloud/atlas)

### 1. Clone & Install Dependencies

```bash
# Clone the repository
git clone https://github.com/your-username/careerconnect.git
cd careerconnect

# Install all dependencies (or run individually in frontend/ and backend/)
npm run install:all
```

Or install in each directory:
```bash
cd backend && npm install
cd ../frontend && npm install
```

---

### 2. Configure Environment Variables

#### Backend (`backend/.env`)
Copy the backend template:
```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:
```env
PORT=5002
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/careerconnect
CLIENT_URL=http://localhost:5173

# Strong random secrets (at least 32 characters in production)
JWT_ACCESS_SECRET=your-secure-access-secret-at-least-32-chars-long
JWT_REFRESH_SECRET=your-secure-refresh-secret-at-least-32-chars-long
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# SMTP (Optional in local dev - OTP codes log to backend console if blank)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
MAIL_FROM="CareerConnect <no-reply@careerconnect.local>"
MAIL_REQUIRED=false

# Optional AI Features (Groq API Key)
GROQ_API_KEY=
GROQ_MODEL=qwen/qwen3.8-27b
```

#### Frontend (`frontend/.env`)
Copy the frontend template:
```bash
cp frontend/.env.example frontend/.env
```

Edit `frontend/.env`:
```env
VITE_API_BASE_URL=http://localhost:5002/api/v1
```

---

### 3. Seed Demo Data (Optional)

To populate the database with demo companies, approved jobs, sample students, and placement drives:
```bash
cd backend
npm run seed
```
*(Requires `ALLOW_SEED=true` in `backend/.env`).*

---

### 4. Run Locally

Open two separate terminals:

**Terminal 1 — Backend API:**
```bash
cd backend
npm start
# Server listens on http://localhost:5002
```

**Terminal 2 — Frontend Application:**
```bash
cd frontend
npm run dev
# Vite runs on http://localhost:5173
```

Navigate to **`http://localhost:5173`** in your browser.

---

## Production Deployment Guide

### A. Database Setup: MongoDB Atlas

1. Create a free M0 cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Under **Database Access**, create a user with `Read and write to any database` privileges.
3. Under **Network Access**, add IP `0.0.0.0/0` (Allow access from anywhere) so Render can connect.
4. Click **Connect** → **Drivers** → Copy the SRV connection string:
   ```text
   mongodb+srv://<username>:<password>@cluster0.mongodb.net/careerconnect?retryWrites=true&w=majority
   ```

---

### B. Backend Deployment: Render

1. Log in to [Render](https://render.com/) and click **New +** → **Web Service**.
2. Connect your GitHub repository.
3. Configure the following settings:
   - **Name:** `careerconnect-api`
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Under **Environment Variables**, add:
   | Key | Value | Note |
   |---|---|---|
   | `NODE_ENV` | `production` | Enables production optimizations & checks |
   | `PORT` | `10000` | Or leave Render default (auto-injected) |
   | `MONGO_URI` | `mongodb+srv://...` | Your MongoDB Atlas connection string |
   | `CORS_ORIGIN` | `https://your-site.netlify.app` | Your deployed Netlify URL (comma-separated if multiple) |
   | `JWT_ACCESS_SECRET` | *32+ random characters* | e.g. `openssl rand -hex 32` |
   | `JWT_REFRESH_SECRET` | *32+ random characters* | e.g. `openssl rand -hex 32` |
   | `JWT_ACCESS_EXPIRES` | `15m` | Token expiration |
   | `JWT_REFRESH_EXPIRES` | `7d` | Refresh expiration |
   | `SMTP_HOST` | `smtp-relay.brevo.com` | Or Gmail / SendGrid SMTP |
   | `SMTP_PORT` | `587` | Standard TLS port |
   | `SMTP_USER` | *your-smtp-username* | Email provider login |
   | `SMTP_PASS` | *your-smtp-password* | App password or API key |
   | `MAIL_FROM` | `"CareerConnect <no-reply@careerconnect.com>"` | Sender address |
   | `MAIL_REQUIRED` | `true` | Requires email delivery for OTPs in production |
   | `GROQ_API_KEY` | *your-groq-api-key* | Optional AI features |
5. Click **Create Web Service**.
6. Once deployed, test your live health endpoint:
   ```text
   https://careerconnect-api.onrender.com/health
   # Returns: {"status":"ok","uptime":...,"service":"CareerConnect Backend API"}
   ```

---

### C. Frontend Deployment: Netlify

1. Log in to [Netlify](https://www.netlify.com/) and click **Add new site** → **Import an existing project**.
2. Connect your GitHub repository.
3. Configure the build settings (these match the included `netlify.toml`):
   - **Base directory:** `frontend`
   - **Build command:** `npm run build`
   - **Publish directory:** `frontend/dist`
4. Under **Site configuration** → **Environment variables**, add:
   | Key | Value |
   |---|---|
   | `VITE_API_BASE_URL` | `https://careerconnect-api.onrender.com/api/v1` |
5. Click **Deploy Site**.
6. Once Netlify finishes deploying:
   - Copy your Netlify URL (e.g. `https://careerconnect-demo.netlify.app`).
   - Return to Render and update `CORS_ORIGIN` with your actual Netlify URL:
     `CORS_ORIGIN=https://careerconnect-demo.netlify.app`

---

## Health Check & Verification Endpoints

The backend includes zero-dependency health monitoring endpoints for Render and uptime pings:

- `GET /health` &rarr; `{"status":"ok","uptime":120,"timestamp":"...","service":"CareerConnect Backend API"}`
- `GET /api/v1/health` &rarr; `{"status":"ok","uptime":120,"timestamp":"...","service":"CareerConnect Backend API"}`

---

## File Uploads & Ephemeral Storage Notice

- In local development, uploaded resumes, logos, and profile photos are stored in `backend/uploads/`.
- **Render Production Note:** Render Web Services have an ephemeral filesystem; files uploaded locally are reset whenever the service redeploys or restarts.
- For permanent production document retention:
  - Resumes and verification documents can be linked via external persistent cloud buckets (e.g., Cloudinary, AWS S3, or Google Cloud Storage).
  - The built-in PDF generator (`backend/src/services/pdf.service.js`) generates candidate offer letters and reports in-memory dynamically on-demand without writing to disk.

---

## Troubleshooting Guide

| Issue | Root Cause | Solution |
|---|---|---|
| **CORS error in browser** | Frontend origin not allowlisted | In Render, ensure `CORS_ORIGIN` matches your exact Netlify domain (no trailing slash). |
| **Page Refresh 404 on Netlify** | SPA client-side routing fallback missing | `frontend/public/_redirects` and `netlify.toml` include `/* /index.html 200` to resolve all sub-paths. |
| **MongoDB connection timeout** | Atlas IP allowlist blocking Render | In Atlas &rarr; Network Access &rarr; add `0.0.0.0/0` to allow dynamic Render IP addresses. |
| **JWT startup error on Render** | Secrets shorter than 32 characters | Set `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` to random 32+ character strings. |
| **OTP not received** | SMTP credentials empty | In dev, check terminal output for OTP codes; in prod, configure valid SMTP credentials (e.g. Brevo). |

---

## Security Best Practices Implemented

- **Credential Isolation:** `.gitignore` excludes all `.env` files, credentials, upload files, and debug logs.
- **Strict Headers:** `helmet()` sets security headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`).
- **NoSQL Injection Prevention:** `express-mongo-sanitize` scrubs request bodies, params, and queries.
- **Secure Cookies:** Refresh tokens use `httpOnly`, `sameSite: 'lax'`, and `secure` in production.
- **Role Isolation:** Multi-level middleware verifies authentication token and enforces role-specific permissions (`student`, `company`, `tpo`).

---

## License

This project is licensed under the [MIT License](LICENSE).
