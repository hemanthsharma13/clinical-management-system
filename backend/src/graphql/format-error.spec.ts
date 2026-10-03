import { GraphQLError } from 'graphql';
import { formatGraphqlError } from './format-error';

describe('formatGraphqlError', () => {
  it('maps a booking conflict to CONFLICT and drops the stack trace', () => {
    const formatted = new GraphQLError('Dr. Ananya Rao already has an appointment at this time.', {
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
        status: 409,
        stacktrace: ['secret frame'],
        originalError: {
          message: 'Dr. Ananya Rao already has an appointment at this time.',
          statusCode: 409,
        },
      },
    }).toJSON();

    const result = formatGraphqlError(formatted);
    expect(result.message).toBe('Dr. Ananya Rao already has an appointment at this time.');
    expect(result.extensions).toEqual({ code: 'CONFLICT' });
  });
});
