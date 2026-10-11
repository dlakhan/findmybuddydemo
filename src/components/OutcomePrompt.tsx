/* Mandatory, blocking post meetup prompt (PRD S9.1 to S9.3, R21, R31). Always asks whether it happened first.
   It has to be fast: one question, then a rating or a reason. */
import { useState } from "react";
import { Star, CheckCircle } from "@phosphor-icons/react";
import { Avatar, Btn, FieldError, Modal, ReliabilitySignal } from "@/components/ui";
import { submitGroupOutcome, submitOutcome } from "@/lib/actions";
import { cn } from "@/lib/cn";
import { OUTCOME_REASONS, type OutcomeReason } from "@/lib/data";
import type { Meetup } from "@/lib/model";
import { attendeesOf, reliabilityOf } from "@/lib/rules";
import { fmtDay, getState, me as getMe, useStore, userById } from "@/lib/store";

const ORD = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth", "eleventh", "twelfth"];

export function OutcomePrompt({ meetup, onDone }: { meetup: Meetup; onDone: () => void }) {
  const s = useStore();
  const me = getMe(s)!;
  const others = attendeesOf(s, meetup.id).filter((a) => a.status === "accepted" && a.userId !== me.id).map((a) => userById(s, a.userId)!);
  const group = meetup.type === "group";
  const [step, setStep] = useState<"ask" | "yes" | "no" | "done">("ask");
  const [happened, setHappened] = useState(false);
  const [people, setPeople] = useState<Record<string, { showed?: boolean; rating?: number }>>({});
  const [err, setErr] = useState("");
  const [completedN, setCompletedN] = useState(0);

  const when = `${fmtDay(meetup.startsAt)} at ${meetup.place}`;
  const title = step === "done" ? "Thanks, that's recorded"
    : group ? `Did ${fmtDay(meetup.startsAt)}'s ${meetup.activity.toLowerCase()} meetup happen?`
    : `Did your ${meetup.activity.toLowerCase()} meetup with ${others[0]?.givenName ?? "them"} happen?`;

  const finish = (yes: boolean) => {
    const st = getState();
    setCompletedN(new Set(st.outcomes.filter((o) => o.reporter === me.id && o.happened).map((o) => o.meetupId)).size);
    setHappened(yes);
    setStep("done");
  };

  const rate1 = (rating: number) => { submitOutcome(meetup.id, others[0]!.id, { happened: true, rating }); finish(true); };
  const reason = (r: OutcomeReason) => {
    if (group) submitGroupOutcome(meetup.id, { happened: false, reason: r, subjects: others.map((o) => o.id) });
    else submitOutcome(meetup.id, others[0]!.id, { happened: false, reason: r });
    finish(false);
  };
  const submitGroup = () => {
    const missing = others.find((o) => people[o.id]?.showed === undefined || (people[o.id]?.showed && !people[o.id]?.rating));
    if (missing) { setErr(`Mark whether ${missing.givenName} showed up${people[missing.id]?.showed ? ", and give a rating" : ""}.`); return; }
    submitGroupOutcome(meetup.id, { happened: true, people: Object.fromEntries(others.map((o) => [o.id, { showed: !!people[o.id]!.showed, rating: people[o.id]!.rating }])) });
    finish(true);
  };

  return (
    <Modal open dismissable={false} onOpenChange={() => {}} title={title} description={step === "done" ? undefined : when}>
      {step === "ask" && (
        <div className="grid grid-cols-2 gap-3">
          <Btn onClick={() => setStep("yes")}>Yes, it happened</Btn>
          <Btn variant="secondary" onClick={() => setStep("no")}>No</Btn>
        </div>
      )}

      {step === "yes" && !group && (
        <div>
          <p className="t-label">How was it with {others[0]?.givenName}? Tap a rating.</p>
          <Stars onPick={rate1} />
          <Btn variant="tertiary" className="mt-2" onClick={() => setStep("ask")}>Back</Btn>
        </div>
      )}

      {step === "yes" && group && (
        <div>
          <p className="t-label">Who showed up? Rate everyone who did.</p>
          <ul className="mt-3 grid gap-4">
            {others.map((o) => {
              const p = people[o.id] ?? {};
              const set = (v: { showed?: boolean; rating?: number }) => { setPeople({ ...people, [o.id]: { ...p, ...v } }); setErr(""); };
              return (
                <li key={o.id} className="rounded-[8px] border border-hairline p-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={o.givenName} url={o.photo} size={36} />
                    <span className="flex-1 t-strong">{o.givenName}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2" role="group" aria-label={`Did ${o.givenName} show up?`}>
                    {[{ v: true, l: "Showed up" }, { v: false, l: "Didn't show" }].map((x) => (
                      <button key={x.l} type="button" aria-pressed={p.showed === x.v} onClick={() => set({ showed: x.v, rating: x.v ? p.rating : undefined })}
                        className={cn("min-h-11 rounded-[8px] t-label", p.showed === x.v ? "border-[1.5px] border-brand-600 bg-brand-50 text-brand-800" : "border border-field bg-surface")}>{x.l}</button>
                    ))}
                  </div>
                  {p.showed && <Stars small value={p.rating} onPick={(r) => set({ rating: r })} label={`Rate ${o.givenName}`} />}
                </li>
              );
            })}
          </ul>
          <FieldError>{err}</FieldError>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Btn onClick={submitGroup}>Submit</Btn>
            <Btn variant="tertiary" onClick={() => setStep("ask")}>Back</Btn>
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
            <>
              <p className="flex items-center gap-2 t-strong text-success-800"><CheckCircle size={22} weight="fill" className="text-success-600" aria-hidden />
                {completedN <= ORD.length ? `Nice one! That's your ${ORD[completedN - 1]} meetup.` : "Nice one! Another meetup done."}</p>
              {/* Celebration 2: the new attendance mark fills in */}
              <ul className="mt-4 grid gap-3">
                {others.filter((o) => group ? people[o.id]?.showed : true).map((o) => (
                  <li key={o.id} className="rounded-[8px] bg-page p-3">
                    <p className="t-label">{o.givenName}</p>
                    <ReliabilitySignal r={reliabilityOf(o.id, s)} animateFirst />
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-ink-2">Nobody is rated for a meetup that didn't happen, and a cancellation is never counted as a no show.</p>
          )}
          <Btn className="mt-6" block onClick={onDone}>Done</Btn>
        </div>
      )}
    </Modal>
  );
}

function Stars({ onPick, value, small, label = "Rating from 1 to 5" }: { onPick: (n: number) => void; value?: number; small?: boolean; label?: string }) {
  return (
    <>
      <div className={cn("flex gap-2", small ? "mt-2" : "mt-3")} role="group" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => onPick(n)} aria-label={`${n} out of 5`} aria-pressed={value === n}
            className={cn("grid place-items-center rounded-[8px] border text-marigold-800 transition-colors duration-150 hover:bg-marigold-100", small ? "h-11 w-11" : "h-12 w-12",
              value !== undefined && n <= value ? "border-marigold-800 bg-marigold-100" : "border-field")}>
            <Star size={small ? 20 : 24} weight={value !== undefined && n <= value ? "fill" : "regular"} aria-hidden />
          </button>
        ))}
      </div>
      {!small && <div className="mt-1 flex max-w-[272px] justify-between t-caption text-ink-muted"><span>1 · Not great</span><span>5 · Great</span></div>}
    </>
  );
}
