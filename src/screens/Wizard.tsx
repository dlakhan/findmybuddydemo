/* Profile wizard (PRD S2.1 to S2.8, R4 to R9; screen review 2). One topic per step, saved per step, resumable.
   Continue is pinned at the bottom of every step. */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, Plus, MagnifyingGlass, CheckCircle, Camera, MapPin, Check } from "@phosphor-icons/react";
import { Avatar, Btn, Chip, FieldError, Label, ReasonChip, ReliabilitySignal, inputCls } from "@/components/ui";
import { addActivity, saveProfile } from "@/lib/actions";
import { cn } from "@/lib/cn";
import { BC_AREAS, DAYS, LEVELS, PARTS, TRAVEL_OPTIONS, WIZARD_STEPS, type Level, type WizardStep } from "@/lib/data";
import type { Activity, User } from "@/lib/model";
import { activitySuggestions, levelLabel, normaliseActivity, reliabilityOf } from "@/lib/rules";
import { Link, navigate, query, usePath } from "@/lib/router";
import { me as getMe, track, useStore } from "@/lib/store";
import { toast } from "@/lib/toast";

/** Persona activities first, so the most likely picks fit on screen (screen review 2, step 1). */
const POPULAR = ["Badminton", "Pickleball", "Hiking", "Running", "Tennis", "Climbing", "Yoga", "Board games"];

const DRIVE_HINT: Record<number, string> = {
  5: "about a 10 minute drive", 10: "about a 15 minute drive", 15: "roughly a 20 minute drive", 25: "roughly a 30 minute drive", 50: "up to an hour's drive",
};

const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri"];
const WEEKEND = ["sat", "sun"];
const QUICK_PICKS = [
  { label: "Weekday mornings", slots: WEEKDAYS.map((d) => `${d}-morning`) },
  { label: "Weekday evenings", slots: WEEKDAYS.map((d) => `${d}-evening`) },
  { label: "Weekend mornings", slots: WEEKEND.map((d) => `${d}-morning`) },
  { label: "Weekend afternoons", slots: WEEKEND.map((d) => `${d}-afternoon`) },
];

const PHRASES = ["Someone at my level", "A regular weekly game", "Patient with beginners", "Happy to split court costs", "Just for fun"];

export function Wizard({ step: raw }: { step: string }) {
  const s = useStore();
  const me = getMe(s)!;
  const path = usePath();
  const edit = query(path).get("edit") === "1";
  const step = (WIZARD_STEPS as readonly string[]).includes(raw) ? (raw as WizardStep) : "activities";
  const idx = WIZARD_STEPS.indexOf(step);
  const [err, setErr] = useState("");

  const [acts, setActs] = useState<Activity[]>(me.activities);
  const [area, setArea] = useState(me.area);
  const [outside, setOutside] = useState(false);
  const [travel, setTravel] = useState(me.travelKm || 15);
  const [slots, setSlots] = useState<string[]>(me.slots);
  const [looking, setLooking] = useState(me.lookingFor);
  const [photo, setPhoto] = useState<string | null>(me.photo);
  // Skill step, card mode (3 or more activities): which activity card is showing
  const [card, setCard] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);

  useEffect(() => { track("wizard_step_reached", { step }); setErr(""); setCard(0); }, [step]);

  const go = (to: WizardStep | "done") => {
    if (edit || to === "done") { navigate(edit ? "/profile" : "/matches"); return; }
    navigate(`/setup/${to}`);
  };
  const next = () => go(WIZARD_STEPS[idx + 1] ?? "done");

  const save = (patch: Parameters<typeof saveProfile>[0]) => {
    setErr("");
    const became = saveProfile(patch, step);
    if (became) toast("You're findable now. People nearby can see you.");
    else if (edit) toast("Profile updated");
  };

  const cardMode = step === "skill" && acts.length >= 3;

  const submit = () => {
    if (step === "activities") {
      if (!acts.length) { setErr("Pick at least one activity to continue."); return; }
      save({ activities: acts }); next();
    } else if (step === "skill") {
      if (cardMode) {
        const a = acts[card]!;
        if (!a.level) { setErr(`Pick a level for ${a.name} to continue.`); return; }
        if (card < acts.length - 1) { setErr(""); setDir(1); setCard(card + 1); return; }
      }
      const miss = acts.find((a) => !a.level);
      if (miss) { setErr(`Pick a level for ${miss.name} to continue.`); return; }
      save({ activities: acts }); next();
    } else if (step === "location") {
      if (outside) { setErr("Find My Buddy is only open in British Columbia for now."); return; }
      if (!area) { setErr("Pick an area from the list so people nearby can find you."); return; }
      save({ area, travelKm: travel }); next();
    } else if (step === "availability") {
      if (!slots.length) { setErr("Pick at least one time you're usually free."); return; }
      save({ slots }); next();
    } else if (step === "looking") {
      if (looking.length > 280) { setErr("Keep it to 280 characters or fewer."); return; }
      save({ lookingFor: looking.trim() }); next();
    } else {
      if (photo !== me.photo) save({ photo });
      next();
    }
  };

  const cardBack = () => {
    setErr("");
    if (card > 0) { setDir(-1); setCard(card - 1); }
    else navigate(edit ? "/setup/activities?edit=1" : "/setup/activities");
  };

  const firstAct = acts[0]?.name;
  const encouragement: Partial<Record<WizardStep, string>> = edit ? {} : {
    activities: `Hi ${me.givenName}! Let's set up your profile.`,
    skill: firstAct ? `Nice, ${firstAct.toLowerCase()} it is.` : undefined,
    location: "Halfway there.",
    availability: "Last one that matters for matching.",
    looking: "You're findable now. Two optional extras.",
  } as Partial<Record<WizardStep, string>>;

  const primaryLabel = edit ? "Save" : step === "photo" ? "Finish" : cardMode && card < acts.length - 1 ? "Next" : "Continue";

  return (
    <div className="flex h-dvh flex-col bg-page">
      <header className="shrink-0 bg-page pt-safe">
        <div className="mx-auto flex max-w-[600px] items-center gap-2 px-2 py-2">
          {edit ? (
            <Link to="/profile" className="grid h-11 w-11 place-items-center rounded-[8px] hover:bg-neutral-100" aria-label="Back to profile"><ArrowLeft size={22} /></Link>
          ) : idx > 0 ? (
            <Link to={`/setup/${WIZARD_STEPS[idx - 1]}`} className="grid h-11 w-11 place-items-center rounded-[8px] hover:bg-neutral-100" aria-label="Back"><ArrowLeft size={22} /></Link>
          ) : <span className="h-11 w-11" />}
          <div className="flex-1">
            {edit ? <p className="t-strong">Edit profile</p> : (
              <>
                <p className="t-small text-ink-2">Step {idx + 1} of {WIZARD_STEPS.length}</p>
                <div className="mt-1 h-2 rounded-full bg-neutral-100" role="progressbar" aria-label="Profile setup progress" aria-valuemin={1} aria-valuemax={WIZARD_STEPS.length} aria-valuenow={idx + 1}>
                  <div className="h-2 rounded-full bg-brand-600 transition-[width] duration-200 ease-[var(--ease-out)]" style={{ width: `${((idx + 1) / WIZARD_STEPS.length) * 100}%` }} />
                </div>
              </>
            )}
          </div>
          {!edit && <Link to="/matches" className="px-2 t-label text-brand-600 underline underline-offset-4">Finish later</Link>}
        </div>
      </header>

      <form className="flex min-h-0 flex-1 flex-col" onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
        <main className={cn("min-h-0 flex-1", step === "activities" ? "flex flex-col overflow-hidden" : "overflow-y-auto overscroll-contain")}>
          <div className={cn("mx-auto w-full max-w-[600px] px-4 pb-6 pt-2", step === "activities" && "flex min-h-0 flex-1 flex-col")}>
            {encouragement[step] && <p className="mb-3 shrink-0"><span className="inline-block rounded-full bg-marigold-100 px-3 py-1 t-label text-marigold-800">{encouragement[step]}</span></p>}

            {step === "activities" && <ActivitiesStep acts={acts} setActs={(a) => { setActs(a); setErr(""); }} hasErr={!!err} />}

            {step === "skill" && (
              <>
                <h1 className="screen-title">What's your level?</h1>
                <p className="mt-2 text-ink-2">This helps us suggest people who play like you.</p>
                {cardMode ? (
                  <SkillCards acts={acts} card={card} dir={dir} onPick={(lv) => { setActs(acts.map((x, j) => (j === card ? { ...x, level: lv } : x))); setErr(""); }} />
                ) : (
                  <SkillRows acts={acts} onPick={(i, lv) => { setActs(acts.map((x, j) => (j === i ? { ...x, level: lv } : x))); setErr(""); }} />
                )}
              </>
            )}

            {step === "location" && (
              <LocationStep area={area} outside={outside} travel={travel} hasErr={!!err}
                setArea={(a) => { setArea(a); setOutside(false); setErr(""); }} setOutside={() => { setOutside(true); setArea(""); setErr(""); }} setTravel={setTravel} />
            )}

            {step === "availability" && <AvailabilityStep slots={slots} setSlots={(x) => { setSlots(x); setErr(""); }} />}

            {step === "looking" && (
              <>
                <h1 className="screen-title">What are you looking for?</h1>
                <p className="mt-2 text-ink-2">Optional. Tap a phrase to add it, or write your own.</p>
                <div className="mt-4 flex flex-wrap gap-x-2">
                  {PHRASES.map((ph) => {
                    const used = looking.toLowerCase().includes(ph.toLowerCase());
                    return (
                      <Chip key={ph} selected={used} onClick={() => {
                        if (used) {
                          setLooking(looking.replace(new RegExp(`\\s*${ph.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.?`, "i"), "").trim());
                        } else {
                          const t = looking.trim();
                          setLooking(t ? `${t}${/[.!?]$/.test(t) ? "" : "."} ${ph}.` : `${ph}.`);
                        }
                        setErr("");
                      }}>{ph}</Chip>
                    );
                  })}
                </div>
                <div className="mt-4"><Label htmlFor="looking">Looking for</Label>
                  <textarea id="looking" rows={4} className={cn(inputCls(looking.length > 280), "min-h-28")} value={looking} onChange={(e) => setLooking(e.target.value)}
                    placeholder="For example: someone patient to learn with, weekend mornings" />
                  <p className={cn("mt-1 text-right t-caption", looking.length > 280 ? "text-danger-800" : "text-ink-muted")}>{looking.length} / 280</p>
                </div>
              </>
            )}

            {step === "photo" && <PhotoStep me={{ ...me, activities: acts, area: area || me.area, photo }} setPhoto={setPhoto} setErr={setErr} />}
          </div>
        </main>

        <footer className="shrink-0 border-t border-hairline bg-surface pb-[calc(var(--sab)+12px)] pt-3">
          <div className="mx-auto max-w-[600px] px-4">
            <FieldError>{err}</FieldError>
            {cardMode ? (
              <div className={cn("grid grid-cols-2 gap-3", err && "mt-2")}>
                <Btn variant="secondary" onClick={cardBack}>Back</Btn>
                <Btn type="submit">{primaryLabel}</Btn>
              </div>
            ) : (
              <div className={cn("grid gap-3", err && "mt-2", !edit && (step === "looking" || step === "photo") && "grid-cols-2")}>
                {!edit && (step === "looking" || step === "photo") && <Btn variant="secondary" onClick={() => next()}>Skip</Btn>}
                <Btn type="submit">{primaryLabel}</Btn>
              </div>
            )}
          </div>
        </footer>
      </form>
    </div>
  );
}

/* ---------- Step 1: activities. Shows only as many chips as fit without scrolling. ---------- */

function ActivitiesStep({ acts, setActs, hasErr }: { acts: Activity[]; setActs: (a: Activity[]) => void; hasErr: boolean }) {
  const s = useStore();
  const [q, setQ] = useState("");
  const [addErr, setAddErr] = useState("");
  const has = (n: string) => acts.some((a) => normaliseActivity(a.name) === normaliseActivity(n));
  const toggle = (n: string) => setActs(has(n) ? acts.filter((a) => normaliseActivity(a.name) !== normaliseActivity(n)) : [...acts, { name: n, level: null }]);

  const all = useMemo(() => {
    const rest = s.activities.filter((a) => !POPULAR.includes(a));
    return Array.from(new Set([...POPULAR, ...rest]));
  }, [s.activities]);
  // Selected activities always stay visible, ahead of the rest
  const list = useMemo(() => {
    const base = q.trim() ? activitySuggestions(q, Array.from(new Set([...all, ...acts.map((a) => a.name)]))) : all;
    const selected = acts.map((a) => a.name).filter((n) => q.trim() ? base.some((b) => normaliseActivity(b) === normaliseActivity(n)) : true);
    return Array.from(new Set([...selected, ...base.filter((b) => !has(b))]));
  }, [q, all, acts]); // eslint-disable-line react-hooks/exhaustive-deps
  const exact = all.some((a) => normaliseActivity(a) === normaliseActivity(q)) || has(q);
  const canAdd = q.trim().length > 1 && !exact;

  const box = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(Infinity);
  const key = `${list.join("|")}#${canAdd}#${addErr}`;
  useEffect(() => { setFit(Infinity); }, [key]);
  const remeasure = useCallback(() => setFit(Infinity), []);
  useEffect(() => { window.addEventListener("resize", remeasure); return () => window.removeEventListener("resize", remeasure); }, [remeasure]);
  useLayoutEffect(() => {
    if (fit !== Infinity || !box.current) return;
    const h = box.current.clientHeight;
    const items = Array.from(box.current.children) as HTMLElement[];
    let n = 0;
    for (const el of items) { if (el.offsetTop + el.offsetHeight <= h + 1) n++; else break; }
    if (n < items.length) setFit(n);
  });
  const shown = fit === Infinity ? list : list.slice(0, fit);
  const hidden = list.length - shown.length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <h1 className="shrink-0 screen-title">What do you love to do?</h1>
      <p className="mt-2 shrink-0 text-ink-2">Pick one or more. You'll set your level next.</p>
      <div className="mt-4 shrink-0"><Label htmlFor="act-q">Search or add an activity</Label>
        <div className="relative">
          <MagnifyingGlass size={20} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden />
          <input id="act-q" className={cn(inputCls(hasErr && !acts.length), "pl-10")} value={q} onChange={(e) => { setQ(e.target.value); setAddErr(""); }} autoComplete="off" />
        </div>
      </div>
      <div ref={box} className="relative mt-3 flex min-h-0 flex-1 flex-wrap content-start gap-x-2 overflow-hidden" aria-label="Activities">
        {shown.map((a) => <Chip key={a} selected={has(a)} onClick={() => toggle(a)}>{a}</Chip>)}
      </div>
      <div className="shrink-0">
        {hidden > 0 && !q.trim() && <p className="mt-1 t-small text-ink-2">{hidden} more. Search to find them.</p>}
        {q.trim() && list.length > 0 && canAdd && <p className="mt-1 t-small text-ink-2">Is it one of these? Pick it so you're matched with everyone who chose it.</p>}
        {canAdd && (
          <div className="mt-2">
            <Btn variant="secondary" onClick={() => {
              const r = addActivity(q);
              if ("error" in r) { setAddErr(r.error); return; }
              if (!has(r.name)) setActs([...acts, { name: r.name, level: null }]);
              setQ("");
            }}>
              <Plus size={20} aria-hidden /> Add "{q.trim()}"
            </Btn>
            <FieldError>{addErr}</FieldError>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Step 2: level. Rows for 1 or 2 activities, one card at a time for 3 or more. ---------- */

function Segmented({ name, value, onPick }: { name: string; value: Level | null; onPick: (l: Level) => void }) {
  return (
    <div role="radiogroup" aria-label={`Level for ${name}`} className="grid grid-cols-3 gap-1 rounded-[8px] border border-field bg-surface p-1">
      {LEVELS.map((l) => {
        const sel = value === l.id;
        return (
          <button key={l.id} type="button" role="radio" aria-checked={sel} onClick={() => onPick(l.id)}
            className={cn("min-h-11 rounded-[6px] px-1 t-label transition-colors duration-200", sel ? "bg-brand-600 text-white" : "text-ink hover:bg-neutral-100")}>
            {l.label}
          </button>
        );
      })}
    </div>
  );
}

function SkillRows({ acts, onPick }: { acts: Activity[]; onPick: (i: number, l: Level) => void }) {
  return (
    <div className="mt-6 grid gap-6">
      {acts.map((a, i) => (
        <div key={a.name}>
          <p className="mb-2 t-strong">{a.name}</p>
          <Segmented name={a.name} value={a.level} onPick={(l) => onPick(i, l)} />
          <p className="mt-2 min-h-10 t-small text-ink-2" aria-live="polite">{a.level ? LEVELS.find((x) => x.id === a.level)!.hint : "Pick the level that fits you best."}</p>
        </div>
      ))}
    </div>
  );
}

function SkillCards({ acts, card, dir, onPick }: { acts: Activity[]; card: number; dir: 1 | -1; onPick: (l: Level) => void }) {
  const a = acts[card]!;
  return (
    <div className="mt-5">
      <div className="flex items-center justify-between">
        <p className="t-heading">{a.name}</p>
        <p className="t-small text-ink-2">{card + 1} of {acts.length}</p>
      </div>
      <div className="mt-2 flex gap-[6px]" aria-hidden>
        {acts.map((x, i) => <span key={x.name} className={cn("h-2 rounded-full transition-[width,background-color] duration-200", i === card ? "w-6 bg-brand-600" : x.level ? "w-2 bg-brand-100" : "w-2 bg-neutral-100")} />)}
      </div>
      <div key={card} className={cn("mt-4 grid gap-2", dir === 1 ? "animate-slide-next" : "animate-slide-prev")}>
        {LEVELS.map((l) => {
          const sel = a.level === l.id;
          return (
            <button type="button" key={l.id} aria-pressed={sel} onClick={() => onPick(l.id)}
              className={cn("rounded-[8px] p-3 text-left transition-[background-color,border-color,transform] duration-200 active:scale-[0.98]", sel ? "border-[1.5px] border-brand-600 bg-brand-50" : "border border-field bg-surface hover:border-brand-600")}>
              <span className={cn("flex items-center gap-2 t-strong", sel && "text-brand-800")}>{sel && <CheckCircle size={20} weight="fill" aria-hidden />}{l.label}</span>
              <span className="block t-small text-ink-2">{l.hint}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Step 3: location. Searchable list of BC places, travel distance with a plain hint. ---------- */

function LocationStep({ area, outside, travel, hasErr, setArea, setOutside, setTravel }: {
  area: string; outside: boolean; travel: number; hasErr: boolean; setArea: (a: string) => void; setOutside: () => void; setTravel: (k: number) => void;
}) {
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(!area);
  const results = BC_AREAS.filter((a) => !q.trim() || a.name.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 6);
  return (
    <>
      <h1 className="screen-title">Where are you based?</h1>
      <p className="mt-2 text-ink-2">People only see this area, never your address.</p>
      <div className="mt-5">
        <Label htmlFor="area-q">Your area</Label>
        {!searching && area ? (
          <div className="flex min-h-11 items-center gap-3 rounded-[8px] border-[1.5px] border-brand-600 bg-brand-50 px-3">
            <MapPin size={20} className="text-brand-800" aria-hidden />
            <span className="flex-1 t-strong text-brand-800">{area}</span>
            <Btn variant="tertiary" className="t-label" onClick={() => { setSearching(true); setQ(""); }}>Change</Btn>
          </div>
        ) : (
          <>
            <div className="relative">
              <MagnifyingGlass size={20} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden />
              <input id="area-q" className={cn(inputCls(hasErr && !area), "pl-10")} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Start typing your area" autoComplete="off" />
            </div>
            <ul className="mt-2 overflow-hidden rounded-[8px] border border-hairline bg-surface" role="listbox" aria-label="BC places">
              {results.map((a) => (
                <li key={a.name}>
                  <button type="button" role="option" aria-selected={area === a.name} onClick={() => { setArea(a.name); setSearching(false); }}
                    className="flex min-h-11 w-full items-center gap-3 border-b border-hairline px-3 text-left last:border-0 hover:bg-neutral-100">
                    <MapPin size={18} className="text-ink-2" aria-hidden /><span className="flex-1">{a.name}</span>{area === a.name && <Check size={18} className="text-brand-600" aria-hidden />}
                  </button>
                </li>
              ))}
              {results.length === 0 && <li className="px-3 py-3 t-small text-ink-2">No BC place matches "{q}". Try a nearby town or city.</li>}
              <li>
                <button type="button" onClick={setOutside} className={cn("flex min-h-11 w-full items-center px-3 text-left t-small", outside ? "font-bold text-ink" : "text-ink-2 hover:bg-neutral-100")}>
                  I'm outside British Columbia
                </button>
              </li>
            </ul>
          </>
        )}
      </div>
      {outside && <p className="mt-4 rounded-[8px] bg-neutral-100 p-3 t-small text-ink-2">Find My Buddy is only open in British Columbia for now, so your profile can't be finished yet. Thanks for your interest.</p>}
      <fieldset className="mt-6">
        <legend className="mb-2 t-label">How far will you travel?</legend>
        <div className="flex flex-wrap gap-x-2">
          {TRAVEL_OPTIONS.map((k) => <Chip key={k} selected={travel === k} onClick={() => setTravel(k)}>{k} km</Chip>)}
        </div>
        <p className="mt-1 t-small text-ink-2" aria-live="polite">{travel} km is {DRIVE_HINT[travel] ?? "a short drive"}.</p>
      </fieldset>
    </>
  );
}

/* ---------- Step 4: availability. Quick picks fill the grid; they never overlap. ---------- */

function AvailabilityStep({ slots, setSlots }: { slots: string[]; setSlots: (s: string[]) => void }) {
  return (
    <>
      <h1 className="screen-title">When are you usually free?</h1>
      <p className="mt-2 text-ink-2">Tap a quick pick, then fine tune below.</p>
      <div className="mt-4 flex flex-wrap gap-x-2">
        {QUICK_PICKS.map((qp) => {
          const on = qp.slots.every((x) => slots.includes(x));
          return (
            <Chip key={qp.label} selected={on} onClick={() => setSlots(on ? slots.filter((x) => !qp.slots.includes(x)) : Array.from(new Set([...slots, ...qp.slots])))}>{qp.label}</Chip>
          );
        })}
      </div>
      <table className="mt-3 w-full border-separate border-spacing-1">
        <thead><tr><th className="sr-only">Day</th>{PARTS.map((p) => <th key={p.id} className="t-label text-ink-2">{p.label}</th>)}</tr></thead>
        <tbody>
          {DAYS.map((d) => (
            <tr key={d.id}>
              <th scope="row" className="w-12 pr-1 text-left t-label">{d.short}</th>
              {PARTS.map((p) => {
                const id = `${d.id}-${p.id}`; const sel = slots.includes(id);
                return (
                  <td key={p.id}>
                    <button type="button" aria-pressed={sel} aria-label={`${d.short} ${p.label}`}
                      onClick={() => setSlots(sel ? slots.filter((x) => x !== id) : [...slots, id])}
                      className={cn("grid h-10 w-full place-items-center rounded-[8px] transition-colors duration-200", sel ? "border-[1.5px] border-brand-600 bg-brand-50 text-brand-800" : "border border-field bg-surface")}>
                      {sel ? <CheckCircle size={20} weight="fill" aria-hidden /> : null}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

/* ---------- Step 6: photo, with a live preview of the match card others will see. ---------- */

function PreviewCard({ me }: { me: User }) {
  const s = useStore();
  const a = me.activities[0];
  return (
    <div className="rounded-[12px] border border-hairline bg-surface p-4" aria-label="Preview of your match card">
      <div className="flex items-center gap-3">
        <Avatar name={me.givenName} url={me.photo} />
        <div className="min-w-0">
          <p className="t-strong">{me.givenName}</p>
          <p className="t-small text-ink-2">{me.area || "Your area"} · About 5 km away</p>
        </div>
      </div>
      {a && <div className="mt-3 flex flex-wrap gap-2"><ReasonChip>{a.name}, {levelLabel(a.level).toLowerCase()}</ReasonChip></div>}
      <div className="my-4 h-px bg-hairline" />
      <ReliabilitySignal r={reliabilityOf(me.id, s)} />
    </div>
  );
}

function PhotoStep({ me, setPhoto, setErr }: { me: User; setPhoto: (p: string | null) => void; setErr: (e: string) => void }) {
  const [busy, setBusy] = useState(false);
  const pick = (file: File) => {
    setErr("");
    if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type)) { setErr("That file isn't a photo we can use. Choose a JPG or PNG."); return; }
    if (file.size > 8 * 1024 * 1024) { setErr("That photo is over 8 MB. Choose a smaller one."); return; }
    setBusy(true);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      const size = 256; const sc = Math.max(size / img.width, size / img.height);
      c.width = size; c.height = size;
      c.getContext("2d")!.drawImage(img, (size - img.width * sc) / 2, (size - img.height * sc) / 2, img.width * sc, img.height * sc);
      setPhoto(c.toDataURL("image/jpeg", 0.82));
      setBusy(false);
    };
    img.onerror = () => { setBusy(false); setErr("That photo couldn't be opened. Try a different one."); };
    img.src = URL.createObjectURL(file);
  };
  return (
    <>
      <h1 className="screen-title">Add a photo</h1>
      <p className="mt-2 text-ink-2">Optional. Without one, people see your initial, and your profile looks just as complete.</p>
      <div className="mt-5 flex flex-wrap gap-2">
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[8px] border border-brand-600 bg-surface px-4 t-strong text-brand-600 hover:bg-brand-50">
          <Camera size={20} aria-hidden />{busy ? "Loading…" : me.photo ? "Change photo" : "Choose a photo"}
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); e.target.value = ""; }} />
        </label>
        {me.photo && <Btn variant="tertiary" onClick={() => setPhoto(null)}>Remove</Btn>}
      </div>
      <p className="mt-6 mb-2 t-label text-ink-2">How others will see you</p>
      <PreviewCard me={me} />
    </>
  );
}

export type { ReactNode };
