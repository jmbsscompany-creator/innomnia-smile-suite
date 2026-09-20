// Demo calendar helpers. "Today" is fixed so the fictional demo data stays coherent.

export const BASE_DATE = "2026-09-19"; // sábado 19 de septiembre de 2026

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DOW = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const DOW_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function parse(iso: string) {
  const [y = 1970, m = 1, d = 1] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toISO(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function dateFromOffset(offset: number) {
  const d = parse(BASE_DATE);
  d.setUTCDate(d.getUTCDate() + offset);
  return toISO(d);
}

export function offsetFromDate(iso: string) {
  const diff = parse(iso).getTime() - parse(BASE_DATE).getTime();
  return Math.round(diff / 86_400_000);
}

export function dayNameOf(offset: number) {
  return DOW[parse(dateFromOffset(offset)).getUTCDay()] ?? "";
}

export function dayShortOf(offset: number) {
  return DOW_SHORT[parse(dateFromOffset(offset)).getUTCDay()] ?? "";
}

export function dayNumOf(offset: number) {
  return parse(dateFromOffset(offset)).getUTCDate();
}

export function monthNameOf(offset: number) {
  return MONTHS[parse(dateFromOffset(offset)).getUTCMonth()] ?? "";
}

/** "19 sep 2026" */
export function formatShortDate(iso: string | null) {
  if (!iso) return "—";
  const d = parse(iso);
  return `${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()] ?? ""} ${d.getUTCFullYear()}`;
}

/** "sábado 19 de septiembre" */
export function formatLongDay(offset: number) {
  const name = dayNameOf(offset);
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${dayNumOf(offset)} de ${monthNameOf(offset)}`;
}

export function ageFromBirthDate(iso: string) {
  if (!iso) return 0;
  const b = parse(iso);
  const t = parse(BASE_DATE);
  let age = t.getUTCFullYear() - b.getUTCFullYear();
  const beforeBirthday =
    t.getUTCMonth() < b.getUTCMonth() ||
    (t.getUTCMonth() === b.getUTCMonth() && t.getUTCDate() < b.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age > 0 ? age : 0;
}
