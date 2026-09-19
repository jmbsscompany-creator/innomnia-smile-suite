import { createFileRoute } from "@tanstack/react-router";
import { clinic } from "@/lib/demo-data";
import { Button, PageHeader, Section } from "@/components/app/ui";

const title = "Configuración — INNOMNIA Dental";
const description = "Datos de la clínica, horarios de atención y preferencias.";

export const Route = createFileRoute("/configuracion")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: SettingsPage,
});

function Field({ label, value, type = "text" }: { label: string; value: string; type?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      <input
        type={type}
        defaultValue={value}
        className="h-11 w-full rounded-xl border border-input bg-card px-3.5 text-[15px] outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-ring/30"
      />
    </label>
  );
}

function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Configuración" subtitle="Información general de tu clínica" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Section title="Datos de la clínica">
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
            <Field label="Nombre de la clínica" value={clinic.name} />
            <Field label="Odontólogo principal" value={clinic.dentist} />
            <Field label="Teléfono" value="809-555-0100" type="tel" />
            <Field label="Correo" value="contacto@innomniadental.do" type="email" />
            <div className="sm:col-span-2">
              <Field label="Dirección" value="Av. Winston Churchill 45, Piantini, Santo Domingo" />
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit">Guardar cambios</Button>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </div>
          </form>
        </Section>
        <Section title="Horario de atención">
          <ul className="divide-y divide-border text-[15px]">
            {[
              ["Lunes – Viernes", "8:00 a. m. – 6:00 p. m."],
              ["Sábado", "9:00 a. m. – 1:00 p. m."],
              ["Domingo", "Cerrado"],
            ].map(([d, h]) => (
              <li key={d} className="flex items-center justify-between py-3">
                <span className="font-medium">{d}</span>
                <span className="text-muted-foreground">{h}</span>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </div>
  );
}
