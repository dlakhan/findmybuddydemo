/* Mock backend: one JSON state in browser storage, shared by the device frame and the app. */
import { useSyncExternalStore } from "react";
import type { State, User } from "./model";
import { buildSeed } from "./seed";

const KEY = "fmb-demo-v1";
export const STATE_VERSION = 5;
/** Seeded times are relative to when the demo data was created, so stale data is rebuilt after this long. */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

let state: State = load();
const listeners = new Set<() => void>();

function fresh(): State {
  return buildSeed(Date.now());
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as State;
      const age = Date.now() - new Date(s.seededAt).getTime();
      if (s.v === STATE_VERSION && age < MAX_AGE_MS) return s;
    }
  } catch { /* storage unavailable or corrupt: start fresh */ }
  const s = fresh();
  save(s);
  return s;
}

function save(s: State) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* quota or private mode: keep in memory */ }
}

function emit() { listeners.forEach((l) => l()); }

// Keep the frame page and the app in sync (reset from outside the phone, or a second tab).
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    try { state = e.newValue ? (JSON.parse(e.newValue) as State) : load(); } catch { state = load(); }
    emit();
  });
}

export function getState() { return state; }

export function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }

export function useStore(): State {
  return useSyncExternalStore(subscribe, getState, getState);
}

/** Apply a change to a copy of the state, then persist and notify. */
export function update(fn: (draft: State) => void) {
  const next = structuredClone(state);
  fn(next);
  state = next;
  save(state);
  emit();
}

export function resetDemo() {
  state = fresh();
  save(state);
  emit();
}

export const uid = () => Math.random().toString(36).slice(2, 10);
export const nowIso = () => new Date().toISOString();

export function userById(s: State, id: string | null | undefined): User | undefined {
  return id ? s.users.find((u) => u.id === id) : undefined;
}
export function me(s: State): User | undefined { return userById(s, s.session); }

/** Instrumentation (PRD R26). State changes are recorded as events that drive toasts and badges today. */
export function track(name: string, props: Record<string, unknown> = {}) {
  update((d) => {
    d.events.push({ name, uid: d.session, at: nowIso(), props });
    if (d.events.length > 800) d.events.splice(0, d.events.length - 800);
  });
}

/* ---------- Time formatting ---------- */
export const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleString("en-CA", { weekday: "long", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
export const fmtDay = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { weekday: "long" });
export const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit", hour12: false });
export const fmtShort = (iso: string) => {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days < 1 && new Date().getDate() === d.getDate()) return fmtTime(iso);
  if (days < 7) return d.toLocaleDateString("en-CA", { weekday: "short" });
  return d.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
};
/** "Thu Oct 15" */
export const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-CA", { weekday: "short" })} ${d.toLocaleDateString("en-CA", { month: "short", day: "numeric" })}`;
};
/** Day divider in chats: Today, Yesterday, a weekday within the last week, otherwise a date (screen review 6). */
export const fmtDivider = (iso: string) => {
  const d = new Date(iso);
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((start(new Date()) - start(d)) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days > 1 && days < 7) return d.toLocaleDateString("en-CA", { weekday: "long" });
  return d.toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" });
};
