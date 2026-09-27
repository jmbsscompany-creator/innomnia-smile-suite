// Grafico del periodontograma: la misma informacion de la rejilla, pero
// puesta encima del dibujo real de cada diente en vez de en una tabla.
//
// Para que sirve, si los numeros ya estan en la rejilla: para verlo de
// un vistazo. Un numero suelto ("4mm en el 16") no dice nada a un
// paciente; un diente pintado de rojo si lo dice. Esta vista es la que
// se le enseña al paciente en la pantalla para explicarle como esta su
// boca — la rejilla es donde la doctora trabaja, este grafico es donde
// se explica.
//
// Usa las mismas siluetas ya verificadas del Odontograma.tsx (no son
// dientes nuevos ni distintos) y el mismo criterio de color que la
// rejilla (colorSegunProfundidad, en periodontograma.ts), asi que lo
// que se ve aqui siempre coincide con lo que se escribio alla.
import { PERMANENTES, tipoDiente } from "@/lib/odontograma";
import { ASSETS_DIENTES, DEFS_DIENTES } from "@/lib/dientes-anatomicos";
import type { PeriodontogramaDiente } from "@/lib/database.types";
import {
  NOMBRE_PUNTO,
  colorSegunProfundidad,
  dienteVacio,
  peorProfundidad,
  tieneFurca,
} from "@/lib/periodontograma";
import { cn } from "@/lib/utils";

const PUNTOS_VESTIBULAR = [0, 1, 2];
const PUNTOS_LINGUAL = [3, 4, 5];

/**
 * Color de fondo del diente entero, segun la peor bolsa que tenga.
 * Verde suave = se midio y esta bien (para distinguir "sano" de
 * "todavia no se ha revisado", que si no se ve igual desanima a medir).
 */
function lavadoDelDiente(fila: PeriodontogramaDiente): { color: string; opacidad: number } | null {
  if (fila.ausente) return null;
  const peor = peorProfundidad(fila);
  if (peor === null) return null;
  if (peor >= 6) return { color: "var(--odo-extraccion)", opacidad: 0.5 };
  if (peor >= 4) return { color: "var(--odo-corona)", opacidad: 0.45 };
  return { color: "var(--success)", opacidad: 0.22 };
}

function Celda({
  diente,
  punto,
  fila,
}: {
  diente: string;
  punto: number;
  fila: PeriodontogramaDiente;
}) {
  const profundidad = fila.profundidad[punto] ?? null;
  const color = colorSegunProfundidad(profundidad);
  const banderas: string[] = [];
  if (fila.sangrado[punto]) banderas.push("bg-danger");
  if (fila.placa[punto]) banderas.push("bg-warning");
  if (fila.supuracion[punto]) banderas.push("bg-accent-foreground");

  const detalle = profundidad === null ? "sin medir" : `profundidad ${profundidad}mm`;

  return (
    <div
      className="flex flex-col items-center gap-0.5"
      title={`${diente} · ${NOMBRE_PUNTO[punto]} — ${detalle}`}
    >
      <span
        className="text-[9px] font-bold leading-none tabular-nums text-foreground"
        style={color ? { color } : undefined}
      >
        {profundidad ?? "–"}
      </span>
      <div className="flex h-1 gap-[1.5px]">
        {banderas.map((b, i) => (
          <span key={i} className={cn("size-1 rounded-full", b)} />
        ))}
      </div>
    </div>
  );
}

function DienteGrafico({ diente, fila }: { diente: string; fila: PeriodontogramaDiente }) {
  const tipo = tipoDiente(diente);
  const arriba = Number(diente[0]) === 1 || Number(diente[0]) === 2;
  const asset =
    tipo === "incisivo"
      ? ASSETS_DIENTES.incisivo
      : tipo === "canino"
        ? ASSETS_DIENTES.canino
        : tipo === "premolar"
          ? arriba
            ? ASSETS_DIENTES.premolarSuperior
            : ASSETS_DIENTES.premolarInferior
          : arriba
            ? ASSETS_DIENTES.molarSuperior
            : ASSETS_DIENTES.molarInferior;
  const lavado = lavadoDelDiente(fila);
  const sangroAlgo = !fila.ausente && fila.sangrado.some(Boolean);

  return (
    <div className="flex w-11 shrink-0 flex-col items-center gap-1 sm:w-12">
      <span className="text-[10px] font-semibold tabular-nums text-muted-foreground sm:text-[11px]">
        {diente}
      </span>

      <div className="relative">
        <svg
          viewBox={`0 0 ${asset.ancho} ${asset.alto}`}
          className="w-7 shrink-0 sm:w-8"
          aria-hidden
        >
          <g
            className={fila.ausente ? "opacity-25" : undefined}
            dangerouslySetInnerHTML={{ __html: asset.capas["tooth"] ?? "" }}
          />
          {/* El lavado de color dice como esta la encia alrededor. */}
          {lavado && (
            <rect
              x="0"
              y="0"
              width={asset.ancho}
              height={asset.alto}
              fill={lavado.color}
              opacity={lavado.opacidad}
            />
          )}
        </svg>
        {sangroAlgo && (
          <span
            className="absolute -right-0.5 -top-0.5 size-2 rounded-full border border-card bg-danger"
            title={`${diente} · sangró al sondear`}
          />
        )}
      </div>

      {fila.ausente ? (
        <span className="text-[8.5px] text-muted-foreground">Ausente</span>
      ) : (
        <>
          <div className="flex gap-1" title="Por fuera (vestibular)">
            {PUNTOS_VESTIBULAR.map((p) => (
              <Celda key={p} diente={diente} punto={p} fila={fila} />
            ))}
          </div>
          <div className="flex gap-1" title="Por dentro (lingual)">
            {PUNTOS_LINGUAL.map((p) => (
              <Celda key={p} diente={diente} punto={p} fila={fila} />
            ))}
          </div>
          {(fila.movilidad > 0 || (tieneFurca(diente) && fila.furca > 0)) && (
            <div className="flex gap-1 text-[8px] font-semibold text-muted-foreground">
              {fila.movilidad > 0 && <span title="Movilidad">M{"I".repeat(fila.movilidad)}</span>}
              {tieneFurca(diente) && fila.furca > 0 && (
                <span title="Furca">F{"I".repeat(fila.furca)}</span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ArcadaGrafico({
  derecha,
  izquierda,
  porDiente,
  examenId,
}: {
  derecha: string[];
  izquierda: string[];
  porDiente: Map<string, PeriodontogramaDiente>;
  examenId: string;
}) {
  function filaDe(diente: string) {
    return porDiente.get(diente) ?? dienteVacio(examenId, diente);
  }
  return (
    <div className="flex items-start justify-center gap-1 sm:gap-1.5">
      <div className="flex gap-0.5 sm:gap-1">
        {derecha.map((d) => (
          <DienteGrafico key={d} diente={d} fila={filaDe(d)} />
        ))}
      </div>
      <div className="mx-1 self-stretch border-l-2 border-dashed border-border-strong" />
      <div className="flex gap-0.5 sm:gap-1">
        {izquierda.map((d) => (
          <DienteGrafico key={d} diente={d} fila={filaDe(d)} />
        ))}
      </div>
    </div>
  );
}

export function GraficoPeriodontal({
  examenId,
  dientes,
}: {
  examenId: string;
  dientes: PeriodontogramaDiente[];
}) {
  const porDiente = new Map(dientes.map((d) => [d.tooth, d]));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span
            className="size-2.5 rounded-[3px]"
            style={{ background: "var(--success)", opacity: 0.5 }}
          />
          medido y sano
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="size-2.5 rounded-[3px]"
            style={{ background: "var(--odo-corona)", opacity: 0.6 }}
          />
          bolsa moderada (4-5mm)
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="size-2.5 rounded-[3px]"
            style={{ background: "var(--odo-extraccion)", opacity: 0.6 }}
          />
          bolsa grave (6mm+)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-danger" />
          sangró al sondear
        </span>
        <span>Los números debajo son la profundidad en mm de cada punto.</span>
      </div>

      {/* Los degradados de los dibujos de dientes. No se ve nada de
          este svg: solo guarda el color. */}
      <svg
        width="0"
        height="0"
        aria-hidden
        className="absolute"
        dangerouslySetInnerHTML={{ __html: `<defs>${DEFS_DIENTES}</defs>` }}
      />

      <div className="overflow-x-auto rounded-xl border border-border bg-canvas/60 px-3 py-5">
        <div className="mx-auto w-fit space-y-4">
          <ArcadaGrafico
            derecha={PERMANENTES.arribaDerecha}
            izquierda={PERMANENTES.arribaIzquierda}
            porDiente={porDiente}
            examenId={examenId}
          />
          <div className="border-t border-dashed border-border-strong" />
          <ArcadaGrafico
            derecha={PERMANENTES.abajoDerecha}
            izquierda={PERMANENTES.abajoIzquierda}
            porDiente={porDiente}
            examenId={examenId}
          />
        </div>
      </div>
    </div>
  );
}
