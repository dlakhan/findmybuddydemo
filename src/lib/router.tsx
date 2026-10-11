/* Tiny hash router: no dependency, works inside the device frame iframe and from a static host. */
import { useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from "react";

const read = () => (window.location.hash.replace(/^#/, "") || "/");
const subscribe = (l: () => void) => { window.addEventListener("hashchange", l); return () => window.removeEventListener("hashchange", l); };

export function usePath() { return useSyncExternalStore(subscribe, read, read); }

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  if (read() === to) return;
  if (opts.replace) window.location.replace(`#${to}`);
  else window.location.hash = to;
  window.scrollTo(0, 0);
}

export function back(fallback: string) {
  if (window.history.length > 1 && document.referrer !== "about:blank") window.history.back();
  else navigate(fallback, { replace: true });
}

/** Matches "/chats/:id" style patterns. */
export function match(pattern: string, path: string): Record<string, string> | null {
  const p = pattern.split("/"), a = path.split("?")[0]!.split("/");
  if (p.length !== a.length) return null;
  const out: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i]!.startsWith(":")) out[p[i]!.slice(1)] = decodeURIComponent(a[i]!);
    else if (p[i] !== a[i]) return null;
  }
  return out;
}

export function query(path: string) { return new URLSearchParams(path.split("?")[1] ?? ""); }

export function Link({ to, replace, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; replace?: boolean }) {
  return (
    <a href={`#${to}`} {...rest} onClick={(e: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(e);
      if (e.defaultPrevented || e.metaKey || e.ctrlKey) return;
      e.preventDefault();
      navigate(to, { replace });
    }} />
  );
}
