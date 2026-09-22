// Lectura y escritura de datos contra Supabase.
// Usa react-query, que ya venia en el proyecto: se encarga de guardar en cache,
// avisar mientras carga y volver a pedir los datos cuando algo cambia.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ActivityItem, Appointment, Patient, Payment, Service } from "@/lib/database.types";

/** Traduce los errores de la base, que vienen en ingles. */
export function traducirErrorDB(mensaje: string): string {
  const m = mensaje.toLowerCase();
  if (m.includes("row-level security"))
    return "No tienes permiso para hacer eso. Habla con la odontologa.";
  if (m.includes("duplicate key")) return "Ese registro ya existe.";
  if (m.includes("violates foreign key")) return "Falta un dato relacionado.";
  if (m.includes("jwt") || m.includes("expired")) return "Tu sesion vencio. Vuelve a entrar.";
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
    queryKey: [...CLAVE_CITAS, "dia", fecha],
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
    queryKey: [...CLAVE_COBROS, "dia", fecha],
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
}

/**
 * Registra un cobro y le descuenta el monto al saldo del paciente.
 * Son dos pasos: primero guarda el cobro, despues ajusta el saldo.
 */
export function useCrearCobro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (nuevo: NuevoCobro): Promise<Payment> => {
      const { data, error } = await supabase.from("payments").insert(nuevo).select().single();
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
