import { useMutation, useQuery } from '@apollo/client';
import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { errorText } from '../errors';
import { APPOINTMENTS, AVAILABILITY, BOOK_APPOINTMENT, CLINIC_SETTINGS, DOCTORS, NOTIFICATIONS, PATIENTS } from '../graphql';
import { addCalendarDays, clinicToday, slotLabel } from '../time';

interface Patient {
  patientId: string;
  name: string;
  dateOfBirth: string;
}

interface Doctor {
  doctorId: string;
  name: string;
  specialization: string;
}

interface Slot {
  startTime: string;
  state: 'AVAILABLE' | 'BOOKED' | 'PAST';
}

export function BookAppointmentPage() {
  const settings = useQuery<{ clinicSettings: { timezone: string } }>(CLINIC_SETTINGS);
  const timezone = settings.data?.clinicSettings.timezone ?? 'Asia/Kolkata';
  const [patientQuery, setPatientQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [patient, setPatient] = useState<Patient | null>(null);
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState(() => addCalendarDays(clinicToday(timezone), 1));
  const [slot, setSlot] = useState('');

  const patients = useQuery<{ patients: { items: Patient[] } }>(PATIENTS, {
    variables: { search: submittedQuery || undefined, page: 1, pageSize: 8 },
  });
  const doctors = useQuery<{ doctors: Doctor[] }>(DOCTORS);
  const availability = useQuery<{ doctorAvailability: Slot[] }>(AVAILABILITY, {
    variables: { doctorId, date },
    skip: !doctorId || !date,
    fetchPolicy: 'network-only',
  });
  const [book, booking] = useMutation<{
    bookAppointment: { appointmentId: string; patientName: string; doctorName: string; outboxStatus: string };
  }>(BOOK_APPOINTMENT, {
    refetchQueries: [APPOINTMENTS, NOTIFICATIONS],
  });

  const selectedDoctor = doctors.data?.doctors.find((item) => item.doctorId === doctorId);

  function onPatientSearch(event: FormEvent) {
    event.preventDefault();
    setSubmittedQuery(patientQuery.trim());
  }

  async function onBook() {
    if (!patient || !doctorId || !slot) {
      return;
    }
    const result = await book({ variables: { input: { patientId: patient.patientId, doctorId, startTime: slot } } });
    if (result.data) {
      setSlot('');
      await availability.refetch();
    }
  }

  return (
    <section>
      <p className="eyebrow">Scheduling</p>
      <h1>Book appointment</h1>
      <p className="lede">Appointments last 30 minutes. A doctor cannot be booked twice for the same slot.</p>
      <div className="book-grid">
        <article className="panel">
          <h2>1. Patient</h2>
          <form className="inline-form" onSubmit={onPatientSearch}>
            <input
              value={patientQuery}
              onChange={(event) => setPatientQuery(event.target.value)}
              placeholder="Search name or id"
              aria-label="Search patients"
            />
            <button type="submit">Find</button>
          </form>
          {patients.error ? <p className="banner error">{errorText(patients.error)}</p> : null}
          <ul className="choice-list">
            {patients.data?.patients.items.map((item) => (
              <li key={item.patientId}>
                <button
                  type="button"
                  className={patient?.patientId === item.patientId ? 'choice selected' : 'choice'}
                  onClick={() => setPatient(item)}
                  aria-pressed={patient?.patientId === item.patientId}
                >
                  <strong>{item.name}</strong>
                  <span>
                    {item.patientId} · {item.dateOfBirth}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {patients.data?.patients.items.length === 0 ? (
            <p className="empty">
              No patients yet. <Link to="/patients/new">Register one</Link>.
            </p>
          ) : null}
        </article>
        <article className="panel">
          <h2>2. Doctor</h2>
          <ul className="choice-list">
            {doctors.data?.doctors.map((item) => (
              <li key={item.doctorId}>
                <button
                  type="button"
                  className={doctorId === item.doctorId ? 'choice selected' : 'choice'}
                  onClick={() => {
                    setDoctorId(item.doctorId);
                    setSlot('');
                  }}
                  aria-pressed={doctorId === item.doctorId}
                >
                  <strong>{item.name}</strong>
                  <span>
                    {item.doctorId} · {item.specialization}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </article>
        <article className="panel">
          <h2>3. Time</h2>
          <label>
            Date
            <input
              type="date"
              value={date}
              min={clinicToday(timezone)}
              onChange={(event) => {
                setDate(event.target.value);
                setSlot('');
              }}
            />
          </label>
          {availability.error ? <p className="banner error">{errorText(availability.error)}</p> : null}
          <div className="slots">
            {availability.data?.doctorAvailability.map((item) => (
              <button
                key={item.startTime}
                type="button"
                className={slot === item.startTime ? 'slot selected' : 'slot'}
                disabled={item.state !== 'AVAILABLE'}
                onClick={() => setSlot(item.startTime)}
              >
                {slotLabel(item.startTime)}
                <small>{item.state === 'AVAILABLE' ? 'Open' : item.state === 'BOOKED' ? 'Taken' : 'Past'}</small>
              </button>
            ))}
          </div>
        </article>
      </div>
      <div className="confirm-bar">
        <div>
          <p className="eyebrow">Confirm</p>
          <strong>
            {patient ? patient.name : 'Select a patient'}
            {' · '}
            {selectedDoctor ? selectedDoctor.name : 'Select a doctor'}
            {' · '}
            {slot ? `${date} ${slotLabel(slot)}` : 'Select a time'}
          </strong>
        </div>
        <button type="button" disabled={!patient || !doctorId || !slot || booking.loading} onClick={() => void onBook()}>
          {booking.loading ? 'Booking…' : 'Confirm appointment'}
        </button>
      </div>
      {booking.error ? <p className="banner error">{errorText(booking.error)}</p> : null}
      {booking.data ? (
        <p className="banner success" role="status">
          Appointment {booking.data.bookAppointment.appointmentId} is booked for {booking.data.bookAppointment.patientName}{' '}
          with {booking.data.bookAppointment.doctorName}. Confirmation status: {booking.data.bookAppointment.outboxStatus}.{' '}
          <Link to="/notifications">View notifications</Link>
        </p>
      ) : null}
    </section>
  );
}
