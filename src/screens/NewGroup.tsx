/* New group: what, when and where first, then who's coming, note last (PRD S7.1, S7.2, R27, R28; screen review 9 and 10). */
import { useState } from "react";
import { Minus, Plus } from "@phosphor-icons/react";
import { Avatar, Btn, Chip, DateTimeFields, FieldError, Label, PinnedBar, PinnedSpacer, ScreenHeader, checkWhen, inputCls } from "@/components/ui";
import { createGroup } from "@/lib/actions";
import { cn } from "@/lib/cn";
import { GROUP_LEVELS, type GroupLevel } from "@/lib/data";
import { levelIn, otherOf, relationFor } from "@/lib/rules";
import { navigate, query, usePath } from "@/lib/router";
import { me as getMe, useStore, userById } from "@/lib/store";
import { toast } from "@/lib/toast";

const MAX_SPOTS = 10;

export function NewGroup() {
  const s = useStore();
  const me = getMe(s)!;
  const connections = s.connections
    .filter((c) => (c.from === me.id || c.to === me.id) && c.status === "accepted" && relationFor(s, me.id, otherOf(c, me.id)).kind === "connected")
    .map((c) => userById(s, otherOf(c, me.id))!)
    .filter(Boolean);
  // "Plan again" from a past group: same activity, place and people (screen review 7)
  const againId = query(usePath()).get("again");
  const again = againId ? s.meetups.find((m) => m.id === againId) : undefined;
  const againPeople = again ? s.attendees.filter((a) => a.meetupId === again.id && a.status === "accepted" && a.userId !== me.id).map((a) => a.userId).filter((u) => connections.some((c) => c.id === u)) : [];

  const acts = me.activities.map((a) => a.name);
  const startAct = again && acts.includes(again.activity) ? again.activity : acts[0] ?? "";
  const [activity, setActivityRaw] = useState(startAct);
  const [level, setLevel] = useState<GroupLevel>(again?.level ?? levelIn(me, startAct) ?? "all");
  const [levelTouched, setLevelTouched] = useState(!!again?.level);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [place, setPlace] = useState(again?.place ?? "");
  const [note, setNote] = useState("");
  const [invite, setInvite] = useState<string[]>(againPeople);
  const [spots, setSpots] = useState(again ? Math.min(MAX_SPOTS, Math.max(again.spots, againPeople.length ? 0 : 1)) : 1);
  const [errs, setErrs] = useState<{ activity?: string; when?: string; place?: string; who?: string }>({});

  // The level defaults to the host's own level for the chosen activity until they pick one
  const setActivity = (a: string) => { setActivityRaw(a); if (!levelTouched) setLevel(levelIn(me, a) ?? "all"); };

  const submit = () => {
    const e: typeof errs = {};
    if (!activity) e.activity = "Choose an activity. Add one to your profile first if it's missing.";
    const w = checkWhen(date, time);
    if ("error" in w) e.when = w.error;
    if (!place.trim()) e.place = "Add where you'll meet, for example the court or trailhead.";
    if (!invite.length && spots < 1) e.who = "Invite at least one connection or open at least one spot.";
    setErrs(e);
    if (Object.keys(e).length) return;
    const id = createGroup({ activity, startsAt: (w as { iso: string }).iso, place: place.trim(), note: note.trim(), spots, invite, level });
    toast(spots > 0 ? "Your meetup is on. People nearby who play can now ask to join." : "Your meetup is on. Invites sent.");
    navigate(`/meetups/${id}`, { replace: true });
  };

  const total = 1 + invite.length + spots;
  const parts = ["you", invite.length ? `${invite.length} invited` : "", spots ? `${spots} open ${spots === 1 ? "spot" : "spots"}` : ""].filter(Boolean);

  return (
    <div className="min-h-dvh bg-page">
      <ScreenHeader backTo="/meetups" title="New group" />
      <form id="new-group" className="mx-auto grid max-w-[600px] gap-5 px-4 pt-5" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <p className="t-small text-ink-2">Post a plan, invite people you know, and open spots for people nearby.</p>
        <fieldset>
          <legend className="mb-1 t-label">Activity</legend>
          <div className="flex flex-wrap gap-x-2">{acts.map((a) => <Chip key={a} selected={activity === a} onClick={() => setActivity(a)}>{a}</Chip>)}</div>
          <FieldError>{errs.activity}</FieldError>
        </fieldset>
        <fieldset>
          <legend className="mb-1 t-label">Level</legend>
          <div className="flex flex-wrap gap-x-2">
            {GROUP_LEVELS.map((l) => <Chip key={l.id} selected={level === l.id} onClick={() => { setLevel(l.id); setLevelTouched(true); }}>{l.label}</Chip>)}
          </div>
        </fieldset>
        <div><DateTimeFields idPrefix="g" date={date} time={time} onDate={setDate} onTime={setTime} invalid={!!errs.when} /><FieldError>{errs.when}</FieldError></div>
        <div><Label htmlFor="g-place">Place</Label><input id="g-place" className={inputCls(!!errs.place)} value={place} onChange={(e) => setPlace(e.target.value)} placeholder="For example: Queen's Park Arena, court 2" /><FieldError>{errs.place}</FieldError></div>

        <section aria-labelledby="who-h" className="grid gap-4">
          <h2 id="who-h" className="t-heading">Who's coming</h2>
          <div>
            <p className="t-label" id="spots-l">Open spots for people nearby</p>
            <p className="mb-2 t-small text-ink-2">People who play {activity.toLowerCase() || "this"} near you will see it in their matches and can ask to join. You decide who joins.</p>
            <div className="flex items-center gap-3" role="group" aria-labelledby="spots-l">
              <Btn variant="secondary" className="w-11 px-0" aria-label="One fewer spot" disabled={spots === 0} onClick={() => setSpots(Math.max(0, spots - 1))}><Minus size={20} aria-hidden /></Btn>
              <span className="w-10 text-center t-heading" aria-live="polite">{spots}</span>
              <Btn variant="secondary" className="w-11 px-0" aria-label="One more spot" disabled={spots >= MAX_SPOTS} onClick={() => setSpots(Math.min(MAX_SPOTS, spots + 1))}><Plus size={20} aria-hidden /></Btn>
            </div>
          </div>
          <fieldset>
            <legend className="mb-1 t-label">Invite your connections</legend>
            <p className="mb-2 t-small text-ink-2">Each person accepts or declines on their own.</p>
            {connections.length === 0 ? <p className="t-small text-ink-2">You don't have any connections yet. Open spots above so people nearby can ask to join.</p> : (
              <ul className="grid gap-2">
                {connections.map((u) => {
                  const on = invite.includes(u.id);
                  return (
                    <li key={u.id}>
                      <label className={cn("flex min-h-12 cursor-pointer items-center gap-3 rounded-[8px] border bg-surface px-3", on ? "border-[1.5px] border-brand-600 bg-brand-50" : "border-hairline")}>
                        <input type="checkbox" className="h-5 w-5 accent-[var(--color-brand-600)]" checked={on} onChange={() => setInvite(on ? invite.filter((x) => x !== u.id) : [...invite, u.id])} />
                        <Avatar name={u.givenName} url={u.photo} size={32} />
                        <span className="t-strong">{u.givenName}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </fieldset>
          <FieldError>{errs.who}</FieldError>
        </section>

        <div><Label htmlFor="g-note">Note (optional)</Label><textarea id="g-note" rows={2} maxLength={200} className={cn(inputCls(), "min-h-20")} value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: doubles, court is paid for, split four ways" /></div>
        <PinnedSpacer h={112} />
      </form>
      <PinnedBar>
        <p className="mb-2 text-center t-small text-ink-2" aria-live="polite"><span className="font-bold text-ink">Group of {total}:</span> {parts.join(", ")}</p>
        <Btn type="submit" form="new-group" block>Post meetup</Btn>
      </PinnedBar>
    </div>
  );
}
