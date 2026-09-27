-- ============================================================
-- ABONOS A UN CARGO ESPECIFICO
--
-- Antes, un cargo que quedaba "debiendo" no se podia marcar como
-- pagado despues — la unica forma de pagar era "Registrar cobro" en
-- Inicio, que resta del saldo TOTAL del paciente, sin saber a cual
-- cargo en concreto corresponde.
--
-- Esta columna conecta un pago (payments) con el cargo (cargos) al
-- que abona. Con eso, cada cargo puede mostrar "Pagado", "Debe" o
-- "Abonó X, debe Y" — y desde la ficha del paciente se puede abonar
-- a un cargo viejo con un boton, sin tener que ir a otra pantalla.
--
-- null = un pago suelto, no atado a un cargo en particular (como
-- siempre fue "Registrar cobro" hasta ahora). Eso sigue funcionando
-- igual, esto es aparte y no le toca nada.
-- ============================================================

alter table payments
  add column if not exists cargo_id uuid references cargos(id) on delete set null;

create index if not exists payments_cargo_idx on payments (cargo_id);

-- ============================================================
-- LISTO. No se toco ninguna fila que ya existia.
-- ============================================================
