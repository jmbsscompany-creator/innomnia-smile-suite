// Descripcion de las tablas para TypeScript.
// Sirve para que el editor te avise si escribes mal el nombre de un campo,
// en vez de que te enteres cuando ya falle en produccion.
// Tiene que coincidir con supabase/schema.sql.

export type AppointmentStatus =
  | "confirmada"
  | "pendiente"
  | "en-consulta"
  | "completada"
  | "cancelada";

export type PatientStatus = "activo" | "seguimiento" | "nuevo";

export type UserRole = "dentista" | "secretaria";

export type PaymentMethod = "efectivo" | "tarjeta" | "transferencia" | "seguro";

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface ClinicSettings {
  id: number;
  name: string;
  dentist: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  schedule: { day: string; hours: string }[];
  updated_at: string;
}

export interface Patient {
  id: string;
  name: string;
  phone: string;
  email: string;
  birth_date: string | null;
  status: PatientStatus;
  treatment: string;
  notes: string;
  balance: number;
  last_visit: string | null;
  next_visit: string | null;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  name: string;
  category: string;
  duration: number;
  price: number;
  description: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  patient_id: string | null;
  service_id: string | null;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  duration: number;
  treatment: string;
  dentist: string;
  status: AppointmentStatus;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  patient_id: string | null;
  appointment_id: string | null;
  concept: string;
  method: PaymentMethod;
  amount: number;
  date: string;
  notes: string;
  created_at: string;
}

export interface ActivityItem {
  id: string;
  kind: string;
  title: string;
  detail: string;
  actor_id: string | null;
  created_at: string;
}

/** Campos que se envian al crear una fila (sin los que la base pone sola). */
type Insertable<T> = Omit<T, "id" | "created_at" | "updated_at">;

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Pick<Profile, "id"> & Partial<Profile>;
        Update: Partial<Profile>;
      };
      clinic_settings: {
        Row: ClinicSettings;
        Update: Partial<ClinicSettings>;
        Insert: Partial<ClinicSettings>;
      };
      patients: {
        Row: Patient;
        Insert: Partial<Insertable<Patient>> & Pick<Patient, "name">;
        Update: Partial<Patient>;
      };
      services: {
        Row: Service;
        Insert: Partial<Insertable<Service>> & Pick<Service, "name">;
        Update: Partial<Service>;
      };
      appointments: {
        Row: Appointment;
        Insert: Partial<Insertable<Appointment>> & Pick<Appointment, "date" | "time">;
        Update: Partial<Appointment>;
      };
      payments: {
        Row: Payment;
        Insert: Partial<Insertable<Payment>> & Pick<Payment, "amount">;
        Update: Partial<Payment>;
      };
      activity_log: {
        Row: ActivityItem;
        Insert: Partial<Insertable<ActivityItem>> & Pick<ActivityItem, "kind" | "title">;
        Update: Partial<ActivityItem>;
      };
    };
  };
}
