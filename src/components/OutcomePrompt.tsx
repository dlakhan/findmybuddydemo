/* Mandatory, blocking post meetup prompt (PRD S9.1 to S9.3, R21, R31; screen review 8). Always asks whether it happened first.
   It has to be fast: one question, then a rating (with optional tags) or a reason. */
import { useState } from "react";
import { Check } from "@phosphor-icons/react";
import { Avatar, Btn, Modal } from "@/components/ui";
import { submitGroupOutcome, submitOutcome } from "@/lib/actions";
import { cn } from "@/lib/cn";
import { OUTCOME_REASONS, TAGS, type OutcomeReason, type TagId } from "@/lib/data";
import type { Meetup } from "@/lib/model";
import { attendeesOf } from "@/lib/rules";
import { fmtDay, getState, me as getMe, useStore, userById } from "@/lib/store";

const ORD = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth", "eleventh", "twelfth"];
type Answer = { showed?: boolean; rating?: number; tags: TagId[] };

export function OutcomePrompt({ meetup, onDone }: { meetup: Meetup; onDone: () => void }) {
  const s = useStore();
  const me = getMe(s)!;
  const others = attendeesOf(s, meetup.id).filter((a) => a.status === "accepted" && a.userId !== me.id).map((a) => userById(s, a.userId)!);
  const group = meetup.type === "group";
  const other = others[0];
  const [step, setStep] = useState<"ask" | "yes" | "no" | "done">("ask");
  const [happened, setHappened] = useState(false);
  const [one, setOne] = useState<Answer>({ tags: [] });
  const [people, setPeople] = useState<Record<string, Answer>>({});
  const [completedN, setCompletedN] = useState(0);

  const title = step === "done" ? "Thanks, that's recorded"
    : group ? `Did ${fmtDay(meetup.startsAt)}'s ${meetup.activity.toLowerCase()} meetup happen?`
    : `Did your ${meetup.activity.toLowerCase()} meetup with ${other?.givenName ?? "them"} happen?`;
  const description = step === "done" ? undefined : (
    <div className="flex items-center gap-3">
      {!group && other && <Avatar name={other.givenName} url={other.photo} size={40} />}
      <span>{fmtDay(meetup.startsAt)} at {meetup.place}</span>
    </div>
  );

  const finish = (yes: boolean) => {
    const st = getState();
    setCompletedN(new Set(st.outcomes.filter((o) => o.reporter === me.id && o.happened).map((o) => o.meetupId)).size);
    setHappened(yes);
    setStep("done");
  };

  const submitOne = () => {
    if (!other || !one.rating) return;
    submitOutcome(meetup.id, other.id, { happened: true, rating: one.rating, tags: one.tags });
    finish(true);
  };
  const reason = (r: OutcomeReason) => {
    if (group) submitGroupOutcome(meetup.id, { happened: false, reason: r, subjects: others.map((o) => o.id) });
    else submitOutcome(meetup.id, other!.id, { happened: false, reason: r });
    finish(false);
  };
  // No partial responses: everyone needs attendance, and a rating if they showed (PRD S9.3)
  const isComplete = (a?: Answer) => !!a && (a.showed === false || (a.showed === true && !!a.rating));
  const doneCount = others.filter((o) => isComplete(people[o.id])).length;
  const submitGroup = () => {
    if (doneCount < others.length) return;
    submitGroupOutcome(meetup.id, { happened: true, people: Object.fromEntries(others.map((o) => { const p = people[o.id]!; return [o.id, { showed: !!p.showed, rating: p.rating, tags: p.tags }]; })) });
    finish(true);
  };

  return (
    <Modal open dismissable={false} onOpenChange={() => {}} title={title} description={description} stickyTitle={step === "yes" && group}>
      {step === "ask" && (
        <div className="grid gap-3">
          <Btn block onClick={() => setStep("yes")}>Yes, it happened</Btn>
          <Btn block variant="secondary" onClick={() => setStep("no")}>No</Btn>
        </div>
      )}

      {step === "yes" && !group && other && (
        <div>
          <p className="t-label">How was it with {other.givenName}?</p>
          <RatingTiles value={one.rating} onPick={(r) => setOne({ ...one, rating: r })} label={`Rate ${other.givenName}`} />
          {one.rating && (
            <div className="mt-5 animate-fade">
              <p className="t-label">Anything to add? <span className="font-normal text-ink-2">Optional</span></p>
              <TagChips value={one.tags} onChange={(tags) => setOne({ ...one, tags })} label={`Tags for ${other.givenName}`} />
            </div>
          )}
          <div className="mt-6 flex items-center gap-4">
            {one.rating && <Btn onClick={submitOne}>Submit</Btn>}
            <Btn variant="tertiary" onClick={() => setStep("ask")}>Back</Btn>
          </div>
        </div>
      )}

      {step === "yes" && group && (
        <div>
          <p className="t-label">Who showed up? Rate everyone who did.</p>
          <ul className="mt-3 grid gap-3">
            {others.map((o) => {
              const p = people[o.id] ?? { tags: [] };
              const set = (v: Partial<Answer>) => setPeople({ ...people, [o.id]: { ...p, ...v } });
              return (
                <li key={o.id} className="rounded-[8px] border border-hairline p-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={o.givenName} url={o.photo} size={36} />
                    <span className="flex-1 t-strong">{o.givenName}</span>
                    {isComplete(p) && <Check size={18} weight="bold" className="text-brand-600" aria-label="Done" />}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2" role="group" aria-label={`Did ${o.givenName} show up?`}>
                    {[{ v: true, l: "Showed up" }, { v: false, l: "Didn't show" }].map((x) => (
                      <button key={x.l} type="button" aria-pressed={p.showed === x.v} onClick={() => set({ showed: x.v, ...(x.v ? {} : { rating: undefined, tags: [] }) })}
                        className={cn("min-h-11 rounded-[8px] t-label", p.showed === x.v ? "border-[1.5px] border-brand-600 bg-brand-50 text-brand-800" : "border border-field bg-surface")}>{x.l}</button>
                    ))}
                  </div>
                  {p.showed && (
                    <>
                      <RatingTiles small value={p.rating} onPick={(r) => set({ rating: r })} label={`Rate ${o.givenName}`} />
                      {p.rating && <TagChips small value={p.tags} onChange={(tags) => set({ tags })} label={`Tags for ${o.givenName}`} />}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="sticky -bottom-6 z-10 -mx-6 mt-4 flex items-center gap-4 border-t border-hairline bg-surface px-6 pb-6 pt-3">
            <Btn onClick={submitGroup} disabled={doneCount < others.length}>Submit</Btn>
            <span className="whitespace-nowrap t-small text-ink-2" aria-live="polite">{doneCount} of {others.length} done</span>
            <Btn variant="tertiary" className="ml-auto" onClick={() => setStep("ask")}>Back</Btn>
          </div>
        </div>
      )}

      {step === "no" && (
        <div>
          <p className="t-label">What happened?</p>
          <div className="mt-3 grid gap-2">
            {OUTCOME_REASONS.filter((r) => !group || r.id !== "no_show").map((r) => <Btn key={r.id} variant="secondary" onClick={() => reason(r.id)}>{group && r.id === "they_cancelled" ? "It was called off" : r.label}</Btn>)}
          </div>
          <Btn variant="tertiary" className="mt-2" onClick={() => setStep("ask")}>Back</Btn>
        </div>
      )}

      {step === "done" && (
        <div>
          {happened ? (
            <div className="flex flex-col items-center py-2 text-center">
              {/* Celebration (motion Layer 8): the check draws itself. Reduced motion falls back to a fade. */}
              <svg width="64" height="64" viewBox="0 0 24 24" aria-hidden className="animate-settle text-success-600">
                <circle cx="12" cy="12" r="11" fill="currentColor" opacity=".14" />
                <path d="M7 12.5l3.2 3L17 9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="check-draw" style={{ animationDelay: "150ms" }} />
              </svg>
              <p className="mt-3 t-heading">{completedN >= 1 && completedN <= ORD.length ? `Nice one! That's your ${ORD[completedN - 1]} meetup.` : "Nice one! Another meetup done."}</p>
            </div>
          ) : (
            <p className="text-ink-2">Nobody is rated for a meetup that didn't happen, and a cancellation is never counted as a no show.</p>
          )}
          <Btn className="mt-6" block onClick={onDone}>Done</Btn>
        </div>
      )}
    </Modal>
  );
}

/** Numbered tiles 1 to 5: a neutral scale that doesn't read as checkboxes (screen review 8). */
function RatingTiles({ onPick, value, small, label }: { onPick: (n: number) => void; value?: number; small?: boolean; label: string }) {
  return (
    <>
      <div className={cn("flex gap-2", small ? "mt-2" : "mt-3")} role="group" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => onPick(n)} aria-label={`${n} out of 5`} aria-pressed={value === n}
            className={cn("grid flex-1 place-items-center rounded-[8px] t-strong transition-[background-color,border-color,transform] duration-150 ease-[var(--ease-out)] active:scale-[0.95]",
              small ? "h-11" : "h-12",
              value === n ? "border-[1.5px] border-brand-600 bg-brand-600 text-white" : "border border-field bg-surface text-ink hover:border-brand-600")}>
            {n}
          </button>
        ))}
      </div>
      {!small && <div className="mt-1 flex justify-between t-caption text-ink-muted"><span>Not great</span><span>Great</span></div>}
    </>
  );
}

function TagChips({ value, onChange, small, label }: { value: TagId[]; onChange: (v: TagId[]) => void; small?: boolean; label: string }) {
  return (
    <div className={cn("flex flex-wrap gap-2", small ? "mt-2" : "mt-2")} role="group" aria-label={label}>
      {TAGS.map((t) => {
        const on = value.includes(t.id);
        return (
          <button key={t.id} type="button" aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== t.id) : [...value, t.id])}
            className={cn("inline-flex min-h-9 items-center gap-1 rounded-full px-3 t-label transition-colors duration-150",
              on ? "border-[1.5px] border-brand-600 bg-brand-50 text-brand-800" : "border border-field bg-surface text-ink hover:border-brand-600")}>
            {on && <Check size={14} weight="bold" aria-hidden />}{t.label}
          </button>
        );
      })}
    </div>
  );
}
