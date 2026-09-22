-- ============================================================
-- INNOMNIA Dental — cambio 3: ODONTOGRAMA
--
-- Guarda el estado de cada diente y cada cara del diente.
--
-- Decision importante: esto NO guarda "como esta el diente hoy".
-- Guarda CADA CAMBIO con su fecha y quien lo hizo. El estado actual
-- es simplemente el ultimo cambio de cada cara.
--
-- Por que: en odontologia importa la historia. Saber que el 36 tuvo
-- caries en marzo, se obturo en abril y se le hizo corona en agosto
-- vale mas que saber que hoy tiene corona. Ademas la ley pide poder
-- rastrear quien registro que.
--
-- Se corre encima de lo que ya existe. No borra nada.
-- ============================================================


-- ============ TIPOS ============

-- Estados posibles de un diente o de una de sus caras.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'tooth_condition') then
    create type tooth_condition as enum (
      'sano',
      'caries',
      'obturado',            -- resina o amalgama ya puesta
      'sellante',
      'corona',
      'endodoncia',          -- tratamiento de conducto
      'implante',
      'protesis',
      'fractura',
      'extraccion_indicada', -- hay que sacarlo
      'ausente'              -- ya no esta
    );
  end if;
end $$;

-- Cara del diente. 'completo' = el diente entero, no una cara suelta.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'tooth_surface') then
    create type tooth_surface as enum (
      'completo',
      'mesial',
      'distal',
      'oclusal',    -- la cara de masticar (en los de adelante es el borde incisal)
      'vestibular', -- la que da al labio o al cachete
      'lingual'     -- la que da a la lengua o al paladar
    );
  end if;
end $$;


-- ============ REGISTRO DEL ODONTOGRAMA ============

create table if not exists odontogram_entries (
  id             uuid primary key default gen_random_uuid(),
  patient_id     uuid not null references patients on delete cascade,
  -- Numeracion FDI, la que se usa en RD y en casi todo el mundo.
  -- Permanentes: 11-18, 21-28, 31-38, 41-48
  -- Temporales (de leche): 51-55, 61-65, 71-75, 81-85
  tooth          text not null,
  surface        tooth_surface not null default 'completo',
  condition      tooth_condition not null,
  notes          text not null default '',
  appointment_id uuid references appointments on delete set null,
  created_by     uuid references auth.users on delete set null,
  created_at     timestamptz not null default now()
);

-- El indice mas importante: "dame el odontograma de este paciente".
create index if not exists odontogram_patient_idx
  on odontogram_entries (patient_id, created_at desc);

create index if not exists odontogram_tooth_idx
  on odontogram_entries (patient_id, tooth, surface, created_at desc);


-- ============ VISTA DEL ESTADO ACTUAL ============
-- Devuelve solo el ultimo registro de cada cara de cada diente.
-- Asi la pantalla pide "el estado de hoy" sin tener que recorrer
-- toda la historia cada vez.

create or replace view odontogram_current as
select distinct on (patient_id, tooth, surface)
  id, patient_id, tooth, surface, condition, notes, appointment_id, created_by, created_at
from odontogram_entries
order by patient_id, tooth, surface, created_at desc;


-- ============ PERMISOS ============
-- Quien atiende registra lo que ve. Tanto la odontologa como la
-- secretaria pueden escribir (ella pasa lo que la doctora le dicta).
-- Nadie borra: si algo se registro mal, se registra el estado correcto
-- encima y queda la historia completa. Eso es lo que pide la ley.

alter table odontogram_entries enable row level security;

drop policy if exists "odontograma: leer" on odontogram_entries;
create policy "odontograma: leer"
  on odontogram_entries for select to authenticated using (true);

drop policy if exists "odontograma: registrar" on odontogram_entries;
create policy "odontograma: registrar"
  on odontogram_entries for insert to authenticated with check (true);

drop policy if exists "odontograma: corregir solo dentista" on odontogram_entries;
create policy "odontograma: corregir solo dentista"
  on odontogram_entries for delete to authenticated using (has_role('dentista'));


-- ============================================================
-- LISTO. No se toco ningun dato existente.
-- ============================================================
