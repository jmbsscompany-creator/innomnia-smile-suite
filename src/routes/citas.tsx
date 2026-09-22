import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  TriangleAlert,
  UserPlus,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import type { Appointment } from "@/lib/database.types";
import {
  useCambiarEstadoCita,
  useCitasDeRango,
  useCrearCita,
  usePacientes,
  type NuevaCita,
} from "@/lib/queries";
import { Button, InitialsAvatar, PageHeader, Section, StatusBadge } from "@/components/app/ui";
import {
  Buscador,
  Field,
  FormGrid,
  Modal,
  ModalActions,
  SelectInput,
  TextArea,
  TextInput,
} from "@/components/app/form";
import { cn } from "@/lib/utils";

const title = "Agenda de citas — INNOMNIA Dental";
const description = "Calendario semanal y lista de citas de la clinica.";

export const Route = createFileRoute("/citas")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: AppointmentsPage,
});

const DOW_CORTO = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
const DOW_LARGO = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
const HORAS = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
];

function aISO(d: Date) {
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/** Lunes de la semana, corrido tantas semanas como diga el offset. */
function lunesDe(offsetSemanas: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const diaDeSemana = (d.getDay() + 6) % 7; // 0 = lunes
  d.setDate(d.getDate() - diaDeSemana + offsetSemanas * 7);
  return d;
}

function sumarDias(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function minutos(hhmm: string) {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

const FORM_VACIO: Omit<NuevaCita, "date"> = {
  patient_id: null,
  time: "09:00",
  duration: 30,
  treatment: "",
  dentist: "",
  status: "pendiente",
  notes: "",
};

function AppointmentsPage() {
  const [semana, setSemana] = useState(0);
  const [vista, setVista] = useState<"dia" | "semana">("dia");
  const [seleccionado, setSeleccionado] = useState(() => aISO(new Date()));
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);

  const lunes = useMemo(() => lunesDe(semana), [semana]);
  const dias = useMemo(() => Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i)), [lunes]);
  const desde = aISO(dias[0]!);
  const hasta = aISO(dias[6]!);
  const hoy = aISO(new Date());

  const citas = useCitasDeRango(desde, hasta);
  const pacientes = usePacientes();
  const crear = useCrearCita();
  const cambiarEstado = useCambiarEstadoCita();

  const todas = citas.data ?? [];
  const delDia = useMemo(
    () =>
      todas
        .filter((c) => c.date === seleccionado)
        .sort((a, b) => minutos(a.time) - minutos(b.time)),
    [todas, seleccionado],
  );

  const totalMin = delDia.reduce((s, c) => s + c.duration, 0);
  const fechaSel = new Date(`${seleccionado}T00:00:00`);
  const nombreDia = DOW_LARGO[(fechaSel.getDay() + 6) % 7] ?? "";
  const sinPacientes = (pacientes.data?.length ?? 0) === 0;

  function nombrePaciente(id: string | null) {
    if (!id) return "Sin paciente asignado";
    return pacientes.data?.find((p) => p.id === id)?.name ?? "Paciente";
  }

  function cambiar<K extends keyof typeof FORM_VACIO>(campo: K, valor: (typeof FORM_VACIO)[K]) {
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
      await crear.mutateAsync({ ...form, date: seleccionado });
      cerrarModal();
    } catch {
      // El error se muestra dentro del modal.
    }
  }

  const rangoTexto = `${dias[0]!.getDate()} al ${dias[6]!.getDate()} de ${MESES[dias[6]!.getMonth()]} de ${dias[6]!.getFullYear()}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agenda"
        subtitle={`Semana del ${rangoTexto}`}
        actions={
          <>
            <div className="hidden rounded-xl border border-border-strong bg-card p-1 sm:flex">
              {(["dia", "semana"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setVista(v)}
                  className={cn(
                    "h-8 rounded-lg px-3.5 text-sm font-medium capitalize transition-colors",
                    vista === v
                      ? "bg-primary-soft text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {v === "dia" ? "Dia" : "Semana"}
                </button>
              ))}
            </div>
            <Button onClick={() => setAbierto(true)}>
              <Plus /> <span className="hidden sm:inline">Nueva cita</span>
              <span className="sm:hidden">Nueva</span>
            </Button>
          </>
        }
      />

      {/* Tira de la semana — ahora las flechas funcionan */}
      <div className="surface flex items-center gap-2 p-3">
        <button
          onClick={() => setSemana((s) => s - 1)}
          className="grid size-10 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
          aria-label="Semana anterior"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="grid flex-1 grid-cols-7 gap-1.5">
          {dias.map((d, i) => {
            const iso = aISO(d);
            const cuantas = todas.filter((c) => c.date === iso).length;
            const activo = seleccionado === iso;
            const esHoy = iso === hoy;
            return (
              <button
                key={iso}
                onClick={() => {
                  setSeleccionado(iso);
                  setVista("dia");
                }}
                className={cn(
                  "flex flex-col items-center rounded-xl py-2.5 transition-colors",
                  activo
                    ? "bg-primary text-primary-foreground shadow-primary"
                    : "hover:bg-primary-soft",
                )}
              >
                <span
                  className={cn(
                    "text-[11px] font-medium uppercase tracking-wide",
                    activo ? "text-primary-foreground/80" : "text-muted-foreground",
                  )}
                >
                  {DOW_CORTO[i]}
                </span>
                <span
                  className={cn(
                    "mt-0.5 grid size-7 place-items-center rounded-full text-lg font-bold leading-none",
                    !activo && esHoy && "bg-primary-soft text-primary",
                  )}
                >
                  {d.getDate()}
                </span>
                <span className="mt-1.5 flex h-1.5 gap-0.5">
                  {Array.from({ length: Math.min(cuantas, 4) }).map((_, k) => (
                    <span
                      key={k}
                      className={cn(
                        "size-1.5 rounded-full",
                        activo ? "bg-primary-foreground/80" : "bg-primary",
                      )}
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setSemana((s) => s + 1)}
          className="grid size-10 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
          aria-label="Semana siguiente"
        >
          <ChevronRight className="size-5" />
        </button>
        {semana !== 0 && (
          <Button variant="ghost" size="sm" onClick={() => setSemana(0)} className="shrink-0">
            Hoy
          </Button>
        )}
      </div>

      {citas.isError && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          <TriangleAlert className="mt-px size-4 shrink-0" />
          <span>{citas.error.message}</span>
        </p>
      )}

      {vista === "semana" ? (
        <Section padded={false}>
          <div className="overflow-x-auto">
            <div className="grid min-w-[880px] grid-cols-[64px_repeat(7,minmax(0,1fr))]">
              <div className="border-b border-border" />
              {dias.map((d, i) => (
                <div
                  key={aISO(d)}
                  className="border-b border-l border-border px-3 py-3 text-center"
                >
                  <span className="text-xs font-medium uppercase text-muted-foreground">
                    {DOW_CORTO[i]}
                  </span>
                  <span
                    className={cn(
                      "mx-auto mt-1 grid size-8 place-items-center rounded-full text-sm font-bold",
                      aISO(d) === hoy && "bg-primary text-primary-foreground",
                    )}
                  >
                    {d.getDate()}
                  </span>
                </div>
              ))}
              {HORAS.map((h) => (
                <div key={h} className="contents">
                  <div className="h-16 border-b border-border px-2 pt-1 text-right text-xs tabular-nums text-muted-foreground">
                    {h}
                  </div>
                  {dias.map((d) => {
                    const iso = aISO(d);
                    const items = todas.filter(
                      (c) => c.date === iso && c.time.slice(0, 2) === h.slice(0, 2),
                    );
                    return (
                      <div key={iso} className="relative h-16 border-b border-l border-border p-1">
                        {items.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => {
                              setSeleccionado(iso);
                              setVista("dia");
                            }}
                            className={cn(
                              "block w-full truncate rounded-md border-l-2 px-2 py-1 text-left text-xs font-medium",
                              c.status === "pendiente"
                                ? "border-warning bg-warning-soft text-warning"
                                : c.status === "completada"
                                  ? "border-border-strong bg-muted text-muted-foreground"
                                  : c.status === "cancelada"
                                    ? "border-danger bg-danger-soft text-danger line-through"
                                    : "border-primary bg-primary-soft text-primary-soft-foreground",
                            )}
                          >
                            {c.time.slice(0, 5)} {nombrePaciente(c.patient_id)}
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </Section>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Section
            title={`${nombreDia.charAt(0).toUpperCase()}${nombreDia.slice(1)} ${fechaSel.getDate()} de ${MESES[fechaSel.getMonth()]}`}
          >
            {citas.isPending ? (
              <ul className="space-y-3" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <li key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
                ))}
              </ul>
            ) : delDia.length === 0 ? (
              <div className="px-2 py-10 text-center">
                <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
                  <CalendarDays className="size-6" strokeWidth={1.6} />
                </span>
                <p className="mt-3 font-semibold">Sin citas este dia</p>
                <p className="mx-auto mt-1 max-w-[40ch] text-sm text-muted-foreground">
                  Agenda la primera desde el boton de arriba.
                </p>
              </div>
            ) : (
              <ol className="divide-y divide-border">
                {delDia.map((c) => (
                  <li
                    key={c.id}
                    className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 py-4 sm:grid-cols-[72px_minmax(0,1fr)_auto]"
                  >
                    <div>
                      <p className="text-[15px] font-semibold tabular-nums">{c.time.slice(0, 5)}</p>
                      <p className="text-xs text-muted-foreground">{c.duration} min</p>
                    </div>
                    <div className="flex min-w-0 items-center gap-3 border-l border-border-strong pl-4">
                      <InitialsAvatar
                        name={nombrePaciente(c.patient_id)}
                        className="hidden sm:grid"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-semibold">
                          {nombrePaciente(c.patient_id)}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                          {[c.treatment, c.dentist].filter(Boolean).join(" · ") || "Sin detalle"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {c.status === "pendiente" && (
                        <Button
                          variant="soft"
                          size="sm"
                          disabled={cambiarEstado.isPending}
                          onClick={() => cambiarEstado.mutate({ id: c.id, status: "confirmada" })}
                        >
                          <Check /> <span className="hidden sm:inline">Confirmar</span>
                        </Button>
                      )}
                      <StatusBadge status={c.status} />
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Section>

          <div className="space-y-6">
            <Section title="Resumen del dia">
              <dl className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-primary-soft/60 p-4">
                  <dt className="text-sm text-muted-foreground">Citas</dt>
                  <dd className="mt-1 text-2xl font-bold">{delDia.length}</dd>
                </div>
                <div className="rounded-xl bg-primary-soft/60 p-4">
                  <dt className="text-sm text-muted-foreground">Horas ocupadas</dt>
                  <dd className="mt-1 text-2xl font-bold">
                    {Math.floor(totalMin / 60)}
                    <span className="text-base font-medium text-muted-foreground">
                      {" "}
                      h {totalMin % 60} min
                    </span>
                  </dd>
                </div>
              </dl>
              <ul className="mt-4 space-y-2 text-sm">
                {(
                  [
                    ["Confirmadas", "confirmada"],
                    ["Pendientes", "pendiente"],
                    ["Completadas", "completada"],
                  ] as const
                ).map(([etiqueta, estado]) => (
                  <li key={estado} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{etiqueta}</span>
                    <span className={cn("font-semibold", estado === "pendiente" && "text-warning")}>
                      {delDia.filter((c) => c.status === estado).length}
                    </span>
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="Horas libres">
              <div className="flex flex-wrap gap-2">
                {HORAS.map((h) => {
                  const ocupada = delDia.some(
                    (c) => c.status !== "cancelada" && c.time.slice(0, 2) === h.slice(0, 2),
                  );
                  return (
                    <span
                      key={h}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm tabular-nums",
                        ocupada
                          ? "border-border bg-muted text-muted-foreground line-through"
                          : "border-primary/30 bg-primary-soft/50 text-primary",
                      )}
                    >
                      <Clock className="size-3.5" /> {h}
                    </span>
                  );
                })}
              </div>
            </Section>
          </div>
        </div>
      )}

      {/* Formulario de nueva cita */}
      <Modal
        open={abierto}
        onClose={cerrarModal}
        title="Nueva cita"
        description={`Se va a agendar para el ${fechaSel.getDate()} de ${MESES[fechaSel.getMonth()]}. Cambia el dia en la tira de arriba.`}
        size="lg"
        footer={
          sinPacientes ? (
            <Button type="button" variant="outline" onClick={cerrarModal}>
              Cerrar
            </Button>
          ) : (
            <ModalActions
              onCancel={cerrarModal}
              formId="form-cita"
              disabled={crear.isPending}
              submitLabel={crear.isPending ? "Agendando..." : "Agendar cita"}
            />
          )
        }
      >
        {sinPacientes ? (
          <div className="py-6 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
              <UserPlus className="size-6" strokeWidth={1.6} />
            </span>
            <p className="mt-3 font-semibold">Primero necesitas un paciente</p>
            <p className="mx-auto mt-1 max-w-[40ch] text-sm text-muted-foreground">
              Una cita se le agenda a alguien. Registra al paciente y vuelve aqui.
            </p>
            <Link to="/pacientes" onClick={cerrarModal}>
              <Button className="mt-4">
                <UserPlus /> Ir a Pacientes
              </Button>
            </Link>
          </div>
        ) : (
          <form id="form-cita" onSubmit={guardar} className="space-y-4">
            <Field label="Paciente">
              <Buscador
                value={form.patient_id}
                onChange={(id) => cambiar("patient_id", id)}
                placeholder="Escribe el nombre del paciente..."
                vacioTexto="Ningun paciente con ese nombre"
                required
                options={(pacientes.data ?? []).map((p) => ({
                  id: p.id,
                  label: p.name,
                  ...(p.phone ? { hint: p.phone } : {}),
                }))}
              />
            </Field>

            <FormGrid>
              <Field label="Hora">
                <TextInput
                  type="time"
                  value={form.time}
                  onChange={(e) => cambiar("time", e.target.value)}
                  required
                />
              </Field>
              <Field label="Duracion" hint="En minutos.">
                <SelectInput
                  value={String(form.duration)}
                  onChange={(e) => cambiar("duration", Number(e.target.value))}
                >
                  {[15, 30, 45, 60, 90, 120].map((m) => (
                    <option key={m} value={m}>
                      {m} minutos
                    </option>
                  ))}
                </SelectInput>
              </Field>
            </FormGrid>

            <FormGrid>
              <Field label="Tratamiento">
                <TextInput
                  value={form.treatment}
                  onChange={(e) => cambiar("treatment", e.target.value)}
                  placeholder="Limpieza dental"
                />
              </Field>
              <Field label="Odontologo">
                <TextInput
                  value={form.dentist}
                  onChange={(e) => cambiar("dentist", e.target.value)}
                  placeholder="Dra. Saudy"
                />
              </Field>
            </FormGrid>

            <Field label="Estado">
              <SelectInput
                value={form.status}
                onChange={(e) => cambiar("status", e.target.value as Appointment["status"])}
              >
                <option value="pendiente">Pendiente de confirmar</option>
                <option value="confirmada">Confirmada</option>
              </SelectInput>
            </Field>

            <Field label="Notas">
              <TextArea
                value={form.notes}
                onChange={(e) => cambiar("notes", e.target.value)}
                placeholder="Motivo de la consulta, observaciones..."
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
        )}
      </Modal>
    </div>
  );
}
