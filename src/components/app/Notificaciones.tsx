// La campanita: recordatorios que la doctora/secretaria necesitan ver de
// un vistazo — citas que vienen, pacientes que deben, y productos por
// vencer. No inventa datos nuevos: solo junta lo que ya existe en citas,
// pacientes y el inventario en una lista.
import { Link } from "@tanstack/react-router";
import { Bell, Boxes, CalendarClock, Wallet } from "lucide-react";
import { useState } from "react";
import type { Appointment, Patient, Producto } from "@/lib/database.types";
import { formatShortDate } from "@/lib/dates";
import { formatDOP } from "@/lib/format";
import { hoyISO, useCitasDeRango, usePacientes, useProductos } from "@/lib/queries";
import { cn } from "@/lib/utils";

/** Cuantos dias hacia adelante se avisan las citas: hoy + los proximos 2. */
const DIAS_ADELANTE = 2;

/** Monto a partir del cual un cobro pendiente se resalta como urgente. */
const MONTO_URGENTE = 5000;

/** Dias antes de vencer un producto a partir de los cuales se avisa. */
const DIAS_ALERTA_PRODUCTO = 30;

function sumarDias(iso: string, dias: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const fecha = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + dias));
  return fecha.toISOString().slice(0, 10);
}

function etiquetaFecha(iso: string, hoy: string, manana: string): string {
  if (iso === hoy) return "Hoy";
  if (iso === manana) return "Mañana";
  return formatShortDate(iso);
}

/** Dias que faltan para una fecha (negativo si ya paso), contra hoy. */
function diasHasta(iso: string): number {
  const hoy = new Date();
  const hoyLocal = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const [y, m, d] = iso.split("-").map(Number);
  const fecha = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  return Math.round((fecha.getTime() - hoyLocal.getTime()) / 86_400_000);
}

type Notif = {
  tipo: "cita" | "cobro" | "producto";
  id: string;
  titulo: string;
  detalle: string;
  urgente: boolean;
};

function citasANotificaciones(
  citas: Appointment[],
  pacientes: Patient[],
  hoy: string,
  manana: string,
): Notif[] {
  const nombrePorId = new Map(pacientes.map((p) => [p.id, p.name]));
  return citas
    .filter((c) => c.status !== "cancelada" && c.status !== "completada")
    .map((c) => {
      const nombre = (c.patient_id && nombrePorId.get(c.patient_id)) || "Paciente sin registrar";
      const hora = c.time.slice(0, 5);
      return {
        tipo: "cita" as const,
        id: c.id,
        titulo: `Cita con ${nombre}`,
        detalle: `${c.treatment || "Consulta"} · ${etiquetaFecha(c.date, hoy, manana)} ${hora}${
          c.status === "pendiente" ? " · por confirmar" : ""
        }`,
        urgente: c.date === hoy,
      };
    });
}

function cobrosANotificaciones(pacientes: Patient[]): Notif[] {
  return pacientes
    .filter((p) => Number(p.balance) > 0)
    .sort((a, b) => Number(b.balance) - Number(a.balance))
    .map((p) => ({
      tipo: "cobro" as const,
      id: p.id,
      titulo: `Cobro pendiente — ${p.name}`,
      detalle: `Debe ${formatDOP(Number(p.balance))}`,
      urgente: Number(p.balance) >= MONTO_URGENTE,
    }));
}

/** Productos vencidos o por vencer dentro de DIAS_ALERTA_PRODUCTO. */
function productosANotificaciones(productos: Producto[]): Notif[] {
  return productos
    .filter((p) => p.vencimiento !== null)
    .map((p) => ({ p, dias: diasHasta(p.vencimiento!) }))
    .filter(({ dias }) => dias <= DIAS_ALERTA_PRODUCTO)
    .sort((a, b) => a.dias - b.dias)
    .map(({ p, dias }) => ({
      tipo: "producto" as const,
      id: p.id,
      titulo: p.nombre,
      detalle:
        dias < 0
          ? `Venció hace ${Math.abs(dias)} ${Math.abs(dias) === 1 ? "día" : "días"}`
          : dias === 0
            ? "Vence hoy"
            : `Vence en ${dias} ${dias === 1 ? "día" : "días"}`,
      urgente: dias < 0,
    }));
}

const ICONO_POR_TIPO = { cita: CalendarClock, cobro: Wallet, producto: Boxes } as const;
const DESTINO_POR_TIPO = {
  cita: { to: "/citas" as const },
  cobro: { to: "/pacientes/$id" as const },
  producto: { to: "/inventario" as const },
} as const;

function FilaNotif({ n, onClick }: { n: Notif; onClick: () => void }) {
  const Icono = ICONO_POR_TIPO[n.tipo];
  const base = DESTINO_POR_TIPO[n.tipo];
  const destino = n.tipo === "cobro" ? { ...base, params: { id: n.id } } : base;
  return (
    <Link
      {...destino}
      onClick={onClick}
      role="menuitem"
      className="flex items-start gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted"
    >
      <span
        className={cn(
          "mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg",
          n.urgente
            ? n.tipo === "cita"
              ? "bg-primary-soft text-primary"
              : "bg-warning-soft text-warning"
            : "bg-muted text-muted-foreground",
        )}
      >
        <Icono className="size-4" strokeWidth={1.75} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-foreground">{n.titulo}</span>
        <span className="block truncate text-xs text-muted-foreground">{n.detalle}</span>
      </span>
    </Link>
  );
}

/** La campanita del header: cuenta citas proximas y cobros pendientes. */
export function CampanaNotificaciones() {
  const [abierto, setAbierto] = useState(false);
  const hoy = hoyISO();
  const manana = sumarDias(hoy, 1);
  const hasta = sumarDias(hoy, DIAS_ADELANTE);

  const citas = useCitasDeRango(hoy, hasta);
  const pacientes = usePacientes();
  const productos = useProductos();

  const listaPacientes = pacientes.data ?? [];
  const notifCitas = citasANotificaciones(citas.data ?? [], listaPacientes, hoy, manana);
  const notifCobros = cobrosANotificaciones(listaPacientes);
  const notifProductos = productosANotificaciones(productos.data ?? []);
  const total = notifCitas.length + notifCobros.length + notifProductos.length;

  return (
    <div className="relative">
      <button
        onClick={() => setAbierto((v) => !v)}
        aria-label="Notificaciones"
        aria-expanded={abierto}
        aria-haspopup="menu"
        className="relative grid size-10 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary"
      >
        <Bell className="size-5" strokeWidth={1.75} />
        {total > 0 && (
          <span className="absolute right-1.5 top-1.5 grid min-w-[18px] place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-[18px] text-primary-foreground ring-2 ring-background">
            {total > 9 ? "9+" : total}
          </span>
        )}
      </button>

      {abierto && (
        <>
          {/* Capa invisible: un clic fuera cierra el panel */}
          <button
            aria-label="Cerrar notificaciones"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setAbierto(false)}
          />
          <div
            role="menu"
            className="surface absolute right-0 z-50 mt-2 max-h-[420px] w-[340px] overflow-y-auto p-1.5 shadow-float"
          >
            <div className="border-b border-border px-3 pb-2.5 pt-2">
              <p className="text-sm font-semibold">Notificaciones</p>
              <p className="text-xs text-muted-foreground">
                Citas de los próximos días, cobros pendientes y productos por vencer.
              </p>
            </div>

            {total === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                No tienes nada pendiente por ahora.
              </p>
            ) : (
              <div className="py-1.5">
                {notifCitas.map((n) => (
                  <FilaNotif key={`cita-${n.id}`} n={n} onClick={() => setAbierto(false)} />
                ))}
                {notifCobros.map((n) => (
                  <FilaNotif key={`cobro-${n.id}`} n={n} onClick={() => setAbierto(false)} />
                ))}
                {notifProductos.map((n) => (
                  <FilaNotif key={`producto-${n.id}`} n={n} onClick={() => setAbierto(false)} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
