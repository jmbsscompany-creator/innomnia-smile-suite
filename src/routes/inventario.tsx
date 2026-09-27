import { createFileRoute } from "@tanstack/react-router";
import { Boxes, CalendarClock, Pencil, Plus, Search, Trash2, TriangleAlert } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import type { Producto } from "@/lib/database.types";
import {
  useActualizarProducto,
  useCrearProducto,
  useEliminarProducto,
  useProductos,
  type NuevoProducto,
} from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { formatShortDate } from "@/lib/dates";
import { normalizar } from "@/lib/format";
import { Button, PageHeader, Pill, Section } from "@/components/app/ui";
import { Field, FormGrid, Modal, ModalActions, TextArea, TextInput } from "@/components/app/form";
import { cn } from "@/lib/utils";

const title = "Inventario — INNOMNIA Dental";
const description = "Productos de la clínica, cantidades y fechas de vencimiento.";

export const Route = createFileRoute("/inventario")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: InventarioPage,
});

const UNIDADES_SUGERIDAS = ["unidades", "cajas", "frascos", "paquetes", "galones", "rollos"];

const FORM_VACIO: NuevoProducto = {
  nombre: "",
  categoria: "",
  cantidad: 1,
  unidad: "unidades",
  vencimiento: null,
  notas: "",
};

/** Cuantos dias faltan para que venza. Negativo si ya vencio. */
function diasParaVencer(iso: string): number {
  const hoy = new Date();
  const hoyISO = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const [y, m, d] = iso.split("-").map(Number);
  const fecha = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  return Math.round((fecha.getTime() - hoyISO.getTime()) / 86_400_000);
}

/** Umbral: a partir de cuantos dias antes se considera "por vencer". */
const DIAS_ALERTA = 30;

type Estado = "vencido" | "por-vencer" | "vigente" | "sin-fecha";

function estadoDe(p: Producto): Estado {
  if (!p.vencimiento) return "sin-fecha";
  const dias = diasParaVencer(p.vencimiento);
  if (dias < 0) return "vencido";
  if (dias <= DIAS_ALERTA) return "por-vencer";
  return "vigente";
}

function EtiquetaVencimiento({ p }: { p: Producto }) {
  if (!p.vencimiento)
    return <span className="text-xs text-muted-foreground">Sin fecha de vencimiento</span>;
  const dias = diasParaVencer(p.vencimiento);
  const estado = estadoDe(p);
  const texto =
    estado === "vencido"
      ? `Venció hace ${Math.abs(dias)} ${Math.abs(dias) === 1 ? "día" : "días"}`
      : dias === 0
        ? "Vence hoy"
        : `Vence en ${dias} ${dias === 1 ? "día" : "días"}`;
  return (
    <Pill tone={estado === "vencido" ? "danger" : estado === "por-vencer" ? "warning" : "success"}>
      <CalendarClock className="size-3.5" /> {formatShortDate(p.vencimiento)} · {texto}
    </Pill>
  );
}

function InventarioPage() {
  const { isDentista } = useAuth();
  const { data, isPending, isError, error, refetch } = useProductos();
  const crear = useCrearProducto();
  const actualizar = useActualizarProducto();
  const eliminar = useEliminarProducto();

  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "por-vencer" | "vencido">("todos");
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<Producto | null>(null);
  const [form, setForm] = useState<NuevoProducto>(FORM_VACIO);
  const [confirmarBorrar, setConfirmarBorrar] = useState<string | null>(null);

  const productos = data ?? [];
  const vacio = !isPending && !isError && productos.length === 0;

  const vencidos = productos.filter((p) => estadoDe(p) === "vencido");
  const porVencer = productos.filter((p) => estadoDe(p) === "por-vencer");

  const filtrados = useMemo(() => {
    let lista = productos;
    if (filtro === "por-vencer") lista = porVencer;
    if (filtro === "vencido") lista = vencidos;
    const texto = normalizar(q);
    if (!texto) return lista;
    return lista.filter(
      (p) => normalizar(p.nombre).includes(texto) || normalizar(p.categoria).includes(texto),
    );
  }, [productos, porVencer, vencidos, filtro, q]);

  function cambiar<K extends keyof NuevoProducto>(campo: K, valor: NuevoProducto[K]) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  function abrirNuevo() {
    setEditando(null);
    setForm(FORM_VACIO);
    crear.reset();
    actualizar.reset();
    setAbierto(true);
  }

  function abrirEdicion(p: Producto) {
    setEditando(p);
    setForm({
      nombre: p.nombre,
      categoria: p.categoria,
      cantidad: p.cantidad,
      unidad: p.unidad,
      vencimiento: p.vencimiento,
      notas: p.notas,
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

  function pedirBorrar(id: string) {
    setConfirmarBorrar(id);
  }

  async function confirmarYBorrar(id: string) {
    await eliminar.mutateAsync(id);
    setConfirmarBorrar(null);
  }

  const guardando = crear.isPending || actualizar.isPending;
  const errorModal = crear.error?.message ?? actualizar.error?.message ?? null;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Inventario"
        subtitle={
          isPending
            ? "Cargando el inventario..."
            : `${productos.length} ${productos.length === 1 ? "producto" : "productos"}` +
              (vencidos.length > 0
                ? ` · ${vencidos.length} vencido${vencidos.length === 1 ? "" : "s"}`
                : porVencer.length > 0
                  ? ` · ${porVencer.length} por vencer`
                  : "")
        }
        actions={
          isDentista && !vacio ? (
            <Button onClick={abrirNuevo}>
              <Plus /> <span className="hidden sm:inline">Nuevo producto</span>
              <span className="sm:hidden">Nuevo</span>
            </Button>
          ) : undefined
        }
      />

      {isError && (
        <div className="rounded-xl bg-danger-soft px-4 py-6 text-center">
          <TriangleAlert className="mx-auto size-6 text-danger" />
          <p className="mt-2 font-semibold text-danger">No se pudo cargar el inventario</p>
          <p className="mt-1 text-sm text-danger/80">{error.message}</p>
          <Button variant="outline" className="mt-4" onClick={() => void refetch()}>
            Reintentar
          </Button>
        </div>
      )}

      {isPending && (
        <div className="grid gap-4 sm:grid-cols-2" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="surface h-20 animate-pulse" />
          ))}
        </div>
      )}

      {vacio && (
        <div className="surface px-6 py-12 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary">
            <Boxes className="size-7" strokeWidth={1.6} />
          </span>
          <p className="mt-4 text-[17px] font-semibold">Todavía no hay productos</p>
          <p className="mx-auto mt-1.5 max-w-[46ch] text-sm text-muted-foreground">
            Aquí va lo que compra la clínica — guantes, anestesia, material — con su fecha de
            vencimiento, para saber con tiempo qué se va a caducar.
          </p>
          {isDentista ? (
            <Button size="lg" className="mt-6" onClick={abrirNuevo}>
              <Plus /> Agregar el primer producto
            </Button>
          ) : (
            <p className="mt-5 text-sm text-muted-foreground">
              Pídele a la odontóloga que agregue el inventario.
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
              placeholder="Buscar producto o categoría..."
              className="ml-2.5 w-full min-w-0 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
            />
          </label>

          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {(
              [
                ["todos", "Todos"],
                ["por-vencer", `Por vencer (${porVencer.length})`],
                ["vencido", `Vencidos (${vencidos.length})`],
              ] as const
            ).map(([valor, etiqueta]) => (
              <button
                key={valor}
                onClick={() => setFiltro(valor)}
                className={cn(
                  "h-9 shrink-0 rounded-lg border px-3.5 text-sm font-medium transition-colors",
                  filtro === valor
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border-strong bg-card text-muted-foreground hover:border-primary/40 hover:text-primary",
                )}
              >
                {etiqueta}
              </button>
            ))}
          </div>

          {filtrados.length === 0 ? (
            <p className="surface px-4 py-10 text-center text-sm text-muted-foreground">
              Ningún producto coincide con lo que buscas.
            </p>
          ) : (
            <Section padded={false}>
              <ul className="divide-y divide-border">
                {filtrados.map((p) => (
                  <li
                    key={p.id}
                    className="group flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-primary-soft/30 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6"
                  >
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold">{p.nombre}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {p.cantidad} {p.unidad}
                        {p.categoria ? ` · ${p.categoria}` : ""}
                      </p>
                      {p.notas && <p className="mt-1 text-xs text-muted-foreground">{p.notas}</p>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <EtiquetaVencimiento p={p} />
                      {isDentista && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => abrirEdicion(p)}
                            aria-label={`Editar ${p.nombre}`}
                            className="grid size-9 place-items-center rounded-lg text-muted-foreground opacity-0 transition-all hover:bg-primary-soft hover:text-primary focus-visible:opacity-100 group-hover:opacity-100"
                          >
                            <Pencil className="size-4" />
                          </button>
                          {confirmarBorrar === p.id ? (
                            <div className="flex items-center gap-1.5 rounded-lg bg-danger-soft px-2 py-1">
                              <span className="text-xs font-medium text-danger">¿Borrar?</span>
                              <button
                                onClick={() => void confirmarYBorrar(p.id)}
                                disabled={eliminar.isPending}
                                className="rounded-md bg-danger px-2 py-1 text-xs font-semibold text-white"
                              >
                                Sí
                              </button>
                              <button
                                onClick={() => setConfirmarBorrar(null)}
                                className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => pedirBorrar(p.id)}
                              aria-label={`Eliminar ${p.nombre}`}
                              className="grid size-9 place-items-center rounded-lg text-muted-foreground opacity-0 transition-all hover:bg-danger-soft hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </>
      )}

      {/* Formulario de producto */}
      <Modal
        open={abierto}
        onClose={cerrar}
        title={editando ? "Editar producto" : "Nuevo producto"}
        description={
          editando
            ? "Los cambios se aplican al inventario completo."
            : "Se agrega al inventario de la clínica."
        }
        footer={
          <ModalActions
            onCancel={cerrar}
            formId="form-producto"
            disabled={guardando}
            submitLabel={guardando ? "Guardando..." : "Guardar producto"}
          />
        }
      >
        <form id="form-producto" onSubmit={guardar} className="space-y-4">
          <Field label="Nombre del producto">
            <TextInput
              value={form.nombre}
              onChange={(e) => cambiar("nombre", e.target.value)}
              placeholder="Guantes de látex talla M"
              autoFocus
              required
            />
          </Field>

          <Field label="Categoría" hint="Opcional — para agrupar y buscar más fácil.">
            <TextInput
              value={form.categoria}
              onChange={(e) => cambiar("categoria", e.target.value)}
              placeholder="Bioseguridad"
            />
          </Field>

          <FormGrid>
            <Field label="Cantidad">
              <TextInput
                type="number"
                min={0}
                step={1}
                value={String(form.cantidad)}
                onChange={(e) => cambiar("cantidad", Number(e.target.value))}
                required
              />
            </Field>
            <Field label="Unidad">
              <TextInput
                value={form.unidad}
                onChange={(e) => cambiar("unidad", e.target.value)}
                placeholder="unidades"
                list="lista-unidades"
                required
              />
              <datalist id="lista-unidades">
                {UNIDADES_SUGERIDAS.map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </Field>
          </FormGrid>

          <Field label="Fecha de vencimiento" hint="Déjala en blanco si el producto no vence.">
            <TextInput
              type="date"
              value={form.vencimiento ?? ""}
              onChange={(e) => cambiar("vencimiento", e.target.value || null)}
            />
          </Field>

          <Field label="Notas">
            <TextArea
              value={form.notas}
              onChange={(e) => cambiar("notas", e.target.value)}
              placeholder="Dónde se guarda, proveedor, lote..."
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
