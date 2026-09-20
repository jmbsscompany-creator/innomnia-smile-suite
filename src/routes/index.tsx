import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronRight,
  CircleCheck,
  DollarSign,
  FileText,
  Plus,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import heroImg from "@/assets/clinic-hero.jpg";
import {
  appointments,
  clinic,
  followUps,
  patients,
  paymentsToday,
  recentActivity,
} from "@/lib/demo-data";
import { formatDOP } from "@/lib/format";
import { Button, InitialsAvatar, Pill, Section, StatCard, StatusBadge } from "@/components/app/ui";
import { cn } from "@/lib/utils";

const title = "Inicio — INNOMNIA Dental";
const description =
  "Resumen del día: citas, confirmaciones pendientes, seguimiento de pacientes y cobros en RD$.";

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

const today = appointments.filter((a) => a.dayOffset === 0);
const pending = today.filter((a) => a.status === "pendiente");
const collected = paymentsToday.reduce((s, p) => s + p.amount, 0);
const outstanding = today
  .filter((a) => a.status !== "completada")
  .map((a) => patients.find((p) => p.id === a.patientId)?.balance ?? 0)
  .reduce((s, b) => s + b, 0);

function Index() {
  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="surface relative overflow-hidden rise-in">
        <img
          src={heroImg}
          alt=""
          width={1536}
          height={640}
          className="absolute inset-y-0 right-0 h-full w-[70%] object-cover object-right opacity-90 sm:w-[60%] lg:w-[55%]"
        />
        <div className="absolute inset-0 hero-fade" />
        <div className="relative flex min-h-[176px] flex-col justify-center px-6 py-7 sm:px-8">
          <h1 className="text-[30px] font-bold leading-tight tracking-tight sm:text-[36px]">
            Buenos días, {clinic.dentistShort}
          </h1>
          <p className="mt-2 max-w-[48ch] text-[15px] text-muted-foreground sm:text-base">
            Hoy es sábado, 19 de septiembre. Tienes{" "}
            <span className="font-semibold text-foreground">{today.length} citas</span> programadas
            y{" "}
            <span className="font-semibold text-foreground">{pending.length} por confirmar</span>.
          </p>
          <p className="mt-4 hidden text-sm font-medium leading-snug text-primary md:block lg:absolute lg:right-8 lg:top-7 lg:mt-0 lg:max-w-[130px]">
            Sonrisas más sanas, vidas más felices
            <span className="mt-2 block h-0.5 w-6 rounded bg-primary" />
          </p>
        </div>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          icon={CalendarDays}
          label="Citas de hoy"
          value={String(today.length)}
          hint={`${pending.length} pendientes`}
        />
        <StatCard
          icon={Users}
          label="Pacientes totales"
          value="124"
          hint="+3 este mes"
          hintTone="success"
        />
        <StatCard
          icon={DollarSign}
          label="Cobrado hoy"
          value={formatDOP(collected)}
          hint="+12% vs. ayer"
          hintTone="success"
        />
        <StatCard icon={CircleCheck} label="Tratamientos en curso" value="18" hint="4 finalizan esta semana" />
      </div>

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* Agenda */}
        <Section title="Agenda de hoy" link="/citas" linkLabel="Ver agenda completa">
          <ol className="relative">
            {today.map((a, i) => {
              const live = a.status === "en-consulta";
              return (
                <li
                  key={a.id}
                  className={cn(
                    "grid grid-cols-[52px_20px_minmax(0,1fr)_auto] items-center gap-x-2 py-3.5 sm:gap-x-3",
                    i !== today.length - 1 && "border-b border-border",
                  )}
                >
                  <span className="text-sm font-medium tabular-nums text-muted-foreground">
                    {a.time}
                  </span>
                  <span className="relative flex h-full items-center justify-center self-stretch">
                    <span className="absolute inset-y-[-14px] w-px bg-border-strong" />
                    <span
                      className={cn(
                        "relative size-2.5 rounded-full ring-4 ring-card",
                        live ? "bg-primary pulse-dot" : a.status === "completada" ? "bg-border-strong" : "bg-primary",
                      )}
                    />
                  </span>
                  <div className="flex min-w-0 items-center gap-3">
                    <InitialsAvatar name={a.patientName} size="md" className="hidden sm:grid" />
                    <div className="min-w-0">
                      <Link
                        to="/pacientes"
                        className="block truncate text-[15px] font-semibold hover:text-primary"
                      >
                        {a.patientName}
                      </Link>
                      <p className="truncate text-sm text-muted-foreground">{a.treatment}</p>
                    </div>
                  </div>
                  <StatusBadge status={a.status} />
                </li>
              );
            })}
          </ol>
          <Button size="lg" className="mt-5 w-full">
            <Plus /> Nueva cita
          </Button>
        </Section>

        <div className="space-y-6">
          {/* Pending confirmations */}
          <Section title="Pendientes de confirmar">
            <ul className="divide-y divide-border">
              {pending.map((a) => (
                <li key={a.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <InitialsAvatar name={a.patientName} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold">{a.patientName}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {a.treatment} · hoy {a.time}
                      </p>
                    </div>
                  </div>
                  <Button variant="soft" size="sm">
                    <Check /> Confirmar
                  </Button>
                </li>
              ))}
            </ul>
          </Section>

          {/* Follow-up */}
          <Section title="Pacientes que necesitan seguimiento" link="/pacientes">
            <ul className="divide-y divide-border">
              {followUps.map((f) => (
                <li key={f.patientId} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <InitialsAvatar name={f.name} />
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold">{f.name}</p>
                      <p className="truncate text-sm text-muted-foreground">{f.reason}</p>
                    </div>
                  </div>
                  <Pill tone={f.urgency === "high" ? "danger" : "warning"}>{f.since}</Pill>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        {/* Collections */}
        <Section title="Cobros de hoy">
          <div className="flex items-end justify-between gap-4 rounded-xl bg-primary-soft/60 p-4">
            <div>
              <p className="text-sm text-primary-soft-foreground">Total cobrado</p>
              <p className="mt-1 text-[30px] font-bold leading-none tracking-tight text-primary-soft-foreground">
                {formatDOP(collected)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Por cobrar hoy</p>
              <p className="mt-1 text-lg font-semibold">{formatDOP(outstanding)}</p>
            </div>
          </div>
          <ul className="mt-2 divide-y divide-border">
            {paymentsToday.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-success-soft text-success">
                    <Wallet className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-medium">{p.patient}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {p.concept} · {p.method}
                    </p>
                  </div>
                </div>
                <span className="font-semibold tabular-nums">{formatDOP(p.amount)}</span>
              </li>
            ))}
          </ul>
        </Section>

        {/* Activity */}
        <Section title="Actividad reciente">
          <ul className="divide-y divide-border">
            {recentActivity.map((r) => {
              const Icon =
                r.kind === "cita"
                  ? CalendarDays
                  : r.kind === "pago"
                    ? DollarSign
                    : r.kind === "tratamiento"
                      ? FileText
                      : Users;
              return (
                <li key={r.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="icon-tile size-10 shrink-0">
                      <Icon className="size-[18px]" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-medium">{r.title}</p>
                      <p className="truncate text-sm text-muted-foreground">{r.detail}</p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">{r.when}</span>
                </li>
              );
            })}
          </ul>
        </Section>
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { icon: CalendarPlus, title: "¿Tienes un paciente de emergencia?", sub: "Agrega una cita rápidamente", to: "/citas" as const },
          { icon: UserPlus, title: "Registra un nuevo paciente", sub: "Haz crecer tu clínica", to: "/pacientes" as const },
          { icon: FileText, title: "Crea un plan de tratamiento", sub: "Organiza y da seguimiento", to: "/servicios" as const },
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
            <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
          </Link>
        ))}
      </div>
    </div>
  );
}
