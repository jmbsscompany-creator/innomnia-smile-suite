-- ============================================================
-- HISTORIAL DE NOTAS / PROCEDIMIENTOS
--
-- Que es: el campo "Notas" de la ficha del paciente es uno solo, y cada
-- vez que se guarda se BORRA lo que habia antes. Eso sirve para lo que
-- no cambia (alergias, antecedentes) pero no sirve para llevar control
-- de que se le ha ido haciendo al paciente: "limpieza dental" el 3 de
-- marzo, "extraccion del 26" el 10 de abril, y asi.
--
-- Esta tabla es esa bitacora. Cada nota es su propia fila, con fecha, y
-- ninguna borra a la anterior — igual que el periodontograma, es un
-- historial que se acumula, no un campo que se sobrescribe.
--
-- El campo "notes" de patients NO se toca: sigue siendo para lo que no
-- cambia. Esto es algo aparte.
-- ============================================================

drop table if exists notas_clinicas cascade;

create table notas_clinicas (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients on delete cascade,
  fecha date not null default current_date,
  nota text not null,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

create index notas_clinicas_paciente_idx
  on notas_clinicas (patient_id, fecha desc, created_at desc);

-- ---------- Quien puede ver y hacer que ----------
alter table notas_clinicas enable row level security;

-- Igual que el resto del sistema: dentro de la clinica se ve todo.
drop policy if exists "notas clinicas: leer" on notas_clinicas;
create policy "notas clinicas: leer"
  on notas_clinicas for select to authenticated using (true);

drop policy if exists "notas clinicas: crear" on notas_clinicas;
create policy "notas clinicas: crear"
  on notas_clinicas for insert to authenticated with check (true);

drop policy if exists "notas clinicas: editar" on notas_clinicas;
create policy "notas clinicas: editar"
  on notas_clinicas for update to authenticated using (true);

-- Borrar una nota es borrar historia clinica: solo la dentista.
drop policy if exists "notas clinicas: borrar solo dentista" on notas_clinicas;
create policy "notas clinicas: borrar solo dentista"
  on notas_clinicas for delete to authenticated using (has_role('dentista'));

-- ============================================================
-- LISTO. No se toco ninguna tabla que ya existia.
-- ============================================================
