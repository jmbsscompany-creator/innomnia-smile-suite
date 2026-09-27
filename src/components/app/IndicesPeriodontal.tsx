// Indices en pantalla: el resumen de toda la boca en un solo vistazo.
//
// Nadie calcula esto a mano — sale de calcularIndices() (periodontograma.ts)
// sobre lo que ya se lleno en la rejilla. Esta tarjeta es la que se le
// enseña al paciente para explicarle como va: "sangrabas en el 40% de
// los puntos y ahora en el 32%" convence mas que cualquier numero suelto.
import { PERMANENTES } from "@/lib/odontograma";
import type { PeriodontogramaDiente } from "@/lib/database.types";
import { PUNTOS, calcularIndices, type IndicesPerio } from "@/lib/periodontograma";
import { formatShortDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

const TOTAL_DIENTES = Object.values(PERMANENTES).reduce((suma, arcada) => suma + arcada.length, 0);

function Barra({
  etiqueta,
  ayuda,
  valor,
  color,
}: {
  etiqueta: string;
  ayuda: string;
  valor: number;
  color: string;
}) {
  return (
    <div className="flex flex-1 flex-col gap-2 rounded-xl border border-border bg-card p-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-semibold text-muted-foreground">{etiqueta}</span>
        <span className="text-2xl font-extrabold tabular-nums" style={{ color }}>
          {valor}%
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(100, valor)}%`, background: color }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground">{ayuda}</p>
    </div>
  );
}

function Tarjeta({
  etiqueta,
  valor,
  nota,
  color,
}: {
  etiqueta: string;
  valor: string | number;
  nota: string;
  color?: string | undefined;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border border-border bg-card p-3.5">
      <span className="text-[11px] font-semibold text-muted-foreground">{etiqueta}</span>
      <span className="text-xl font-extrabold tabular-nums" style={color ? { color } : undefined}>
        {valor}
      </span>
      <span className="text-[10.5px] text-muted-foreground">{nota}</span>
    </div>
  );
}

/** Cambio de un examen a otro: mejora si baja, empeora si sube. */
function Comparacion({
  actual,
  anterior,
  fechaAnterior,
}: {
  actual: IndicesPerio;
  anterior: IndicesPerio;
  fechaAnterior: string;
}) {
  const cambio = actual.pctSangrado - anterior.pctSangrado;
  if (anterior.puntosMedidos === 0) return null; // Nada que comparar todavia.

  const mejoro = cambio < 0;
  const igual = cambio === 0;

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-xl border px-4 py-3",
        igual
          ? "border-border-strong bg-muted/50"
          : mejoro
            ? "border-success/30 bg-success-soft"
            : "border-danger/30 bg-danger-soft",
      )}
    >
      <span className="text-lg leading-none" aria-hidden>
        {igual ? "→" : mejoro ? "↓" : "↑"}
      </span>
      <p
        className={cn(
          "text-[13px]",
          igual ? "text-muted-foreground" : mejoro ? "text-success" : "text-danger",
        )}
      >
        {igual ? (
          <>
            El sangrado se mantiene igual que el examen del {formatShortDate(fechaAnterior)} (
            {actual.pctSangrado}%).
          </>
        ) : (
          <>
            <strong>
              {mejoro ? "Mejoró" : "Empeoró"} desde el examen del {formatShortDate(fechaAnterior)}:
            </strong>{" "}
            el sangrado {mejoro ? "bajó" : "subió"} de {anterior.pctSangrado}% a{" "}
            {actual.pctSangrado}%.
          </>
        )}
      </p>
    </div>
  );
}

export function IndicesPeriodontal({
  dientes,
  fecha,
  dientesAnterior,
  fechaAnterior,
}: {
  dientes: PeriodontogramaDiente[];
  fecha: string;
  /** El examen anterior de este paciente, si hay uno, para comparar. */
  dientesAnterior?: PeriodontogramaDiente[] | null | undefined;
  fechaAnterior?: string | null | undefined;
}) {
  const indices = calcularIndices(dientes);
  const indicesAnterior = dientesAnterior ? calcularIndices(dientesAnterior) : null;

  const maxPosible = (TOTAL_DIENTES - indices.dientesAusentes) * PUNTOS;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-foreground">
          Examen del {formatShortDate(fecha)}
        </span>
        <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary-soft-foreground">
          {indices.puntosMedidos} de {maxPosible} puntos medidos
        </span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Barra
          etiqueta="% de sangrado — el indicador de inflamación"
          ayuda="0% es encía sana, 100% es que sangra en todos los puntos medidos."
          valor={indices.pctSangrado}
          color="var(--danger)"
        />
        <Barra
          etiqueta="% de placa — higiene del paciente"
          ayuda="Cuánta placa se encontró, del total de puntos medidos."
          valor={indices.pctPlaca}
          color="var(--warning)"
        />
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Tarjeta
          etiqueta="NIC máximo"
          valor={indices.nicMaximo === null ? "—" : `${indices.nicMaximo}mm`}
          nota="peor pérdida de soporte"
        />
        <Tarjeta
          etiqueta="Sitios ≥4mm"
          valor={indices.sitios4mm}
          nota="bolsas moderadas"
          color={indices.sitios4mm > 0 ? "var(--odo-corona)" : undefined}
        />
        <Tarjeta
          etiqueta="Sitios ≥6mm"
          valor={indices.sitios6mm}
          nota="bolsas graves"
          color={indices.sitios6mm > 0 ? "var(--odo-extraccion)" : undefined}
        />
        <Tarjeta
          etiqueta="Movilidad / furca"
          valor={`${indices.dientesConMovilidad} / ${indices.dientesConFurca}`}
          nota="dientes afectados"
        />
      </div>

      {indicesAnterior && fechaAnterior && (
        <Comparacion actual={indices} anterior={indicesAnterior} fechaAnterior={fechaAnterior} />
      )}

      {indices.puntosMedidos === 0 && (
        <p className="py-2 text-center text-xs text-muted-foreground">
          Todavía no hay ningún punto medido en este examen — los índices aparecen a medida que se
          llena la rejilla de abajo.
        </p>
      )}
    </div>
  );
}
