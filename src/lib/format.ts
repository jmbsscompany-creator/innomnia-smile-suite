export function formatDOP(amount: number): string {
  return `RD$ ${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

/**
 * Edad a partir de la fecha de nacimiento, calculada contra el dia de HOY.
 * Por eso guardamos la fecha y no el numero: la edad nunca se queda vieja.
 */
export function edadDesde(nacimiento: string | null): number | null {
  if (!nacimiento) return null;
  const [y, m, d] = nacimiento.split("-").map(Number);
  if (!y || !m || !d) return null;
  const hoy = new Date();
  let edad = hoy.getFullYear() - y;
  const aunNoCumple = hoy.getMonth() + 1 < m || (hoy.getMonth() + 1 === m && hoy.getDate() < d);
  if (aunNoCumple) edad -= 1;
  return edad >= 0 && edad < 130 ? edad : null;
}

/**
 * Deja un texto listo para comparar: sin tildes, sin mayusculas y sin
 * espacios de sobra. Asi "Méndez", "MENDEZ" y "mendez" son lo mismo
 * al buscar. Hace falta porque los nombres vienen escritos de mil formas,
 * sobre todo si salen de un Excel viejo.
 */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD") // separa la letra de su tilde
    .replace(/[̀-ͯ]/g, "") // borra las tildes
    .toLowerCase()
    .trim();
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
