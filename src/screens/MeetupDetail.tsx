/* Group meetup: Details and Chat tabs, who's going with level and reliability, join requests the host can judge,
   withdrawal and a quiet cancel (PRD S7.1 to S7.5, R27 to R30; screen review 10). */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { CalendarBlank, MapPin, Note, UsersThree, PaperPlaneRight, CheckCircle, Clock, Crown, Info, Gauge, Sparkle } from "@phosphor-icons/react";
import { Avatar, Btn, FieldError, Label, Modal, PinnedBar, PinnedSpacer, ReliabilitySignal, ScreenHeader, StatusTag, Tag, inputCls } from "@/components/ui";
import { cancelMeetup, markRead, requestJoin, respondJoin, respondMeetup, sendMessage, withdraw } from "@/lib/actions";
import { cn } from "@/lib/cn";
import { threadOf, type Meetup, type State, type User } from "@/lib/model";
import {
  attendeesOf, distanceKm, distanceLabel, groupLevelLabel, hostLine, hostRecord, isPast, levelIn, levelLabel, meetupView, reliabilityOf, reliabilityView, spotsLeft, tagCounts,
} from "@/lib/rules";
import { Link, navigate, query, usePath } from "@/lib/router";
import { fmtDay, fmtDivider, fmtTime, fmtWhen, me as getMe, useStore, userById } from "@/lib/store";
import { toast } from "@/lib/toast";

/** One line of reliability for compact rows: "4.6 ★ · showed up 8 of 9", or the new member state. */
function ReliabilityShort({ uid, s }: { uid: string; s: State }) {
  const v = reliabilityView(reliabilityOf(uid, s));
  if (v.kind === "new") return <span className="inline-flex items-center gap-1 t-small text-marigold-800"><Sparkle size={14} weight="fill" aria-hidden />New member</span>;
  const r = v.rating ? v.rating.split(" ★ ")[0] : null;
  return (
    <span className="t-small text-ink-2" aria-label={`${v.rating ? `${v.ratingA11y}. ` : ""}${v.line1}`}>
      {r && <><span className="font-bold text-ink">{r}</span> <span className="text-marigold-400" aria-hidden>★</span> · </>}
      {r ? v.line1.replace("Showed up", "showed up") : v.line1}
    </span>
  );
}

function PersonRow({ u, m, s, me, right, muted }: { u: User; m: Meetup; s: State; me: User; right?: ReactNode; muted?: boolean }) {
  const lv = levelIn(u, m.activity);
  return (
    <Link to={u.id === me.id ? "/profile" : `/people/${u.id}?from=/meetups/${m.id}`} className={cn("flex min-h-14 items-center gap-3 px-4 py-2", muted && "text-ink-2")}>
      <Avatar name={u.givenName} url={u.photo} size={40} />
      <span className="min-w-0 flex-1">
        <span className="block t-strong">{u.id === me.id ? "You" : u.givenName}{lv && <span className="font-normal text-ink-2"> · {levelLabel(lv)}</span>}</span>
        {u.id !== me.id && <ReliabilityShort uid={u.id} s={s} />}
      </span>
      {right}
    </Link>
  );
}

export function MeetupDetail({ id }: { id: string }) {
  const s = useStore();
  const me = getMe(s)!;
  const path = usePath();
  const q = query(path);
  const from = q.get("from") ?? "/meetups";
  const m = s.meetups.find((x) => x.id === id);
  const [tab, setTab] = useState<"details" | "chat">(q.get("tab") === "chat" ? "chat" : "details");
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
  const member = inIt || isHost;
  const past = isPast(m);
  const left = spotsLeft(m, s);
  const goingList = all.filter((a) => a.status === "accepted").sort((a, b) => Number(b.role === "creator") - Number(a.role === "creator"));
  const invited = all.filter((a) => a.status === "invited");
  const requests = all.filter((a) => a.status === "requested");
  const view = meetupView(m, me.id, s);
  const km = distanceKm(me.area, host.area);
  const canAsk = !isHost && !past && (!mine || mine.status === "withdrawn") && left > 0;
  const showChat = member && tab === "chat";

  return (
    <div className="flex min-h-dvh flex-col bg-page">
      <ScreenHeader backTo={from} title={`${m.activity}, ${fmtDay(m.startsAt)}`} sub={isHost ? "You're hosting" : `Hosted by ${host.givenName}`} />
      {member && (
        <div role="tablist" aria-label="Meetup" className="sticky top-[calc(var(--sat)+56px)] z-10 border-b border-hairline bg-surface">
          <div className="mx-auto grid max-w-[600px] grid-cols-2">
            {(["details", "chat"] as const).map((t) => (
              <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)}
                className={cn("relative min-h-11 t-label transition-colors duration-150", tab === t ? "text-brand-700" : "text-ink-2")}>
                {t === "details" ? "Details" : "Chat"}
                {tab === t && <span className="absolute inset-x-8 bottom-0 h-[3px] rounded-t-full bg-brand-600" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {showChat ? <GroupThread meetupId={m.id} /> : (
        <div className="mx-auto w-full max-w-[600px] flex-1 px-4 pt-4">
          <div className="rounded-[12px] border border-hairline bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {mine?.status === "invited" ? <Tag tone="info">Invited</Tag>
                : mine?.status === "requested" ? <Tag tone="info" icon={Clock}>Requested</Tag>
                : member ? <StatusTag status={inIt ? view : past ? "completed" : "scheduled"} /> : <span />}
              <span className="flex items-center gap-1 t-small text-ink-2"><UsersThree size={16} aria-hidden />{goingList.length} going{!past && m.spots > 0 && ` · ${left === 0 ? "full" : left === 1 ? "1 spot open" : `${left} spots open`}`}</span>
            </div>
            <p className="mt-3 flex items-center gap-2 t-body"><CalendarBlank size={18} aria-hidden className="shrink-0 text-ink-2" />{fmtWhen(m.startsAt)}</p>
            <p className="mt-1 flex items-start gap-2 t-body"><MapPin size={18} aria-hidden className="mt-[3px] shrink-0 text-ink-2" /><span>{m.place}{!isHost && km !== null && <span className="t-small text-ink-2"> · {distanceLabel(km)}</span>}</span></p>
            {m.level && <p className="mt-1 flex items-center gap-2 t-body"><Gauge size={18} aria-hidden className="shrink-0 text-ink-2" />{groupLevelLabel(m.level)}</p>}
            {m.note && <p className="mt-1 flex items-start gap-2 t-body"><Note size={18} aria-hidden className="mt-[3px] shrink-0 text-ink-2" />{m.note}</p>}
          </div>

          {!isHost && (
            <p className="mt-3 flex items-center gap-2 t-small text-ink-2">
              <Crown size={16} aria-hidden className="shrink-0" />
              {(() => {
                const rec = hostRecord(host.id, s);
                const name = <Link to={`/people/${host.id}?from=/meetups/${m.id}`} className="font-bold text-brand-600 underline underline-offset-2">{host.givenName}</Link>;
                return rec.hosted === 0 ? <span>This is {name}'s first group</span> : <span>{name}{hostLine("", rec)}</span>;
              })()}
            </p>
          )}

          <div className="mt-4 grid gap-4">
            {isHost && !past && requests.length > 0 && (
              <section className="rounded-[12px] border border-hairline bg-surface p-4">
                <h2 className="t-heading">Asking to join</h2>
                <ul className="mt-3 grid gap-5">
                  {requests.map((a) => {
                    const p = userById(s, a.userId)!;
                    const lv = levelIn(p, m.activity);
                    return (
                      <li key={a.userId}>
                        <Link to={`/people/${p.id}?from=/meetups/${m.id}`} className="flex items-center gap-3">
                          <Avatar name={p.givenName} url={p.photo} size={44} />
                          <span className="min-w-0 flex-1">
                            <span className="block t-strong">{p.givenName}</span>
                            <span className="block t-small text-ink-2">{lv ? `${m.activity}, ${levelLabel(lv).toLowerCase()}` : p.area} · {p.area}</span>
                          </span>
                        </Link>
                        <div className="mt-3"><ReliabilitySignal r={reliabilityOf(p.id, s)} tags={tagCounts(p.id, s)} tagMode="top" /></div>
                        {a.note && <p className="mt-3 rounded-[8px] bg-neutral-100 p-3 t-small">"{a.note}"</p>}
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

            {!isHost && !past && mine?.status === "declined" && mine.role === "joiner" && (
              <p className="flex items-start gap-2 rounded-[8px] bg-neutral-100 p-3 t-small text-ink-2"><Info size={20} className="shrink-0" aria-hidden />{host.givenName} couldn't add you this time.</p>
            )}
            {!isHost && !past && (!mine || mine.status === "withdrawn") && left === 0 && (
              <p className="flex items-start gap-2 rounded-[8px] bg-neutral-100 p-3 t-small text-ink-2"><Info size={20} className="shrink-0" aria-hidden />This meetup is full, so it isn't taking requests.</p>
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

            {/* Who's going: everyone can see it, so joiners know who they'd meet (screen review 10) */}
            <section>
              <h2 className="t-label text-ink-2">Who's going</h2>
              <ul className="mt-2 divide-y divide-hairline rounded-[12px] border border-hairline bg-surface">
                {goingList.map((a) => (
                  <li key={a.userId}><PersonRow u={userById(s, a.userId)!} m={m} s={s} me={me} right={a.role === "creator" ? <Tag tone="neutral" icon={Crown}>Host</Tag> : undefined} /></li>
                ))}
                {(member || mine?.status === "invited") && invited.map((a) => (
                  <li key={a.userId}><PersonRow u={userById(s, a.userId)!} m={m} s={s} me={me} muted right={<span className="shrink-0 t-small text-ink-2">Hasn't replied yet</span>} /></li>
                ))}
              </ul>
            </section>

            {!member && <p className="t-small text-ink-2">The group chat opens for you once you're going. Joining a group doesn't connect you with anyone one to one.</p>}
            {isHost && !past && (
              <button type="button" onClick={() => setCancelOpen(true)} className="inline-flex min-h-11 items-center self-start t-small text-ink-2 underline underline-offset-4 hover:text-danger-600">Cancel meetup</button>
            )}
          </div>
          <PinnedSpacer h={canAsk ? 96 : 24} />
        </div>
      )}

      {canAsk && !showChat && (
        <PinnedBar><Btn block onClick={() => setJoinOpen(true)}>Ask to join</Btn></PinnedBar>
      )}

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

/** Group chat tab: fills the screen like the one to one chat, with day dividers and the message box pinned (screen review 10). */
function GroupThread({ meetupId }: { meetupId: string }) {
  const s = useStore();
  const me = getMe(s)!;
  const thread = threadOf.meetup(meetupId);
  const msgs = s.messages.filter((x) => x.thread === thread);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { markRead(thread); }, [thread, msgs.length]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [msgs.length]);

  const send = () => {
    if (!text.trim()) { setErr("Type a message first."); return; }
    setErr(""); sendMessage(thread, text); setText("");
  };

  return (
    <>
      <div className="mx-auto w-full max-w-[600px] flex-1 space-y-3 px-4 py-4">
        <p className="text-center t-caption text-ink-muted">Only people going can see this chat.</p>
        {msgs.length === 0 && <p className="py-8 text-center text-ink-2">No messages yet. Say hi to the group.</p>}
        {msgs.map((x, i) => {
          const mine = x.from === me.id;
          const p = userById(s, x.from);
          const divider = i === 0 || new Date(msgs[i - 1]!.at).toDateString() !== new Date(x.at).toDateString();
          return (
            <div key={x.id}>
              {divider && <p className="my-3 text-center t-caption font-bold text-ink-muted" role="separator">{fmtDivider(x.at)}</p>}
              <div className={cn("flex gap-2", mine ? "justify-end" : "justify-start")}>
                {!mine && <Avatar name={p?.givenName ?? "?"} url={p?.photo} size={28} />}
                <div className={cn("max-w-[78%] rounded-[12px] px-4 py-2", mine ? "bg-brand-600 text-white" : "border border-hairline bg-surface")}>
                  {!mine && <p className="t-caption font-bold text-ink-2">{p?.givenName}</p>}
                  <p className="whitespace-pre-wrap break-words">{x.body}</p>
                  <p className={cn("mt-1 t-caption", mine ? "text-brand-100" : "text-ink-muted")}>{fmtTime(x.at)}</p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} style={{ scrollMarginBottom: 120 }} />
      </div>
      <div className="sticky bottom-0 z-10 border-t border-hairline bg-surface pb-[calc(var(--sab)+8px)] pt-2">
        <form className="mx-auto flex max-w-[600px] items-end gap-2 px-3" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <label htmlFor="gmsg" className="sr-only">Message the group</label>
          <textarea id="gmsg" rows={1} value={text} onChange={(e) => { setText(e.target.value); if (err) setErr(""); }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Message the group" className="max-h-32 min-h-11 flex-1 resize-none rounded-[8px] border border-field bg-surface px-3 py-2" />
          <Btn type="submit" aria-label="Send" className="w-11 shrink-0 px-0"><PaperPlaneRight size={20} weight="fill" aria-hidden /></Btn>
        </form>
        <div className="mx-auto max-w-[600px] px-3"><FieldError>{err}</FieldError></div>
      </div>
    </>
  );
}
