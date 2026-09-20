import { createFileRoute } from "@tanstack/react-router";
import { Phone, Search, SlidersHorizontal, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { patients, type Patient } from "@/lib/demo-data";
import { formatDOP } from "@/lib/format";
import { Button, EmptyState, InitialsAvatar, PageHeader, Pill } from "@/components/app/ui";
import { cn } from "@/lib/utils";

const title = "Pacientes — INNOMNIA Dental";
const description = "Expedientes de pacientes, próximas visitas, saldos y seguimiento.";

export const Route = createFileRoute("/pacientes")({
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

type Filter = "todos" | Patient["status"];
const filters: { key: Filter; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "activo", label: "Activos" },
  { key: "seguimiento", label: "Seguimiento" },
  { key: "nuevo", label: "Nuevos" },
];

const statusTone = { activo: "success", seguimiento: "warning", nuevo: "info" } as const;
const statusText = { activo: "Activo", seguimiento: "Seguimiento", nuevo: "Nuevo" } as const;

function fmtDate(d: string | null) {
  if (!d) return "—";
  const [y = 0, m = 1, day = 1] = d.split("-").map(Number);
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${day} ${months[m - 1] ?? ""} ${y}`;
}

function PatientsPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");

  const list = useMemo(
    () =>
      patients.filter(
        (p) =>
          (filter === "todos" || p.status === filter) &&
          (q.trim() === "" ||
            p.name.toLowerCase().includes(q.toLowerCase()) ||
            p.phone.includes(q) ||
            p.treatment.toLowerCase().includes(q.toLowerCase())),
      ),
    [q, filter],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pacientes"
        subtitle={`${patients.length} pacientes registrados · ${patients.filter((p) => p.status === "seguimiento").length} requieren seguimiento`}
        actions={
          <Button>
            <UserPlus /> <span className="hidden sm:inline">Nuevo paciente</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        }
      />

      <div className="surface p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative flex h-11 flex-1 items-center rounded-xl border border-input bg-card px-3.5 text-muted-foreground focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-ring/30">
            <Search className="size-[18px]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre, teléfono o tratamiento"
              className="ml-2.5 w-full bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
            />
          </label>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "h-9 shrink-0 rounded-lg px-3.5 text-sm font-medium transition-colors",
                  filter === f.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-primary-soft hover:text-primary",
                )}
              >
                {f.label}
              </button>
            ))}
            <Button variant="outline" size="icon" className="ml-1 shrink-0" aria-label="Filtros">
              <SlidersHorizontal />
            </Button>
          </div>
        </div>

        {list.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="Sin resultados" hint="Prueba con otro nombre o filtro." />
          </div>
        ) : (
          <>
            {/* Table (tablet+) */}
            <div className="mt-4 hidden overflow-hidden rounded-xl border border-border md:block">
              <table className="w-full text-[15px]">
                <thead className="bg-muted/60 text-left text-[13px] font-medium uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">Paciente</th>
                    <th className="px-4 py-3 font-medium">Contacto</th>
                    <th className="px-4 py-3 font-medium">Última visita</th>
                    <th className="px-4 py-3 font-medium">Próxima cita</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-5 py-3 text-right font-medium">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {list.map((p) => (
                    <tr key={p.id} className="transition-colors hover:bg-primary-soft/40">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <InitialsAvatar name={p.name} size="sm" className="size-10 text-sm" />
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{p.name}</p>
                            <p className="truncate text-sm text-muted-foreground">
                              {p.age} años · {p.treatment}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                          <Phone className="size-3.5" /> {p.phone}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-muted-foreground">{fmtDate(p.lastVisit)}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">{fmtDate(p.nextVisit)}</td>
                      <td className="px-4 py-3.5">
                        <Pill tone={statusTone[p.status]}>{statusText[p.status]}</Pill>
                      </td>
                      <td className={cn("px-5 py-3.5 text-right font-semibold tabular-nums whitespace-nowrap", p.balance > 0 ? "text-warning" : "text-muted-foreground")}>
                        {p.balance > 0 ? formatDOP(p.balance) : "Al día"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards (mobile) */}
            <ul className="mt-4 divide-y divide-border md:hidden">
              {list.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-3.5">
                  <InitialsAvatar name={p.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{p.name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {p.treatment} · próx. {fmtDate(p.nextVisit)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <Pill tone={statusTone[p.status]}>{statusText[p.status]}</Pill>
                    <p className={cn("mt-1 text-sm font-semibold", p.balance > 0 ? "text-warning" : "text-muted-foreground")}>
                      {p.balance > 0 ? formatDOP(p.balance) : "Al día"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
