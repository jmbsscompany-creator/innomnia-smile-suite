// Enlaces para escribir por WhatsApp sin copiar y pegar el numero.
//
// WhatsApp acepta enlaces del tipo https://wa.me/18095550100 : solo digitos,
// con codigo de pais y sin + ni espacios ni guiones. El problema es que los
// telefonos de una clinica se escriben de mil formas ("809-555-0100",
// "(829) 555 0100", "+1 849 555 0100", "8298899009"), y mas todavia cuando
// vienen de un Excel viejo. Esto los deja todos en el mismo formato.

/** Republica Dominicana: +1, con los prefijos 809, 829 y 849. */
const PREFIJOS_RD = ["809", "829", "849"];
const PAIS_POR_DEFECTO = "1";

/**
 * Devuelve el numero listo para wa.me, o null si no hay forma de armarlo.
 *
 * Si el telefono ya trae un "+", se respeta tal cual: puede ser un paciente
 * extranjero y no queremos inventarle un pais.
 */
export function numeroWhatsApp(telefono: string | null | undefined): string | null {
  if (!telefono) return null;

  const texto = telefono.trim();
  const digitos = texto.replace(/\D/g, "");
  if (digitos.length === 0) return null;

  // Ya viene con codigo de pais explicito.
  if (texto.startsWith("+")) {
    return digitos.length >= 8 ? digitos : null;
  }

  // 10 digitos con prefijo dominicano: le falta el 1 de delante.
  if (digitos.length === 10 && PREFIJOS_RD.includes(digitos.slice(0, 3))) {
    return PAIS_POR_DEFECTO + digitos;
  }

  // 11 digitos que ya empiezan por 1: esta completo.
  if (digitos.length === 11 && digitos.startsWith("1")) {
    return digitos;
  }

  // Cualquier otro largo razonable se deja como esta. Puede ser de otro pais
  // ya escrito entero. Si esta mal, WhatsApp avisa al abrirlo; es mejor eso
  // que no ofrecer el boton.
  if (digitos.length >= 8 && digitos.length <= 15) return digitos;

  return null;
}

/** true si con ese telefono se puede armar un enlace de WhatsApp. */
export function tieneWhatsApp(telefono: string | null | undefined): boolean {
  return numeroWhatsApp(telefono) !== null;
}

/**
 * El enlace completo. Si se pasa un mensaje, WhatsApp abre el chat con el
 * texto ya escrito y la persona solo le da a enviar (puede editarlo antes).
 */
export function enlaceWhatsApp(
  telefono: string | null | undefined,
  mensaje?: string,
): string | null {
  const numero = numeroWhatsApp(telefono);
  if (!numero) return null;
  const base = `https://wa.me/${numero}`;
  const limpio = mensaje?.trim();
  return limpio ? `${base}?text=${encodeURIComponent(limpio)}` : base;
}

/** Enlace para llamar por telefono, para el boton de al lado. */
export function enlaceLlamada(telefono: string | null | undefined): string | null {
  const numero = numeroWhatsApp(telefono);
  return numero ? `tel:+${numero}` : null;
}

/* ---------- Mensajes ya escritos ----------
   La secretaria manda siempre lo mismo varias veces al dia. Estos son
   borradores: al abrir WhatsApp el texto ya esta puesto y ella lo cambia
   si quiere antes de enviar. Se escriben de usted, que es como se trata
   a un paciente en una clinica. */

/** Solo el nombre de pila: "Ana Maria Lopez Perez" -> "Ana". */
function primerNombre(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] ?? "";
}

export function saludo(nombre: string, clinica: string): string {
  const quien = primerNombre(nombre);
  const de = clinica.trim() ? ` de ${clinica.trim()}` : "";
  return `Hola ${quien}, le saludamos${de}.`;
}

/**
 * "del 22 de septiembre" lleva articulo, pero "de hoy" no: sin esto el
 * mensaje sale como "su cita del hoy", que suena a maquina.
 */
function cuando(fecha: string): string {
  const f = fecha.trim().toLowerCase();
  return f === "hoy" || f === "mañana" ? `de ${f}` : `del ${fecha.trim()}`;
}

export function mensajeRecordatorio(
  nombre: string,
  clinica: string,
  fecha: string,
  hora: string,
): string {
  return (
    `${saludo(nombre, clinica)} Le recordamos su cita ${cuando(fecha)} a las ${hora}. ` +
    `Si necesita cambiarla, puede responder por aquí mismo.`
  );
}

export function mensajeConfirmacion(
  nombre: string,
  clinica: string,
  fecha: string,
  hora: string,
): string {
  return (
    `${saludo(nombre, clinica)} Su cita quedó agendada para ${cuando(fecha)} a las ${hora}. ` +
    `Cualquier cambio, escríbanos por aquí.`
  );
}

export function mensajeSeguimiento(nombre: string, clinica: string): string {
  return (
    `${saludo(nombre, clinica)} Hace un tiempo que no lo vemos por la consulta. ` +
    `Queríamos saber cómo sigue y si desea agendar una revisión.`
  );
}

/** Para cuando un paciente no vino a su cita: se le escribe para dar seguimiento. */
export function mensajeNoAsistio(
  nombre: string,
  clinica: string,
  fecha: string,
  hora: string,
): string {
  return (
    `${saludo(nombre, clinica)} Notamos que no pudo venir a su cita ${cuando(fecha)} a las ${hora}. ` +
    `¿Le gustaría que le agendemos una nueva fecha?`
  );
}

/** Como se lee cada forma de pago en un mensaje, con mayuscula inicial. */
export const metodoPagoLabel: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  seguro: "Seguro",
};

/**
 * Comprobante de un cobro, para mandarlo por WhatsApp justo despues de
 * cobrar — es lo mas parecido a un recibo que el paciente recibe en el
 * momento, sin necesitar papel ni un PDF aparte.
 *
 * `montoTexto` y `saldoTexto` ya vienen formateados (por ejemplo con
 * `formatDOP`), y `fechaTexto` con `formatShortDate`: este archivo no sabe
 * de esos formatos, solo arma el texto final.
 */
export function mensajeComprobante(
  nombre: string,
  clinica: string,
  concepto: string,
  montoTexto: string,
  metodo: string,
  fechaTexto: string,
  saldoTexto: string | null,
): string {
  const cierre = saldoTexto
    ? `Saldo pendiente: ${saldoTexto}.`
    : "Su cuenta quedó al día. ¡Gracias por su pago!";
  return (
    `${saludo(nombre, clinica)} Le confirmamos su pago:\n\n` +
    `• Concepto: ${concepto}\n` +
    `• Monto pagado: ${montoTexto}\n` +
    `• Forma de pago: ${metodoPagoLabel[metodo] ?? metodo}\n` +
    `• Fecha: ${fechaTexto}\n\n` +
    `${cierre}`
  );
}
