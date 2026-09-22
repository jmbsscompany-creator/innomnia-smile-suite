import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarDays,
  CalendarPlus,
  CircleCheck,
  DollarSign,
  FileText,
  Plus,
  TriangleAlert,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import heroImg from "@/assets/clinic-hero.jpg";
import { useAuth } from "@/lib/auth";
import {
  hoyISO,
  useActividad,
  useCitasDelDia,
  useClinica,
  useCobrosDelDia,
  useCrearCobro,
  usePacientes,
  type NuevoCobro,
} from "@/lib/queries";
import { formatDOP } from "@/lib/format";
import { Button, InitialsAvatar, Pill, Section, StatCard, StatusBadge } from "@/components/app/ui";
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

const title = "Inicio — INNOMNIA Dental";
const description =
  "Resumen del dia: citas, confirmaciones pendientes, seguimiento de pacientes y cobros en RD$.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Index,
});

const DIAS = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
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

/** "martes, 22 de septiembre" — del reloj real, no de una fecha fija. */
function fechaLarga(d: Date) {
  return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

function saludo(d: Date) {
  const h = d.getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

/** Primer nombre, quitando titulos como "Dra." */
function primerNombre(completo: string) {
  const partes = completo
    .trim()
    .split(/\s+/)
    .filter((p) => !/^(dr|dra|drg|od)\.?$/i.test(p));
  return partes[0] ?? completo;
}

const COBRO_VACIO: Omit<NuevoCobro, "date"> = {
  patient_id: null,
  concept: "",
  method: "efectivo",
  amount: 0,
  notes: "",
};

function Index() {
  const { profile, session } = useAuth();
  const hoy = hoyISO();
  const ahora = new Date();

  const pacientes = usePacientes();
  const citas = useCitasDelDia(hoy);
  const cobros = useCobrosDelDia(hoy);
  const actividad = useActividad();
  const clinica = useClinica();
  const crearCobro = useCrearCobro();

  const [cobroAbierto, setCobroAbierto] = useState(false);
  const [formCobro, setFormCobro] = useState(COBRO_VACIO);

  function cambiarCobro<K extends keyof typeof COBRO_VACIO>(
    campo: K,
    valor: (typeof COBRO_VACIO)[K],
  ) {
    setFormCobro((prev) => ({ ...prev, [campo]: valor }));
  }

  function abrirCobro() {
    setFormCobro(COBRO_VACIO);
    crearCobro.reset();
    setCobroAbierto(true);
  }

  function cerrarCobro() {
    setCobroAbierto(false);
    setFormCobro(COBRO_VACIO);
    crearCobro.reset();
  }

  async function guardarCobro(e: FormEvent) {
    e.preventDefault();
    try {
      await crearCobro.mutateAsync({ ...formCobro, date: hoy });
      cerrarCobro();
    } catch {
      // El error se muestra dentro del modal.
    }
  }

  const listaCitas = citas.data ?? [];
  const listaPacientes = pacientes.data ?? [];
  const listaCobros = cobros.data ?? [];

  const porConfirmar = listaCitas.filter((c) => c.status === "pendiente");
  const seguimiento = listaPacientes.filter((p) => p.status === "seguimiento");
  const activos = listaPacientes.filter((p) => p.status === "activo");
  const cobradoHoy = listaCobros.reduce((s, c) => s + Number(c.amount), 0);
  const porCobrar = listaPacientes.reduce((s, p) => s + Number(p.balance), 0);

  const cargando = pacientes.isPending || citas.isPending;
  const fallo = pacientes.isError || citas.isError;

  /**
   * El sistema es de la clinica, no de una persona: saluda con el nombre
   * de la clinica ("Buenos dias, Medent"). Si todavia no lo han puesto en
   * Configuracion, cae al nombre de quien entro para no saludar en seco.
   */
  const nombre =
    clinica.data?.name?.trim() ||
    (profile?.full_name ? primerNombre(profile.full_name) : "") ||
    (session?.user?.email?.split("@")[0] ?? "");

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="surface rise-in relative overflow-hidden">
        <img
          src={heroImg}
          alt=""
          width={1536}
          height={640}
          className="absolute inset-y-0 right-0 h-full w-[70%] object-cover object-right opacity-90 sm:w-[60%] lg:w-[55%]"
        />
        <div className="hero-fade absolute inset-0" />
        <div className="relative flex min-h-[176px] flex-col justify-center px-6 py-7 sm:px-8">
          <h1 className="text-[30px] font-bold leading-tight tracking-tight sm:text-[36px]">
            {saludo(ahora)}
            {nombre ? `, ${nombre}` : ""}
          </h1>
          <p className="mt-2 max-w-[48ch] text-[15px] text-muted-foreground sm:text-base">
            Hoy es {fechaLarga(ahora)}.{" "}
            {cargando ? (
              "Revisando tu agenda..."
            ) : listaCitas.length === 0 ? (
              "No tienes citas agendadas para hoy."
            ) : (
              <>
                Tienes{" "}
                <span className="font-semibold text-foreground">
                  {listaCitas.length} {listaCitas.length === 1 ? "cita" : "citas"}
                </span>
                {porConfirmar.length > 0 && (
                  <>
                    {" "}
                    y{" "}
                    <span className="font-semibold text-foreground">
                      {porConfirmar.length} por confirmar
                    </span>
                  </>
                )}
                .
              </>
            )}
          </p>
        </div>
      </section>

      {fallo && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          <TriangleAlert className="mt-px size-4 shrink-0" />
          <span>No se pudieron cargar algunos datos. Revisa tu conexion y recarga la pagina.</span>
        </p>
      )}

      {/* Cifras: todas salen de la base */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          icon={CalendarDays}
          label="Citas de hoy"
          value={cargando ? "—" : String(listaCitas.length)}
          hint={
            porConfirmar.length > 0 ? `${porConfirmar.length} por confirmar` : "Todo confirmado"
          }
        />
        <StatCard
          icon={Users}
          label="Pacientes totales"
          value={pacientes.isPending ? "—" : String(listaPacientes.length)}
          hint={seguimiento.length > 0 ? `${seguimiento.length} en seguimiento` : "Al dia"}
        />
        <StatCard
          icon={DollarSign}
          label="Cobrado hoy"
          value={cobros.isPending ? "—" : formatDOP(cobradoHoy)}
          hint={porCobrar > 0 ? `${formatDOP(porCobrar)} por cobrar` : "Sin saldos pendientes"}
          {...(porCobrar === 0 ? { hintTone: "success" as const } : {})}
        />
        <StatCard
          icon={CircleCheck}
          label="Pacientes activos"
          value={pacientes.isPending ? "—" : String(activos.length)}
          hint="Con tratamiento en curso"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* Agenda */}
        <Section title="Agenda de hoy" link="/citas" linkLabel="Ver agenda completa">
          {citas.isPending ? (
            <ul className="space-y-3" aria-hidden>
              {[0, 1, 2].map((i) => (
                <li key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
              ))}
            </ul>
          ) : listaCitas.length === 0 ? (
            <div className="px-2 py-8 text-center">
              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
                <CalendarDays className="size-6" strokeWidth={1.6} />
              </span>
              <p className="mt-3 font-semibold">La agenda de hoy esta vacia</p>
              <p className="mx-auto mt-1 max-w-[40ch] text-sm text-muted-foreground">
                Buen momento para llamar a los pacientes que estan en seguimiento.
              </p>
            </div>
          ) : (
            <ol className="relative">
              {listaCitas.map((a, i) => {
                const enConsulta = a.status === "en-consulta";
                return (
                  <li
                    key={a.id}
                    className={cn(
                      "grid grid-cols-[52px_20px_minmax(0,1fr)_auto] items-center gap-x-2 py-3.5 sm:gap-x-3",
                      i !== listaCitas.length - 1 && "border-b border-border",
                    )}
                  >
                    <span className="text-sm font-medium tabular-nums text-muted-foreground">
                      {a.time.slice(0, 5)}
                    </span>
                    <span className="relative flex h-full items-center justify-center self-stretch">
                      <span className="absolute inset-y-[-14px] w-px bg-border-strong" />
                      <span
                        className={cn(
                          "relative size-2.5 rounded-full ring-4 ring-card",
                          enConsulta
                            ? "pulse-dot bg-primary"
                            : a.status === "completada"
                              ? "bg-border-strong"
                              : "bg-primary",
                        )}
                      />
                    </span>
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-semibold">
                          {a.treatment || "Cita"}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                          {a.dentist || "Sin odontologo asignado"}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={a.status} />
                  </li>
                );
              })}
            </ol>
          )}
          <Button size="lg" className="mt-5 w-full" disabled>
            <Plus /> Nueva cita
          </Button>
        </Section>

        <div className="space-y-6">
          {/* Seguimiento */}
          <Section title="Pacientes que necesitan seguimiento" link="/pacientes">
            {pacientes.isPending ? (
              <ul className="space-y-3" aria-hidden>
                {[0, 1].map((i) => (
                  <li key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
                ))}
              </ul>
            ) : seguimiento.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nadie pendiente de seguimiento ahora mismo.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {seguimiento.slice(0, 5).map((p) => (
                  <li
                    key={p.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <InitialsAvatar name={p.name} />
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-semibold">{p.name}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {p.treatment || "Sin tratamiento registrado"}
                        </p>
                      </div>
                    </div>
                    {p.balance > 0 && <Pill tone="warning">{formatDOP(p.balance)}</Pill>}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Cobros */}
          <Section title="Cobros de hoy">
            <div className="flex items-end justify-between gap-4 rounded-xl bg-primary-soft/60 p-4">
              <div>
                <p className="text-sm text-primary-soft-foreground">Total cobrado</p>
                <p className="mt-1 text-[30px] font-bold leading-none tracking-tight text-primary-soft-foreground">
                  {cobros.isPending ? "—" : formatDOP(cobradoHoy)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Por cobrar</p>
                <p className="mt-1 text-lg font-semibold">
                  {pacientes.isPending ? "—" : formatDOP(porCobrar)}
                </p>
              </div>
            </div>
            {!cobros.isPending && listaCobros.length === 0 ? (
              <p className="py-5 text-center text-sm text-muted-foreground">
                Todavia no se ha registrado ningun cobro hoy.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-border">
                {listaCobros.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-success-soft text-success">
                        <Wallet className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-medium">{c.concept || "Cobro"}</p>
                        <p className="truncate text-sm capitalize text-muted-foreground">
                          {c.method}
                        </p>
                      </div>
                    </div>
                    <span className="font-semibold tabular-nums">
                      {formatDOP(Number(c.amount))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Button
              variant="soft"
              size="lg"
              className="mt-4 w-full"
              disabled={listaPacientes.length === 0}
              onClick={abrirCobro}
            >
              <Wallet />{" "}
              {listaPacientes.length === 0 ? "Registra un paciente primero" : "Registrar cobro"}
            </Button>
          </Section>
        </div>
      </div>

      {/* Actividad */}
      <Section title="Actividad reciente">
        {actividad.isPending ? (
          <ul className="space-y-3" aria-hidden>
            {[0, 1].map((i) => (
              <li key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
            ))}
          </ul>
        ) : (actividad.data?.length ?? 0) === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aqui va a aparecer lo que pase en la clinica: citas agendadas, pagos y pacientes nuevos.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {(actividad.data ?? []).map((r) => {
              const Icon =
                r.kind === "cita"
                  ? CalendarDays
                  : r.kind === "pago"
                    ? DollarSign
                    : r.kind === "tratamiento"
                      ? FileText
                      : Users;
              return (
                <li
                  key={r.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="icon-tile size-10 shrink-0">
                      <Icon className="size-[18px]" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-medium">{r.title}</p>
                      <p className="truncate text-sm text-muted-foreground">{r.detail}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {/* Accesos rapidos */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            icon: CalendarPlus,
            title: "Agenda una cita",
            sub: "Organiza el dia de la clinica",
            to: "/citas" as const,
          },
          {
            icon: UserPlus,
            title: "Registra un paciente",
            sub: "Su expediente empieza aqui",
            to: "/pacientes" as const,
          },
          {
            icon: FileText,
            title: "Revisa tus precios",
            sub: "Servicios y tarifas en RD$",
            to: "/servicios" as const,
          },
        ].map((q) => (
          <Link
            key={q.title}
            to={q.to}
            className="surface group flex items-center gap-4 p-5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-float"
          >
            <span className="icon-tile size-14 shrink-0">
              <q.icon className="size-6" strokeWidth={1.6} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold leading-snug">{q.title}</span>
              <span className="mt-0.5 block text-sm text-muted-foreground">{q.sub}</span>
            </span>
          </Link>
        ))}
      </div>

      {/* Registrar un cobro */}
      <Modal
        open={cobroAbierto}
        onClose={cerrarCobro}
        title="Registrar cobro"
        description="Esto anota que el paciente pago. No procesa tarjetas ni mueve dinero."
        footer={
          <ModalActions
            onCancel={cerrarCobro}
            formId="form-cobro"
            disabled={crearCobro.isPending}
            submitLabel={crearCobro.isPending ? "Guardando..." : "Registrar cobro"}
          />
        }
      >
        <form id="form-cobro" onSubmit={guardarCobro} className="space-y-4">
          <Field label="Paciente">
            <Buscador
              value={formCobro.patient_id}
              onChange={(id) => cambiarCobro("patient_id", id)}
              placeholder="Escribe el nombre del paciente..."
              vacioTexto="Ningun paciente con ese nombre"
              required
              options={listaPacientes.map((p) => ({
                id: p.id,
                label: p.name,
                ...(Number(p.balance) > 0 ? { hint: `debe ${formatDOP(Number(p.balance))}` } : {}),
              }))}
            />
          </Field>

          <FormGrid>
            <Field label="Monto en RD$">
              <TextInput
                type="number"
                min={1}
                step={100}
                value={String(formCobro.amount)}
                onChange={(e) => cambiarCobro("amount", Number(e.target.value))}
                required
              />
            </Field>
            <Field label="Forma de pago">
              <SelectInput
                value={formCobro.method}
                onChange={(e) => cambiarCobro("method", e.target.value as NuevoCobro["method"])}
              >
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="transferencia">Transferencia</option>
                <option value="seguro">Seguro</option>
              </SelectInput>
            </Field>
          </FormGrid>

          <Field label="Concepto" hint="Por que esta pagando.">
            <TextInput
              value={formCobro.concept}
              onChange={(e) => cambiarCobro("concept", e.target.value)}
              placeholder="Limpieza dental"
            />
          </Field>

          <Field label="Notas">
            <TextArea
              value={formCobro.notes}
              onChange={(e) => cambiarCobro("notes", e.target.value)}
              placeholder="Abono parcial, numero de recibo, etc."
            />
          </Field>

          <p className="rounded-xl bg-primary-soft/50 px-3.5 py-3 text-sm text-muted-foreground">
            Al guardar, el monto se le descuenta del saldo pendiente al paciente.
          </p>

          {crearCobro.isError && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-xl bg-danger-soft px-3.5 py-3 text-sm text-danger"
            >
              <TriangleAlert className="mt-px size-4 shrink-0" />
              <span>{crearCobro.error.message}</span>
            </p>
          )}
        </form>
      </Modal>
    </div>
  );
}
