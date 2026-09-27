-- ============================================================
-- INNOMNIA Dental — ODONTOGRAMA: tratamientos existentes vs planificados
--
-- Que agrega: una columna "planned" (planificado) en odontogram_entries.
-- Antes, cada linea de la historia era "lo que tiene el diente". Ahora
-- una linea puede ser "lo que tiene HOY" (planned = false) o "lo que se
-- planea hacerle" (planned = true) — por ejemplo una corona que aun no
-- se ha puesto pero ya se decidio.
--
-- No se toca ni se borra ningun dato existente: todo lo que ya estaba
-- registrado queda como planned = false (osea "existente"), que es
-- exactamente lo que era antes de que existiera este concepto.
--
-- Se corre encima de lo que ya existe. Se puede correr mas de una vez
-- sin romper nada (todo usa "if not exists" / "or replace").
-- ============================================================

alter table odontogram_entries
  add column if not exists planned boolean not null default false;

-- La vista del estado actual ahora tiene que separar "lo existente" de
-- "lo planificado" para la MISMA cara del MISMO diente: por ejemplo el
-- 16 puede tener HOY un "obturado" (planned = false) y a la vez tener
-- planificada una "corona" (planned = true) sobre la misma cara, y
-- ambas cosas deben verse a la vez, no que una tape a la otra.
-- Postgres no deja reordenar las columnas de una vista con "or replace",
-- solo agregar nuevas al final. Por eso "planned" va al final de la lista,
-- no junto a "condition" como se leeria mas natural.
drop view if exists odontogram_current;
create view odontogram_current as
select distinct on (patient_id, tooth, surface, planned)
  id, patient_id, tooth, surface, condition, notes,
  appointment_id, created_by, created_at, planned
from odontogram_entries
order by patient_id, tooth, surface, planned, created_at desc;

-- ============================================================
-- LISTO. No se toco ningun dato existente.
-- ============================================================
