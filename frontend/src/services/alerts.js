import Swal from 'sweetalert2';
import { fireConfetti } from './celebration';

/** True when the dark theme is active on <html>. */
export function isDark() {
  return typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark';
}

/** Theme-aware SweetAlert2 base options (dark/light). */
export function swalBase(extra = {}) {
  const dark = isDark();
  return {
    background: dark ? '#121b2e' : '#ffffff',
    color: dark ? '#eaf0fb' : '#0f172a',
    confirmButtonColor: '#4f46e5',
    cancelButtonColor: dark ? '#1e293b' : '#f1f5f9',
    buttonsStyling: true,
    reverseButtons: true,
    customClass: {
      popup: 'cc-swal',
      confirmButton: 'cc-swal-confirm',
      cancelButton: 'cc-swal-cancel',
    },
    ...extra,
  };
}

/** Confirmation dialog. Resolves true when confirmed. */
export async function confirmAction(opts) {
  const r = await Swal.fire(swalBase({
    showCancelButton: true,
    confirmButtonText: 'Confirm',
    cancelButtonText: 'Cancel',
    focusCancel: true,
    ...opts,
  }));
  return r.isConfirmed;
}

/** Destructive confirmation (delete/cancel). Resolves true when confirmed. */
export async function confirmDanger({ title, text, confirmButtonText = 'Delete', icon = 'warning', confirmButtonColor = '#e11d48' }) {
  return confirmAction({ title, text, icon, confirmButtonText, confirmButtonColor });
}

/** Text/textarea prompt. Resolves the string, or null when cancelled. */
export async function promptText({ title, input = 'text', inputLabel, inputValue = '', placeholder = '', required = false, confirmButtonText = 'Submit', icon }) {
  const r = await Swal.fire(swalBase({
    title, icon, input, inputLabel, inputValue, placeholder,
    inputAttributes: input === 'textarea' ? { 'aria-label': inputLabel || title || '' } : undefined,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText: 'Cancel',
    inputValidator: required ? (v) => (v && String(v).trim() ? null : 'This field is required.') : undefined,
  }));
  return r.isConfirmed ? (r.value ?? '') : null;
}

/**
 * Themed success alert with an optional subtle confetti burst.
 * Resolves when the user clicks the confirm button (never traps).
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} opts.message - plain text shown below the title.
 * @param {string} [opts.confirmButtonText='OK']
 * @param {boolean} [opts.confetti=true]
 * @param {'normal'|'small'} [opts.intensity='small']
 */
export async function showSuccess({ title, message, confirmButtonText = 'OK', confetti = true, intensity = 'small' } = {}) {
  if (confetti) fireConfetti({ intensity });
  return Swal.fire({
    ...swalBase(),
    icon: 'success',
    title,
    html: `<div class="cc-swal-extra cc-success-wrap">${escapeHtml(message)}</div>`,
    confirmButtonText,
    showCancelButton: false,
    showCloseButton: true,
    allowEscapeKey: true,
    allowOutsideClick: true,
  });
}

/** Branded application confirmation with clear next steps and a celebration. */
export async function showApplicationSubmitted({ jobTitle, companyName } = {}) {
  fireConfetti({ intensity: 'normal' });
  const title = escapeHtml(jobTitle || 'this position');
  const company = escapeHtml(companyName || 'the hiring team');
  return Swal.fire({
    ...swalBase({
      title: 'Application submitted!',
      html: `<div class="cc-swal-extra cc-success-wrap">
        <p style="margin:0 0 14px">Your application for <strong>${title}</strong> has been sent to <strong>${company}</strong>.</p>
        <div style="display:inline-flex;align-items:center;gap:7px;padding:7px 12px;border-radius:999px;background:rgba(16,185,129,.1);color:#059669;font-size:13px;font-weight:700">
          <span aria-hidden="true">✓</span> Application received
        </div>
        <p style="margin:16px 0 0;font-size:13px">You can track your application status anytime from My Applications.</p>
      </div>`,
      icon: 'success',
      showDenyButton: true,
      confirmButtonText: 'Track Application',
      denyButtonText: 'Browse More Jobs',
      showCancelButton: false,
      showCloseButton: true,
      allowEscapeKey: true,
      allowOutsideClick: true,
      confirmButtonColor: '#4f46e5',
      denyButtonColor: '#64748b',
      customClass: {
        popup: 'cc-swal',
        confirmButton: 'cc-swal-confirm',
        denyButton: 'cc-swal-cancel',
      },
    }),
  });
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

