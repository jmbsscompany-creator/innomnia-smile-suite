// Numeracion, caras y estados del odontograma.
// Se usa la notacion FDI, que es la que se usa en RD y casi todo el mundo:
// dos digitos, el primero dice el cuadrante y el segundo la posicion.
//
//        ARRIBA DERECHA │ ARRIBA IZQUIERDA
//         18..11 (q1)   │   21..28 (q2)
//        ───────────────┼──────────────────
//         48..41 (q4)   │   31..38 (q3)
//        ABAJO DERECHA  │ ABAJO IZQUIERDA
//
// "Derecha" e "izquierda" son del paciente, no de quien mira. Por eso
// el cuadrante 1 se dibuja a la izquierda de la pantalla: es como lo ve
// la odontologa parada frente al paciente.

export type Cara = "completo" | "mesial" | "distal" | "oclusal" | "vestibular" | "lingual";

export type Estado =
  | "sano"
  | "caries"
  | "obturado"
  | "sellante"
  | "corona"
  | "endodoncia"
  | "implante"
  | "protesis"
  | "fractura"
  | "extraccion_indicada"
  | "ausente";

export interface InfoEstado {
  clave: Estado;
  nombre: string;
  /** Explicacion en palabras que entienda cualquiera. */
  ayuda: string;
  /** Variable de color definida en styles.css. */
  color: string;
  /** true = afecta al diente entero, no a una cara suelta. */
  dienteCompleto: boolean;
}

export const ESTADOS: InfoEstado[] = [
  {
    clave: "sano",
    nombre: "Sano",
    ayuda: "Sin hallazgos. Borra lo que hubiera marcado.",
    color: "var(--odo-sano)",
    dienteCompleto: false,
  },
  {
    clave: "caries",
    nombre: "Caries",
    ayuda: "Lesion activa que hay que tratar.",
    color: "var(--odo-caries)",
    dienteCompleto: false,
  },
  {
    clave: "obturado",
    nombre: "Obturado",
    ayuda: "Ya tiene resina o amalgama.",
    color: "var(--odo-obturado)",
    dienteCompleto: false,
  },
  {
    clave: "sellante",
    nombre: "Sellante",
    ayuda: "Sellado preventivo, sobre todo en ninos.",
    color: "var(--odo-sellante)",
    dienteCompleto: false,
  },
  {
    clave: "corona",
    nombre: "Corona",
    ayuda: "Corona colocada sobre el diente.",
    color: "var(--odo-corona)",
    dienteCompleto: true,
  },
  {
    clave: "endodoncia",
    nombre: "Endodoncia",
    ayuda: "Tratamiento de conducto hecho.",
    color: "var(--odo-endodoncia)",
    dienteCompleto: true,
  },
  {
    clave: "implante",
    nombre: "Implante",
    ayuda: "Pieza sustituida por un implante.",
    color: "var(--odo-implante)",
    dienteCompleto: true,
  },
  {
    clave: "protesis",
    nombre: "Protesis",
    ayuda: "Forma parte de una protesis o puente.",
    color: "var(--odo-protesis)",
    dienteCompleto: true,
  },
  {
    clave: "fractura",
    nombre: "Fractura",
    ayuda: "Diente fracturado.",
    color: "var(--odo-fractura)",
    dienteCompleto: true,
  },
  {
    clave: "extraccion_indicada",
    nombre: "Extraccion indicada",
    ayuda: "Hay que sacarlo, todavia esta puesto.",
    color: "var(--odo-extraccion)",
    dienteCompleto: true,
  },
  {
    clave: "ausente",
    nombre: "Ausente",
    ayuda: "Ya no esta en boca.",
    color: "var(--odo-ausente)",
    dienteCompleto: true,
  },
];

export const ESTADO_POR_CLAVE: Record<Estado, InfoEstado> = Object.fromEntries(
  ESTADOS.map((e) => [e.clave, e]),
) as Record<Estado, InfoEstado>;

/* ---------- Que dientes hay ---------- */

const serie = (cuadrante: number, cuantos: number) =>
  Array.from({ length: cuantos }, (_, i) => `${cuadrante}${i + 1}`);

/** Adultos: 32 piezas. Se dibujan de fuera hacia dentro en cada mitad. */
export const PERMANENTES = {
  arribaDerecha: serie(1, 8).reverse(), // 18..11
  arribaIzquierda: serie(2, 8), // 21..28
  abajoDerecha: serie(4, 8).reverse(), // 48..41
  abajoIzquierda: serie(3, 8), // 31..38
};

/** Ninos: 20 piezas de leche. */
export const TEMPORALES = {
  arribaDerecha: serie(5, 5).reverse(), // 55..51
  arribaIzquierda: serie(6, 5), // 61..65
  abajoDerecha: serie(8, 5).reverse(), // 85..81
  abajoIzquierda: serie(7, 5), // 71..75
};

export function esArribaEl(diente: string): boolean {
  const q = Number(diente[0]);
  return q === 1 || q === 2 || q === 5 || q === 6;
}

/** Los cuadrantes 1, 4, 5 y 8 son el lado derecho del paciente. */
export function esDerechaDelPaciente(diente: string): boolean {
  const q = Number(diente[0]);
  return q === 1 || q === 4 || q === 5 || q === 8;
}

/** Los incisivos y caninos no tienen cara oclusal: tienen borde incisal. */
export function esAnterior(diente: string): boolean {
  const pos = Number(diente[1]);
  return pos <= 3;
}

/**
 * A que cara corresponde cada zona del dibujo.
 * El dibujo siempre tiene las mismas cinco zonas (arriba, abajo, izquierda,
 * derecha y centro), pero el nombre anatomico cambia segun donde esta el
 * diente en la boca. Esto lo traduce.
 */
export function carasDelDiente(diente: string): {
  arriba: Cara;
  abajo: Cara;
  izquierda: Cara;
  derecha: Cara;
  centro: Cara;
} {
  const arriba = esArribaEl(diente);
  const derechaPaciente = esDerechaDelPaciente(diente);

  // En los de arriba, la cara del labio queda hacia arriba en el dibujo.
  // En los de abajo, hacia abajo.
  const zonaArriba: Cara = arriba ? "vestibular" : "lingual";
  const zonaAbajo: Cara = arriba ? "lingual" : "vestibular";

  // Mesial es la cara que mira al centro de la boca. En la mitad derecha
  // de la pantalla el centro queda a la izquierda, y al reves.
  const zonaIzquierda: Cara = derechaPaciente ? "distal" : "mesial";
  const zonaDerecha: Cara = derechaPaciente ? "mesial" : "distal";

  return {
    arriba: zonaArriba,
    abajo: zonaAbajo,
    izquierda: zonaIzquierda,
    derecha: zonaDerecha,
    centro: "oclusal",
  };
}

export const NOMBRE_CARA: Record<Cara, string> = {
  completo: "Diente completo",
  mesial: "Mesial",
  distal: "Distal",
  oclusal: "Oclusal",
  vestibular: "Vestibular",
  lingual: "Lingual",
};

/** Nombre de la pieza, para mostrarlo al pasar el mouse. */
export function nombreDelDiente(diente: string): string {
  const pos = Number(diente[1]);
  const q = Number(diente[0]);
  const leche = q >= 5;
  const nombres: Record<number, string> = {
    1: "Incisivo central",
    2: "Incisivo lateral",
    3: "Canino",
    4: leche ? "Primer molar" : "Primer premolar",
    5: leche ? "Segundo molar" : "Segundo premolar",
    6: "Primer molar",
    7: "Segundo molar",
    8: "Tercer molar (cordal)",
  };
  const lado = esDerechaDelPaciente(diente) ? "derecho" : "izquierdo";
  const altura = esArribaEl(diente) ? "superior" : "inferior";
  return `${nombres[pos] ?? "Pieza"} ${altura} ${lado}${leche ? " (de leche)" : ""}`;
}
