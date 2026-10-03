-- ============================================================
-- DOCUMENTOS: presupuestos y recetas
--
-- Que es: una plantilla imprimible (o para mandar por WhatsApp en PDF)
-- con el logo y los datos de la clinica, para dos cosas:
--   - "presupuesto": lineas con su precio, con un total al final.
--   - "receta": lineas de texto libre (medicamento, dosis, indicaciones),
--     sin precio.
--
-- Igual que cargos y notas_clinicas, es un historial: cada documento es
-- su propia fila con fecha, y ninguno se sobrescribe ni se edita — si
-- algo cambio, se hace un documento nuevo.
--
-- "items" guarda las lineas como JSON: [{ "concepto": "...", "precio": 1500 }, ...]
-- ("precio" en null para las lineas de una receta).
-- ============================================================

create table if not exists documentos (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients on delete cascade,
  tipo text not null check (tipo in ('presupuesto', 'receta')),
  fecha date not null default current_date,
  items jsonb not null default '[]'::jsonb,
  -- Suma de los items con precio. En una receta queda en null.
  total numeric(12, 2),
  notas text not null default '',
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists documentos_paciente_idx
  on documentos (patient_id, fecha desc, created_at desc);

-- ---------- Quien puede ver y hacer que ----------
alter table documentos enable row level security;

-- Igual que el resto del sistema: dentro de la clinica se ve todo.
drop policy if exists "documentos: leer" on documentos;
create policy "documentos: leer"
  on documentos for select to authenticated using (true);

drop policy if exists "documentos: crear" on documentos;
create policy "documentos: crear"
  on documentos for insert to authenticated with check (true);

-- Borrar un documento (presupuesto o receta) es borrar historia
-- clinica: solo la dentista, igual que notas_clinicas.
drop policy if exists "documentos: borrar solo dentista" on documentos;
create policy "documentos: borrar solo dentista"
  on documentos for delete to authenticated using (has_role('dentista'));

-- ============================================================
-- LISTO. No se toco ninguna tabla que ya existia.
-- ============================================================
