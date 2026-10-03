import { ApolloError } from '@apollo/client';

export function errorText(error: unknown): string {
  if (error instanceof ApolloError) {
    if (error.graphQLErrors.length > 0) {
      return error.graphQLErrors.map((item) => item.message).join(' ');
    }
    if (error.networkError) {
      return 'The clinic service is unavailable. Check that the API is running.';
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Something went wrong.';
}
