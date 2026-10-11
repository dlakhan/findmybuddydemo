/* In app toasts: short confirmations of the user's own action, or something that just happened while they're here. */
import { useSyncExternalStore } from "react";

export type Toast = { id: number; msg: string; tone: "success" | "info" | "neutral" | "error"; leaving?: boolean };
let toasts: Toast[] = [];
let n = 0;
const ls = new Set<() => void>();
const emit = () => ls.forEach((l) => l());

export function toast(msg: string, tone: Toast["tone"] = "success") {
  const id = ++n;
  toasts = [...toasts.slice(-2), { id, msg, tone }];
  emit();
  window.setTimeout(() => dismiss(id), 4000);
}
export function dismiss(id: number) {
  toasts = toasts.map((t) => (t.id === id ? { ...t, leaving: true } : t));
  emit();
  window.setTimeout(() => { toasts = toasts.filter((t) => t.id !== id); emit(); }, 150);
}
export function useToasts() {
  return useSyncExternalStore((l) => { ls.add(l); return () => ls.delete(l); }, () => toasts, () => toasts);
}
