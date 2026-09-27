-- ============================================================
-- CARGOS (lo que el paciente debe) + INVENTARIO
--
-- CARGOS
-- Antes de esto, el saldo de un paciente (patients.balance) solo se
-- podia BAJAR — con "Registrar cobro", cuando pagaba. No habia ninguna
-- forma en el sistema de que le quedara debiendo algo en primer lugar.
-- Un cargo es eso: un tratamiento que se le hizo y que ahora debe.
-- Cada cargo es su propia fila, con fecha, y SUMA al saldo — es el
-- reverso exacto de un cobro.
--
-- INVENTARIO
-- Productos de la clinica (guantes, anestesia, material...) con su
-- fecha de vencimiento, para poder avisar antes de que algo caduque.
-- ============================================================

drop table if exists cargos cascade;

create table cargos (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients on delete cascade,
  appointment_id uuid references appointments on delete set null,
  concepto text not null,
  monto numeric not null check (monto > 0),
  fecha date not null default current_date,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

create index cargos_paciente_idx
  on cargos (patient_id, fecha desc, created_at desc);

alter table cargos enable row level security;

drop policy if exists "cargos: leer" on cargos;
create policy "cargos: leer"
  on cargos for select to authenticated using (true);

drop policy if exists "cargos: crear" on cargos;
create policy "cargos: crear"
  on cargos for insert to authenticated with check (true);

drop policy if exists "cargos: editar" on cargos;
create policy "cargos: editar"
  on cargos for update to authenticated using (true);

-- Borrar un cargo cambia cuanto debe el paciente: solo la dentista.
drop policy if exists "cargos: borrar solo dentista" on cargos;
create policy "cargos: borrar solo dentista"
  on cargos for delete to authenticated using (has_role('dentista'));

-- ------------------------------------------------------------

drop table if exists productos cascade;

create table productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  categoria text not null default '',
  cantidad numeric not null default 1,
  unidad text not null default 'unidades',
  vencimiento date,
  notas text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index productos_vencimiento_idx
  on productos (vencimiento asc nulls last);

alter table productos enable row level security;

drop policy if exists "productos: leer" on productos;
create policy "productos: leer"
  on productos for select to authenticated using (true);

drop policy if exists "productos: crear" on productos;
create policy "productos: crear"
  on productos for insert to authenticated with check (true);

drop policy if exists "productos: editar" on productos;
create policy "productos: editar"
  on productos for update to authenticated using (true);

drop policy if exists "productos: borrar" on productos;
create policy "productos: borrar"
  on productos for delete to authenticated using (true);

-- ============================================================
-- LISTO. No se toco ninguna tabla que ya existia.
-- ============================================================
