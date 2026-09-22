import { createFileRoute } from "@tanstack/react-router";
import { Check, Lock, ShieldCheck, TriangleAlert, Users } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import type { ClinicSettings } from "@/lib/database.types";
import { useActualizarClinica, useClinica, usePerfiles } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { Button, InitialsAvatar, PageHeader, Pill, Section } from "@/components/app/ui";
import { Field, TextInput } from "@/components/app/form";

const title = "Configuración — INNOMNIA Dental";
const description = "Datos de la clinica, horarios de atencion y quien tiene acceso.";

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

const DIAS = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];

const HORARIO_POR_DEFECTO = DIAS.map((day) => ({
  day,
  hours:
    day === "Domingo" ? "Cerrado" : day === "Sabado" ? "9:00 am – 1:00 pm" : "8:00 am – 6:00 pm",
}));

interface FormClinica {
  name: string;
  dentist: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  schedule: { day: string; hours: string }[];
}

const VACIO: FormClinica = {
  name: "",
  dentist: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  schedule: HORARIO_POR_DEFECTO,
};

function SettingsPage() {
  const { isDentista } = useAuth();
  const { data, isPending, isError, error, refetch } = useClinica();
  const perfiles = usePerfiles();
  const guardar = useActualizarClinica();

  const [form, setForm] = useState<FormClinica>(VACIO);
  const [guardado, setGuardado] = useState(false);

  // Cuando llegan los datos de la base, se cargan en el formulario.
  useEffect(() => {
    if (!data) return;
    setForm({
      name: data.name,
      dentist: data.dentist,
      phone: data.phone,
      email: data.email,
      address: data.address,
      city: data.city,
      schedule:
        Array.isArray(data.schedule) && data.schedule.length > 0
          ? data.schedule
          : HORARIO_POR_DEFECTO,
    });
  }, [data]);

  function cambiar<K extends keyof FormClinica>(campo: K, valor: FormClinica[K]) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    setGuardado(false);
  }

  function cambiarHorario(i: number, horas: string) {
    setForm((prev) => ({
      ...prev,
      schedule: prev.schedule.map((d, k) => (k === i ? { ...d, hours: horas } : d)),
    }));
    setGuardado(false);
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setGuardado(false);
    try {
      await guardar.mutateAsync(form as Partial<ClinicSettings>);
      setGuardado(true);
    } catch {
      // El error se muestra abajo del formulario.
    }
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Configuración" subtitle="No se pudo cargar" />
        <div className="rounded-xl bg-danger-soft px-4 py-6 text-center">
          <TriangleAlert className="mx-auto size-6 text-danger" />
          <p className="mt-2 text-sm text-danger">{error.message}</p>
          <Button variant="outline" className="mt-4" onClick={() => void refetch()}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración"
        subtitle={
          isDentista
            ? "Informacion general de tu clinica"
            : "Informacion de la clinica. Solo la odontologa puede cambiarla."
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Section title="Datos de la clinica">
          {isPending ? (
            <div className="grid gap-4 sm:grid-cols-2" aria-hidden>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : (
            <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre de la clinica">
                <TextInput
                  value={form.name}
                  onChange={(e) => cambiar("name", e.target.value)}
                  placeholder="Clinica Dental Sonrisa"
                  disabled={!isDentista}
                />
              </Field>
              <Field label="Odontologa principal">
                <TextInput
                  value={form.dentist}
                  onChange={(e) => cambiar("dentist", e.target.value)}
                  placeholder="Dra. Saudy Mabel"
                  disabled={!isDentista}
                />
              </Field>
              <Field label="Telefono">
                <TextInput
                  type="tel"
                  value={form.phone}
                  onChange={(e) => cambiar("phone", e.target.value)}
                  placeholder="809-555-0100"
                  disabled={!isDentista}
                />
              </Field>
              <Field label="Correo">
                <TextInput
                  type="email"
                  value={form.email}
                  onChange={(e) => cambiar("email", e.target.value)}
                  placeholder="contacto@clinica.do"
                  disabled={!isDentista}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Direccion">
                  <TextInput
                    value={form.address}
                    onChange={(e) => cambiar("address", e.target.value)}
                    placeholder="Av. Winston Churchill 45, Piantini"
                    disabled={!isDentista}
                  />
                </Field>
              </div>
              <Field label="Ciudad">
                <TextInput
                  value={form.city}
                  onChange={(e) => cambiar("city", e.target.value)}
                  placeholder="Santo Domingo"
                  disabled={!isDentista}
                />
              </Field>

              {isDentista && (
                <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
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
              )}
            </form>
          )}
        </Section>

        <div className="space-y-6">
          <Section title="Horario de atencion">
            {isPending ? (
              <div className="space-y-2" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {form.schedule.map((d, i) => (
                  <li key={d.day} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="w-24 shrink-0 text-[15px] font-medium">{d.day}</span>
                    {isDentista ? (
                      <TextInput
                        value={d.hours}
                        onChange={(e) => cambiarHorario(i, e.target.value)}
                        placeholder="Cerrado"
                        className="h-9 flex-1 text-sm"
                      />
                    ) : (
                      <span className="flex-1 text-right text-sm text-muted-foreground">
                        {d.hours}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {isDentista && (
              <p className="mt-3 text-xs text-muted-foreground">
                El horario se guarda con el boton de la izquierda, junto con los demas datos.
              </p>
            )}
          </Section>

          <Section title="Quien tiene acceso">
            {perfiles.isPending ? (
              <div className="h-14 animate-pulse rounded-lg bg-muted" aria-hidden />
            ) : (
              <ul className="divide-y divide-border">
                {(perfiles.data ?? []).map((p) => (
                  <li key={p.id} className="flex items-center gap-3 py-3">
                    <InitialsAvatar name={p.full_name || "Usuario"} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium">
                        {p.full_name || "Sin nombre"}
                      </p>
                    </div>
                    <Pill tone={p.role === "dentista" ? "success" : "info"}>
                      {p.role === "dentista" ? "Odontologa" : "Secretaria"}
                    </Pill>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-primary-soft/50 px-3.5 py-3">
              <ShieldCheck className="mt-px size-4 shrink-0 text-primary" />
              <p className="text-sm text-muted-foreground">
                La odontologa ve y edita todo. La secretaria agenda citas, registra pacientes y
                cobra, pero no puede borrar expedientes ni cambiar precios.
              </p>
            </div>
          </Section>

          <Section title="Seguridad de los datos">
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2.5">
                <Lock className="mt-px size-4 shrink-0 text-primary" />
                <span>
                  Los expedientes solo se ven despues de entrar con usuario y contrasena. La propia
                  base de datos los bloquea, no solo la pantalla.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Users className="mt-px size-4 shrink-0 text-primary" />
                <span>
                  Para dar acceso a alguien mas, la odontologa crea su usuario. Nunca compartan una
                  misma cuenta: si pasa algo, hay que saber quien hizo que.
                </span>
              </li>
            </ul>
          </Section>
        </div>
      </div>
    </div>
  );
}
