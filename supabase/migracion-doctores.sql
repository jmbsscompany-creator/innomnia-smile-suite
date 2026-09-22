-- ============================================================
-- INNOMNIA Dental — cambio 2
--
-- Agrega:
--   1. Tabla de doctores de la clinica
--   2. Numero de ficha del paciente
--
-- Se corre encima de la base que ya existe. No borra nada.
-- Se puede correr varias veces sin romper nada.
-- ============================================================


-- ============ 1. DOCTORES ============
-- Antes el odontologo de una cita era texto libre, y "Dra. Reyes",
-- "Dra reyes" y "reyes" eran tres personas distintas para el sistema.
-- Ahora hay una lista de verdad.

create table if not exists dentists (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  specialty  text not null default '',
  phone      text not null default '',
  color      text not null default '',
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists dentists_updated_at on dentists;
create trigger dentists_updated_at
  before update on dentists
  for each row execute function set_updated_at();

create index if not exists dentists_name_idx on dentists (lower(name));


-- Las citas pueden apuntar a un doctor de la lista.
-- Se mantiene tambien el texto libre por si escriben un nombre suelto.
alter table appointments
  add column if not exists dentist_id uuid references dentists on delete set null;

create index if not exists appointments_dentist_idx on appointments (dentist_id);


-- ============ 2. NUMERO DE FICHA ============
-- Las clinicas identifican al paciente por su numero de ficha,
-- no por el identificador interno del sistema.

alter table patients
  add column if not exists file_number text not null default '';

create index if not exists patients_file_number_idx on patients (file_number);


-- ============ 3. PERMISOS ============
-- La secretaria lleva el sistema, asi que puede agregar y editar
-- doctores. Borrar uno queda para la odontologa: si un doctor tiene
-- citas historicas, borrarlo es una decision seria.

alter table dentists enable row level security;

drop policy if exists "doctores: leer" on dentists;
create policy "doctores: leer"
  on dentists for select to authenticated using (true);

drop policy if exists "doctores: crear" on dentists;
create policy "doctores: crear"
  on dentists for insert to authenticated with check (true);

drop policy if exists "doctores: editar" on dentists;
create policy "doctores: editar"
  on dentists for update to authenticated using (true) with check (true);

drop policy if exists "doctores: borrar solo dentista" on dentists;
create policy "doctores: borrar solo dentista"
  on dentists for delete to authenticated using (has_role('dentista'));


-- ============================================================
-- LISTO. No se toco ningun dato existente.
-- ============================================================
