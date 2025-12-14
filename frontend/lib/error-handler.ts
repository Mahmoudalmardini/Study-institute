/**
 * Error Handler Utility for API Requests
 * 
 * Handles common error scenarios:
 * - 429: Rate limiting (retry after delay)
 * - 401: Unauthorized (redirect to login)
 * - 403: Forbidden
 * - 404: Not found
 * - 500: Server error
 */

interface ErrorHandlerOptions {
  onRateLimit?: () => void;
  onUnauthorized?: () => void;
  defaultMessage?: string;
  retryDelay?: number;
}

interface ErrorResult {
  message: string;
  shouldRetry: boolean;
  shouldLogout: boolean;
}

/**
 * Handle API errors with proper status code differentiation
 * 
 * @param err - The error object from axios/fetch
 * @param options - Configuration options
 * @returns ErrorResult with message and action flags
 */
export function handleApiError(
  err: any,
  options: ErrorHandlerOptions = {}
): ErrorResult {
  const {
    defaultMessage = 'An error occurred. Please try again.',
    retryDelay = 2000,
  } = options;

  let message = defaultMessage;
  let shouldRetry = false;
  let shouldLogout = false;

  if (err.response) {
    const status = err.response.status;
    const errorData = err.response.data;

    message = errorData?.message || errorData?.error || message;

    switch (status) {
      case 429:
        // Rate limit hit - don't logout, show friendly message
        message = 'Too many requests. Please wait a moment before trying again.';
        shouldRetry = true;
        if (options.onRateLimit) {
          setTimeout(options.onRateLimit, retryDelay);
        }
        break;

      case 401:
        // Unauthorized - need to login again
        message = 'Unauthorized. Please login again.';
        shouldLogout = true;
        if (options.onUnauthorized) {
          setTimeout(options.onUnauthorized, 2000);
        }
        break;

      case 403:
        message = 'You do not have permission to perform this action.';
        break;

      case 404:
        message = errorData?.message || 'Resource not found.';
        break;

      case 409:
        message = errorData?.message || 'A conflict occurred. Resource may already exist.';
        break;

      case 500:
        message = 'Server error. Please try again later.';
        break;

      default:
        message = `Error ${status}: ${message}`;
    }
  } else if (err.message) {
    message = err.message;
  }

  return { message, shouldRetry, shouldLogout };
}

/**
 * Logout helper - clears tokens and redirects to login
 */
export function performLogout(router: any) {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }
  router.push('/login');
}

