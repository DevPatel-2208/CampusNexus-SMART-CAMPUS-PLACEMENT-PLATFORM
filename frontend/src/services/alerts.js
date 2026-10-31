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
    cancelButtonColor: dark ? '#2e3d5c' : '#e5e9f2',
    buttonsStyling: true,
    reverseButtons: true,
    customClass: { popup: 'cc-swal' },
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
export async function confirmDanger({ title, text, confirmButtonText = 'Delete', icon = 'warning' }) {
  return confirmAction({ title, text, icon, confirmButtonText });
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

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

