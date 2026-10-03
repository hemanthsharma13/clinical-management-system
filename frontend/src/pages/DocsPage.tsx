import { ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
import './docs.css';

type IconName = 'arrow' | 'bolt' | 'calendar' | 'check' | 'code' | 'database' | 'lock' | 'people' | 'pulse';

const snippets = {
  register: `mutation RegisterPatient {
  registerPatient(input: {
    firstName: "Asha"
    lastName: "Verma"
    dateOfBirth: "1992-04-12"
    email: "asha@example.test"
    phone: "9876543210"
  }) {
    patientId
    name
  }
}`,
  book: `mutation BookAppointment {
  bookAppointment(input: {
    patientId: "P101"
    doctorId: "D201"
    startTime: "2026-10-06T09:30"
  }) {
    appointmentId
    status
    outboxStatus
  }
}`,
  event: `{
  "eventId": "6f1c0e3a-2d4b-4a7e",
  "eventType": "AppointmentBooked",
  "eventVersion": "1.0",
  "producer": "appointment-module",
  "payload": {
    "appointmentId": "A1001",
    "patientId": "P101",
    "doctorId": "D201",
    "startTime": "2026-10-06T04:00:00.000Z"
  }
}`,
};

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    arrow: <><path d="M5 12h14" /><path d="m14 7 5 5-5 5" /></>,
    bolt: <path d="m13 2-9 12h8l-1 8 9-12h-8l1-8Z" />,
    calendar: <><path d="M6 2v4M18 2v4M3 9h18" /><rect x="3" y="4" width="18" height="18" rx="3" /><path d="m8 15 2 2 5-5" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    code: <><path d="m8 9-3 3 3 3M16 9l3 3-3 3M14 5l-4 14" /></>,
    database: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
    people: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-4 2-6 6-6s6 2 6 6M16 5a3 3 0 0 1 0 6M17 14c3 .4 4 2.4 4 6" /></>,
    pulse: <path d="M3 12h4l2-6 4 12 2-6h6" />,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button className="docs-copy" type="button" onClick={() => void copy()}>
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

export function DocsPage() {
  const [snippet, setSnippet] = useState<keyof typeof snippets>('book');

  return (
    <div className="docs-site">
      <div className="docs-noise" />
      <header className="docs-nav">
        <a className="docs-logo" href="#top" aria-label="Harbor Clinic documentation home">
          <span>H</span>
          <div>
            Harbor Clinic
            <small>Engineering field guide</small>
          </div>
        </a>
        <nav aria-label="Documentation sections">
          <a href="#architecture">Architecture</a>
          <a href="#reliability">Reliability</a>
          <a href="#api">GraphQL</a>
          <a href="#decisions">Decisions</a>
        </nav>
        <Link className="docs-app-link" to="/login">
          Open the desk <Icon name="arrow" />
        </Link>
      </header>

      <main id="top" className="docs-main">
        <section className="docs-hero">
          <div className="docs-hero-copy">
            <div className="docs-kicker"><span /> System handbook · v1.0</div>
            <h1>Clinic scheduling,<br /><em>without the waiting room.</em></h1>
            <p>
              A practical tour through a production-minded appointment platform—built with React, NestJS,
              GraphQL, MongoDB, and Kafka.
            </p>
            <div className="docs-hero-actions">
              <a className="docs-primary" href="#architecture">Explore the system <Icon name="arrow" /></a>
              <a className="docs-secondary" href="#quickstart"><Icon name="code" /> Run locally</a>
            </div>
            <div className="docs-proof">
              <div><strong>32</strong><span>tests passing</span></div>
              <div><strong>30m</strong><span>fixed slots</span></div>
              <div><strong>1×</strong><span>notification delivery</span></div>
            </div>
          </div>

          <div className="docs-hero-visual" aria-label="Booking flow preview">
            <div className="docs-orbit docs-orbit-one" />
            <div className="docs-orbit docs-orbit-two" />
            <div className="docs-float docs-float-top">
              <span className="docs-live"><i /> LIVE</span>
              <strong>AppointmentBooked</strong>
              <small>eventVersion 1.0</small>
            </div>
            <div className="docs-calendar-card">
              <div className="docs-calendar-head">
                <div><small>OCT</small><strong>06</strong></div>
                <span>Tuesday · Asia/Kolkata</span>
              </div>
              <div className="docs-calendar-body">
                <div className="docs-time"><span>09:00</span><i /></div>
                <div className="docs-appointment">
                  <span className="docs-avatar">AV</span>
                  <div><strong>Asha Verma</strong><small>Dr. Ananya Rao · 30 min</small></div>
                  <b><Icon name="check" /></b>
                </div>
                <div className="docs-time"><span>09:30</span><i /></div>
                <div className="docs-time muted"><span>10:00</span><i /></div>
              </div>
            </div>
            <div className="docs-float docs-float-bottom">
              <b><Icon name="bolt" /></b>
              <div><strong>Confirmation recorded</strong><small>Idempotent consumer · 18ms</small></div>
            </div>
          </div>
        </section>

        <section className="docs-marquee" aria-label="Technology stack">
          <div>
            <span>React + TypeScript</span><i>✦</i><span>NestJS</span><i>✦</i><span>GraphQL</span><i>✦</i>
            <span>MongoDB</span><i>✦</i><span>Apache Kafka</span><i>✦</i><span>Kubernetes</span>
          </div>
        </section>

        <section className="docs-section docs-intro" id="architecture">
          <div className="docs-section-heading">
            <span className="docs-number">01</span>
            <div>
              <p className="docs-kicker">Architecture that earns its keep</p>
              <h2>Simple where it should be.<br /><em>Separated where it matters.</em></h2>
            </div>
            <p>
              One deployable, three explicit business boundaries. The notification path is asynchronous,
              while every receptionist interaction stays fast and predictable.
            </p>
          </div>

          <div className="docs-architecture">
            <div className="docs-arch-client">
              <span className="docs-icon coral"><Icon name="people" /></span>
              <small>CLIENT</small><strong>React desk</strong><p>Receptionist workflow</p>
            </div>
            <div className="docs-connector"><span>GraphQL / HTTPS</span><i /></div>
            <div className="docs-arch-core">
              <div className="docs-core-label"><span>NestJS API</span><b>MODULAR MONOLITH</b></div>
              <div className="docs-modules">
                <article><span className="docs-icon blue"><Icon name="people" /></span><strong>Patient</strong><small>Register · Search</small></article>
                <article><span className="docs-icon coral"><Icon name="calendar" /></span><strong>Appointment</strong><small>Book · Cancel</small></article>
                <article><span className="docs-icon lime"><Icon name="pulse" /></span><strong>Notification</strong><small>Consume · Record</small></article>
              </div>
            </div>
            <div className="docs-arch-sinks">
              <article><span className="docs-icon purple"><Icon name="database" /></span><div><small>STATE</small><strong>MongoDB</strong></div></article>
              <article><span className="docs-icon orange"><Icon name="bolt" /></span><div><small>EVENTS</small><strong>Kafka</strong></div></article>
            </div>
          </div>

          <div className="docs-callout">
            <span>Why not microservices?</span>
            <p>
              At this scale, service boundaries would add deployment and transaction complexity without adding
              business value. The modules are deliberately shaped so Notification can split out when scale demands it.
            </p>
            <a href="#decisions">Read ADR 001 <Icon name="arrow" /></a>
          </div>
        </section>

        <section className="docs-section docs-flow-section">
          <div className="docs-flow-copy">
            <span className="docs-number">02</span>
            <p className="docs-kicker">One booking, two paths</p>
            <h2>Immediate response.<br /><em>Durable follow-through.</em></h2>
            <p>
              The booking is returned as soon as MongoDB accepts it. Confirmation work continues asynchronously,
              insulated from temporary broker or consumer failure.
            </p>
            <ul>
              <li><Icon name="check" /><span><strong>Synchronous</strong>GraphQL validates and saves the appointment.</span></li>
              <li><Icon name="bolt" /><span><strong>Asynchronous</strong>Kafka delivers the confirmation event.</span></li>
              <li><Icon name="lock" /><span><strong>Recoverable</strong>Outbox state survives process restarts.</span></li>
            </ul>
          </div>
          <div className="docs-flow-map">
            <div className="docs-flow-line" />
            {[
              ['01', 'Validate', 'Patient, doctor, clinic time'],
              ['02', 'Claim slot', 'Unique doctor + start index'],
              ['03', 'Respond', 'BOOKED · A1001'],
              ['04', 'Publish', 'AppointmentBooked · v1.0'],
              ['05', 'Record', 'Confirmation · exactly once'],
            ].map(([number, title, text], index) => (
              <article key={number} className={index > 2 ? 'async' : ''}>
                <b>{number}</b><div><strong>{title}</strong><small>{text}</small></div>
                {index === 2 ? <span className="docs-boundary">ASYNC BOUNDARY</span> : null}
              </article>
            ))}
          </div>
        </section>

        <section className="docs-section docs-reliability" id="reliability">
          <div className="docs-section-heading compact">
            <span className="docs-number">03</span>
            <div>
              <p className="docs-kicker">Designed for the awkward moments</p>
              <h2>Reliability is a feature,<br /><em>not a footnote.</em></h2>
            </div>
          </div>
          <div className="docs-reliability-grid">
            <article className="docs-feature large">
              <span className="docs-icon coral"><Icon name="calendar" /></span>
              <div className="docs-feature-label">CONCURRENCY</div>
              <h3>Two receptionists.<br />One slot. One winner.</h3>
              <p>
                A readable overlap check handles the common case. A unique sparse <code>slotKey</code> index
                handles the race that application code cannot.
              </p>
              <div className="docs-race">
                <span>Request A</span><i /><b>MongoDB unique index</b><i /><span>BOOKED</span>
                <span>Request B</span><i /><b className="reject">Same slot</b><i /><span className="reject">409 CONFLICT</span>
              </div>
            </article>
            <article className="docs-feature">
              <span className="docs-icon lime"><Icon name="pulse" /></span>
              <div className="docs-feature-label">DELIVERY</div>
              <h3>Duplicates become harmless.</h3>
              <p>Every event carries a frozen <code>eventId</code>. A unique notification index turns replay into a no-op.</p>
              <div className="docs-chip-row"><span>eventId</span><b>→</b><span>unique index</span><b>→</b><span>1 record</span></div>
            </article>
            <article className="docs-feature dark">
              <span className="docs-icon orange"><Icon name="bolt" /></span>
              <div className="docs-feature-label">FAILURE RECOVERY</div>
              <h3>Kafka can take the afternoon off.</h3>
              <p>Bookings remain durable. The outbox retries, claims expire safely, and exhausted events stay visible for admin recovery.</p>
              <div className="docs-state-machine">
                <span>PENDING</span><i>→</i><span>PUBLISHING</span><i>→</i><span>PUBLISHED</span>
              </div>
            </article>
          </div>
        </section>

        <section className="docs-section docs-api" id="api">
          <div className="docs-api-copy">
            <span className="docs-number">04</span>
            <p className="docs-kicker">A focused GraphQL contract</p>
            <h2>Ask for what you need.<br /><em>Nothing more.</em></h2>
            <p>
              One code-first schema is composed directly from NestJS resolvers. No gateway, no stitching layer,
              no technology added just for the diagram.
            </p>
            <div className="docs-schema-list">
              <div><b>Q</b><span><strong>patients</strong><small>Search and paginate the registry</small></span></div>
              <div><b>Q</b><span><strong>doctorAvailability</strong><small>Clinic-local 30-minute slots</small></span></div>
              <div><b>M</b><span><strong>bookAppointment</strong><small>Validate, claim, persist, publish</small></span></div>
              <div><b>M</b><span><strong>cancelAppointment</strong><small>Cancel and release the slot</small></span></div>
            </div>
          </div>
          <div className="docs-code-window">
            <div className="docs-code-top">
              <div><i /><i /><i /></div><span>api.graphql</span><CopyButton value={snippets[snippet]} />
            </div>
            <div className="docs-code-tabs">
              {(Object.keys(snippets) as Array<keyof typeof snippets>).map((name) => (
                <button type="button" className={snippet === name ? 'active' : ''} onClick={() => setSnippet(name)} key={name}>
                  {name === 'register' ? 'Register' : name === 'book' ? 'Book' : 'Event'}
                </button>
              ))}
            </div>
            <pre><code>{snippets[snippet]}</code></pre>
            <div className="docs-code-response"><span>200 OK</span><small>Typed, validated, authorized</small></div>
          </div>
        </section>

        <section className="docs-section docs-decisions" id="decisions">
          <div className="docs-section-heading compact">
            <span className="docs-number">05</span>
            <div>
              <p className="docs-kicker">Decisions over defaults</p>
              <h2>The trade-offs are<br /><em>part of the product.</em></h2>
            </div>
            <p>Each important choice is recorded as Context → Decision → Alternatives → Trade-offs.</p>
          </div>
          <div className="docs-adr-grid">
            {[
              ['ADR 001', 'Modular monolith', 'One release today; clean extraction seams tomorrow.', 'BOUNDARIES'],
              ['ADR 002', 'One GraphQL schema', 'Direct composition without a gateway-shaped tax.', 'API'],
              ['ADR 003', 'Database slot lock', 'The unique index—not timing—settles the race.', 'CONSISTENCY'],
              ['ADR 004', 'At-least-once events', 'Stable identity makes safe replay possible.', 'RELIABILITY'],
              ['ADR 005', 'Identity Platform target', 'Cloud identity later, real authorization now.', 'SECURITY'],
            ].map(([id, title, text, label]) => (
              <article key={id}>
                <div><span>{id}</span><b>{label}</b></div>
                <h3>{title}</h3><p>{text}</p>
                <span className="docs-read">Documented <Icon name="check" /></span>
              </article>
            ))}
          </div>
        </section>

        <section className="docs-section docs-quickstart" id="quickstart">
          <div className="docs-quick-copy">
            <span className="docs-number">06</span>
            <p className="docs-kicker">Zero cloud required</p>
            <h2>From clone to clinic<br /><em>in two terminals.</em></h2>
            <p>The lightweight path uses an ephemeral MongoDB and the same notification handler through an in-process bus.</p>
          </div>
          <div className="docs-terminal">
            <div className="docs-terminal-bar"><div><i /><i /><i /></div><span>powershell</span><CopyButton value={'npm run dev:local --prefix backend\nnpm run dev --prefix frontend'} /></div>
            <pre><span># terminal one</span>{'\n'}<b>npm run dev:local --prefix backend</b>{'\n\n'}<span># terminal two</span>{'\n'}<b>npm run dev --prefix frontend</b></pre>
            <div className="docs-terminal-status"><i /><span>Desk ready at</span><a href="http://localhost:5173">localhost:5173</a></div>
          </div>
          <div className="docs-quick-cards">
            <article><span>01</span><strong>Sign in</strong><small>Use the seeded receptionist</small></article>
            <article><span>02</span><strong>Register</strong><small>Create a fictional patient</small></article>
            <article><span>03</span><strong>Book</strong><small>Select doctor and open slot</small></article>
            <article><span>04</span><strong>Observe</strong><small>Watch confirmation appear</small></article>
          </div>
        </section>

        <section className="docs-cta">
          <div>
            <span className="docs-kicker">Ready for a closer look?</span>
            <h2>Leave the diagrams.<br /><em>Try the real workflow.</em></h2>
          </div>
          <Link to="/login">Open Harbor Clinic <Icon name="arrow" /></Link>
        </section>
      </main>

      <footer className="docs-footer">
        <a className="docs-logo" href="#top"><span>H</span><div>Harbor Clinic<small>Administrative scheduling only</small></div></a>
        <p>Built as a working vertical slice. Fictional patient data only.</p>
        <div><a href="#architecture">Architecture</a><a href="#api">GraphQL</a><a href="#quickstart">Quickstart</a></div>
      </footer>
    </div>
  );
}
