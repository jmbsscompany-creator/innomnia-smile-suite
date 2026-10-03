// Arma el PDF de un presupuesto o una receta, con el encabezado de la
// clinica, y lo descarga. Todo pasa en el navegador, no hace falta
// servidor ni guardar nada en otro lado — jsPDF arma el archivo y lo
// descarga el mismo.
import { jsPDF } from "jspdf";
import type { ClinicSettings, ItemDocumento, TipoDocumento } from "./database.types";
import { formatDOP } from "./format";
import { formatShortDate } from "./dates";

const TITULOS: Record<TipoDocumento, string> = {
  presupuesto: "PRESUPUESTO",
  receta: "RECETA",
};

export interface DatosDocumentoPDF {
  tipo: TipoDocumento;
  fecha: string; // ISO
  pacienteNombre: string;
  items: ItemDocumento[];
  total: number | null;
  notas: string;
  clinica: ClinicSettings | null;
}

const ANCHO_PAGINA = 210; // A4 en mm
const MARGEN = 20;
const BORDE_DERECHO = ANCHO_PAGINA - MARGEN;

/** Arma el PDF y lo devuelve, sin descargarlo todavia. */
export function armarPDFDocumento(datos: DatosDocumentoPDF): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGEN;

  // ---------- Encabezado: datos de la clinica ----------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(datos.clinica?.name?.trim() || "Clínica dental", MARGEN, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90);
  const lineasClinica = [
    datos.clinica?.dentist?.trim() ? `Dr(a). ${datos.clinica.dentist.trim()}` : "",
    datos.clinica?.address?.trim() || "",
    datos.clinica?.phone?.trim() ? `Tel: ${datos.clinica.phone.trim()}` : "",
  ].filter(Boolean);
  for (const linea of lineasClinica) {
    doc.text(linea, MARGEN, y);
    y += 5;
  }
  doc.setTextColor(0);

  y += 4;
  doc.setDrawColor(210);
  doc.line(MARGEN, y, BORDE_DERECHO, y);
  y += 10;

  // ---------- Titulo ----------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(TITULOS[datos.tipo], MARGEN, y);
  y += 9;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Paciente: ${datos.pacienteNombre}`, MARGEN, y);
  y += 6;
  doc.text(`Fecha: ${formatShortDate(datos.fecha)}`, MARGEN, y);
  y += 10;

  // ---------- Items ----------
  const conPrecio = datos.tipo === "presupuesto";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(conPrecio ? "Concepto" : "Indicación", MARGEN, y);
  if (conPrecio) doc.text("Precio", BORDE_DERECHO, y, { align: "right" });
  y += 2;
  doc.setDrawColor(230);
  doc.line(MARGEN, y, BORDE_DERECHO, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const anchoTexto = BORDE_DERECHO - MARGEN - (conPrecio ? 30 : 0);
  for (const item of datos.items) {
    const lineasTexto: string[] = doc.splitTextToSize(item.concepto, anchoTexto);
    doc.text(lineasTexto, MARGEN, y);
    if (conPrecio && item.precio !== null) {
      doc.text(formatDOP(item.precio), BORDE_DERECHO, y, { align: "right" });
    }
    y += lineasTexto.length * 5 + 3;
  }

  // ---------- Total (solo presupuesto) ----------
  if (conPrecio && datos.total !== null) {
    y += 3;
    doc.setDrawColor(210);
    doc.line(MARGEN, y, BORDE_DERECHO, y);
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`Total: ${formatDOP(datos.total)}`, BORDE_DERECHO, y, { align: "right" });
    y += 4;
  }

  // ---------- Notas ----------
  if (datos.notas.trim()) {
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Notas:", MARGEN, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const lineasNotas: string[] = doc.splitTextToSize(datos.notas.trim(), BORDE_DERECHO - MARGEN);
    doc.text(lineasNotas, MARGEN, y);
  }

  return doc;
}

/** Nombre de archivo sin espacios ni acentos raros, para que descargue limpio. */
function nombreArchivo(datos: DatosDocumentoPDF): string {
  const base = `${datos.tipo}-${datos.pacienteNombre}-${datos.fecha}`
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
  return `${base}.pdf`;
}

/** Arma el PDF y lo descarga de una vez. */
export function descargarPDFDocumento(datos: DatosDocumentoPDF): void {
  const doc = armarPDFDocumento(datos);
  doc.save(nombreArchivo(datos));
}
