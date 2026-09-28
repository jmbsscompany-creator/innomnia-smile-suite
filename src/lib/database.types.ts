// Descripcion de las tablas para TypeScript.
// Sirve para que el editor te avise si escribes mal el nombre de un campo,
// en vez de que te enteres cuando ya falle en produccion.
// Tiene que coincidir con supabase/schema.sql.

export type AppointmentStatus =
  "confirmada" | "pendiente" | "en-consulta" | "completada" | "cancelada";

export type PatientStatus = "activo" | "seguimiento" | "nuevo" | "inactivo";

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
  /**
   * A que cargo especifico abona este pago, si aplica. Con esto se puede
   * saber cuanto le falta a UN cargo en concreto, no solo el saldo total
   * del paciente. null = un pago suelto, no atado a un cargo puntual.
   */
  cargo_id: string | null;
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
  /**
   * false = ya esta hecho (existente). true = todavia no se ha hecho,
   * es lo que se planea hacerle (tratamiento planificado). Una misma
   * cara puede tener a la vez una fila "existente" y otra "planificada",
   * sin que una tape a la otra.
   */
  planned: boolean;
  appointment_id: string | null;
  created_by: string | null;
  created_at: string;
};

/**
 * Un examen periodontal: la foto de como estaba la encia un dia.
 * No se edita el anterior, se hace uno nuevo y se comparan.
 */
export type Periodontograma = {
  id: string;
  patient_id: string;
  fecha: string;
  notas: string;
  created_by: string | null;
  created_at: string;
};

/**
 * Un diente dentro de ese examen. Los arreglos SIEMPRE traen seis
 * posiciones, en este orden fijo:
 *   0=VM 1=VC 2=VD  (vestibular, el lado del labio)
 *   3=LM 4=LC 5=LD  (lingual o palatino, el lado de la lengua)
 * null en profundidad o margen = ese punto no se ha medido todavia,
 * que es distinto de haberlo medido y que diera cero.
 */
export type PeriodontogramaDiente = {
  periodontograma_id: string;
  tooth: string;
  profundidad: (number | null)[];
  margen: (number | null)[];
  sangrado: boolean[];
  placa: boolean[];
  supuracion: boolean[];
  movilidad: number;
  furca: number;
  ausente: boolean;
};

/**
 * Una entrada del historial de notas/procedimientos: la bitacora de que
 * se le ha ido haciendo al paciente visita tras visita. Es aparte del
 * campo "notes" de Patient, que es para lo que no cambia (alergias,
 * antecedentes) y SI se sobrescribe cada vez que se guarda la ficha.
 * Aqui cada nota es su propia fila, con fecha, y ninguna borra a la
 * anterior.
 */
export type NotaClinica = {
  id: string;
  patient_id: string;
  fecha: string;
  nota: string;
  created_by: string | null;
  created_at: string;
};

/**
 * Un cargo: algo que el paciente ahora debe (un tratamiento que se le
 * hizo, por ejemplo). Es lo opuesto de Payment (un cobro), que es
 * cuando el paciente PAGA. Un cargo SUMA al saldo, un cobro RESTA.
 * Cada cargo es su propia fila y queda como historial de lo que se le
 * ha cobrado al paciente, no solo el numero final.
 */
export type Cargo = {
  id: string;
  patient_id: string;
  appointment_id: string | null;
  /** Procedimiento del historial (notas_clinicas) del que viene este cargo, si aplica. */
  nota_id: string | null;
  concepto: string;
  monto: number;
  fecha: string;
  created_by: string | null;
  created_at: string;
};

/**
 * Un producto del inventario de la clinica (guantes, anestesia,
 * material de laboratorio...). El "vencimiento" es lo importante:
 * es lo que deja avisar antes de que algo caduque sin que nadie se
 * de cuenta.
 */
export type Producto = {
  id: string;
  nombre: string;
  categoria: string;
  cantidad: number;
  unidad: string;
  vencimiento: string | null;
  notas: string;
  created_at: string;
  updated_at: string;
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
      periodontogramas: {
        Row: Periodontograma;
        Insert: Partial<Insertable<Periodontograma>> & Pick<Periodontograma, "patient_id">;
        Update: Partial<Periodontograma>;
        Relationships: [];
      };
      periodontograma_dientes: {
        Row: PeriodontogramaDiente;
        Insert: Partial<PeriodontogramaDiente> &
          Pick<PeriodontogramaDiente, "periodontograma_id" | "tooth">;
        Update: Partial<PeriodontogramaDiente>;
        Relationships: [];
      };
      notas_clinicas: {
        Row: NotaClinica;
        Insert: Partial<Insertable<NotaClinica>> & Pick<NotaClinica, "patient_id" | "nota">;
        Update: Partial<NotaClinica>;
        Relationships: [];
      };
      cargos: {
        Row: Cargo;
        Insert: Partial<Insertable<Cargo>> & Pick<Cargo, "patient_id" | "concepto" | "monto">;
        Update: Partial<Cargo>;
        Relationships: [];
      };
      productos: {
        Row: Producto;
        Insert: Partial<Insertable<Producto>> & Pick<Producto, "nombre">;
        Update: Partial<Producto>;
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
