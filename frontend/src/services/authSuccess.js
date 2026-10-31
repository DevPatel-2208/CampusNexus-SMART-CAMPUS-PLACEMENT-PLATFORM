import { showWelcomeDialog } from './welcome';

/**
 * Map an authenticated role to its dashboard route.
 */
export function homeFor(role) {
  return role === 'student' ? '/student' : role === 'company' ? '/company' : '/tpo';
}

/**
 * Centralized post-login flow. Shows exactly one welcome dialog (first-time or
 * returning user), celebrates with confetti, then navigates to the role-specific
 * dashboard. Used by both email login and Google OAuth so the logic lives once.
 *
 * The dialog resolves on confirm OR dismiss — the user is never trapped.
 * @param {object} opts
 * @param {object} opts.user - authenticated user profile ({ name, role }).
 * @param {boolean} [opts.isFirstLogin] - server-confirmed first-login flag.
 * @param {function} opts.navigate - react-router navigate function.
 * @param {function} [opts.setUser] - auth context setter for the profile.
 * @param {function} [opts.setPostLogin] - auth context setter to suppress the
 *   PublicOnly auto-redirect while the welcome flow completes.
 * @returns {Promise<void>}
 */
export async function handleLoginSuccess({ user, isFirstLogin, navigate, setUser, setPostLogin }) {
  const name = (user && user.name) || 'there';
  // Establish the authenticated session and redirect immediately so the user is
  // never left sitting on the login page even if the welcome dialog hangs.
  if (setPostLogin) setPostLogin(true);
  if (setUser) setUser(user);
  navigate(homeFor(user?.role), { replace: true });

  // Welcome dialog is cosmetic only — show it after navigation, never block.
  try {
    await showWelcomeDialog({ name, isFirstLogin: !!isFirstLogin });
  } catch (error) {
    console.error('Welcome dialog could not be shown:', error);
  } finally {
    if (setPostLogin) setPostLogin(false);
  }
}
