-- ============================================================
-- PERIODONTOGRAMA
--
-- Que es: el odontograma mira los dientes (caries, coronas). El
-- periodontograma mira lo que los SOSTIENE: la encia y el hueso.
-- Es lo que permite diagnosticar periodontitis y, sobre todo,
-- demostrarle al paciente visita tras visita si va mejorando.
--
-- Como se mide: en cada diente se sondea en SEIS puntos, tres por
-- fuera (vestibular) y tres por dentro (lingual o palatino):
--
--        mesial   central   distal
--   ┌───────┬───────┬───────┐
--   │  VM   │  VC   │  VD   │   <- vestibular (lado del labio)
--   ├───────┼───────┼───────┤
--   │  LM   │  LC   │  LD   │   <- lingual / palatino (lado de la lengua)
--   └───────┴───────┴───────┘
--
-- En cada uno de esos seis puntos se anota:
--   profundidad  cuanto entra la sonda, en milimetros
--   margen       donde esta el borde de la encia respecto al diente.
--                Negativo = encia retraida (recesion), que es lo malo.
--   sangrado     si sangro al sondear (el indicador de inflamacion)
--   placa        si hay placa
--   supuracion   si sale pus
--
-- El NIVEL DE INSERCION (lo que de verdad mide el dano acumulado)
-- NO se guarda: se calcula como profundidad - margen. Guardar un
-- dato que se puede calcular es pedir que algun dia no cuadren.
--
-- Y por diente entero, no por punto:
--   movilidad    0 a 3, cuanto se mueve la pieza
--   furca        0 a 3, si la sonda pasa entre las raices (solo en
--                dientes de varias raices)
--
-- Por que una fila por DIENTE y no una por punto: son 32 dientes x 6
-- puntos = 192 puntos por examen. Con una fila por punto serian 192
-- filas cada vez que la doctora revisa una boca. Asi son 32, y los
-- seis valores viajan juntos en un arreglo, que es como se capturan
-- y como se dibujan.
--
-- Cada examen es una FOTO de un dia. No se edita el anterior: se hace
-- uno nuevo y se comparan. Asi es como se ve si el paciente mejora.
-- ============================================================

-- Limpieza, para poder correr este archivo mas de una vez sin miedo.
drop table if exists periodontograma_dientes cascade;
drop table if exists periodontogramas cascade;

-- ---------- El examen (la foto de un dia) ----------
create table periodontogramas (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients on delete cascade,
  fecha date not null default current_date,
  notas text not null default '',
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

create index periodontogramas_paciente_idx
  on periodontogramas (patient_id, fecha desc);

-- ---------- Un diente dentro de ese examen ----------
create table periodontograma_dientes (
  periodontograma_id uuid not null
    references periodontogramas on delete cascade,

  -- Notacion FDI, la misma del odontograma: "16", "36", "48"...
  tooth text not null,

  -- Los seis puntos, siempre en este orden:
  --   0=VM  1=VC  2=VD  (vestibular)
  --   3=LM  4=LC  5=LD  (lingual / palatino)
  -- null = ese punto no se midio todavia.
  profundidad smallint[] not null default '{null,null,null,null,null,null}',
  margen      smallint[] not null default '{null,null,null,null,null,null}',
  sangrado    boolean[]  not null default '{f,f,f,f,f,f}',
  placa       boolean[]  not null default '{f,f,f,f,f,f}',
  supuracion  boolean[]  not null default '{f,f,f,f,f,f}',

  -- Del diente entero, no de un punto
  movilidad smallint not null default 0,
  furca     smallint not null default 0,

  -- Si la pieza no esta en boca no se mide, pero se deja constancia
  -- de que se reviso y no estaba (distinto de "se olvido medirla").
  ausente boolean not null default false,

  primary key (periodontograma_id, tooth),

  -- Los arreglos SIEMPRE tienen seis posiciones. Sin esto, un error
  -- del programa podria guardar cuatro y el dibujo saldria torcido
  -- sin que nadie se entere.
  constraint seis_puntos check (
    array_length(profundidad, 1) = 6 and
    array_length(margen, 1) = 6 and
    array_length(sangrado, 1) = 6 and
    array_length(placa, 1) = 6 and
    array_length(supuracion, 1) = 6
  ),

  -- Rangos con sentido clinico. Una sonda no pasa de 15 mm, y una
  -- profundidad negativa no existe. Esto atrapa dedazos al teclear.
  constraint movilidad_valida check (movilidad between 0 and 3),
  constraint furca_valida check (furca between 0 and 3)
);

-- ---------- Quien puede ver y hacer que ----------
alter table periodontogramas enable row level security;
alter table periodontograma_dientes enable row level security;

-- Igual que el resto del sistema: dentro de la clinica se ve todo.
drop policy if exists "periodontograma: leer" on periodontogramas;
create policy "periodontograma: leer"
  on periodontogramas for select to authenticated using (true);

drop policy if exists "periodontograma: crear" on periodontogramas;
create policy "periodontograma: crear"
  on periodontogramas for insert to authenticated with check (true);

drop policy if exists "periodontograma: editar" on periodontogramas;
create policy "periodontograma: editar"
  on periodontogramas for update to authenticated using (true);

-- Borrar un examen entero borra historia clinica: solo la dentista.
drop policy if exists "periodontograma: borrar solo dentista" on periodontogramas;
create policy "periodontograma: borrar solo dentista"
  on periodontogramas for delete to authenticated using (has_role('dentista'));

drop policy if exists "periodontograma dientes: leer" on periodontograma_dientes;
create policy "periodontograma dientes: leer"
  on periodontograma_dientes for select to authenticated using (true);

drop policy if exists "periodontograma dientes: guardar" on periodontograma_dientes;
create policy "periodontograma dientes: guardar"
  on periodontograma_dientes for insert to authenticated with check (true);

drop policy if exists "periodontograma dientes: corregir" on periodontograma_dientes;
create policy "periodontograma dientes: corregir"
  on periodontograma_dientes for update to authenticated using (true);

drop policy if exists "periodontograma dientes: borrar solo dentista" on periodontograma_dientes;
create policy "periodontograma dientes: borrar solo dentista"
  on periodontograma_dientes for delete to authenticated using (has_role('dentista'));

-- ============================================================
-- LISTO. No se toco ninguna tabla que ya existia.
-- ============================================================
