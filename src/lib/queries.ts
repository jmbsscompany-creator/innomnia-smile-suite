// Lectura y escritura de datos contra Supabase.
// Usa react-query, que ya venia en el proyecto: se encarga de guardar en cache,
// avisar mientras carga y volver a pedir los datos cuando algo cambia.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ActivityItem, Appointment, Patient, Payment } from "@/lib/database.types";

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

export function usePacientes() {
  return useQuery({
    queryKey: CLAVE_PACIENTES,
    queryFn: async (): Promise<Patient[]> => {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw new Error(traducirErrorDB(error.message));
      return (data ?? []) as Patient[];
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
      return data as Patient;
    },
    // Al terminar, vuelve a pedir la lista para que aparezca el nuevo.
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CLAVE_PACIENTES });
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
      return data as Appointment;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CLAVE_CITAS });
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

/* ============ ACTIVIDAD ============ */

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
