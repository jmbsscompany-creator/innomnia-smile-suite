-- ============================================================
-- INNOMNIA Dental — vincula un cargo con el procedimiento del historial
--
-- QUE HACE
-- Agrega una columna a "cargos" que apunta (opcionalmente) a la nota
-- del historial (notas_clinicas) que le dio origen. Asi, al ver un
-- cargo, se puede saber "esto es por tal procedimiento", y viceversa.
--
-- No es obligatorio: un cargo puede seguir creandose sin vincularlo a
-- nada (por ejemplo, un cobro suelto que no viene de un procedimiento
-- anotado). Si la nota se borra despues, el cargo no se borra con
-- ella, solo se queda sin ese vinculo (on delete set null).
--
-- Correr una sola vez en Supabase -> SQL Editor -> New query.
-- ============================================================

alter table cargos
  add column if not exists nota_id uuid references notas_clinicas(id) on delete set null;

create index if not exists cargos_nota_idx on cargos (nota_id);

-- Comprobacion: debe salir la columna nueva
select column_name, data_type
from information_schema.columns
where table_name = 'cargos' and column_name = 'nota_id';
