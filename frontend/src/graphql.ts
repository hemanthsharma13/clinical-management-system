import { gql } from '@apollo/client';

export const LOGIN = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      user {
        email
        name
        role
      }
    }
  }
`;

export const CLINIC_SETTINGS = gql`
  query ClinicSettings {
    clinicSettings {
      timezone
      slotMinutes
      opensAt
      lastSlotAt
    }
  }
`;

export const PATIENTS = gql`
  query Patients($search: String, $page: Int, $pageSize: Int) {
    patients(search: $search, page: $page, pageSize: $pageSize) {
      total
      page
      pageSize
      items {
        patientId
        firstName
        lastName
        name
        dateOfBirth
        email
        phone
      }
    }
  }
`;

export const REGISTER_PATIENT = gql`
  mutation RegisterPatient($input: RegisterPatientInput!) {
    registerPatient(input: $input) {
      patientId
      name
      email
      phone
      dateOfBirth
    }
  }
`;

export const DOCTORS = gql`
  query Doctors {
    doctors {
      doctorId
      name
      specialization
    }
  }
`;

export const AVAILABILITY = gql`
  query DoctorAvailability($doctorId: String!, $date: String!) {
    doctorAvailability(doctorId: $doctorId, date: $date) {
      startTime
      state
    }
  }
`;

export const BOOK_APPOINTMENT = gql`
  mutation BookAppointment($input: BookAppointmentInput!) {
    bookAppointment(input: $input) {
      appointmentId
      patientName
      doctorName
      startTime
      status
      outboxStatus
    }
  }
`;

export const APPOINTMENTS = gql`
  query Appointments($page: Int, $pageSize: Int) {
    appointments(page: $page, pageSize: $pageSize) {
      total
      page
      pageSize
      items {
        appointmentId
        patientName
        doctorName
        specialization
        startTime
        endTime
        status
        outboxStatus
      }
    }
  }
`;

export const CANCEL_APPOINTMENT = gql`
  mutation CancelAppointment($appointmentId: String!) {
    cancelAppointment(appointmentId: $appointmentId) {
      appointmentId
      status
    }
  }
`;

export const NOTIFICATIONS = gql`
  query Notifications($page: Int, $pageSize: Int, $appointmentId: String) {
    notifications(page: $page, pageSize: $pageSize, appointmentId: $appointmentId) {
      total
      page
      pageSize
      items {
        eventId
        appointmentId
        patientName
        doctorName
        message
        status
        createdAt
      }
    }
  }
`;

export const STAFF_USERS = gql`
  query StaffUsers {
    staffUsers {
      email
      name
      role
    }
  }
`;
