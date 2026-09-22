import { Check, ChevronDown, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/app/ui";

/* ---------- Modal ---------- */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-6">
      <div
        className="fixed inset-0 bg-foreground/25 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "surface relative my-0 w-full rounded-b-none shadow-float sm:my-auto sm:rounded-2xl",
          size === "lg" ? "sm:max-w-2xl" : "sm:max-w-lg",
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="text-[19px] font-semibold tracking-tight">{title}</h2>
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary"
          >
            <X className="size-[18px]" />
          </button>
        </header>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && (
          <footer className="flex items-center justify-end gap-2 border-t border-border px-5 py-4 sm:px-6">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

export function ModalActions({
  onCancel,
  submitLabel = "Guardar",
  cancelLabel = "Cancelar",
  formId,
  disabled,
}: {
  onCancel: () => void;
  submitLabel?: string | undefined;
  cancelLabel?: string | undefined;
  /**
   * Id del <form> que este boton debe enviar.
   * Hace falta porque el pie del modal queda FUERA del formulario,
   * y sin esto el boton de guardar no dispara nada.
   */
  formId?: string | undefined;
  disabled?: boolean | undefined;
}) {
  return (
    <>
      <Button type="button" variant="outline" onClick={onCancel} disabled={disabled}>
        {cancelLabel}
      </Button>
      <Button type="submit" form={formId} disabled={disabled}>
        {submitLabel}
      </Button>
    </>
  );
}

/* ---------- Fields ---------- */

const controlClass =
  "h-11 w-full rounded-xl border border-input bg-card px-3.5 text-[15px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-ring/30";

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string | undefined;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[13px] font-medium text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function TextInput({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(controlClass, className)} {...props} />;
}

export function SelectInput({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <select className={cn(controlClass, "appearance-none pr-9", className)} {...props}>
      {children}
    </select>
  );
}

export function TextArea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      rows={3}
      className={cn(controlClass, "h-auto py-2.5 leading-relaxed", className)}
      {...props}
    />
  );
}

export function FormGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid gap-4 sm:grid-cols-2", className)}>{children}</div>;
}

/* ---------- Buscador desplegable ---------- */

export interface OpcionBuscador {
  id: string;
  label: string;
  /** Texto chico a la derecha: saldo, telefono, lo que ayude a distinguir. */
  hint?: string;
}

/**
 * Selector con buscador. Reemplaza al desplegable del sistema, que no deja
 * escribir y con muchas opciones obliga a hacer scroll eterno.
 * La lista se dibuja con nuestro diseno, no con el del sistema operativo.
 */
export function Buscador({
  value,
  onChange,
  options,
  placeholder = "Escribe para buscar...",
  vacioTexto = "No hay resultados",
  required,
  name,
  maxVisibles = 50,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  options: OpcionBuscador[];
  placeholder?: string | undefined;
  vacioTexto?: string | undefined;
  required?: boolean | undefined;
  name?: string | undefined;
  maxVisibles?: number | undefined;
}) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const [resaltado, setResaltado] = useState(0);
  const caja = useRef<HTMLDivElement>(null);

  const elegido = options.find((o) => o.id === value) ?? null;

  const filtradas = useMemo(() => {
    const q = texto.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || (o.hint ?? "").toLowerCase().includes(q),
    );
  }, [options, texto]);

  const visibles = filtradas.slice(0, maxVisibles);
  const ocultas = filtradas.length - visibles.length;

  // Un clic fuera cierra la lista.
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, [abierto]);

  function elegir(id: string) {
    onChange(id);
    setTexto("");
    setAbierto(false);
  }

  function limpiar() {
    onChange(null);
    setTexto("");
    setAbierto(true);
  }

  function teclas(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAbierto(true);
      setResaltado((i) => Math.min(i + 1, visibles.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setResaltado((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && abierto && visibles[resaltado]) {
      e.preventDefault();
      elegir(visibles[resaltado]!.id);
    } else if (e.key === "Escape") {
      setAbierto(false);
    }
  }

  return (
    <div ref={caja} className="relative">
      {/* Guarda el valor para que la validacion del formulario funcione */}
      <input
        type="text"
        tabIndex={-1}
        aria-hidden
        required={required}
        name={name}
        value={value ?? ""}
        onChange={() => {}}
        className="pointer-events-none absolute inset-x-0 bottom-1 h-px w-full opacity-0"
      />

      {elegido ? (
        <div className="flex h-11 w-full items-center gap-2 rounded-xl border border-input bg-card px-3.5">
          <Check className="size-4 shrink-0 text-success" />
          <span className="min-w-0 flex-1 truncate text-[15px]">{elegido.label}</span>
          <button
            type="button"
            onClick={limpiar}
            aria-label="Cambiar seleccion"
            className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <div
          className={cn(
            "flex h-11 w-full items-center gap-2 rounded-xl border bg-card px-3.5 transition-colors",
            abierto ? "border-primary/50 ring-2 ring-ring/30" : "border-input",
          )}
        >
          <Search className="size-[18px] shrink-0 text-muted-foreground" />
          <input
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              setAbierto(true);
              setResaltado(0);
            }}
            onFocus={() => setAbierto(true)}
            onKeyDown={teclas}
            placeholder={placeholder}
            className="min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
          />
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform",
              abierto && "rotate-180",
            )}
          />
        </div>
      )}

      {abierto && !elegido && (
        <div className="mt-1.5 overflow-hidden rounded-xl border border-border bg-card shadow-float">
          {visibles.length === 0 ? (
            <p className="px-3.5 py-4 text-center text-sm text-muted-foreground">{vacioTexto}</p>
          ) : (
            <ul className="max-h-[240px] overflow-y-auto">
              {visibles.map((o, i) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setResaltado(i)}
                    onClick={() => elegir(o.id)}
                    className={cn(
                      "flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors",
                      i === resaltado ? "bg-primary-soft" : "hover:bg-primary-soft/60",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
                      {o.label}
                    </span>
                    {o.hint && (
                      <span className="shrink-0 text-xs text-muted-foreground">{o.hint}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {ocultas > 0 && (
            <p className="border-t border-border bg-muted/40 px-3.5 py-2 text-center text-xs text-muted-foreground">
              {ocultas} mas. Sigue escribiendo para afinar la busqueda.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
