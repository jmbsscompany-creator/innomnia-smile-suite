// Descripcion de las tablas para TypeScript.
// Sirve para que el editor te avise si escribes mal el nombre de un campo,
// en vez de que te enteres cuando ya falle en produccion.
// Tiene que coincidir con supabase/schema.sql.

export type AppointmentStatus =
  "confirmada" | "pendiente" | "en-consulta" | "completada" | "cancelada";

export type PatientStatus = "activo" | "seguimiento" | "nuevo";

export type UserRole = "dentista" | "secretaria";

export type PaymentMethod = "efectivo" | "tarjeta" | "transferencia" | "seguro";

export type Profile = {
  id: string;
  full_name: string;
  role: UserRole;
  created_at: string;
};

export type ClinicSettings = {
  id: number;
  name: string;
  dentist: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  schedule: { day: string; hours: string }[];
  updated_at: string;
};

export type Dentist = {
  id: string;
  name: string;
  specialty: string;
  phone: string;
  color: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type Patient = {
  id: string;
  file_number: string;
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
};

export type Service = {
  id: string;
  name: string;
  category: string;
  duration: number;
  price: number;
  description: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type Appointment = {
  id: string;
  patient_id: string | null;
  service_id: string | null;
  dentist_id: string | null;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  duration: number;
  treatment: string;
  dentist: string;
  status: AppointmentStatus;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type Payment = {
  id: string;
  patient_id: string | null;
  appointment_id: string | null;
  concept: string;
  method: PaymentMethod;
  amount: number;
  date: string;
  notes: string;
  created_at: string;
};

export type OdontogramEntry = {
  id: string;
  patient_id: string;
  tooth: string;
  surface: "completo" | "mesial" | "distal" | "oclusal" | "vestibular" | "lingual";
  condition: string;
  notes: string;
  appointment_id: string | null;
  created_by: string | null;
  created_at: string;
};

export type ActivityItem = {
  id: string;
  kind: string;
  title: string;
  detail: string;
  actor_id: string | null;
  created_at: string;
};

/** Campos que se envian al crear una fila (sin los que la base pone sola). */
type Insertable<T> = Omit<T, "id" | "created_at" | "updated_at">;

/** Forma vacia que la libreria de Supabase espera encontrar. */
type Vacio = { [_ in never]: never };

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Pick<Profile, "id"> & Partial<Profile>;
        Update: Partial<Profile>;
        Relationships: [];
      };
      clinic_settings: {
        Row: ClinicSettings;
        Insert: Partial<ClinicSettings>;
        Update: Partial<ClinicSettings>;
        Relationships: [];
      };
      dentists: {
        Row: Dentist;
        Insert: Partial<Insertable<Dentist>> & Pick<Dentist, "name">;
        Update: Partial<Dentist>;
        Relationships: [];
      };
      patients: {
        Row: Patient;
        Insert: Partial<Insertable<Patient>> & Pick<Patient, "name">;
        Update: Partial<Patient>;
        Relationships: [];
      };
      services: {
        Row: Service;
        Insert: Partial<Insertable<Service>> & Pick<Service, "name">;
        Update: Partial<Service>;
        Relationships: [];
      };
      appointments: {
        Row: Appointment;
        Insert: Partial<Insertable<Appointment>> & Pick<Appointment, "date" | "time">;
        Update: Partial<Appointment>;
        Relationships: [];
      };
      payments: {
        Row: Payment;
        Insert: Partial<Insertable<Payment>> & Pick<Payment, "amount">;
        Update: Partial<Payment>;
        Relationships: [];
      };
      odontogram_entries: {
        Row: OdontogramEntry;
        Insert: Partial<Insertable<OdontogramEntry>> &
          Pick<OdontogramEntry, "patient_id" | "tooth" | "condition">;
        Update: Partial<OdontogramEntry>;
        Relationships: [];
      };
      activity_log: {
        Row: ActivityItem;
        Insert: Partial<Insertable<ActivityItem>> & Pick<ActivityItem, "kind" | "title">;
        Update: Partial<ActivityItem>;
        Relationships: [];
      };
    };
    Views: {
      odontogram_current: {
        Row: OdontogramEntry;
        Relationships: [];
      };
    };
    Functions: Vacio;
    Enums: {
      appointment_status: AppointmentStatus;
      patient_status: PatientStatus;
      user_role: UserRole;
      payment_method: PaymentMethod;
    };
    CompositeTypes: Vacio;
  };
};
