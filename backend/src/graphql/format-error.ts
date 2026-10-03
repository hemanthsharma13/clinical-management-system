import { GraphQLFormattedError } from 'graphql';

const CODE_BY_STATUS: Record<number, string> = {
  400: 'BAD_USER_INPUT',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
};

interface OriginalError {
  statusCode?: number;
  message?: string | string[];
}

/**
 * Nest leaves some HTTP statuses, including 409, as INTERNAL_SERVER_ERROR and
 * attaches a stack trace. Clients should see a stable code and the message only.
 */
export function formatGraphqlError(formatted: GraphQLFormattedError): GraphQLFormattedError {
  const extensions = formatted.extensions ?? {};
  const original = extensions.originalError as OriginalError | undefined;
  const status = typeof extensions.status === 'number' ? extensions.status : original?.statusCode;
  const mapped = status ? CODE_BY_STATUS[status] : undefined;
  const code = mapped ?? (typeof extensions.code === 'string' ? extensions.code : 'INTERNAL_SERVER_ERROR');
  const rawMessage = Array.isArray(original?.message) ? original.message.join(' ') : original?.message;
  const safeClientError = status !== undefined && status < 500;
  const message = safeClientError
    ? rawMessage || formatted.message
    : process.env.NODE_ENV === 'production'
      ? 'The clinic service could not complete that request.'
      : formatted.message;

  return {
    message,
    locations: formatted.locations,
    path: formatted.path,
    extensions: { code },
  };
}
