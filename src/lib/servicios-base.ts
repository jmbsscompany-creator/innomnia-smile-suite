// Lista de arranque de servicios dentales, con precios de referencia en RD$.
// NO son los precios de la clinica: son un punto de partida para no escribir
// 14 tratamientos a mano. Se editan uno por uno despues de cargarlos.

export const CATEGORIAS_SUGERIDAS = [
  "Prevencion",
  "Restauracion",
  "Endodoncia",
  "Cirugia",
  "Estetica",
  "Ortodoncia",
] as const;

export interface ServicioBase {
  name: string;
  category: string;
  duration: number;
  price: number;
  description: string;
}

export const SERVICIOS_BASE: ServicioBase[] = [
  {
    name: "Consulta y evaluacion",
    category: "Prevencion",
    duration: 30,
    price: 1500,
    description: "Revision general, diagnostico y plan de tratamiento.",
  },
  {
    name: "Limpieza dental (profilaxis)",
    category: "Prevencion",
    duration: 45,
    price: 3500,
    description: "Eliminacion de placa y sarro, pulido y fluor.",
  },
  {
    name: "Aplicacion de fluor",
    category: "Prevencion",
    duration: 15,
    price: 1200,
    description: "Fortalece el esmalte y previene caries.",
  },
  {
    name: "Sellantes de fosas y fisuras",
    category: "Prevencion",
    duration: 30,
    price: 1800,
    description: "Por pieza. Ideal para ninos y adolescentes.",
  },
  {
    name: "Resina dental (obturacion)",
    category: "Restauracion",
    duration: 60,
    price: 4500,
    description: "Restauracion estetica del color del diente.",
  },
  {
    name: "Corona de porcelana",
    category: "Restauracion",
    duration: 90,
    price: 28000,
    description: "Incluye toma de impresion y colocacion.",
  },
  {
    name: "Incrustacion",
    category: "Restauracion",
    duration: 75,
    price: 15000,
    description: "Restauracion indirecta para cavidades grandes.",
  },
  {
    name: "Endodoncia (canal)",
    category: "Endodoncia",
    duration: 90,
    price: 18000,
    description: "Tratamiento de conducto en una o dos sesiones.",
  },
  {
    name: "Extraccion simple",
    category: "Cirugia",
    duration: 45,
    price: 4000,
    description: "Extraccion de pieza dental sin complicaciones.",
  },
  {
    name: "Extraccion de cordal",
    category: "Cirugia",
    duration: 60,
    price: 12000,
    description: "Extraccion quirurgica de tercer molar.",
  },
  {
    name: "Blanqueamiento dental",
    category: "Estetica",
    duration: 60,
    price: 16000,
    description: "Blanqueamiento en consultorio con lampara LED.",
  },
  {
    name: "Carillas de porcelana",
    category: "Estetica",
    duration: 120,
    price: 32000,
    description: "Por pieza. Diseno de sonrisa personalizado.",
  },
  {
    name: "Ortodoncia · instalacion",
    category: "Ortodoncia",
    duration: 90,
    price: 45000,
    description: "Brackets metalicos. Incluye primer control.",
  },
  {
    name: "Ortodoncia · control mensual",
    category: "Ortodoncia",
    duration: 30,
    price: 3000,
    description: "Ajuste y seguimiento del tratamiento.",
  },
];
