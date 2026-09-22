// Odontograma: el dibujo de la boca con el estado de cada diente.
//
// Como se usa: arriba eliges un estado (caries, obturado, corona...) y
// despues vas haciendo clic en los dientes o en sus caras. Es como pintar.
// Se hace asi, y no con un menu por diente, porque la odontologa revisa
// toda la boca de corrido: marca todas las caries, despues todo lo obturado.
import { useState } from "react";
import {
  ESTADOS,
  ESTADO_POR_CLAVE,
  NOMBRE_CARA,
  PERMANENTES,
  TEMPORALES,
  carasDelDiente,
  esAnterior,
  nombreDelDiente,
  type Cara,
  type Estado,
} from "@/lib/odontograma";
import { cn } from "@/lib/utils";

export type MapaEstados = Record<string, Estado>;

/** La clave con que se guarda cada cara: "36:oclusal" */
export const clave = (diente: string, cara: Cara) => `${diente}:${cara}`;

interface PropsDiente {
  numero: string;
  estados: MapaEstados;
  onPintar: (diente: string, cara: Cara) => void;
  soloLectura: boolean;
}

/* Coordenadas del dibujo de un diente, en una caja de 40x40 */
const ZONAS = {
  arriba: "4,4 36,4 27,13 13,13",
  derecha: "36,4 36,36 27,27 27,13",
  abajo: "4,36 36,36 27,27 13,27",
  izquierda: "4,4 4,36 13,27 13,13",
};

function Diente({ numero, estados, onPintar, soloLectura }: PropsDiente) {
  const caras = carasDelDiente(numero);
  const completo = estados[clave(numero, "completo")];
  const infoCompleto = completo ? ESTADO_POR_CLAVE[completo] : null;
  const ausente = completo === "ausente";

  function colorDe(cara: Cara) {
    const e = estados[clave(numero, cara)];
    if (!e || e === "sano") return "var(--odo-sano)";
    return ESTADO_POR_CLAVE[e].color;
  }

  function tituloDe(cara: Cara) {
    const e = estados[clave(numero, cara)];
    const nombre = ESTADO_POR_CLAVE[e ?? "sano"].nombre;
    const caraNombre = cara === "oclusal" && esAnterior(numero) ? "Incisal" : NOMBRE_CARA[cara];
    return `${numero} · ${caraNombre}: ${nombre}`;
  }

  const zonas: { nombre: keyof typeof ZONAS; cara: Cara }[] = [
    { nombre: "arriba", cara: caras.arriba },
    { nombre: "derecha", cara: caras.derecha },
    { nombre: "abajo", cara: caras.abajo },
    { nombre: "izquierda", cara: caras.izquierda },
  ];

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        viewBox="0 0 40 40"
        className={cn("size-[38px] shrink-0 sm:size-[42px]", ausente && "opacity-45")}
        role="group"
        aria-label={`Diente ${numero}`}
      >
        {/* Las cuatro caras de alrededor */}
        {zonas.map((z) => (
          <polygon
            key={z.nombre}
            points={ZONAS[z.nombre]}
            fill={colorDe(z.cara)}
            stroke="var(--border-strong)"
            strokeWidth="1"
            className={cn(!soloLectura && "cursor-pointer hover:brightness-90")}
            onClick={() => !soloLectura && onPintar(numero, z.cara)}
          >
            <title>{tituloDe(z.cara)}</title>
          </polygon>
        ))}

        {/* La cara de masticar, en el centro */}
        <rect
          x="13"
          y="13"
          width="14"
          height="14"
          fill={colorDe(caras.centro)}
          stroke="var(--border-strong)"
          strokeWidth="1"
          className={cn(!soloLectura && "cursor-pointer hover:brightness-90")}
          onClick={() => !soloLectura && onPintar(numero, caras.centro)}
        >
          <title>{tituloDe(caras.centro)}</title>
        </rect>

        {/* Lo que afecta al diente entero se dibuja encima */}
        {infoCompleto && completo !== "sano" && (
          <g pointerEvents="none">
            {(completo === "ausente" || completo === "extraccion_indicada") && (
              <path
                d="M7 7 L33 33 M33 7 L7 33"
                stroke={infoCompleto.color}
                strokeWidth="3"
                strokeLinecap="round"
              />
            )}
            {completo === "corona" && (
              <rect
                x="2"
                y="2"
                width="36"
                height="36"
                fill="none"
                stroke={infoCompleto.color}
                strokeWidth="3.5"
                rx="4"
              />
            )}
            {completo === "endodoncia" && (
              <path d="M20 6 L28 20 L20 34 L12 20 Z" fill={infoCompleto.color} opacity="0.85" />
            )}
            {completo === "implante" && (
              <g stroke={infoCompleto.color} strokeWidth="2.5" fill="none">
                <circle cx="20" cy="20" r="7" />
                <path d="M20 13 L20 27" />
              </g>
            )}
            {completo === "protesis" && (
              <path
                d="M3 20 L37 20"
                stroke={infoCompleto.color}
                strokeWidth="4"
                strokeLinecap="round"
              />
            )}
            {completo === "fractura" && (
              <path
                d="M14 4 L24 18 L16 22 L26 36"
                stroke={infoCompleto.color}
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </g>
        )}
      </svg>

      <span className="text-[10px] font-semibold tabular-nums text-muted-foreground sm:text-[11px]">
        {numero}
      </span>
    </div>
  );
}

function Arcada({
  derecha,
  izquierda,
  ...resto
}: {
  derecha: string[];
  izquierda: string[];
} & Omit<PropsDiente, "numero">) {
  return (
    <div className="flex items-start justify-center gap-1 sm:gap-1.5">
      <div className="flex gap-0.5 sm:gap-1">
        {derecha.map((d) => (
          <Diente key={d} numero={d} {...resto} />
        ))}
      </div>
      {/* Linea del centro de la boca */}
      <div className="mx-1 self-stretch border-l-2 border-dashed border-border-strong" />
      <div className="flex gap-0.5 sm:gap-1">
        {izquierda.map((d) => (
          <Diente key={d} numero={d} {...resto} />
        ))}
      </div>
    </div>
  );
}

export function Odontograma({
  estados,
  onPintar,
  soloLectura = false,
}: {
  estados: MapaEstados;
  /** Se llama con el diente, la cara y el estado elegido en la paleta. */
  onPintar: (diente: string, cara: Cara, estado: Estado) => void;
  soloLectura?: boolean;
}) {
  const [activo, setActivo] = useState<Estado>("caries");
  const [denticion, setDenticion] = useState<"permanente" | "temporal">("permanente");

  const info = ESTADO_POR_CLAVE[activo];
  const juego = denticion === "permanente" ? PERMANENTES : TEMPORALES;

  function pintar(diente: string, cara: Cara) {
    // Los estados que afectan al diente entero se guardan como "completo",
    // sin importar en que cara se hizo clic.
    onPintar(diente, info.dienteCompleto ? "completo" : cara, activo);
  }

  const propsDiente = { estados, onPintar: pintar, soloLectura };

  return (
    <div className="space-y-5">
      {/* Adultos o ninos */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-xl border border-border-strong bg-card p-1">
          {(["permanente", "temporal"] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDenticion(d)}
              className={cn(
                "h-8 rounded-lg px-3.5 text-sm font-medium transition-colors",
                denticion === d
                  ? "bg-primary-soft text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {d === "permanente" ? "Adulto (32)" : "Nino (20)"}
            </button>
          ))}
        </div>
        {!soloLectura && (
          <p className="text-sm text-muted-foreground">
            Elige un estado y haz clic en los dientes.
          </p>
        )}
      </div>

      {/* Paleta de estados */}
      {!soloLectura && (
        <div className="flex flex-wrap gap-1.5">
          {ESTADOS.map((e) => (
            <button
              key={e.clave}
              type="button"
              title={e.ayuda}
              onClick={() => setActivo(e.clave)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all",
                activo === e.clave
                  ? "border-primary bg-primary-soft text-primary-soft-foreground shadow-soft"
                  : "border-border-strong bg-card text-muted-foreground hover:border-primary/40",
              )}
            >
              <span
                className="size-3.5 shrink-0 rounded-[4px] border border-border-strong"
                style={{ background: e.color }}
              />
              {e.nombre}
            </button>
          ))}
        </div>
      )}

      {/* La boca */}
      <div className="overflow-x-auto rounded-xl border border-border bg-canvas/60 px-3 py-5">
        <div className="mx-auto w-fit space-y-4">
          <Arcada
            derecha={juego.arribaDerecha}
            izquierda={juego.arribaIzquierda}
            {...propsDiente}
          />
          <div className="border-t border-dashed border-border-strong" />
          <Arcada derecha={juego.abajoDerecha} izquierda={juego.abajoIzquierda} {...propsDiente} />
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Lado derecho del paciente a la izquierda del dibujo, como lo ve la odontologa de frente.
      </p>
    </div>
  );
}

/** Leyenda de colores, para la vista de solo lectura. */
export function LeyendaOdontograma() {
  return (
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
  );
}
