import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Pencil,
  Plus,
  Trash2,
  TriangleAlert,
  UserPlus,
  X,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import type { Appointment } from "@/lib/database.types";
import {
  useActualizarCita,
  useAgregarNotaClinica,
  useCambiarEstadoCita,
  useCitasDeRango,
  useClinica,
  useCrearCita,
  useCrearDoctor,
  useDoctores,
  useEliminarCita,
  usePacientes,
  type NuevaCita,
} from "@/lib/queries";
import {
  BotonWhatsApp,
  Button,
  InitialsAvatar,
  PageHeader,
  Section,
  StatusBadge,
} from "@/components/app/ui";
import { mensajeNoAsistio, mensajeRecordatorio } from "@/lib/whatsapp";
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
import { formatShortDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

const title = "Agenda de citas — INNOMNIA Dental";
const description = "Calendario semanal y lista de citas de la clínica.";

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

const DOW_CORTO = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const DOW_LARGO = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
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
  dentist_id: null,
  time: "09:00",
  duration: 30,
  treatment: "",
  dentist: "",
  status: "pendiente",
  notes: "",
};

function AppointmentsPage() {
  const [semana, setSemana] = useState(0);
  const [vista, setVista] = useState<"día" | "semana">("día");
  const [seleccionado, setSeleccionado] = useState(() => aISO(new Date()));
  const [abierto, setAbierto] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [editando, setEditando] = useState<Appointment | null>(null);
  const [formEdit, setFormEdit] = useState<NuevaCita>({ ...FORM_VACIO, date: aISO(new Date()) });
  const [confirmarBorrar, setConfirmarBorrar] = useState<string | null>(null);
  // Cuando ya paso el dia de una cita que se quedo en pendiente/confirmada,
  // en vez de dejarla asi para siempre se le pregunta si el paciente vino.
  // Si no vino, se le pide un motivo (opcional) y eso se anota tambien en
  // el historial del paciente, para poder darle seguimiento despues.
  const [marcandoNoAsistio, setMarcandoNoAsistio] = useState<string | null>(null);
  const [motivoNoAsistio, setMotivoNoAsistio] = useState("");
  // Ver el detalle de una cita: la lista solo muestra lo basico, y al
  // hacer clic se abre esto con todo (y ahi mismo, los botones para
  // confirmar, cancelar, etc. — bien explicados, no iconos sueltos).
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [confirmarCancelar, setConfirmarCancelar] = useState<string | null>(null);

  const lunes = useMemo(() => lunesDe(semana), [semana]);
  const dias = useMemo(() => Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i)), [lunes]);
  const desde = aISO(dias[0]!);
  const hasta = aISO(dias[6]!);
  const hoy = aISO(new Date());

  const citas = useCitasDeRango(desde, hasta);
  const pacientes = usePacientes();
  const doctores = useDoctores();
  const crear = useCrearCita();
  const crearDoctor = useCrearDoctor();
  const cambiarEstado = useCambiarEstadoCita();
  const actualizar = useActualizarCita();
  const eliminar = useEliminarCita();
  const agregarNota = useAgregarNotaClinica();

  const clinica = useClinica();
  const nombreClinica = clinica.data?.name?.trim() ?? "";

  const todas = citas.data ?? [];
  const delDia = useMemo(
    () =>
      todas
        .filter((c) => c.date === seleccionado)
        .sort((a, b) => minutos(a.time) - minutos(b.time)),
    [todas, seleccionado],
  );
  const citaDetalle = todas.find((c) => c.id === detalleId) ?? null;

  const totalMin = delDia.reduce((s, c) => s + c.duration, 0);
  const fechaSel = new Date(`${seleccionado}T00:00:00`);
  const nombreDia = DOW_LARGO[(fechaSel.getDay() + 6) % 7] ?? "";
  const sinPacientes = (pacientes.data?.length ?? 0) === 0;

  function nombrePaciente(id: string | null) {
    if (!id) return "Sin paciente asignado";
    return pacientes.data?.find((p) => p.id === id)?.name ?? "Paciente";
  }

  function telefonoPaciente(id: string | null) {
    if (!id) return null;
    return pacientes.data?.find((p) => p.id === id)?.phone ?? null;
  }

  /** Prefiere el doctor de la lista; si no, el nombre suelto que se escribio. */
  function nombreDoctor(c: Appointment) {
    if (c.dentist_id) {
      const d = doctores.data?.find((x) => x.id === c.dentist_id);
      if (d) return d.name;
    }
    return c.dentist;
  }

  /** Agrega un doctor sin salir del formulario de la cita. */
  async function agregarDoctor(nombre: string): Promise<string | null> {
    try {
      const d = await crearDoctor.mutateAsync({ name: nombre, specialty: "", phone: "" });
      return d.id;
    } catch {
      return null;
    }
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

  /** Abre el modal de edicion con los datos actuales de esa cita. */
  function abrirEditar(c: Appointment) {
    setFormEdit({
      patient_id: c.patient_id,
      dentist_id: c.dentist_id,
      date: c.date,
      time: c.time.slice(0, 5),
      duration: c.duration,
      treatment: c.treatment,
      dentist: c.dentist,
      status: c.status,
      notes: c.notes,
    });
    setEditando(c);
  }

  function cerrarEditar() {
    setEditando(null);
    actualizar.reset();
  }

  function cambiarEdit<K extends keyof NuevaCita>(campo: K, valor: NuevaCita[K]) {
    setFormEdit((prev) => ({ ...prev, [campo]: valor }));
  }

  async function guardarEdicion(e: FormEvent) {
    e.preventDefault();
    if (!editando) return;
    try {
      await actualizar.mutateAsync({ id: editando.id, cambios: formEdit });
      cerrarEditar();
    } catch {
      // El error se muestra dentro del modal.
    }
  }

  function pedirBorrar(id: string) {
    setConfirmarBorrar(id);
  }

  async function confirmarYBorrar(id: string) {
    await eliminar.mutateAsync(id);
    setConfirmarBorrar(null);
    setDetalleId(null);
  }

  function abrirDetalle(id: string) {
    setDetalleId(id);
    setConfirmarCancelar(null);
    setConfirmarBorrar(null);
    cerrarNoAsistio();
  }

  function cerrarDetalle() {
    setDetalleId(null);
    setConfirmarCancelar(null);
    cerrarNoAsistio();
  }

  function confirmarCita(c: Appointment) {
    cambiarEstado.mutate({ id: c.id, status: "confirmada" });
    cerrarDetalle();
  }

  function confirmarCancelarCita(c: Appointment) {
    cambiarEstado.mutate({ id: c.id, status: "cancelada" });
    cerrarDetalle();
  }

  /** Ya paso el dia de esa cita y sigue sin resolverse (ni confirmada ni cancelada a tiempo). */
  function yaPaso(c: Appointment) {
    return c.date < hoy;
  }

  function marcarSiAsistio(c: Appointment) {
    cambiarEstado.mutate({ id: c.id, status: "completada" });
    cerrarDetalle();
  }

  function abrirNoAsistio(id: string) {
    setMarcandoNoAsistio(id);
    setMotivoNoAsistio("");
  }

  function cerrarNoAsistio() {
    setMarcandoNoAsistio(null);
    setMotivoNoAsistio("");
  }

  /**
   * Marca que el paciente no vino: cambia el estado, guarda el motivo (si
   * escribio uno) en las notas de la cita, y ademas deja una anotacion en
   * el historial del paciente — asi queda registrado para poder darle
   * seguimiento despues, y no se pierde entre las citas viejas.
   */
  async function confirmarNoAsistio(c: Appointment) {
    const motivo = motivoNoAsistio.trim();
    const notasFinal = motivo
      ? [c.notes, `No asistió: ${motivo}`].filter(Boolean).join(" · ")
      : c.notes;
    try {
      await actualizar.mutateAsync({
        id: c.id,
        cambios: { status: "no_asistio", notes: notasFinal },
      });
      if (c.patient_id) {
        const detalle = motivo ? ` Motivo: ${motivo}` : "";
        await agregarNota.mutateAsync({
          patientId: c.patient_id,
          fecha: hoy,
          nota: `No asistió a la cita del ${formatShortDate(c.date)} a las ${c.time.slice(0, 5)}.${detalle}`,
        });
      }
      cerrarDetalle();
    } catch {
      // El error se muestra junto al aviso.
    }
  }

  const rangoTexto = `${dias[0]!.getDate()} al ${dias[6]!.getDate()} de ${MESES[dias[6]!.getMonth()]} de ${dias[6]!.getFullYear()}`;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Agenda"
        subtitle={`Semana del ${rangoTexto}`}
        actions={
          <>
            <div className="hidden rounded-xl border border-border-strong bg-card p-1 sm:flex">
              {(["día", "semana"] as const).map((v) => (
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
                  {v === "día" ? "Día" : "Semana"}
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
                  setVista("día");
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
                              setVista("día");
                            }}
                            className={cn(
                              "block w-full truncate rounded-md border-l-2 px-2 py-1 text-left text-xs font-medium",
                              c.status === "pendiente"
                                ? "border-warning bg-warning-soft text-warning"
                                : c.status === "completada"
                                  ? "border-border-strong bg-muted text-muted-foreground"
                                  : c.status === "cancelada"
                                    ? "border-danger bg-danger-soft text-danger line-through"
                                    : c.status === "no_asistio"
                                      ? "border-danger bg-danger-soft text-danger"
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
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
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
                <p className="mt-3 font-semibold">Sin citas este día</p>
                <p className="mx-auto mt-1 max-w-[40ch] text-sm text-muted-foreground">
                  Agenda la primera desde el botón de arriba.
                </p>
              </div>
            ) : (
              <ol className="divide-y divide-border">
                {delDia.map((c) => (
                  <li key={c.id}>
                    {/* Toda la fila se puede tocar: abre el detalle de la
                        cita, con todo bien explicado (nada de iconos sueltos
                        sin decir que hacen). */}
                    <button
                      type="button"
                      onClick={() => abrirDetalle(c.id)}
                      className="grid w-full grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg py-4 text-left transition-colors hover:bg-primary-soft/40 sm:grid-cols-[72px_minmax(0,1fr)_auto]"
                    >
                      <div>
                        <p className="text-[15px] font-semibold tabular-nums">
                          {c.time.slice(0, 5)}
                        </p>
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
                            {[c.treatment, nombreDoctor(c)].filter(Boolean).join(" · ") ||
                              "Sin detalle"}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {yaPaso(c) && (c.status === "pendiente" || c.status === "confirmada") && (
                          <span className="hidden text-xs font-medium text-warning sm:inline">
                            ¿Asistió?
                          </span>
                        )}
                        <StatusBadge status={c.status} />
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                      </div>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </Section>

          <div className="space-y-4">
            <Section title="Resumen del día">
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
                    ["No asistió", "no_asistio"],
                  ] as const
                ).map(([etiqueta, estado]) => (
                  <li key={estado} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{etiqueta}</span>
                    <span
                      className={cn(
                        "font-semibold",
                        estado === "pendiente" && "text-warning",
                        estado === "no_asistio" && "text-danger",
                      )}
                    >
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
              Una cita se le agenda a alguien. Registra al paciente y vuelve aquí.
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
                vacioTexto="Ningún paciente con ese nombre"
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
              <Field label="Duración" hint="En minutos.">
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
              <Field label="Odontólogo" hint="Si no está en la lista, escríbelo y lo agregas.">
                <Buscador
                  value={form.dentist_id}
                  onChange={(id) => cambiar("dentist_id", id)}
                  placeholder="Busca o escribe un doctor..."
                  vacioTexto="Ningún doctor con ese nombre"
                  onCrear={agregarDoctor}
                  crearTexto="Agregar doctor"
                  options={(doctores.data ?? [])
                    .filter((d) => d.active)
                    .map((d) => ({
                      id: d.id,
                      label: d.name,
                      ...(d.specialty ? { hint: d.specialty } : {}),
                    }))}
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

      {/* Editar / reagendar / cancelar una cita ya existente */}
      <Modal
        open={editando !== null}
        onClose={cerrarEditar}
        title="Editar cita"
        description="Cambia el día, la hora o lo que haga falta. Si se equivocaron, aquí se corrige."
        size="lg"
        footer={
          <ModalActions
            onCancel={cerrarEditar}
            formId="form-editar-cita"
            disabled={actualizar.isPending}
            submitLabel={actualizar.isPending ? "Guardando..." : "Guardar cambios"}
          />
        }
      >
        <form id="form-editar-cita" onSubmit={guardarEdicion} className="space-y-4">
          <Field label="Paciente">
            <Buscador
              value={formEdit.patient_id}
              onChange={(id) => cambiarEdit("patient_id", id)}
              placeholder="Escribe el nombre del paciente..."
              vacioTexto="Ningún paciente con ese nombre"
              required
              options={(pacientes.data ?? []).map((p) => ({
                id: p.id,
                label: p.name,
                ...(p.phone ? { hint: p.phone } : {}),
              }))}
            />
          </Field>

          <FormGrid>
            <Field label="Fecha">
              <TextInput
                type="date"
                value={formEdit.date}
                onChange={(e) => cambiarEdit("date", e.target.value)}
                required
              />
            </Field>
            <Field label="Hora">
              <TextInput
                type="time"
                value={formEdit.time}
                onChange={(e) => cambiarEdit("time", e.target.value)}
                required
              />
            </Field>
          </FormGrid>

          <FormGrid>
            <Field label="Duración" hint="En minutos.">
              <SelectInput
                value={String(formEdit.duration)}
                onChange={(e) => cambiarEdit("duration", Number(e.target.value))}
              >
                {[15, 30, 45, 60, 90, 120].map((m) => (
                  <option key={m} value={m}>
                    {m} minutos
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Estado">
              <SelectInput
                value={formEdit.status}
                onChange={(e) => cambiarEdit("status", e.target.value as Appointment["status"])}
              >
                <option value="pendiente">Pendiente de confirmar</option>
                <option value="confirmada">Confirmada</option>
                <option value="en-consulta">En consulta</option>
                <option value="completada">Completada</option>
                <option value="cancelada">Cancelada</option>
                <option value="no_asistio">No asistió</option>
              </SelectInput>
            </Field>
          </FormGrid>

          <FormGrid>
            <Field label="Tratamiento">
              <TextInput
                value={formEdit.treatment}
                onChange={(e) => cambiarEdit("treatment", e.target.value)}
                placeholder="Limpieza dental"
              />
            </Field>
            <Field label="Odontólogo" hint="Si no está en la lista, escríbelo y lo agregas.">
              <Buscador
                value={formEdit.dentist_id}
                onChange={(id) => cambiarEdit("dentist_id", id)}
                placeholder="Busca o escribe un doctor..."
                vacioTexto="Ningún doctor con ese nombre"
                onCrear={agregarDoctor}
                crearTexto="Agregar doctor"
                options={(doctores.data ?? [])
                  .filter((d) => d.active)
                  .map((d) => ({
                    id: d.id,
                    label: d.name,
                    ...(d.specialty ? { hint: d.specialty } : {}),
                  }))}
              />
            </Field>
          </FormGrid>

          <Field label="Notas">
            <TextArea
              value={formEdit.notes}
              onChange={(e) => cambiarEdit("notes", e.target.value)}
              placeholder="Motivo de la consulta, observaciones..."
            />
          </Field>

          {actualizar.isError && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-xl bg-danger-soft px-3.5 py-3 text-sm text-danger"
            >
              <TriangleAlert className="mt-px size-4 shrink-0" />
              <span>{actualizar.error.message}</span>
            </p>
          )}
        </form>
      </Modal>

      {/* Detalle de una cita: se abre al tocar la fila en la lista del dia.
          Aqui van todas las acciones, cada una explicada con su nombre —
          nada de iconos sueltos sin decir que hacen. */}
      <Modal open={citaDetalle !== null} onClose={cerrarDetalle} title="Detalle de la cita">
        {citaDetalle && (
          <div className="space-y-4">
            <div>
              <p className="text-lg font-semibold">{nombrePaciente(citaDetalle.patient_id)}</p>
              {citaDetalle.patient_id && (
                <Link
                  to="/pacientes/$id"
                  params={{ id: citaDetalle.patient_id }}
                  onClick={cerrarDetalle}
                  className="text-sm font-medium text-primary transition-colors hover:text-primary-hover"
                >
                  Ver ficha del paciente
                </Link>
              )}
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl bg-muted/50 p-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Fecha</dt>
                <dd className="font-medium">{formatShortDate(citaDetalle.date)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Hora</dt>
                <dd className="font-medium">
                  {citaDetalle.time.slice(0, 5)} · {citaDetalle.duration} min
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Tratamiento</dt>
                <dd className="font-medium">{citaDetalle.treatment || "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Odontólogo</dt>
                <dd className="font-medium">{nombreDoctor(citaDetalle) || "—"}</dd>
              </div>
              {citaDetalle.notes && (
                <div className="col-span-2">
                  <dt className="text-muted-foreground">Notas</dt>
                  <dd className="font-medium">{citaDetalle.notes}</dd>
                </div>
              )}
            </dl>

            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Estado actual:</span>
              <StatusBadge status={citaDetalle.status} />
            </div>

            {/* Acciones, segun en que quedo la cita */}
            <div className="flex flex-col gap-3 border-t border-border pt-4">
              {yaPaso(citaDetalle) &&
              (citaDetalle.status === "pendiente" || citaDetalle.status === "confirmada") ? (
                marcandoNoAsistio === citaDetalle.id ? (
                  <div className="flex flex-col gap-2 rounded-xl bg-muted/60 p-3">
                    <label className="text-xs font-medium text-muted-foreground">
                      ¿Por qué no vino? (opcional)
                    </label>
                    <TextInput
                      value={motivoNoAsistio}
                      onChange={(e) => setMotivoNoAsistio(e.target.value)}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={actualizar.isPending}
                        onClick={() => void confirmarNoAsistio(citaDetalle)}
                      >
                        {actualizar.isPending ? "Guardando..." : "Guardar"}
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={cerrarNoAsistio}>
                        Cancelar
                      </Button>
                    </div>
                    {actualizar.isError && (
                      <p role="alert" className="text-sm text-danger">
                        {actualizar.error.message}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium">
                      Ya pasó el día de esta cita — ¿el paciente asistió?
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={cambiarEstado.isPending}
                        onClick={() => marcarSiAsistio(citaDetalle)}
                      >
                        <Check /> Sí asistió
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => abrirNoAsistio(citaDetalle.id)}
                      >
                        <X /> No asistió
                      </Button>
                    </div>
                  </div>
                )
              ) : (
                <>
                  {citaDetalle.status === "pendiente" && (
                    <Button
                      size="sm"
                      className="self-start"
                      disabled={cambiarEstado.isPending}
                      onClick={() => confirmarCita(citaDetalle)}
                    >
                      <Check /> Confirmar cita
                    </Button>
                  )}
                  {(citaDetalle.status === "confirmada" || citaDetalle.status === "pendiente") && (
                    <BotonWhatsApp
                      telefono={telefonoPaciente(citaDetalle.patient_id)}
                      etiqueta="Enviar recordatorio por WhatsApp"
                      mensaje={mensajeRecordatorio(
                        nombrePaciente(citaDetalle.patient_id),
                        nombreClinica,
                        formatShortDate(citaDetalle.date),
                        citaDetalle.time.slice(0, 5),
                      )}
                    />
                  )}
                  {citaDetalle.status === "no_asistio" && (
                    <BotonWhatsApp
                      telefono={telefonoPaciente(citaDetalle.patient_id)}
                      etiqueta="Escribirle por WhatsApp"
                      mensaje={mensajeNoAsistio(
                        nombrePaciente(citaDetalle.patient_id),
                        nombreClinica,
                        formatShortDate(citaDetalle.date),
                        citaDetalle.time.slice(0, 5),
                      )}
                    />
                  )}
                  {(citaDetalle.status === "confirmada" || citaDetalle.status === "pendiente") &&
                    (confirmarCancelar === citaDetalle.id ? (
                      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-warning-soft px-3 py-2">
                        <span className="text-sm font-medium text-warning">
                          ¿Seguro que quieres cancelar esta cita?
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => confirmarCancelarCita(citaDetalle)}
                        >
                          Sí, cancelar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirmarCancelar(null)}
                        >
                          No
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="self-start"
                        onClick={() => setConfirmarCancelar(citaDetalle.id)}
                      >
                        <X /> Cancelar cita
                      </Button>
                    ))}
                </>
              )}

              <div className="mt-1 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    cerrarDetalle();
                    abrirEditar(citaDetalle);
                  }}
                >
                  <Pencil /> Editar / reagendar
                </Button>
                {confirmarBorrar === citaDetalle.id ? (
                  <div className="flex items-center gap-1.5 rounded-lg bg-danger-soft px-2 py-1">
                    <span className="text-xs font-medium text-danger">
                      ¿Eliminar esta cita del todo?
                    </span>
                    <button
                      onClick={() => void confirmarYBorrar(citaDetalle.id)}
                      disabled={eliminar.isPending}
                      className="rounded-md bg-danger px-2 py-1 text-xs font-semibold text-white"
                    >
                      Sí, eliminar
                    </button>
                    <button
                      onClick={() => setConfirmarBorrar(null)}
                      className="rounded-md px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-danger hover:bg-danger-soft"
                    onClick={() => pedirBorrar(citaDetalle.id)}
                  >
                    <Trash2 /> Eliminar cita
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
