import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, ArrowUp, Building2, Briefcase, Clock, Compass, Heart, Info, Mail, MapPin, Phone, ShieldCheck, Sparkles, UserPlus, CheckCircle2,
} from 'lucide-react';

export function PublicFooter() {
  const toTop = useCallback(() => {
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch { window.scrollTo(0, 0); }
  }, []);

  return (
    <footer className="cc-public-footer">
      <div className="cc-footer-inner">
        <div className="cc-footer-grid">
          {/* Brand Info */}
          <div className="cc-footer-col cc-footer-col-brand">
            <Link to="/" className="cc-brand mb-3" aria-label="CareerConnect home">
              <span className="cc-brand-mark">
                <span className="cc-brand-letter">C</span>
              </span>
              <span className="cc-brand-name">
                Career<span>Connect</span>
              </span>
            </Link>
            <p className="cc-footer-about">
              Intelligent campus recruitment & internship ecosystem connecting talented students with verified global employers and university placement cells.
            </p>
            <div className="cc-footer-badges">
              <span className="cc-footer-badge">
                <ShieldCheck size={14} className="text-success" /> Verified Recruiters
              </span>
              <span className="cc-footer-badge">
                <Sparkles size={14} className="text-warning" /> 100% Free for Students
              </span>
            </div>
            <div className="cc-footer-social">
              <Link to="/contact" className="cc-footer-social-btn" aria-label="Contact Support" title="Contact Support">
                <Mail size={16} />
              </Link>
              <Link to="/about" className="cc-footer-social-btn" aria-label="About CareerConnect" title="About">
                <Info size={16} />
              </Link>
              <Link to="/companies" className="cc-footer-social-btn" aria-label="Partner Companies" title="Companies">
                <Building2 size={16} />
              </Link>
              <Link to="/jobs" className="cc-footer-social-btn" aria-label="Browse Jobs" title="Jobs">
                <Briefcase size={16} />
              </Link>
            </div>
          </div>

          {/* Platform Links */}
          <div className="cc-footer-col">
            <h6 className="cc-footer-title">Platform</h6>
            <ul className="cc-footer-list">
              <li>
                <Link to="/jobs">
                  <ArrowRight size={13} className="cc-footer-arrow" /> Find Verified Jobs
                </Link>
              </li>
              <li>
                <Link to="/companies">
                  <ArrowRight size={13} className="cc-footer-arrow" /> Top Hiring Partners
                </Link>
              </li>
              <li>
                <Link to="/about">
                  <ArrowRight size={13} className="cc-footer-arrow" /> About Placement Cell
                </Link>
              </li>
              <li>
                <Link to="/contact">
                  <ArrowRight size={13} className="cc-footer-arrow" /> Helpdesk & Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Student & TPO Hub */}
          <div className="cc-footer-col">
            <h6 className="cc-footer-title">Students & Recruiter</h6>
            <ul className="cc-footer-list">
              <li>
                <Link to="/login">
                  <ArrowRight size={13} className="cc-footer-arrow" /> Student Login
                </Link>
              </li>
              <li>
                <Link to="/register">
                  <ArrowRight size={13} className="cc-footer-arrow" /> Create Free Student Profile
                </Link>
              </li>
              <li>
                <Link to="/login">
                  <ArrowRight size={13} className="cc-footer-arrow" /> Recruiter & TPO Portal
                </Link>
              </li>
              <li>
                <Link to="/contact">
                  <ArrowRight size={13} className="cc-footer-arrow" /> Campus Drive Inquiries
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className="cc-footer-col cc-footer-col-contact">
            <h6 className="cc-footer-title">Placement Central Desk</h6>
            <ul className="cc-footer-contact">
              <li>
                <Mail size={16} className="cc-contact-icon text-primary flex-shrink-0" />
                <div>
                  <span className="d-block small text-muted">Email Support</span>
                  <a href="mailto:support@careerconnect.com">support@careerconnect.com</a>
                </div>
              </li>
              <li>
                <Phone size={16} className="cc-contact-icon text-primary flex-shrink-0" />
                <div>
                  <span className="d-block small text-muted">Direct Helpline</span>
                  <a href="tel:+919876543210">+91 98765 43210</a>
                </div>
              </li>
              <li>
                <MapPin size={16} className="cc-contact-icon text-primary flex-shrink-0" />
                <div>
                  <span className="d-block small text-muted">Campus Desk</span>
                  <span>Placement Cell, Block A, Anand, Gujarat</span>
                </div>
              </li>
              <li>
                <Clock size={16} className="cc-contact-icon text-primary flex-shrink-0" />
                <div>
                  <span className="d-block small text-muted">Support Hours</span>
                  <span className="cc-footer-clock-label">Mon &ndash; Sat: 9:00 AM &ndash; 6:00 PM</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom Bar */}
        <div className="cc-footer-bottom">
          <div className="d-flex align-items-center gap-3 flex-wrap">
            <div className="cc-footer-copy">
              &copy; {new Date().getFullYear()} <b>CareerConnect</b>. Empowering campus talent with intelligence & transparency.
            </div>
            <div className="cc-footer-status">
              <span className="cc-status-dot" />
              <span>Campus Network Live</span>
            </div>
          </div>
          <div className="cc-footer-legal">
            <Link to="/about">About Us</Link>
            <span className="cc-dot-divider" aria-hidden="true">&bull;</span>
            <Link to="/contact">Support Desk</Link>
            <span className="cc-dot-divider" aria-hidden="true">&bull;</span>
            <button type="button" className="cc-footer-top-btn" onClick={toTop} aria-label="Back to top">
              <ArrowUp size={14} /> Back to top
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
