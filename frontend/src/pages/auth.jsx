import { Fragment, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase, GraduationCap, Building2, School, ShieldCheck, Check, Rocket,
  Mail, Lock, Eye, EyeOff, LogIn, UserPlus, User, KeyRound, Loader2, Circle, Clock,
  CheckCircle2, Info, Send,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiErrorMessage } from '../services/api';
import { showSuccess } from '../services/alerts';
import api, { refreshSession } from '../services/api';
import { AuthThemeToggle } from '../components/AuthThemeToggle';
import { handleLoginSuccess } from '../services/authSuccess';

const GOOGLE_ERRORS = {
  unconfigured: 'Google sign-in is not configured on this server.',
  denied: 'Google sign-in was cancelled. Please try again.',
  failed: 'Google sign-in failed. Please try again or use email sign-in.',
  inactive: 'This account is inactive. Please contact your institution.',
};

export const API_BASE = api.defaults.baseURL;

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email.'),
  password: z.string().min(1, 'Password is required.'),
  role: z.enum(['student', 'company', 'tpo']),
});

const registerSchema = z.object({
  name: z.string().trim().min(3, 'Min 3 characters.').max(120, 'Max 120 characters.'),
  email: z.string().trim().email('Enter a valid email.'),
  role: z.enum(['student', 'company']),
  password: z.string().min(8, 'Min 8 characters.').regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, 'Use letters + numbers.'),
  confirm: z.string(),
}).refine((v) => v.password === v.confirm, { message: 'Passwords do not match.', path: ['confirm'] });

/* ---------- shared bits ---------- */

function FieldError({ message }) {
  if (!message) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="invalid-feedback d-block"
    >
      {message}
    </motion.div>
  );
}

function Brand({ compact = false }) {
  return (
    <motion.div
      className={compact ? 'cc-auth-mobile-brand' : 'cc-auth-brand'}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <span className="cc-auth-brand-icon"><Briefcase size={20} /></span>
      <span>
        <span className="cc-auth-brand-name">CampusNexus</span>
        <span className="cc-auth-brand-sub">Smart College Placement & Recruitment Management System</span>
      </span>
    </motion.div>
  );
}

/* Split-screen shell: branded visual panel + form card */
function AuthShell({ title, lead, features, children, showTheme = true }) {
  return (
    <div className="cc-auth-shell">
      <div className="cc-auth-panel">
        <motion.aside
          className="cc-auth-visual"
          aria-label="About CampusNexus"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="cc-auth-visual-grid" aria-hidden="true" />
          <Brand />
          <motion.div
            className="cc-auth-visual-body"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <h1>{title}</h1>
            <p className="cc-auth-lead">{lead}</p>
            <motion.ul
              className="cc-auth-features"
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: {
                  opacity: 1,
                  transition: { staggerChildren: 0.1, delayChildren: 0.3 },
                },
              }}
            >
              {features.map((t) => (
                <motion.li
                  key={t}
                  variants={{
                    hidden: { opacity: 0, x: -10 },
                    show: { opacity: 1, x: 0 },
                  }}
                >
                  <span className="cc-auth-check">
                    <Check size={13} strokeWidth={3.5} />
                  </span>
                  {t}
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>
          <motion.div
            className="cc-auth-visual-meta"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            <span><GraduationCap size={15} /> Students</span>
            <span><Building2 size={15} /> Companies</span>
            <span><Rocket size={15} /> Smart Placement</span>
          </motion.div>
        </motion.aside>
        <main className="cc-auth-main">
          {showTheme && (
            <div className="cc-auth-theme-wrap">
              <AuthThemeToggle />
            </div>
          )}
          <motion.div
            className="cc-auth-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <Brand compact />
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}

/* Simple centered card for verify / forgot / callback flows. */
function Card({ children, title, subtitle, icon: Icon = KeyRound }) {
  return (
    <div className="cc-auth-wrap">
      <div className="cc-auth-theme-wrap">
        <AuthThemeToggle />
      </div>
      <motion.div
        className="cc-card cc-auth-card"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="cc-card-body">
          <Brand compact />
          <motion.div
            className="cc-auth-logo-mark"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
          >
            <Icon size={24} />
          </motion.div>
          <motion.h1
            className="h4 text-center mb-1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {title}
          </motion.h1>
          {subtitle && (
            <motion.p
              className="text-center text-muted small mb-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {subtitle}
            </motion.p>
          )}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {children}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

function PasswordField({ label, error, registerProps, placeholder = 'Enter your password' }) {
  const [show, setShow] = useState(false);
  return (
    <div className="mb-2">
      <label className="form-label">{label} <span className="text-danger">*</span></label>
      <div className="cc-input-wrap">
        <Lock size={16} className="cc-input-ico" />
        <input
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          autoComplete="current-password"
          className={`form-control cc-input-pad cc-input-pad-end${error ? ' is-invalid' : ''}`}
          {...registerProps}
        />
        <motion.button
          type="button"
          className="cc-input-toggle"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </motion.button>
      </div>
      <AnimatePresence>
        <FieldError message={error?.message} />
      </AnimatePresence>
    </div>
  );
}

function SubmitButton({ loading, disabled = false, icon: Icon, children }) {
  const off = loading || disabled;
  return (
    <motion.button
      className="btn btn-primary w-100 cc-auth-submit"
      disabled={off}
      whileHover={{ scale: off ? 1 : 1.01 }}
      whileTap={{ scale: off ? 1 : 0.99 }}
    >
      {loading ? <Loader2 size={17} className="cc-spin" /> : <Icon size={17} />}
      <span>{loading ? 'Please wait…' : children}</span>
    </motion.button>
  );
}

function GoogleButton() {
  // Temporary: Hidden from UI as requested, keeping code preserved
  return null;
  /*
  return (
    <>
      <div className="cc-auth-divider"><span>or</span></div>
      <motion.a
        className="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center gap-2"
        href={`${API_BASE}/auth/google`}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.3H12v4.5h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.1.6 3.5 2.7.2.1c2.2-2.1 3.8-5.1 3.8-9.4z" />
          <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.8-5l-.6.1-3 2.3-.1.5C2.5 21.5 6.9 24 12 24z" />
          <path fill="#FBBC05" d="M5.2 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4l-.1-.6-2.9-2.3-.4.2C.6 8.9 0 10.4 0 12s.6 3.1 1.8 4.5l3.4-2.1z" />
          <path fill="#EA4335" d="M12 4.7c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.9 1.1 15.2 0 12 0 6.9 0 2.5 2.5 1.8 6.9l3.4 2.7c1-2.8 3.7-4.9 6.8-4.9z" />
        </svg>
        Continue with Google
      </motion.a>
    </>
  );
  */
}

/* ---------- login ---------- */

const LOGIN_ROLES = [
  { value: 'student', label: 'Student', hint: 'Placements & jobs', icon: GraduationCap },
  { value: 'company', label: 'Company', hint: 'Recruit talent', icon: Building2 },
  { value: 'tpo', label: 'TPO', hint: 'Manage placements', icon: School },
];

const ROLE_SUB = {
  student: 'Sign in to continue to CampusNexus. Your placement journey continues here.',
  company: 'Sign in to post jobs, review applications and roll out offers.',
  tpo: 'Sign in to run drives, verify companies and track placements.',
};

export function Login() {
  const { login, setUser, setPostLogin } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const googleError = GOOGLE_ERRORS[params.get('google')] || '';
  const [err, setErr] = useState('');
  const inFlightRef = useRef(false);
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', role: 'student' },
  });
  const role = watch('role');
  const submit = async (values) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setErr('');
    try {
      const data = await login(values);
      await handleLoginSuccess({ user: data.user, isFirstLogin: data.isFirstLogin, navigate, setUser, setPostLogin });
    } catch (e2) {
      if (e2.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
        navigate('/verify-email', { state: { userId: e2.response.data.userId, email: e2.response.data.email || values.email } });
        return;
      }
      setErr(apiErrorMessage(e2, 'Unable to sign in.'));
    } finally {
      inFlightRef.current = false;
    }
  };
  return (
    <>
      <AuthShell
        title={<>Build Your Career.<br />Connect With Opportunities.</>}
      lead="A smart placement & recruitment platform connecting students, companies and institutions in one place."
      features={['Discover Jobs & Internships', 'Apply for Placement Drives', 'Track Your Career Progress']}
    >
      <div className="cc-auth-head">
        <span className="cc-auth-logo-mark"><LogIn size={20} /></span>
        <h1 className="cc-auth-title">Welcome Back</h1>
      </div>
      <p className="cc-auth-sub">{ROLE_SUB[role]}</p>

      <p className="cc-auth-hint"><ShieldCheck size={15} /> Sign in as</p>
      <div className="cc-role-grid" role="radiogroup" aria-label="Sign in as">
        {LOGIN_ROLES.map(({ value, label, hint, icon: Icon }, idx) => (
          <motion.button
            type="button"
            key={value}
            role="radio"
            aria-checked={role === value}
            className={`cc-role-opt${role === value ? ' is-selected' : ''}`}
            onClick={() => setValue('role', value, { shouldValidate: true })}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="cc-role-ico"><Icon size={18} /></span>
            <span className="cc-role-txt"><b>{label}</b><small>{hint}</small></span>
          </motion.button>
        ))}
      </div>
      <input type="hidden" {...register('role')} />

      <AnimatePresence>
        {(err || googleError) && (
          <motion.div
            className="alert alert-danger py-2"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {err || googleError}
          </motion.div>
        )}
      </AnimatePresence>
      <form onSubmit={handleSubmit(submit)} noValidate>
        <div className="mb-2">
          <label className="form-label">Email Address <span className="text-danger">*</span></label>
          <div className="cc-input-wrap">
            <Mail size={16} className="cc-input-ico" />
            <input
              type="email"
              placeholder="Enter your email"
              autoComplete="email"
              className={`form-control cc-input-pad${errors.email ? ' is-invalid' : ''}`}
              {...register('email')}
            />
          </div>
          <AnimatePresence>
            <FieldError message={errors.email?.message} />
          </AnimatePresence>
        </div>
        <PasswordField label="Password" error={errors.password} registerProps={register('password')} />
        <div className="cc-auth-row">
          <Link className="cc-auth-link" to="/forgot-password">Forgot password?</Link>
        </div>
        <SubmitButton loading={isSubmitting} icon={LogIn}>Sign In</SubmitButton>
      </form>

      {role === 'student' && <GoogleButton />}

      <div className="cc-auth-cta">
        {role === 'student' && <p className="cc-auth-switch">Don&apos;t have an account? <Link to="/register">Create Account</Link></p>}
        {role === 'company' && <p className="cc-auth-switch">Don&apos;t have an account? <Link to="/register">Create Company Account</Link></p>}
        {role === 'tpo' && (
          <motion.div
            className="cc-auth-notice"
            role="status"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Lock size={16} />
            <div>
              <b>TPO accounts are managed by your institution.</b>
              <span>Please contact your Training & Placement Department for access.</span>
            </div>
          </motion.div>
        )}
      </div>
      <div className="text-center mt-2 small"><Link to="/">← Back to home</Link></div>
    </AuthShell>
    </>
  );
}

/* ---------- register ---------- */

const REGISTER_ROLES = [
  { value: 'student', label: 'Student', desc: 'Create your student profile and discover placement opportunities.', icon: GraduationCap, nameLabel: 'Full Name', namePlaceholder: 'Enter your full name' },
  { value: 'company', label: 'Company / Recruiter', desc: 'Create your company profile and recruit talented students.', icon: Building2, nameLabel: 'Contact Person Name', namePlaceholder: 'Enter contact person name' },
];

function strengthOf(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Za-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}
const STRENGTH_LABEL = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
const STRENGTH_COLOR = [
  'var(--cc-danger)', 'var(--cc-danger)', 'var(--cc-warning)',
  'var(--cc-warning)', 'var(--cc-success)', 'var(--cc-success)',
];

export function Register() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const googleOn = params.get('google') === '1';
  const [err, setErr] = useState('');
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: params.get('name') || '', email: params.get('email') || '', password: '', confirm: '', role: 'student' },
  });
  const role = watch('role');
  const password = watch('password') || '';
  const active = REGISTER_ROLES.find((r) => r.value === role);
  const score = strengthOf(password);
  const rules = [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'Include a letter', ok: /[A-Za-z]/.test(password) },
    { label: 'Include a number', ok: /\d/.test(password) },
    { label: 'Uppercase & lowercase', ok: /[a-z]/.test(password) && /[A-Z]/.test(password) },
  ];
  const submit = async (values) => {
    setErr('');
    try {
      const { data } = await api.post('/auth/register', values);
      await showSuccess({ title: 'Account created!', message: 'Your CampusNexus account has been created. Please verify your email to continue.', confirmButtonText: 'Continue', intensity: 'small' });
      navigate('/verify-email', { state: { userId: data.data.userId, email: data.data.email } });
    } catch (e2) { setErr(apiErrorMessage(e2)); }
  };
  return (
    <AuthShell
      title="Create Your CampusNexus Account"
      lead="Join CampusNexus and connect with placement opportunities across your campus and beyond."
      features={['Build your professional student profile', 'Connect directly with companies', 'Track placements, offers & progress']}
    >
      <div className="cc-auth-head">
        <span className="cc-auth-logo-mark"><UserPlus size={20} /></span>
        <h1 className="cc-auth-title">Create Account</h1>
      </div>
      <p className="cc-auth-sub">Join CampusNexus and connect with placement opportunities.</p>

      <AnimatePresence>
        {err && (
          <motion.div
            className="alert alert-danger py-2"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {err}
          </motion.div>
        )}
      </AnimatePresence>
      {googleOn && <div className="alert alert-info py-2 small">Signed in with Google. Choose your account type and set a password to finish creating your account.</div>}
      <form onSubmit={handleSubmit(submit)} noValidate className="cc-reg-form">
        <p className="form-label">I am registering as <span className="text-danger">*</span></p>
        <div className="cc-role-cards" role="radiogroup" aria-label="Account type">
          {REGISTER_ROLES.map(({ value, label, desc, icon: Icon }, idx) => (
            <motion.button
              type="button"
              key={value}
              role="radio"
              aria-checked={role === value}
              className={`cc-role-card${role === value ? ' is-selected' : ''}`}
              onClick={() => setValue('role', value, { shouldValidate: true })}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <motion.span
                className="cc-role-card-check"
                initial={false}
                animate={{ scale: role === value ? 1 : 0 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <Check size={12} strokeWidth={4} />
              </motion.span>
              <span className="cc-role-card-icon"><Icon size={19} /></span>
              <span className="cc-role-card-txt">
                <span className="cc-role-card-name">{label}</span>
                <span className="cc-role-card-desc">{desc}</span>
              </span>
            </motion.button>
          ))}
        </div>
        <input type="hidden" {...register('role')} />
        <p className="cc-auth-note"><ShieldCheck size={15} /> TPO accounts are managed by your institution and cannot be created here.</p>

        <div className="cc-reg-grid">
          <div className="mb-2">
            <label className="form-label">{active.nameLabel} <span className="text-danger">*</span></label>
          <div className="cc-input-wrap">
            {role === 'company' ? <Building2 size={16} className="cc-input-ico" /> : <User size={16} className="cc-input-ico" />}
            <input
              placeholder={active.namePlaceholder}
              autoComplete="name"
              className={`form-control cc-input-pad${errors.name ? ' is-invalid' : ''}`}
              {...register('name')}
            />
          </div>
          <AnimatePresence>
            <FieldError message={errors.name?.message} />
          </AnimatePresence>
        </div>

        <div className="mb-2">
          <label className="form-label">Email Address <span className="text-danger">*</span></label>
          <div className="cc-input-wrap">
            <Mail size={16} className="cc-input-ico" />
            <input
              type="email"
              placeholder="Enter your email"
              autoComplete="email"
              className={`form-control cc-input-pad${errors.email ? ' is-invalid' : ''}`}
              {...register('email')}
            />
          </div>
          <AnimatePresence>
            <FieldError message={errors.email?.message} />
          </AnimatePresence>
          </div>
        </div>

        <div className="cc-reg-grid">
          <div className="mb-2">
            <label className="form-label">Password <span className="text-danger">*</span></label>
          <div className="cc-input-wrap">
            <Lock size={16} className="cc-input-ico" />
            <PasswordInput placeholder="Create a password" error={errors.password} registerProps={register('password')} />
          </div>
          <AnimatePresence>
            <FieldError message={errors.password?.message} />
          </AnimatePresence>
        </div>
        <PasswordField label="Confirm Password" error={errors.confirm} registerProps={register('confirm')} placeholder="Re-enter your password" />
        </div>
        <div className="cc-pw-meta">
          <AnimatePresence>
            {password && (
              <motion.div
                className="cc-strength"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="cc-strength-bars">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <motion.span
                      key={i}
                      className="cc-strength-bar"
                      initial={{ scaleX: 0 }}
                      animate={{
                        scaleX: i < score ? 1 : 0,
                        background: i < score ? STRENGTH_COLOR[score] : undefined,
                      }}
                      transition={{ duration: 0.3, delay: i * 0.05 }}
                      style={{ transformOrigin: 'left' }}
                    />
                  ))}
                </div>
                <span className="cc-strength-tag" style={{ color: STRENGTH_COLOR[score] }}>{STRENGTH_LABEL[score]}</span>
              </motion.div>
            )}
          </AnimatePresence>
          <motion.ul
            className="cc-rules"
            aria-label="Password requirements"
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: { staggerChildren: 0.05 },
              },
            }}
          >
            {rules.map((r) => (
              <motion.li
                key={r.label}
                className={r.ok ? 'is-ok' : ''}
                variants={{
                  hidden: { opacity: 0, x: -5 },
                  show: { opacity: 1, x: 0 },
                }}
              >
                {r.ok ? <Check size={13} strokeWidth={3} /> : <Circle size={13} />}{r.label}
              </motion.li>
            ))}
          </motion.ul>
        </div>

        <div className="form-text mb-2">Min 8 chars, letters + numbers.</div>
        <SubmitButton loading={isSubmitting} icon={UserPlus}>Create Account</SubmitButton>
      </form>

      {role === 'student' && <GoogleButton />}

      <p className="cc-auth-switch text-center mt-3">Already have an account? <Link to="/login">Sign In</Link></p>
    </AuthShell>
  );
}

function PasswordInput({ placeholder, error, registerProps }) {
  const [show, setShow] = useState(false);
  return (
    <>
      <input
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        autoComplete="new-password"
        className={`form-control cc-input-pad cc-input-pad-end${error ? ' is-invalid' : ''}`}
        {...registerProps}
      />
      <motion.button
        type="button"
        className="cc-input-toggle"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </motion.button>
    </>
  );
}

/* ---------- verify / forgot / oauth ---------- */

function useCountdown(initial) {
  const [left, setLeft] = useState(initial || 0);
  useEffect(() => {
    if (left <= 0) return undefined;
    const t = setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return [left, setLeft];
}

function fmtClock(s) {
  const m = Math.floor(s / 60); const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

function OtpBoxes({ value = '', onChange, disabled = false, autoFocus = false }) {
  const refs = useRef([]);
  const arr = Array.from({ length: 6 }, (_, i) => value[i] || '');
  const commit = (next) => onChange(next.join(''));
  const fill = (i, text) => {
    const d = String(text || '').replace(/\D/g, '');
    if (!d) return null;
    const next = [...arr];
    for (let k = 0; k < d.length && i + k < 6; k += 1) next[i + k] = d[k];
    commit(next);
    return Math.min(i + d.length, 5);
  };
  return (
    <div className="otp-boxes" role="group" aria-label="6-digit verification code">
      {arr.map((c, i) => (
        <motion.input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          className="otp-box form-control"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          value={c}
          onChange={(e) => {
            const focusIdx = fill(i, e.target.value);
            if (!focusIdx && !e.target.value.replace(/\D/g, '')) { const next = [...arr]; next[i] = ''; commit(next); }
            if (focusIdx != null) refs.current[focusIdx]?.focus();
          }}
          onKeyDown={(e) => { if (e.key === 'Backspace' && !arr[i] && i > 0) { const next = [...arr]; next[i - 1] = ''; commit(next); refs.current[i - 1]?.focus(); } }}
          onPaste={(e) => { e.preventDefault(); const idx = fill(i, (e.clipboardData || window.clipboardData).getData('text')); if (idx != null) refs.current[idx]?.focus(); }}
          aria-label={`Digit ${i + 1}`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05 }}
          whileFocus={{ scale: 1.05 }}
        />
      ))}
    </div>
  );
}

function OtpSteps({ steps, current }) {
  return (
    <div className="otp-steps" aria-label="Progress">
      {steps.map(({ icon: Icon, label }, i) => (
        <Fragment key={label}>
          {i > 0 && <span className="otp-step-sep" aria-hidden="true" />}
          <span className={`otp-step${i < current ? ' is-done' : i === current ? ' is-active' : ''}`}>
            {i < current ? <Check size={12} strokeWidth={3.5} /> : <Icon size={12} />}
            {label}
          </span>
        </Fragment>
      ))}
    </div>
  );
}

function PasswordStrength({ value }) {
  const score = strengthOf(String(value || ''));
  return (
    <motion.div
      className="cc-strength"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="cc-strength-bars">
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.span
            key={i}
            className="cc-strength-bar"
            initial={{ scaleX: 0 }}
            animate={{
              scaleX: i < score ? 1 : 0,
              background: i < score ? STRENGTH_COLOR[score] : undefined,
            }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            style={{ transformOrigin: 'left' }}
          />
        ))}
      </div>
      {value ? <span className="cc-strength-tag" style={{ color: STRENGTH_COLOR[score] }}>{STRENGTH_LABEL[score]}</span> : null}
    </motion.div>
  );
}

export function VerifyEmail() {
  const navigate = useNavigate();
  const state = window.history.state?.usr || {};
  const [form, setForm] = useState({ userId: state?.userId || '', email: state?.email || '', code: '' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [cool, setCool] = useState(0);
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useCountdown(600);
  useState(() => { try { const s = JSON.parse(sessionStorage.getItem('cc-pending') || 'null'); if (s) setForm((f) => ({ ...f, ...s })); } catch { /* */ } });
  const expired = left <= 0;
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr(''); setMsg('');
    try {
      await api.post('/auth/verify-email', form);
      sessionStorage.removeItem('cc-pending');
      await showSuccess({ title: 'Email verified!', message: 'Your email has been verified successfully. You can now sign in to CampusNexus.', confirmButtonText: 'Go to Login', intensity: 'small' });
      navigate('/login');
    } catch (e2) { setErr(apiErrorMessage(e2)); } finally { setBusy(false); }
  };
  const resend = async () => {
    setErr(''); setMsg('');
    try {
      await api.post('/auth/resend-otp', { userId: form.userId || undefined, email: form.email || undefined });
      setMsg('A new code was sent.'); setCool(60); setLeft(600);
    } catch (e2) { const r = e2.response?.data?.resendAfter; if (r) setCool(r); setErr(apiErrorMessage(e2)); }
  };
  return (
    <AuthShell
      title={<>One last step — verify your email.</>}
      lead="We sent a 6-digit verification code to your inbox. Enter it here to activate your account and start your placement journey."
      features={['Code expires in 10 minutes', '5 attempts per code — then resend', 'Verified accounts sign in instantly']}
    >
      <OtpSteps
        steps={[{ icon: Check, label: 'Account' }, { icon: KeyRound, label: 'Verify OTP' }, { icon: LogIn, label: 'Sign In' }]}
        current={1}
      />
      <div className="cc-auth-head">
        <span className="cc-auth-logo-mark"><Mail size={20} /></span>
        <h1 className="cc-auth-title">Verify Your Email</h1>
      </div>
      <p className="cc-auth-sub">
        Enter the 6-digit code sent to<br />
        <b className="otp-email">{form.email || 'your email'}</b>
      </p>
      <AnimatePresence>
        {err && (
          <motion.div
            className="alert alert-danger py-2"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {err}
          </motion.div>
        )}
        {msg && (
          <motion.div
            className="alert alert-success py-2"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {msg}
          </motion.div>
        )}
      </AnimatePresence>
      <form onSubmit={submit}>
        {!form.userId && (
          <div className="mb-2">
            <label className="form-label">Email <span className="text-danger">*</span></label>
            <input type="email" required className="form-control" placeholder="Enter your email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
        )}
        <div className="otp-timer-wrap mb-3" role="timer" aria-live="polite">
          <span className={`otp-timer${expired ? ' is-expired' : ''}`}><Clock size={13} /> {expired ? 'Code expired' : fmtClock(left)}</span>
          <span className="otp-timer-note">Code expires in 10 minutes</span>
        </div>
        <div className="mb-3">
          <OtpBoxes value={form.code} onChange={(code) => setForm((f) => ({ ...f, code }))} disabled={busy || expired} autoFocus />
        </div>
        <SubmitButton loading={busy} disabled={form.code.length !== 6 || expired} icon={CheckCircle2}>Verify Email</SubmitButton>
      </form>
      <div className="otp-resend mt-3">
        <span>Didn&apos;t get the code?</span>
        <button type="button" className="otp-resend-btn" disabled={cool > 0 || busy} onClick={resend}>
          {cool > 0 ? `Resend in ${cool}s` : 'Resend code'}
        </button>
      </div>
      <div className="otp-help mt-3">
        <Info size={15} />
        <span>Check your spam folder. The code is valid for 10 minutes and 5 attempts.</span>
      </div>
      <p className="cc-auth-switch text-center mt-3">
        <Link to="/login">Back to Sign In</Link> <span aria-hidden="true">•</span> <Link to="/register">Wrong email? Register again</Link>
      </p>
    </AuthShell>
  );
}

export function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ email: '', role: 'student', code: '', resetToken: '', password: '', confirm: '' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [cool, setCool] = useState(0);
  const [left, setLeft] = useCountdown(0);
  const go = async (fn) => { setBusy(true); setErr(''); setMsg(''); try { await fn(); } catch (e) { setErr(apiErrorMessage(e)); } finally { setBusy(false); } };
  const expired = step === 2 && left <= 0;
  const resend = () => go(async () => {
    await api.post('/auth/forgot-password', { email: form.email, role: form.role });
    setMsg('A new reset code was sent.'); setCool(60); setLeft(600);
  });
  const ROLES = [
    [GraduationCap, 'student', 'Student', 'Placements & jobs'],
    [Building2, 'company', 'Company', 'Recruit talent'],
    [School, 'tpo', 'TPO', 'Manage placements'],
  ];
  return (
    <AuthShell
      title={<>Reset your password securely.</>}
      lead="Verify your email with a one-time code and set a new password in a few quick steps."
      features={['Secure one-time code verification', 'Role-aware account lookup', 'Choose a strong new password']}
    >
      <OtpSteps
        steps={[{ icon: Mail, label: 'Email' }, { icon: KeyRound, label: 'OTP' }, { icon: Lock, label: 'New Password' }]}
        current={step - 1}
      />
      <div className="cc-auth-head">
        <span className="cc-auth-logo-mark"><KeyRound size={20} /></span>
        <h1 className="cc-auth-title">{step === 1 ? 'Forgot Password?' : step === 2 ? 'Enter Reset Code' : 'Create New Password'}</h1>
      </div>
      <p className="cc-auth-sub">
        {step === 1 ? 'Enter your registered email — we’ll send a verification code.'
          : step === 2 ? <>Enter the code sent to <b className="otp-email">{form.email}</b></>
            : 'Choose a new password for your account.'}
      </p>
      <AnimatePresence>
        {err && (
          <motion.div
            className="alert alert-danger py-2"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {err}
          </motion.div>
        )}
        {msg && (
          <motion.div
            className="alert alert-success py-2"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {msg}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.form
            key="step1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            onSubmit={(e) => { e.preventDefault(); go(async () => { await api.post('/auth/forgot-password', { email: form.email, role: form.role }); setMsg('If an account exists, a code was sent.'); setCool(60); setLeft(600); setStep(2); }); }}
          >
            <p className="cc-auth-hint"><ShieldCheck size={15} /> Reset password as</p>
            <div className="cc-role-grid" role="radiogroup" aria-label="Reset password as">
              {ROLES.map(([Icon, val, label, hint], idx) => (
                <motion.button
                  type="button"
                  key={val}
                  role="radio"
                  aria-checked={form.role === val}
                  className={`cc-role-opt${form.role === val ? ' is-selected' : ''}`}
                  onClick={() => setForm({ ...form, role: val })}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="cc-role-ico"><Icon size={18} /></span>
                  <span className="cc-role-txt"><b>{label}</b><small>{hint}</small></span>
                </motion.button>
              ))}
            </div>
            <div className="mb-3"><label className="form-label">Registered email <span className="text-danger">*</span></label><input type="email" required className="form-control" placeholder="Enter your registered email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <SubmitButton loading={busy} icon={Send}>Send Reset Code</SubmitButton>
          </motion.form>
        )}
        {step === 2 && (
          <motion.form
            key="step2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            onSubmit={(e) => { e.preventDefault(); go(async () => { const { data } = await api.post('/auth/verify-reset-otp', { email: form.email, role: form.role, code: form.code }); setForm({ ...form, resetToken: data.data.resetToken }); setStep(3); }); }}
          >
            <div className="otp-timer-wrap mb-3" role="timer" aria-live="polite">
              <span className={`otp-timer${expired ? ' is-expired' : ''}`}><Clock size={13} /> {expired ? 'Code expired' : fmtClock(left)}</span>
              <span className="otp-timer-note">Code expires in 10 minutes</span>
            </div>
            <div className="mb-3"><OtpBoxes value={form.code} onChange={(code) => setForm((f) => ({ ...f, code }))} disabled={busy || expired} autoFocus /></div>
            <SubmitButton loading={busy} disabled={form.code.length !== 6 || expired} icon={CheckCircle2}>Verify Code</SubmitButton>
            <div className="text-center mt-3">
              <motion.button
                type="button"
                className="btn btn-link btn-sm"
                onClick={() => { setStep(1); setErr(''); setMsg(''); setForm((f) => ({ ...f, code: '' })); }}
                whileHover={{ scale: 1.05 }}
              >
                Use a different email
              </motion.button>
            </div>
          </motion.form>
        )}
        {step === 3 && (
          <motion.form
            key="step3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            onSubmit={(e) => { e.preventDefault(); go(async () => { await api.post('/auth/reset-password', { email: form.email, role: form.role, resetToken: form.resetToken, password: form.password, confirm: form.confirm }); await showSuccess({ title: 'Password Reset Successful!', message: 'Your password has been updated successfully. You can now sign in securely using your new password.', confirmButtonText: 'Go to Login', intensity: 'normal' }); navigate('/login'); }); }}
          >
            <motion.div
              className="otp-verified-note"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <CheckCircle2 size={17} />
              <span>Email verified — now create your new password.</span>
            </motion.div>
            <div className="mb-2">
              <label className="form-label">New password <span className="text-danger">*</span></label>
              <PasswordInput placeholder="Enter new password" registerProps={{ value: form.password, onChange: (e) => setForm({ ...form, password: e.target.value }), required: true, minLength: 8 }} />
              {form.password && <PasswordStrength value={form.password} />}
            </div>
            <div className="mb-3">
              <label className="form-label">Confirm Password <span className="text-danger">*</span></label>
              <PasswordInput placeholder="Confirm new password" registerProps={{ value: form.confirm, onChange: (e) => setForm({ ...form, confirm: e.target.value }), required: true }} />
            </div>
            <SubmitButton loading={busy} disabled={form.password !== form.confirm || !form.password} icon={Lock}>Reset Password</SubmitButton>
          </motion.form>
        )}
      </AnimatePresence>
      {step === 2 && (
        <div className="otp-resend mt-3">
          <span>Didn&apos;t get the code?</span>
          <button type="button" className="otp-resend-btn" disabled={cool > 0 || busy} onClick={resend}>
            {cool > 0 ? `Resend in ${cool}s` : 'Resend code'}
          </button>
        </div>
      )}
      {step === 2 && (
        <div className="otp-help mt-3">
          <Info size={15} />
          <span>Check your spam folder. The code is valid for 10 minutes.</span>
        </div>
      )}
      <p className="cc-auth-switch text-center mt-3"><Link to="/login">Back to Sign In</Link></p>
    </AuthShell>
  );
}

export function OAuthCallback() {
  const { refreshMe, setUser, setPostLogin } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [err, setErr] = useState('');
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      try {
        const token = await refreshSession();
        if (!token) throw new Error('no session');
        const me = await refreshMe();
        await handleLoginSuccess({ user: me, isFirstLogin: params.get('firstLogin') === '1', navigate, setUser, setPostLogin });
      } catch {
        setErr('Google sign-in session could not be completed. Please sign in with email.');
      }
    })();
  }, [navigate, params, refreshMe, setPostLogin, setUser]);
  if (err) {
    return <Card title="Sign-in incomplete" subtitle="Something went wrong."><div className="alert alert-danger py-2">{err}</div><div className="text-center mt-2"><Link className="btn btn-primary" to="/login">Back to sign in</Link></div></Card>;
  }
  return (
    <div className="cc-auth-wrap">
      <motion.div
        className="spinner-border text-primary"
        role="status"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ repeat: Infinity, duration: 1 }}
      />
    </div>
  );
}
