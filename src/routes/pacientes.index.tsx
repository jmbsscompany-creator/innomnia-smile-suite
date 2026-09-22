import { createFileRoute, Link } from "@tanstack/react-router";
import { Phone, Search, TriangleAlert, UserPlus, Users } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import type { Patient } from "@/lib/database.types";
import { usePacientes, useCrearPaciente, type NuevoPaciente } from "@/lib/queries";
import { edadDesde, formatDOP, normalizar } from "@/lib/format";
import { formatShortDate } from "@/lib/dates";
import { Button, EmptyState, InitialsAvatar, PageHeader, Pill } from "@/components/app/ui";
import {
  Field,
  FormGrid,
  Modal,
  ModalActions,
  SelectInput,
  TextArea,
  TextInput,
} from "@/components/app/form";
import { cn } from "@/lib/utils";

const title = "Pacientes — INNOMNIA Dental";
const description = "Expedientes de pacientes, proximas visitas, saldos y seguimiento.";

export const Route = createFileRoute("/pacientes/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: PatientsPage,
});

type Filtro = "todos" | "incompleta" | Patient["status"];

/**
 * Que le falta a una ficha para estar completa.
 * Telefono y fecha de nacimiento son los dos que importan de verdad:
 * sin telefono no puedes llamar al paciente, y sin fecha de nacimiento
 * no sabes su edad, que en odontologia cambia el tratamiento.
 * El correo y el tratamiento se dejan opcionales a proposito.
 */
export function faltantes(p: Patient): string[] {
  const falta: string[] = [];
  if (!p.phone.trim()) falta.push("telefono");
  if (!p.birth_date) falta.push("fecha de nacimiento");
  return falta;
}

const filtros: { key: Filtro; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "activo", label: "Activos" },
  { key: "seguimiento", label: "Seguimiento" },
  { key: "nuevo", label: "Nuevos" },
];

const tonoEstado = { activo: "success", seguimiento: "warning", nuevo: "info" } as const;
const textoEstado = { activo: "Activo", seguimiento: "Seguimiento", nuevo: "Nuevo" } as const;

const FORM_VACIO: NuevoPaciente = {
  file_number: "",
  name: "",
  phone: "",
  email: "",
  birth_date: null,
  treatment: "",
  status: "nuevo",
  notes: "",
};

/** Linea de "cargando" mientras llegan los datos. */
function Esqueleto() {
  return (
    <ul className="mt-4 divide-y divide-border" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="flex items-center gap-3 py-4">
          <span className="size-11 shrink-0 animate-pulse rounded-full bg-muted" />
          <span className="flex-1 space-y-2">
            <span className="block h-3.5 w-1/3 animate-pulse rounded bg-muted" />
            <span className="block h-3 w-1/2 animate-pulse rounded bg-muted" />
          </span>
        </li>
      ))}
    </ul>
  );
}

function PatientsPage() {
  const { data: pacientes, isPending, isError, error, refetch } = usePacientes();
  const crear = useCrearPaciente();

  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState<NuevoPaciente>(FORM_VACIO);

  const lista = useMemo(() => {
    const todos = pacientes ?? [];
    // Sin tildes: "mendez" encuentra "Méndez". Busca por nombre, apellido,
    // numero de ficha, telefono, tratamiento y correo, todo a la vez.
    const texto = normalizar(q);
    return todos.filter((p) => {
      const pasaFiltro =
        filtro === "todos"
          ? true
          : filtro === "incompleta"
            ? faltantes(p).length > 0
            : p.status === filtro;
      if (!pasaFiltro) return false;
      if (texto === "") return true;
      return (
        normalizar(p.name).includes(texto) ||
        normalizar(p.file_number).includes(texto) ||
        normalizar(p.phone).includes(texto) ||
        normalizar(p.treatment).includes(texto) ||
        normalizar(p.email).includes(texto)
      );
    });
  }, [pacientes, q, filtro]);

  const incompletas = useMemo(
    () => (pacientes ?? []).filter((p) => faltantes(p).length > 0).length,
    [pacientes],
  );

  const sinNinguno = !isPending && !isError && (pacientes?.length ?? 0) === 0;
  const enSeguimiento = (pacientes ?? []).filter((p) => p.status === "seguimiento").length;

  function cambiar<K extends keyof NuevoPaciente>(campo: K, valor: NuevoPaciente[K]) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  function cerrarModal() {
    setAbierto(false);
    setForm(FORM_VACIO);
    crear.reset();
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    try {
      await crear.mutateAsync({ ...form, name: form.name.trim() });
      cerrarModal();
    } catch {
      // El error se muestra dentro del modal; no cerramos para no perder lo escrito.
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pacientes"
        subtitle={
          isPending
            ? "Cargando expedientes..."
            : isError
              ? "No se pudo cargar la lista"
              : `${pacientes?.length ?? 0} ${(pacientes?.length ?? 0) === 1 ? "paciente registrado" : "pacientes registrados"}${enSeguimiento > 0 ? ` · ${enSeguimiento} requieren seguimiento` : ""}`
        }
        actions={
          <Button onClick={() => setAbierto(true)}>
            <UserPlus /> <span className="hidden sm:inline">Nuevo paciente</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        }
      />

      <div className="surface p-4 sm:p-5">
        {/* Buscador y filtros: se ocultan si todavia no hay ni un paciente */}
        {!sinNinguno && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="relative flex h-11 flex-1 items-center rounded-xl border border-input bg-card px-3.5 text-muted-foreground focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-ring/30">
              <Search className="size-[18px]" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nombre, apellido, ficha, telefono o tratamiento"
                className="ml-2.5 w-full bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
              />
            </label>
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {filtros.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFiltro(f.key)}
                  className={cn(
                    "h-9 shrink-0 rounded-lg px-3.5 text-sm font-medium transition-colors",
                    filtro === f.key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-primary-soft hover:text-primary",
                  )}
                >
                  {f.label}
                </button>
              ))}
              {incompletas > 0 && (
                <button
                  onClick={() => setFiltro(filtro === "incompleta" ? "todos" : "incompleta")}
                  className={cn(
                    "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3.5 text-sm font-medium transition-colors",
                    filtro === "incompleta"
                      ? "bg-warning text-primary-foreground"
                      : "bg-warning-soft text-warning hover:brightness-95",
                  )}
                >
                  <TriangleAlert className="size-3.5" />
                  Sin completar
                  <span className="tabular-nums opacity-80">({incompletas})</span>
                </button>
              )}
            </div>
          </div>
        )}

        {isPending ? (
          <Esqueleto />
        ) : isError ? (
          <div className="mt-4 rounded-xl bg-danger-soft px-4 py-6 text-center">
            <TriangleAlert className="mx-auto size-6 text-danger" />
            <p className="mt-2 font-semibold text-danger">No se pudieron cargar los pacientes</p>
            <p className="mt-1 text-sm text-danger/80">{error.message}</p>
            <Button variant="outline" className="mt-4" onClick={() => void refetch()}>
              Reintentar
            </Button>
          </div>
        ) : sinNinguno ? (
          /* Primera vez: la base esta vacia */
          <div className="px-4 py-10 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary">
              <Users className="size-7" strokeWidth={1.6} />
            </span>
            <p className="mt-4 text-[17px] font-semibold">Todavia no hay pacientes</p>
            <p className="mx-auto mt-1.5 max-w-[42ch] text-sm text-muted-foreground">
              Cuando registres el primero va a aparecer aqui, con su historial, sus proximas citas y
              su saldo.
            </p>
            <Button size="lg" className="mt-5" onClick={() => setAbierto(true)}>
              <UserPlus /> Registrar el primer paciente
            </Button>
          </div>
        ) : lista.length === 0 ? (
          /* Hay pacientes, pero el filtro o la busqueda no encontro ninguno */
          <div className="mt-4">
            <EmptyState
              title={
                filtro === "incompleta" ? "Todas las fichas estan completas" : "Sin resultados"
              }
              hint={
                filtro === "incompleta"
                  ? "No queda ningun paciente con datos por llenar."
                  : "Prueba con otro nombre o cambia el filtro."
              }
            />
          </div>
        ) : (
          <>
            {/* Tabla: tablet y escritorio */}
            <div className="mt-4 hidden overflow-hidden rounded-xl border border-border md:block">
              <table className="w-full text-[15px]">
                <thead className="bg-muted/60 text-left text-[13px] font-medium uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">Paciente</th>
                    <th className="px-4 py-3 font-medium">Contacto</th>
                    <th className="px-4 py-3 font-medium">Ultima visita</th>
                    <th className="px-4 py-3 font-medium">Proxima cita</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-5 py-3 text-right font-medium">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lista.map((p) => {
                    const edad = edadDesde(p.birth_date);
                    const falta = faltantes(p);
                    return (
                      <tr key={p.id} className="transition-colors hover:bg-primary-soft/40">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <InitialsAvatar name={p.name} size="sm" className="size-10 text-sm" />
                            <div className="min-w-0">
                              <p className="flex items-center gap-2 truncate font-semibold">
                                <Link
                                  to="/pacientes/$id"
                                  params={{ id: p.id }}
                                  className="truncate hover:text-primary hover:underline"
                                >
                                  {p.name}
                                </Link>
                                {falta.length > 0 && (
                                  <span
                                    title={`Falta: ${falta.join(" y ")}`}
                                    className="inline-flex shrink-0 items-center gap-1 rounded-md bg-warning-soft px-1.5 py-0.5 text-[11px] font-semibold text-warning"
                                  >
                                    <TriangleAlert className="size-3" /> Incompleta
                                  </span>
                                )}
                              </p>
                              <p className="truncate text-sm text-muted-foreground">
                                {[
                                  p.file_number ? `#${p.file_number}` : null,
                                  edad !== null ? `${edad} anos` : null,
                                  p.treatment || null,
                                ]
                                  .filter(Boolean)
                                  .join(" · ") ||
                                  (falta.length > 0 ? `Falta ${falta.join(" y ")}` : "Sin datos")}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground">
                          {p.phone ? (
                            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                              <Phone className="size-3.5" /> {p.phone}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-muted-foreground">
                          {formatShortDate(p.last_visit)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5">
                          {formatShortDate(p.next_visit)}
                        </td>
                        <td className="px-4 py-3.5">
                          <Pill tone={tonoEstado[p.status]}>{textoEstado[p.status]}</Pill>
                        </td>
                        <td
                          className={cn(
                            "whitespace-nowrap px-5 py-3.5 text-right font-semibold tabular-nums",
                            p.balance > 0 ? "text-warning" : "text-muted-foreground",
                          )}
                        >
                          {p.balance > 0 ? formatDOP(p.balance) : "Al dia"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Tarjetas: telefono */}
            <ul className="mt-4 divide-y divide-border md:hidden">
              {lista.map((p) => (
                <li key={p.id}>
                  <Link
                    to="/pacientes/$id"
                    params={{ id: p.id }}
                    className="flex items-center gap-3 py-3.5 transition-colors hover:bg-primary-soft/40"
                  >
                    <InitialsAvatar name={p.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{p.name}</p>
                      {faltantes(p).length > 0 ? (
                        <p className="inline-flex items-center gap-1 text-sm font-medium text-warning">
                          <TriangleAlert className="size-3.5" /> Falta {faltantes(p).join(" y ")}
                        </p>
                      ) : (
                        <p className="truncate text-sm text-muted-foreground">
                          {p.file_number ? `#${p.file_number} · ` : ""}
                          {p.treatment || "Sin tratamiento"}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <Pill tone={tonoEstado[p.status]}>{textoEstado[p.status]}</Pill>
                      <p
                        className={cn(
                          "mt-1 text-sm font-semibold",
                          p.balance > 0 ? "text-warning" : "text-muted-foreground",
                        )}
                      >
                        {p.balance > 0 ? formatDOP(p.balance) : "Al dia"}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Formulario de nuevo paciente */}
      <Modal
        open={abierto}
        onClose={cerrarModal}
        title="Nuevo paciente"
        description="Solo el nombre es obligatorio. Lo demas lo puedes completar despues."
        size="lg"
        footer={
          <ModalActions
            onCancel={cerrarModal}
            formId="form-paciente"
            disabled={crear.isPending}
            submitLabel={crear.isPending ? "Guardando..." : "Guardar paciente"}
          />
        }
      >
        <form id="form-paciente" onSubmit={guardar} className="space-y-4">
          <FormGrid className="sm:grid-cols-[1fr_140px]">
            <Field label="Nombre completo">
              <TextInput
                value={form.name}
                onChange={(e) => cambiar("name", e.target.value)}
                placeholder="Ana Lopez"
                autoFocus
                required
              />
            </Field>
            <Field label="Numero de ficha" hint="Opcional.">
              <TextInput
                value={form.file_number}
                onChange={(e) => cambiar("file_number", e.target.value)}
                placeholder="0847"
              />
            </Field>
          </FormGrid>

          <FormGrid>
            <Field label="Telefono">
              <TextInput
                type="tel"
                value={form.phone}
                onChange={(e) => cambiar("phone", e.target.value)}
                placeholder="809-555-0100"
              />
            </Field>
            <Field label="Correo">
              <TextInput
                type="email"
                value={form.email}
                onChange={(e) => cambiar("email", e.target.value)}
                placeholder="correo@ejemplo.com"
              />
            </Field>
          </FormGrid>

          <FormGrid>
            <Field label="Fecha de nacimiento" hint="La edad se calcula sola.">
              <TextInput
                type="date"
                value={form.birth_date ?? ""}
                onChange={(e) => cambiar("birth_date", e.target.value || null)}
              />
            </Field>
            <Field label="Estado">
              <SelectInput
                value={form.status}
                onChange={(e) => cambiar("status", e.target.value as Patient["status"])}
              >
                <option value="nuevo">Nuevo</option>
                <option value="activo">Activo</option>
                <option value="seguimiento">Seguimiento</option>
              </SelectInput>
            </Field>
          </FormGrid>

          <Field label="Tratamiento actual">
            <TextInput
              value={form.treatment}
              onChange={(e) => cambiar("treatment", e.target.value)}
              placeholder="Limpieza dental"
            />
          </Field>

          <Field label="Notas">
            <TextArea
              value={form.notes}
              onChange={(e) => cambiar("notes", e.target.value)}
              placeholder="Alergias, observaciones, preferencias de horario..."
            />
          </Field>

          {crear.isError && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-xl bg-danger-soft px-3.5 py-3 text-sm text-danger"
            >
              <TriangleAlert className="mt-px size-4 shrink-0" />
              <span>{crear.error.message}</span>
            </p>
          )}
        </form>
      </Modal>
    </div>
  );
}
