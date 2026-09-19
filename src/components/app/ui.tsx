import { Link, type LinkProps } from "@tanstack/react-router";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";
import type { AppointmentStatus } from "@/lib/demo-data";
import { statusLabel } from "@/lib/demo-data";

/* ---------- Buttons ---------- */

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-primary hover:bg-primary-hover hover:-translate-y-px",
        soft: "bg-primary-soft text-primary-soft-foreground hover:bg-accent",
        outline:
          "border border-border-strong bg-card text-foreground hover:border-primary/40 hover:bg-primary-soft/50",
        ghost: "text-muted-foreground hover:bg-primary-soft hover:text-primary",
        success: "bg-success text-primary-foreground hover:opacity-90",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-[15px]",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  ...props
}: ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

/* ---------- Page header ---------- */

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 rise-in">
      <div className="min-w-0">
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-foreground sm:text-[32px]">
          {title}
        </h1>
        {subtitle && <p className="mt-1.5 text-[15px] text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ---------- Section card ---------- */

export function Section({
  title,
  link,
  linkLabel,
  children,
  className,
  padded = true,
}: {
  title?: string;
  link?: LinkProps["to"];
  linkLabel?: string;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={cn("surface overflow-hidden", className)}>
      {title && (
        <header className="flex items-center justify-between gap-3 px-5 pt-5 pb-3 sm:px-6">
          <h2 className="text-[17px] font-semibold tracking-tight">{title}</h2>
          {link && (
            <Link
              to={link}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary-hover"
            >
              {linkLabel ?? "Ver todos"}
              <ArrowRight className="size-4" />
            </Link>
          )}
        </header>
      )}
      <div className={cn(padded && "px-5 pb-5 sm:px-6")}>{children}</div>
    </section>
  );
}

/* ---------- Stat ---------- */

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  hintTone = "muted",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  hintTone?: "muted" | "success" | "warning";
}) {
  return (
    <div className="surface flex items-center gap-4 p-5">
      <div className="icon-tile shrink-0">
        <Icon className="size-5" strokeWidth={1.75} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-[26px] font-bold leading-none tracking-tight">{value}</p>
        {hint && (
          <p
            className={cn(
              "mt-1.5 text-[13px]",
              hintTone === "muted" && "text-muted-foreground",
              hintTone === "success" && "text-success",
              hintTone === "warning" && "text-warning",
            )}
          >
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}

/* ---------- Status badge ---------- */

const statusStyles: Record<AppointmentStatus, string> = {
  confirmada: "bg-success-soft text-success",
  pendiente: "bg-warning-soft text-warning",
  "en-consulta": "bg-primary-soft text-primary",
  completada: "bg-muted text-muted-foreground",
  cancelada: "bg-danger-soft text-danger",
};

export function StatusBadge({ status, className }: { status: AppointmentStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium whitespace-nowrap",
        statusStyles[status],
        className,
      )}
    >
      {status === "en-consulta" && <span className="size-1.5 rounded-full bg-primary pulse-dot" />}
      {statusLabel[status]}
    </span>
  );
}

export function Pill({
  children,
  tone = "info",
  className,
}: {
  children: ReactNode;
  tone?: "info" | "success" | "warning" | "danger" | "muted";
  className?: string;
}) {
  const tones = {
    info: "bg-info-soft text-info",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ---------- Avatar ---------- */

export function InitialsAvatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = { sm: "size-8 text-xs", md: "size-11 text-sm", lg: "size-14 text-base" };
  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-primary-soft font-semibold text-primary ring-1 ring-primary/10",
        sizes[size],
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}

/* ---------- Empty ---------- */

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border-strong px-6 py-10 text-center">
      <p className="font-medium">{title}</p>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}
