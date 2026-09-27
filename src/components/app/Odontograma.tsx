// Odontograma: el dibujo de la boca con el estado de cada diente.
//
// Como se usa: se hace clic en un diente, queda seleccionado y se abre el
// panel lateral con su informacion. TODO lo que se registra se registra
// desde ese panel: superficie, estado, existente o planificado, notas.
//
// El dibujo principal es solo para VER: cada pieza se dibuja con su forma
// anatomica real (incisivo, canino, premolar, molar de abajo con dos raices
// y molar de arriba con tres) y encima lleva las marcas de lo que tiene.
// No hay rejillas ni cuadros: la rejilla de superficies vive en el panel.
import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  History,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  Plus as PlusIcon,
  Redo2,
  Undo2,
  X,
} from "lucide-react";
import type { OdontogramEntry } from "@/lib/database.types";
import {
  ESTADOS,
  ESTADO_POR_CLAVE,
  NOMBRE_CARA,
  PERMANENTES,
  SEVERIDAD,
  TEMPORALES,
  carasDelDiente,
  esAnterior,
  esArribaEl,
  nombreDelDiente,
  tipoDiente,
  type Cara,
  type Estado,
} from "@/lib/odontograma";
import { ASSETS_DIENTES, DEFS_DIENTES, type ClaveAsset } from "@/lib/dientes-anatomicos";
import { Button } from "@/components/app/ui";
import { Modal } from "@/components/app/form";
import { formatShortDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

/** Lo que se manda a guardar cuando se registra (o se deshace) un cambio. */
export interface AccionDiente {
  diente: string;
  cara: Cara;
  estado: Estado;
  /** true = tratamiento planificado (aun no hecho). */
  planificado: boolean;
  notas?: string;
}

/** La clave con que se identifica un registro: diente + cara + si es plan o real. */
const clave = (diente: string, cara: Cara, planificado: boolean) =>
  `${diente}:${cara}:${planificado ? "plan" : "real"}`;

/* ---------------------------------------------------------------
   QUE DIBUJO LE TOCA A CADA PIEZA

   Los dibujos son ilustraciones anatomicas de verdad (ver
   src/lib/dientes-anatomicos.ts). Un premolar de arriba tiene dos
   raices y el de abajo una; un molar de arriba tres y el de abajo dos.

   Vienen con la corona hacia ABAJO y la raiz hacia arriba, que es la
   posicion de las piezas de arriba. Para la arcada de abajo se
   voltean, igual que en la boca.
   --------------------------------------------------------------- */

function assetDe(diente: string): ClaveAsset {
  const tipo = tipoDiente(diente);
  const arriba = esArribaEl(diente);
  if (tipo === "incisivo") return "incisivo";
  if (tipo === "canino") return "canino";
  if (tipo === "premolar") return arriba ? "premolarSuperior" : "premolarInferior";
  return arriba ? "molarSuperior" : "molarInferior";
}

/* ---------------------------------------------------------------
   LA ENCIA

   Es una banda propia, no la del set de dibujos: asi queda igual de
   alta en todas las piezas y se une con la de al lado formando una
   linea continua, con la papila entre diente y diente.

   Se dibuja DETRAS del diente, a la altura del cuello de cada pieza
   (por eso cada asset guarda su `cuello`): asi la corona queda fuera
   de la encia y la raiz dentro, como en la boca.
   --------------------------------------------------------------- */

const ENCIA_ANCHO = 100;
const ENCIA_ALTO = 40;

/** Banda de encia: borde recto arriba y festoneado abajo. */
const ENCIA_PATH =
  `M0,0 L${ENCIA_ANCHO},0 L${ENCIA_ANCHO},${ENCIA_ALTO * 0.95} ` +
  `C${ENCIA_ANCHO * 0.8},${ENCIA_ALTO * 0.95} ${ENCIA_ANCHO * 0.72},${ENCIA_ALTO * 0.16} ` +
  `${ENCIA_ANCHO * 0.5},${ENCIA_ALTO * 0.16} ` +
  `C${ENCIA_ANCHO * 0.28},${ENCIA_ALTO * 0.16} ${ENCIA_ANCHO * 0.2},${ENCIA_ALTO * 0.95} ` +
  `0,${ENCIA_ALTO * 0.95} Z`;

function Encia({ ancho, alto, arriba }: { ancho: number; alto: number; arriba: boolean }) {
  return (
    <svg
      viewBox={`0 0 ${ENCIA_ANCHO} ${ENCIA_ALTO}`}
      width={ancho}
      height={alto}
      preserveAspectRatio="none"
      aria-hidden
      className="block"
    >
      <g transform={arriba ? undefined : `translate(0,${ENCIA_ALTO}) scale(1,-1)`}>
        <path d={ENCIA_PATH} fill="var(--odo-encia)" />
        <path
          d={`M0,${ENCIA_ALTO * 0.95} C${ENCIA_ANCHO * 0.2},${ENCIA_ALTO * 0.95} ${ENCIA_ANCHO * 0.28},${ENCIA_ALTO * 0.16} ${ENCIA_ANCHO * 0.5},${ENCIA_ALTO * 0.16} C${ENCIA_ANCHO * 0.72},${ENCIA_ALTO * 0.16} ${ENCIA_ANCHO * 0.8},${ENCIA_ALTO * 0.95} ${ENCIA_ANCHO},${ENCIA_ALTO * 0.95}`}
          fill="none"
          stroke="var(--odo-encia-borde)"
          strokeWidth={1.4}
        />
      </g>
    </svg>
  );
}

/* ---------------------------------------------------------------
   QUE CAPAS SE ENCIENDEN PARA CADA ESTADO

   Cada dibujo trae sus capas: diente sano, diente de leche, caries por
   cara, obturacion, corona, endodoncia, implante, protesis, fractura y
   extraccion. Aqui se decide cuales se dibujan encima del diente.

   Las capas de cara dependen de DONDE se dibuja esa cara, no de su
   nombre anatomico: la zona izquierda del dibujo usa la capa que el
   dibujo pinta a la izquierda, sea mesial o distal segun el cuadrante.
   --------------------------------------------------------------- */

type Zona = "arriba" | "abajo" | "izquierda" | "derecha" | "centro";

const CARIES_POR_ZONA: Record<Zona, string> = {
  izquierda: "caries-distal",
  derecha: "caries-mesial",
  centro: "caries-occlusal",
  arriba: "caries-1",
  abajo: "caries-2",
};

const RELLENO_POR_ZONA: Record<Zona, number> = {
  centro: 0,
  arriba: 1,
  abajo: 1,
  izquierda: 2,
  derecha: 3,
};

/** Una capa a dibujar: el markup y de que color va. */
interface CapaPintada {
  markup: string;
  color?: string | undefined;
}

function capasDeCara(capas: Record<string, string>, zona: Zona, estado: Estado): CapaPintada[] {
  const info = ESTADO_POR_CLAVE[estado];
  if (estado === "sano" || info.dienteCompleto) return [];

  if (estado === "caries") {
    const m = capas[CARIES_POR_ZONA[zona]];
    return m ? [{ markup: m }] : [];
  }
  const i = RELLENO_POR_ZONA[zona];
  const familia = estado === "sellante" ? "gic" : "composite";
  const m = capas[`${familia}-${i}`] ?? capas[`${familia}-0`];
  return m ? [{ markup: m, color: info.color }] : [];
}

function capasDeDiente(capas: Record<string, string>, estado: Estado): CapaPintada[] {
  const info = ESTADO_POR_CLAVE[estado];
  const c = (n: string, color?: string): CapaPintada[] => {
    const m = capas[n];
    return m ? [{ markup: m, color }] : [];
  };
  switch (estado) {
    case "corona":
      return c("zircon-1", info.color);
    case "endodoncia":
      return c("endos");
    case "implante":
      return [...c("implant-base"), ...c("implant")];
    case "protesis":
      return c("prosthesis-1", info.color);
    case "fractura":
      return c("fracture-vertical", info.color);
    case "extraccion_indicada":
      return c("extraction-plan", info.color);
    default:
      return [];
  }
}

function Capas({ capas }: { capas: CapaPintada[] }) {
  return (
    <>
      {capas.map((c, i) => (
        <g
          key={i}
          style={c.color ? { color: c.color } : undefined}
          dangerouslySetInnerHTML={{ __html: c.markup }}
        />
      ))}
    </>
  );
}

interface PropsDiente {
  numero: string;
  actual: (diente: string, cara: Cara, planificado: boolean) => Estado;
  escala: number;
  seleccionado: string | null;
  onSeleccionar: (diente: string) => void;
}

function Diente({ numero, actual, escala, seleccionado, onSeleccionar }: PropsDiente) {
  const caras = carasDelDiente(numero);
  const arriba = esArribaEl(numero);
  const temporal = Number(numero[0]) >= 5;
  const asset = ASSETS_DIENTES[assetDe(numero)];
  const capas = asset.capas;

  const completoReal = actual(numero, "completo", false);
  const completoPlan = actual(numero, "completo", true);
  const ausente = completoReal === "ausente";
  const implante = completoReal === "implante";
  const seleccionadoAqui = seleccionado === numero;

  const zonas: { zona: Zona; cara: Cara }[] = [
    { zona: "arriba", cara: caras.arriba },
    { zona: "abajo", cara: caras.abajo },
    { zona: "izquierda", cara: caras.izquierda },
    { zona: "derecha", cara: caras.derecha },
    { zona: "centro", cara: caras.centro },
  ];

  const todasLasCaras: Cara[] = ["completo", ...zonas.map((z) => z.cara)];
  /** El hallazgo mas grave de la pieza: manda en la vista estándar. */
  const peor = todasLasCaras.reduce<Estado>((acc, c) => {
    const e = actual(numero, c, false);
    return SEVERIDAD[e] > SEVERIDAD[acc] ? e : acc;
  }, "sano");

  // Lo que el diente ya tiene.
  const reales: CapaPintada[] = [];
  if (!ausente && !implante) {
    const base = temporal ? (capas["milktooth"] ?? capas["tooth"]) : capas["tooth"];
    if (base) reales.push({ markup: base });
  }
  reales.push(...capasDeDiente(capas, completoReal));
  for (const z of zonas) {
    reales.push(...capasDeCara(capas, z.zona, actual(numero, z.cara, false)));
  }

  // Lo que se le piensa hacer: lo mismo, pero en tono de boceto.
  const planificadas: CapaPintada[] = [...capasDeDiente(capas, completoPlan)];
  for (const z of zonas) {
    planificadas.push(...capasDeCara(capas, z.zona, actual(numero, z.cara, true)));
  }
  const hayPlan =
    completoPlan !== "sano" || zonas.some((z) => actual(numero, z.cara, true) !== "sano");

  const resumen =
    peor !== "sano"
      ? `${numero} · ${nombreDelDiente(numero)} — ${ESTADO_POR_CLAVE[peor].nombre}`
      : `${numero} · ${nombreDelDiente(numero)}`;

  // Medidas: todas las piezas con el mismo ancho, y colocadas de forma
  // que la linea de la encia caiga siempre a la misma altura.
  const ANCHO = Math.round((Number(numero[1]) === 8 ? 41 : 46) * escala);
  const ALTO_CELDA = Math.round(112 * escala);
  const alto = (asset.alto / asset.ancho) * ANCHO;
  const cuelloRel = asset.cuello / asset.alto;
  const yEncia = ALTO_CELDA * (arriba ? 0.42 : 0.58);
  const topDiente = yEncia - (arriba ? cuelloRel : 1 - cuelloRel) * alto;

  const anchoEncia = ANCHO + Math.round(14 * escala);
  const altoEncia = Math.round(22 * escala);
  const topEncia = arriba ? yEncia - altoEncia * 0.72 : yEncia - altoEncia * 0.28;

  return (
    <button
      type="button"
      onClick={() => onSeleccionar(numero)}
      title={resumen}
      aria-label={resumen}
      aria-pressed={seleccionadoAqui}
      className={cn(
        "group relative flex shrink-0 flex-col items-center rounded-xl transition-colors",
        arriba ? "justify-start" : "justify-end",
        seleccionadoAqui ? "bg-primary-soft/70 ring-2 ring-primary" : "hover:bg-primary-soft/40",
      )}
      style={{ width: ANCHO + 8 }}
    >
      <span className="relative block w-full" style={{ height: ALTO_CELDA }}>
        {/* la encia, detras de todo */}
        {!ausente && (
          <span className="absolute" style={{ left: (ANCHO + 8 - anchoEncia) / 2, top: topEncia }}>
            <Encia ancho={anchoEncia} alto={altoEncia} arriba={arriba} />
          </span>
        )}

        {/* el diente */}
        <span className="absolute" style={{ left: 4, top: topDiente }}>
          <svg
            viewBox={`0 0 ${asset.ancho} ${asset.alto}`}
            width={ANCHO}
            height={alto}
            className={cn("block", ausente && "opacity-30")}
            aria-hidden
          >
            <defs>
              <clipPath id={`silueta-${numero}`}>
                <path d={asset.contorno} />
              </clipPath>
            </defs>
            <g transform={arriba ? undefined : `translate(0,${asset.alto}) scale(1,-1)`}>
              <Capas capas={reales} />
              {/* La pieza se tiñe con el hallazgo mas grave que tenga, asi la
                  boca se lee por prioridad de un vistazo: una caries salta
                  antes que una obturacion vieja. Las marcas de cada cara van
                  encima y dicen QUE tiene y DONDE. */}
              {peor !== "sano" && !ausente && asset.contorno && (
                <g clipPath={`url(#silueta-${numero})`} pointerEvents="none">
                  <path d={asset.contorno} fill={ESTADO_POR_CLAVE[peor].color} opacity={0.3} />
                </g>
              )}
              {planificadas.length > 0 && (
                <g opacity="0.5">
                  <Capas capas={planificadas} />
                </g>
              )}
            </g>
          </svg>
        </span>

        {ausente && (
          <span
            className="absolute grid place-items-center"
            style={{ left: 4, top: topDiente, width: ANCHO, height: alto }}
          >
            <svg viewBox="0 0 24 24" className="size-5 text-muted-foreground" aria-hidden>
              <path
                d="M5,5 L19,19 M19,5 L5,19"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </span>
        )}

        {hayPlan && (
          <span
            className="absolute right-0 size-2 rounded-full bg-primary ring-2 ring-card"
            style={{ top: arriba ? 2 : undefined, bottom: arriba ? undefined : 2 }}
            aria-hidden
          />
        )}
      </span>

      <span
        className={cn(
          "pb-1.5 text-[11px] font-medium tabular-nums",
          seleccionadoAqui ? "text-primary" : "text-muted-foreground/80",
        )}
      >
        {numero}
      </span>
    </button>
  );
}

function Arcada({
  derecha,
  izquierda,
  arriba,
  ...resto
}: {
  derecha: string[];
  izquierda: string[];
  /** true = arcada de arriba. Decide donde va el numero y la encia. */
  arriba: boolean;
} & Omit<PropsDiente, "numero">) {
  return (
    <div className={cn("flex justify-center gap-0.5", arriba ? "flex-col-reverse" : "flex-col")}>
      <div className="flex justify-center">
        <div className="flex">
          {derecha.map((d) => (
            <Diente key={d} numero={d} {...resto} />
          ))}
        </div>
        <div className="mx-1.5 self-stretch border-l border-dashed border-border-strong" />
        <div className="flex">
          {izquierda.map((d) => (
            <Diente key={d} numero={d} {...resto} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   El perfil de la pieza, con su raiz.

   En el odontograma se ve la corona desde arriba, que es lo que sirve
   para marcar caras. Aqui, en el panel, se ve la pieza de frente y
   entera: es donde tiene sentido ver la raiz, la endodoncia o el
   implante. El dibujo sale de los assets anatomicos MIT
   (src/lib/dientes-anatomicos.ts).
   --------------------------------------------------------------- */

function PerfilDiente({
  diente,
  actual,
}: {
  diente: string;
  actual: (diente: string, cara: Cara, planificado: boolean) => Estado;
}) {
  const asset = ASSETS_DIENTES[assetDe(diente)];
  const temporal = Number(diente[0]) >= 5;
  const completo = actual(diente, "completo", false);
  const plan = actual(diente, "completo", true);

  const capas: { markup: string; color?: string | undefined }[] = [];
  const pon = (n: string, color?: string) => {
    const m = asset.capas[n];
    if (m) capas.push({ markup: m, color });
  };

  if (completo !== "ausente" && completo !== "implante") {
    pon(temporal && asset.capas["milktooth"] ? "milktooth" : "tooth");
  }
  const marca = (estado: Estado) => {
    const color = ESTADO_POR_CLAVE[estado].color;
    if (estado === "corona") pon("zircon-1", color);
    else if (estado === "endodoncia") pon("endos");
    else if (estado === "implante") {
      pon("implant-base");
      pon("implant");
    } else if (estado === "protesis") pon("prosthesis-1", color);
    else if (estado === "fractura") pon("fracture-vertical", color);
    else if (estado === "extraccion_indicada") pon("extraction-plan", color);
  };
  marca(completo);
  const desdePlan = capas.length;
  marca(plan);

  const ANCHO = 54;
  const alto = (asset.alto / asset.ancho) * ANCHO;

  return (
    <span className="relative block shrink-0" style={{ width: ANCHO, height: alto }}>
      <svg
        viewBox={`0 0 ${asset.ancho} ${asset.alto}`}
        width={ANCHO}
        height={alto}
        className={cn("block", completo === "ausente" && "opacity-25")}
        aria-hidden
      >
        <g transform={esArribaEl(diente) ? undefined : `translate(0,${asset.alto}) scale(1,-1)`}>
          {capas.map((c, i) => (
            <g
              key={i}
              opacity={i >= desdePlan ? 0.5 : 1}
              style={c.color ? { color: c.color } : undefined}
              dangerouslySetInnerHTML={{ __html: c.markup }}
            />
          ))}
        </g>
      </svg>
    </span>
  );
}

/* ---------------------------------------------------------------
   Panel lateral: aqui se consulta y se registra todo.
   --------------------------------------------------------------- */

function ChipEstado({
  info,
  activo,
  onClick,
}: {
  info: (typeof ESTADOS)[number];
  activo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={info.ayuda}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-medium transition-all",
        activo
          ? "border-primary bg-primary-soft text-primary-soft-foreground shadow-soft"
          : "border-border-strong bg-card text-muted-foreground hover:border-primary/40",
      )}
    >
      <span
        className="size-3 shrink-0 rounded-[3px] border border-border-strong"
        style={{ background: info.color }}
      />
      {info.nombre}
    </button>
  );
}

function PanelDiente({
  diente,
  actual,
  historialDelDiente,
  onNavegar,
  onGuardar,
  onCerrar,
  soloLectura,
}: {
  diente: string;
  actual: (diente: string, cara: Cara, planificado: boolean) => Estado;
  historialDelDiente: OdontogramEntry[];
  onNavegar: (dir: -1 | 1) => void;
  onGuardar: (r: AccionDiente) => void;
  onCerrar: () => void;
  soloLectura: boolean;
}) {
  const caras = carasDelDiente(diente);
  const superficies: Cara[] = esAnterior(diente)
    ? ["completo", "mesial", "distal", caras.centro, "vestibular", "lingual"]
    : ["completo", "mesial", "distal", "oclusal", "vestibular", "lingual"];
  const superficiesUnicas = Array.from(new Set(superficies));

  const [caraForm, setCaraForm] = useState<Cara>("completo");
  const [estadoForm, setEstadoForm] = useState<Estado>("caries");
  const [planForm, setPlanForm] = useState(false);
  const [notasForm, setNotasForm] = useState("");
  const [verHistorial, setVerHistorial] = useState(false);

  const existentes = superficiesUnicas
    .map((c) => ({ cara: c, estado: actual(diente, c, false) }))
    .filter((x) => x.estado !== "sano");
  const planificados = superficiesUnicas
    .map((c) => ({ cara: c, estado: actual(diente, c, true) }))
    .filter((x) => x.estado !== "sano");

  function nombreCara(c: Cara) {
    return c === "oclusal" && esAnterior(diente) ? "Incisal" : NOMBRE_CARA[c];
  }

  // Superficie y Existente/Planificado solo eligen DONDE y COMO se va a
  // marcar. El que marca de una vez es hacer clic en el Estado, asi no se
  // marca nada sin querer solo por estar eligiendo la superficie.
  function elegirEstado(estado: Estado) {
    setEstadoForm(estado);
    onGuardar({ diente, cara: caraForm, estado, planificado: planForm });
  }

  function guardarNota() {
    onGuardar({
      diente,
      cara: caraForm,
      estado: estadoForm,
      planificado: planForm,
      notas: notasForm,
    });
    setNotasForm("");
  }

  function marcarSano(cara: Cara, planificado: boolean) {
    onGuardar({ diente, cara, estado: "sano", planificado });
  }

  const historialModal = historialDelDiente.slice(0, 60);
  const esTemporal = Number(diente[0]) >= 5;

  return (
    <div className="w-full shrink-0 space-y-3.5 rounded-2xl border border-border bg-card p-4 shadow-soft lg:w-[300px]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => onNavegar(-1)}
            className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-primary-soft hover:text-primary"
            aria-label="Diente anterior"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <div className="text-center">
            <p className="text-xl font-bold tabular-nums leading-none">{diente}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{nombreDelDiente(diente)}</p>
            <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {esTemporal ? "Temporal" : "Permanente"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavegar(1)}
            className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-primary-soft hover:text-primary"
            aria-label="Siguiente diente"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-primary-soft hover:text-primary"
          aria-label="Cerrar panel"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {/* La pieza en grande, con su raiz: aqui se ve la endodoncia, el
          implante o la corona sobre la anatomia completa. */}
      <div className="flex items-center justify-center rounded-xl border border-border bg-canvas/50 px-3 py-3">
        <PerfilDiente diente={diente} actual={actual} />
      </div>

      {/* Superficies: como esta cada una hoy */}
      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Superficies
        </p>
        <div className="grid grid-cols-2 gap-1">
          {superficiesUnicas.map((c) => {
            const real = actual(diente, c, false);
            const plan = actual(diente, c, true);
            return (
              <div
                key={c}
                className="flex items-center gap-1.5 rounded-lg border border-border px-2 py-1 text-[11px]"
              >
                <span
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    real === "sano" && "border border-border-strong",
                  )}
                  style={real === "sano" ? undefined : { background: ESTADO_POR_CLAVE[real].color }}
                />
                <span className="truncate">
                  <span className="text-muted-foreground">{nombreCara(c)}</span>
                  {real !== "sano" && (
                    <span className="ml-1 font-medium">{ESTADO_POR_CLAVE[real].nombre}</span>
                  )}
                  {plan !== "sano" && (
                    <span className="ml-1 text-primary">· {ESTADO_POR_CLAVE[plan].nombre}</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {(existentes.length > 0 || planificados.length > 0) && (
        <div className="space-y-2.5">
          {existentes.length > 0 && (
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Tratamientos existentes
              </p>
              <div className="space-y-1">
                {existentes.map((x) => (
                  <div
                    key={`${x.cara}-real`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border-strong bg-canvas/60 px-2.5 py-1.5 text-xs"
                  >
                    <span className="flex items-center gap-1.5">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ background: ESTADO_POR_CLAVE[x.estado].color }}
                      />
                      <span className="font-medium">{ESTADO_POR_CLAVE[x.estado].nombre}</span>
                      <span className="text-muted-foreground">· {nombreCara(x.cara)}</span>
                    </span>
                    {!soloLectura && (
                      <button
                        type="button"
                        onClick={() => marcarSano(x.cara, false)}
                        className="shrink-0 text-[11px] font-medium text-muted-foreground hover:text-primary"
                      >
                        Marcar sano
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {planificados.length > 0 && (
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Tratamientos planificados
              </p>
              <div className="space-y-1">
                {planificados.map((x) => (
                  <div
                    key={`${x.cara}-plan`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-primary/40 bg-primary-soft/40 px-2.5 py-1.5 text-xs"
                  >
                    <span className="flex items-center gap-1.5">
                      <span
                        className="size-2 shrink-0 rounded-full border border-dashed"
                        style={{ borderColor: ESTADO_POR_CLAVE[x.estado].color }}
                      />
                      <span className="font-medium">{ESTADO_POR_CLAVE[x.estado].nombre}</span>
                      <span className="text-muted-foreground">· {nombreCara(x.cara)}</span>
                    </span>
                    {!soloLectura && (
                      <button
                        type="button"
                        onClick={() => marcarSano(x.cara, true)}
                        className="shrink-0 text-[11px] font-medium text-muted-foreground hover:text-primary"
                      >
                        Quitar plan
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!soloLectura && (
        <div className="space-y-2.5 rounded-xl border border-border-strong bg-canvas/40 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Añadir tratamiento
          </p>

          <div>
            <p className="mb-1 text-[11px] text-muted-foreground">1. Superficie</p>
            <div className="flex flex-wrap gap-1">
              {superficiesUnicas.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCaraForm(c)}
                  className={cn(
                    "rounded-lg border px-2 py-0.5 text-[11px] font-medium transition-colors",
                    caraForm === c
                      ? "border-primary bg-primary-soft text-primary-soft-foreground"
                      : "border-border-strong bg-card text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {nombreCara(c)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex rounded-lg border border-border-strong bg-card p-0.5">
            {([false, true] as const).map((p) => (
              <button
                key={String(p)}
                type="button"
                onClick={() => setPlanForm(p)}
                className={cn(
                  "h-6 flex-1 rounded-md px-2 text-[11px] font-medium transition-colors",
                  planForm === p
                    ? "bg-primary-soft text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {p ? "2. Planificado" : "2. Existente"}
              </button>
            ))}
          </div>

          <div>
            <p className="mb-1 text-[11px] text-muted-foreground">
              3. Estado — al elegirlo se marca de una vez
            </p>
            <div className="flex flex-wrap gap-1">
              {ESTADOS.map((e) => (
                <ChipEstado
                  key={e.clave}
                  info={e}
                  activo={estadoForm === e.clave}
                  onClick={() => elegirEstado(e.clave)}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1 text-[11px] text-muted-foreground">
              Nota (opcional, se guarda junto al último estado marcado)
            </p>
            <textarea
              value={notasForm}
              onChange={(e) => setNotasForm(e.target.value)}
              placeholder="Escribe una nota..."
              rows={2}
              className="w-full rounded-lg border border-input bg-card px-2.5 py-1.5 text-xs outline-none placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-ring/30"
            />
            <Button type="button" size="sm" className="mt-1.5 w-full" onClick={guardarNota}>
              <Plus className="size-4" />
              Guardar nota
            </Button>
          </div>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => setVerHistorial(true)}
      >
        <History className="size-4" />
        Ver historial de este diente
      </Button>

      <Modal
        open={verHistorial}
        onClose={() => setVerHistorial(false)}
        title={`Historial del diente ${diente}`}
        description={nombreDelDiente(diente)}
      >
        {historialModal.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay registros para esta pieza.</p>
        ) : (
          <ul className="space-y-2">
            {historialModal.map((h) => (
              <li key={h.id} className="rounded-lg border border-border-strong px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: ESTADO_POR_CLAVE[h.condition as Estado]?.color }}
                    />
                    <span className="font-medium">
                      {ESTADO_POR_CLAVE[h.condition as Estado]?.nombre ?? h.condition}
                    </span>
                    <span className="text-muted-foreground">· {nombreCara(h.surface as Cara)}</span>
                    {h.planned && (
                      <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary">
                        Planificado
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatShortDate(h.created_at)}
                  </span>
                </div>
                {h.notes && <p className="mt-1 text-xs text-muted-foreground">{h.notes}</p>}
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}

/* ---------------------------------------------------------------
   Componente principal.
   --------------------------------------------------------------- */

interface AccionDeshacer {
  diente: string;
  cara: Cara;
  planificado: boolean;
  previo: Estado;
  posterior: Estado;
  notasPrevias: string;
  notasPosteriores: string;
}

export function Odontograma({
  historial,
  onPintar,
  soloLectura = false,
}: {
  /** Toda la historia del odontograma de este paciente, la mas reciente primero. */
  historial: OdontogramEntry[];
  onPintar: (r: AccionDiente) => void;
  soloLectura?: boolean;
}) {
  const [denticion, setDenticion] = useState<"permanente" | "temporal">("permanente");
  // Arranca al 80%: a ese tamaño entra la boca entera sin desplazar.
  const [zoom, setZoom] = useState(0.8);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [expandido, setExpandido] = useState(false);
  const [pila, setPila] = useState<AccionDeshacer[]>([]);
  const [pilaRehacer, setPilaRehacer] = useState<AccionDeshacer[]>([]);

  const juego = denticion === "permanente" ? PERMANENTES : TEMPORALES;
  const secuencia = useMemo(
    () => [
      ...juego.arribaDerecha,
      ...juego.arribaIzquierda,
      ...juego.abajoDerecha,
      ...juego.abajoIzquierda,
    ],
    [juego],
  );

  // Ultimo registro de cada diente+cara+(real o planificado). El historial
  // ya viene del mas nuevo al mas viejo, asi que el primero de cada clave
  // es el vigente.
  const vigentes = useMemo(() => {
    const m = new Map<string, OdontogramEntry>();
    for (const e of historial) {
      const k = clave(e.tooth, e.surface as Cara, e.planned);
      if (!m.has(k)) m.set(k, e);
    }
    return m;
  }, [historial]);

  function actual(diente: string, cara: Cara, planificado: boolean): Estado {
    return (vigentes.get(clave(diente, cara, planificado))?.condition as Estado) ?? "sano";
  }
  function notaDe(diente: string, cara: Cara, planificado: boolean): string {
    return vigentes.get(clave(diente, cara, planificado))?.notes ?? "";
  }

  function aplicar(r: AccionDiente) {
    const previo = actual(r.diente, r.cara, r.planificado);
    const notasPrevias = notaDe(r.diente, r.cara, r.planificado);
    onPintar(r);
    setPila((p) => [
      ...p,
      {
        diente: r.diente,
        cara: r.cara,
        planificado: r.planificado,
        previo,
        posterior: r.estado,
        notasPrevias,
        notasPosteriores: r.notas ?? "",
      },
    ]);
    setPilaRehacer([]);
  }

  function deshacer() {
    const u = pila.at(-1);
    if (!u) return;
    onPintar({
      diente: u.diente,
      cara: u.cara,
      estado: u.previo,
      planificado: u.planificado,
      notas: u.notasPrevias,
    });
    setPila((p) => p.slice(0, -1));
    setPilaRehacer((p) => [...p, u]);
  }

  function rehacer() {
    const u = pilaRehacer.at(-1);
    if (!u) return;
    onPintar({
      diente: u.diente,
      cara: u.cara,
      estado: u.posterior,
      planificado: u.planificado,
      notas: u.notasPosteriores,
    });
    setPilaRehacer((p) => p.slice(0, -1));
    setPila((p) => [...p, u]);
  }

  function navegar(dir: -1 | 1) {
    if (!seleccionado) return;
    const i = secuencia.indexOf(seleccionado);
    if (i === -1) return;
    const siguiente = secuencia[(i + dir + secuencia.length) % secuencia.length];
    if (siguiente) setSeleccionado(siguiente);
  }

  const propsDiente = {
    actual,
    escala: zoom,
    seleccionado,
    onSeleccionar: setSeleccionado,
  };

  const historialDelSeleccionado = seleccionado
    ? historial.filter((h) => h.tooth === seleccionado)
    : [];

  return (
    <div className={cn(expandido && "fixed inset-0 z-50 overflow-y-auto bg-canvas p-4 sm:p-6")}>
      <div className={cn("space-y-3", expandido && "mx-auto max-w-6xl")}>
        {/* Barra superior */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-border-strong bg-card p-0.5">
              {(["permanente", "temporal"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setDenticion(d);
                    setSeleccionado(null);
                  }}
                  className={cn(
                    "h-7 rounded-md px-2.5 text-xs font-medium transition-colors",
                    denticion === d
                      ? "bg-primary-soft text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {d === "permanente" ? "Adulto (32)" : "Niño (20)"}
                </button>
              ))}
            </div>
            {/* Zoom: para acercarse a una pieza durante la consulta. */}
            <div className="flex items-center rounded-lg border border-border-strong bg-card p-0.5">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.8, Math.round((z - 0.2) * 10) / 10))}
                disabled={zoom <= 0.8}
                className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-primary-soft hover:text-primary disabled:pointer-events-none disabled:opacity-35"
                aria-label="Alejar"
                title="Alejar"
              >
                <Minus className="size-3.5" />
              </button>
              <span className="w-10 text-center text-[11px] font-medium tabular-nums text-muted-foreground">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(1.8, Math.round((z + 0.2) * 10) / 10))}
                disabled={zoom >= 1.8}
                className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-primary-soft hover:text-primary disabled:pointer-events-none disabled:opacity-35"
                aria-label="Acercar"
                title="Acercar"
              >
                <PlusIcon className="size-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {!soloLectura && (
              <>
                <button
                  type="button"
                  disabled={pila.length === 0}
                  onClick={deshacer}
                  className="grid size-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary disabled:pointer-events-none disabled:opacity-35"
                  aria-label="Deshacer"
                  title="Deshacer"
                >
                  <Undo2 className="size-4" />
                </button>
                <button
                  type="button"
                  disabled={pilaRehacer.length === 0}
                  onClick={rehacer}
                  className="grid size-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary disabled:pointer-events-none disabled:opacity-35"
                  aria-label="Rehacer"
                  title="Rehacer"
                >
                  <Redo2 className="size-4" />
                </button>
              </>
            )}
            <Button
              type="button"
              variant={expandido ? "outline" : "soft"}
              size="sm"
              onClick={() => setExpandido((v) => !v)}
            >
              {expandido ? (
                <>
                  <Minimize2 className="size-4" />
                  Cerrar pantalla completa
                </>
              ) : (
                <>
                  <Maximize2 className="size-4" />
                  Pantalla completa
                </>
              )}
            </Button>
          </div>
        </div>

        <div
          className="flex flex-col gap-3 lg:flex-row lg:items-start"
          style={
            {
              // Los assets traen sus propias variables de color; se enganchan
              // a los tokens del proyecto para que la leyenda y el diente
              // digan siempre lo mismo.
              "--odon-fill-composite": "var(--odo-obturado)",
              "--odon-fill-gic": "var(--odo-sellante)",
              "--odon-fill-amalgam": "var(--odo-obturado)",
              "--odon-rest-zircon": "var(--odo-corona)",
              "--odon-rest-denture-tooth": "var(--odo-protesis)",
            } as React.CSSProperties
          }
        >
          {/* Los degradados de los dibujos, una sola vez para toda la boca. */}
          <svg
            width="0"
            height="0"
            aria-hidden
            className="absolute"
            dangerouslySetInnerHTML={{ __html: `<defs>${DEFS_DIENTES}</defs>` }}
          />

          <div className="min-w-0 flex-1 overflow-x-auto rounded-2xl border border-border bg-gradient-to-b from-canvas/70 to-canvas/30 px-5 py-8">
            <div className="mx-auto w-fit space-y-5">
              <Arcada
                derecha={juego.arribaDerecha}
                izquierda={juego.arribaIzquierda}
                arriba
                {...propsDiente}
              />
              <div className="border-t border-dashed border-border-strong" />
              <Arcada
                derecha={juego.abajoDerecha}
                izquierda={juego.abajoIzquierda}
                arriba={false}
                {...propsDiente}
              />
            </div>
            <p className="mt-5 text-center text-xs text-muted-foreground">
              Lado derecho del paciente a la izquierda del dibujo, como lo ve la odontóloga de
              frente.
            </p>
          </div>

          {seleccionado && (
            <PanelDiente
              diente={seleccionado}
              actual={actual}
              historialDelDiente={historialDelSeleccionado}
              onNavegar={navegar}
              onGuardar={aplicar}
              onCerrar={() => setSeleccionado(null)}
              soloLectura={soloLectura}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/** Leyenda de colores, para debajo del dibujo. */
export function LeyendaOdontograma() {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {ESTADOS.filter((e) => e.clave !== "sano").map((e) => (
          <span key={e.clave} className="inline-flex items-center gap-1.5 text-xs">
            <span
              className="size-3 shrink-0 rounded-[3px] border border-border-strong"
              style={{ background: e.color }}
            />
            <span className="text-muted-foreground">{e.nombre}</span>
          </span>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Relleno sólido = ya está hecho · contorno punteado = planificado (todavía no se ha hecho).
      </p>
    </div>
  );
}
