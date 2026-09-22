-- ============================================================
-- INNOMNIA Dental — estructura de base de datos
-- Modelo: UN proyecto de Supabase por clinica.
-- Para replicar en otra clinica: crear proyecto nuevo y correr
-- este mismo archivo completo. Nada mas.
-- ============================================================


-- ============ 1. TIPOS ============
-- Listas cerradas de valores. La base rechaza cualquier otro valor.

create type appointment_status as enum (
  'confirmada', 'pendiente', 'en-consulta', 'completada', 'cancelada'
);

create type patient_status as enum ('activo', 'seguimiento', 'nuevo');

create type user_role as enum ('dentista', 'secretaria');

create type payment_method as enum ('efectivo', 'tarjeta', 'transferencia', 'seguro');


-- ============ 2. UTILIDADES ============

-- Actualiza updated_at automaticamente en cada cambio.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Dice si el usuario conectado tiene cierto rol.
-- security definer = puede leer la tabla profiles aunque RLS este activo.
create or replace function has_role(target user_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = target
  );
$$;


-- ============ 3. PERFILES DE USUARIO ============
-- Supabase guarda los logins en auth.users (tabla suya, no se toca).
-- Esta tabla le agrega nombre y rol.

create table profiles (
  id         uuid primary key references auth.users on delete cascade,
  full_name  text not null default '',
  role       user_role not null default 'secretaria',
  created_at timestamptz not null default now()
);

-- Cuando alguien se registra, se le crea su perfil solo.
-- El PRIMER usuario queda como dentista (duena de la clinica).
-- Los siguientes quedan como secretaria.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    case
      when (select count(*) from public.profiles) = 0 then 'dentista'::user_role
      else 'secretaria'::user_role
    end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();


-- ============ 4. DATOS DE LA CLINICA ============
-- Una sola fila. Alimenta la pantalla de Configuracion.

create table clinic_settings (
  id         int primary key default 1,
  name       text not null default '',
  dentist    text not null default '',
  phone      text not null default '',
  email      text not null default '',
  address    text not null default '',
  city       text not null default '',
  schedule   jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint clinic_settings_una_sola_fila check (id = 1)
);

create trigger clinic_settings_updated_at
  before update on clinic_settings
  for each row execute function set_updated_at();

-- Fila vacia inicial, para que la pantalla tenga algo que editar.
insert into clinic_settings (id) values (1);


-- ============ 5. PACIENTES ============
-- Ojo: guardamos fecha de nacimiento, NO la edad.
-- La edad se calcula al mostrarla, asi nunca queda desactualizada.

create table patients (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  phone      text not null default '',
  email      text not null default '',
  birth_date date,
  status     patient_status not null default 'nuevo',
  treatment  text not null default '',
  notes      text not null default '',
  balance    numeric(12,2) not null default 0,
  last_visit date,
  next_visit date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger patients_updated_at
  before update on patients
  for each row execute function set_updated_at();

-- Indices: aceleran la busqueda por nombre y el filtro por estado.
create index patients_name_idx   on patients (lower(name));
create index patients_status_idx on patients (status);


-- ============ 6. SERVICIOS Y PRECIOS ============

create table services (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  category    text not null default '',
  duration    int not null default 30,
  price       numeric(12,2) not null default 0,
  description text not null default '',
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger services_updated_at
  before update on services
  for each row execute function set_updated_at();

create index services_category_idx on services (category);


-- ============ 7. CITAS ============
-- Fecha real, no "dia 0 / dia 1". Esto arregla la fecha congelada.

create table appointments (
  id         uuid primary key default gen_random_uuid(),
  patient_id uuid references patients on delete cascade,
  service_id uuid references services on delete set null,
  date       date not null,
  time       time not null,
  duration   int not null default 30,
  treatment  text not null default '',
  dentist    text not null default '',
  status     appointment_status not null default 'pendiente',
  notes      text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger appointments_updated_at
  before update on appointments
  for each row execute function set_updated_at();

-- El indice por fecha es el mas importante: la agenda siempre
-- pregunta "que hay este dia" o "que hay esta semana".
create index appointments_date_idx    on appointments (date, time);
create index appointments_patient_idx on appointments (patient_id);


-- ============ 8. COBROS ============
-- Esto NO procesa tarjetas. Solo anota que un paciente pago.
-- El dinero de verdad no pasa por aqui.

create table payments (
  id             uuid primary key default gen_random_uuid(),
  patient_id     uuid references patients on delete set null,
  appointment_id uuid references appointments on delete set null,
  concept        text not null default '',
  method         payment_method not null default 'efectivo',
  amount         numeric(12,2) not null,
  date           date not null default current_date,
  notes          text not null default '',
  created_at     timestamptz not null default now()
);

create index payments_date_idx    on payments (date);
create index payments_patient_idx on payments (patient_id);


-- ============ 9. ACTIVIDAD RECIENTE ============
-- Alimenta el panel de "Actividad reciente" del Inicio.

create table activity_log (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null,
  title      text not null,
  detail     text not null default '',
  actor_id   uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

create index activity_log_created_idx on activity_log (created_at desc);


-- ============================================================
-- 10. RLS — ROW LEVEL SECURITY
-- El candado que vive DENTRO de la base de datos.
-- Aunque el codigo de la app tenga un error, la base igual
-- se niega a entregar datos a quien no esta conectado.
-- ============================================================

alter table profiles        enable row level security;
alter table clinic_settings enable row level security;
alter table patients        enable row level security;
alter table services        enable row level security;
alter table appointments    enable row level security;
alter table payments        enable row level security;
alter table activity_log    enable row level security;


-- ---- PERFILES ----
-- Todos los conectados ven los nombres (hacen falta para mostrar quien hizo que).
create policy "perfiles visibles para conectados"
  on profiles for select to authenticated using (true);

-- Cada quien edita solo su propio nombre.
create policy "editar mi propio perfil"
  on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());


-- ---- DATOS DE LA CLINICA ----
create policy "clinica visible para conectados"
  on clinic_settings for select to authenticated using (true);

create policy "solo la dentista edita la clinica"
  on clinic_settings for update to authenticated
  using (has_role('dentista')) with check (has_role('dentista'));


-- ---- PACIENTES ----
-- La secretaria necesita crear y editar pacientes: es su trabajo diario.
create policy "pacientes: leer"
  on patients for select to authenticated using (true);

create policy "pacientes: crear"
  on patients for insert to authenticated with check (true);

create policy "pacientes: editar"
  on patients for update to authenticated using (true) with check (true);

-- Borrar un expediente si es cosa seria: solo la dentista.
create policy "pacientes: borrar solo dentista"
  on patients for delete to authenticated using (has_role('dentista'));


-- ---- SERVICIOS ----
create policy "servicios: leer"
  on services for select to authenticated using (true);

create policy "servicios: solo dentista crea"
  on services for insert to authenticated with check (has_role('dentista'));

create policy "servicios: solo dentista edita"
  on services for update to authenticated
  using (has_role('dentista')) with check (has_role('dentista'));

create policy "servicios: solo dentista borra"
  on services for delete to authenticated using (has_role('dentista'));


-- ---- CITAS ----
create policy "citas: leer"
  on appointments for select to authenticated using (true);

create policy "citas: crear"
  on appointments for insert to authenticated with check (true);

create policy "citas: editar"
  on appointments for update to authenticated using (true) with check (true);

create policy "citas: borrar solo dentista"
  on appointments for delete to authenticated using (has_role('dentista'));


-- ---- COBROS ----
-- La secretaria cobra en recepcion, asi que puede leer y registrar.
-- Corregir o borrar un cobro ya registrado: solo la dentista.
create policy "cobros: leer"
  on payments for select to authenticated using (true);

create policy "cobros: registrar"
  on payments for insert to authenticated with check (true);

create policy "cobros: solo dentista corrige"
  on payments for update to authenticated
  using (has_role('dentista')) with check (has_role('dentista'));

create policy "cobros: solo dentista borra"
  on payments for delete to authenticated using (has_role('dentista'));


-- ---- ACTIVIDAD ----
create policy "actividad: leer"
  on activity_log for select to authenticated using (true);

create policy "actividad: registrar"
  on activity_log for insert to authenticated with check (true);


-- ============================================================
-- LISTO.
-- La base queda VACIA: cero pacientes, cero citas, cero servicios.
-- Nueva de fabrica, tal como se pidio.
-- ============================================================
