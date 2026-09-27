// Periodontograma: la rejilla donde se mide la encia diente por diente.
//
// Es una tabla: una fila por pieza, y dentro de cada fila los 6 puntos de
// sondeo (3 por fuera, 3 por dentro). Se llena con el teclado: al terminar
// un numero y darle Enter, el cursor salta solo al siguiente punto en el
// mismo orden en que la doctora recorre la boca — no al azar ni a la
// casilla de al lado, sino siguiendo RECORRIDO (definido en
// periodontograma.ts). Sin eso hay que ir con el mouse casilla por
// casilla y el examen se vuelve eterno.
import { useRef, useState, type KeyboardEvent } from "react";
import { PERMANENTES } from "@/lib/odontograma";
import type { PeriodontogramaDiente } from "@/lib/database.types";
import {
  NOMBRE_PUNTO,
  PUNTOS,
  TEXTO_FURCA,
  TEXTO_MOVILIDAD,
  colorSegunProfundidad,
  dienteVacio,
  esVestibular,
  siguienteCasilla,
  tieneFurca,
  type Casilla,
} from "@/lib/periodontograma";
import { cn } from "@/lib/utils";

/** El orden en que se listan las filas: igual que se lee un cuadrante. */
const ORDEN_FILAS = [
  ...PERMANENTES.arribaDerecha,
  ...PERMANENTES.arribaIzquierda,
  ...PERMANENTES.abajoDerecha,
  ...PERMANENTES.abajoIzquierda,
];

const inputClass =
  "h-8 w-9 rounded-md border border-input bg-card text-center text-[13px] font-medium text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-ring/30 disabled:bg-muted disabled:text-muted-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

/**
 * Salta las piezas ausentes: no tienen casillas que enfocar, asi que si
 * el recorrido cae en una hay que seguir de largo hasta la proxima
 * casilla real. El limite de 200 es solo para no colgarse si algo
 * raro pasa (nunca hay mas de 192 casillas).
 */
function siguienteCasillaValida(actual: Casilla, ausentes: Set<string>): Casilla | null {
  let sig = siguienteCasilla(actual);
  let vueltas = 0;
  while (sig && ausentes.has(sig.diente) && vueltas < 200) {
    sig = siguienteCasilla(sig);
    vueltas++;
  }
  return sig;
}

/** Fila de una pieza. Separada para que cada diente tenga su propio estado local. */
function FilaDiente({
  diente,
  registro,
  onGuardar,
  refInputs,
  ausentes,
  soloLectura,
}: {
  diente: string;
  registro: PeriodontogramaDiente;
  onGuardar: (fila: PeriodontogramaDiente) => void;
  refInputs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
  ausentes: Set<string>;
  soloLectura: boolean;
}) {
  const [fila, setFila] = useState(registro);

  // Si llega una version nueva de fuera (por ejemplo, se creo el examen
  // heredando ausente/furca del anterior), la tomamos como base.
  if (fila.periodontograma_id !== registro.periodontograma_id || fila.tooth !== registro.tooth) {
    setFila(registro);
  }

  function actualizar(cambios: Partial<PeriodontogramaDiente>) {
    setFila((prev) => ({ ...prev, ...cambios }));
  }

  function guardarYa(cambios: Partial<PeriodontogramaDiente>) {
    const nueva = { ...fila, ...cambios };
    setFila(nueva);
    onGuardar(nueva);
  }

  function numero(punto: number, campo: "profundidad" | "margen", valor: string) {
    const arr = [...fila[campo]];
    arr[punto] = valor === "" ? null : Math.max(0, Math.min(15, Number(valor)));
    actualizar({ [campo]: arr } as Partial<PeriodontogramaDiente>);
  }

  function marca(punto: number, campo: "sangrado" | "placa" | "supuracion") {
    const arr = [...fila[campo]];
    arr[punto] = !arr[punto];
    guardarYa({ [campo]: arr } as Partial<PeriodontogramaDiente>);
  }

  function guardarCampo() {
    onGuardar(fila);
  }

  function enfocar(casilla: Casilla, campo: "profundidad" | "margen") {
    refInputs.current[`${casilla.diente}|${casilla.punto}|${campo}`]?.focus();
  }

  function teclaProfundidad(punto: number) {
    return (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      enfocar({ diente, punto }, "margen");
    };
  }

  function teclaMargen(punto: number) {
    return (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      const siguiente = siguienteCasillaValida({ diente, punto }, ausentes);
      if (siguiente) enfocar(siguiente, "profundidad");
    };
  }

  const puedeFurca = tieneFurca(diente);
  const puntosVestibular = Array.from({ length: PUNTOS }, (_, i) => i).filter(esVestibular);
  const puntosLingual = Array.from({ length: PUNTOS }, (_, i) => i).filter((i) => !esVestibular(i));

  return (
    <tr className={cn("border-b border-border", fila.ausente && "opacity-50")}>
      <td className="sticky left-0 z-10 bg-card px-3 py-2 align-middle">
        <div className="flex items-center gap-2">
          <span className="w-8 shrink-0 text-sm font-bold tabular-nums">{diente}</span>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={fila.ausente}
              disabled={soloLectura}
              onChange={(e) => guardarYa({ ausente: e.target.checked })}
              className="size-3.5 rounded border-input accent-primary"
            />
            Ausente
          </label>
        </div>
      </td>

      {!fila.ausente ? (
        <>
          {[puntosVestibular, puntosLingual].map((grupo, gi) => (
            <td
              key={gi}
              className={cn("px-2 py-2", gi === 0 && "border-r border-dashed border-border-strong")}
            >
              <div className="flex gap-1.5">
                {grupo.map((punto) => (
                  <div
                    key={punto}
                    className="flex flex-col items-center gap-1"
                    title={NOMBRE_PUNTO[punto]}
                  >
                    <div className="flex gap-0.5">
                      <input
                        ref={(el) => {
                          refInputs.current[`${diente}|${punto}|profundidad`] = el;
                        }}
                        type="number"
                        inputMode="numeric"
                        disabled={soloLectura}
                        value={fila.profundidad[punto] ?? ""}
                        placeholder="—"
                        style={{ color: colorSegunProfundidad(fila.profundidad[punto] ?? null) }}
                        onChange={(e) => numero(punto, "profundidad", e.target.value)}
                        onKeyDown={teclaProfundidad(punto)}
                        onBlur={guardarCampo}
                        className={inputClass}
                      />
                      <input
                        ref={(el) => {
                          refInputs.current[`${diente}|${punto}|margen`] = el;
                        }}
                        type="number"
                        inputMode="numeric"
                        disabled={soloLectura}
                        value={fila.margen[punto] ?? ""}
                        placeholder="—"
                        onChange={(e) => numero(punto, "margen", e.target.value)}
                        onKeyDown={teclaMargen(punto)}
                        onBlur={guardarCampo}
                        className={cn(inputClass, "text-muted-foreground")}
                      />
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        title="Sangrado"
                        disabled={soloLectura}
                        onClick={() => marca(punto, "sangrado")}
                        className={cn(
                          "size-2.5 rounded-full border transition-colors",
                          fila.sangrado[punto]
                            ? "border-danger bg-danger"
                            : "border-border-strong bg-transparent",
                        )}
                      />
                      <button
                        type="button"
                        title="Placa"
                        disabled={soloLectura}
                        onClick={() => marca(punto, "placa")}
                        className={cn(
                          "size-2.5 rounded-full border transition-colors",
                          fila.placa[punto]
                            ? "border-warning bg-warning"
                            : "border-border-strong bg-transparent",
                        )}
                      />
                      <button
                        type="button"
                        title="Supuración"
                        disabled={soloLectura}
                        onClick={() => marca(punto, "supuracion")}
                        className={cn(
                          "size-2.5 rounded-full border transition-colors",
                          fila.supuracion[punto]
                            ? "border-accent-foreground bg-accent-foreground"
                            : "border-border-strong bg-transparent",
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </td>
          ))}
        </>
      ) : (
        <td colSpan={2} className="px-3 py-2 text-center text-xs text-muted-foreground">
          Pieza ausente — no se mide
        </td>
      )}

      <td className="px-3 py-2">
        <select
          disabled={soloLectura}
          value={fila.movilidad}
          onChange={(e) => guardarYa({ movilidad: Number(e.target.value) })}
          className="h-8 rounded-md border border-input bg-card px-1.5 text-xs outline-none focus:border-primary"
        >
          {TEXTO_MOVILIDAD.map((t, i) => (
            <option key={i} value={i}>
              {t}
            </option>
          ))}
        </select>
      </td>

      <td className="px-3 py-2">
        {puedeFurca ? (
          <select
            disabled={soloLectura}
            value={fila.furca}
            onChange={(e) => guardarYa({ furca: Number(e.target.value) })}
            className="h-8 rounded-md border border-input bg-card px-1.5 text-xs outline-none focus:border-primary"
          >
            {TEXTO_FURCA.map((t, i) => (
              <option key={i} value={i}>
                {t}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
    </tr>
  );
}

export function Periodontograma({
  examenId,
  dientes,
  onGuardarDiente,
  soloLectura = false,
}: {
  examenId: string;
  dientes: PeriodontogramaDiente[];
  onGuardarDiente: (fila: PeriodontogramaDiente) => void;
  soloLectura?: boolean;
}) {
  const refInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const porDiente = new Map(dientes.map((d) => [d.tooth, d]));
  const ausentes = new Set(dientes.filter((d) => d.ausente).map((d) => d.tooth));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span>
          <strong className="text-foreground">P</strong> = profundidad,{" "}
          <strong className="text-foreground">M</strong> = margen, en milímetros
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-danger" /> sangrado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-warning" /> placa
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-accent-foreground" /> supuración
        </span>
        <span>
          Escribe y dale{" "}
          <kbd className="rounded border border-border-strong bg-card px-1">Enter</kbd> — el cursor
          salta solo al siguiente punto.
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border-strong bg-muted/60 text-xs font-semibold text-muted-foreground">
              <th className="sticky left-0 z-10 bg-muted/60 px-3 py-2 text-left">Diente</th>
              <th className="px-2 py-2 text-left">Por fuera (vestibular)</th>
              <th className="px-2 py-2 text-left">Por dentro (lingual)</th>
              <th className="px-3 py-2 text-left">Movilidad</th>
              <th className="px-3 py-2 text-left">Furca</th>
            </tr>
          </thead>
          <tbody>
            {ORDEN_FILAS.map((diente) => (
              <FilaDiente
                key={diente}
                diente={diente}
                registro={porDiente.get(diente) ?? dienteVacio(examenId, diente)}
                onGuardar={onGuardarDiente}
                refInputs={refInputs}
                ausentes={ausentes}
                soloLectura={soloLectura}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
