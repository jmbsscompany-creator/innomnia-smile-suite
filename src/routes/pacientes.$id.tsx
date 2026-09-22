import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  FileText,
  Phone,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import type { Patient } from "@/lib/database.types";
import {
  useActualizarPaciente,
  useCitasDePaciente,
  useCobrosDePaciente,
  useOdontograma,
  usePaciente,
  useRegistrarDiente,
} from "@/lib/queries";
import { type Cara, type Estado } from "@/lib/odontograma";
import {
  LeyendaOdontograma,
  Odontograma,
  clave,
  type MapaEstados,
} from "@/components/app/Odontograma";
import { edadDesde, formatDOP } from "@/lib/format";
import { formatShortDate } from "@/lib/dates";
import { Button, InitialsAvatar, Pill, Section, StatusBadge } from "@/components/app/ui";
import { Field, FormGrid, SelectInput, TextArea, TextInput } from "@/components/app/form";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pacientes/$id")({
  head: () => ({
    meta: [
      { title: "Ficha del paciente — INNOMNIA Dental" },
      { name: "description", content: "Expediente completo del paciente." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FichaPaciente,
});

type Pestana = "ficha" | "odontograma" | "historial";

const tonoEstado = { activo: "success", seguimiento: "warning", nuevo: "info" } as const;
const textoEstado = { activo: "Activo", seguimiento: "Seguimiento", nuevo: "Nuevo" } as const;

function FichaPaciente() {
  const { id } = Route.useParams();
  const paciente = usePaciente(id);
  const citas = useCitasDePaciente(id);
  const cobros = useCobrosDePaciente(id);
  const odontograma = useOdontograma(id);
  const guardar = useActualizarPaciente();
  const registrar = useRegistrarDiente();

  const [pestana, setPestana] = useState<Pestana>("ficha");
  const [form, setForm] = useState<Partial<Patient>>({});
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    if (paciente.data) setForm(paciente.data);
  }, [paciente.data]);

  // Lo que viene de la base, convertido al formato que entiende el dibujo.
  const estados: MapaEstados = {};
  for (const e of odontograma.data ?? []) {
    estados[clave(e.tooth, e.surface as Cara)] = e.condition as Estado;
  }

  function cambiar<K extends keyof Patient>(campo: K, valor: Patient[K]) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    setGuardado(false);
  }

  async function guardarFicha(e: FormEvent) {
    e.preventDefault();
    setGuardado(false);
    try {
      await guardar.mutateAsync({ id, cambios: form });
      await paciente.refetch();
      setGuardado(true);
    } catch {
      // El error se muestra abajo.
    }
  }

  function pintar(diente: string, cara: Cara, estado: Estado) {
    registrar.mutate({
      patient_id: id,
      tooth: diente,
      surface: cara,
      condition: estado,
    });
  }

  if (paciente.isPending) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-2xl bg-muted" aria-hidden />
        <div className="h-64 animate-pulse rounded-2xl bg-muted" aria-hidden />
      </div>
    );
  }

  if (paciente.isError || !paciente.data) {
    return (
      <div className="space-y-6">
        <Link to="/pacientes">
          <Button variant="outline">
            <ArrowLeft /> Volver a Pacientes
          </Button>
        </Link>
        <div className="rounded-xl bg-danger-soft px-4 py-8 text-center">
          <TriangleAlert className="mx-auto size-6 text-danger" />
          <p className="mt-2 font-semibold text-danger">No se encontro este paciente</p>
          <p className="mt-1 text-sm text-danger/80">
            {paciente.error?.message ?? "Puede que lo hayan borrado."}
          </p>
        </div>
      </div>
    );
  }

  const p = paciente.data;
  const edad = edadDesde(p.birth_date);
  const listaCitas = citas.data ?? [];
  const listaCobros = cobros.data ?? [];
  const totalCobrado = listaCobros.reduce((s, c) => s + Number(c.amount), 0);

  const pestanas: { key: Pestana; label: string; icono: typeof FileText }[] = [
    { key: "ficha", label: "Ficha", icono: FileText },
    { key: "odontograma", label: "Odontograma", icono: Check },
    { key: "historial", label: "Historial", icono: CalendarDays },
  ];

  return (
    <div className="space-y-6">
      <Link to="/pacientes" className="inline-block">
        <Button variant="ghost" size="sm">
          <ArrowLeft /> Pacientes
        </Button>
      </Link>

      {/* Cabecera del paciente */}
      <div className="surface flex flex-wrap items-center gap-4 p-5 sm:p-6">
        <InitialsAvatar name={p.name} className="size-14 text-lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-[24px] font-bold leading-tight tracking-tight sm:text-[28px]">
            {p.name}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {p.file_number && <span className="font-medium">Ficha #{p.file_number}</span>}
            {edad !== null && <span>{edad} anos</span>}
            {p.phone && (
              <span className="inline-flex items-center gap-1.5">
                <Phone className="size-3.5" /> {p.phone}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {Number(p.balance) > 0 && <Pill tone="warning">Debe {formatDOP(Number(p.balance))}</Pill>}
          <Pill tone={tonoEstado[p.status]}>{textoEstado[p.status]}</Pill>
        </div>
      </div>

      {/* Pestanas */}
      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {pestanas.map((t) => (
          <button
            key={t.key}
            onClick={() => setPestana(t.key)}
            className={cn(
              "relative -mb-px shrink-0 border-b-2 px-4 py-2.5 text-[15px] font-medium transition-colors",
              pestana === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ---------- FICHA ---------- */}
      {pestana === "ficha" && (
        <Section title="Datos del paciente">
          <form onSubmit={guardarFicha} className="space-y-4">
            <FormGrid className="sm:grid-cols-[1fr_140px]">
              <Field label="Nombre completo">
                <TextInput
                  value={form.name ?? ""}
                  onChange={(e) => cambiar("name", e.target.value)}
                  required
                />
              </Field>
              <Field label="Numero de ficha">
                <TextInput
                  value={form.file_number ?? ""}
                  onChange={(e) => cambiar("file_number", e.target.value)}
                  placeholder="0847"
                />
              </Field>
            </FormGrid>

            <FormGrid>
              <Field label="Telefono">
                <TextInput
                  type="tel"
                  value={form.phone ?? ""}
                  onChange={(e) => cambiar("phone", e.target.value)}
                  placeholder="809-555-0100"
                />
              </Field>
              <Field label="Correo">
                <TextInput
                  type="email"
                  value={form.email ?? ""}
                  onChange={(e) => cambiar("email", e.target.value)}
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
                  value={form.status ?? "nuevo"}
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
                value={form.treatment ?? ""}
                onChange={(e) => cambiar("treatment", e.target.value)}
              />
            </Field>

            <Field label="Notas" hint="Alergias, antecedentes, observaciones.">
              <TextArea
                value={form.notes ?? ""}
                onChange={(e) => cambiar("notes", e.target.value)}
                rows={4}
              />
            </Field>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={guardar.isPending}>
                {guardar.isPending ? "Guardando..." : "Guardar cambios"}
              </Button>
              {guardado && (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success">
                  <Check className="size-4" /> Guardado
                </span>
              )}
              {guardar.isError && (
                <span role="alert" className="text-sm text-danger">
                  {guardar.error.message}
                </span>
              )}
            </div>
          </form>
        </Section>
      )}

      {/* ---------- ODONTOGRAMA ---------- */}
      {pestana === "odontograma" && (
        <div className="space-y-6">
          <Section title="Odontograma">
            {odontograma.isPending ? (
              <div className="h-64 animate-pulse rounded-xl bg-muted" aria-hidden />
            ) : odontograma.isError ? (
              <div className="rounded-xl bg-danger-soft px-4 py-6 text-center">
                <TriangleAlert className="mx-auto size-6 text-danger" />
                <p className="mt-2 text-sm text-danger">{odontograma.error.message}</p>
                <p className="mt-2 text-xs text-danger/80">
                  Si dice que falta una tabla, es que no se ha corrido la migracion del odontograma
                  en Supabase.
                </p>
              </div>
            ) : (
              <>
                <Odontograma estados={estados} onPintar={pintar} />
                {registrar.isError && (
                  <p role="alert" className="mt-4 text-sm text-danger">
                    {registrar.error.message}
                  </p>
                )}
              </>
            )}
          </Section>

          <Section title="Leyenda">
            <LeyendaOdontograma />
            <p className="mt-4 text-sm text-muted-foreground">
              Cada cambio queda guardado con su fecha y quien lo registro. Nada se sobrescribe: si
              marcas algo por error, marcas el estado correcto encima y la historia queda completa.
            </p>
          </Section>
        </div>
      )}

      {/* ---------- HISTORIAL ---------- */}
      {pestana === "historial" && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <Section title="Citas">
            {citas.isPending ? (
              <div className="h-24 animate-pulse rounded-xl bg-muted" aria-hidden />
            ) : listaCitas.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Este paciente todavia no tiene citas.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {listaCitas.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 py-3">
                    <div className="w-24 shrink-0">
                      <p className="text-sm font-semibold">{formatShortDate(c.date)}</p>
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {c.time.slice(0, 5)}
                      </p>
                    </div>
                    <p className="min-w-0 flex-1 truncate text-[15px]">{c.treatment || "Cita"}</p>
                    <StatusBadge status={c.status} />
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Cobros">
            <div className="rounded-xl bg-primary-soft/60 p-4">
              <p className="text-sm text-primary-soft-foreground">Total pagado</p>
              <p className="mt-1 text-[26px] font-bold leading-none tracking-tight text-primary-soft-foreground">
                {formatDOP(totalCobrado)}
              </p>
            </div>
            {listaCobros.length === 0 ? (
              <p className="py-5 text-center text-sm text-muted-foreground">
                Sin cobros registrados.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-border">
                {listaCobros.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-success-soft text-success">
                        <Wallet className="size-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{c.concept || "Cobro"}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatShortDate(c.date)} · {c.method}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">
                      {formatDOP(Number(c.amount))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}
