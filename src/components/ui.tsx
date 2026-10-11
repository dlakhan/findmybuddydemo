/* Design system primitives (claude/DESIGN.md). Ported from the Lovable build, with the dialog and toasts made dependency free. */
import { forwardRef, useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Check, CircleNotch, Info, WarningCircle, X, CalendarCheck, CalendarBlank, Question, CheckCircle, MinusCircle, PaperPlaneTilt, Sparkle, ArrowLeft,
  type Icon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { reliabilityView, type MeetupView, type Reliability } from "@/lib/rules";
import { Link } from "@/lib/router";
import { dismiss, useToasts } from "@/lib/toast";

/* Buttons: 44px, 8px radius, never pills. Stay enabled; only disabled while sending. */
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "tertiary" | "destructive" | "danger-fill";
  loading?: boolean;
  block?: boolean;
};
const btnBase = "inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] px-4 t-strong transition-[transform,background-color,border-color] duration-150 ease-[var(--ease-out)] active:scale-[0.97]";
const btnVariant = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800",
  secondary: "border border-brand-600 bg-surface text-brand-600 hover:bg-brand-50",
  tertiary: "px-0 text-brand-600 underline underline-offset-4 hover:text-brand-700",
  destructive: "border border-danger-600 bg-surface text-danger-600 hover:bg-danger-50",
  "danger-fill": "bg-danger-600 text-white hover:bg-danger-800",
};
export const Btn = forwardRef<HTMLButtonElement, BtnProps>(function Btn(
  { variant = "primary", loading, block, className, children, disabled, type = "button", ...rest }, ref,
) {
  return (
    <button ref={ref} type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={cn(btnBase, btnVariant[variant], block && "w-full", className)} {...rest}>
      {loading && <CircleNotch className="animate-spin" size={20} aria-hidden />}
      {children}
    </button>
  );
});

/** A link styled as a button (navigation, not an action). */
export function LinkBtn({ to, variant = "primary", block, className, children }: { to: string; variant?: keyof typeof btnVariant; block?: boolean; className?: string; children: ReactNode }) {
  return <Link to={to} className={cn(btnBase, btnVariant[variant], block && "w-full", className)}>{children}</Link>;
}

/* Chips: pills are information. Selectable chips are used for wizard choices and filters. */
export function Chip({ selected, onClick, children, className }: { selected: boolean; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={selected} className={cn("group inline-flex min-h-11 items-center", className)}>
      <span className={cn(
        "inline-flex h-9 items-center gap-1 whitespace-nowrap rounded-full px-4 t-label transition-colors duration-200",
        selected ? "border-[1.5px] border-brand-600 bg-brand-50 text-brand-800" : "border border-field bg-surface text-ink hover:border-brand-600",
      )}>
        {selected && <Check size={16} weight="bold" aria-hidden />}
        {children}
      </span>
    </button>
  );
}

export function ReasonChip({ children }: { children: ReactNode }) {
  return <span className="inline-flex min-h-8 items-center rounded-full bg-brand-50 px-3 py-1 t-small font-bold text-brand-800">{children}</span>;
}

export type TagTone = "new" | "info" | "success" | "warning" | "neutral";
export function Tag({ tone, icon: I, children }: { tone: TagTone; icon?: Icon; children: ReactNode }) {
  const t = {
    new: "bg-marigold-100 text-marigold-800",
    info: "bg-info-50 text-info-800",
    success: "bg-success-50 text-success-800",
    warning: "bg-warning-50 text-warning-800",
    neutral: "bg-neutral-100 text-ink-2",
  }[tone];
  return (
    <span className={cn("inline-flex h-[26px] shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-3 t-caption font-bold", t)}>
      {I && <I size={14} weight="bold" aria-hidden />}
      {children}
    </span>
  );
}

const STATUS: Record<MeetupView, { label: string; tone: TagTone; icon: Icon }> = {
  proposed: { label: "Proposed", tone: "info", icon: PaperPlaneTilt },
  scheduled: { label: "Scheduled", tone: "success", icon: CalendarCheck },
  check: { label: "Did it happen?", tone: "warning", icon: Question },
  completed: { label: "Completed", tone: "success", icon: CheckCircle },
  cancelled: { label: "Cancelled", tone: "neutral", icon: MinusCircle },
  declined: { label: "Declined", tone: "neutral", icon: MinusCircle },
  not_happened: { label: "Did not happen", tone: "neutral", icon: CalendarBlank },
};
export function StatusTag({ status }: { status: MeetupView }) {
  const s = STATUS[status];
  return <Tag tone={s.tone} icon={s.icon}>{s.label}</Tag>;
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-[12px] border border-hairline bg-surface p-4", className)}>{children}</div>;
}

export function Banner({ tone = "info", children, action }: { tone?: "info" | "warning" | "success"; children: ReactNode; action?: ReactNode }) {
  const t = { info: "bg-info-50 text-info-800", warning: "bg-warning-50 text-warning-800", success: "bg-success-50 text-success-800" }[tone];
  const I = tone === "success" ? CheckCircle : tone === "warning" ? WarningCircle : Info;
  return (
    <div role="status" className={cn("flex items-start gap-3 rounded-[8px] px-4 py-3", t)}>
      <I size={20} aria-hidden className="mt-[2px] shrink-0" />
      <div className="min-w-0 flex-1 t-small">
        {children}
        {action && <div className="mt-1">{action}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ icon: I, title, body, action }: { icon: Icon; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-4 py-12 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-marigold-100 text-marigold-800"><I size={24} aria-hidden /></span>
      <h2 className="mt-4 t-heading">{title}</h2>
      <p className="mt-2 measure text-ink-2">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function FieldError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="mt-2 flex items-start gap-1 t-small text-danger-800">
      <WarningCircle size={20} className="shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

export const inputCls = (err?: boolean) =>
  cn("block min-h-11 w-full rounded-[8px] bg-surface px-3 py-2 t-body text-ink placeholder:text-ink-muted",
    err ? "border-[1.5px] border-danger-600" : "border border-field");

export function Label({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return <label htmlFor={htmlFor} className="mb-2 block t-label">{children}</label>;
}

export function Avatar({ name, url, size = 56 }: { name: string; url?: string | null; size?: number }) {
  const initial = (name.trim()[0] ?? "?").toUpperCase();
  return url ? (
    <img src={url} alt="" width={size} height={size} style={{ width: size, height: size }} className="shrink-0 rounded-full bg-brand-50 object-cover" loading="lazy" decoding="async" />
  ) : (
    <span aria-hidden style={{ width: size, height: size, fontSize: size * 0.4 }} className="grid shrink-0 place-items-center rounded-full bg-brand-50 font-bold text-brand-800">
      {initial}
    </span>
  );
}

/** Attendance record first, rating second. Never red, never a zero score (Layer 6a). */
export function ReliabilitySignal({ r, max = 5, animateFirst = false }: { r: Reliability | null | undefined; max?: number; animateFirst?: boolean }) {
  const v = reliabilityView(r, max);
  if (v.kind === "new") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Tag tone="new" icon={Sparkle}>New member</Tag>
        <span className="t-small text-ink-2">No meetups yet</span>
      </div>
    );
  }
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="t-strong">{v.line1}</span>
        <span role="img" aria-label={v.a11y} className="flex gap-[3px]">
          {v.marks.map((m, i) => (
            <span key={m.meetupId} className={cn("h-3 w-3 rounded-[3px]", m.attended ? "bg-brand-600" : "border-[1.5px] border-field", animateFirst && i === 0 && "animate-mark")} />
          ))}
        </span>
      </div>
      <p className="t-small text-ink-2">{v.line2}</p>
    </div>
  );
}

/* Dialog: focus moves in and is trapped, Escape closes when dismissable, focus returns on close. */
export function Modal({ open, onOpenChange, title, description, children, dismissable = true }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: ReactNode; children: ReactNode; dismissable?: boolean;
}) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(open);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (open) { setMounted(true); setLeaving(false); return; }
    if (!mounted) return;
    setLeaving(true);
    const t = window.setTimeout(() => { setMounted(false); setLeaving(false); }, 150);
    return () => window.clearTimeout(t);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const focusables = () => Array.from(panel.current?.querySelectorAll<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])") ?? []).filter((e) => !e.hasAttribute("disabled"));
    const first = focusables().find((e) => !e.dataset["close"]) ?? focusables()[0];
    window.setTimeout(() => (first ?? panel.current)?.focus({ preventScroll: true }), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissable) { e.preventDefault(); onOpenChange(false); }
      if (e.key === "Tab") {
        const f = focusables();
        if (!f.length) return;
        const a = f[0]!, z = f[f.length - 1]!;
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; prev?.focus?.({ preventScroll: true }); };
  }, [open, dismissable, onOpenChange]);

  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 pb-[calc(var(--sab)+16px)] sm:items-center">
      <div className={cn("absolute inset-0 bg-ink/40", leaving ? "animate-[fade-out_150ms_ease-out_both]" : "animate-fade")} onClick={() => dismissable && onOpenChange(false)} aria-hidden />
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={`${id}-t`} aria-describedby={description ? `${id}-d` : undefined} tabIndex={-1}
        className={cn("relative max-h-[85dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-[12px] bg-surface p-6 shadow-[var(--shadow-float)] outline-none",
          leaving ? "animate-[fade-out_150ms_ease-out_both]" : "animate-sheet")}>
        <h2 id={`${id}-t`} className={cn("t-heading", dismissable && "pr-10")}>{title}</h2>
        {description && <div id={`${id}-d`} className="mt-2 text-ink-2">{description}</div>}
        <div className="mt-6">{children}</div>
        {dismissable && (
          <button type="button" data-close="1" onClick={() => onOpenChange(false)} className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-[8px] text-ink-2 hover:bg-neutral-100" aria-label="Close">
            <X size={20} />
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("rounded-[8px] bg-neutral-100", className)} />;
}

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2">
      <img src="/brand/logo-icon.webp" alt="" width={size} height={size} style={{ width: size, height: size }} className="shrink-0" />
      <span className="t-strong">Find My Buddy</span>
    </span>
  );
}

/** Top of a detail screen: back, title, optional trailing action. Sits under the status bar. */
export function ScreenHeader({ backTo, title, children, sub }: { backTo: string; title: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b border-hairline bg-surface/95 pt-safe backdrop-blur">
      <div className="flex min-h-14 items-center gap-1 px-2">
        <Link to={backTo} className="grid h-11 w-11 shrink-0 place-items-center rounded-[8px] hover:bg-neutral-100" aria-label="Back"><ArrowLeft size={22} /></Link>
        <div className="min-w-0 flex-1">
          <div className="truncate t-strong">{title}</div>
          {sub && <div className="truncate t-caption text-ink-2">{sub}</div>}
        </div>
        {children}
      </div>
    </header>
  );
}

/** Toasts sit above the tab bar on phone, about 4 seconds, shadow.menu. */
export function ToastHost({ aboveTabs }: { aboveTabs: boolean }) {
  const toasts = useToasts();
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 z-40 flex flex-col items-center gap-2 px-4"
      style={{ bottom: `calc(var(--sab) + ${aboveTabs ? "var(--tabbar-h) + 12px" : "140px"})` }}>
      {toasts.map((t) => {
        const I = t.tone === "error" ? WarningCircle : t.tone === "info" ? Info : t.tone === "neutral" ? MinusCircle : CheckCircle;
        const c = t.tone === "error" ? "text-danger-600" : t.tone === "info" ? "text-info-600" : t.tone === "neutral" ? "text-ink-2" : "text-success-600";
        return (
          <button key={t.id} type="button" onClick={() => dismiss(t.id)}
            className={cn("pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-[12px] border border-hairline bg-surface px-4 py-3 text-left shadow-[var(--shadow-menu)]",
              t.leaving ? "animate-toast-out" : "animate-toast-in")}>
            <I size={20} weight="fill" className={cn("mt-[2px] shrink-0", c)} aria-hidden />
            <span className="t-small text-ink">{t.msg}</span>
          </button>
        );
      })}
    </div>
  );
}
