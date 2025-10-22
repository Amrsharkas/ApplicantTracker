export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message) ||
         error.message.includes('Not authenticated') ||
         error.message.includes('Unauthorized');
}

// Google OAuth error handling
export function getGoogleAuthErrorMessage(error: string): string {
  switch (error) {
    case 'google-auth-failed':
      return 'Google authentication failed. Please try again.';
    case 'access_denied':
      return 'You denied access to your Google account. Please try again if you wish to continue with Google.';
    case 'access_denied_with_user_cancellation':
      return 'You cancelled the Google authentication. Please try again if you wish to continue with Google.';
    case 'session-save-failed':
      return 'Session initialization failed. Please try again.';
    default:
      return 'An error occurred during Google authentication. Please try again.';
  }
}

export function isGoogleAuthError(): boolean {
  const urlParams = new URLSearchParams(window.location.search);
  const error = urlParams.get('error');
  return error !== null;
}

export function getGoogleAuthError(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('error');
}

export function clearGoogleAuthError(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('error');
  window.history.replaceState({}, document.title, url.toString());
}