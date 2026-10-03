import { useMutation, useQuery } from '@apollo/client';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { errorText } from '../errors';
import { APPOINTMENTS, CANCEL_APPOINTMENT, CLINIC_SETTINGS } from '../graphql';
import { formatClinicDateTime } from '../time';

interface Appointment {
  appointmentId: string;
  patientName: string;
  doctorName: string;
  specialization: string;
  startTime: string;
  status: 'BOOKED' | 'CANCELLED';
  outboxStatus: string;
}

interface AppointmentsData {
  appointments: { items: Appointment[]; total: number; page: number; pageSize: number };
}

export function AppointmentsPage() {
  const [page, setPage] = useState(1);
  const settings = useQuery<{ clinicSettings: { timezone: string } }>(CLINIC_SETTINGS);
  const timezone = settings.data?.clinicSettings.timezone ?? 'Asia/Kolkata';
  const { data, loading, error, refetch } = useQuery<AppointmentsData>(APPOINTMENTS, {
    variables: { page, pageSize: 8 },
    fetchPolicy: 'cache-and-network',
  });
  const [cancel, cancellation] = useMutation(CANCEL_APPOINTMENT);

  async function onCancel(appointmentId: string) {
    const confirmed = window.confirm(`Cancel appointment ${appointmentId}? The doctor's slot will open again.`);
    if (!confirmed) {
      return;
    }
    await cancel({ variables: { appointmentId } });
    await refetch();
  }

  const connection = data?.appointments;
  const pages = connection ? Math.max(1, Math.ceil(connection.total / connection.pageSize)) : 1;

  return (
    <section>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Schedule</p>
          <h1>Appointments</h1>
        </div>
        <Link className="button" to="/appointments/new">
          Book appointment
        </Link>
      </div>
      {error ? <p className="banner error">{errorText(error)}</p> : null}
      {cancellation.error ? <p className="banner error">{errorText(cancellation.error)}</p> : null}
      {loading && !connection ? <p>Loading appointments…</p> : null}
      {connection && connection.items.length === 0 ? <p className="empty">No appointments have been booked.</p> : null}
      {connection && connection.items.length > 0 ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Appointment ID</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>When</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {connection.items.map((item) => (
                <tr key={item.appointmentId}>
                  <td>{item.appointmentId}</td>
                  <td>{item.patientName}</td>
                  <td>
                    {item.doctorName}
                    <small className="sub">{item.specialization}</small>
                  </td>
                  <td>{formatClinicDateTime(item.startTime, timezone)}</td>
                  <td>
                    <span className={item.status === 'BOOKED' ? 'status booked' : 'status cancelled'}>{item.status}</span>
                    {item.status === 'BOOKED' && item.outboxStatus !== 'PUBLISHED' ? (
                      <small className="sub">Notification {item.outboxStatus.toLowerCase()}</small>
                    ) : null}
                  </td>
                  <td>
                    {item.status === 'BOOKED' ? (
                      <button type="button" className="ghost" onClick={() => void onCancel(item.appointmentId)}>
                        Cancel
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {connection ? (
        <div className="pager">
          <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
            Previous
          </button>
          <span>
            Page {connection.page} of {pages}
          </span>
          <button type="button" disabled={page >= pages} onClick={() => setPage((current) => current + 1)}>
            Next
          </button>
        </div>
      ) : null}
    </section>
  );
}
