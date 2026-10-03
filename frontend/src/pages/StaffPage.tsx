import { useQuery } from '@apollo/client';
import { errorText } from '../errors';
import { STAFF_USERS } from '../graphql';

interface StaffData {
  staffUsers: Array<{ email: string; name: string; role: string }>;
}

export function StaffPage() {
  const { data, loading, error } = useQuery<StaffData>(STAFF_USERS, { fetchPolicy: 'network-only' });

  return (
    <section>
      <p className="eyebrow">Administration</p>
      <h1>Staff</h1>
      <p className="lede">This query is allowed for ADMIN only. A receptionist token is rejected by the API.</p>
      {loading ? <p>Loading staff…</p> : null}
      {error ? <p className="banner error">{errorText(error)}</p> : null}
      {data ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {data.staffUsers.map((user) => (
                <tr key={user.email}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
