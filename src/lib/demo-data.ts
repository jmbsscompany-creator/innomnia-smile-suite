// Fictional demo data for INNOMNIA Dental. No real people or clinics.

export type AppointmentStatus =
  | "confirmada"
  | "pendiente"
  | "en-consulta"
  | "completada"
  | "cancelada";

export interface Patient {
  id: string;
  name: string;
  phone: string;
  email: string;
  age: number;
  lastVisit: string;
  nextVisit: string | null;
  balance: number;
  status: "activo" | "seguimiento" | "nuevo";
  treatment: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  time: string; // HH:mm
  duration: number; // minutes
  treatment: string;
  dentist: string;
  status: AppointmentStatus;
  dayOffset: number; // 0 = today
}

export interface Service {
  id: string;
  name: string;
  category: string;
  duration: number;
  price: number;
  description: string;
}

export const clinic = {
  name: "Clínica Principal",
  dentist: "Dra. María Reyes",
  dentistShort: "Dra. Reyes",
  city: "Santo Domingo",
};

export const patients: Patient[] = [
  { id: "p1", name: "Ana López", phone: "809-555-0142", email: "ana.lopez@email.com", age: 34, lastVisit: "2026-09-19", nextVisit: "2027-03-19", balance: 0, status: "activo", treatment: "Limpieza dental" },
  { id: "p2", name: "Carlos Méndez", phone: "829-555-0198", email: "cmendez@email.com", age: 45, lastVisit: "2026-08-02", nextVisit: "2026-09-19", balance: 3500, status: "activo", treatment: "Evaluación" },
  { id: "p3", name: "Laura Santana", phone: "849-555-0117", email: "laura.s@email.com", age: 28, lastVisit: "2026-09-05", nextVisit: "2026-09-19", balance: 0, status: "activo", treatment: "Resina dental" },
  { id: "p4", name: "José Ramírez", phone: "809-555-0173", email: "jramirez@email.com", age: 52, lastVisit: "2026-07-21", nextVisit: "2026-09-19", balance: 12000, status: "activo", treatment: "Extracción simple" },
  { id: "p5", name: "María Torres", phone: "829-555-0155", email: "mtorres@email.com", age: 31, lastVisit: "2026-06-11", nextVisit: "2026-09-19", balance: 0, status: "activo", treatment: "Blanqueamiento" },
  { id: "p6", name: "Luis Fernández", phone: "809-555-0129", email: "lfernandez@email.com", age: 39, lastVisit: "2026-09-01", nextVisit: "2026-09-19", balance: 0, status: "activo", treatment: "Control" },
  { id: "p7", name: "Rosa Cabrera", phone: "849-555-0161", email: "rosa.cabrera@email.com", age: 61, lastVisit: "2026-06-18", nextVisit: null, balance: 0, status: "seguimiento", treatment: "Control pendiente" },
  { id: "p8", name: "Juan Martínez", phone: "809-555-0184", email: "juanm@email.com", age: 47, lastVisit: "2026-07-14", nextVisit: null, balance: 8500, status: "seguimiento", treatment: "Tratamiento incompleto" },
  { id: "p9", name: "Elena López", phone: "829-555-0136", email: "elena.l@email.com", age: 26, lastVisit: "2026-05-20", nextVisit: null, balance: 0, status: "seguimiento", treatment: "Limpieza recomendada" },
  { id: "p10", name: "Antonio Pérez", phone: "809-555-0109", email: "aperez@email.com", age: 55, lastVisit: "2026-08-19", nextVisit: null, balance: 0, status: "seguimiento", treatment: "Evaluación pendiente" },
  { id: "p11", name: "Miguel Díaz", phone: "849-555-0191", email: "miguel.diaz@email.com", age: 22, lastVisit: "2026-09-19", nextVisit: "2026-09-26", balance: 0, status: "nuevo", treatment: "Primera consulta" },
  { id: "p12", name: "Carmen Rosario", phone: "809-555-0147", email: "crosario@email.com", age: 43, lastVisit: "2026-09-12", nextVisit: "2026-10-03", balance: 15000, status: "activo", treatment: "Corona de porcelana" },
  { id: "p13", name: "Pedro Santana", phone: "829-555-0122", email: "psantana@email.com", age: 36, lastVisit: "2026-09-10", nextVisit: "2026-09-21", balance: 0, status: "activo", treatment: "Endodoncia" },
  { id: "p14", name: "Sofía Guzmán", phone: "809-555-0168", email: "sguzman@email.com", age: 19, lastVisit: "2026-09-15", nextVisit: "2026-09-22", balance: 4500, status: "activo", treatment: "Ortodoncia · control" },
];

export const appointments: Appointment[] = [
  { id: "a1", patientId: "p1", patientName: "Ana López", time: "09:00", duration: 45, treatment: "Limpieza dental", dentist: "Dra. Reyes", status: "completada", dayOffset: 0 },
  { id: "a2", patientId: "p2", patientName: "Carlos Méndez", time: "10:30", duration: 30, treatment: "Evaluación", dentist: "Dra. Reyes", status: "en-consulta", dayOffset: 0 },
  { id: "a3", patientId: "p3", patientName: "Laura Santana", time: "12:00", duration: 60, treatment: "Resina dental", dentist: "Dra. Reyes", status: "confirmada", dayOffset: 0 },
  { id: "a4", patientId: "p4", patientName: "José Ramírez", time: "14:00", duration: 45, treatment: "Extracción simple", dentist: "Dr. Peña", status: "confirmada", dayOffset: 0 },
  { id: "a5", patientId: "p5", patientName: "María Torres", time: "15:30", duration: 60, treatment: "Blanqueamiento", dentist: "Dra. Reyes", status: "pendiente", dayOffset: 0 },
  { id: "a6", patientId: "p6", patientName: "Luis Fernández", time: "17:00", duration: 30, treatment: "Control", dentist: "Dr. Peña", status: "pendiente", dayOffset: 0 },

  { id: "a7", patientId: "p13", patientName: "Pedro Santana", time: "09:00", duration: 90, treatment: "Endodoncia", dentist: "Dra. Reyes", status: "confirmada", dayOffset: 1 },
  { id: "a8", patientId: "p14", patientName: "Sofía Guzmán", time: "11:00", duration: 30, treatment: "Ortodoncia · control", dentist: "Dr. Peña", status: "pendiente", dayOffset: 1 },
  { id: "a9", patientId: "p12", patientName: "Carmen Rosario", time: "14:30", duration: 60, treatment: "Corona de porcelana", dentist: "Dra. Reyes", status: "confirmada", dayOffset: 1 },

  { id: "a10", patientId: "p11", patientName: "Miguel Díaz", time: "10:00", duration: 45, treatment: "Primera consulta", dentist: "Dra. Reyes", status: "confirmada", dayOffset: 2 },
  { id: "a11", patientId: "p9", patientName: "Elena López", time: "13:00", duration: 45, treatment: "Limpieza dental", dentist: "Dr. Peña", status: "pendiente", dayOffset: 2 },

  { id: "a12", patientId: "p7", patientName: "Rosa Cabrera", time: "09:30", duration: 30, treatment: "Control", dentist: "Dra. Reyes", status: "confirmada", dayOffset: 3 },
  { id: "a13", patientId: "p8", patientName: "Juan Martínez", time: "11:30", duration: 60, treatment: "Resina dental", dentist: "Dra. Reyes", status: "pendiente", dayOffset: 3 },
  { id: "a14", patientId: "p2", patientName: "Carlos Méndez", time: "16:00", duration: 45, treatment: "Limpieza dental", dentist: "Dr. Peña", status: "confirmada", dayOffset: 3 },

  { id: "a15", patientId: "p3", patientName: "Laura Santana", time: "10:00", duration: 30, treatment: "Control", dentist: "Dra. Reyes", status: "confirmada", dayOffset: 4 },
  { id: "a16", patientId: "p5", patientName: "María Torres", time: "12:30", duration: 60, treatment: "Blanqueamiento · sesión 2", dentist: "Dra. Reyes", status: "pendiente", dayOffset: 4 },

  { id: "a17", patientId: "p10", patientName: "Antonio Pérez", time: "09:00", duration: 45, treatment: "Evaluación", dentist: "Dr. Peña", status: "confirmada", dayOffset: 5 },
];

export const followUps = [
  { patientId: "p7", name: "Rosa Cabrera", reason: "Control pendiente", since: "Hace 3 meses", urgency: "high" as const },
  { patientId: "p8", name: "Juan Martínez", reason: "Tratamiento incompleto", since: "Hace 2 meses", urgency: "high" as const },
  { patientId: "p9", name: "Elena López", reason: "Limpieza recomendada", since: "Hace 4 meses", urgency: "high" as const },
  { patientId: "p10", name: "Antonio Pérez", reason: "Evaluación pendiente", since: "Hace 1 mes", urgency: "medium" as const },
];

export const recentActivity = [
  { id: "r1", kind: "cita" as const, title: "Nueva cita agendada", detail: "Ana López · 26 sep, 09:00", when: "Hace 10 min" },
  { id: "r2", kind: "pago" as const, title: "Pago registrado", detail: "Carlos Méndez · RD$ 3,500", when: "Hace 1 hora" },
  { id: "r3", kind: "tratamiento" as const, title: "Tratamiento completado", detail: "Laura Santana · Resina dental", when: "Hace 2 horas" },
  { id: "r4", kind: "paciente" as const, title: "Nuevo paciente", detail: "Miguel Díaz", when: "Hace 3 horas" },
];

export const paymentsToday = [
  { id: "c1", patient: "Ana López", concept: "Limpieza dental", method: "Efectivo", amount: 3500 },
  { id: "c2", patient: "Carlos Méndez", concept: "Abono · Evaluación", method: "Tarjeta", amount: 3500 },
  { id: "c3", patient: "Carmen Rosario", concept: "Abono · Corona", method: "Transferencia", amount: 5500 },
];

export const services: Service[] = [
  { id: "s1", name: "Consulta y evaluación", category: "Prevención", duration: 30, price: 1500, description: "Revisión general, diagnóstico y plan de tratamiento." },
  { id: "s2", name: "Limpieza dental (profilaxis)", category: "Prevención", duration: 45, price: 3500, description: "Eliminación de placa y sarro, pulido y flúor." },
  { id: "s3", name: "Aplicación de flúor", category: "Prevención", duration: 15, price: 1200, description: "Fortalece el esmalte y previene caries." },
  { id: "s4", name: "Sellantes de fosas y fisuras", category: "Prevención", duration: 30, price: 1800, description: "Por pieza. Ideal para niños y adolescentes." },
  { id: "s5", name: "Resina dental (obturación)", category: "Restauración", duration: 60, price: 4500, description: "Restauración estética del color del diente." },
  { id: "s6", name: "Corona de porcelana", category: "Restauración", duration: 90, price: 28000, description: "Incluye toma de impresión y colocación." },
  { id: "s7", name: "Incrustación", category: "Restauración", duration: 75, price: 15000, description: "Restauración indirecta para grandes cavidades." },
  { id: "s8", name: "Endodoncia (canal)", category: "Endodoncia", duration: 90, price: 18000, description: "Tratamiento de conducto en una o dos sesiones." },
  { id: "s9", name: "Extracción simple", category: "Cirugía", duration: 45, price: 4000, description: "Extracción de pieza dental sin complicaciones." },
  { id: "s10", name: "Extracción de cordal", category: "Cirugía", duration: 60, price: 12000, description: "Extracción quirúrgica de tercer molar." },
  { id: "s11", name: "Blanqueamiento dental", category: "Estética", duration: 60, price: 16000, description: "Blanqueamiento en consultorio con lámpara LED." },
  { id: "s12", name: "Carillas de porcelana", category: "Estética", duration: 120, price: 32000, description: "Por pieza. Diseño de sonrisa personalizado." },
  { id: "s13", name: "Ortodoncia · instalación", category: "Ortodoncia", duration: 90, price: 45000, description: "Brackets metálicos. Incluye primer control." },
  { id: "s14", name: "Ortodoncia · control mensual", category: "Ortodoncia", duration: 30, price: 3000, description: "Ajuste y seguimiento del tratamiento." },
];

export const serviceCategories = ["Prevención", "Restauración", "Endodoncia", "Cirugía", "Estética", "Ortodoncia"];

export const statusLabel: Record<AppointmentStatus, string> = {
  confirmada: "Confirmada",
  pendiente: "Pendiente",
  "en-consulta": "En consulta",
  completada: "Completada",
  cancelada: "Cancelada",
};
