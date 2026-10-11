/* Entry screens (screen review 0, 1 and 1b): Landing, Sign up, Log in.
   OAuth only (PRD S1.2), simulated for the prototype. Trust content sits on Sign up, before the provider handoff (PRD S1.1). */
import { useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, MapPin, Eye, LockSimple, IdentificationCard, Envelope, UserCircle, Flask } from "@phosphor-icons/react";
import { Avatar, Btn, FieldError, Label, Modal, inputCls } from "@/components/ui";
import { ResetDemo } from "@/components/ResetDemo";
import { signIn } from "@/lib/actions";
import { cn } from "@/lib/cn";
import { CONTACT_EMAIL, type Provider } from "@/lib/data";
import { Link, navigate } from "@/lib/router";
import { track, useStore } from "@/lib/store";

/* Providers' own marks, used only on their "continue with" buttons. */
function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FBBC05" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.7-.4-3.9z" />
      <path fill="#EA4335" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#34A853" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A11.9 11.9 0 0 1 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#4285F4" d="M43.6 20.1H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.7-.4-3.9z" />
    </svg>
  );
}
function FacebookMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path fill="#1877F2" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.43c0-3.01 1.79-4.67 4.53-4.67 1.31 0 2.69.24 2.69.24v2.95h-1.51c-1.49 0-1.96.93-1.96 1.87v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.09 24 18.1 24 12.07z" />
    </svg>
  );
}
function XMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path fill="#000000" d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93zm-1.29 19.5h2.04L6.49 3.24H4.3l13.31 17.41z" />
    </svg>
  );
}

const PROVIDERS: { id: Provider; label: string; mark: () => ReactNode; domain: string }[] = [
  { id: "google", label: "Google", mark: GoogleMark, domain: "gmail.com" },
  { id: "facebook", label: "Facebook", mark: FacebookMark, domain: "outlook.com" },
  { id: "x", label: "X", mark: XMark, domain: "proton.me" },
];

const NEW_NAMES = ["Sam Taylor", "Alex Chen", "Jamie Singh", "Riley Morgan", "Chris Nguyen", "Maya Thompson"];

function ProviderButton({ p, onClick }: { p: (typeof PROVIDERS)[number]; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="relative flex min-h-11 w-full items-center justify-center rounded-[8px] border border-field bg-surface px-4 t-strong text-ink transition-[transform,background-color] duration-150 ease-[var(--ease-out)] hover:bg-neutral-100 active:scale-[0.97]">
      <span className="absolute left-4 grid h-5 w-5 place-items-center">{p.mark()}</span>
      Continue with {p.label}
    </button>
  );
}

/* ---------- Screen 0: Landing ---------- */

export function Landing() {
  return (
    <div className="flex h-dvh flex-col bg-white pt-safe">
      <div className="flex min-h-0 flex-1 items-center justify-center px-8 py-6">
        <img src="/brand/logo-full.webp" alt="Find My Buddy. Buddies, activities, repeat." width={300} height={225}
          className="h-auto max-h-full w-full max-w-[300px] object-contain" decoding="async" fetchPriority="high" />
      </div>
      <div className="mx-auto grid w-full max-w-[600px] gap-3 px-4 pb-[calc(var(--sab)+24px)]">
        <Link to="/signup" className="inline-flex min-h-11 w-full items-center justify-center rounded-[8px] bg-brand-600 px-4 t-strong text-white transition-transform duration-150 hover:bg-brand-700 active:scale-[0.97]">Sign up</Link>
        <Link to="/login" className="inline-flex min-h-11 w-full items-center justify-center rounded-[8px] border border-brand-600 bg-surface px-4 t-strong text-brand-600 transition-transform duration-150 hover:bg-brand-50 active:scale-[0.97]">Log in</Link>
      </div>
    </div>
  );
}

/* ---------- Shared shell: back, scrolling content, pinned actions ---------- */

function EntryShell({ children, footer }: { children: ReactNode; footer: ReactNode }) {
  return (
    <div className="flex h-dvh flex-col bg-page">
      <header className="shrink-0 pt-safe">
        <div className="mx-auto flex max-w-[600px] items-center px-2 py-1">
          <Link to="/" className="grid h-11 w-11 place-items-center rounded-[8px] hover:bg-neutral-100" aria-label="Back"><ArrowLeft size={22} /></Link>
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto max-w-[600px] px-4 pb-6">{children}</div>
      </main>
      <div className="shrink-0 border-t border-hairline bg-surface pb-[calc(var(--sab)+16px)] pt-4">
        <div className="mx-auto max-w-[600px] px-4">{footer}</div>
      </div>
    </div>
  );
}

/* ---------- Screen 1: Sign up ---------- */

const TRUST: { icon: typeof MapPin; text: ReactNode }[] = [
  { icon: MapPin, text: "Others only see your approximate area, never your address." },
  { icon: Eye, text: "Members see your first name, activities, area, free times and photo if you add one." },
  { icon: LockSimple, text: "Nothing is public. You need an account to see anyone." },
  { icon: IdentificationCard, text: "For adults 18 and over in British Columbia." },
  { icon: Envelope, text: <>To remove your account, email <a className="text-brand-600 underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</> },
];

export function SignUp() {
  const [agree, setAgree] = useState(false);
  const [err, setErr] = useState("");
  const [provider, setProvider] = useState<Provider | null>(null);

  const start = (p: Provider) => {
    track("sign_up_started", { provider: p });
    if (!agree) { setErr("Tick the box to accept the terms and confirm you're 18 or older."); return; }
    setErr("");
    setProvider(p);
  };

  return (
    <EntryShell footer={
      <>
        <label className="flex min-h-11 cursor-pointer items-start gap-3">
          <input type="checkbox" checked={agree} onChange={(e) => { setAgree(e.target.checked); if (e.target.checked) setErr(""); }}
            className="mt-[2px] h-6 w-6 shrink-0 accent-[var(--color-brand-600)]" />
          <span className="t-small">I accept the terms of use and privacy notice, including that I'm 18 or older.</span>
        </label>
        <FieldError>{err}</FieldError>
        <div className="mt-3 grid gap-3">
          {PROVIDERS.map((p) => <ProviderButton key={p.id} p={p} onClick={() => start(p.id)} />)}
        </div>
      </>
    }>
      <h1 className="mt-2 t-title-2 text-brand-800">Let's find your buddies</h1>
      <p className="mt-2 t-small text-ink-2">No password needed. Here's what to know before you join.</p>
      <ul className="mt-5 grid gap-4">
        {TRUST.map((t, i) => (
          <li key={i} className="flex gap-3 t-small text-ink">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-800"><t.icon size={18} aria-hidden /></span>
            <span className="pt-2">{t.text}</span>
          </li>
        ))}
      </ul>
      <ResetDemo className="mt-8" />
      {provider && <ProviderSheet provider={provider} mode="signup" onClose={(msg) => { setProvider(null); if (msg) setErr(msg); }} />}
    </EntryShell>
  );
}

/* ---------- Screen 1b: Log in ---------- */

export function LogIn() {
  const [err, setErr] = useState("");
  const [provider, setProvider] = useState<Provider | null>(null);
  return (
    <EntryShell footer={
      <>
        <FieldError>{err}</FieldError>
        <div className="mt-1 grid gap-3">
          {PROVIDERS.map((p) => <ProviderButton key={p.id} p={p} onClick={() => { setErr(""); track("log_in_started", { provider: p.id }); setProvider(p.id); }} />)}
        </div>
        <p className="mt-4 text-center t-small text-ink-2">New here? <Link to="/signup" className="font-bold text-brand-600 underline underline-offset-4">Sign up</Link></p>
      </>
    }>
      <h1 className="mt-2 t-title-2 text-brand-800">Welcome back</h1>
      <p className="mt-2 t-small text-ink-2">Continue with the account you signed up with.</p>
      {provider && <ProviderSheet provider={provider} mode="login" onClose={(msg) => { setProvider(null); if (msg) setErr(msg); }} />}
    </EntryShell>
  );
}

/** Stands in for the provider's own consent screen. Clearly labelled as simulated. */
function ProviderSheet({ provider, mode, onClose }: { provider: Provider; mode: "signup" | "login"; onClose: (msg?: string) => void }) {
  const s = useStore();
  const p = PROVIDERS.find((x) => x.id === provider)!;
  const existing = s.users.filter((u) => u.provider === provider && (u.persona || !u.seed));
  const suggestion = useMemo(() => NEW_NAMES[Math.floor(Math.random() * NEW_NAMES.length)]!, []);
  const [view, setView] = useState<"pick" | "new" | "no_account">("pick");
  const [fullName, setFullName] = useState(suggestion);
  const [email, setEmail] = useState(`${suggestion.toLowerCase().replace(" ", ".")}@${p.domain}`);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const go = (identity: { fullName: string; email: string }) => {
    setBusy(true);
    window.setTimeout(() => {
      const r = signIn(provider, identity, mode);
      setBusy(false);
      if (!r.ok) {
        if (r.code === "no_account") { setView("no_account"); return; }
        onClose(r.error); return;
      }
      navigate("/", { replace: true });
    }, 500);
  };

  const submitNew = () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setErr("Enter an email address like name@example.com."); return; }
    setErr("");
    go({ fullName, email });
  };

  return (
    <Modal open onOpenChange={(o) => { if (!o) onClose(`${mode === "login" ? "Logging in" : "Signing up"} with ${p.label} was cancelled. You can try again or choose another service.`); }}
      title={`Continue with ${p.label}`}
      description={<span className="flex items-start gap-2 t-small"><Flask size={18} className="mt-[1px] shrink-0" aria-hidden />Simulated sign in for this prototype. In the real product this step happens on {p.label}'s own page.</span>}>
      {view === "pick" && (
        <div className="grid gap-2">
          {existing.map((u) => (
            <button key={u.id} type="button" disabled={busy} onClick={() => go({ fullName: u.fullName, email: u.email })}
              className="flex min-h-14 items-center gap-3 rounded-[8px] border border-hairline px-3 text-left hover:border-field">
              <Avatar name={u.givenName} url={u.photo} size={40} />
              <span className="min-w-0 flex-1"><span className="block t-strong">{u.fullName}</span><span className="block truncate t-small text-ink-2">{u.email}</span></span>
            </button>
          ))}
          <button type="button" onClick={() => setView("new")}
            className="flex min-h-14 items-center gap-3 rounded-[8px] border border-dashed border-field px-3 text-left hover:border-brand-600">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-800"><UserCircle size={24} aria-hidden /></span>
            <span><span className="block t-strong">Use another account</span><span className="block t-small text-ink-2">{mode === "signup" ? "Try the new member sign up" : "An account not listed here"}</span></span>
          </button>
          {busy && <p className="mt-2 t-small text-ink-2" role="status">Signing you in…</p>}
        </div>
      )}
      {view === "new" && (
        <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); submitNew(); }}>
          <div><Label htmlFor="pv-name">Name on your {p.label} account</Label><input id="pv-name" className={inputCls()} value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" /></div>
          <div><Label htmlFor="pv-email">Email on your {p.label} account</Label><input id="pv-email" type="email" inputMode="email" className={inputCls(!!err)} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /><FieldError>{err}</FieldError></div>
          <p className="t-small text-ink-2">Find My Buddy only shows your first name to other members.</p>
          <div className="grid grid-cols-2 gap-3">
            <Btn type="submit" loading={busy}>Continue</Btn>
            <Btn variant="secondary" onClick={() => setView("pick")}>Back</Btn>
          </div>
        </form>
      )}
      {view === "no_account" && (
        <div role="alert">
          <p className="t-strong">We don't have an account for that email yet.</p>
          <p className="mt-1 t-small text-ink-2">Sign up first. It only takes a couple of minutes, and you'll see what others can see about you before you join.</p>
          <div className={cn("mt-5 grid grid-cols-2 gap-3")}>
            <Btn onClick={() => { onClose(); navigate("/signup", { replace: true }); }}>Sign up</Btn>
            <Btn variant="secondary" onClick={() => setView("pick")}>Try another</Btn>
          </div>
        </div>
      )}
    </Modal>
  );
}
