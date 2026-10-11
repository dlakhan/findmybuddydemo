/* Suggested matches (PRD S3.1 to S3.3, S7.2; screen review 3): live count line, filter sheet,
   open spots above people, three distinct empty states. */
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { UserFocus, MagnifyingGlass, FunnelSimple, HandWaving, X } from "@phosphor-icons/react";
import { MatchCard, OpenSlotCard } from "@/components/cards";
import { TabPage } from "@/components/layout";
import { Btn, Chip, EmptyState, LinkBtn, Modal, ScreenHeader } from "@/components/ui";
import { LEVELS, PARTS, TRAVEL_OPTIONS, type Level } from "@/lib/data";
import type { State, User } from "@/lib/model";
import { findMatches, normaliseActivity, openSlotsFor, relationFor, type Match } from "@/lib/rules";
import { Link } from "@/lib/router";
import { me as getMe, track, useStore } from "@/lib/store";

type Filters = { activity: string | null; skill: Level | null; km: number | null; part: string | null };
const NONE: Filters = { activity: null, skill: null, km: null, part: null };

function useMatchData(s: State, me: User) {
  const matches = useMemo(() => {
    // Suggestions only carry new potential connections: anyone already connected is left out (PRD S10.2)
    const exclude = new Set(s.users.filter((u) => relationFor(s, me.id, u.id).kind === "connected").map((u) => u.id));
    return findMatches(me, s.users, exclude);
  }, [s, me]);
  const slots = useMemo(() => openSlotsFor(s, me), [s, me]);
  return { matches, slots };
}

function applyFilters(matches: Match[], f: Filters) {
  return matches.filter((m) => {
    const acts = m.user.activities;
    if (f.activity && !acts.some((a) => normaliseActivity(a.name) === normaliseActivity(f.activity!))) return false;
    if (f.skill) {
      const lv = f.activity ? acts.find((a) => normaliseActivity(a.name) === normaliseActivity(f.activity!))?.level : m.best.theirs;
      if (lv !== f.skill) return false;
    }
    if (f.km !== null && m.km > f.km) return false;
    if (f.part && !m.overlap.some((x) => x.endsWith(`-${f.part}`))) return false;
    return true;
  });
}
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function Matches() {
  const s = useStore();
  const me = getMe(s)!;
  const [f, setF] = useState<Filters>(NONE);
  const [sheet, setSheet] = useState(false);
  const { matches, slots } = useMatchData(s, me);

  const filtered = applyFilters(matches, f);
  const filteredSlots = slots.filter((m) => !f.activity || normaliseActivity(m.activity) === normaliseActivity(f.activity));
  const activeCount = Object.values(f).filter((v) => v !== null).length;
  const incomplete = !me.activities.length || !me.area;

  useEffect(() => { track("match_list_viewed", { count: matches.length, slots: slots.length }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!activeCount) return;
    track("filters_applied", { ...f, results: filtered.length });
    // Logged so an empty pool can later be told apart from over filtering (PRD S3.2)
    if (filtered.length === 0) track("filters_zero_results", { ...f });
  }, [f]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live count line: real counts from this person's own list, never platform wide claims (PRD 1.5)
  const count = incomplete || (!matches.length && !slots.length) ? undefined
    : activeCount ? `Showing ${filtered.length} of ${plural(matches.length, "person", "people")} · ${plural(filteredSlots.length, "open spot", "open spots")}`
    : `${plural(matches.length, "person", "people")} near you · ${plural(slots.length, "open spot", "open spots")}`;

  const chips: { label: string; clear: () => void }[] = [];
  if (f.activity) chips.push({ label: f.activity, clear: () => setF({ ...f, activity: null }) });
  if (f.skill) chips.push({ label: LEVELS.find((l) => l.id === f.skill)!.label, clear: () => setF({ ...f, skill: null }) });
  if (f.km !== null) chips.push({ label: `Within ${f.km} km`, clear: () => setF({ ...f, km: null }) });
  if (f.part) chips.push({ label: `Free ${PARTS.find((p) => p.id === f.part)!.plural}`, clear: () => setF({ ...f, part: null }) });

  let body: ReactNode;
  if (incomplete) body = (
    <EmptyState icon={UserFocus} title="Finish your profile to see matches" body="Add your activities and area so we can suggest people who fit. It takes about a minute."
      action={<LinkBtn to={`/setup/${!me.activities.length ? "activities" : "location"}`}>Finish profile</LinkBtn>} />
  );
  else if (!matches.length && !slots.length) body = (
    <EmptyState icon={HandWaving} title="Your crew is out there!"
      body={`No one nearby plays ${me.activities[0]?.name.toLowerCase() ?? "your activities"} at your level yet, and new people join every week, so check back soon. You could also widen your travel distance.`}
      action={<LinkBtn variant="secondary" to="/setup/location?edit=1">Widen travel distance</LinkBtn>} />
  );
  else if (!filtered.length && !filteredSlots.length) body = (
    <EmptyState icon={MagnifyingGlass} title="No one matches these filters" body="Try fewer filters to see more people near you."
      action={<Btn variant="secondary" onClick={() => setF(NONE)}>Clear filters</Btn>} />
  );
  else body = (
    <>
      {filteredSlots.length > 0 && (
        <section className="mt-6" aria-labelledby="slots-h">
          <h2 id="slots-h" className="t-heading">Open spots near you</h2>
          <p className="t-small text-ink-2">Plans that already have a time and place, and need one or two more.</p>
          <ul className="mt-3 flex flex-col gap-3">{filteredSlots.slice(0, 3).map((m) => <li key={m.id}><OpenSlotCard m={m} s={s} me={me} /></li>)}</ul>
          {filteredSlots.length > 3 && (
            <Link to="/matches/spots" className="mt-2 inline-flex min-h-11 items-center t-label text-brand-600 underline underline-offset-4">See all {filteredSlots.length} open spots</Link>
          )}
        </section>
      )}
      <section className="mt-6" aria-labelledby="people-h">
        {filteredSlots.length > 0 && <h2 id="people-h" className="t-heading">People</h2>}
        {filtered.length === 0 ? (
          <p className="mt-2 t-small text-ink-2">No people match these filters. <button type="button" className="font-bold text-brand-600 underline" onClick={() => setF(NONE)}>Clear filters</button></p>
        ) : (
          <ul className="mt-3 flex flex-col gap-4">
            {filtered.map((m) => {
              const rel = relationFor(s, me.id, m.user.id).kind;
              return <li key={m.user.id}><MatchCard m={m} s={s} pending={rel === "sent" ? "sent" : rel === "incoming" ? "incoming" : null} /></li>;
            })}
          </ul>
        )}
      </section>
    </>
  );

  const showFilters = !incomplete && (matches.length > 0 || slots.length > 0);

  return (
    <TabPage me={me} title="Suggested matches">
      {(count || showFilters) && (
        <div className="mt-1 flex items-center justify-between gap-3">
          <p className="min-w-0 t-small text-ink-2">{count}</p>
          {showFilters && (
        <Btn variant="secondary" className="shrink-0 px-3" onClick={() => setSheet(true)} aria-label={activeCount ? `Filters, ${activeCount} active` : "Filters"}>
          <FunnelSimple size={18} aria-hidden />Filters
          {activeCount > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 t-caption font-bold text-white">{activeCount}</span>}
        </Btn>
          )}
        </div>
      )}
      {chips.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <button key={c.label} type="button" onClick={c.clear} aria-label={`Remove filter: ${c.label}`}
              className="inline-flex h-9 items-center gap-1 rounded-full border-[1.5px] border-brand-600 bg-brand-50 pl-3 pr-2 t-label text-brand-800">
              {c.label}<X size={14} weight="bold" aria-hidden />
            </button>
          ))}
          <Btn variant="tertiary" className="t-label" onClick={() => setF(NONE)}>Clear all</Btn>
        </div>
      )}
      {body}
      {sheet && <FilterSheet initial={f} matches={matches} slots={slots.length} acts={me.activities.map((a) => a.name)} onApply={(nf) => { setF(nf); setSheet(false); }} onClose={() => setSheet(false)} />}
    </TabPage>
  );
}

function FilterSheet({ initial, matches, acts, onApply, onClose }: {
  initial: Filters; matches: Match[]; slots: number; acts: string[]; onApply: (f: Filters) => void; onClose: () => void;
}) {
  const [d, setD] = useState<Filters>(initial);
  const n = applyFilters(matches, d).length;
  const Section = ({ title, children }: { title: string; children: ReactNode }) => (
    <fieldset className="mt-5 first:mt-0">
      <legend className="mb-1 t-label text-ink-2">{title}</legend>
      <div className="flex flex-wrap gap-x-2">{children}</div>
    </fieldset>
  );
  return (
    <Modal open onOpenChange={(o) => { if (!o) onClose(); }} title="Filters">
      {acts.length > 1 && (
        <Section title="Activity">
          {acts.map((a) => <Chip key={a} selected={d.activity === a} onClick={() => setD({ ...d, activity: d.activity === a ? null : a })}>{a}</Chip>)}
        </Section>
      )}
      <Section title="Skill level">
        {LEVELS.map((l) => <Chip key={l.id} selected={d.skill === l.id} onClick={() => setD({ ...d, skill: d.skill === l.id ? null : l.id })}>{l.label}</Chip>)}
      </Section>
      <Section title="Distance">
        {TRAVEL_OPTIONS.map((k) => <Chip key={k} selected={d.km === k} onClick={() => setD({ ...d, km: d.km === k ? null : k })}>Within {k} km</Chip>)}
      </Section>
      <Section title="Free time that overlaps">
        {PARTS.map((p) => <Chip key={p.id} selected={d.part === p.id} onClick={() => setD({ ...d, part: d.part === p.id ? null : p.id })}>{p.label}s</Chip>)}
      </Section>
      <div className="sticky -bottom-6 -mx-6 mt-6 grid grid-cols-2 gap-3 border-t border-hairline bg-surface px-6 pb-6 pt-3">
        <Btn variant="secondary" onClick={() => setD(NONE)}>Clear all</Btn>
        <Btn onClick={() => onApply(d)} aria-label={`Show ${plural(n, "person", "people")}`}>Show {n}</Btn>
      </div>
    </Modal>
  );
}

/** All open spots, reached from "See all open spots". */
export function OpenSpots() {
  const s = useStore();
  const me = getMe(s)!;
  const { slots } = useMatchData(s, me);
  return (
    <div className="min-h-dvh bg-page pb-[calc(var(--sab)+24px)]">
      <ScreenHeader backTo="/matches" title="Open spots near you" />
      <ul className="mx-auto flex max-w-[600px] flex-col gap-3 px-4 pt-4">
        {slots.map((m) => <li key={m.id}><OpenSlotCard m={m} s={s} me={me} /></li>)}
      </ul>
    </div>
  );
}
