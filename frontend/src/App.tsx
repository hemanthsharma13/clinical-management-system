import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout, RequireAuth } from './components/Layout';
import { AppointmentsPage } from './pages/AppointmentsPage';
import { BookAppointmentPage } from './pages/BookAppointmentPage';
import { DocsPage } from './pages/DocsPage';
import { LoginPage } from './pages/LoginPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { PatientsPage } from './pages/PatientsPage';
import { RegisterPatientPage } from './pages/RegisterPatientPage';
import { StaffPage } from './pages/StaffPage';

export function App() {
  return (
    <Routes>
      <Route path="/docs" element={<DocsPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/patients" replace />} />
          <Route path="/patients" element={<PatientsPage />} />
          <Route path="/patients/new" element={<RegisterPatientPage />} />
          <Route path="/appointments" element={<AppointmentsPage />} />
          <Route path="/appointments/new" element={<BookAppointmentPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/staff" element={<StaffPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/patients" replace />} />
    </Routes>
  );
}
