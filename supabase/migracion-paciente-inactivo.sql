-- ============================================================
-- INNOMNIA Dental — agrega el estado "Inactivo" a pacientes
--
-- QUE HACE
-- El campo "Estado" de cada paciente (Activo / Seguimiento / Nuevo)
-- es un tipo especial de Postgres llamado "enum": una lista cerrada
-- de valores permitidos. Esto agrega "inactivo" a esa lista.
--
-- No borra ni cambia ningun paciente existente: solo habilita la
-- opcion nueva para poder usarla de ahora en adelante.
--
-- Correr una sola vez en Supabase -> SQL Editor -> New query.
-- ============================================================

alter type patient_status add value if not exists 'inactivo';

-- Comprobacion: esto debe mostrar los 4 valores, incluyendo inactivo
select unnest(enum_range(null::patient_status)) as valores_permitidos;
