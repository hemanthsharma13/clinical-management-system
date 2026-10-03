import { useQuery } from '@apollo/client';
import { useState } from 'react';
import { errorText } from '../errors';
import { CLINIC_SETTINGS, NOTIFICATIONS } from '../graphql';
import { formatClinicDateTime } from '../time';

interface NotificationItem {
  eventId: string;
  appointmentId: string;
  patientName: string;
  doctorName: string;
  message: string;
  status: string;
  createdAt: string;
}

interface NotificationsData {
  notifications: { items: NotificationItem[]; total: number; page: number; pageSize: number };
}

export function NotificationsPage() {
  const [page, setPage] = useState(1);
  const settings = useQuery<{ clinicSettings: { timezone: string } }>(CLINIC_SETTINGS);
  const timezone = settings.data?.clinicSettings.timezone ?? 'Asia/Kolkata';
  const { data, loading, error, refetch } = useQuery<NotificationsData>(NOTIFICATIONS, {
    variables: { page, pageSize: 8 },
    fetchPolicy: 'network-only',
    pollInterval: 4000,
  });
  const connection = data?.notifications;
  const pages = connection ? Math.max(1, Math.ceil(connection.total / connection.pageSize)) : 1;

  return (
    <section>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Notification service</p>
          <h1>Confirmations</h1>
        </div>
        <button type="button" className="ghost" onClick={() => void refetch()}>
          Refresh
        </button>
      </div>
      <p className="lede">
        Each booked appointment publishes an AppointmentBooked event. This list shows the notification record created by
        the consumer. No email or SMS is sent.
      </p>
      {error ? <p className="banner error">{errorText(error)}</p> : null}
      {loading && !connection ? <p>Waiting for notifications…</p> : null}
      {connection && connection.items.length === 0 ? (
        <p className="empty">No confirmation has been recorded yet. Book an appointment, then return here.</p>
      ) : null}
      <ul className="notice-list">
        {connection?.items.map((item) => (
          <li key={item.eventId}>
            <p>{item.message}</p>
            <small>
              {item.appointmentId} · {item.patientName} · {item.doctorName} · {item.status} ·{' '}
              {formatClinicDateTime(item.createdAt, timezone)}
            </small>
          </li>
        ))}
      </ul>
      {connection && connection.total > 0 ? (
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
