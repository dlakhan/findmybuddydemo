/* One to one meetup card shown inline in a chat and in Meetups (PRD S6.1 to S6.3). */
import { useEffect, useRef, useState } from "react";
import { CalendarBlank, MapPin, Note } from "@phosphor-icons/react";
import { Btn, Chip, DateTimeFields, FieldError, Label, Modal, StatusTag, checkWhen, inputCls } from "@/components/ui";
import { cancelMeetup, proposeMeetup, respondMeetup } from "@/lib/actions";
import { cn } from "@/lib/cn";
import type { Meetup, User } from "@/lib/model";
import { attendeesOf, meetupView } from "@/lib/rules";
import { fmtDay, fmtTime, fmtWhen, me as getMe, useStore, userById } from "@/lib/store";
import { toast } from "@/lib/toast";

export function MeetupCard({ m, showWith = false }: { m: Meetup; showWith?: boolean }) {
  const s = useStore();
  const me = getMe(s)!;
  const other = userById(s, attendeesOf(s, m.id).find((a) => a.userId !== me.id)?.userId);
  const name = other?.givenName ?? "them";
  const view = meetupView(m, me.id, s);
  const mine = attendeesOf(s, m.id).find((a) => a.userId === me.id);
  const mustRespond = view === "proposed" && mine?.status === "invited";
  const future = new Date(m.startsAt).getTime() > Date.now();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [note, setNote] = useState("");

  // Celebration 1: the card settles in and the check draws itself when a meetup becomes scheduled while you watch
  const prev = useRef(view);
  const [celebrate, setCelebrate] = useState(false);
  useEffect(() => {
    if (prev.current === "proposed" && view === "scheduled") setCelebrate(true);
    prev.current = view;
  }, [view]);

  return (
    <div className={cn("rounded-[12px] border border-hairline bg-surface p-4", celebrate && "animate-settle")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StatusTag status={view} />
        {showWith && <span className="t-caption text-ink-muted">with {name}</span>}
      </div>
      <p className="mt-2 t-strong">{m.activity}</p>
      <p className="mt-1 flex items-center gap-2 t-small text-ink-2"><CalendarBlank size={16} aria-hidden />{fmtWhen(m.startsAt)}</p>
      <p className="flex items-center gap-2 t-small text-ink-2"><MapPin size={16} aria-hidden />{m.place}</p>
      {m.note && <p className="mt-1 flex items-start gap-2 t-small text-ink-2"><Note size={16} className="mt-[2px] shrink-0" aria-hidden />{m.note}</p>}
      {m.status === "cancelled" && (
        <p className="mt-2 rounded-[8px] bg-neutral-100 p-2 t-small text-ink-2">
          {m.cancelledByDisconnect ? "Cancelled because you're no longer connected." : m.cancelledBy === me.id ? `You cancelled${m.cancelNote ? `: "${m.cancelNote}"` : "."}` : `${name} cancelled${m.cancelNote ? `: "${m.cancelNote}"` : "."}`}
        </p>
      )}
      {view === "scheduled" && celebrate && (
        <p className="mt-3 flex items-center gap-2 t-small font-bold text-success-800">
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden className="text-success-600"><circle cx="12" cy="12" r="10" fill="currentColor" opacity=".15" /><path d="M7 12.5l3.2 3L17 9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="check-draw" /></svg>
          You're on for {fmtDay(m.startsAt)} at {fmtTime(m.startsAt)}.
        </p>
      )}
      {view === "proposed" && m.createdBy === me.id && <p className="mt-3 t-small text-ink-2">Waiting for {name} to reply.</p>}
      {view === "declined" && m.createdBy === me.id && <p className="mt-3 t-small text-ink-2">{name} can't make this one. You can propose another time.</p>}

      {mustRespond && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {(
            <>
              <Btn onClick={() => {
                respondMeetup(m.id, true);
                toast(`You're on for ${fmtDay(m.startsAt)} at ${fmtTime(m.startsAt)}. ${m.place}.`);
              }}>Accept</Btn>
              <Btn variant="secondary" onClick={() => { respondMeetup(m.id, false); toast("Declined. You can still chat and propose another time.", "neutral"); }}>Decline</Btn>
            </>
          )}
        </div>
      )}
      {/* A quiet link, so impulse cancels are less likely (screen review 7) */}
      {!mustRespond && (view === "scheduled" || (view === "proposed" && m.createdBy === me.id)) && future && (
        <button type="button" onClick={() => setCancelOpen(true)} className="mt-3 inline-flex min-h-11 items-center t-small text-ink-2 underline underline-offset-4 hover:text-danger-600">Cancel meetup</button>
      )}

      <Modal open={cancelOpen} onOpenChange={setCancelOpen} title={`Cancel ${fmtDay(m.startsAt)}'s meetup?`} description={`${name} will be told. You can add a note.`}>
        <Label htmlFor={`cn-${m.id}`}>Note to {name} (optional)</Label>
        <textarea id={`cn-${m.id}`} rows={3} maxLength={200} className={cn(inputCls(), "min-h-24")} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Sorry, something came up at work." />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Btn variant="danger-fill" onClick={() => { cancelMeetup(m.id, note); setCancelOpen(false); toast("Meetup cancelled", "neutral"); }}>Cancel meetup</Btn>
          <Btn variant="secondary" onClick={() => setCancelOpen(false)}>Keep it</Btn>
        </div>
      </Modal>
    </div>
  );
}

/** Propose a specific plan. The product never suggests venues, times or activities (PRD S6.1). */
export function ProposeMeetup({ open, onOpenChange, connectionId, other, me, initial }: {
  open: boolean; onOpenChange: (o: boolean) => void; connectionId: string; other: User; me: User; initial?: { activity?: string; place?: string };
}) {
  const shared = me.activities.filter((a) => other.activities.some((b) => b.name.toLowerCase() === a.name.toLowerCase())).map((a) => a.name);
  const options = shared.length ? shared : me.activities.map((a) => a.name);
  const [activity, setActivity] = useState(initial?.activity && options.includes(initial.activity) ? initial.activity : options[0] ?? "");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [place, setPlace] = useState(initial?.place ?? "");
  const [note, setNote] = useState("");
  const [errs, setErrs] = useState<{ activity?: string; when?: string; place?: string }>({});

  const submit = () => {
    const e: typeof errs = {};
    if (!activity.trim()) e.activity = "Choose what you'll do.";
    const w = checkWhen(date, time);
    if ("error" in w) e.when = w.error;
    if (!place.trim()) e.place = "Add where you'll meet, for example a community centre or park.";
    setErrs(e);
    if (Object.keys(e).length) return;
    proposeMeetup(connectionId, { activity, startsAt: (w as { iso: string }).iso, place: place.trim(), note: note.trim() });
    toast(`Meetup proposed. ${other.givenName} can accept or decline.`);
    setDate(""); setTime(""); setPlace(""); setNote("");
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={`Propose a meetup with ${other.givenName}`}>
      <form className="grid gap-4" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
        {options.length > 1 ? (
          <fieldset><legend className="mb-1 t-label">Activity</legend>
            <div className="flex flex-wrap gap-x-2">{options.map((o) => <Chip key={o} selected={activity === o} onClick={() => setActivity(o)}>{o}</Chip>)}</div>
            <FieldError>{errs.activity}</FieldError></fieldset>
        ) : <p className="t-small text-ink-2"><span className="t-label text-ink">Activity:</span> {activity}</p>}
        <div><DateTimeFields idPrefix="pm" date={date} time={time} onDate={setDate} onTime={setTime} invalid={!!errs.when} /><FieldError>{errs.when}</FieldError></div>
        <div><Label htmlFor="pm-place">Place</Label><input id="pm-place" className={inputCls(!!errs.place)} value={place} onChange={(e) => setPlace(e.target.value)} placeholder="For example: Hillcrest Centre, court 3" /><FieldError>{errs.place}</FieldError></div>
        <div><Label htmlFor="pm-note">Note (optional)</Label><textarea id="pm-note" rows={2} maxLength={200} className={cn(inputCls(), "min-h-20")} value={note} onChange={(e) => setNote(e.target.value)} /></div>
        <Btn type="submit" block>Propose meetup</Btn>
      </form>
    </Modal>
  );
}
