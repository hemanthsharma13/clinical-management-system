import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { SESSION_KEY } from './auth';

const httpLink = new HttpLink({ uri: '/graphql' });

const authLink = setContext((_, { headers }) => {
  const raw = sessionStorage.getItem(SESSION_KEY);
  const token = raw ? (JSON.parse(raw) as { token?: string }).token : undefined;
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

const errorLink = onError(({ graphQLErrors, operation }) => {
  if (operation.operationName === 'Login') {
    return;
  }
  const unauthenticated = graphQLErrors?.some(
    (error) =>
      error.extensions?.code === 'UNAUTHENTICATED' || /authentication is required/i.test(error.message),
  );
  if (unauthenticated) {
    sessionStorage.removeItem(SESSION_KEY);
    if (window.location.pathname !== '/login') {
      window.location.assign('/login');
    }
  }
});

export const apolloClient = new ApolloClient({
  link: ApolloLink.from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
});
