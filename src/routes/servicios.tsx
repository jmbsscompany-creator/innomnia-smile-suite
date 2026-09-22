import { createFileRoute } from "@tanstack/react-router";
import { Clock, FileText, Pencil, Plus, Search, Sparkles, TriangleAlert } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import type { Service } from "@/lib/database.types";
import {
  useActualizarServicio,
  useCargarServiciosBase,
  useCrearServicio,
  useServicios,
  type NuevoServicio,
} from "@/lib/queries";
import { CATEGORIAS_SUGERIDAS, SERVICIOS_BASE } from "@/lib/servicios-base";
import { useAuth } from "@/lib/auth";
import { formatDOP, normalizar } from "@/lib/format";
import { Button, PageHeader, Section } from "@/components/app/ui";
import { Field, FormGrid, Modal, ModalActions, TextArea, TextInput } from "@/components/app/form";
import { cn } from "@/lib/utils";

const title = "Servicios y precios — INNOMNIA Dental";
const description =
  "Catalogo de tratamientos de la clinica con duracion y precios en pesos dominicanos.";

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

const FORM_VACIO: NuevoServicio = {
  name: "",
  category: "",
  duration: 30,
  price: 0,
  description: "",
};

function ServicesPage() {
  const { isDentista } = useAuth();
  const { data, isPending, isError, error, refetch } = useServicios();
  const crear = useCrearServicio();
  const actualizar = useActualizarServicio();
  const cargarBase = useCargarServiciosBase();

  const [cat, setCat] = useState("Todos");
  const [q, setQ] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<Service | null>(null);
  const [form, setForm] = useState<NuevoServicio>(FORM_VACIO);

  const servicios = data ?? [];
  const vacio = !isPending && !isError && servicios.length === 0;

  // Las categorias salen de lo que realmente hay guardado.
  const categorias = useMemo(
    () => Array.from(new Set(servicios.map((s) => s.category).filter(Boolean))).sort(),
    [servicios],
  );
  const visibles = cat === "Todos" ? categorias : [cat];

  // Busca por nombre, categoria, descripcion y tambien por precio:
  // escribir "3500" encuentra los tratamientos que cuestan RD$ 3,500.
  const encontrados = useMemo(() => {
    const texto = normalizar(q);
    if (!texto) return servicios;
    return servicios.filter(
      (s) =>
        normalizar(s.name).includes(texto) ||
        normalizar(s.category).includes(texto) ||
        normalizar(s.description).includes(texto) ||
        String(s.price).includes(texto.replace(/[^0-9]/g, "")),
    );
  }, [servicios, q]);

  function cambiar<K extends keyof NuevoServicio>(campo: K, valor: NuevoServicio[K]) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  function abrirNuevo() {
    setEditando(null);
    setForm(FORM_VACIO);
    crear.reset();
    actualizar.reset();
    setAbierto(true);
  }

  function abrirEdicion(s: Service) {
    setEditando(s);
    setForm({
      name: s.name,
      category: s.category,
      duration: s.duration,
      price: Number(s.price),
      description: s.description,
    });
    crear.reset();
    actualizar.reset();
    setAbierto(true);
  }

  function cerrar() {
    setAbierto(false);
    setEditando(null);
    setForm(FORM_VACIO);
    crear.reset();
    actualizar.reset();
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    try {
      if (editando) {
        await actualizar.mutateAsync({ id: editando.id, cambios: form });
      } else {
        await crear.mutateAsync(form);
      }
      cerrar();
    } catch {
      // El error se muestra dentro del modal.
    }
  }

  const guardando = crear.isPending || actualizar.isPending;
  const errorModal = crear.error?.message ?? actualizar.error?.message ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Servicios y Precios"
        subtitle={
          isPending
            ? "Cargando el catalogo..."
            : `${servicios.length} ${servicios.length === 1 ? "tratamiento" : "tratamientos"} · precios en pesos dominicanos (RD$)`
        }
        actions={
          isDentista && !vacio ? (
            <Button onClick={abrirNuevo}>
              <Plus /> <span className="hidden sm:inline">Nuevo servicio</span>
              <span className="sm:hidden">Nuevo</span>
            </Button>
          ) : undefined
        }
      />

      {isError && (
        <div className="rounded-xl bg-danger-soft px-4 py-6 text-center">
          <TriangleAlert className="mx-auto size-6 text-danger" />
          <p className="mt-2 font-semibold text-danger">No se pudo cargar el catalogo</p>
          <p className="mt-1 text-sm text-danger/80">{error.message}</p>
          <Button variant="outline" className="mt-4" onClick={() => void refetch()}>
            Reintentar
          </Button>
        </div>
      )}

      {isPending && (
        <div className="grid gap-4 sm:grid-cols-2" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="surface h-24 animate-pulse" />
          ))}
        </div>
      )}

      {vacio && (
        <div className="surface px-6 py-12 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary">
            <FileText className="size-7" strokeWidth={1.6} />
          </span>
          <p className="mt-4 text-[17px] font-semibold">Todavia no hay servicios</p>
          <p className="mx-auto mt-1.5 max-w-[46ch] text-sm text-muted-foreground">
            Aqui va el catalogo de tratamientos con sus precios. Lo usaras al agendar citas y al
            cobrar.
          </p>

          {isDentista ? (
            <>
              <div className="mx-auto mt-6 max-w-[42ch] rounded-xl bg-primary-soft/50 p-4 text-left">
                <p className="flex items-center gap-2 text-sm font-semibold text-primary-soft-foreground">
                  <Sparkles className="size-4" /> Empieza con la lista base
                </p>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Carga {SERVICIOS_BASE.length} tratamientos comunes con precios de referencia, y
                  despues ajustas cada precio a los de tu clinica. Te ahorra escribirlos uno por
                  uno.
                </p>
              </div>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Button
                  size="lg"
                  disabled={cargarBase.isPending}
                  onClick={() => cargarBase.mutate(SERVICIOS_BASE)}
                >
                  <Sparkles /> {cargarBase.isPending ? "Cargando..." : "Cargar lista base"}
                </Button>
                <Button size="lg" variant="outline" onClick={abrirNuevo}>
                  <Plus /> Crear uno a mano
                </Button>
              </div>
              {cargarBase.isError && (
                <p role="alert" className="mt-4 text-sm text-danger">
                  {cargarBase.error.message}
                </p>
              )}
            </>
          ) : (
            <p className="mt-5 text-sm text-muted-foreground">
              Pidele a la odontologa que cargue el catalogo.
            </p>
          )}
        </div>
      )}

      {!vacio && !isPending && !isError && (
        <>
          <label className="relative flex h-11 items-center rounded-xl border border-input bg-card px-3.5 text-muted-foreground focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-ring/30">
            <Search className="size-[18px] shrink-0" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar tratamiento, categoria o precio..."
              className="ml-2.5 w-full min-w-0 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
            />
          </label>

          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {["Todos", ...categorias].map((c) => (
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

          {encontrados.length === 0 && (
            <p className="surface px-4 py-10 text-center text-sm text-muted-foreground">
              Ningun tratamiento coincide con "{q}".
            </p>
          )}

          <div className="grid gap-6 xl:grid-cols-2">
            {visibles.map((c) => {
              const items = encontrados.filter((s) => s.category === c);
              if (items.length === 0) return null;
              return (
                <Section key={c} title={c} padded={false}>
                  <ul className="divide-y divide-border">
                    {items.map((s) => (
                      <li
                        key={s.id}
                        className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-4 transition-colors hover:bg-primary-soft/30 sm:px-6"
                      >
                        <div className="min-w-0">
                          <p className="text-[15px] font-semibold">{s.name}</p>
                          {s.description && (
                            <p className="mt-0.5 text-sm text-muted-foreground">{s.description}</p>
                          )}
                          <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                            <Clock className="size-3.5" /> {s.duration} min
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[17px] font-bold tabular-nums tracking-tight">
                            {formatDOP(Number(s.price))}
                          </span>
                          {isDentista && (
                            <button
                              onClick={() => abrirEdicion(s)}
                              aria-label={`Editar ${s.name}`}
                              className="grid size-9 place-items-center rounded-lg text-muted-foreground opacity-0 transition-all hover:bg-primary-soft hover:text-primary focus-visible:opacity-100 group-hover:opacity-100"
                            >
                              <Pencil className="size-4" />
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </Section>
              );
            })}
          </div>
        </>
      )}

      {/* Formulario de servicio */}
      <Modal
        open={abierto}
        onClose={cerrar}
        title={editando ? "Editar servicio" : "Nuevo servicio"}
        description={
          editando
            ? "Los cambios se aplican al catalogo completo."
            : "Quedara disponible al agendar citas y al cobrar."
        }
        footer={
          <ModalActions
            onCancel={cerrar}
            formId="form-servicio"
            disabled={guardando}
            submitLabel={guardando ? "Guardando..." : "Guardar servicio"}
          />
        }
      >
        <form id="form-servicio" onSubmit={guardar} className="space-y-4">
          <Field label="Nombre del tratamiento">
            <TextInput
              value={form.name}
              onChange={(e) => cambiar("name", e.target.value)}
              placeholder="Limpieza dental"
              autoFocus
              required
            />
          </Field>

          <Field label="Categoria" hint="Escribe una nueva o elige de la lista.">
            <TextInput
              value={form.category}
              onChange={(e) => cambiar("category", e.target.value)}
              placeholder="Prevencion"
              list="lista-categorias"
              required
            />
            <datalist id="lista-categorias">
              {Array.from(new Set([...categorias, ...CATEGORIAS_SUGERIDAS])).map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>

          <FormGrid>
            <Field label="Precio en RD$">
              <TextInput
                type="number"
                min={0}
                step={100}
                value={String(form.price)}
                onChange={(e) => cambiar("price", Number(e.target.value))}
                required
              />
            </Field>
            <Field label="Duracion en minutos">
              <TextInput
                type="number"
                min={5}
                step={5}
                value={String(form.duration)}
                onChange={(e) => cambiar("duration", Number(e.target.value))}
                required
              />
            </Field>
          </FormGrid>

          <Field label="Descripcion">
            <TextArea
              value={form.description}
              onChange={(e) => cambiar("description", e.target.value)}
              placeholder="Que incluye el tratamiento, en palabras que el paciente entienda."
            />
          </Field>

          {errorModal && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-xl bg-danger-soft px-3.5 py-3 text-sm text-danger"
            >
              <TriangleAlert className="mt-px size-4 shrink-0" />
              <span>{errorModal}</span>
            </p>
          )}
        </form>
      </Modal>
    </div>
  );
}
