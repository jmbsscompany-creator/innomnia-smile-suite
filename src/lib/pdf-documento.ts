// Arma el PDF de un presupuesto o una receta, con el encabezado de la
// clinica, y lo descarga. Todo pasa en el navegador, no hace falta
// servidor ni guardar nada en otro lado — jsPDF arma el archivo y lo
// descarga el mismo.
import { jsPDF } from "jspdf";
import type { ClinicSettings, ItemDocumento, TipoDocumento } from "./database.types";
import { formatDOP } from "./format";
import { formatShortDate } from "./dates";

const TITULOS: Record<TipoDocumento, string> = {
  presupuesto: "Presupuesto",
  receta: "Receta",
};

// Mismos colores de marca que el sistema (de los tokens oklch de
// src/styles.css, convertidos a RGB porque jsPDF no entiende oklch).
// Si el azul de la clinica cambia ahi, hay que actualizarlo aqui tambien.
const COLOR_PRIMARIO: [number, number, number] = [61, 143, 228]; // --primary
const COLOR_PRIMARIO_SUAVE: [number, number, number] = [230, 242, 253]; // --primary-soft
const COLOR_TEXTO: [number, number, number] = [28, 39, 53]; // --foreground
const COLOR_TEXTO_SUAVE: [number, number, number] = [106, 118, 131]; // --muted-foreground
const COLOR_BORDE: [number, number, number] = [226, 233, 238]; // --border

export interface DatosDocumentoPDF {
  /** El id del documento ya guardado, para el folio. Opcional por si se arma antes de guardar. */
  id?: string | null;
  tipo: TipoDocumento;
  fecha: string; // ISO
  pacienteNombre: string;
  items: ItemDocumento[];
  total: number | null;
  notas: string;
  clinica: ClinicSettings | null;
}

const ANCHO_PAGINA = 210; // A4 en mm
const ALTO_PAGINA = 297;
const MARGEN = 20;
const BORDE_DERECHO = ANCHO_PAGINA - MARGEN;

/** "a1b2c3d4" -> "A1B2-C3D4", para que el folio se lea mejor. */
function folioDe(id: string | null | undefined): string | null {
  if (!id) return null;
  const corto = id.replace(/-/g, "").slice(0, 8).toUpperCase();
  return `${corto.slice(0, 4)}-${corto.slice(4)}`;
}

/** Arma el PDF y lo devuelve, sin descargarlo todavia. */
export function armarPDFDocumento(datos: DatosDocumentoPDF): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGEN;

  const nombreClinica = datos.clinica?.name?.trim() || "Clínica dental";
  const lineasClinica = [
    datos.clinica?.dentist?.trim() ? `Dr(a). ${datos.clinica.dentist.trim()}` : "",
    datos.clinica?.address?.trim() || "",
    datos.clinica?.phone?.trim() ? `Tel: ${datos.clinica.phone.trim()}` : "",
  ].filter(Boolean);

  // ---------- Encabezado: datos de la clinica ----------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  doc.setTextColor(...COLOR_PRIMARIO);
  doc.text(nombreClinica, MARGEN, y);
  y += 7.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...COLOR_TEXTO_SUAVE);
  for (const linea of lineasClinica) {
    doc.text(linea, MARGEN, y);
    y += 4.6;
  }

  y += 4;
  doc.setDrawColor(...COLOR_PRIMARIO);
  doc.setLineWidth(0.6);
  doc.line(MARGEN, y, BORDE_DERECHO, y);
  doc.setLineWidth(0.2);
  y += 11;

  // ---------- Titulo y folio ----------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...COLOR_TEXTO);
  doc.text(TITULOS[datos.tipo], MARGEN, y);

  const folio = folioDe(datos.id);
  if (folio) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COLOR_TEXTO_SUAVE);
    doc.text(`N.º ${folio}`, BORDE_DERECHO, y, { align: "right" });
  }
  y += 9;

  // ---------- Paciente y fecha ----------
  doc.setFontSize(10.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLOR_TEXTO_SUAVE);
  doc.text("Paciente", MARGEN, y);
  doc.text("Fecha", MARGEN + 90, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11.5);
  doc.setTextColor(...COLOR_TEXTO);
  doc.text(datos.pacienteNombre, MARGEN, y);
  doc.text(formatShortDate(datos.fecha), MARGEN + 90, y);
  y += 11;

  // ---------- Items ----------
  const conPrecio = datos.tipo === "presupuesto";
  const anchoTabla = BORDE_DERECHO - MARGEN;

  // Encabezado de la tabla, con una franja de color de fondo para que se
  // distinga de las filas.
  doc.setFillColor(...COLOR_PRIMARIO_SUAVE);
  doc.rect(MARGEN, y - 5.5, anchoTabla, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...COLOR_PRIMARIO);
  doc.text(conPrecio ? "CONCEPTO" : "INDICACIÓN", MARGEN + 3, y);
  if (conPrecio) doc.text("PRECIO", BORDE_DERECHO - 3, y, { align: "right" });
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...COLOR_TEXTO);
  const anchoTexto = anchoTabla - 3 - (conPrecio ? 30 : 3);
  datos.items.forEach((item, i) => {
    const lineasTexto: string[] = doc.splitTextToSize(item.concepto, anchoTexto);
    const alturaFila = lineasTexto.length * 5 + 4;

    doc.text(lineasTexto, MARGEN + 3, y);
    if (conPrecio && item.precio !== null) {
      doc.text(formatDOP(item.precio), BORDE_DERECHO - 3, y, { align: "right" });
    }
    y += alturaFila;

    // Linea fina entre filas, menos despues de la ultima (ahi va la de abajo del todo).
    if (i < datos.items.length - 1) {
      doc.setDrawColor(...COLOR_BORDE);
      doc.line(MARGEN, y - alturaFila / 2 + 1, BORDE_DERECHO, y - alturaFila / 2 + 1);
    }
  });

  y += 2;
  doc.setDrawColor(...COLOR_PRIMARIO_SUAVE);
  doc.line(MARGEN, y, BORDE_DERECHO, y);
  y += 4;

  // ---------- Total (solo presupuesto), en un recuadro destacado ----------
  if (conPrecio && datos.total !== null) {
    const altoCaja = 14;
    doc.setFillColor(...COLOR_PRIMARIO_SUAVE);
    doc.roundedRect(BORDE_DERECHO - 70, y, 70, altoCaja, 2, 2, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...COLOR_TEXTO_SUAVE);
    doc.text("TOTAL", BORDE_DERECHO - 64, y + 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...COLOR_PRIMARIO);
    doc.text(formatDOP(datos.total), BORDE_DERECHO - 3, y + 10.5, { align: "right" });
    y += altoCaja + 10;
  } else {
    y += 6;
  }

  // ---------- Notas ----------
  if (datos.notas.trim()) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...COLOR_TEXTO_SUAVE);
    doc.text("NOTAS", MARGEN, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(...COLOR_TEXTO);
    const lineasNotas: string[] = doc.splitTextToSize(datos.notas.trim(), anchoTabla);
    doc.text(lineasNotas, MARGEN, y);
  }

  // ---------- Pie de pagina ----------
  const yPie = ALTO_PAGINA - 15;
  doc.setDrawColor(...COLOR_BORDE);
  doc.line(MARGEN, yPie, BORDE_DERECHO, yPie);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR_TEXTO_SUAVE);
  const piePartes = [nombreClinica, datos.clinica?.phone?.trim()].filter(Boolean);
  doc.text(piePartes.join(" · "), MARGEN, yPie + 5.5);
  doc.text(
    `Generado el ${formatShortDate(new Date().toISOString().slice(0, 10))}`,
    BORDE_DERECHO,
    yPie + 5.5,
    {
      align: "right",
    },
  );

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
