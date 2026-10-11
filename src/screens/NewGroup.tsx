/* Plan a group meetup: invite connections and/or open spots for people nearby (PRD S7.1, S7.2, R27, R28). */
import { useState } from "react";
import { Minus, Plus, Info } from "@phosphor-icons/react";
import { Avatar, Btn, FieldError, Label, ScreenHeader, inputCls } from "@/components/ui";
import { createGroup } from "@/lib/actions";
import { cn } from "@/lib/cn";
import { otherOf, relationFor } from "@/lib/rules";
import { navigate } from "@/lib/router";
import { me as getMe, useStore, userById } from "@/lib/store";
import { toast } from "@/lib/toast";

export function NewGroup() {
  const s = useStore();
  const me = getMe(s)!;
  const connections = s.connections
    .filter((c) => (c.from === me.id || c.to === me.id) && c.status === "accepted" && relationFor(s, me.id, otherOf(c, me.id)).kind === "connected")
    .map((c) => userById(s, otherOf(c, me.id))!)
    .filter(Boolean);
  const [activity, setActivity] = useState(me.activities[0]?.name ?? "");
  const [when, setWhen] = useState("");
  const [place, setPlace] = useState("");
  const [note, setNote] = useState("");
  const [invite, setInvite] = useState<string[]>([]);
  const [spots, setSpots] = useState(1);
  const [errs, setErrs] = useState<{ activity?: string; when?: string; place?: string; who?: string }>({});

  const submit = () => {
    const e: typeof errs = {};
    if (!activity) e.activity = "Choose an activity. Add one to your profile first if it's missing.";
    if (!when) e.when = "Pick a date and time.";
    else if (new Date(when).getTime() <= Date.now()) e.when = "That time has already passed. Pick a time in the future.";
    if (!place.trim()) e.place = "Add where you'll meet, for example the court or trailhead.";
    if (!invite.length && spots < 1) e.who = "Invite at least one connection or open at least one spot.";
    setErrs(e);
    if (Object.keys(e).length) return;
    const id = createGroup({ activity, startsAt: new Date(when).toISOString(), place: place.trim(), note: note.trim(), spots, invite });
    toast(spots > 0 ? "Your meetup is on. People nearby who play can now ask to join." : "Your meetup is on. Invites sent.");
    navigate(`/meetups/${id}`, { replace: true });
  };

  return (
    <div className="min-h-dvh bg-page pb-[calc(var(--sab)+24px)]">
      <ScreenHeader backTo="/meetups" title="Plan a group meetup" />
      <form className="mx-auto grid max-w-[600px] gap-5 px-4 pt-6" noValidate onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <p className="flex items-start gap-2 rounded-[8px] bg-info-50 p-3 t-small text-info-800"><Info size={20} className="shrink-0" aria-hidden />Already have a time and place? Post it, invite people you know, and open spots for people nearby. It's on as soon as you post it.</p>
        <div><Label htmlFor="g-act">Activity</Label>
          <select id="g-act" className={inputCls(!!errs.activity)} value={activity} onChange={(e) => setActivity(e.target.value)}>
            {me.activities.map((a) => <option key={a.name} value={a.name}>{a.name}</option>)}
          </select><FieldError>{errs.activity}</FieldError></div>
        <div><Label htmlFor="g-when">Date and time</Label><input id="g-when" type="datetime-local" className={inputCls(!!errs.when)} value={when} onChange={(e) => setWhen(e.target.value)} /><FieldError>{errs.when}</FieldError></div>
        <div><Label htmlFor="g-place">Place</Label><input id="g-place" className={inputCls(!!errs.place)} value={place} onChange={(e) => setPlace(e.target.value)} placeholder="For example: Queen's Park Arena, court 2" /><FieldError>{errs.place}</FieldError></div>
        <div><Label htmlFor="g-note">Note (optional)</Label><textarea id="g-note" rows={2} maxLength={200} className={cn(inputCls(), "min-h-20")} value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: doubles, court is paid for, split four ways" /></div>

        <fieldset>
          <legend className="mb-1 t-label">Invite your connections</legend>
          <p className="mb-2 t-small text-ink-2">Each person accepts or declines on their own.</p>
          {connections.length === 0 ? <p className="t-small text-ink-2">You don't have any connections yet. Open spots below so people nearby can ask to join.</p> : (
            <ul className="grid gap-2">
              {connections.map((u) => {
                const on = invite.includes(u.id);
                return (
                  <li key={u.id}>
                    <label className={cn("flex min-h-14 cursor-pointer items-center gap-3 rounded-[8px] border bg-surface px-3", on ? "border-[1.5px] border-brand-600 bg-brand-50" : "border-hairline")}>
                      <input type="checkbox" className="h-5 w-5 accent-[var(--color-brand-600)]" checked={on} onChange={() => setInvite(on ? invite.filter((x) => x !== u.id) : [...invite, u.id])} />
                      <Avatar name={u.givenName} url={u.photo} size={36} />
                      <span className="t-strong">{u.givenName}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </fieldset>

        <div>
          <p className="t-label" id="spots-l">Open spots for people nearby</p>
          <p className="mb-2 t-small text-ink-2">People who play {activity.toLowerCase() || "this"} near you will see it in their matches and can ask to join. You decide who joins.</p>
          <div className="flex items-center gap-3" role="group" aria-labelledby="spots-l">
            <Btn variant="secondary" className="w-11 px-0" aria-label="One fewer spot" onClick={() => setSpots(Math.max(0, spots - 1))}><Minus size={20} aria-hidden /></Btn>
            <span className="w-10 text-center t-heading" aria-live="polite">{spots}</span>
            <Btn variant="secondary" className="w-11 px-0" aria-label="One more spot" onClick={() => setSpots(spots + 1)}><Plus size={20} aria-hidden /></Btn>
          </div>
          <FieldError>{errs.who}</FieldError>
        </div>

        <Btn type="submit" block className="mt-2">Post meetup</Btn>
      </form>
    </div>
  );
}
