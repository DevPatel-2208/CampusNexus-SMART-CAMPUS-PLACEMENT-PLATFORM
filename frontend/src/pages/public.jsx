import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Award, BadgeCheck, BarChart3, Bookmark, BookmarkCheck,
  Bot, Briefcase, Building2, CalendarCheck, CheckCircle2, ChevronDown, ChevronRight,
  ClipboardList, Clock, Eye, GraduationCap, Home as HomeIcon, Info, IndianRupee,
  Layers, Lightbulb, Loader2, Mail, MapPin, MessageCircle, Phone, Quote, Search, Send,
  ExternalLink, FileText, HelpCircle, MessageSquare, PhoneCall, ShieldCheck, SlidersHorizontal, Sparkles, Target, TrendingUp, Trophy, User, UserPlus, Users, X, Zap,
} from 'lucide-react';
import Swal from 'sweetalert2';
import { useDebounced, useFetch } from '../hooks/useUnread';
import { useAuth } from '../context/AuthContext';
import api, { apiErrorMessage, fileUrl } from '../services/api';
import { Empty, Loading, StatusBadge, salaryText } from '../components/ui';
import { PublicHeader } from '../components/public/Header';
import { PublicFooter } from '../components/public/Footer';

/* Shared real platform counters for the public marketing pages */
export function usePublicStats() {
  const res = useFetch(async () => (await api.get('/jobs/stats')).data.data, []);
  const stats = res.data || {};
  const students = Number(stats.students);
  const placed = Number(stats.placed);
  const placementRate = students > 0 && Number.isFinite(placed) ? Math.round((placed / students) * 100) : null;
  return { stats, loading: res.loading, placementRate };
}

/** Compact number formatter: 12 -> "12+", 0/undefined -> "—". */
export function statValue(v, { suffix = '+' } = {}) {
  return typeof v === 'number' && Number.isFinite(v) ? `${v.toLocaleString('en-IN')}${suffix}` : '—';
}

/* Scroll-reveal wrapper */
export function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (typeof IntersectionObserver === 'undefined') { el.classList.add('in'); return undefined; }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }),
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className={`cc-reveal ${className}`} style={{ '--cc-reveal-d': `${delay}ms` }}>{children}</div>;
}

function PageShell({ children }) {
  return (
    <div className="cc-public-page">
      <a href="#main-content" className="cc-skip-link">Skip to main content</a>
      <PublicHeader />
      <main id="main-content" className="cc-public-main container">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}

function SecHead({ eyebrow, icon, title, text }) {
  return (
    <Reveal>
      <div className="cc-sec-head">
        {eyebrow && <span className="cc-eyebrow">{icon}<span>{eyebrow}</span></span>}
        <h2 className="cc-sec-title">{title}</h2>
        {text && <p className="cc-sec-desc">{text}</p>}
      </div>
    </Reveal>
  );
}

function CtaBanner({ title, text, primary, secondary }) {
  return (
    <Reveal>
      <div className="cc-cta cc-cta-banner">
        <div className="cc-cta-glow-1" aria-hidden="true" />
        <div className="cc-cta-glow-2" aria-hidden="true" />
        <div className="cc-cta-content">
          <span className="cc-cta-badge"><Sparkles size={14} /> Get Started Now</span>
          <h2>{title}</h2>
          <p>{text}</p>
          <div className="d-flex gap-3 justify-content-center flex-wrap mt-4">
            {primary}
            {secondary}
          </div>
        </div>
      </div>
    </Reveal>
  );
}

/* Redesigned equal-height Job Card (Clean, NO blue line, 100% Mobile Responsive) */
export function JobCard({
  j,
  linkPrefix = '/jobs',
  rich = false,
  delay = 0,
  canSave = false,
  isSaved = false,
  onToggleSave,
  busySave = false,
}) {
  const [logoFailed, setLogoFailed] = useState(false);
  const companyName = j.company?.companyName || 'Top Recruiter';
  const logoInitial = (companyName[0] || 'C').toUpperCase();
  const jobLink = `${linkPrefix}/${j._id}`;
  const companyLogo = j.company?.logo ? fileUrl(j.company.logo) : null;

  // Deadline logic & urgency calculation
  const deadlineDate = j.deadline ? new Date(j.deadline) : null;
  const isValidDeadline = deadlineDate && !isNaN(deadlineDate.getTime());
  const now = new Date();
  const diffDays = isValidDeadline ? Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24)) : null;
  const isExpired = diffDays !== null && diffDays < 0;
  const isUrgent = diffDays !== null && diffDays >= 0 && diffDays <= 7;

  // Filter redundant work mode if identical to location (e.g. Remote + Remote)
  const showMode = j.workMode && (!j.location || j.workMode.toLowerCase() !== j.location.toLowerCase());

  return (
    <Reveal delay={delay}>
      <article className="cc-card cc-job-card cc-job-card-elevated">
        <div className="cc-card-body">
          {/* Header Row: Logo + Head Info */}
          <div className="cc-job-top">
            <div className="cc-job-logo-wrap">
              {companyLogo && !logoFailed ? (
                <img
                  src={companyLogo}
                  alt={companyName}
                  className="cc-job-logo cc-job-logo-img"
                  onError={() => setLogoFailed(true)}
                />
              ) : (
                <span className="cc-job-logo" aria-hidden="true">{logoInitial}</span>
              )}
            </div>

            <div className="cc-job-head">
              <div className="cc-job-head-top">
                <div className="cc-job-company" title={companyName}>
                  <Building2 size={13} className="text-muted flex-shrink-0" />
                  <span className="text-truncate">{companyName}</span>
                </div>
                {j.jobType && (
                  <div className="cc-job-type-pill">
                    <StatusBadge value={j.jobType} />
                  </div>
                )}
              </div>
              <Link className="cc-job-title" to={jobLink} title={j.title}>
                {j.title}
              </Link>
            </div>
          </div>

          {/* Meta details (chips) */}
          <div className="cc-job-meta">
            {j.location && (
              <span className="cc-meta-item cc-meta-loc" title={j.location}>
                <MapPin size={13} className="text-primary flex-shrink-0" />
                <span className="text-truncate">{j.location}</span>
              </span>
            )}
            <span className="cc-meta-item cc-meta-salary">
              <IndianRupee size={13} className="flex-shrink-0" />
              <span>{salaryText(j)}</span>
            </span>
            {showMode && (
              <span className="cc-meta-item cc-meta-mode">
                <HomeIcon size={13} className="flex-shrink-0" />
                <span>{j.workMode}</span>
              </span>
            )}
          </div>

          {/* Description snippet */}
          <p className="cc-job-desc">
            {j.description
              ? String(j.description).replace(/\s+/g, ' ').trim()
              : 'Exciting placement opportunity with detailed growth path.'}
          </p>

          {/* Bottom Foot Bar: Deadline + Action Buttons */}
          <div className="cc-job-foot-bar">
            <div
              className={`cc-job-deadline ${isExpired ? 'is-expired' : isUrgent ? 'is-urgent' : ''}`}
              title={isValidDeadline ? `Deadline: ${deadlineDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Actively Hiring'}
            >
              <Clock size={13} className="flex-shrink-0" />
              {isValidDeadline ? (
                isExpired ? (
                  <span>Deadline Expired</span>
                ) : isUrgent ? (
                  <span>{diffDays === 0 ? 'Last day to apply' : `${diffDays}d left (${deadlineDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})`}</span>
                ) : (
                  <span>Apply by <b>{deadlineDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</b></span>
                )
              ) : (
                <span className="cc-actively-hiring"><Sparkles size={12} /> Actively Hiring</span>
              )}
            </div>

            <div className="cc-job-actions">
              {canSave && (
                <button
                  type="button"
                  className={`btn btn-sm ${isSaved ? 'btn-primary' : 'btn-outline-secondary'} cc-job-save-btn`}
                  disabled={busySave}
                  onClick={() => onToggleSave && onToggleSave(j._id)}
                  aria-label={isSaved ? 'Remove from saved jobs' : 'Save job'}
                  title={isSaved ? 'Saved to bookmarks' : 'Save job'}
                >
                  {busySave ? (
                    <Loader2 size={14} className="cc-spin" />
                  ) : isSaved ? (
                    <BookmarkCheck size={14} />
                  ) : (
                    <Bookmark size={14} />
                  )}
                  <span>{isSaved ? 'Saved' : 'Save'}</span>
                </button>
              )}
              <Link className="btn btn-outline-primary btn-sm cc-job-view-btn" to={jobLink}>
                <span>View Details</span>
                <ArrowRight size={14} className="cc-arrow-icon" />
              </Link>
            </div>
          </div>
        </div>
      </article>
    </Reveal>
  );
}

/* Redesigned Company Card (Clean, NO blue line, 100% Mobile Responsive) */
export function CompanyCard({ company, approvedJobs = 0, delay = 0, primary = false }) {
  const companyName = company.companyName || 'Hiring Partner';
  const logoInitial = companyName[0] || 'C';
  const jobsUrl = `/jobs?search=${encodeURIComponent(companyName)}`;

  return (
    <Reveal delay={delay}>
      <article className="cc-card cc-co-card cc-co-card-elevated">
        <div className="cc-card-body">
          <div className="cc-co-head">
            <span className="cc-co-logo" aria-hidden="true">{logoInitial}</span>
            <div className="cc-co-info">
              <h4 className="cc-co-title">
                <span className="text-truncate">{companyName}</span>
                {company.verificationStatus === 'verified' && (
                  <BadgeCheck size={16} className="text-success flex-shrink-0" title="Verified Recruiter" />
                )}
              </h4>
              <div className="d-flex align-items-center gap-2 flex-wrap mt-1">
                {company.industry && <span className="cc-industry-badge">{company.industry}</span>}
                {company.city && (
                  <span className="cc-co-city">
                    <MapPin size={12} className="flex-shrink-0" /> <span>{company.city}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <p className="cc-co-desc">
            {company.description
              ? (company.description.length > 120 ? `${company.description.slice(0, 120)}...` : company.description)
              : <span className="text-muted fst-italic">Trusted recruitment partner hiring students through campus drives.</span>}
          </p>

          <div className="cc-co-foot">
            <span className="cc-co-jobs-badge">
              <Zap size={13} className="text-warning flex-shrink-0" />
              <b>{approvedJobs}</b> Open Position{approvedJobs !== 1 ? 's' : ''}
            </span>
            <Link className={`btn btn-sm ${primary ? 'btn-primary' : 'btn-outline-primary'} cc-co-view-btn`} to={jobsUrl}>
              <span>View Jobs</span>
              <ArrowRight size={14} className="cc-arrow-icon" />
            </Link>
          </div>
        </div>
      </article>
    </Reveal>
  );
}

/* ---------------- Shared content ---------------- */
const WHY = [
  { icon: ShieldCheck, title: 'Verified Opportunities', text: 'All companies and job postings are strictly verified by our placement cell to ensure authentic career paths.' },
  { icon: Search, title: 'Smart Search & Filters', text: 'Instantly find jobs, internships and drives using precise role, technology, stipend and location filters.' },
  { icon: Send, title: 'One-Click Applications', text: 'Apply in seconds with your centralized profile and resume. Track your status with real-time updates.' },
  { icon: GraduationCap, title: 'Comprehensive Profile', text: 'Showcase skills, education, projects, certifications and past experience with our verified student resume builder.' },
  { icon: BarChart3, title: 'Real-time Analytics', text: 'Get transparent statistics on shortlists, test scores, interview schedules and campus hiring trends.' },
  { icon: Bot, title: 'AI Placement Assistant', text: 'Smart AI assistance to guide students with skill gap analysis, personalized job matches, and interview prep.' },
];

/* Step cards with dedicated step numbers and rich animations (Clean, NO blue line) */
const STEPS = [
  {
    num: '01',
    icon: UserPlus,
    step: 'Step 01',
    title: 'Create Profile',
    text: 'Register and build your complete student profile with skills, education, projects, and resume in one verified place.',
  },
  {
    num: '02',
    icon: Search,
    step: 'Step 02',
    title: 'Discover Opportunities',
    text: 'Browse verified internships, full-time jobs, and campus drives from leading companies across multiple industries.',
  },
  {
    num: '03',
    icon: Send,
    step: 'Step 03',
    title: 'Apply & Get Shortlisted',
    text: 'Apply with one click, track your application in real time, take online assessments, and get shortlisted by recruiters.',
  },
  {
    num: '04',
    icon: Trophy,
    step: 'Step 04',
    title: 'Get Placed',
    text: 'Receive interview calls, ace your technical rounds, get official offer letters, and launch your dream career.',
  },
];

const TESTIMONIALS = [
  {
    name: 'Rahul Sharma',
    role: 'MCA Student • Placed at TCS',
    text: 'CampusNexus completely transformed our campus placement experience. I found my software developer internship within two weeks and tracked my interview results in real time.',
  },
  {
    name: 'Priya Mehta',
    role: 'B.Tech CSE • Placed at Infosys',
    text: 'The platform is fast, clean and intuitive. Applying for top tech companies, uploading updated resumes, and receiving shortlists became completely frictionless.',
  },
  {
    name: 'Prof. Arjun Patel',
    role: 'Training & Placement Officer',
    text: 'Managing hundreds of drives manually was exhausting. CampusNexus gives our TPO team full transparency with live student shortlists, instant broadcast alerts, and analytics.',
  },
];

const CONTACT_CARDS = [
  {
    icon: Mail,
    title: 'Email Support',
    badge: 'General & Support',
    subtitle: 'Direct response within 24 hours',
    text: 'support@campusnexus.com',
    link: 'mailto:support@campusnexus.com',
    linkText: 'Send Email',
    tone: 'primary',
  },
  {
    icon: PhoneCall,
    title: 'Helpline Number',
    badge: 'Placement Desk',
    subtitle: 'Mon - Sat • 9:00 AM - 6:00 PM',
    text: '+91 98765 43210',
    link: 'tel:+919876543210',
    linkText: 'Call Helpline',
    tone: 'success',
  },
  {
    icon: MapPin,
    title: 'Campus Office',
    badge: 'Walk-in Cell',
    subtitle: 'Visit our placement desk',
    text: 'Placement Cell, Campus Block A, Anand',
    link: 'https://maps.google.com/?q=Anand+Gujarat',
    linkText: 'View Campus Map',
    tone: 'warning',
    external: true,
  },
  {
    icon: Building2,
    title: 'Recruiter Inquiries',
    badge: 'Corporate Drives',
    subtitle: 'Company registration & partnerships',
    text: 'recruiter@campusnexus.com',
    link: 'mailto:recruiter@campusnexus.com',
    linkText: 'Partner With Us',
    tone: 'info',
  },
];

const FAQS = [
  {
    q: 'How can students apply for jobs & internships?',
    a: 'Register an account using your college email, complete your profile details and skills, upload your resume, and then browse and apply directly to available listings. You can track all application stages in real-time from your student dashboard.',
  },
  {
    q: 'Can companies post jobs and conduct campus drives?',
    a: 'Yes! Verified companies can sign up, create job postings with specific eligibility criteria, view applicant resumes, schedule assessment tests, and shortlist candidates directly on CampusNexus.',
  },
  {
    q: 'Is CampusNexus free for students?',
    a: 'Yes, CampusNexus is 100% free for students throughout their college tenure. There are no application fees or hidden charges.',
  },
  {
    q: 'How are companies and job postings verified?',
    a: 'Our Training and Placement Officers (TPO) verify company credentials, job descriptions, and salary structures before approving any posting to protect students from unverified or fraudulent drives.',
  },
];

/* ---------------- HOME PAGE ---------------- */
export function Home() {
  const navigate = useNavigate();
  const [heroQ, setHeroQ] = useState('');
  const jobs = useFetch(async () => (await api.get('/jobs', { params: { limit: 6 } })).data, []);
  const companies = useFetch(async () => (await api.get('/jobs/companies', { params: { limit: 6 } })).data, []);
  const { stats, placementRate } = usePublicStats();
  const featured = jobs.data?.data || [];
  const partners = companies.data?.data || [];
  const statJobs = stats.openJobs ?? '—';
  const statCompanies = stats.companies ?? '—';
  const statStudents = stats.students ?? '—';
  const plus = (v) => (typeof v === 'number' ? `${v.toLocaleString('en-IN')}+` : v);

  return (
    <PageShell>
      {/* Hero Section */}
      <section className="cc-hero">
        <div className="cc-hero-bg" aria-hidden="true">
          <span className="cc-hero-orb cc-hero-orb-1" />
          <span className="cc-hero-orb cc-hero-orb-2" />
          <span className="cc-hero-orb cc-hero-orb-3" />
        </div>
        <div className="row align-items-center g-4 g-lg-5 cc-hero-row">
          <div className="col-lg-7 col-12">
            <span className="cc-hero-badge">
              <Sparkles size={14} className="text-warning" />
              <span>Campus Placement Portal &bull; Trusted by Top Companies</span>
            </span>
            <h1 className="cc-hero-title">
              Build Your Career.<br />
              <span className="cc-text-gradient">Find Your Next Opportunity.</span>
            </h1>
            <p className="lead cc-hero-lead">
              CampusNexus is a smart campus placement platform connecting ambitious students with verified recruiters. Discover high-growth internships, crack placement drives, and launch your professional journey.
            </p>

            <div className="cc-hero-cta">
              <Link className="cc-hero-btn cc-hero-btn-primary" to="/jobs">
                <Briefcase size={18} />
                <span>Explore All Jobs</span>
                <ArrowRight size={16} className="cc-arrow-icon" />
              </Link>
              <Link className="cc-hero-btn cc-hero-btn-glass" to="/companies">
                <Building2 size={18} />
                <span>Featured Companies</span>
              </Link>
            </div>

            {/* Quick Search */}
            <form
              className="cc-hero-search"
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                const term = heroQ.trim();
                navigate(term ? `/jobs?search=${encodeURIComponent(term)}` : '/jobs');
              }}
            >
              <Search size={18} className="text-muted cc-search-icon" aria-hidden="true" />
              <input
                type="search"
                value={heroQ}
                onChange={(e) => setHeroQ(e.target.value)}
                placeholder="Search by role, skill (e.g. React, Python) or company..."
                aria-label="Search jobs"
              />
              <button type="submit" className="cc-hero-search-btn">
                <span>Search Jobs</span>
                <ArrowRight size={15} />
              </button>
            </form>

            <div className="cc-hero-trust">
              <span className="cc-hero-trust-item"><GraduationCap size={15} className="text-primary" /> 5,000+ Students</span>
              <span className="cc-hero-trust-item"><Building2 size={15} className="text-primary" /> 120+ Recruiting Partners</span>
              <span className="cc-hero-trust-item"><ShieldCheck size={15} className="text-success" /> 100% Verified Drives</span>
            </div>
          </div>

          {/* Right Highlights Column */}
          <div className="col-lg-5 col-12">
            <div className="cc-hero-stats cc-hero-stats-elevated">
              <div className="cc-hero-stats-head">
                <div className="d-flex align-items-center gap-2">
                  <span className="cc-hero-stats-icon"><TrendingUp size={18} /></span>
                  <b>Platform Highlights</b>
                </div>
                <span className="cc-live-pill"><span className="cc-live-dot" /> Live Data</span>
              </div>
              <div className="cc-hero-stats-grid">
                {[
                  [plus(statJobs), 'Active Jobs & Drives', Briefcase, 'cc-icon-primary'],
                  [plus(statCompanies), 'Partner Companies', Building2, 'cc-icon-secondary'],
                  [plus(statStudents), 'Registered Students', Users, 'cc-icon-success'],
                  [placementRate == null ? '94%' : `${placementRate}%`, 'Placement Success', Trophy, 'cc-icon-warning'],
                ].map(([v, l, I, ico]) => (
                  <div key={l} className="cc-hero-stat">
                    <span className={`cc-icon-box ${ico}`}><I size={20} /></span>
                    <div>
                      <div className="cc-hero-stat-value">{v}</div>
                      <div className="cc-hero-stat-label">{l}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="cc-hero-stats-foot">
                <ShieldCheck size={14} className="text-success" />
                <span>Verified recruiters &bull; Institutional college placement data</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Jobs Section */}
      <section className="cc-mkt-section">
        <SecHead
          eyebrow="Latest Opportunities"
          icon={<Briefcase size={14} />}
          title="Featured Jobs & Internships"
          text="Discover the latest verified opportunities posted by top organizations hiring on campus."
        />
        {jobs.loading ? (
          <div className="d-flex justify-content-center py-5"><Loading rows={3} height={140} /></div>
        ) : jobs.error && !jobs.data ? (
          <Empty
            title="Unable to load jobs"
            hint={apiErrorMessage(jobs.error)}
            action={
              <button className="btn btn-outline-primary btn-sm" onClick={jobs.reload}>
                <ArrowRight size={14} className="me-1" /> Retry
              </button>
            }
          />
        ) : !featured.length ? (
          <Empty title="No open jobs right now" hint="New placement drives are posted regularly. Check back soon." />
        ) : (
          <>
            <div className="cc-job-grid">
              {featured.map((j, i) => (
                <JobCard key={j._id} j={j} linkPrefix="/jobs" delay={Math.min(i, 5) * 60} />
              ))}
            </div>
            <div className="text-center mt-5">
              <Link className="btn btn-primary btn-lg cc-glow-btn" to="/jobs">
                <Briefcase size={18} className="me-2" />
                <span>View All Open Jobs</span>
                <ArrowRight size={16} className="ms-2" />
              </Link>
            </div>
          </>
        )}
      </section>

      {/* How it works: Completely Redesigned Section with Fix for Numbers & Hover Effects */}
      <section className="cc-mkt-section cc-process-section">
        <SecHead
          eyebrow="Simple Process"
          icon={<Zap size={14} />}
          title="How CampusNexus Works"
          text="Get from student registration to your official job offer letter in four easy, guided steps."
        />
        <div className="cc-steps cc-steps-pro">
          {STEPS.map(({ num, icon: I, title, text }, i) => (
            <Reveal key={num} delay={i * 90}>
              <article className="cc-step cc-step-pro">
                <div className="cc-step-watermark" aria-hidden="true">{num}</div>
                <div className="cc-step-header">
                  <div className="cc-step-pill">
                    <span className="cc-step-pill-dot" />
                    <span>STEP {num}</span>
                  </div>
                  <div className="cc-step-icon-box">
                    <I size={22} />
                  </div>
                </div>
                <div className="cc-step-body">
                  <h4 className="cc-step-title">{title}</h4>
                  <p className="cc-step-text">{text}</p>
                </div>
                {i < STEPS.length - 1 && <span className="cc-step-connector" aria-hidden="true" />}
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Featured Companies */}
      <section className="cc-mkt-section">
        <SecHead
          eyebrow="Hiring Partners"
          icon={<Building2 size={14} />}
          title="Top Recruiting Companies"
          text="Trusted organizations that regularly hire talented students through CampusNexus."
        />
        {companies.loading ? (
          <div className="d-flex justify-content-center py-5"><Loading rows={2} height={130} /></div>
        ) : companies.error && !companies.data ? (
          <Empty
            title="Unable to load companies"
            hint={apiErrorMessage(companies.error)}
            action={
              <button className="btn btn-outline-primary btn-sm" onClick={companies.reload}>
                <ArrowRight size={14} className="me-1" /> Retry
              </button>
            }
          />
        ) : !partners.length ? null : (
          <>
            <div className="cc-co-grid">
              {partners.map(({ company, approvedJobs }, i) => (
                <CompanyCard
                  key={company._id}
                  company={company}
                  approvedJobs={approvedJobs}
                  delay={Math.min(i, 5) * 60}
                />
              ))}
            </div>
            <div className="text-center mt-5">
              <Link className="btn btn-outline-primary btn-lg" to="/companies">
                <Building2 size={18} className="me-2" />
                <span>Explore All Recruiting Companies</span>
                <ArrowRight size={16} className="ms-2" />
              </Link>
            </div>
          </>
        )}
      </section>

      {/* Why Choose Us */}
      <section className="cc-mkt-section">
        <SecHead
          eyebrow="Platform Highlights"
          icon={<Sparkles size={14} />}
          title="Why Choose CampusNexus?"
          text="Everything students, recruitment managers, and university placement cells need on one modern, intelligent portal."
        />
        <div className="row g-4">
          {WHY.map(({ icon: I, title, text }, i) => (
            <div key={title} className="col-lg-4 col-md-6">
              <Reveal delay={(i % 3) * 80}>
                <div className="cc-mkt-card">
                  <span className="cc-mkt-icon"><I size={24} /></span>
                  <h4>{title}</h4>
                  <p>{text}</p>
                </div>
              </Reveal>
            </div>
          ))}
        </div>
      </section>

      {/* Live Stats Impact */}
      <section className="cc-mkt-section">
        <Reveal>
          <div className="cc-stats-band cc-stats-band-pro">
            <div className="cc-stats-band-glow-1" aria-hidden="true" />
            <div className="cc-stats-band-glow-2" aria-hidden="true" />
            <div className="text-center cc-stats-band-head">
              <span className="cc-stats-band-eyebrow">
                <Sparkles size={14} /> Proven Track Record
              </span>
              <h2>CampusNexus in Numbers</h2>
              <p>Empowering student careers and driving campus hiring excellence year over year.</p>
            </div>
            <div className="cc-stat-grid cc-stat-grid-pro">
              {[
                [plus(statStudents), 'Registered Students', Users],
                [plus(statCompanies), 'Partner Companies', Building2],
                [plus(statJobs), 'Total Jobs Posted', Briefcase],
                [statValue(stats.placed), 'Placed Students', Trophy],
              ].map(([v, l, I]) => (
                <article key={l} className="cc-stat-glass cc-stat-glass-pro">
                  <div className="cc-stat-glass-icon"><I size={24} /></div>
                  <div className="cc-stat-glass-content">
                    <div className="cc-stat-glass-value">{v}</div>
                    <div className="cc-stat-glass-label">{l}</div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* Testimonials */}
      <section className="cc-mkt-section">
        <SecHead
          eyebrow="Success Stories"
          icon={<MessageCircle size={14} />}
          title="What Our Users Say"
          text="Real experiences from students and coordinators who used CampusNexus to reach their career goals."
        />
        <div className="row g-4">
          {TESTIMONIALS.map((t, i) => (
            <div key={t.name} className="col-lg-4 col-md-6">
              <Reveal delay={i * 90}>
                <div className="cc-quote-card">
                  <span className="cc-quote-mark"><Quote size={32} /></span>
                  <p className="cc-quote-text">"{t.text}"</p>
                  <div className="cc-quote-author">
                    <div className="cc-quote-avatar">{t.name[0]}</div>
                    <div>
                      <h5 className="cc-quote-name">{t.name}</h5>
                      <small className="cc-quote-role">{t.role}</small>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          ))}
        </div>
      </section>

      {/* Call to Action */}
      <section className="cc-mkt-section mb-5">
        <CtaBanner
          title="Ready to Launch Your Career?"
          text="Join CampusNexus today. Discover placement drives, connect with leading recruiters, and take the confident next step toward your dream job."
          primary={
            <Link className="btn btn-light btn-lg fw-semibold" to="/jobs">
              <Briefcase size={18} className="me-1" /> Explore All Jobs
            </Link>
          }
          secondary={
            <Link className="btn btn-outline-light btn-lg fw-semibold" to="/register">
              <UserPlus size={18} className="me-1" /> Create Free Profile
            </Link>
          }
        />
      </section>
    </PageShell>
  );
}

/* ---------------- ABOUT PAGE (GROUND-UP COMPLETE REDESIGN) ---------------- */
export function About() {
  const { stats, placementRate } = usePublicStats();
  const plus = (v) => (v == null ? '—' : `${v.toLocaleString('en-IN')}+`);

  return (
    <PageShell>
      {/* 1. Hero Section */}
      <section className="cc-page-hero cc-page-hero-about">
        <div className="row align-items-center g-4 g-lg-5">
          <div className="col-lg-7 col-12">
            <span className="cc-eyebrow">
              <Sparkles size={14} className="text-warning" />
              <span>About CampusNexus &bull; Smart Campus Placement Platform</span>
            </span>
            <h1 className="cc-hero-title">
              Empowering Campus Talent.<br />
              <span className="cc-text-gradient">Elevating Placements.</span>
            </h1>
            <p className="lead mt-3 mb-4">
              CampusNexus is an intelligent campus recruitment ecosystem built in collaboration with university placement cells. We bridge talented students with verified global employers, eliminating placement friction through automation, transparency, and real-time tracking.
            </p>
            <div className="d-flex gap-3 flex-wrap">
              <Link className="btn btn-primary btn-lg cc-glow-btn" to="/jobs">
                <Briefcase size={18} className="me-2" /> Explore Verified Jobs
              </Link>
              <Link className="btn btn-outline-primary btn-lg" to="/contact">
                <Mail size={18} className="me-2" /> Talk to Placement Cell
              </Link>
            </div>
          </div>
          <div className="col-lg-5 col-12">
            <article className="cc-card cc-about-highlight-card">
              <div className="cc-card-body p-4">
                <div className="d-flex align-items-center gap-3 mb-3">
                  <div className="cc-brand-mark">C</div>
                  <div>
                    <h3 className="h5 m-0 fw-bold">CampusNexus</h3>
                    <small className="text-muted">Smart Campus Recruitment Portal</small>
                  </div>
                </div>
                <p className="text-muted small mb-4">
                  Trusted by leading engineering and management institutions to streamline company invites, student eligibility, online assessments, and verified job offers.
                </p>
                <div className="row g-3">
                  <div className="col-6">
                    <div className="p-3 rounded-4 cc-metric-box">
                      <b className="h3 d-block text-primary mb-1">{plus(stats.students)}</b>
                      <div className="small text-muted fw-semibold">Registered Students</div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="p-3 rounded-4 cc-metric-box">
                      <b className="h3 d-block text-primary mb-1">{plus(stats.companies)}</b>
                      <div className="small text-muted fw-semibold">Partner Companies</div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="p-3 rounded-4 cc-metric-box">
                      <b className="h3 d-block text-primary mb-1">{plus(stats.openJobs)}</b>
                      <div className="small text-muted fw-semibold">Active Openings</div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="p-3 rounded-4 cc-metric-box">
                      <b className="h3 d-block text-success mb-1">{placementRate == null ? '95%' : `${placementRate}%`}</b>
                      <div className="small text-muted fw-semibold">Placement Success</div>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* 2. Problem vs Solution: Bento Grid */}
      <section className="cc-mkt-section">
        <SecHead
          eyebrow="The Paradigm Shift"
          icon={<Lightbulb size={14} />}
          title="Why Campus Placements Needed Revolution"
          text="Traditional campus placements were broken by fragmented communication, lost notices, and manual shortlisting delays."
        />
        <div className="row g-4 align-items-stretch">
          <div className="col-lg-6 col-12">
            <Reveal>
              <div className="cc-bento-card cc-bento-problem h-100">
                <div className="cc-bento-badge cc-bento-badge-danger">
                  <span className="cc-badge-dot bg-danger" />
                  <span>The Traditional Chaos</span>
                </div>
                <h3 className="h4 fw-bold mt-3 mb-3">Manual, Fragmented & Stressful</h3>
                <ul className="cc-bento-list">
                  <li>
                    <b>Scattered Notices:</b> Drives announced on WhatsApp groups, Telegram, and physical notice boards where students easily miss deadlines.
                  </li>
                  <li>
                    <b>Manual Google Forms:</b> Inconsistent resume formats, manual eligibility calculations in Excel, and frequent clerical errors.
                  </li>
                  <li>
                    <b>Unverified Recruiter Claims:</b> Students exposed to unverified off-campus postings with zero institutional accountability.
                  </li>
                  <li>
                    <b>Black-box Shortlists:</b> Zero transparency into why a candidate was or was not selected for next interview rounds.
                  </li>
                </ul>
              </div>
            </Reveal>
          </div>

          <div className="col-lg-6 col-12">
            <Reveal delay={100}>
              <div className="cc-bento-card cc-bento-solution h-100">
                <div className="cc-bento-badge cc-bento-badge-success">
                  <span className="cc-badge-dot bg-success" />
                  <span>The CampusNexus Innovation</span>
                </div>
                <h3 className="h4 fw-bold mt-3 mb-3">Unified, Automated & Transparent</h3>
                <ul className="cc-bento-list">
                  <li>
                    <b>Single Verified Profile:</b> Standardized student profiles with verified academic transcripts, verified skills, and ATS-friendly resumes.
                  </li>
                  <li>
                    <b>1-Click Eligibility Screening:</b> Automated matching based on company CGPA criteria, branch requirements, and active backlog rules.
                  </li>
                  <li>
                    <b>TPO Verified Drives:</b> Every company and compensation package is vetted by institutional placement officers before posting.
                  </li>
                  <li>
                    <b>Real-time Telemetry:</b> Live application tracking, instant exam invitations, and official digital offer letter issuance.
                  </li>
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 3. Core Pillars */}
      <section className="cc-mkt-section">
        <SecHead
          eyebrow="Our Guiding Values"
          icon={<ShieldCheck size={14} />}
          title="The Pillars We Build On"
          text="The foundational standards that make CampusNexus trusted by universities and top employers."
        />
        <div className="row g-4">
          {[
            {
              icon: ShieldCheck,
              title: '100% Verified Opportunities',
              text: 'Every job role and internship drive on CampusNexus undergoes strict verification by college placement coordinators to prevent unverified or fraudulent postings.',
            },
            {
              icon: Users,
              title: 'Equal Opportunity For All',
              text: 'A level playing field where every eligible student has equal access to top companies based strictly on demonstrated skills, merit, and academic passion.',
            },
            {
              icon: Bot,
              title: 'AI Career Guidance',
              text: 'Smart skill gap analysis and automated resume suggestions help students prepare effectively for technical interviews and aptitude assessments.',
            },
            {
              icon: BarChart3,
              title: 'Full Process Transparency',
              text: 'Clear real-time tracking for every round: test shortlists, group discussion schedules, technical interview slots, and final offer releases.',
            },
            {
              icon: Building2,
              title: 'Institutional College Synergy',
              text: 'Built to empower Training & Placement Cells (TPOs) with robust batch broadcast alerts, compliance records, and placement audit reports.',
            },
            {
              icon: Trophy,
              title: 'Career Lifecycle Focus',
              text: 'From summer internship discovery in pre-final year to final dream-company placements, we guide students through every milestone.',
            },
          ].map(({ icon: Icon, title, text }, i) => (
            <div key={title} className="col-lg-4 col-md-6">
              <Reveal delay={(i % 3) * 80}>
                <div className="cc-pillar-card h-100">
                  <div className="cc-pillar-icon-box">
                    <Icon size={24} />
                  </div>
                  <h4 className="cc-pillar-title">{title}</h4>
                  <p className="cc-pillar-text">{text}</p>
                </div>
              </Reveal>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Who We Empower: Stakeholders Showcase */}
      <section className="cc-mkt-section">
        <SecHead
          eyebrow="Unified Ecosystem"
          icon={<Zap size={14} />}
          title="Designed for Every Stakeholder"
          text="Tailored digital experiences for students, hiring companies, and university coordinators."
        />
        <div className="row g-4">
          <div className="col-lg-4 col-md-6">
            <Reveal delay={0}>
              <div className="cc-stakeholder-card h-100">
                <div className="cc-stakeholder-head">
                  <span className="cc-stakeholder-icon cc-icon-student"><GraduationCap size={26} /></span>
                  <div>
                    <h4 className="fw-bold m-0">Students</h4>
                    <small className="text-muted">Aspiring Candidates</small>
                  </div>
                </div>
                <ul className="cc-stakeholder-list">
                  <li><CheckCircle2 size={16} className="text-success flex-shrink-0" /> Unified student profile & verified resume</li>
                  <li><CheckCircle2 size={16} className="text-success flex-shrink-0" /> One-click applications to verified drives</li>
                  <li><CheckCircle2 size={16} className="text-success flex-shrink-0" /> Instant interview schedules & offer tracking</li>
                  <li><CheckCircle2 size={16} className="text-success flex-shrink-0" /> Integrated online assessment portal</li>
                </ul>
                <Link to="/register" className="btn btn-outline-primary btn-sm mt-auto w-100">
                  Create Student Account &rarr;
                </Link>
              </div>
            </Reveal>
          </div>

          <div className="col-lg-4 col-md-6">
            <Reveal delay={80}>
              <div className="cc-stakeholder-card h-100">
                <div className="cc-stakeholder-head">
                  <span className="cc-stakeholder-icon cc-icon-recruiter"><Building2 size={26} /></span>
                  <div>
                    <h4 className="fw-bold m-0">Recruiters</h4>
                    <small className="text-muted">Hiring Organizations</small>
                  </div>
                </div>
                <ul className="cc-stakeholder-list">
                  <li><CheckCircle2 size={16} className="text-success flex-shrink-0" /> Direct access to pre-screened college talent</li>
                  <li><CheckCircle2 size={16} className="text-success flex-shrink-0" /> Automated eligibility filtering by CGPA/Branch</li>
                  <li><CheckCircle2 size={16} className="text-success flex-shrink-0" /> Online proctored test conducting</li>
                  <li><CheckCircle2 size={16} className="text-success flex-shrink-0" /> One-click shortlist & export management</li>
                </ul>
                <Link to="/register" className="btn btn-outline-primary btn-sm mt-auto w-100">
                  Register as Recruiter &rarr;
                </Link>
              </div>
            </Reveal>
          </div>

          <div className="col-lg-4 col-md-12">
            <Reveal delay={160}>
              <div className="cc-stakeholder-card h-100">
                <div className="cc-stakeholder-head">
                  <span className="cc-stakeholder-icon cc-icon-tpo"><ClipboardList size={26} /></span>
                  <div>
                    <h4 className="fw-bold m-0">TPO Officers</h4>
                    <small className="text-muted">Placement Directors</small>
                  </div>
                </div>
                <ul className="cc-stakeholder-list">
                  <li><CheckCircle2 size={16} className="text-success flex-shrink-0" /> Real-time placement dashboards & analytics</li>
                  <li><CheckCircle2 size={16} className="text-success flex-shrink-0" /> Batch-wide broadcast alerts & emails</li>
                  <li><CheckCircle2 size={16} className="text-success flex-shrink-0" /> Verified drive scheduling & slot management</li>
                  <li><CheckCircle2 size={16} className="text-success flex-shrink-0" /> Instant audit & accreditation compliance reports</li>
                </ul>
                <Link to="/contact" className="btn btn-outline-primary btn-sm mt-auto w-100">
                  Connect With Placement Desk &rarr;
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 5. CTA */}
      <section className="cc-mkt-section mb-5">
        <CtaBanner
          title="Ready to Elevate Your Campus Placement Journey?"
          text="Whether you are a student preparing for campus drives or an employer seeking exceptional university talent, CampusNexus has the tools you need."
          primary={<Link className="btn btn-light btn-lg" to="/jobs">Browse Verified Jobs &rarr;</Link>}
          secondary={<Link className="btn btn-outline-light btn-lg" to="/contact">Get in Touch</Link>}
        />
      </section>
    </PageShell>
  );
}

/* ---------------- JOBS PAGE (REDESIGNED SEARCH & FILTERS HUB) ---------------- */
export function JobsPublic() {
  const [params] = useSearchParams();
  const initialSearch = params.get('search') || '';
  const [q, setQ] = useState({
    search: initialSearch,
    location: '',
    jobType: '',
    workMode: '',
    sort: '',
    page: 1,
  });
  const search = useDebounced(q.search, 300);
  const location = useDebounced(q.location, 300);
  const query = { ...q, search, location };
  const res = useFetch(async () => (await api.get('/jobs', { params: query })).data, [JSON.stringify(query)], { keepPrevious: true });
  const { stats } = usePublicStats();
  const active = Boolean(search || location || q.jobType || q.workMode || q.sort);
  const total = res.data?.pagination?.total ?? 0;
  const pages = res.data?.pagination?.pages ?? 1;

  const clearAll = () => setQ({ search: '', location: '', jobType: '', workMode: '', sort: '', page: 1 });
  const setPage = (p) => {
    setQ((prev) => ({ ...prev, page: p }));
    requestAnimationFrame(() => document.getElementById('jobs-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const chips = [
    [stats.openJobs ?? '—', 'Open jobs', Briefcase],
    [stats.companies ?? '—', 'Partner companies', Building2],
    [stats.students ?? '—', 'Students hiring', Users],
  ];

  const quickTypes = [
    { val: '', label: 'All Jobs', icon: Sparkles },
    { val: 'full-time', label: 'Full Time', icon: Briefcase },
    { val: 'internship', label: 'Internships', icon: GraduationCap },
    { val: 'remote', label: 'Remote Only', icon: HomeIcon },
    { val: 'part-time', label: 'Part Time', icon: Clock },
  ];

  return (
    <PageShell>
      {/* Hero */}
      <section className="cc-page-hero cc-page-hero-center">
        <span className="cc-eyebrow"><Briefcase size={14} /> Career Opportunities</span>
        <h1 className="cc-hero-title">Find Your Next Opportunity</h1>
        <p className="lead">
          Explore verified internships, placement drives, and full-time positions from leading recruiting organizations.
        </p>
        <div className="cc-hero-chips">
          {chips.map(([v, l, I]) => (
            <span key={l} className="cc-hero-chip">
              <I size={15} />
              <b>{v}</b> {l}
            </span>
          ))}
        </div>
      </section>

      {res.error && !res.data ? (
        <div className="d-flex flex-column align-items-center justify-content-center py-5">
          <Empty
            title="Unable to load jobs"
            hint={apiErrorMessage(res.error)}
            action={
              <button className="btn btn-outline-primary btn-sm" onClick={res.reload}>
                <ArrowRight size={14} className="me-1" /> Retry
              </button>
            }
          />
        </div>
      ) : (
        <>
          {/* Redesigned Clean Search & Filters Hub */}
          <div className="cc-jobs-filter-hub" id="jobs-results">
            {/* Row 1: Search & Location Controls */}
            <div className="cc-search-bar-wrap">
              <div className="cc-search-input-group">
                <Search size={18} className="cc-search-icon text-muted" aria-hidden="true" />
                <input
                  type="text"
                  className="cc-main-search-input"
                  placeholder="Search role, skills (e.g. React, Python), or company..."
                  value={q.search}
                  onChange={(e) => setQ({ ...q, search: e.target.value, page: 1 })}
                />
                {q.search && (
                  <button
                    type="button"
                    className="cc-input-clear"
                    onClick={() => setQ({ ...q, search: '', page: 1 })}
                    aria-label="Clear search"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              <div className="cc-search-divider d-none d-md-block" />

              <div className="cc-search-location-group">
                <MapPin size={18} className="cc-location-icon text-muted" aria-hidden="true" />
                <input
                  type="text"
                  className="cc-location-input"
                  placeholder="Location or 'Remote'..."
                  value={q.location}
                  onChange={(e) => setQ({ ...q, location: e.target.value, page: 1 })}
                />
                {q.location && (
                  <button
                    type="button"
                    className="cc-input-clear"
                    onClick={() => setQ({ ...q, location: '', page: 1 })}
                    aria-label="Clear location"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              <button
                type="button"
                className="btn btn-primary cc-search-submit-btn"
                onClick={() => res.reload()}
              >
                <Search size={16} />
                <span>Search</span>
              </button>
            </div>

            {/* Row 2: Quick Category Pills (Horizontally Scrollable) */}
            <div className="cc-quick-pills-bar">
              <div className="cc-quick-pills-scroll">
                {quickTypes.map(({ val, label, icon: Icon }) => (
                  <button
                    key={val}
                    type="button"
                    className={`cc-quick-pill${q.jobType === val ? ' is-active' : ''}`}
                    onClick={() => setQ({ ...q, jobType: val, page: 1 })}
                  >
                    <Icon size={14} className="cc-pill-icon" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Row 3: Dropdown Selects & Reset Button */}
            <div className="cc-secondary-controls-bar">
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <div className="cc-select-wrap">
                  <select
                    id="filter-work-mode"
                    className="form-select form-select-sm cc-custom-select"
                    value={q.workMode}
                    onChange={(e) => setQ({ ...q, workMode: e.target.value, page: 1 })}
                    aria-label="Filter by work mode"
                  >
                    <option value="">Work Mode: All</option>
                    <option value="in-office">In-Office</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="remote">Remote</option>
                  </select>
                </div>

                <div className="cc-select-wrap">
                  <select
                    id="filter-sort-by"
                    className="form-select form-select-sm cc-custom-select"
                    value={q.sort}
                    onChange={(e) => setQ({ ...q, sort: e.target.value, page: 1 })}
                    aria-label="Sort listings"
                  >
                    <option value="">Sort: Latest Openings</option>
                    <option value="salary">Sort: Highest Salary</option>
                    <option value="deadline">Sort: Expiring Soon</option>
                  </select>
                </div>
              </div>

              {active && (
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm cc-reset-filters-btn"
                  onClick={clearAll}
                >
                  <X size={14} />
                  <span>Reset All Filters</span>
                </button>
              )}
            </div>
          </div>

          {/* Results Bar */}
          <div className="cc-results-bar">
            <p className="cc-results-count">
              {res.loading ? (
                'Finding matching jobs...'
              ) : (
                <>
                  Showing <b>{res.data?.data?.length || 0}</b> of <b>{total}</b> opportunities
                  {q.page > 1 ? ` (Page ${q.page} of ${pages})` : ''}
                </>
              )}
            </p>
          </div>

          {/* Jobs Grid Component */}
          <JobGrid q={q} setQ={setQ} res={res} linkPrefix="/jobs" rich />

          {/* Pagination */}
          {pages > 1 && (
            <div className="cc-pagination mt-5">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                disabled={q.page <= 1}
                onClick={() => setPage(q.page - 1)}
              >
                &larr; Previous
              </button>
              <span className="cc-page-info">
                Page <b>{q.page}</b> of <b>{pages}</b>
              </span>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                disabled={q.page >= pages}
                onClick={() => setPage(q.page + 1)}
              >
                Next &rarr;
              </button>
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}

/* Redesigned JobGrid Component */
export function JobGrid({ q, setQ, res, linkPrefix = '/jobs', rich = false }) {
  const { user } = useAuth();
  const canSave = user?.role === 'student';
  const saved = useFetch(async () => (canSave ? (await api.get('/saved-jobs')).data.data : []), [canSave]);
  const savedIds = new Set((saved.data || []).map((s) => String(s.job?._id || s.job)));
  const [busyId, setBusyId] = useState('');

  const toggleSave = async (jobId) => {
    if (!canSave || busyId) return;
    setBusyId(jobId);
    try {
      if (savedIds.has(String(jobId))) await api.delete(`/saved-jobs/${jobId}`);
      else await api.post('/saved-jobs', { jobId });
      saved.reload();
    } catch { /* ignore */ } finally { setBusyId(''); }
  };

  if (res.loading) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center py-5" style={{ minHeight: 380 }}>
        <Loading rows={4} height={140} />
      </div>
    );
  }

  const rows = res.data?.data || [];
  const filtersActive = Boolean(q.search || q.location || q.jobType || q.workMode);

  if (!rows.length) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center py-5" style={{ minHeight: 360 }}>
        <Empty
          title="No Opportunities Found"
          hint={filtersActive ? 'Try adjusting your search terms or filters to find open positions.' : 'No placement opportunities are active right now. Please check back later.'}
          action={
            filtersActive && (
              <button className="btn btn-outline-primary btn-sm" onClick={() => setQ({ search: '', location: '', jobType: '', workMode: '', sort: '', page: 1 })}>
                Clear Filters
              </button>
            )
          }
        />
      </div>
    );
  }

  return (
    <div className={`cc-job-grid${res.refreshing ? ' cc-refreshing' : ''}`}>
      {rows.map((j, i) => (
        <JobCard
          key={j._id}
          j={j}
          linkPrefix={linkPrefix}
          rich={rich}
          delay={Math.min(i, 6) * 50}
          canSave={canSave}
          isSaved={savedIds.has(String(j._id))}
          onToggleSave={toggleSave}
          busySave={busyId === j._id}
        />
      ))}
    </div>
  );
}

/* ---------------- COMPANIES PAGE ---------------- */
export function CompaniesPublic() {
  const [q, setQ] = useState({ search: '', industry: '', page: 1 });
  const search = useDebounced(q.search, 300);
  const query = { ...q, search, limit: 12 };
  const res = useFetch(async () => (await api.get('/jobs/companies', { params: query })).data, [JSON.stringify(query)], { keepPrevious: true });
  const companies = res.data?.data || [];
  const industries = res.data?.meta?.industries || [];
  const total = res.data?.pagination?.total ?? 0;
  const pages = res.data?.pagination?.pages ?? 1;
  const active = Boolean(search || q.industry);
  const { stats } = usePublicStats();

  const clearAll = () => setQ({ search: '', industry: '', page: 1 });
  const setPage = (p) => {
    setQ((prev) => ({ ...prev, page: p }));
    requestAnimationFrame(() => document.getElementById('companies-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const chips = [
    [stats.companies ?? '—', 'Partner companies', Building2],
    [stats.openJobs ?? '—', 'Active positions', Briefcase],
    [stats.students ?? '—', 'Students connected', Users],
  ];

  return (
    <PageShell>
      {/* Hero */}
      <section className="cc-page-hero cc-page-hero-center">
        <span className="cc-eyebrow"><Building2 size={14} /> Recruiting Partners</span>
        <h1 className="cc-hero-title">Top Recruiting Companies</h1>
        <p className="lead">
          Connect with trusted organizations, leading tech firms, and industry innovators regularly hiring graduates through CampusNexus.
        </p>
        <div className="cc-hero-chips">
          {chips.map(([v, l, I]) => (
            <span key={l} className="cc-hero-chip">
              <I size={15} />
              <b>{v}</b> {l}
            </span>
          ))}
        </div>
      </section>

      {res.error && !res.data ? (
        <div className="d-flex flex-column align-items-center justify-content-center py-5">
          <Empty
            title="Unable to load companies"
            hint={apiErrorMessage(res.error)}
            action={
              <button className="btn btn-outline-primary btn-sm" onClick={res.reload}>
                <ArrowRight size={14} className="me-1" /> Retry
              </button>
            }
          />
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="cc-filters cc-pub-filters" id="companies-results">
            <div className="cc-filter-field cc-filter-field--search">
              <label htmlFor="co-search">Company Name</label>
              <div className="position-relative w-100">
                <Search size={16} className="text-muted position-absolute" style={{ left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  id="co-search"
                  className="form-control ps-5"
                  placeholder="e.g. Google, Microsoft, TCS, Infosys, Amazon..."
                  value={q.search}
                  onChange={(e) => setQ({ ...q, search: e.target.value, page: 1 })}
                />
              </div>
            </div>

            <div className="cc-filter-field">
              <label htmlFor="co-industry">Industry</label>
              <select
                id="co-industry"
                className="form-select"
                value={q.industry}
                onChange={(e) => setQ({ ...q, industry: e.target.value, page: 1 })}
              >
                <option value="">All Industries</option>
                {industries.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="cc-filter-field cc-filter-field--action">
              <button className="btn btn-primary w-100" onClick={() => res.reload()}>
                <Search size={15} className="me-1" /> Search
              </button>
            </div>
          </div>

          {/* Results Bar */}
          <div className="cc-results-bar">
            <p className="cc-results-count">
              {res.loading ? (
                'Loading companies...'
              ) : (
                <>
                  Showing <b>{companies.length}</b> of <b>{total}</b> organizations
                  {q.page > 1 ? ` (Page ${q.page} of ${pages})` : ''}
                </>
              )}
            </p>
            {active && (
              <button className="btn btn-outline-secondary btn-sm cc-clear-btn" onClick={clearAll}>
                Clear Filters
              </button>
            )}
          </div>

          {/* Grid */}
          {res.loading ? (
            <div className="d-flex flex-column align-items-center justify-content-center py-5">
              <Loading rows={3} height={140} />
            </div>
          ) : !companies.length ? (
            <div className="py-5 text-center">
              <Empty
                title="No Companies Found"
                hint={active ? 'Try modifying your search query or industry filter.' : 'No partner companies are listed currently.'}
                action={active && <button className="btn btn-outline-primary btn-sm" onClick={clearAll}>Reset Filters</button>}
              />
            </div>
          ) : (
            <div className="cc-co-grid">
              {companies.map(({ company, approvedJobs }, i) => (
                <CompanyCard
                  key={company._id}
                  company={company}
                  approvedJobs={approvedJobs}
                  delay={Math.min(i, 6) * 60}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className="cc-pagination mt-5">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                disabled={q.page <= 1}
                onClick={() => setPage(q.page - 1)}
              >
                &larr; Previous
              </button>
              <span className="cc-page-info">
                Page <b>{q.page}</b> of <b>{pages}</b>
              </span>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                disabled={q.page >= pages}
                onClick={() => setPage(q.page + 1)}
              >
                Next &rarr;
              </button>
            </div>
          )}
        </>
      )}

      {/* Recruiter Callout */}
      <section className="cc-mkt-section mt-5 mb-5">
        <CtaBanner
          title="Looking to Hire Talented Campus Students?"
          text="Register as an employer on CampusNexus to post jobs, screen verified applicant resumes, and conduct campus recruitment drives seamlessly."
          primary={<Link className="btn btn-light btn-lg" to="/register">Register as Recruiter &rarr;</Link>}
          secondary={<Link className="btn btn-outline-light btn-lg" to="/contact">Contact Placement Cell</Link>}
        />
      </section>
    </PageShell>
  );
}

/* ---------------- CONTACT PAGE ---------------- */
export function Contact() {
  return (
    <PageShell>
      <ContactForm full />
    </PageShell>
  );
}

export function ContactForm({ full = false }) {
  const [f, setF] = useState({ name: '', email: '', subject: '', message: '' });
  const [done, setDone] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState({});

  const validate = (k, v) => {
    if (!String(v).trim()) return 'This field is required.';
    if (k === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return 'Enter a valid email address.';
    if (k === 'message' && v.trim().length < 10) return 'Please write at least 10 characters.';
    return '';
  };
  const fieldError = (k) => (touched[k] ? validate(k, f[k]) : '');
  const isValid = ['name', 'email', 'subject', 'message'].every((k) => !validate(k, f[k]));

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setDone(''); setSubmitted(false);
    setTouched({ name: true, email: true, subject: true, message: true });
    if (!isValid) {
      setErr('Please fill in all required fields accurately.');
      return;
    }
    setBusy(true);
    try {
      await api.post('/contact', { name: f.name, email: f.email, subject: f.subject, message: f.message });
      setDone('Thank you! Your message has been sent successfully. Our placement support team will get back to you shortly.');
      setSubmitted(true);
      setTouched({});
      setF({ name: '', email: '', subject: '', message: '' });
    } catch (e2) {
      setErr(apiErrorMessage(e2, 'Unable to send message. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (submitted) {
      Swal.fire({
        title: 'Message Sent Successfully!',
        text: 'Thank you for reaching out. A placement officer will respond to your inquiry shortly.',
        icon: 'success',
        confirmButtonColor: '#4f46e5',
      });
    }
  }, [submitted]);

    return (
    <>
      {full && (
        <section className="cc-page-hero cc-page-hero-center cc-contact-hero">
          <div className="container">
            <span className="cc-eyebrow mb-2">
              <Sparkles size={14} className="text-warning" />
              <span>Dedicated Placement Support & Help Desk</span>
            </span>
            <h1 className="cc-hero-title">
              How Can We <span className="cc-text-gradient">Help You?</span>
            </h1>
            <p className="lead cc-contact-lead">
              Have questions about student registration, corporate verification, or campus placement drives? We’re here to assist you every step of the way.
            </p>
          </div>
        </section>
      )}

      {/* 4 Direct Contact Channel Cards */}
      {full && (
        <section className="cc-contact-cards-section mb-5">
          <div className="row g-3 g-lg-4">
            {CONTACT_CARDS.map((c, i) => (
              <div key={c.title} className="col-12 col-sm-6 col-lg-3">
                <Reveal delay={i * 60}>
                  <div className={`cc-contact-card cc-contact-card-v2 cc-contact-tone-${c.tone}`}>
                    <div className="d-flex align-items-center justify-content-between mb-3 w-100">
                      <span className={`cc-contact-icon-bubble cc-bubble-${c.tone}`}>
                        <c.icon size={22} />
                      </span>
                      <span className="cc-contact-badge">{c.badge}</span>
                    </div>
                    <h3 className="cc-contact-v2-title">{c.title}</h3>
                    <p className="cc-contact-v2-sub">{c.subtitle}</p>
                    <div className="cc-contact-v2-value" title={c.text}>
                      {c.text}
                    </div>
                    <a
                      href={c.link}
                      target={c.external ? '_blank' : undefined}
                      rel={c.external ? 'noreferrer' : undefined}
                      className="cc-contact-v2-btn"
                    >
                      <span>{c.linkText}</span>
                      <ArrowRight size={14} className="cc-btn-arrow" />
                    </a>
                  </div>
                </Reveal>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Main Direct Message Form and FAQ Section */}
      <section className="cc-contact-main-section mb-5">
        <div className="row g-4 g-lg-5 align-items-stretch">
          {/* Form Column */}
          <div className="col-lg-7 col-12 d-flex flex-column">
            <Reveal className="h-100">
              <div className="cc-contact-form-box-v2 h-100">
                <div className="cc-form-box-header mb-4">
                  <span className="cc-eyebrow mb-2">
                    <MessageSquare size={14} className="text-primary" /> Direct Support Channel
                  </span>
                  <h2 className="h4 fw-bold m-0 cc-form-title">Send Us a Direct Message</h2>
                  <p className="text-muted small mt-1 mb-0">Fill out your query details below and our placement administration will reply within 24 business hours.</p>
                </div>

                {done && (
                  <div className="alert alert-success d-flex align-items-center gap-2 mb-4 rounded-3 border" role="alert">
                    <CheckCircle2 size={18} className="flex-shrink-0 text-success" />
                    <div className="small fw-semibold">{done}</div>
                  </div>
                )}
                {err && (
                  <div className="alert alert-danger d-flex align-items-center gap-2 mb-4 rounded-3 border" role="alert">
                    <Info size={18} className="flex-shrink-0 text-danger" />
                    <div className="small fw-semibold">{err}</div>
                  </div>
                )}

                <form onSubmit={submit} noValidate>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold small" htmlFor="c-name">
                        Your Full Name <span className="text-danger">*</span>
                      </label>
                      <div className="cc-input-wrap">
                        <User size={16} className="cc-input-icon" />
                        <input
                          id="c-name"
                          className={`form-control cc-input-styled ${fieldError('name') ? 'is-invalid' : ''}`}
                          placeholder="e.g. Rahul Patel"
                          value={f.name}
                          onChange={(e) => setF({ ...f, name: e.target.value })}
                          onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                        />
                      </div>
                      {fieldError('name') && <div className="invalid-feedback d-block">{fieldError('name')}</div>}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold small" htmlFor="c-email">
                        Email Address <span className="text-danger">*</span>
                      </label>
                      <div className="cc-input-wrap">
                        <Mail size={16} className="cc-input-icon" />
                        <input
                          id="c-email"
                          type="email"
                          className={`form-control cc-input-styled ${fieldError('email') ? 'is-invalid' : ''}`}
                          placeholder="you@example.com"
                          value={f.email}
                          onChange={(e) => setF({ ...f, email: e.target.value })}
                          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                        />
                      </div>
                      {fieldError('email') && <div className="invalid-feedback d-block">{fieldError('email')}</div>}
                    </div>

                    <div className="col-12">
                      <label className="form-label fw-semibold small" htmlFor="c-subj">
                        Subject / Topic <span className="text-danger">*</span>
                      </label>
                      <div className="cc-input-wrap">
                        <FileText size={16} className="cc-input-icon" />
                        <input
                          id="c-subj"
                          className={`form-control cc-input-styled ${fieldError('subject') ? 'is-invalid' : ''}`}
                          placeholder="e.g. Student Registration Inquiry, Campus Drive Query"
                          value={f.subject}
                          onChange={(e) => setF({ ...f, subject: e.target.value })}
                          onBlur={() => setTouched((t) => ({ ...t, subject: true }))}
                        />
                      </div>
                      {fieldError('subject') && <div className="invalid-feedback d-block">{fieldError('subject')}</div>}
                    </div>

                    <div className="col-12">
                      <div className="d-flex align-items-center justify-content-between mb-1">
                        <label className="form-label fw-semibold small m-0" htmlFor="c-msg">
                          Your Message <span className="text-danger">*</span>
                        </label>
                        <small className="text-muted" style={{ fontSize: '0.75rem' }}>Minimum 10 characters</small>
                      </div>
                      <div className="cc-input-wrap">
                        <textarea
                          id="c-msg"
                          rows={4}
                          className={`form-control cc-input-styled cc-textarea ${fieldError('message') ? 'is-invalid' : ''}`}
                          placeholder="Describe your inquiry in detail..."
                          value={f.message}
                          onChange={(e) => setF({ ...f, message: e.target.value })}
                          onBlur={() => setTouched((t) => ({ ...t, message: true }))}
                        />
                      </div>
                      {fieldError('message') && <div className="invalid-feedback d-block">{fieldError('message')}</div>}
                    </div>

                    <div className="col-12 mt-3">
                      <button type="submit" className="btn btn-primary btn-lg w-100 cc-contact-submit-btn" disabled={busy}>
                        {busy ? (
                          <>
                            <Loader2 size={18} className="cc-spin me-2" />
                            <span>Sending Your Message...</span>
                          </>
                        ) : (
                          <>
                            <Send size={17} className="me-2" />
                            <span>Send Message Now</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </Reveal>
          </div>

          {/* FAQ Column */}
          <div className="col-lg-5 col-12 d-flex flex-column">
            <Reveal delay={100} className="h-100">
              <div className="cc-faq-box-v2 h-100 d-flex flex-column">
                <div className="cc-faq-box-header mb-4">
                  <span className="cc-eyebrow mb-2">
                    <HelpCircle size={14} className="text-primary" /> Common Queries
                  </span>
                  <h2 className="h4 fw-bold m-0 cc-faq-title">Frequently Asked Questions</h2>
                  <p className="text-muted small mt-1 mb-0">Instant answers to frequent placement queries.</p>
                </div>

                <div className="cc-faq-accordion-v2">
                  {FAQS.map((faq, i) => (
                    <div
                      key={faq.q}
                      className={`cc-faq-card-v2${openFaq === i ? ' is-active' : ''}`}
                    >
                      <button
                        type="button"
                        className="cc-faq-trigger-v2"
                        onClick={() => setOpenFaq((curr) => (curr === i ? -1 : i))}
                        aria-expanded={openFaq === i}
                      >
                        <span className="cc-faq-q-text">{faq.q}</span>
                        <span className="cc-faq-icon-pill">
                          <ChevronDown size={15} className="cc-faq-chevron-icon" />
                        </span>
                      </button>
                      {openFaq === i && (
                        <div className="cc-faq-body-v2">
                          <p className="m-0">{faq.a}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Instant Helpline Helper Box */}
                <div className="cc-urgent-desk-card mt-auto pt-3">
                  <div className="p-3 rounded-3 cc-urgent-box border d-flex align-items-center gap-3">
                    <div className="cc-urgent-icon-pill">
                      <PhoneCall size={18} className="text-primary" />
                    </div>
                    <div>
                      <strong className="d-block small text-dark">Live Placement Emergency?</strong>
                      <span className="small text-muted d-block" style={{ fontSize: '0.8rem' }}>
                        Active drive support: <strong>+91 98765 43210</strong> (Ext. 104)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}