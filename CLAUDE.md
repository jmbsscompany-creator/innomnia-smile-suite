# INNOMNIA Dental — estado del proyecto

Software de gestion para clinicas dentales. La primera clienta es **Dra. Saudy
Mabel**, prima de Johana, dueña de la clinica **Medent** en Republica Dominicana.
Hoy trabaja con cuaderno y WhatsApp, con una secretaria que anota y responde.

Este archivo existe para que una sesion nueva no tenga que preguntar de nuevo lo
que ya se decidio. Si algo aqui contradice al codigo, gana el codigo: verificar
antes de confiar.

---

## Como se trabaja (importante)

El codigo vive en el Mac de Johana, en `~/dev/innomnia-smile-suite`. Ella corre
el servidor de desarrollo y hace los `git commit` y `git push` — Claude no
empuja nunca a GitHub.

Tres trampas que ya costaron tiempo:

1. **Escribir un archivo en su Mac puede reportar exito y dejar la version
   vieja.** Paso de verdad, varias veces. Despues de escribir, verificar siempre
   con `md5sum` contra el original, no confiar en el "written" de la
   herramienta. Si no coincide, reintentar el mismo commit (normalmente basta
   con 1-2 reintentos).
2. **Cuidado con la carpeta.** Johana tiene tambien `~/dev/omnia.3.7.5` (otro
   proyecto). Mas de una vez ha corrido comandos de git en la carpeta
   equivocada. Confirmar el nombre en el prompt antes de dar instrucciones.
3. **Los comandos de node que Claude corre NO corren en el Mac.** El puente
   ejecuta en una maquina Linux, y `node_modules` tiene binarios de macOS, asi
   que `vite build` falla ahi con "Cannot find native binding" aunque en el Mac
   compile bien. Lo que si sirve desde el puente: `npx tsc --noEmit` y
   `npx eslint`. El build de verdad lo corre Johana.

No reescribir historia publicada (ver `AGENTS.md`): el repo sincroniza con
Lovable y ella perderia el historial.

## Stack

TanStack Start (React 19, rutas por archivos, SSR) + Vite + Tailwind 4 +
Supabase (Postgres, Auth, RLS) + `@tanstack/react-query`.

Detalles que ya dieron problemas:

- `tsconfig` tiene **`exactOptionalPropertyTypes`**: las props opcionales se
  declaran `?: string | undefined`, no solo `?: string`. Al insertar un objeto
  con un campo opcional en un `.insert()` de Supabase, coercionar con `?? null`
  si la columna es `T | null` (no `T | null | undefined`).
- Los tipos de fila de la base son **`type`, no `interface`**. Supabase exige
  `Record<string, unknown>` y las interfaces no lo cumplen.
- `import.meta.env` se lee con corchetes: `import.meta.env["VITE_..."]`.
- `vite.config.ts` ignora `src/routeTree.gen.ts` en el watcher. Sin eso se
  reescribia cada 2 segundos y la pagina recargaba sin parar. **Consecuencia:
  al agregar o quitar una RUTA hay que reiniciar el servidor a mano.**
- Nombrar `x.tsx` y `x.$id.tsx` convierte a `x.tsx` en layout. Por eso la lista
  de pacientes es `pacientes.index.tsx` con `createFileRoute("/pacientes/")`.
- Un `<input type="number">` con `min`/`step` solo acepta valores que caigan
  exacto en `min + k*step`; con montos libres (precios, pagos) usar siempre
  `min={0} step={1}`, nunca un `step` mayor a 1.

## Reglas del proyecto

- **Todo el texto que ve una persona va en español con tildes y ñ.** Los
  identificadores (rutas, variables CSS, valores de enums que viajan a la base,
  nombres de props, dominios de correo de ejemplo) van **sin** tilde. Un barrido
  automatico de acentos ya rompio la ruta `/configuracion`, la variable
  `--odo-protesis` y el valor `protesis` de la base.
- `normalizar()` en `src/lib/format.ts` quita tildes para comparar, asi que
  buscar "nino" encuentra "Niño". Añadir tildes al texto visible no rompe la
  busqueda.
- Cero colores en duro. Todo sale de los tokens oklch de `src/styles.css`.
- **PostgREST devuelve maximo 1000 filas y no avisa.** Cualquier lectura que
  pueda crecer se pagina con `.range()` en bucle. `usePacientes` ya lo hace;
  probado con 1,201 pacientes.

## Que esta construido y verificado

- Autenticacion, perfiles y roles. El primer usuario que se registra queda como
  `dentista`; el resto, `secretaria`. Una sola clinica, varias cuentas — todos
  ven todo, y el saludo usa el nombre de la clinica ("Buenas tardes, Medent"),
  no el de la persona.
- Pacientes, citas, servicios y cobros. Aviso de ficha incompleta y busqueda por
  nombre, ficha, telefono, tratamiento o correo, sin sensibilidad a tildes.
- Lista de doctores, para que la secretaria pueda agregarlos sin ayuda.
- `Buscador`: selector con campo de busqueda que reemplaza al desplegable del
  sistema (con 1,200 pacientes un `<select>` es inusable).
- **Odontograma** (rediseño completo, 26/27-sep-2026). Modelo de registro
  historico: cada cambio agrega una linea, nunca sobrescribe; el estado de hoy
  es la ultima linea de cada cara+`planned` (vista `odontogram_current`,
  requiere `supabase/migracion-odontograma-planificado.sql`, ya corrida).
  - **Los dientes son assets SVG anatomicos de frente, con raiz.** Viven en
    `src/lib/dientes-anatomicos.ts`, del proyecto React Odontogram Modul
    (github.com/ZoliQua/React-Odontogram-Modul), **licencia MIT**: conservar
    el aviso de autoria que esta arriba del archivo, es lo unico que exige.
    Hay un dibujo por tipo y arcada: incisivo, canino, premolar superior
    (2 raices) e inferior (1), molar superior (3 raices) e inferior (2). Las
    muelas del juicio van un poco mas chicas. La arcada de abajo se voltea.
  - **Historial de intentos, para no repetirlos** (Johana rechazo tres):
    1) siluetas dibujadas a mano — "parecen iconos geometricos";
    2) estos mismos assets pero en gris y sin encia — "parecen gotas";
    3) coronas vistas desde arriba (set de biomathcode) — "quedo horrible".
    El que quedo es este: los assets frontales, **en blanco marfil y con
    encia**. No volver a los otros tres.
  - **Color**: el asset venia con el diente gris `#ebebeb` por dentro; el
    generador lo cambia a `var(--odo-diente)` (blanco marfil) y el borde a
    `var(--odo-diente-borde)`. La encia es `var(--odo-encia)`. Todo en
    `src/styles.css`, cero colores en duro.
  - **La encia la dibuja el componente**, no el asset: es una banda con la
    papila entre diente y diente (`ENCIA_PATH` en `Odontograma.tsx`) que se
    solapa con la de al lado para formar una linea continua. Cada asset
    guarda su `cuello` (la altura donde pasa la encia) y las piezas se
    alinean por ahi, no por el borde de arriba: por eso la encia queda
    derecha aunque las raices midan distinto.
  - Cada dibujo trae TODAS sus capas (diente sano, diente de leche, caries por
    cara, obturacion, sellante, corona, endodoncia, implante, protesis,
    fractura, extraccion) y se encienden solo las que tocan. Los colores de
    esas capas salen de variables propias del set
    (`--odon-fill-composite`, `--odon-rest-zircon`...) enganchadas a los
    tokens `--odo-*` en el contenedor del dibujo.
  - **Existente vs. planificado**: cada registro tiene `planned`. Lo
    planificado se dibuja al 50% encima de lo existente, y la pieza lleva un
    punto azul en la esquina.
  - Clic en un diente lo selecciona y abre el panel lateral. **Todo se
    registra desde ahi**: el perfil de la pieza en grande, sus superficies,
    tratamientos existentes/planificados (con "marcar sano" / "quitar plan"),
    formulario de 3 pasos (superficie, existente o planificado, estado — al
    elegir el estado se marca de una vez, sin boton escondido), notas e
    historial de la pieza.
  - Barra de arriba: Adulto/Niño, zoom (arranca en **80%**, que es donde entra
    la boca completa), deshacer, rehacer y pantalla completa. **Ya no hay
    interruptor de Vista estándar / Superficies**: Johana señalo, con razon,
    que esas lineas eran un esquema y no superficies de verdad (de frente no
    se ve la lingual ni la oclusal). Ahora hay UNA vista que muestra las dos
    cosas: la pieza teñida al 16% con su hallazgo mas grave (prioridad de un
    vistazo) y encima las marcas de cada cara (que tiene y donde). Si algun
    dia hace falta ver las cinco caras de verdad, seria una vista del diente
    DESDE ARRIBA, como pestaña aparte.
  - Deshacer/Rehacer no borra filas: escribe una fila nueva que restaura el
    estado anterior.
  - `src/components/app/GraficoPeriodontal.tsx` usa los mismos dibujos.
- **Contacto por WhatsApp** (`src/lib/whatsapp.ts`). Enlaces `wa.me` con el
  numero normalizado (a los 10 digitos con prefijo dominicano 809/829/849 les
  antepone el 1) y el mensaje ya escrito. Si no se puede armar un enlace valido,
  el boton no se dibuja. No se usa el logo de WhatsApp, que es marca registrada.
- **Periodontograma.** Mide la encia y el hueso que sostienen al diente, no el
  diente — **es el hueco real del mercado dominicano**, ningun software que se
  vende localmente lo tiene. Completo de punta a punta:
  - `supabase/migracion-periodontograma.sql` — corrida en Supabase.
  - `src/lib/periodontograma.ts` — nivel de insercion, indices, recorrido de
    sondeo (192 casillas, orden fijo que sigue el recorrido real de la boca).
  - `src/components/app/Periodontograma.tsx` — la rejilla de captura donde se
    llenan los numeros con teclado, con avance automatico entre casillas.
  - `src/components/app/GraficoPeriodontal.tsx` — el grafico sobre las
    siluetas, para explicarle al paciente.
  - `src/components/app/IndicesPeriodontal.tsx` — los indices en pantalla,
    comparando contra el examen anterior.
  - Tab "Periodontograma" en la ficha del paciente (`pacientes.$id.tsx`), con
    hooks en `queries.ts` y tipos en `database.types.ts`.
  - Cada examen es una foto de un dia y no se edita — se hace uno nuevo y se
    comparan. El nivel de insercion no se guarda, se calcula
    (profundidad − margen). Un examen nuevo hereda del anterior solo lo que no
    cambia entre visitas (piezas ausentes y furca).
- **Cargos, cobros y abonos.** `cargos` (lo que el paciente debe) y `payments`
  (lo que paga) son dos bitacoras separadas — un cargo SUMA al saldo, un pago
  RESTA, y ninguna fila se edita ni se borra, queda como historial. Al crear un
  cargo se elige como quedo el pago (Pago todo / Pago parte / Debe todo), y un
  cargo que quedo "Debe" o "Parcial" se puede terminar de pagar despues con el
  boton **Abonar**, que crea un pago ligado a ese cargo especifico via
  `payments.cargo_id` (columna agregada en
  `supabase/migracion-cargo-id-pagos.sql`, ya corrida). El estado de cada cargo
  (Pagado / Abonó X · debe Y / Debe X) se calcula sumando los pagos con ese
  `cargo_id`, nunca se guarda aparte.
  - **Ojo con pagos viejos sin `cargo_id`:** cualquier pago hecho ANTES de que
    existiera esta columna quedo con `cargo_id = null`, asi que no cuenta para
    ningun cargo especifico aunque en la practica si correspondiera a uno. Solo
    pasa con datos de prueba de antes de esta fecha; los cargos y abonos
    nuevos siempre quedan bien conectados desde que se crean.
- **Inventario** (`productos`). CRUD completo con fecha de vencimiento,
  filtros (Todos / Por vencer / Vencidos) y alerta a 30 dias.
- **Campanita de notificaciones** (`src/components/app/Notificaciones.tsx`).
  Avisa citas proximas (2 dias), cobros pendientes (`balance > 0`, resaltando
  los mayores a RD$5,000) y productos por vencer/vencidos.

## Pendientes (al 27-sep-2026, 00:50)

Johana entrega a Saudy **el lunes**. El domingo despues del trabajo se hace lo
que falta. En orden:

1. **Desplegarlo** (lo unico que bloquea de verdad). Sigue solo en su Mac. El
   camino decidido: el boton *Publish* de Lovable, que despliega en
   Cloudflare — el proyecto ya viene cableado para eso
   (`@lovable.dev/vite-tanstack-config` trae nitro con target cloudflare).
   Vercel quedo descartado: su plan gratis prohibe el uso comercial y esto se
   va a cobrar. El registro abierto ya se cerro desde el panel de Supabase
   (Authentication → Sign In/Providers → User Signups), asi que nadie puede
   crearse una cuenta solo.
2. **Importar los 1,208 pacientes** desde
   `Fichas_Pacientes_Medent_Studio_actualizada.xlsx` (solo nombres). Se
   conserva el numero de ficha de papel #1-#1,208 tal cual, **incluyendo los
   11 nombres repetidos** (Johana los quiere asi: si se quitan, se le
   descuadra el orden de las fichas fisicas). Antes de importar falta:
   - borrar el paciente de prueba de Johana;
   - agregar el estado **"Inactivo"** al paciente (migracion + boton en la
     ficha), para marcar los repetidos sin borrarlos;
   - agregar la **alerta de nombre/telefono repetido** al crear un paciente a
     mano (avisa pero deja seguir).
3. **Copia de seguridad, decidido el 27-sep:** se quedan en el plan **gratis**
   de Supabase hasta que Saudy pruebe el software, le guste y empiece a pagar
   (ahi se pasa a Pro, 25 US$/mes, que incluye respaldo diario). Mientras
   tanto el plan gratis NO hace backups, asi que el trato es: **exportar la
   tabla `patients` a CSV** (Supabase → Table Editor → Export) justo despues
   de importar y una vez por semana. Recordarselo.

Menos urgente:

- Pagina de movimientos para la dentista (`activity_log` ya se llena solo).
- Probar el odontograma en iPad de verdad (tiene `overflow-x-auto`, pero al
  80% deberia entrar entero).

## Contexto de mercado (investigado el 23-sep-2026)

- El unico competidor local con clientes reales es **Denty Cloud**, de Santo
  Domingo. Su entidad legal es **MedyCore A&J, SRL** — o sea que "Medycore" y
  "Denty Cloud" son, muy probablemente, el mismo producto renombrado. Sin
  confirmar del todo; vale la pena preguntarselo a la colega de Saudy que lo usa.
- Su web de marketing es de 2026 pero la aplicacion real parece de 2015 (tiene
  un CAPTCHA de "2 + 2 = ?" en el login). En once años acumula 2 reseñas
  publicas, ambas del mismo dia de 2018 e invitadas por ellos mismos.
- Precio de mercado en RD: **RD$1,750–4,200 al mes por clinica**. Nadie publica
  precios; todos obligan a una llamada comercial.
- La facturacion electronica **e-CF ante la DGII** es el foso real, no el
  odontograma. Denty Cloud la cobra aparte: RD$10,000 de activacion mas
  RD$1,500–3,500 al mes.
- El WhatsApp no diferencia: Denty Cloud ya lo incluye en su plan de entrada.
- Ningun competidor local tiene validacion social. Veinte reseñas reales
  pondrian a este producto por delante de todo el mercado dominicano.
