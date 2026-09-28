-- ============================================================
-- INNOMNIA Dental — nuevo estado de cita: "No asistió"
--
-- QUE HACE
-- Agrega un valor nuevo al tipo de estado de las citas, para poder
-- marcar que un paciente no vino (en vez de dejarla pegada en
-- "Pendiente" para siempre, o confundirla con "Cancelada", que es
-- cuando se cancela ANTES de que llegue el dia).
--
-- IMPORTANTE: correr esto solo (un "Run"). Despues, en otro "Run"
-- aparte, se puede comprobar. Si se corren juntos en el mismo Run da
-- error de "unsafe use of new value" — le pasa lo mismo a Postgres
-- con cualquier valor nuevo de un enum.
-- ============================================================

alter type appointment_status add value if not exists 'no_asistio';

-- ============================================================
-- Comprobacion: correr en un "New query" APARTE, despues de que el
-- de arriba haya corrido y terminado. Debe salir "no_asistio" en la
-- lista.
-- ============================================================
-- select enum_range(null::appointment_status);
