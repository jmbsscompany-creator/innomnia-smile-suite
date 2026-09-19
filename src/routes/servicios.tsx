import { createFileRoute } from "@tanstack/react-router";
import { Clock, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { serviceCategories, services } from "@/lib/demo-data";
import { formatDOP } from "@/lib/format";
import { Button, PageHeader, Section } from "@/components/app/ui";
import { cn } from "@/lib/utils";

const title = "Servicios y precios — INNOMNIA Dental";
const description = "Catálogo de tratamientos de la clínica con duración y precios en pesos dominicanos.";

export const Route = createFileRoute("/servicios")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: ServicesPage,
});

function ServicesPage() {
  const [cat, setCat] = useState<string>("Todos");
  const visible = cat === "Todos" ? serviceCategories : [cat];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Servicios y Precios"
        subtitle={`${services.length} tratamientos · precios en pesos dominicanos (RD$)`}
        actions={
          <Button>
            <Plus /> <span className="hidden sm:inline">Nuevo servicio</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        }
      />

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {["Todos", ...serviceCategories].map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={cn(
              "h-9 shrink-0 rounded-lg border px-3.5 text-sm font-medium transition-colors",
              cat === c
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border-strong bg-card text-muted-foreground hover:border-primary/40 hover:text-primary",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {visible.map((c) => {
          const items = services.filter((s) => s.category === c);
          return (
            <Section key={c} title={c} padded={false}>
              <ul className="divide-y divide-border">
                {items.map((s) => (
                  <li key={s.id} className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-4 transition-colors hover:bg-primary-soft/30 sm:px-6">
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold">{s.name}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{s.description}</p>
                      <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <Clock className="size-3.5" /> {s.duration} min
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[17px] font-bold tabular-nums tracking-tight">{formatDOP(s.price)}</span>
                      <button
                        aria-label={`Editar ${s.name}`}
                        className="grid size-9 place-items-center rounded-lg text-muted-foreground opacity-0 transition-all hover:bg-primary-soft hover:text-primary group-hover:opacity-100 focus-visible:opacity-100"
                      >
                        <Pencil className="size-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          );
        })}
      </div>
    </div>
  );
}
