/* Group meetup: details, who's going, join requests, withdrawal and the group chat (PRD S7.1 to S7.5, R27 to R30). */
import { useEffect, useRef, useState } from "react";
import { CalendarBlank, MapPin, Note, UsersThree, PaperPlaneRight, CheckCircle, Clock, Crown, Info } from "@phosphor-icons/react";
import { Avatar, Btn, FieldError, Label, Modal, ScreenHeader, StatusTag, Tag, inputCls } from "@/components/ui";
import { cancelMeetup, markRead, requestJoin, respondJoin, respondMeetup, sendMessage, withdraw } from "@/lib/actions";
import { cn } from "@/lib/cn";
import { threadOf } from "@/lib/model";
import { attendeesOf, distanceKm, distanceLabel, isPast, meetupView, spotsLeft } from "@/lib/rules";
import { Link, navigate, query, usePath } from "@/lib/router";
import { fmtDay, fmtTime, fmtWhen, me as getMe, useStore, userById } from "@/lib/store";
import { toast } from "@/lib/toast";

export function MeetupDetail({ id }: { id: string }) {
  const s = useStore();
  const me = getMe(s)!;
  const path = usePath();
  const from = query(path).get("from") ?? "/meetups";
  const m = s.meetups.find((x) => x.id === id);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinNote, setJoinNote] = useState("");
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelNote, setCancelNote] = useState("");

  useEffect(() => {
    if (m?.type === "one_to_one" && m.connectionId) navigate(`/chats/${m.connectionId}`, { replace: true });
  }, [m]);

  if (!m || m.type !== "group" || m.status === "cancelled") {
    return <><ScreenHeader backTo={from} title="Meetup" /><p className="p-4 text-ink-2">{m?.status === "cancelled" ? "This meetup was cancelled." : "This meetup isn't available."}</p></>;
  }

  const host = userById(s, m.createdBy)!;
  const all = attendeesOf(s, m.id);
  const mine = all.find((a) => a.userId === me.id);
  const isHost = m.createdBy === me.id;
  const inIt = mine?.status === "accepted";
  const past = isPast(m);
  const left = spotsLeft(m, s);
  const goingList = all.filter((a) => a.status === "accepted").sort((a, b) => Number(b.role === "creator") - Number(a.role === "creator"));
  const invited = all.filter((a) => a.status === "invited");
  const requests = all.filter((a) => a.status === "requested");
  const canSeeList = inIt || mine?.status === "invited" || isHost;
  const view = meetupView(m, me.id, s);
  const km = distanceKm(me.area, host.area);

  return (
    <div className="flex min-h-dvh flex-col bg-page">
      <ScreenHeader backTo={from} title={`${m.activity}, ${fmtDay(m.startsAt)}`} sub={isHost ? "You're hosting" : `Hosted by ${host.givenName}`} />
      <div className="mx-auto w-full max-w-[600px] flex-1 px-4 pb-6 pt-4">
        <div className="rounded-[12px] border border-hairline bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {mine?.status === "invited" ? <Tag tone="info">Invited</Tag> : mine?.status === "requested" ? <Tag tone="info" icon={Clock}>Requested</Tag> : <StatusTag status={inIt ? view : past ? "completed" : "scheduled"} />}
            <span className="flex items-center gap-1 t-small text-ink-2"><UsersThree size={16} aria-hidden />{goingList.length} going{!past && m.spots > 0 && ` · ${left === 0 ? "full" : left === 1 ? "1 spot open" : `${left} spots open`}`}</span>
          </div>
          <p className="mt-3 flex items-center gap-2 t-body"><CalendarBlank size={18} aria-hidden className="shrink-0 text-ink-2" />{fmtWhen(m.startsAt)}</p>
          <p className="mt-1 flex items-start gap-2 t-body"><MapPin size={18} aria-hidden className="mt-[3px] shrink-0 text-ink-2" /><span>{m.place}{!isHost && km !== null && <span className="t-small text-ink-2"> · {distanceLabel(km)}</span>}</span></p>
          {m.note && <p className="mt-1 flex items-start gap-2 t-body"><Note size={18} aria-hidden className="mt-[3px] shrink-0 text-ink-2" />{m.note}</p>}
          {!isHost && <p className="mt-3 t-small text-ink-2">Hosted by <Link to={`/people/${host.id}?from=/meetups/${m.id}`} className="font-bold text-brand-600 underline">{host.givenName}</Link></p>}
        </div>

        {/* What I can do */}
        <div className="mt-4">
          {isHost && !past && requests.length > 0 && (
            <section className="rounded-[12px] border border-hairline bg-surface p-4">
              <h2 className="t-heading">Asking to join</h2>
              <ul className="mt-3 grid gap-4">
                {requests.map((a) => {
                  const p = userById(s, a.userId)!;
                  return (
                    <li key={a.userId}>
                      <Link to={`/people/${p.id}?from=/meetups/${m.id}`} className="flex items-center gap-3">
                        <Avatar name={p.givenName} url={p.photo} size={40} />
                        <span className="min-w-0 flex-1"><span className="block t-strong">{p.givenName}</span><span className="block t-small text-ink-2">{p.area}</span></span>
                      </Link>
                      {a.note && <p className="mt-2 rounded-[8px] bg-neutral-100 p-3 t-small">"{a.note}"</p>}
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <Btn onClick={() => {
                          if (!respondJoin(m.id, a.userId, true)) { toast("This meetup is full. Add a spot or decline.", "info"); return; }
                          toast(spotsLeft(m, s) - 1 <= 0 ? `${p.givenName} is in. Your meetup is full!` : `${p.givenName} is in.`);
                        }}>Accept</Btn>
                        <Btn variant="secondary" onClick={() => { respondJoin(m.id, a.userId, false); toast(`Declined. ${p.givenName} isn't told why.`, "neutral"); }}>Decline</Btn>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {mine?.status === "invited" && !past && (
            <div className="rounded-[12px] border border-hairline bg-surface p-4">
              <p className="t-strong">{host.givenName} invited you. Are you in?</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <Btn onClick={() => { respondMeetup(m.id, true); toast(`You're on for ${fmtDay(m.startsAt)} at ${fmtTime(m.startsAt)}.`); }}>Accept</Btn>
                <Btn variant="secondary" onClick={() => { respondMeetup(m.id, false); toast("Declined", "neutral"); navigate("/meetups"); }}>Decline</Btn>
              </div>
            </div>
          )}

          {!isHost && !past && (!mine || mine.status === "withdrawn" || mine.status === "declined") && (
            mine?.status === "declined" && mine.role === "joiner" ? (
              <p className="flex items-start gap-2 rounded-[8px] bg-neutral-100 p-3 t-small text-ink-2"><Info size={20} className="shrink-0" aria-hidden />{host.givenName} couldn't add you this time.</p>
            ) : left > 0 ? (
              <Btn block onClick={() => setJoinOpen(true)}>Ask to join</Btn>
            ) : (
              <p className="flex items-start gap-2 rounded-[8px] bg-neutral-100 p-3 t-small text-ink-2"><Info size={20} className="shrink-0" aria-hidden />This meetup is full, so it isn't taking requests.</p>
            )
          )}

          {mine?.status === "requested" && !past && (
            <div className="rounded-[12px] border border-hairline bg-surface p-4">
              <p className="flex items-center gap-2 t-strong"><Clock size={20} aria-hidden />Request sent</p>
              <p className="mt-1 t-small text-ink-2">{host.givenName} decides who joins. You'll see it here and in Meetups.</p>
              <Btn variant="tertiary" onClick={() => { withdraw(m.id); toast("Request withdrawn", "neutral"); }}>Withdraw request</Btn>
            </div>
          )}

          {inIt && !isHost && !past && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-center gap-2 t-small font-bold text-success-800"><CheckCircle size={20} weight="fill" className="text-success-600" aria-hidden />You're going</p>
              <Btn variant="destructive" onClick={() => setWithdrawOpen(true)}>Withdraw</Btn>
            </div>
          )}
        </div>

        {/* Who's going */}
        {canSeeList && (
          <section className="mt-6">
            <h2 className="t-label text-ink-2">Who's going</h2>
            <ul className="mt-2 divide-y divide-hairline rounded-[12px] border border-hairline bg-surface">
              {goingList.map((a) => {
                const p = userById(s, a.userId)!;
                return (
                  <li key={a.userId}>
                    <Link to={a.userId === me.id ? "/profile" : `/people/${p.id}?from=/meetups/${m.id}`} className="flex min-h-14 items-center gap-3 px-4 py-2">
                      <Avatar name={p.givenName} url={p.photo} size={36} />
                      <span className="flex-1 t-strong">{a.userId === me.id ? "You" : p.givenName}</span>
                      {a.role === "creator" && <Tag tone="neutral" icon={Crown}>Host</Tag>}
                    </Link>
                  </li>
                );
              })}
              {invited.map((a) => {
                const p = userById(s, a.userId)!;
                return (
                  <li key={a.userId} className="flex min-h-14 items-center gap-3 px-4 py-2 text-ink-2">
                    <Avatar name={p.givenName} url={p.photo} size={36} />
                    <span className="flex-1">{a.userId === me.id ? "You" : p.givenName}</span>
                    <span className="t-small">Hasn't replied yet</span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {isHost && !past && (
          <Btn variant="destructive" className="mt-6" onClick={() => setCancelOpen(true)}>Cancel meetup</Btn>
        )}

        {inIt && <GroupThread meetupId={m.id} />}
        {!inIt && !isHost && <p className="mt-6 t-small text-ink-2">The group chat opens for you once you're going. Joining a group doesn't connect you with anyone one to one.</p>}
      </div>

      <Modal open={joinOpen} onOpenChange={setJoinOpen} title={`Ask to join ${host.givenName}'s ${m.activity.toLowerCase()}`} description={`${host.givenName} decides who joins. Joining doesn't connect you one to one.`}>
        <Label htmlFor="j-note">Note (optional)</Label>
        <textarea id="j-note" rows={3} maxLength={200} className={cn(inputCls(), "min-h-24")} value={joinNote} onChange={(e) => setJoinNote(e.target.value)} placeholder="For example: I'm intermediate and free that evening." />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Btn onClick={() => { requestJoin(m.id, joinNote); setJoinOpen(false); setJoinNote(""); toast("Request sent"); }}>Send request</Btn>
          <Btn variant="secondary" onClick={() => setJoinOpen(false)}>Not now</Btn>
        </div>
      </Modal>

      <Modal open={withdrawOpen} onOpenChange={setWithdrawOpen} title={`Withdraw from ${fmtDay(m.startsAt)}'s ${m.activity.toLowerCase()}?`}
        description={`Your spot reopens for someone else, and you'll leave the group chat. It's recorded like a cancellation, so try to give ${host.givenName} notice.`}>
        <div className="grid grid-cols-2 gap-3">
          <Btn variant="danger-fill" onClick={() => { withdraw(m.id); setWithdrawOpen(false); toast("You've withdrawn. Your spot is open again.", "neutral"); navigate("/meetups"); }}>Withdraw</Btn>
          <Btn variant="secondary" onClick={() => setWithdrawOpen(false)}>Stay in</Btn>
        </div>
      </Modal>

      <Modal open={cancelOpen} onOpenChange={setCancelOpen} title={`Cancel ${fmtDay(m.startsAt)}'s meetup?`} description="Everyone going will be told, and the meetup and its group chat disappear. You can add a note.">
        <Label htmlFor="gc-note">Note to the group (optional)</Label>
        <textarea id="gc-note" rows={3} maxLength={200} className={cn(inputCls(), "min-h-24")} value={cancelNote} onChange={(e) => setCancelNote(e.target.value)} />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Btn variant="danger-fill" onClick={() => { cancelMeetup(m.id, cancelNote); setCancelOpen(false); toast("Meetup cancelled", "neutral"); navigate("/meetups"); }}>Cancel meetup</Btn>
          <Btn variant="secondary" onClick={() => setCancelOpen(false)}>Keep it</Btn>
        </div>
      </Modal>
    </div>
  );
}

function GroupThread({ meetupId }: { meetupId: string }) {
  const s = useStore();
  const me = getMe(s)!;
  const thread = threadOf.meetup(meetupId);
  const msgs = s.messages.filter((x) => x.thread === thread);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { markRead(thread); }, [thread, msgs.length]);
  const seen = useRef(msgs.length);
  useEffect(() => { if (msgs.length > seen.current) endRef.current?.scrollIntoView({ block: "end" }); seen.current = msgs.length; }, [msgs.length]);

  const send = () => {
    if (!text.trim()) { setErr("Type a message first."); return; }
    setErr(""); sendMessage(thread, text); setText("");
  };

  return (
    <section className="mt-8" aria-labelledby="gt-h">
      <h2 id="gt-h" className="t-heading">Group chat</h2>
      <p className="t-small text-ink-2">Only people going can see this.</p>
      <div className="mt-3 space-y-3">
        {msgs.length === 0 && <p className="py-4 text-center t-small text-ink-2">No messages yet. Say hi to the group.</p>}
        {msgs.map((x) => {
          const mine = x.from === me.id;
          const p = userById(s, x.from);
          return (
            <div key={x.id} className={cn("flex gap-2", mine ? "justify-end" : "justify-start")}>
              {!mine && <Avatar name={p?.givenName ?? "?"} url={p?.photo} size={28} />}
              <div className={cn("max-w-[78%] rounded-[12px] px-4 py-2", mine ? "bg-brand-600 text-white" : "border border-hairline bg-surface")}>
                {!mine && <p className="t-caption font-bold text-ink-2">{p?.givenName}</p>}
                <p className="whitespace-pre-wrap break-words">{x.body}</p>
                <p className={cn("mt-1 t-caption", mine ? "text-brand-100" : "text-ink-muted")}>{fmtDay(x.at).slice(0, 3)} {fmtTime(x.at)}</p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} style={{ scrollMarginBottom: 120 }} />
      </div>
      <form className="sticky bottom-0 mt-4 flex items-end gap-2 border-t border-hairline bg-page pb-[calc(var(--sab)+8px)] pt-3" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <label htmlFor="gmsg" className="sr-only">Message the group</label>
        <textarea id="gmsg" rows={1} value={text} onChange={(e) => { setText(e.target.value); if (err) setErr(""); }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Message the group" className="max-h-32 min-h-11 flex-1 resize-none rounded-[8px] border border-field bg-surface px-3 py-2" />
        <Btn type="submit" aria-label="Send" className="w-11 shrink-0 px-0"><PaperPlaneRight size={20} weight="fill" aria-hidden /></Btn>
      </form>
      <FieldError>{err}</FieldError>
    </section>
  );
}
