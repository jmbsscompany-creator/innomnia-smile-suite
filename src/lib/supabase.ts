// Conexion con Supabase.
// Las claves NO se escriben aqui: viven en .env.local, que git ignora.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
const anonKey = import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined;

if (!url || !anonKey) {
  throw new Error(
    "Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. " +
      "Revisa el archivo .env.local en la raiz del proyecto.",
  );
}

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    persistSession: true, // mantiene la sesion al cerrar y abrir el navegador
    autoRefreshToken: true, // renueva el acceso solo, sin sacar al usuario
    detectSessionInUrl: true, // necesario para los correos de confirmacion
  },
});
