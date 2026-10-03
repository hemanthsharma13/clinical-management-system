import { useQuery } from '@apollo/client';
import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { errorText } from '../errors';
import { PATIENTS } from '../graphql';

interface Patient {
  patientId: string;
  name: string;
  dateOfBirth: string;
  email: string;
  phone: string;
}

interface PatientsData {
  patients: { items: Patient[]; total: number; page: number; pageSize: number };
}

export function PatientsPage() {
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data, loading, error } = useQuery<PatientsData>(PATIENTS, {
    variables: { search: search || undefined, page, pageSize: 8 },
    fetchPolicy: 'cache-and-network',
  });

  function onSearch(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setSearch(draft.trim());
  }

  const connection = data?.patients;
  const pages = connection ? Math.max(1, Math.ceil(connection.total / connection.pageSize)) : 1;

  return (
    <section>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Registry</p>
          <h1>Patients</h1>
        </div>
        <Link className="button" to="/patients/new">
          Register patient
        </Link>
      </div>
      <form className="search-row" onSubmit={onSearch}>
        <label>
          Search by name or patient id
          <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Asha Verma or P101" />
        </label>
        <button type="submit">Search</button>
      </form>
      {error ? <p className="banner error">{errorText(error)}</p> : null}
      {loading && !connection ? <p>Loading patients…</p> : null}
      {connection && connection.items.length === 0 ? (
        <p className="empty">No patients match this search. Register a fictional patient to begin.</p>
      ) : null}
      {connection && connection.items.length > 0 ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Patient ID</th>
                <th>Name</th>
                <th>Date of birth</th>
                <th>Email</th>
                <th>Phone</th>
              </tr>
            </thead>
            <tbody>
              {connection.items.map((patient) => (
                <tr key={patient.patientId}>
                  <td>{patient.patientId}</td>
                  <td>{patient.name}</td>
                  <td>{patient.dateOfBirth}</td>
                  <td>{patient.email}</td>
                  <td>{patient.phone}</td>
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
            Page {connection.page} of {pages} · {connection.total} patients
          </span>
          <button type="button" disabled={page >= pages} onClick={() => setPage((current) => current + 1)}>
            Next
          </button>
        </div>
      ) : null}
    </section>
  );
}
