// Central demo state for INNOMNIA Dental. Session-only, no database.
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  appointments as seedAppointments,
  patients as seedPatients,
  paymentsToday as seedPayments,
  recentActivity as seedActivity,
  services as seedServices,
  serviceCategories as seedCategories,
  type Appointment,
  type AppointmentStatus,
  type Patient,
  type Service,
} from "@/lib/demo-data";
import { BASE_DATE, offsetFromDate } from "@/lib/dates";

export interface Payment {
  id: string;
  patient: string;
  concept: string;
  method: string;
  amount: number;
  date: string; // ISO
  notes?: string;
}

export interface ActivityItem {
  id: string;
  kind: "cita" | "pago" | "tratamiento" | "paciente";
  title: string;
  detail: string;
  when: string;
}

type NewPatient = Omit<Patient, "id">;
type NewService = Omit<Service, "id">;
type NewAppointment = Omit<Appointment, "id">;
type NewPayment = Omit<Payment, "id">;

interface ClinicContextValue {
  patients: Patient[];
  appointments: Appointment[];
  services: Service[];
  payments: Payment[];
  activity: ActivityItem[];
  categories: string[];
  addPatient: (data: NewPatient) => Patient;
  updatePatient: (id: string, data: Partial<Patient>) => void;
  addService: (data: NewService) => Service;
  updateService: (id: string, data: Partial<Service>) => void;
  addAppointment: (data: NewAppointment) => Appointment;
  updateAppointment: (id: string, data: Partial<Appointment>) => void;
  setAppointmentStatus: (id: string, status: AppointmentStatus) => void;
  addPayment: (data: NewPayment) => Payment;
}

const ClinicContext = createContext<ClinicContextValue | null>(null);

let counter = 0;
const uid = (prefix: string) => `${prefix}${Date.now().toString(36)}${(counter++).toString(36)}`;

export function ClinicProvider({ children }: { children: ReactNode }) {
  const [patients, setPatients] = useState<Patient[]>(seedPatients);
  const [appointments, setAppointments] = useState<Appointment[]>(seedAppointments);
  const [services, setServices] = useState<Service[]>(seedServices);
  const [payments, setPayments] = useState<Payment[]>(
    seedPayments.map((p) => ({ ...p, date: BASE_DATE })),
  );
  const [activity, setActivity] = useState<ActivityItem[]>(seedActivity);

  const value = useMemo<ClinicContextValue>(() => {
    const log = (item: Omit<ActivityItem, "id" | "when">) =>
      setActivity((prev) => [{ id: uid("r"), when: "Ahora mismo", ...item }, ...prev].slice(0, 12));

    return {
      patients,
      appointments,
      services,
      payments,
      activity,
      categories: Array.from(new Set([...seedCategories, ...services.map((s) => s.category)])),

      addPatient(data) {
        const patient: Patient = { ...data, id: uid("p") };
        setPatients((prev) => [patient, ...prev]);
        log({ kind: "paciente", title: "Nuevo paciente", detail: patient.name });
        return patient;
      },
      updatePatient(id, data) {
        setPatients((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
      },

      addService(data) {
        const service: Service = { ...data, id: uid("s") };
        setServices((prev) => [...prev, service]);
        log({ kind: "tratamiento", title: "Nuevo servicio", detail: service.name });
        return service;
      },
      updateService(id, data) {
        setServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...data } : s)));
      },

      addAppointment(data) {
        const appointment: Appointment = { ...data, id: uid("a") };
        setAppointments((prev) => [...prev, appointment]);
        log({
          kind: "cita",
          title: "Nueva cita agendada",
          detail: `${appointment.patientName} · ${appointment.time}`,
        });
        return appointment;
      },
      updateAppointment(id, data) {
        setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, ...data } : a)));
      },
      setAppointmentStatus(id, status) {
        setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
      },

      addPayment(data) {
        const payment: Payment = { ...data, id: uid("c") };
        setPayments((prev) => [payment, ...prev]);
        log({
          kind: "pago",
          title: "Pago registrado",
          detail: `${payment.patient} · RD$ ${payment.amount.toLocaleString("en-US")}`,
        });
        // Reduce the patient's outstanding balance when we know the patient.
        setPatients((prev) =>
          prev.map((p) =>
            p.name === payment.patient
              ? { ...p, balance: Math.max(0, p.balance - payment.amount) }
              : p,
          ),
        );
        return payment;
      },
    };
  }, [patients, appointments, services, payments, activity]);

  return <ClinicContext.Provider value={value}>{children}</ClinicContext.Provider>;
}

export function useClinic() {
  const ctx = useContext(ClinicContext);
  if (!ctx) throw new Error("useClinic debe usarse dentro de ClinicProvider");
  return ctx;
}

export function paymentsOn(payments: Payment[], iso: string) {
  return payments.filter((p) => p.date === iso);
}

export function appointmentsOnOffset(appointments: Appointment[], offset: number) {
  return appointments.filter((a) => a.dayOffset === offset);
}

export const dateToOffset = offsetFromDate;
