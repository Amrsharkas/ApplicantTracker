export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message) || 
         error.message.includes('Not authenticated') ||
         error.message.includes('Unauthorized');
}