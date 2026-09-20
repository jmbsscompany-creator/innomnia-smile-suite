import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Clock, Plus, Stethoscope } from "lucide-react";
import { useMemo, useState } from "react";
import { appointments } from "@/lib/demo-data";
import { Button, EmptyState, InitialsAvatar, PageHeader, Section, StatusBadge } from "@/components/app/ui";
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

// Demo week starting Sat 19 Sep 2026
const days = [
  { offset: 0, dow: "Sáb", num: 19 },
  { offset: 1, dow: "Dom", num: 20 },
  { offset: 2, dow: "Lun", num: 21 },
  { offset: 3, dow: "Mar", num: 22 },
  { offset: 4, dow: "Mié", num: 23 },
  { offset: 5, dow: "Jue", num: 24 },
  { offset: 6, dow: "Vie", num: 25 },
];
const dayNames = ["sábado", "domingo", "lunes", "martes", "miércoles", "jueves", "viernes"];
const hours = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

function toMin(t: string) {
  const [h = 0, m = 0] = t.split(":").map(Number);
  return h * 60 + m;
}

function AppointmentsPage() {
  const [selected, setSelected] = useState(0);
  const [view, setView] = useState<"dia" | "semana">("dia");

  const dayAppts = useMemo(
    () => appointments.filter((a) => a.dayOffset === selected).sort((a, b) => toMin(a.time) - toMin(b.time)),
    [selected],
  );
  const totalMinutes = dayAppts.reduce((s, a) => s + a.duration, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agenda"
        subtitle="Semana del 19 al 25 de septiembre de 2026"
        actions={
          <>
            <div className="hidden rounded-xl border border-border-strong bg-card p-1 sm:flex">
              {(["dia", "semana"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    "h-8 rounded-lg px-3.5 text-sm font-medium capitalize transition-colors",
                    view === v ? "bg-primary-soft text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {v === "dia" ? "Día" : "Semana"}
                </button>
              ))}
            </div>
            <Button>
              <Plus /> <span className="hidden sm:inline">Nueva cita</span>
              <span className="sm:hidden">Nueva</span>
            </Button>
          </>
        }
      />

      {/* Week strip */}
      <div className="surface flex items-center gap-2 p-3">
        <button className="grid size-10 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted" aria-label="Semana anterior">
          <ChevronLeft className="size-5" />
        </button>
        <div className="grid flex-1 grid-cols-7 gap-1.5">
          {days.map((d) => {
            const count = appointments.filter((a) => a.dayOffset === d.offset).length;
            const active = selected === d.offset;
            return (
              <button
                key={d.offset}
                onClick={() => {
                  setSelected(d.offset);
                  setView("dia");
                }}
                className={cn(
                  "flex flex-col items-center rounded-xl py-2.5 transition-colors",
                  active ? "bg-primary text-primary-foreground shadow-primary" : "hover:bg-primary-soft",
                )}
              >
                <span className={cn("text-[11px] font-medium uppercase tracking-wide", active ? "text-primary-foreground/80" : "text-muted-foreground")}>
                  {d.dow}
                </span>
                <span className="mt-0.5 text-lg font-bold leading-none">{d.num}</span>
                <span className="mt-1.5 flex h-1.5 gap-0.5">
                  {Array.from({ length: Math.min(count, 4) }).map((_, i) => (
                    <span key={i} className={cn("size-1.5 rounded-full", active ? "bg-primary-foreground/80" : "bg-primary")} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
        <button className="grid size-10 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted" aria-label="Semana siguiente">
          <ChevronRight className="size-5" />
        </button>
      </div>

      {view === "semana" ? (
        <Section padded={false}>
          <div className="overflow-x-auto">
            <div className="grid min-w-[880px] grid-cols-[64px_repeat(7,minmax(0,1fr))]">
              <div className="border-b border-border" />
              {days.map((d) => (
                <div key={d.offset} className="border-b border-l border-border px-3 py-3 text-center">
                  <span className="text-xs font-medium uppercase text-muted-foreground">{d.dow}</span>
                  <span className={cn("mx-auto mt-1 grid size-8 place-items-center rounded-full text-sm font-bold", d.offset === 0 && "bg-primary text-primary-foreground")}>
                    {d.num}
                  </span>
                </div>
              ))}
              {hours.map((h) => (
                <div key={h} className="contents">
                  <div className="h-16 border-b border-border px-2 pt-1 text-right text-xs tabular-nums text-muted-foreground">{h}</div>
                  {days.map((d) => {
                    const items = appointments.filter((a) => a.dayOffset === d.offset && a.time.slice(0, 2) === h.slice(0, 2));
                    return (
                      <div key={d.offset} className="relative h-16 border-b border-l border-border p-1">
                        {items.map((a) => (
                          <button
                            key={a.id}
                            onClick={() => {
                              setSelected(d.offset);
                              setView("dia");
                            }}
                            className={cn(
                              "block w-full truncate rounded-md border-l-2 px-2 py-1 text-left text-xs font-medium",
                              a.status === "pendiente"
                                ? "border-warning bg-warning-soft text-warning"
                                : a.status === "completada"
                                  ? "border-border-strong bg-muted text-muted-foreground"
                                  : "border-primary bg-primary-soft text-primary-soft-foreground",
                            )}
                          >
                            {a.time} {a.patientName}
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
          <Section title={`${dayNames[selected][0].toUpperCase()}${dayNames[selected].slice(1)} ${days[selected].num} de septiembre`}>
            {dayAppts.length === 0 ? (
              <EmptyState title="Sin citas este día" hint="Un buen momento para llamar a los pacientes en seguimiento." />
            ) : (
              <ol className="divide-y divide-border">
                {dayAppts.map((a) => (
                  <li key={a.id} className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 py-4 sm:grid-cols-[72px_minmax(0,1fr)_auto]">
                    <div>
                      <p className="text-[15px] font-semibold tabular-nums">{a.time}</p>
                      <p className="text-xs text-muted-foreground">{a.duration} min</p>
                    </div>
                    <div className="flex min-w-0 items-center gap-3 border-l border-border-strong pl-4">
                      <InitialsAvatar name={a.patientName} className="hidden sm:grid" />
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-semibold">{a.patientName}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {a.treatment} · {a.dentist}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={a.status} />
                  </li>
                ))}
              </ol>
            )}
          </Section>

          <div className="space-y-6">
            <Section title="Resumen del día">
              <dl className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-primary-soft/60 p-4">
                  <dt className="text-sm text-muted-foreground">Citas</dt>
                  <dd className="mt-1 text-2xl font-bold">{dayAppts.length}</dd>
                </div>
                <div className="rounded-xl bg-primary-soft/60 p-4">
                  <dt className="text-sm text-muted-foreground">Horas ocupadas</dt>
                  <dd className="mt-1 text-2xl font-bold">
                    {Math.floor(totalMinutes / 60)}
                    <span className="text-base font-medium text-muted-foreground"> h {totalMinutes % 60} min</span>
                  </dd>
                </div>
              </dl>
              <ul className="mt-4 space-y-2 text-sm">
                <li className="flex items-center justify-between">
                  <span className="text-muted-foreground">Confirmadas</span>
                  <span className="font-semibold">{dayAppts.filter((a) => a.status === "confirmada").length}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-muted-foreground">Pendientes</span>
                  <span className="font-semibold text-warning">{dayAppts.filter((a) => a.status === "pendiente").length}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-muted-foreground">Completadas</span>
                  <span className="font-semibold">{dayAppts.filter((a) => a.status === "completada").length}</span>
                </li>
              </ul>
            </Section>

            <Section title="Disponibilidad">
              <div className="flex flex-wrap gap-2">
                {hours.map((h) => {
                  const busy = dayAppts.some((a) => a.time.slice(0, 2) === h.slice(0, 2));
                  return (
                    <span
                      key={h}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm tabular-nums",
                        busy ? "border-border bg-muted text-muted-foreground line-through" : "border-primary/30 bg-primary-soft/50 text-primary",
                      )}
                    >
                      <Clock className="size-3.5" /> {h}
                    </span>
                  );
                })}
              </div>
              <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Stethoscope className="size-4" /> Dra. Reyes y Dr. Peña en consulta
              </p>
            </Section>
          </div>
        </div>
      )}
    </div>
  );
}
