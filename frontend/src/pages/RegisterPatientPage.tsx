import { useMutation } from '@apollo/client';
import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { errorText } from '../errors';
import { PATIENTS, REGISTER_PATIENT } from '../graphql';

interface RegisterData {
  registerPatient: { patientId: string; name: string };
}

const empty = { firstName: '', lastName: '', dateOfBirth: '', email: '', phone: '' };

export function RegisterPatientPage() {
  const [form, setForm] = useState(empty);
  const [clientError, setClientError] = useState('');
  const [register, { loading, error, data }] = useMutation<RegisterData>(REGISTER_PATIENT, {
    refetchQueries: [PATIENTS],
  });

  function update(field: keyof typeof empty, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setClientError('');
    if (!form.firstName.trim() || !form.lastName.trim() || !form.dateOfBirth || !form.email.trim() || !form.phone.trim()) {
      setClientError('First name, last name, date of birth, email, and phone are required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setClientError('Enter a valid email address.');
      return;
    }
    const result = await register({ variables: { input: form } });
    if (result.data) {
      setForm(empty);
    }
  }

  return (
    <section className="narrow">
      <p className="eyebrow">Registration</p>
      <h1>New patient</h1>
      <p className="lede">Patient ID is assigned by the system. Enter fictional details only. This desk does not store a medical record.</p>
      <form className="stack" onSubmit={onSubmit}>
        <div className="split">
          <label>
            First name
            <input value={form.firstName} onChange={(event) => update('firstName', event.target.value)} />
          </label>
          <label>
            Last name
            <input value={form.lastName} onChange={(event) => update('lastName', event.target.value)} />
          </label>
        </div>
        <label>
          Date of birth
          <input type="date" value={form.dateOfBirth} onChange={(event) => update('dateOfBirth', event.target.value)} />
        </label>
        <label>
          Email
          <input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} />
        </label>
        <label>
          Phone
          <input value={form.phone} onChange={(event) => update('phone', event.target.value)} placeholder="9876543210" />
        </label>
        {clientError ? <p className="banner error">{clientError}</p> : null}
        {error ? <p className="banner error">{errorText(error)}</p> : null}
        {data ? (
          <p className="banner success" role="status">
            {data.registerPatient.name} was registered as {data.registerPatient.patientId}.{' '}
            <Link to="/appointments/new">Book an appointment</Link>
          </p>
        ) : null}
        <button type="submit" disabled={loading}>
          {loading ? 'Saving…' : 'Register patient'}
        </button>
      </form>
    </section>
  );
}
