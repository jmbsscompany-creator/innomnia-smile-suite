// ============================================================
// INNOMNIA Dental — importar los pacientes del Excel de Medent
//
// QUE HACE
// Lee el archivo scripts/pacientes.csv (un nombre de paciente por
// linea, en el mismo orden que el Excel original de Saudy) y crea
// un paciente nuevo en Supabase por cada linea, guardando el numero
// de fila original en el campo "file_number" (ficha 1, ficha 2...).
//
// No cambia nada mas: todo el resto de campos queda vacio o con el
// valor por defecto (estado = "nuevo"), tal como se acordo.
//
// COMO CORRERLO
// 1. Abre la Terminal en la carpeta del proyecto:
//      cd ~/dev/innomnia-smile-suite
// 2. Corre:
//      node scripts/importar-pacientes.mjs
// 3. Te va a pedir tu correo y contraseña de la app (las mismas con
//    las que entras a INNOMNIA Dental). Es necesario para que quede
//    registrado que estos pacientes se crearon con tu usuario.
// 4. Espera a que termine — son 1,208 pacientes, puede tardar un
//    minuto o dos. NO cierres la Terminal mientras corre.
//
// Este script solo debe correrse UNA vez. Si lo corres dos veces
// sin querer, se duplican los 1,208 pacientes — por eso el script
// revisa primero cuantos pacientes hay y te pregunta si de verdad
// quieres seguir si ya hay alguno.
// ============================================================

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { createClient } from "@supabase/supabase-js";

const raizProyecto = path.resolve(import.meta.dirname, "..");

/** Lee VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY del archivo .env, sin depender de ninguna libreria extra. */
function leerEnv() {
  const texto = fs.readFileSync(path.join(raizProyecto, ".env"), "utf8");
  const valores = {};
  for (const linea of texto.split("\n")) {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith("#")) continue;
    const igual = limpia.indexOf("=");
    if (igual === -1) continue;
    valores[limpia.slice(0, igual).trim()] = limpia.slice(igual + 1).trim();
  }
  return valores;
}

async function main() {
  const env = leerEnv();
  const url = env.VITE_SUPABASE_URL;
  const anonKey = env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    console.error("No encontre VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el archivo .env");
    process.exit(1);
  }

  const rutaCsv = path.join(raizProyecto, "scripts", "pacientes.csv");
  const nombres = fs
    .readFileSync(rutaCsv, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  console.log(`Encontre ${nombres.length} pacientes en el archivo.`);

  const rl = readline.createInterface({ input, output });
  const correo = await rl.question("Tu correo de INNOMNIA Dental: ");
  const clave = await rl.question("Tu contraseña: ");

  const supabase = createClient(url, anonKey);

  console.log("Entrando con tu usuario...");
  const { data: sesion, error: errorLogin } = await supabase.auth.signInWithPassword({
    email: correo.trim(),
    password: clave,
  });
  if (errorLogin) {
    console.error("No pude entrar con ese correo/contraseña:", errorLogin.message);
    rl.close();
    process.exit(1);
  }
  console.log("Listo, entraste como", sesion.user.email);

  const { count, error: errorConteo } = await supabase
    .from("patients")
    .select("*", { count: "exact", head: true });
  if (errorConteo) {
    console.error("No pude revisar cuantos pacientes hay ya:", errorConteo.message);
    rl.close();
    process.exit(1);
  }

  if ((count ?? 0) > 0) {
    console.log(`\nOJO: ya hay ${count} paciente(s) en el sistema.`);
    const respuesta = await rl.question(
      `Si ya intentaste esta importacion antes, dale click a Cancelar/Ctrl+C y avisale a Clo.\n` +
        `Si estos son pacientes de prueba que ya revisaste y quieres seguir de todos modos, escribe SI: `
    );
    if (respuesta.trim().toUpperCase() !== "SI") {
      console.log("Cancelado. No se importo nada.");
      rl.close();
      process.exit(0);
    }
  }

  rl.close();

  const TAMANO_LOTE = 200;
  let creados = 0;

  for (let inicio = 0; inicio < nombres.length; inicio += TAMANO_LOTE) {
    const lote = nombres.slice(inicio, inicio + TAMANO_LOTE).map((nombre, i) => ({
      name: nombre,
      file_number: String(inicio + i + 1),
    }));

    const { error } = await supabase.from("patients").insert(lote);
    if (error) {
      console.error(
        `\nError guardando el lote que empieza en la ficha ${inicio + 1}:`,
        error.message
      );
      console.error(
        `Se guardaron ${creados} pacientes antes de este error. Avisale a Clo con este mensaje.`
      );
      process.exit(1);
    }

    creados += lote.length;
    console.log(`Guardados ${creados} de ${nombres.length}...`);
  }

  console.log(`\nListo! Se importaron ${creados} pacientes.`);
}

main();
