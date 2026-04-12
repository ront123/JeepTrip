import { TranslationKey } from '@/constants/i18n';

/**
 * Maps a raw Supabase / network error message to a translation key.
 * Always returns a TranslationKey so the caller can pass it directly to t().
 */
export function mapAuthError(message: string): TranslationKey {
  const msg = message.toLowerCase();

  if (
    msg.includes('invalid login credentials') ||
    msg.includes('invalid credentials') ||
    msg.includes('wrong password') ||
    msg.includes('email not confirmed')     // treat unconfirmed as bad credentials UX
  ) {
    return 'error_invalid_credentials';
  }

  if (
    msg.includes('user already registered') ||
    msg.includes('email already') ||
    msg.includes('already exists') ||
    msg.includes('duplicate')
  ) {
    return 'error_email_taken';
  }

  if (
    msg.includes('password should be at least') ||
    msg.includes('password is too short') ||
    msg.includes('weak password')
  ) {
    return 'error_weak_password';
  }

  if (
    msg.includes('invalid email') ||
    msg.includes('unable to validate email') ||
    msg.includes('email format')
  ) {
    return 'error_email_invalid';
  }

  if (
    msg.includes('network') ||
    msg.includes('fetch') ||
    msg.includes('timeout') ||
    msg.includes('connection')
  ) {
    return 'error_network';
  }

  if (msg.includes('rejected')) {
    return 'error_rejected';
  }

  if (msg.includes('not found') || msg.includes('no rows')) {
    return 'error_profile_not_found';
  }

  return 'error_unknown';
}
