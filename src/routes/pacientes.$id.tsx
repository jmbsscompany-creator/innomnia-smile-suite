import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowLeft,
  CalendarDays,
  Check,
  ClipboardList,
  Download,
  FileText,
  Phone,
  Plus,
  Receipt,
  Trash2,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import type {
  Documento,
  ItemDocumento,
  Patient,
  Payment,
  TipoDocumento,
} from "@/lib/database.types";
import {
  useActualizarPaciente,
  useAgregarNotaClinica,
  useCargosDePaciente,
  useCitasDePaciente,
  useClinica,
  useCobrosDePaciente,
  useCrearCargo,
  useCrearCobro,
  useCrearDocumento,
  useCrearPeriodontograma,
  useDocumentosDePaciente,
  useGuardarDientePerio,
  useHistorialOdontograma,
  useNotasClinicas,
  usePeriodontograma,
  usePeriodontogramas,
  hoyISO,
  usePaciente,
  useRegistrarDiente,
  useServicios,
} from "@/lib/queries";
import { LeyendaOdontograma, Odontograma, type AccionDiente } from "@/components/app/Odontograma";
import { Periodontograma } from "@/components/app/Periodontograma";
import { GraficoPeriodontal } from "@/components/app/GraficoPeriodontal";
import { IndicesPeriodontal } from "@/components/app/IndicesPeriodontal";
import { edadDesde, formatDOP, normalizar } from "@/lib/format";
import {
  enlaceLlamada,
  mensajeComprobante,
  mensajeDocumento,
  mensajeRecordatorio,
  saludo,
} from "@/lib/whatsapp";
import { formatShortDate } from "@/lib/dates";
import { descargarPDFDocumento } from "@/lib/pdf-documento";
import {
  BotonWhatsApp,
  Button,
  InitialsAvatar,
  Pill,
  Section,
  StatusBadge,
  TelefonoWhatsApp,
} from "@/components/app/ui";
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

type Pestana =
  "ficha" | "procedimientos" | "odontograma" | "periodontograma" | "historial" | "documentos";

const tonoEstado = {
  activo: "success",
  seguimiento: "warning",
  nuevo: "info",
  inactivo: "muted",
} as const;
const textoEstado = {
  activo: "Activo",
  seguimiento: "Seguimiento",
  nuevo: "Nuevo",
  inactivo: "Inactivo",
} as const;

function FichaPaciente() {
  const { id } = Route.useParams();
  const paciente = usePaciente(id);
  const citas = useCitasDePaciente(id);
  const cobros = useCobrosDePaciente(id);
  const cargos = useCargosDePaciente(id);
  const crearCargo = useCrearCargo();
  const notas = useNotasClinicas(id);
  const agregarNota = useAgregarNotaClinica();
  const servicios = useServicios();
  const historialOdonto = useHistorialOdontograma(id);
  const guardar = useActualizarPaciente();
  const registrar = useRegistrarDiente();
  const clinica = useClinica();
  const documentos = useDocumentosDePaciente(id);
  const crearDocumento = useCrearDocumento();

  const [pestana, setPestana] = useState<Pestana>("ficha");
  const [form, setForm] = useState<Partial<Patient>>({});
  const [guardado, setGuardado] = useState(false);

  // Historial de procedimientos: un solo formulario para anotar que se
  // hizo Y, si tiene costo, cobrarlo de una vez — antes eran dos pasos
  // separados (Procedimientos y Cargos) para lo que en la practica es
  // una sola cosa: todo cargo viene de un procedimiento. El monto es
  // opcional (0 = no se cobra nada por esto, por ejemplo una revision).
  const [notaNueva, setNotaNueva] = useState("");
  const [notasAdicionales, setNotasAdicionales] = useState("");
  const [fechaNotaNueva, setFechaNotaNueva] = useState(hoyISO());
  const [montoCargo, setMontoCargo] = useState(0);
  const [estadoPagoCargo, setEstadoPagoCargo] = useState<"pagado" | "parcial" | "debe">("pagado");
  const [montoPagadoCargo, setMontoPagadoCargo] = useState(0);
  const [metodoPagoCargo, setMetodoPagoCargo] = useState<Payment["method"]>("efectivo");
  const crearCobro = useCrearCobro();
  // Se pone en true justo despues de guardar un procedimiento, para
  // mostrar el atajo de "agregar al odontograma" (facil que se le olvide
  // a la secretaria si no se lo recordamos ahi mismo).
  const [procedimientoGuardado, setProcedimientoGuardado] = useState(false);

  // Comprobante del ultimo pago (de un procedimiento nuevo o de un abono),
  // para poder mandarlo por WhatsApp justo despues de cobrar sin tener que
  // ir a buscarlo. Se pisa cada vez que se registra un pago nuevo.
  const [comprobante, setComprobante] = useState<{
    tipo: "procedimiento" | "abono";
    concepto: string;
    monto: number;
    metodo: Payment["method"];
    fecha: string;
    saldoRestante: number;
  } | null>(null);

  // Documentos (presupuestos y recetas): un formulario con lineas que se
  // van agregando, igual que en Procedimientos. Al guardar, se genera el
  // PDF de una vez y se descarga solo.
  const [tipoDocNuevo, setTipoDocNuevo] = useState<TipoDocumento>("presupuesto");
  const [fechaDocNueva, setFechaDocNueva] = useState(hoyISO());
  const [itemsDocNuevo, setItemsDocNuevo] = useState<ItemDocumento[]>([
    { concepto: "", precio: 0 },
  ]);
  const [notasDocNuevo, setNotasDocNuevo] = useState("");
  const [documentoGuardado, setDocumentoGuardado] = useState<Documento | null>(null);

  // Abonar a un cargo que quedo debiendo (o parcial): se abre un
  // formulario chiquito justo debajo de esa fila, para no tener que
  // ir a otra pantalla a anotar que ya pago.
  const [abonandoCargoId, setAbonandoCargoId] = useState<string | null>(null);
  const [montoAbono, setMontoAbono] = useState(0);
  const [metodoAbono, setMetodoAbono] = useState<Payment["method"]>("efectivo");

  // Periodontograma: no hay "el estado actual" como en el odontograma,
  // sino una lista de examenes (uno por dia) y el que esta abierto ahora.
  const examenesPerio = usePeriodontogramas(id);
  const [examenPerioId, setExamenPerioId] = useState<string | null>(null);
  const examenPerio = usePeriodontograma(examenPerioId);
  const crearExamenPerio = useCrearPeriodontograma();
  const guardarDientePerio = useGuardarDientePerio();

  // El examen justo antes de este, para poder comparar como va el
  // paciente ("el sangrado bajo de 40% a 32%"). Puede no haber ninguno,
  // si este es el primer examen que se le hace.
  const indiceExamenActual = (examenesPerio.data ?? []).findIndex((e) => e.id === examenPerioId);
  const examenAnteriorResumen =
    indiceExamenActual >= 0 ? (examenesPerio.data ?? [])[indiceExamenActual + 1] : undefined;
  const examenPerioAnterior = usePeriodontograma(examenAnteriorResumen?.id ?? null);

  useEffect(() => {
    if (paciente.data) setForm(paciente.data);
  }, [paciente.data]);

  // Al entrar, se abre solo el examen mas reciente.
  useEffect(() => {
    if (examenPerioId === null && examenesPerio.data && examenesPerio.data.length > 0) {
      setExamenPerioId(examenesPerio.data[0]!.id);
    }
  }, [examenesPerio.data, examenPerioId]);

  // Abre un examen nuevo heredando piezas ausentes y furca del anterior,
  // para que la doctora no tenga que volver a marcarlas.
  async function nuevoExamenPerio() {
    const creado = await crearExamenPerio.mutateAsync({
      pacienteId: id,
      copiarDe: examenPerio.data?.dientes,
    });
    setExamenPerioId(creado.id);
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

  /**
   * Un solo paso: anota el procedimiento y, si tiene costo (monto > 0),
   * crea el cargo ya enlazado a esa nota. Si el monto queda en 0, se
   * guarda solo el procedimiento (por ejemplo una revision sin costo).
   */
  async function agregarProcedimiento(e: FormEvent) {
    e.preventDefault();
    if (!notaNueva.trim()) return;

    // Cuanto se pago en el momento, segun lo que se eligio arriba.
    // "Pagado" = todo, "Debe" = nada, "Parcial" = lo que se escribio.
    const pagadoAhora =
      montoCargo <= 0
        ? 0
        : estadoPagoCargo === "pagado"
          ? montoCargo
          : estadoPagoCargo === "parcial"
            ? montoPagadoCargo
            : 0;

    // "Notas adicionales" es opcional: si se llena, se le pega debajo a
    // lo principal para que en el Historial se lea todo junto, sin
    // necesitar una columna nueva en la base de datos.
    const notaCompleta = notasAdicionales.trim()
      ? `${notaNueva.trim()}\n${notasAdicionales.trim()}`
      : notaNueva.trim();

    try {
      const notaCreada = await agregarNota.mutateAsync({
        patientId: id,
        fecha: fechaNotaNueva,
        nota: notaCompleta,
      });

      // Se limpia antes de guardar: si este procedimiento no tiene pago,
      // no debe quedar pegado el comprobante de uno anterior.
      setComprobante(null);

      if (montoCargo > 0) {
        // El cargo siempre se registra por el monto completo del
        // tratamiento — eso sube el saldo. Si se pago algo en el momento,
        // se registra tambien como un cobro aparte, que lo vuelve a bajar.
        // El resultado neto es el saldo real que queda debiendo (si algo).
        const cargoCreado = await crearCargo.mutateAsync({
          patient_id: id,
          concepto: notaNueva.trim(),
          monto: montoCargo,
          fecha: fechaNotaNueva,
          nota_id: notaCreada.id,
        });
        if (pagadoAhora > 0) {
          await crearCobro.mutateAsync({
            patient_id: id,
            concept: `${notaNueva.trim()} (pago)`,
            method: metodoPagoCargo,
            amount: pagadoAhora,
            date: fechaNotaNueva,
            notes: "",
            cargo_id: cargoCreado.id,
          });
          setComprobante({
            tipo: "procedimiento",
            concepto: notaNueva.trim(),
            monto: pagadoAhora,
            metodo: metodoPagoCargo,
            fecha: fechaNotaNueva,
            saldoRestante: Math.max(0, montoCargo - pagadoAhora),
          });
        }
      }

      setNotaNueva("");
      setNotasAdicionales("");
      setFechaNotaNueva(hoyISO());
      setMontoCargo(0);
      setMontoPagadoCargo(0);
      setEstadoPagoCargo("pagado");
      await paciente.refetch();
      // No se manda para otra pestana sola: se le da la opcion de ir a
      // Historial a verlo, o directo a Odontograma por si ese
      // procedimiento hay que marcarlo ahi tambien (para que no se le
      // olvide a la secretaria).
      setProcedimientoGuardado(true);
    } catch {
      // El error se muestra abajo, junto al formulario.
    }
  }

  /**
   * Si lo que se escribio en "Que se hizo" coincide con un servicio de la
   * lista (por ejemplo, lo eligio de las sugerencias), rellena el precio
   * solo, para no tener que buscarlo aparte. Si ya habia un precio puesto
   * a mano, no se lo pisa.
   */
  function cambiarQueSeHizo(texto: string) {
    setNotaNueva(texto);
    setProcedimientoGuardado(false);
    if (montoCargo === 0) {
      const precio = precioPorNombreServicio.get(normalizar(texto));
      if (precio) setMontoCargo(precio);
    }
  }

  function cambiarTipoDocNuevo(tipo: TipoDocumento) {
    setTipoDocNuevo(tipo);
    setDocumentoGuardado(null);
    // Al pasar de receta a presupuesto el precio vuelve a tener sentido
    // (arranca en 0); al reves, se apaga poniendolo en null.
    setItemsDocNuevo((prev) =>
      prev.map((it) => ({ ...it, precio: tipo === "presupuesto" ? (it.precio ?? 0) : null })),
    );
  }

  function agregarLineaDoc() {
    setItemsDocNuevo((prev) => [
      ...prev,
      { concepto: "", precio: tipoDocNuevo === "presupuesto" ? 0 : null },
    ]);
  }

  function quitarLineaDoc(indice: number) {
    setItemsDocNuevo((prev) => prev.filter((_, i) => i !== indice));
  }

  function cambiarPrecioItemDoc(indice: number, precio: number) {
    setItemsDocNuevo((prev) => prev.map((it, i) => (i === indice ? { ...it, precio } : it)));
  }

  /**
   * Igual que cambiarQueSeHizo: si lo escrito coincide con un servicio de
   * la lista, rellena el precio solo (solo en un presupuesto, y solo si
   * no se habia puesto nada a mano todavia).
   */
  function cambiarConceptoItemDoc(indice: number, texto: string) {
    setItemsDocNuevo((prev) =>
      prev.map((it, i) => {
        if (i !== indice) return it;
        if (tipoDocNuevo !== "presupuesto" || (it.precio ?? 0) > 0) {
          return { ...it, concepto: texto };
        }
        const precioSugerido = precioPorNombreServicio.get(normalizar(texto));
        return { ...it, concepto: texto, precio: precioSugerido ?? it.precio };
      }),
    );
  }

  async function guardarDocumento(e: FormEvent) {
    e.preventDefault();
    const itemsValidos = itemsDocNuevo
      .map((it) => ({ ...it, concepto: it.concepto.trim() }))
      .filter((it) => it.concepto);
    if (itemsValidos.length === 0) return;

    const total =
      tipoDocNuevo === "presupuesto"
        ? itemsValidos.reduce((s, it) => s + Number(it.precio ?? 0), 0)
        : null;

    try {
      const creado = await crearDocumento.mutateAsync({
        patient_id: id,
        tipo: tipoDocNuevo,
        fecha: fechaDocNueva,
        items: itemsValidos,
        total,
        notas: notasDocNuevo.trim(),
      });
      descargarPDFDocumento({
        id: creado.id,
        tipo: creado.tipo,
        fecha: creado.fecha,
        pacienteNombre: p.name,
        items: creado.items,
        total: creado.total,
        notas: creado.notas,
        clinica: clinica.data ?? null,
      });
      setDocumentoGuardado(creado);
      setItemsDocNuevo([{ concepto: "", precio: tipoDocNuevo === "presupuesto" ? 0 : null }]);
      setNotasDocNuevo("");
      setFechaDocNueva(hoyISO());
    } catch {
      // El error se muestra abajo, junto al formulario.
    }
  }

  /** Para volver a bajar un documento que ya se habia generado antes. */
  function descargarDocumentoDeNuevo(docu: Documento) {
    descargarPDFDocumento({
      id: docu.id,
      tipo: docu.tipo,
      fecha: docu.fecha,
      pacienteNombre: p.name,
      items: docu.items,
      total: docu.total,
      notas: docu.notas,
      clinica: clinica.data ?? null,
    });
  }

  function abrirAbono(cargoId: string, sugerido: number) {
    setAbonandoCargoId(cargoId);
    setMontoAbono(sugerido);
    setMetodoAbono("efectivo");
    setComprobante(null);
    crearCobro.reset();
  }

  function cerrarAbono() {
    setAbonandoCargoId(null);
    setMontoAbono(0);
  }

  // Anota que un cargo que quedo debiendo (total o en parte) ya se
  // termino de pagar, o se pago algo mas. No edita el cargo original —
  // agrega un cobro nuevo atado a el, igual que todo lo demas en el
  // sistema: nada se sobrescribe, se va acumulando.
  async function registrarAbono(
    e: FormEvent,
    cargo: { id: string; concepto: string },
    restanteAntes: number,
  ) {
    e.preventDefault();
    if (montoAbono <= 0) return;
    try {
      await crearCobro.mutateAsync({
        patient_id: id,
        concept: `${cargo.concepto} (abono)`,
        method: metodoAbono,
        amount: montoAbono,
        date: hoyISO(),
        notes: "",
        cargo_id: cargo.id,
      });
      setComprobante({
        tipo: "abono",
        concepto: cargo.concepto,
        monto: montoAbono,
        metodo: metodoAbono,
        fecha: hoyISO(),
        saldoRestante: Math.max(0, restanteAntes - montoAbono),
      });
      cerrarAbono();
      await paciente.refetch();
    } catch {
      // El error se muestra en el formulario del abono.
    }
  }

  function pintar(r: AccionDiente) {
    registrar.mutate({
      patient_id: id,
      tooth: r.diente,
      surface: r.cara,
      condition: r.estado,
      planned: r.planificado,
      notes: r.notas ?? "",
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
      <div className="space-y-4">
        <Link to="/pacientes">
          <Button variant="outline">
            <ArrowLeft /> Volver a Pacientes
          </Button>
        </Link>
        <div className="rounded-xl bg-danger-soft px-4 py-8 text-center">
          <TriangleAlert className="mx-auto size-6 text-danger" />
          <p className="mt-2 font-semibold text-danger">No se encontró este paciente</p>
          <p className="mt-1 text-sm text-danger/80">
            {paciente.error?.message ?? "Puede que lo hayan borrado."}
          </p>
        </div>
      </div>
    );
  }

  const p = paciente.data;
  const edad = edadDesde(p.birth_date);
  const nombreClinica = clinica.data?.name?.trim() ?? "";
  const listaCitas = citas.data ?? [];
  const listaCobros = cobros.data ?? [];
  const totalCobrado = listaCobros.reduce((s, c) => s + Number(c.amount), 0);
  const listaCargos = cargos.data ?? [];
  const listaNotas = notas.data ?? [];
  // Para mostrar "este cargo es por tal procedimiento" sin pedirlo de nuevo al servidor.
  const notaPorId = new Map(listaNotas.map((n) => [n.id, n]));
  // Y al reves: "este procedimiento ya tiene un cargo hecho" (el primero que lo referencie).
  const cargoPorNotaId = new Map(
    listaCargos.filter((c) => c.nota_id).map((c) => [c.nota_id as string, c]),
  );

  // Servicios de la clinica, para sugerirlos en "Que se hizo" y no tener
  // que escribirlos a mano cada vez. "normalizar" quita tildes/mayusculas
  // para que coincida aunque se escriba distinto a como esta guardado.
  const listaServicios = (servicios.data ?? []).filter((s) => s.active);
  const precioPorNombreServicio = new Map(
    listaServicios.map((s) => [normalizar(s.name), Number(s.price)]),
  );

  const pestanas: { key: Pestana; label: string; icono: typeof FileText }[] = [
    { key: "ficha", label: "Ficha", icono: FileText },
    { key: "procedimientos", label: "Procedimientos", icono: Plus },
    { key: "odontograma", label: "Odontograma", icono: Check },
    { key: "periodontograma", label: "Periodontograma", icono: Activity },
    { key: "historial", label: "Historial", icono: CalendarDays },
    { key: "documentos", label: "Documentos", icono: Receipt },
  ];

  return (
    <div className="space-y-4">
      <Link to="/pacientes" className="inline-block">
        <Button variant="ghost" size="sm">
          <ArrowLeft /> Pacientes
        </Button>
      </Link>

      {/* Cabecera del paciente */}
      {/* En pantallas estrechas los botones bajan a su propia fila: si no,
          le roban el ancho al nombre y este parte en dos lineas. */}
      <div className="surface grid gap-4 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="flex min-w-0 items-center gap-4">
          <InitialsAvatar name={p.name} className="size-14 text-lg" />
          <div className="min-w-0">
            <h1 className="text-[24px] font-bold leading-tight tracking-tight sm:text-[28px]">
              {p.name}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              {p.file_number && <span className="font-medium">Ficha #{p.file_number}</span>}
              {edad !== null && <span>{edad} años</span>}
              {p.phone && <TelefonoWhatsApp telefono={p.phone} />}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          {Number(p.balance) > 0 && <Pill tone="warning">Debe {formatDOP(Number(p.balance))}</Pill>}
          <Pill tone={tonoEstado[p.status]}>{textoEstado[p.status]}</Pill>
          {enlaceLlamada(p.phone) && (
            <a
              href={enlaceLlamada(p.phone) ?? undefined}
              title={`Llamar a ${p.phone}`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border-strong bg-card px-4 text-sm font-semibold transition-colors hover:border-primary/40 hover:bg-primary-soft/50"
            >
              <Phone className="size-4" /> Llamar
            </a>
          )}
          <BotonWhatsApp telefono={p.phone} mensaje={saludo(p.name, nombreClinica)} />
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
              <Field label="Número de ficha">
                <TextInput
                  value={form.file_number ?? ""}
                  onChange={(e) => cambiar("file_number", e.target.value)}
                  placeholder="0847"
                />
              </Field>
            </FormGrid>

            <FormGrid>
              <Field label="Teléfono">
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

      {/* ---------- PROCEDIMIENTOS (formulario para anotar algo nuevo) ---------- */}
      {pestana === "procedimientos" && (
        <Section title="Nuevo procedimiento">
          <p className="mb-3 text-sm text-muted-foreground">
            Anota qué se le hizo al paciente. Si tiene costo, se cobra en el mismo paso — no hace
            falta anotarlo dos veces. Lo que guardes aquí se va a ver en "Historial".
          </p>
          <form onSubmit={agregarProcedimiento} className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Qué se hizo
                </label>
                <TextInput
                  value={notaNueva}
                  onChange={(e) => cambiarQueSeHizo(e.target.value)}
                  placeholder="Ej: Limpieza dental, extracción del 26..."
                  list="lista-servicios-procedimiento"
                  autoComplete="off"
                />
                {/* Sugerencias con los servicios ya cargados en "Servicios",
                    para no tener que escribirlos de nuevo — pero se puede
                    seguir escribiendo lo que sea, no es obligatorio elegir. */}
                <datalist id="lista-servicios-procedimiento">
                  {listaServicios.map((s) => (
                    <option key={s.id} value={s.name} />
                  ))}
                </datalist>
              </div>
              <div className="sm:w-40">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Fecha
                </label>
                <TextInput
                  type="date"
                  value={fechaNotaNueva}
                  onChange={(e) => setFechaNotaNueva(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Notas adicionales (opcional)
              </label>
              <TextArea
                value={notasAdicionales}
                onChange={(e) => setNotasAdicionales(e.target.value)}
                placeholder="Detalles, observaciones, material usado, como quedo el paciente..."
                rows={3}
              />
            </div>

            <FormGrid className="sm:grid-cols-[1fr_1fr]">
              <Field label="Precio en RD$" hint="Déjalo en 0 si no se cobra nada por esto.">
                <TextInput
                  type="number"
                  min={0}
                  step={1}
                  value={String(montoCargo)}
                  onChange={(e) => setMontoCargo(Number(e.target.value))}
                />
              </Field>
              {montoCargo > 0 && estadoPagoCargo === "parcial" && (
                <Field label="Cuánto pagó ahora, en RD$">
                  <TextInput
                    type="number"
                    min={0}
                    step={1}
                    value={String(montoPagadoCargo)}
                    onChange={(e) => setMontoPagadoCargo(Number(e.target.value))}
                  />
                </Field>
              )}
            </FormGrid>

            {montoCargo > 0 && (
              <>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    ¿Cómo quedó el pago?
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        ["pagado", "Pagó todo"],
                        ["parcial", "Pagó parte"],
                        ["debe", "Debe todo"],
                      ] as const
                    ).map(([valor, etiqueta]) => (
                      <button
                        key={valor}
                        type="button"
                        onClick={() => setEstadoPagoCargo(valor)}
                        className={cn(
                          "h-9 shrink-0 rounded-lg border px-3.5 text-sm font-medium transition-colors",
                          estadoPagoCargo === valor
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border-strong bg-card text-muted-foreground hover:border-primary/40 hover:text-primary",
                        )}
                      >
                        {etiqueta}
                      </button>
                    ))}
                  </div>
                </div>
                <Field label="Forma de pago">
                  <SelectInput
                    value={metodoPagoCargo}
                    onChange={(e) => setMetodoPagoCargo(e.target.value as Payment["method"])}
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="seguro">Seguro</option>
                  </SelectInput>
                </Field>
              </>
            )}

            <Button
              type="submit"
              disabled={
                agregarNota.isPending ||
                crearCargo.isPending ||
                crearCobro.isPending ||
                !notaNueva.trim() ||
                (montoCargo > 0 &&
                  estadoPagoCargo === "parcial" &&
                  (montoPagadoCargo <= 0 || montoPagadoCargo >= montoCargo))
              }
              className="self-start"
            >
              {agregarNota.isPending || crearCargo.isPending || crearCobro.isPending
                ? "Agregando..."
                : "Agregar al historial"}
            </Button>
          </form>
          {(agregarNota.isError || crearCargo.isError || crearCobro.isError) && (
            <p role="alert" className="mt-2 text-sm text-danger">
              {agregarNota.error?.message ?? crearCargo.error?.message ?? crearCobro.error?.message}
            </p>
          )}

          {/* Atajo justo despues de guardar: facil que a la secretaria se
              le olvide marcarlo tambien en el Odontograma si no se lo
              recordamos aqui mismo, recien hecho. */}
          {procedimientoGuardado && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-success-soft px-4 py-3 text-sm text-success">
              <Check className="size-4 shrink-0" />
              <span>Procedimiento guardado.</span>
              <div className="ml-auto flex flex-wrap gap-2">
                {comprobante?.tipo === "procedimiento" && (
                  <BotonWhatsApp
                    telefono={p.phone}
                    size="sm"
                    etiqueta="Enviar comprobante"
                    mensaje={mensajeComprobante(
                      p.name,
                      nombreClinica,
                      comprobante.concepto,
                      formatDOP(comprobante.monto),
                      comprobante.metodo,
                      formatShortDate(comprobante.fecha),
                      comprobante.saldoRestante > 0 ? formatDOP(comprobante.saldoRestante) : null,
                    )}
                  />
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPestana("historial")}
                >
                  Ver en Historial
                </Button>
                <Button type="button" size="sm" onClick={() => setPestana("odontograma")}>
                  Agregar al odontograma
                </Button>
              </div>
            </div>
          )}
        </Section>
      )}

      {/* ---------- ODONTOGRAMA ---------- */}
      {pestana === "odontograma" && (
        <Section title="Odontograma">
          {historialOdonto.isPending ? (
            <div className="h-64 animate-pulse rounded-xl bg-muted" aria-hidden />
          ) : historialOdonto.isError ? (
            <div className="rounded-xl bg-danger-soft px-4 py-6 text-center">
              <TriangleAlert className="mx-auto size-6 text-danger" />
              <p className="mt-2 text-sm text-danger">{historialOdonto.error.message}</p>
              <p className="mt-2 text-xs text-danger/80">
                Si dice que falta una columna o una tabla, es que no se ha corrido alguna migracion
                del odontograma en Supabase.
              </p>
            </div>
          ) : (
            <>
              <Odontograma historial={historialOdonto.data ?? []} onPintar={pintar} />
              {registrar.isError && (
                <p role="alert" className="mt-3 text-sm text-danger">
                  {registrar.error.message}
                </p>
              )}
              <div className="mt-3 border-t border-dashed border-border pt-3">
                <LeyendaOdontograma />
              </div>
            </>
          )}
        </Section>
      )}

      {/* ---------- PERIODONTOGRAMA ---------- */}
      {pestana === "periodontograma" && (
        <Section title="Periodontograma">
          {examenesPerio.isPending ? (
            <div className="h-64 animate-pulse rounded-xl bg-muted" aria-hidden />
          ) : examenesPerio.isError ? (
            <div className="rounded-xl bg-danger-soft px-4 py-6 text-center">
              <TriangleAlert className="mx-auto size-6 text-danger" />
              <p className="mt-2 text-sm text-danger">{examenesPerio.error.message}</p>
              <p className="mt-2 text-xs text-danger/80">
                Si dice que falta una tabla, es que no se ha corrido la migración del
                periodontograma en Supabase.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {(examenesPerio.data ?? []).map((ex) => (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => setExamenPerioId(ex.id)}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                      examenPerioId === ex.id
                        ? "border-primary bg-primary-soft text-primary-soft-foreground"
                        : "border-border-strong bg-card text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {formatShortDate(ex.fecha)}
                  </button>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void nuevoExamenPerio()}
                  disabled={crearExamenPerio.isPending}
                >
                  {crearExamenPerio.isPending ? "Creando..." : "+ Nuevo examen"}
                </Button>
              </div>

              {crearExamenPerio.isError && (
                <p role="alert" className="text-sm text-danger">
                  {crearExamenPerio.error.message}
                </p>
              )}

              {(examenesPerio.data?.length ?? 0) === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Este paciente todavía no tiene ningún examen periodontal. Dale a "Nuevo examen"
                  para empezar el primero.
                </p>
              ) : examenPerio.isPending ? (
                <div className="h-64 animate-pulse rounded-xl bg-muted" aria-hidden />
              ) : examenPerio.data ? (
                <>
                  <IndicesPeriodontal
                    dientes={examenPerio.data.dientes}
                    fecha={examenPerio.data.examen.fecha}
                    dientesAnterior={examenPerioAnterior.data?.dientes}
                    fechaAnterior={examenAnteriorResumen?.fecha}
                  />

                  <div className="my-5 border-t border-dashed border-border-strong" />

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">
                      Vista para explicarle al paciente
                    </h3>
                    <GraficoPeriodontal
                      examenId={examenPerio.data.examen.id}
                      dientes={examenPerio.data.dientes}
                    />
                  </div>

                  <div className="my-5 border-t border-dashed border-border-strong" />

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">
                      Rejilla de captura — donde se llenan los números
                    </h3>
                    <Periodontograma
                      examenId={examenPerio.data.examen.id}
                      dientes={examenPerio.data.dientes}
                      onGuardarDiente={(fila) => guardarDientePerio.mutate(fila)}
                    />
                  </div>
                  {guardarDientePerio.isError && (
                    <p role="alert" className="mt-3 text-sm text-danger">
                      {guardarDientePerio.error.message}
                    </p>
                  )}
                </>
              ) : null}
            </div>
          )}
        </Section>
      )}

      {/* ---------- HISTORIAL ---------- */}
      {pestana === "historial" && (
        <div className="space-y-4">
          <Section title="Procedimientos">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                La historia de lo que se le ha ido haciendo al paciente, visita tras visita.
              </p>
              <Button
                type="button"
                size="sm"
                className="shrink-0"
                onClick={() => {
                  setProcedimientoGuardado(false);
                  setPestana("procedimientos");
                }}
              >
                <Plus /> Nuevo procedimiento
              </Button>
            </div>

            <div className="border-t border-border pt-4">
              {notas.isPending ? (
                <div className="h-20 animate-pulse rounded-xl bg-muted" aria-hidden />
              ) : listaNotas.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Todavía no hay ningún procedimiento anotado. Se van a ir acumulando aquí, con
                  fecha, a medida que agregues.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {listaNotas.map((n) => (
                    <li key={n.id} className="flex items-start gap-3 py-3">
                      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                        <ClipboardList className="size-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="whitespace-pre-line text-[15px] leading-snug">{n.nota}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatShortDate(n.fecha)}
                        </p>
                        {cargoPorNotaId.has(n.id) && (
                          <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary">
                            <Wallet className="size-3 shrink-0" /> Cargo de{" "}
                            {formatDOP(Number(cargoPorNotaId.get(n.id)!.monto))}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Section>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <Section title="Citas">
              {citas.isPending ? (
                <div className="h-24 animate-pulse rounded-xl bg-muted" aria-hidden />
              ) : listaCitas.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Este paciente todavía no tiene citas.
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
                      {/* Solo en las que aun no han pasado: recordar algo ya hecho no sirve. */}
                      {c.date >= hoyISO() &&
                        (c.status === "confirmada" || c.status === "pendiente") && (
                          <BotonWhatsApp
                            telefono={p.phone}
                            size="sm"
                            etiqueta="Recordar"
                            mensaje={mensajeRecordatorio(
                              p.name,
                              nombreClinica,
                              formatShortDate(c.date),
                              c.time.slice(0, 5),
                            )}
                          />
                        )}
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Cargos">
              <p className="mb-3 text-sm text-muted-foreground">
                Lo que se le ha ido cobrando al paciente, uno por cada procedimiento. Se agregan
                desde "Procedimientos" — aquí solo se ven y, si algo quedó a deber, se abona.
              </p>

              {comprobante?.tipo === "abono" && (
                <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-success-soft px-4 py-3 text-sm text-success">
                  <Check className="size-4 shrink-0" />
                  <span>Abono registrado.</span>
                  <div className="ml-auto flex flex-wrap items-center gap-2">
                    <BotonWhatsApp
                      telefono={p.phone}
                      size="sm"
                      etiqueta="Enviar comprobante"
                      mensaje={mensajeComprobante(
                        p.name,
                        nombreClinica,
                        comprobante.concepto,
                        formatDOP(comprobante.monto),
                        comprobante.metodo,
                        formatShortDate(comprobante.fecha),
                        comprobante.saldoRestante > 0 ? formatDOP(comprobante.saldoRestante) : null,
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setComprobante(null)}
                    >
                      Cerrar
                    </Button>
                  </div>
                </div>
              )}

              <div className="border-t border-border pt-2">
                {listaCargos.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    Sin cargos registrados.
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {listaCargos.map((c) => {
                      // Cuanto se le ha abonado a ESTE cargo en concreto
                      // (puede haber sido en el momento, o despues con
                      // "Abonar"). Lo que sobra del monto es lo que falta.
                      const pagadoDelCargo = listaCobros
                        .filter((cobro) => cobro.cargo_id === c.id)
                        .reduce((s, cobro) => s + Number(cobro.amount), 0);
                      const restante = Math.max(0, Number(c.monto) - pagadoDelCargo);
                      const estaPagado = restante <= 0;

                      return (
                        <li key={c.id} className="py-3">
                          <div className="flex items-center gap-3">
                            <span
                              className={cn(
                                "grid size-8 shrink-0 place-items-center rounded-full",
                                estaPagado
                                  ? "bg-success-soft text-success"
                                  : "bg-warning-soft text-warning",
                              )}
                            >
                              <Wallet className="size-3.5" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{c.concepto}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {formatShortDate(c.fecha)}
                                {c.nota_id && notaPorId.has(c.nota_id) && (
                                  <> · {notaPorId.get(c.nota_id)!.nota}</>
                                )}
                              </p>
                            </div>
                            <p className="shrink-0 text-sm font-semibold tabular-nums">
                              {formatDOP(Number(c.monto))}
                            </p>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 pl-11">
                            <p
                              className={cn(
                                "text-xs font-medium",
                                estaPagado
                                  ? "text-success"
                                  : pagadoDelCargo > 0
                                    ? "text-warning"
                                    : "text-danger",
                              )}
                            >
                              {estaPagado
                                ? "Pagado"
                                : pagadoDelCargo > 0
                                  ? `Abonó ${formatDOP(pagadoDelCargo)} · debe ${formatDOP(restante)}`
                                  : `Debe ${formatDOP(restante)}`}
                            </p>
                            {!estaPagado && abonandoCargoId !== c.id && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => abrirAbono(c.id, restante)}
                              >
                                Abonar
                              </Button>
                            )}
                          </div>

                          {abonandoCargoId === c.id && (
                            <form
                              onSubmit={(e) => void registrarAbono(e, c, restante)}
                              className="mt-3 flex flex-col gap-3 rounded-xl bg-muted/60 p-3"
                            >
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                    Monto abonado, en RD$
                                  </label>
                                  <TextInput
                                    type="number"
                                    min={0}
                                    step={1}
                                    value={String(montoAbono)}
                                    onChange={(e) => setMontoAbono(Number(e.target.value))}
                                    autoFocus
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                                    Forma de pago
                                  </label>
                                  <SelectInput
                                    value={metodoAbono}
                                    onChange={(e) =>
                                      setMetodoAbono(e.target.value as Payment["method"])
                                    }
                                  >
                                    <option value="efectivo">Efectivo</option>
                                    <option value="tarjeta">Tarjeta</option>
                                    <option value="transferencia">Transferencia</option>
                                    <option value="seguro">Seguro</option>
                                  </SelectInput>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  type="submit"
                                  size="sm"
                                  disabled={crearCobro.isPending || montoAbono <= 0}
                                >
                                  {crearCobro.isPending ? "Guardando..." : "Confirmar"}
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={cerrarAbono}
                                >
                                  Cancelar
                                </Button>
                              </div>
                            </form>
                          )}
                          {abonandoCargoId === c.id && crearCobro.isError && (
                            <p role="alert" className="mt-2 text-sm text-danger">
                              {crearCobro.error.message}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
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
        </div>
      )}

      {/* ---------- DOCUMENTOS ---------- */}
      {pestana === "documentos" && (
        <Section title="Documentos">
          <p className="mb-3 text-sm text-muted-foreground">
            Presupuestos y recetas con los datos de la clínica, listos para imprimir o mandar por
            WhatsApp en PDF.
          </p>

          <form
            onSubmit={(e) => void guardarDocumento(e)}
            className="flex flex-col gap-3 rounded-xl bg-muted/40 p-3 sm:p-4"
          >
            <div className="flex flex-wrap gap-1.5">
              {(["presupuesto", "receta"] as const).map((valor) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() => cambiarTipoDocNuevo(valor)}
                  className={cn(
                    "h-9 shrink-0 rounded-lg border px-3.5 text-sm font-medium transition-colors",
                    tipoDocNuevo === valor
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border-strong bg-card text-muted-foreground hover:border-primary/40 hover:text-primary",
                  )}
                >
                  {valor === "presupuesto" ? "Presupuesto" : "Receta"}
                </button>
              ))}
            </div>

            <Field label="Fecha" className="max-w-[200px]">
              <TextInput
                type="date"
                value={fechaDocNueva}
                onChange={(e) => setFechaDocNueva(e.target.value)}
              />
            </Field>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-muted-foreground">
                {tipoDocNuevo === "presupuesto" ? "Conceptos y precios" : "Indicaciones"}
              </label>
              {itemsDocNuevo.map((item, i) => (
                <div key={i} className="flex gap-2">
                  <TextInput
                    className="min-w-0 flex-1"
                    value={item.concepto}
                    onChange={(e) => cambiarConceptoItemDoc(i, e.target.value)}
                    placeholder={
                      tipoDocNuevo === "presupuesto"
                        ? "Ej: Limpieza dental"
                        : "Ej: Amoxicilina 500mg, cada 8h por 7 días"
                    }
                    list={tipoDocNuevo === "presupuesto" ? "servicios-doc" : undefined}
                  />
                  {tipoDocNuevo === "presupuesto" && (
                    <TextInput
                      type="number"
                      min={0}
                      step={1}
                      className="w-28 shrink-0"
                      value={String(item.precio ?? 0)}
                      onChange={(e) => cambiarPrecioItemDoc(i, Number(e.target.value))}
                    />
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => quitarLineaDoc(i)}
                    disabled={itemsDocNuevo.length === 1}
                    aria-label="Quitar línea"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              {tipoDocNuevo === "presupuesto" && (
                <datalist id="servicios-doc">
                  {listaServicios.map((s) => (
                    <option key={s.id} value={s.name} />
                  ))}
                </datalist>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                onClick={agregarLineaDoc}
              >
                <Plus /> Agregar línea
              </Button>
            </div>

            {tipoDocNuevo === "presupuesto" && (
              <p className="text-right text-sm font-semibold">
                Total: {formatDOP(itemsDocNuevo.reduce((s, it) => s + Number(it.precio ?? 0), 0))}
              </p>
            )}

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Notas (opcional)
              </label>
              <TextArea
                value={notasDocNuevo}
                onChange={(e) => setNotasDocNuevo(e.target.value)}
                rows={2}
              />
            </div>

            <Button
              type="submit"
              className="self-start"
              disabled={
                crearDocumento.isPending || itemsDocNuevo.every((it) => !it.concepto.trim())
              }
            >
              {crearDocumento.isPending ? "Generando..." : "Guardar y generar PDF"}
            </Button>
            {crearDocumento.isError && (
              <p role="alert" className="text-sm text-danger">
                {crearDocumento.error.message}
              </p>
            )}
          </form>

          {documentoGuardado && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-success-soft px-4 py-3 text-sm text-success">
              <Check className="size-4 shrink-0" />
              <span>
                {documentoGuardado.tipo === "presupuesto" ? "Presupuesto" : "Receta"} guardado y PDF
                descargado.
              </span>
              <div className="ml-auto flex flex-wrap gap-2">
                <BotonWhatsApp
                  telefono={p.phone}
                  size="sm"
                  etiqueta="Enviar por WhatsApp"
                  mensaje={mensajeDocumento(
                    p.name,
                    nombreClinica,
                    documentoGuardado.tipo,
                    formatShortDate(documentoGuardado.fecha),
                  )}
                />
              </div>
            </div>
          )}

          <div className="mt-5 border-t border-border pt-4">
            <h3 className="mb-2 text-sm font-semibold">Documentos anteriores</h3>
            {documentos.isPending ? (
              <div className="h-16 animate-pulse rounded-xl bg-muted" aria-hidden />
            ) : (documentos.data ?? []).length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Todavía no se ha generado ningún documento.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {(documentos.data ?? []).map((docu) => (
                  <li key={docu.id} className="flex flex-wrap items-center gap-3 py-3">
                    <Pill tone={docu.tipo === "presupuesto" ? "info" : "success"}>
                      {docu.tipo === "presupuesto" ? "Presupuesto" : "Receta"}
                    </Pill>
                    <p className="min-w-0 flex-1 text-sm">{formatShortDate(docu.fecha)}</p>
                    {docu.total !== null && (
                      <p className="text-sm font-semibold tabular-nums">{formatDOP(docu.total)}</p>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => descargarDocumentoDeNuevo(docu)}
                    >
                      <Download className="size-4" /> PDF
                    </Button>
                    <BotonWhatsApp
                      telefono={p.phone}
                      size="sm"
                      etiqueta="WhatsApp"
                      mensaje={mensajeDocumento(
                        p.name,
                        nombreClinica,
                        docu.tipo,
                        formatShortDate(docu.fecha),
                      )}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Section>
      )}
    </div>
  );
}
