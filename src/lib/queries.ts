// Lectura y escritura de datos contra Supabase.
// Usa react-query, que ya venia en el proyecto: se encarga de guardar en cache,
// avisar mientras carga y volver a pedir los datos cuando algo cambia.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type {
  ActivityItem,
  Appointment,
  Cargo,
  ClinicSettings,
  Dentist,
  NotaClinica,
  OdontogramEntry,
  Patient,
  Payment,
  Periodontograma,
  PeriodontogramaDiente,
  Producto,
  Profile,
  Service,
} from "@/lib/database.types";

/** Traduce los errores de la base, que vienen en ingles. */
export function traducirErrorDB(mensaje: string): string {
  const m = mensaje.toLowerCase();
  if (m.includes("row-level security"))
    return "No tienes permiso para hacer eso. Habla con la odontóloga.";
  if (m.includes("duplicate key")) return "Ese registro ya existe.";
  if (m.includes("violates foreign key")) return "Falta un dato relacionado.";
  if (m.includes("jwt") || m.includes("expired")) return "Tu sesión vencio. Vuelve a entrar.";
  if (m.includes("failed to fetch") || m.includes("network"))
    return "No se pudo conectar con el servidor. Revisa tu internet.";
  return mensaje;
}

/* ============ PACIENTES ============ */

export const CLAVE_PACIENTES = ["pacientes"] as const;

/**
 * OJO: Supabase corta cualquier consulta en 1000 filas, aunque no pidas limite.
 * Con 1200 pacientes, una consulta normal devolveria 1000 y los otros 200
 * quedarian invisibles, sin dar ningun error. Por eso pedimos por tandas
 * hasta que una venga incompleta, que es la senal de que ya no hay mas.
 */
const TAMANO_TANDA = 1000;

export function usePacientes() {
  return useQuery({
    queryKey: CLAVE_PACIENTES,
    queryFn: async (): Promise<Patient[]> => {
      const todos: Patient[] = [];
      for (let desde = 0; ; desde += TAMANO_TANDA) {
        const { data, error } = await supabase
          .from("patients")
          .select("*")
          .order("name", { ascending: true })
          .range(desde, desde + TAMANO_TANDA - 1);
        if (error) throw new Error(traducirErrorDB(error.message));
        const tanda = (data ?? []) as Patient[];
        todos.push(...tanda);
        if (tanda.length < TAMANO_TANDA) break;
      }
      return todos;
    },
  });
}

/** Lo que el formulario envia al crear un paciente. */
export interface NuevoPaciente {
  file_number: string;
  name: string;
  phone: string;
  email: string;
  birth_date: string | null;
  treatment: string;
  status: Patient["status"];
  notes: string;
}

export function useCrearPaciente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (nuevo: NuevoPaciente): Promise<Patient> => {
      const { data, error } = await supabase.from("patients").insert(nuevo).select().single();
      if (error) throw new Error(traducirErrorDB(error.message));
      await registrarActividad("paciente", "Nuevo paciente", (data as Patient).name);
      return data as Patient;
    },
    // Al terminar, vuelve a pedir la lista para que aparezca el nuevo.
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CLAVE_PACIENTES });
      void qc.invalidateQueries({ queryKey: ["actividad"] });
    },
  });
}

export function useActualizarPaciente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, cambios }: { id: string; cambios: Partial<Patient> }) => {
      const { error } = await supabase.from("patients").update(cambios).eq("id", id);
      if (error) throw new Error(traducirErrorDB(error.message));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CLAVE_PACIENTES });
    },
  });
}

/* ============ DATOS DE LA CLINICA ============ */

export const CLAVE_CLINICA = ["clínica"] as const;

export function useClinica() {
  return useQuery({
    queryKey: CLAVE_CLINICA,
    queryFn: async (): Promise<ClinicSettings | null> => {
      const { data, error } = await supabase
        .from("clinic_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw new Error(traducirErrorDB(error.message));
      return (data as ClinicSettings | null) ?? null;
    },
  });
}

export function useActualizarClinica() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cambios: Partial<ClinicSettings>) => {
      const { error } = await supabase.from("clinic_settings").update(cambios).eq("id", 1);
      if (error) throw new Error(traducirErrorDB(error.message));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CLAVE_CLINICA });
    },
  });
}

/** Quien tiene acceso al sistema. */
export function usePerfiles() {
  return useQuery({
    queryKey: ["perfiles"],
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw new Error(traducirErrorDB(error.message));
      return (data ?? []) as Profile[];
    },
  });
}

/* ============ DOCTORES ============ */

export const CLAVE_DOCTORES = ["doctores"] as const;

export function useDoctores() {
  return useQuery({
    queryKey: CLAVE_DOCTORES,
    queryFn: async (): Promise<Dentist[]> => {
      const { data, error } = await supabase
        .from("dentists")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw new Error(traducirErrorDB(error.message));
      return (data ?? []) as Dentist[];
    },
  });
}

export interface NuevoDoctor {
  name: string;
  specialty: string;
  phone: string;
}

export function useCrearDoctor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (nuevo: NuevoDoctor): Promise<Dentist> => {
      const { data, error } = await supabase.from("dentists").insert(nuevo).select().single();
      if (error) throw new Error(traducirErrorDB(error.message));
      return data as Dentist;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CLAVE_DOCTORES });
    },
  });
}

export function useActualizarDoctor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, cambios }: { id: string; cambios: Partial<Dentist> }) => {
      const { error } = await supabase.from("dentists").update(cambios).eq("id", id);
      if (error) throw new Error(traducirErrorDB(error.message));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CLAVE_DOCTORES });
    },
  });
}

/* ============ FECHA DE HOY ============ */

/** Hoy en formato YYYY-MM-DD, segun el reloj de quien usa la app. */
export function hoyISO(): string {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/* ============ CITAS ============ */

export const CLAVE_CITAS = ["citas"] as const;

/** Citas de un dia concreto, ordenadas por hora. */
export function useCitasDelDia(fecha: string) {
  return useQuery({
    queryKey: [...CLAVE_CITAS, "día", fecha],
    queryFn: async (): Promise<Appointment[]> => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("date", fecha)
        .order("time", { ascending: true });
      if (error) throw new Error(traducirErrorDB(error.message));
      return (data ?? []) as Appointment[];
    },
  });
}

/** Citas entre dos fechas (inclusive). Se usa para la vista de semana. */
export function useCitasDeRango(desde: string, hasta: string) {
  return useQuery({
    queryKey: [...CLAVE_CITAS, "rango", desde, hasta],
    queryFn: async (): Promise<Appointment[]> => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .gte("date", desde)
        .lte("date", hasta)
        .order("date", { ascending: true })
        .order("time", { ascending: true });
      if (error) throw new Error(traducirErrorDB(error.message));
      return (data ?? []) as Appointment[];
    },
  });
}

export interface NuevaCita {
  patient_id: string | null;
  dentist_id: string | null;
  date: string;
  time: string;
  duration: number;
  treatment: string;
  dentist: string;
  status: Appointment["status"];
  notes: string;
}

export function useCrearCita() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (nueva: NuevaCita): Promise<Appointment> => {
      const { data, error } = await supabase.from("appointments").insert(nueva).select().single();
      if (error) throw new Error(traducirErrorDB(error.message));
      await registrarActividad(
        "cita",
        "Nueva cita agendada",
        `${nueva.treatment || "Cita"} · ${nueva.date} ${nueva.time.slice(0, 5)}`,
      );
      return data as Appointment;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CLAVE_CITAS });
      void qc.invalidateQueries({ queryKey: ["actividad"] });
    },
  });
}

export function useCambiarEstadoCita() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Appointment["status"] }) => {
      const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
      if (error) throw new Error(traducirErrorDB(error.message));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CLAVE_CITAS });
    },
  });
}

/* ============ SERVICIOS ============ */

export const CLAVE_SERVICIOS = ["servicios"] as const;

export function useServicios() {
  return useQuery({
    queryKey: CLAVE_SERVICIOS,
    queryFn: async (): Promise<Service[]> => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("category", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw new Error(traducirErrorDB(error.message));
      return (data ?? []) as Service[];
    },
  });
}

export interface NuevoServicio {
  name: string;
  category: string;
  duration: number;
  price: number;
  description: string;
}

export function useCrearServicio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (nuevo: NuevoServicio): Promise<Service> => {
      const { data, error } = await supabase.from("services").insert(nuevo).select().single();
      if (error) throw new Error(traducirErrorDB(error.message));
      return data as Service;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CLAVE_SERVICIOS });
    },
  });
}

export function useActualizarServicio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, cambios }: { id: string; cambios: Partial<Service> }) => {
      const { error } = await supabase.from("services").update(cambios).eq("id", id);
      if (error) throw new Error(traducirErrorDB(error.message));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CLAVE_SERVICIOS });
    },
  });
}

/** Carga de golpe la lista base de servicios, para no escribirlos a mano. */
export function useCargarServiciosBase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lista: NuevoServicio[]) => {
      const { error } = await supabase.from("services").insert(lista as never);
      if (error) throw new Error(traducirErrorDB(error.message));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CLAVE_SERVICIOS });
    },
  });
}

/* ============ COBROS ============ */

export const CLAVE_COBROS = ["cobros"] as const;

export function useCobrosDelDia(fecha: string) {
  return useQuery({
    queryKey: [...CLAVE_COBROS, "día", fecha],
    queryFn: async (): Promise<Payment[]> => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("date", fecha)
        .order("created_at", { ascending: false });
      if (error) throw new Error(traducirErrorDB(error.message));
      return (data ?? []) as Payment[];
    },
  });
}

export interface NuevoCobro {
  patient_id: string | null;
  concept: string;
  method: Payment["method"];
  amount: number;
  date: string;
  notes: string;
  /** A que cargo abona este pago, si es un abono a uno en concreto. */
  cargo_id?: string | undefined;
}

/**
 * Registra un cobro y le descuenta el monto al saldo del paciente.
 * Son dos pasos: primero guarda el cobro, despues ajusta el saldo.
 */
export function useCrearCobro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (nuevo: NuevoCobro): Promise<Payment> => {
      const { data, error } = await supabase
        .from("payments")
        .insert({ ...nuevo, cargo_id: nuevo.cargo_id ?? null })
        .select()
        .single();
      if (error) throw new Error(traducirErrorDB(error.message));

      if (nuevo.patient_id) {
        const { data: pac } = await supabase
          .from("patients")
          .select("balance, name")
          .eq("id", nuevo.patient_id)
          .maybeSingle();

        if (pac) {
          const saldoNuevo = Math.max(0, Number(pac.balance) - Number(nuevo.amount));
          await supabase
            .from("patients")
            .update({ balance: saldoNuevo })
            .eq("id", nuevo.patient_id);

          await registrarActividad(
            "pago",
            "Pago registrado",
            `${pac.name} · RD$ ${Number(nuevo.amount).toLocaleString("en-US")}`,
          );
        }
      }
      return data as Payment;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CLAVE_COBROS });
      void qc.invalidateQueries({ queryKey: CLAVE_PACIENTES });
      void qc.invalidateQueries({ queryKey: ["actividad"] });
    },
  });
}

/* ============ ODONTOGRAMA ============ */

export const CLAVE_ODONTOGRAMA = ["odontograma"] as const;

/** Un paciente suelto, para su ficha. */
export function usePaciente(id: string) {
  return useQuery({
    queryKey: [...CLAVE_PACIENTES, id],
    queryFn: async (): Promise<Patient | null> => {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(traducirErrorDB(error.message));
      return (data as Patient | null) ?? null;
    },
  });
}

/** Citas de un paciente, de la mas reciente a la mas vieja. */
export function useCitasDePaciente(pacienteId: string) {
  return useQuery({
    queryKey: [...CLAVE_CITAS, "paciente", pacienteId],
    queryFn: async (): Promise<Appointment[]> => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("patient_id", pacienteId)
        .order("date", { ascending: false })
        .order("time", { ascending: false });
      if (error) throw new Error(traducirErrorDB(error.message));
      return (data ?? []) as Appointment[];
    },
  });
}

/** Cobros de un paciente. */
export function useCobrosDePaciente(pacienteId: string) {
  return useQuery({
    queryKey: [...CLAVE_COBROS, "paciente", pacienteId],
    queryFn: async (): Promise<Payment[]> => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("patient_id", pacienteId)
        .order("date", { ascending: false });
      if (error) throw new Error(traducirErrorDB(error.message));
      return (data ?? []) as Payment[];
    },
  });
}

/**
 * Estado actual del odontograma: solo el ultimo registro de cada cara.
 * Lo calcula la base con la vista odontogram_current.
 */
export function useOdontograma(pacienteId: string) {
  return useQuery({
    queryKey: [...CLAVE_ODONTOGRAMA, pacienteId],
    queryFn: async (): Promise<OdontogramEntry[]> => {
      const { data, error } = await supabase
        .from("odontogram_current")
        .select("*")
        .eq("patient_id", pacienteId);
      if (error) throw new Error(traducirErrorDB(error.message));
      return (data ?? []) as OdontogramEntry[];
    },
  });
}

/** Toda la historia del odontograma, del cambio mas reciente al mas viejo. */
export function useHistorialOdontograma(pacienteId: string, limite = 600) {
  return useQuery({
    queryKey: [...CLAVE_ODONTOGRAMA, "historial", pacienteId, limite],
    queryFn: async (): Promise<OdontogramEntry[]> => {
      const { data, error } = await supabase
        .from("odontogram_entries")
        .select("*")
        .eq("patient_id", pacienteId)
        .order("created_at", { ascending: false })
        .limit(limite);
      if (error) throw new Error(traducirErrorDB(error.message));
      return (data ?? []) as OdontogramEntry[];
    },
  });
}

export interface RegistroDiente {
  patient_id: string;
  tooth: string;
  surface: OdontogramEntry["surface"];
  condition: string;
  notes?: string;
  /** true = tratamiento planificado (aun no hecho). Por defecto false. */
  planned?: boolean;
}

/**
 * Registra el estado de un diente. Nunca modifica lo anterior: agrega
 * una linea nueva. El estado de hoy es la ultima linea de cada cara,
 * y la historia completa queda guardada.
 */
export function useRegistrarDiente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (r: RegistroDiente) => {
      const { data: sesion } = await supabase.auth.getSession();
      const { error } = await supabase.from("odontogram_entries").insert({
        ...r,
        notes: r.notes ?? "",
        planned: r.planned ?? false,
        created_by: sesion.session?.user?.id ?? null,
      });
      if (error) throw new Error(traducirErrorDB(error.message));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CLAVE_ODONTOGRAMA });
    },
  });
}

/* ============ ACTIVIDAD ============ */

/**
 * Deja constancia de algo que paso en la clinica.
 * Si falla no rompe nada: es un registro, no el dato principal.
 */
export async function registrarActividad(kind: string, title: string, detail: string) {
  const { data: sesion } = await supabase.auth.getSession();
  await supabase
    .from("activity_log")
    .insert({ kind, title, detail, actor_id: sesion.session?.user?.id ?? null });
}

export function useActividad(limite = 6) {
  return useQuery({
    queryKey: ["actividad", limite],
    queryFn: async (): Promise<ActivityItem[]> => {
      const { data, error } = await supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limite);
      if (error) throw new Error(traducirErrorDB(error.message));
      return (data ?? []) as ActivityItem[];
    },
  });
}

/* ==========================================================
   PERIODONTOGRAMA

   El odontograma mira los dientes; esto mira la encia y el hueso
   que los sostienen. Cada examen es una foto de un dia: no se
   edita el anterior, se hace uno nuevo y se comparan. Por eso
   aqui hay "el ultimo examen" y "la lista de examenes", y no un
   unico estado actual como en el odontograma.
   ========================================================== */

export const CLAVE_PERIO = ["periodontograma"] as const;

/** Los seis puntos que se sondean en cada diente, en su orden fijo. */
export const PUNTOS = 6;

/** Un examen con sus dientes ya juntos, que es como lo usa la pantalla. */
export interface ExamenPerio {
  examen: Periodontograma;
  dientes: PeriodontogramaDiente[];
}

/** Lista de examenes de un paciente, del mas reciente al mas viejo. */
export function usePeriodontogramas(pacienteId: string) {
  return useQuery({
    queryKey: [...CLAVE_PERIO, "lista", pacienteId],
    queryFn: async (): Promise<Periodontograma[]> => {
      const { data, error } = await supabase
        .from("periodontogramas")
        .select("*")
        .eq("patient_id", pacienteId)
        .order("fecha", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw new Error(traducirErrorDB(error.message));
      return (data ?? []) as Periodontograma[];
    },
  });
}

/**
 * Un examen concreto con todos sus dientes.
 * Se pasa null cuando todavia no hay ninguno elegido.
 */
export function usePeriodontograma(examenId: string | null) {
  return useQuery({
    queryKey: [...CLAVE_PERIO, "examen", examenId],
    enabled: examenId !== null,
    queryFn: async (): Promise<ExamenPerio | null> => {
      if (!examenId) return null;

      const { data: cab, error: e1 } = await supabase
        .from("periodontogramas")
        .select("*")
        .eq("id", examenId)
        .maybeSingle();
      if (e1) throw new Error(traducirErrorDB(e1.message));
      if (!cab) return null;

      const { data: dientes, error: e2 } = await supabase
        .from("periodontograma_dientes")
        .select("*")
        .eq("periodontograma_id", examenId);
      if (e2) throw new Error(traducirErrorDB(e2.message));

      return {
        examen: cab as Periodontograma,
        dientes: (dientes ?? []) as PeriodontogramaDiente[],
      };
    },
  });
}

/**
 * Abre un examen nuevo. Si se le pasa el anterior, copia de el las
 * piezas ausentes y la furca: eso no cambia entre visitas y hacer que
 * la doctora lo vuelva a marcar cada vez es perder su tiempo. Lo que
 * SI se mide de nuevo (profundidad, margen, sangrado, placa) queda en
 * blanco a proposito: copiarlo seria inventar datos clinicos.
 */
export function useCrearPeriodontograma() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      pacienteId: string;
      copiarDe?: PeriodontogramaDiente[] | undefined;
    }): Promise<Periodontograma> => {
      const { data, error } = await supabase
        .from("periodontogramas")
        .insert({ patient_id: args.pacienteId })
        .select()
        .single();
      if (error) throw new Error(traducirErrorDB(error.message));
      const examen = data as Periodontograma;

      const heredables = (args.copiarDe ?? []).filter((d) => d.ausente || d.furca > 0);
      if (heredables.length > 0) {
        const { error: e2 } = await supabase.from("periodontograma_dientes").insert(
          heredables.map((d) => ({
            periodontograma_id: examen.id,
            tooth: d.tooth,
            ausente: d.ausente,
            furca: d.furca,
          })),
        );
        if (e2) throw new Error(traducirErrorDB(e2.message));
      }
      return examen;
    },
    onSuccess: (examen) => {
      void qc.invalidateQueries({ queryKey: [...CLAVE_PERIO, "lista", examen.patient_id] });
    },
  });
}

/**
 * Guarda las mediciones de UN diente. Se usa upsert porque la fila
 * puede no existir todavia: la doctora empieza a sondear por donde
 * quiera, no hay que crear las 32 filas por adelantado.
 */
export function useGuardarDientePerio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (fila: PeriodontogramaDiente): Promise<void> => {
      const { error } = await supabase
        .from("periodontograma_dientes")
        .upsert(fila, { onConflict: "periodontograma_id,tooth" });
      if (error) throw new Error(traducirErrorDB(error.message));
    },
    onSuccess: (_r, fila) => {
      void qc.invalidateQueries({
        queryKey: [...CLAVE_PERIO, "examen", fila.periodontograma_id],
      });
    },
  });
}

/** Cambia la fecha o las notas del examen. */
export function useActualizarPeriodontograma() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      id: string;
      cambios: Partial<Pick<Periodontograma, "fecha" | "notas">>;
    }): Promise<void> => {
      const { error } = await supabase
        .from("periodontogramas")
        .update(args.cambios)
        .eq("id", args.id);
      if (error) throw new Error(traducirErrorDB(error.message));
    },
    onSuccess: (_r, args) => {
      void qc.invalidateQueries({ queryKey: [...CLAVE_PERIO, "examen", args.id] });
      void qc.invalidateQueries({ queryKey: [...CLAVE_PERIO, "lista"] });
    },
  });
}

/* ============ NOTAS CLINICAS (historial de procedimientos) ============ */
//
// Distinto del campo "notes" de patients, que es uno solo y se
// sobrescribe cada vez que se guarda la ficha (sirve para alergias,
// antecedentes — lo que no cambia). Esto es una bitacora: cada nota es
// su propia fila con fecha, y se van acumulando sin borrar las
// anteriores. Es al campo "notes" lo que el periodontograma es al
// odontograma: una foto por dia, no un dato que se pisa.

export const CLAVE_NOTAS = ["notas-clinicas"] as const;

/** El historial de un paciente, la nota mas reciente primero. */
export function useNotasClinicas(pacienteId: string) {
  return useQuery({
    queryKey: [...CLAVE_NOTAS, "paciente", pacienteId],
    queryFn: async (): Promise<NotaClinica[]> => {
      const { data, error } = await supabase
        .from("notas_clinicas")
        .select("*")
        .eq("patient_id", pacienteId)
        .order("fecha", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw new Error(traducirErrorDB(error.message));
      return (data ?? []) as NotaClinica[];
    },
  });
}

/** Agrega una nota nueva al historial. No toca ni borra las anteriores. */
export function useAgregarNotaClinica() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { patientId: string; fecha: string; nota: string }): Promise<void> => {
      const { error } = await supabase.from("notas_clinicas").insert({
        patient_id: args.patientId,
        fecha: args.fecha,
        nota: args.nota,
      });
      if (error) throw new Error(traducirErrorDB(error.message));
    },
    onSuccess: (_r, args) => {
      void qc.invalidateQueries({ queryKey: [...CLAVE_NOTAS, "paciente", args.patientId] });
      void qc.invalidateQueries({ queryKey: ["actividad"] });
    },
  });
}

/* ============ CARGOS (lo que el paciente debe) ============ */
//
// "Registrar cobro" (arriba) es cuando el paciente PAGA: resta del saldo.
// Un cargo es lo contrario — un tratamiento que se le hizo y que ahora
// debe — y SUMA al saldo. Sin esto no habia ninguna forma de que un
// paciente le quedara debiendo algo al sistema: el saldo solo podia
// bajar, nunca subir. Cada cargo es su propia fila, con fecha, igual
// que notas_clinicas: un historial de lo que se le ha ido cobrando.

export const CLAVE_CARGOS = ["cargos"] as const;

/** Cargos de un paciente, del mas reciente al mas viejo. */
export function useCargosDePaciente(pacienteId: string) {
  return useQuery({
    queryKey: [...CLAVE_CARGOS, "paciente", pacienteId],
    queryFn: async (): Promise<Cargo[]> => {
      const { data, error } = await supabase
        .from("cargos")
        .select("*")
        .eq("patient_id", pacienteId)
        .order("fecha", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw new Error(traducirErrorDB(error.message));
      return (data ?? []) as Cargo[];
    },
  });
}

export interface NuevoCargo {
  patient_id: string;
  concepto: string;
  monto: number;
  fecha: string;
}

/**
 * Crea un cargo y le SUMA el monto al saldo del paciente. Es el reverso
 * exacto de useCrearCobro: primero guarda el cargo, despues ajusta el
 * saldo hacia arriba.
 */
export function useCrearCargo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (nuevo: NuevoCargo): Promise<Cargo> => {
      const { data, error } = await supabase.from("cargos").insert(nuevo).select().single();
      if (error) throw new Error(traducirErrorDB(error.message));

      const { data: pac } = await supabase
        .from("patients")
        .select("balance, name")
        .eq("id", nuevo.patient_id)
        .maybeSingle();

      if (pac) {
        const saldoNuevo = Number(pac.balance) + Number(nuevo.monto);
        await supabase.from("patients").update({ balance: saldoNuevo }).eq("id", nuevo.patient_id);

        await registrarActividad(
          "cargo",
          "Cargo agregado",
          `${pac.name} · RD$ ${Number(nuevo.monto).toLocaleString("en-US")}`,
        );
      }
      return data as Cargo;
    },
    onSuccess: (_r, args) => {
      void qc.invalidateQueries({ queryKey: [...CLAVE_CARGOS, "paciente", args.patient_id] });
      void qc.invalidateQueries({ queryKey: CLAVE_PACIENTES });
      void qc.invalidateQueries({ queryKey: ["actividad"] });
    },
  });
}

/* ==========================================================
   INVENTARIO

   Productos de la clinica (guantes, anestesia, material...). Lo que
   importa de verdad es el vencimiento: sirve para avisar antes de que
   algo caduque, no solo para saber cuanto hay.
   ========================================================== */

export const CLAVE_PRODUCTOS = ["productos"] as const;

/** Todo el inventario, lo que vence primero arriba (sin vencimiento, al final). */
export function useProductos() {
  return useQuery({
    queryKey: CLAVE_PRODUCTOS,
    queryFn: async (): Promise<Producto[]> => {
      const { data, error } = await supabase
        .from("productos")
        .select("*")
        .order("vencimiento", { ascending: true, nullsFirst: false })
        .order("nombre", { ascending: true });
      if (error) throw new Error(traducirErrorDB(error.message));
      return (data ?? []) as Producto[];
    },
  });
}

export interface NuevoProducto {
  nombre: string;
  categoria: string;
  cantidad: number;
  unidad: string;
  vencimiento: string | null;
  notas: string;
}

export function useCrearProducto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (nuevo: NuevoProducto): Promise<Producto> => {
      const { data, error } = await supabase.from("productos").insert(nuevo).select().single();
      if (error) throw new Error(traducirErrorDB(error.message));
      return data as Producto;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CLAVE_PRODUCTOS });
    },
  });
}

export function useActualizarProducto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, cambios }: { id: string; cambios: Partial<Producto> }) => {
      const { error } = await supabase.from("productos").update(cambios).eq("id", id);
      if (error) throw new Error(traducirErrorDB(error.message));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CLAVE_PRODUCTOS });
    },
  });
}

export function useEliminarProducto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("productos").delete().eq("id", id);
      if (error) throw new Error(traducirErrorDB(error.message));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CLAVE_PRODUCTOS });
    },
  });
}
