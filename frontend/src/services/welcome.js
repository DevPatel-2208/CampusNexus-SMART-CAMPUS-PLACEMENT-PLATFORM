import Swal from 'sweetalert2';
import { swalBase } from './alerts';
import { fireConfetti } from './celebration';

let showing = false;

/** Brand SVG icon used as the welcome dialog header mark. */
function welcomeIcon(kind = 'first') {
  const accent = kind === 'first' ? '#4f46e5' : '#0f9d6b';
  return `
    <svg class="cc-welcome-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="${accent}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      ${kind === 'first'
        ? `<path d="M16 7l-4 4l-2-2" stroke="${accent}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
           <circle cx="9" cy="15" r="1" fill="${accent}"/>
           <circle cx="14" cy="8" r="1" fill="${accent}" opacity="0.6"/>`
        : `<path d="M12 4l2 8m-4-4h8" stroke="${accent}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
           <path d="M4 16c0 2.21 1.79 4 4 4h8c2.21 0 4-1.79 4-4v-2.5" stroke="${accent}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`
      }
    </svg>
  `;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/**
 * Show exactly one welcome dialog. Resolves when the CTA is clicked OR the
 * dialog is dismissed (Escape / close / backdrop) — never traps the user.
 * @param {object} opts
 * @param {string} opts.name - authenticated user's name.
 * @param {boolean} opts.isFirstLogin - server-confirmed first login flag.
 */
export async function showWelcomeDialog({ name = 'there', isFirstLogin = false } = {}) {
  if (showing) return;
  showing = true;
  try {
    const first = !!isFirstLogin;
    fireConfetti({ intensity: first ? 'normal' : 'small' });

    await Swal.fire({
      ...swalBase(),
      icon: 'success',
      title: first ? 'Welcome to CampusNexus!' : `Welcome Back, ${escapeHtml(name)}!`,
      html: `
        <div class="cc-swal-extra cc-welcome-wrap">
          <button type="button" class="cc-welcome-dismiss" aria-label="Close welcome message">&times;</button>
          <div class="cc-welcome-text">
            <div class="cc-welcome-lead">
              ${first
                ? 'We\u2019re excited to have you here. Your career journey starts now.'
                : 'Great to see you again. Ready to continue your journey with CampusNexus?'
              }
            </div>
          </div>
        </div>
      `,
      confirmButtonText: first ? "Let's Get Started" : 'Continue to Dashboard',
      showCancelButton: false,
      showCloseButton: false,
      allowEscapeKey: true,
      allowOutsideClick: true,
      didOpen: (popup) => {
        popup.querySelector('.cc-welcome-dismiss')?.addEventListener('click', () => Swal.close());
      },
      timer: 8000,
      timerProgressBar: true,
    });
  } finally {
    showing = false;
  }
}
