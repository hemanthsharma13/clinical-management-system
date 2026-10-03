import { useMutation } from '@apollo/client';
import { FormEvent, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { errorText } from '../errors';
import { LOGIN } from '../graphql';

interface LoginData {
  login: { accessToken: string; user: { email: string; name: string; role: string } };
}

export function LoginPage() {
  const { session, login } = useAuth();
  const [email, setEmail] = useState('receptionist@harbor-clinic.test');
  const [password, setPassword] = useState('receptionist123');
  const [submit, { loading, error }] = useMutation<LoginData>(LOGIN);

  if (session) {
    return <Navigate to="/patients" replace />;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const result = await submit({ variables: { input: { email, password } } });
    if (result.data) {
      login({ token: result.data.login.accessToken, user: result.data.login.user });
    }
  }

  return (
    <div className="login-screen">
      <section className="login-card">
        <p className="eyebrow">Harbor Clinic</p>
        <h1>Reception desk</h1>
        <p className="lede">Register patients and book doctor appointments. Use fictional patient details only.</p>
        <form onSubmit={onSubmit}>
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </label>
          {error ? <p className="banner error">{errorText(error)}</p> : null}
          <button type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <dl className="demo-accounts">
          <div>
            <dt>Receptionist</dt>
            <dd>receptionist@harbor-clinic.test / receptionist123</dd>
          </div>
          <div>
            <dt>Admin</dt>
            <dd>admin@harbor-clinic.test / admin123</dd>
          </div>
        </dl>
        <p className="login-docs-link">
          New here? <Link to="/docs">Explore the system field guide →</Link>
        </p>
      </section>
    </div>
  );
}
