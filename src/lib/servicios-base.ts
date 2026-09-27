// Lista de arranque de servicios dentales, con precios de referencia en RD$.
// NO son los precios de la clinica: son un punto de partida para no escribir
// 14 tratamientos a mano. Se editan uno por uno despues de cargarlos.

export const CATEGORIAS_SUGERIDAS = [
  "Prevención",
  "Restauración",
  "Endodoncia",
  "Cirugía",
  "Estética",
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
    name: "Consulta y evaluación",
    category: "Prevención",
    duration: 30,
    price: 1500,
    description: "Revisión general, diagnóstico y plan de tratamiento.",
  },
  {
    name: "Limpieza dental (profilaxis)",
    category: "Prevención",
    duration: 45,
    price: 3500,
    description: "Eliminación de placa y sarro, pulido y flúor.",
  },
  {
    name: "Aplicación de flúor",
    category: "Prevención",
    duration: 15,
    price: 1200,
    description: "Fortalece el esmalte y previene caries.",
  },
  {
    name: "Sellantes de fosas y fisuras",
    category: "Prevención",
    duration: 30,
    price: 1800,
    description: "Por pieza. Ideal para niños y adolescentes.",
  },
  {
    name: "Resina dental (obturación)",
    category: "Restauración",
    duration: 60,
    price: 4500,
    description: "Restauración estética del color del diente.",
  },
  {
    name: "Corona de porcelana",
    category: "Restauración",
    duration: 90,
    price: 28000,
    description: "Incluye toma de impresión y colocación.",
  },
  {
    name: "Incrustación",
    category: "Restauración",
    duration: 75,
    price: 15000,
    description: "Restauración indirecta para cavidades grandes.",
  },
  {
    name: "Endodoncia (canal)",
    category: "Endodoncia",
    duration: 90,
    price: 18000,
    description: "Tratamiento de conducto en una o dos sesiones.",
  },
  {
    name: "Extracción simple",
    category: "Cirugía",
    duration: 45,
    price: 4000,
    description: "Extracción de pieza dental sin complicaciones.",
  },
  {
    name: "Extracción de cordal",
    category: "Cirugía",
    duration: 60,
    price: 12000,
    description: "Extracción quirúrgica de tercer molar.",
  },
  {
    name: "Blanqueamiento dental",
    category: "Estética",
    duration: 60,
    price: 16000,
    description: "Blanqueamiento en consultorio con lámpara LED.",
  },
  {
    name: "Carillas de porcelana",
    category: "Estética",
    duration: 120,
    price: 32000,
    description: "Por pieza. Diseño de sonrisa personalizado.",
  },
  {
    name: "Ortodoncia · instalación",
    category: "Ortodoncia",
    duration: 90,
    price: 45000,
    description: "Brackets metálicos. Incluye primer control.",
  },
  {
    name: "Ortodoncia · control mensual",
    category: "Ortodoncia",
    duration: 30,
    price: 3000,
    description: "Ajuste y seguimiento del tratamiento.",
  },
];
