import { useQuery } from '@apollo/client';
import { NavLink, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth';
import { CLINIC_SETTINGS } from '../graphql';

interface SettingsData {
  clinicSettings: { timezone: string; opensAt: string; lastSlotAt: string; slotMinutes: number };
}

export function RequireAuth() {
  const { session } = useAuth();
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

export function Layout() {
  const { session, logout } = useAuth();
  const { data } = useQuery<SettingsData>(CLINIC_SETTINGS);
  const timezone = data?.clinicSettings.timezone ?? 'Asia/Kolkata';

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">HC</span>
          <div>
            <strong>Harbor Clinic</strong>
            <small>Reception desk</small>
          </div>
        </div>
        <nav>
          <NavLink to="/patients" end>
            Patients
          </NavLink>
          <NavLink to="/patients/new">Register patient</NavLink>
          <NavLink to="/appointments" end>
            Appointments
          </NavLink>
          <NavLink to="/appointments/new">Book appointment</NavLink>
          <NavLink to="/notifications">Notifications</NavLink>
          {session?.user.role === 'ADMIN' ? <NavLink to="/staff">Staff</NavLink> : null}
        </nav>
        <p className="sidebar-note">Hours 09:00–17:00 · {timezone}</p>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Signed in</p>
            <strong>{session?.user.name}</strong>
          </div>
          <div className="topbar-actions">
            <span className="role-pill">{session?.user.role}</span>
            <button type="button" className="ghost" onClick={logout}>
              Log out
            </button>
          </div>
        </header>
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
