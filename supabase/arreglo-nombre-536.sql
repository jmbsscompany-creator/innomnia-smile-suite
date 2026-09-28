-- Arregla el nombre de un paciente que quedo mal por una coma de mas
-- en el Excel original (ficha #536): quedo guardado como
-- "Basil Saintage," (con comillas y coma) en vez de "Basil Saintage".
--
-- Correr una sola vez en Supabase -> SQL Editor -> New query.

update patients
set name = 'Basil Saintage'
where file_number = '536';

-- Comprobacion: debe mostrar el nombre ya limpio
select file_number, name from patients where file_number = '536';
