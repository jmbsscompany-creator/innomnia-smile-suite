import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  FileText,
  Home,
  Menu,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { clinic } from "@/lib/demo-data";
import { InitialsAvatar } from "./ui";

const nav = [
  { to: "/", label: "Inicio", icon: Home },
  { to: "/citas", label: "Agenda", icon: CalendarDays },
  { to: "/pacientes", label: "Pacientes", icon: Users },
  { to: "/servicios", label: "Servicios y Precios", icon: FileText },
  { to: "/configuracion", label: "Configuración", icon: Settings },
] as const;

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="block leading-none" aria-label="INNOMNIA Dental — Inicio">
      {compact ? (
        <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-lg font-extrabold tracking-tight text-primary">
          IN
        </span>
      ) : (
        <>
          <span className="block text-[24px] font-extrabold tracking-[0.02em] text-primary-soft-foreground">
            INNOMNIA
          </span>
          <span className="mt-1 block text-[11px] font-semibold tracking-[0.42em] text-primary">
            DENTAL
          </span>
        </>
      )}
    </Link>
  );
}

function ToothMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
      <path
        d="M14 6c-5 0-8 4-8 9 0 4 2 7 3 11 1.5 6 2 16 6 16 3 0 3.5-8 5-12 1-2.5 3-3 4-3s3 .5 4 3c1.5 4 2 12 5 12 4 0 4.5-10 6-16 1-4 3-7 3-11 0-5-3-9-8-9-3 0-5 1.5-10 1.5S17 6 14 6Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SidebarContent({ compact, onNavigate }: { compact: boolean; onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <div className={cn("px-6 pt-7 pb-6", compact && "px-3 pt-5")}>
        <Logo compact={compact} />
      </div>

      <nav className={cn("flex flex-col gap-1 px-3", compact && "items-center px-2")}>
        {nav.map((item) => {
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              title={item.label}
              className={cn(
                "group relative flex items-center gap-3.5 rounded-xl py-3 text-[15px] font-medium transition-colors",
                compact ? "size-12 justify-center" : "px-4",
                active
                  ? "bg-primary-soft text-primary"
                  : "text-sidebar-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {active && !compact && (
                <span className="absolute -left-3 top-2.5 bottom-2.5 w-1 rounded-r-full bg-primary" />
              )}
              <item.icon className="size-5 shrink-0" strokeWidth={1.75} />
              {!compact && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto relative">
        {!compact && (
          <div className="relative z-10 px-7 pb-8">
            <ToothMark className="size-11 text-primary/80" />
            <p className="mt-4 text-[22px] font-medium leading-tight text-primary-soft-foreground/85">
              Sonrisas
              <br />
              que crecen
              <br />
              contigo
            </p>
            <span className="mt-4 block h-0.5 w-6 rounded bg-primary" />
          </div>
        )}
        <svg
          viewBox="0 0 240 260"
          className="pointer-events-none absolute inset-x-0 bottom-0 w-full text-primary-soft"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d="M0 120C60 90 90 160 140 140S210 60 240 80V260H0Z"
            fill="currentColor"
            opacity=".7"
          />
          <path d="M0 190C50 160 100 220 150 200S220 140 240 160V260H0Z" fill="currentColor" />
        </svg>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen w-full bg-canvas">
      {/* Desktop / tablet sidebar */}
      <aside className="sticky top-0 hidden h-screen shrink-0 border-r border-sidebar-border bg-sidebar md:block md:w-[84px] xl:w-[248px]">
        <div className="hidden h-full xl:block">
          <SidebarContent compact={false} />
        </div>
        <div className="h-full xl:hidden">
          <SidebarContent compact />
        </div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-foreground/25 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-[280px] bg-sidebar shadow-float animate-in slide-in-from-left duration-200">
            <button
              aria-label="Cerrar"
              className="absolute right-3 top-3 grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
              onClick={() => setOpen(false)}
            >
              <X className="size-5" />
            </button>
            <SidebarContent compact={false} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
          <div className="flex h-[72px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              aria-label="Abrir menú"
              className="grid size-10 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-muted md:hidden"
              onClick={() => setOpen(true)}
            >
              <Menu className="size-5" />
            </button>

            <label className="relative flex h-11 min-w-0 flex-1 items-center rounded-xl border border-input bg-card px-3.5 text-muted-foreground transition-colors focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-ring/30 sm:max-w-[520px]">
              <Search className="size-[18px] shrink-0" />
              <input
                type="search"
                placeholder="Buscar pacientes, citas, tratamientos..."
                className="ml-2.5 w-full min-w-0 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
              />
            </label>

            <div className="ml-auto flex items-center gap-2 sm:gap-4">
              <button
                aria-label="Notificaciones"
                className="relative grid size-10 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary"
              >
                <Bell className="size-5" strokeWidth={1.75} />
                <span className="absolute right-2 top-2 size-2 rounded-full bg-primary ring-2 ring-background" />
              </button>
              <button className="flex items-center gap-3 rounded-xl py-1 pl-1 pr-2 transition-colors hover:bg-muted">
                <InitialsAvatar name={clinic.dentist} size="sm" className="size-10 text-sm" />
                <span className="hidden text-left sm:block">
                  <span className="block text-sm font-semibold leading-tight">{clinic.dentist}</span>
                  <span className="block text-xs text-muted-foreground">{clinic.name}</span>
                </span>
                <ChevronDown className="hidden size-4 text-muted-foreground sm:block" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[1240px]">{children}</div>
        </main>

        <footer className="border-t border-border bg-background">
          <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3 px-4 py-4 text-[13px] text-muted-foreground sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <span className="grid size-8 place-items-center rounded-full border border-border font-serif text-sm">
                I
              </span>
              <span>
                <span className="block font-medium text-foreground">INNOMNIA Dental</span>
                <span className="block text-xs">v0.1.0</span>
              </span>
            </div>
            <div className="flex items-center gap-5">
              <span>República Dominicana</span>
              <span className="h-4 w-px bg-border" />
              <span>Ayuda</span>
              <span>Soporte</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
