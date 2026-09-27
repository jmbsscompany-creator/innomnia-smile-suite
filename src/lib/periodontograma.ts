// Calculos y orden clinico del periodontograma.
//
// Aqui no hay nada de pantalla: solo las reglas de como se mide una
// encia y que significan los numeros. La pantalla usa esto.

import { PERMANENTES } from "@/lib/odontograma";
import type { PeriodontogramaDiente } from "@/lib/database.types";

/** Los seis puntos de sondeo, siempre en este orden en los arreglos. */
export const PUNTOS = 6;

export const NOMBRE_PUNTO = [
  "Vestibular mesial",
  "Vestibular central",
  "Vestibular distal",
  "Lingual mesial",
  "Lingual central",
  "Lingual distal",
] as const;

/** Los tres primeros son la cara de fuera, los tres ultimos la de dentro. */
export const esVestibular = (punto: number) => punto < 3;

/** Una fila en blanco, para dientes que todavia no se han tocado. */
export function dienteVacio(examenId: string, diente: string): PeriodontogramaDiente {
  return {
    periodontograma_id: examenId,
    tooth: diente,
    profundidad: Array(PUNTOS).fill(null) as (number | null)[],
    margen: Array(PUNTOS).fill(null) as (number | null)[],
    sangrado: Array(PUNTOS).fill(false) as boolean[],
    placa: Array(PUNTOS).fill(false) as boolean[],
    supuracion: Array(PUNTOS).fill(false) as boolean[],
    movilidad: 0,
    furca: 0,
    ausente: false,
  };
}

/* ---------- El numero que de verdad importa ---------- */

/**
 * Nivel de insercion clinica (NIC): cuanto soporte ha perdido el diente.
 *
 * No es lo mismo que la profundidad de la bolsa. Una bolsa de 4 mm en
 * una encia normal es un problema moderado; esos mismos 4 mm en una
 * encia que ya se retrajo 3 mm son 7 mm de dano real. Por eso el
 * diagnostico se hace con este numero y no con la profundidad sola.
 *
 * El margen se anota negativo cuando la encia esta retraida, asi que
 * restarlo suma el dano.
 */
export function nivelInsercion(profundidad: number | null, margen: number | null): number | null {
  if (profundidad === null) return null;
  return profundidad - (margen ?? 0);
}

/* ---------- Resumen de toda la boca ---------- */

export interface IndicesPerio {
  /** Cuantos puntos se han medido de verdad (de 192 posibles). */
  puntosMedidos: number;
  /** Porcentaje de puntos que sangraron. Es EL indicador de inflamacion. */
  pctSangrado: number;
  pctPlaca: number;
  /** Bolsas moderadas y bolsas graves. */
  sitios4mm: number;
  sitios6mm: number;
  /** La peor perdida de soporte de toda la boca. */
  nicMaximo: number | null;
  dientesAusentes: number;
  dientesConMovilidad: number;
  dientesConFurca: number;
}

export function calcularIndices(dientes: PeriodontogramaDiente[]): IndicesPerio {
  let medidos = 0;
  let sangraron = 0;
  let conPlaca = 0;
  let s4 = 0;
  let s6 = 0;
  let nicMax: number | null = null;
  let ausentes = 0;
  let conMovilidad = 0;
  let conFurca = 0;

  for (const d of dientes) {
    if (d.ausente) {
      ausentes++;
      continue; // Una pieza que no esta no ensucia los porcentajes.
    }
    if (d.movilidad > 0) conMovilidad++;
    if (d.furca > 0) conFurca++;

    for (let i = 0; i < PUNTOS; i++) {
      const p = d.profundidad[i] ?? null;
      if (p === null) continue; // Sin medir: no cuenta ni a favor ni en contra.

      medidos++;
      if (d.sangrado[i]) sangraron++;
      if (d.placa[i]) conPlaca++;
      if (p >= 4) s4++;
      if (p >= 6) s6++;

      const nic = nivelInsercion(p, d.margen[i] ?? null);
      if (nic !== null && (nicMax === null || nic > nicMax)) nicMax = nic;
    }
  }

  const pct = (n: number) => (medidos === 0 ? 0 : Math.round((n / medidos) * 1000) / 10);

  return {
    puntosMedidos: medidos,
    pctSangrado: pct(sangraron),
    pctPlaca: pct(conPlaca),
    sitios4mm: s4,
    sitios6mm: s6,
    nicMaximo: nicMax,
    dientesAusentes: ausentes,
    dientesConMovilidad: conMovilidad,
    dientesConFurca: conFurca,
  };
}

/* ---------- El orden en que se sondea ---------- */

/**
 * La doctora no salta de diente en diente: recorre la boca de corrido,
 * primero toda la cara de fuera de una arcada y despues vuelve por la
 * de dentro. Si el cursor no sigue ese mismo camino, hay que ir
 * haciendo clic casilla por casilla y el examen se vuelve eterno.
 *
 * Dentro de cada diente los tres puntos se anotan en el sentido de la
 * marcha, no siempre en el mismo orden: yendo de 18 hacia 11 se va de
 * distal a mesial, y de 21 hacia 28 al reves.
 */
export interface Casilla {
  diente: string;
  punto: number;
}

function tramo(dientes: string[], puntos: number[]): Casilla[] {
  return dientes.flatMap((diente) => puntos.map((punto) => ({ diente, punto })));
}

/** Indices de los tres puntos de cada cara, segun hacia donde se avanza. */
const VEST_HACIA_MESIAL = [2, 1, 0]; // distal, central, mesial
const VEST_HACIA_DISTAL = [0, 1, 2]; // mesial, central, distal
const LING_HACIA_MESIAL = [5, 4, 3];
const LING_HACIA_DISTAL = [3, 4, 5];

/**
 * El recorrido completo de una boca de adulto: 32 dientes x 6 puntos.
 * Arriba: se barre toda la cara de fuera de derecha a izquierda, y se
 * vuelve por la de dentro. Abajo, igual.
 */
export const RECORRIDO: Casilla[] = [
  // Arcada de arriba, por fuera: 18..11 y luego 21..28
  ...tramo(PERMANENTES.arribaDerecha, VEST_HACIA_MESIAL),
  ...tramo(PERMANENTES.arribaIzquierda, VEST_HACIA_DISTAL),
  // Arcada de arriba, volviendo por dentro: 28..21 y luego 11..18
  ...tramo([...PERMANENTES.arribaIzquierda].reverse(), LING_HACIA_MESIAL),
  ...tramo([...PERMANENTES.arribaDerecha].reverse(), LING_HACIA_DISTAL),
  // Arcada de abajo, por fuera
  ...tramo(PERMANENTES.abajoDerecha, VEST_HACIA_MESIAL),
  ...tramo(PERMANENTES.abajoIzquierda, VEST_HACIA_DISTAL),
  // Arcada de abajo, volviendo por dentro
  ...tramo([...PERMANENTES.abajoIzquierda].reverse(), LING_HACIA_MESIAL),
  ...tramo([...PERMANENTES.abajoDerecha].reverse(), LING_HACIA_DISTAL),
];

/** Donde esta una casilla dentro del recorrido, para saber cual sigue. */
export function siguienteCasilla(actual: Casilla): Casilla | null {
  const i = RECORRIDO.findIndex((c) => c.diente === actual.diente && c.punto === actual.punto);
  if (i === -1 || i === RECORRIDO.length - 1) return null;
  return RECORRIDO[i + 1] ?? null;
}

/* ---------- Furca ---------- */

/**
 * La furca es el espacio entre las raices, asi que solo existe donde
 * hay mas de una. Marcarla en un incisivo no significa nada, y ofrecer
 * la casilla invita a llenarla mal.
 */
export function tieneFurca(diente: string): boolean {
  const pos = Number(diente[1]);
  const arriba = ["1", "2", "5", "6"].includes(diente[0] ?? "");
  if (pos >= 6) return true; // molares, arriba y abajo
  if (arriba && pos === 4) return true; // primer premolar superior: dos raices
  return false;
}

export const TEXTO_MOVILIDAD = ["0 — firme", "I — leve", "II — moderada", "III — severa"];
export const TEXTO_FURCA = ["0 — no", "I — inicial", "II — parcial", "III — pasante"];

/* ---------- Color segun severidad ---------- */

/**
 * Como se pinta un valor de profundidad, en la rejilla y en el grafico.
 * Un solo lugar para esta regla: si el criterio clinico cambia (por
 * ejemplo el corte de "grave" pasa de 6 a 5mm), se cambia aqui y se
 * actualizan las dos pantallas a la vez.
 *
 *   null      sin medir todavia -> undefined (color por defecto)
 *   0 a 3 mm  normal            -> undefined (color por defecto)
 *   4 a 5 mm  bolsa moderada    -> dorado (aviso)
 *   6+ mm     bolsa grave       -> rojo (alarma)
 */
export function colorSegunProfundidad(p: number | null): string | undefined {
  if (p === null) return undefined;
  if (p >= 6) return "var(--odo-extraccion)";
  if (p >= 4) return "var(--odo-corona)";
  return undefined;
}

/** La peor (mas alta) profundidad medida en un diente, o null si no hay ninguna. */
export function peorProfundidad(fila: PeriodontogramaDiente): number | null {
  let peor: number | null = null;
  for (const p of fila.profundidad) {
    if (p !== null && (peor === null || p > peor)) peor = p;
  }
  return peor;
}
