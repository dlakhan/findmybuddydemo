/* One to one chat with inline meetup cards and Disconnect (PRD S5.1, S6, S8.1, S10.1). */
import { useEffect, useRef, useState } from "react";
import { PaperPlaneRight, CalendarPlus, LinkBreak, Info } from "@phosphor-icons/react";
import { MeetupCard, ProposeMeetup } from "@/components/MeetupCard";
import { Avatar, Btn, FieldError, Modal, ScreenHeader } from "@/components/ui";
import { disconnect, markRead, sendMessage, sharedGroups } from "@/lib/actions";
import { cn } from "@/lib/cn";
import { threadOf } from "@/lib/model";
import { attendeesOf, otherOf } from "@/lib/rules";
import { Link, navigate } from "@/lib/router";
import { fmtDay, fmtTime, me as getMe, useStore, userById } from "@/lib/store";
import { toast } from "@/lib/toast";

export function Thread({ id }: { id: string }) {
  const s = useStore();
  const me = getMe(s)!;
  const c = s.connections.find((x) => x.id === id);
  const other = c ? userById(s, otherOf(c, me.id)) : undefined;
  const thread = threadOf.connection(id);
  const msgs = s.messages.filter((m) => m.thread === thread);
  const pairMeetups = other ? s.meetups.filter((m) => m.type === "one_to_one" && [me.id, other.id].every((u) => attendeesOf(s, m.id).some((a) => a.userId === u))) : [];
  // Upcoming plans plus the two most recent past meetups as context (PRD S10.1)
  const pastOnes = pairMeetups.filter((m) => new Date(m.startsAt).getTime() <= Date.now()).sort((a, b) => b.startsAt.localeCompare(a.startsAt)).slice(0, 2);
  const meetups = pairMeetups.filter((m) => new Date(m.startsAt).getTime() > Date.now() || pastOnes.includes(m));
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [propose, setPropose] = useState(false);
  const [disc, setDisc] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const count = msgs.length + meetups.length;

  useEffect(() => { markRead(thread); }, [thread, msgs.length]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [count]);

  if (!c || !other || (c.from !== me.id && c.to !== me.id) || (c.status !== "accepted" && c.status !== "disconnected")) {
    return <><ScreenHeader backTo="/chats" title="Chat" /><p className="p-4 text-ink-2">This chat isn't available.</p></>;
  }
  const name = other.givenName;
  const readOnly = c.status === "disconnected";

  const send = () => {
    if (!text.trim()) { setErr("Type a message first."); return; }
    if (text.length > 1000) { setErr("Keep messages under 1,000 characters."); return; }
    setErr("");
    sendMessage(thread, text);
    setText("");
  };

  type Item = { at: string; kind: "msg"; v: (typeof msgs)[number] } | { at: string; kind: "meetup"; v: (typeof meetups)[number] };
  const items: Item[] = [
    ...msgs.map((v) => ({ at: v.at, kind: "msg" as const, v })),
    ...meetups.map((v) => ({ at: v.createdAt, kind: "meetup" as const, v })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  return (
    <div className="flex min-h-dvh flex-col bg-page">
      <ScreenHeader backTo="/chats" title={
        <Link to={`/people/${other.id}?from=/chats/${id}`} className="flex items-center gap-2">
          <Avatar name={name} url={other.photo} size={32} /><span className="truncate">{name}</span>
        </Link>
      }>
        {!readOnly && <Btn variant="tertiary" className="px-2 t-label" onClick={() => setDisc(true)}><LinkBreak size={18} aria-hidden />Disconnect</Btn>}
      </ScreenHeader>

      <div className="mx-auto w-full max-w-[600px] flex-1 space-y-3 px-4 py-4">
        {items.length === 0 && <p className="py-8 text-center text-ink-2">You're connected! Say hi and find a time that works.</p>}
        {items.map((it) => it.kind === "msg" ? (
          <div key={it.v.id} className={cn("flex", it.v.from === me.id ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[80%] rounded-[12px] px-4 py-2", it.v.from === me.id ? "bg-brand-600 text-white" : "border border-hairline bg-surface")}>
              <p className="whitespace-pre-wrap break-words">{it.v.body}</p>
              <p className={cn("mt-1 t-caption", it.v.from === me.id ? "text-brand-100" : "text-ink-muted")}>{fmtDay(it.v.at).slice(0, 3)} {fmtTime(it.v.at)}</p>
            </div>
          </div>
        ) : (
          <div key={it.v.id} className="mx-auto max-w-sm"><MeetupCard m={it.v} /></div>
        ))}
        <div ref={endRef} style={{ scrollMarginBottom: 180 }} />
      </div>

      <div className="sticky bottom-0 z-10 border-t border-hairline bg-surface pb-[calc(var(--sab)+8px)] pt-2">
        <div className="mx-auto max-w-[600px] px-3">
          {readOnly ? (
            <p className="flex items-center gap-2 rounded-[8px] bg-neutral-100 p-3 t-small text-ink-2"><Info size={20} aria-hidden className="shrink-0" />This chat is read only because you're no longer connected.</p>
          ) : (
            <>
              <Btn variant="secondary" className="mb-2 min-h-11" onClick={() => setPropose(true)}><CalendarPlus size={20} aria-hidden />Propose meetup</Btn>
              <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
                <label htmlFor="msg" className="sr-only">Message {name}</label>
                <textarea id="msg" rows={1} value={text} onChange={(e) => { setText(e.target.value); if (err) setErr(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder={`Message ${name}`} className="max-h-32 min-h-11 flex-1 resize-none rounded-[8px] border border-field bg-surface px-3 py-2" />
                <Btn type="submit" aria-label="Send" className="w-11 shrink-0 px-0"><PaperPlaneRight size={20} weight="fill" aria-hidden /></Btn>
              </form>
              <FieldError>{err}</FieldError>
            </>
          )}
        </div>
      </div>

      <ProposeMeetup open={propose} onOpenChange={setPropose} connectionId={id} other={other} me={me} />
      {disc && <DisconnectDialog connectionId={id} otherId={other.id} name={name} onClose={() => setDisc(false)} />}
    </div>
  );
}

function DisconnectDialog({ connectionId, otherId, name, onClose }: { connectionId: string; otherId: string; name: string; onClose: () => void }) {
  const s = useStore();
  const me = getMe(s)!;
  const groups = sharedGroups(s, me.id, otherId);
  const [noRerequest, setNoRerequest] = useState(false);
  const [withdrawFrom, setWithdrawFrom] = useState<string[]>([]);
  return (
    <Modal open onOpenChange={(o) => { if (!o) onClose(); }} title={`Disconnect from ${name}?`}
      description={`Your chat stays as history and any meetup you have together is cancelled. It won't count against either of you, and ${name} isn't told.`}>
      {groups.map((m) => (
        <fieldset key={m.id} className="mb-4 rounded-[8px] border border-hairline p-3">
          <legend className="px-1 t-label">You're both going to {m.activity.toLowerCase()} on {fmtDay(m.startsAt)}</legend>
          <p className="t-small text-ink-2">{name} stays in it either way and won't be told.</p>
          {[{ v: false, l: "Stay in it" }, { v: true, l: "Withdraw from it" }].map((o) => (
            <label key={o.l} className="mt-1 flex min-h-11 items-center gap-3">
              <input type="radio" name={`g-${m.id}`} className="h-5 w-5 accent-[var(--color-brand-600)]" checked={withdrawFrom.includes(m.id) === o.v}
                onChange={() => setWithdrawFrom(o.v ? [...withdrawFrom, m.id] : withdrawFrom.filter((x) => x !== m.id))} />
              <span>{o.l}</span>
            </label>
          ))}
        </fieldset>
      ))}
      <label className="flex min-h-11 items-start gap-3">
        <input type="checkbox" className="mt-[2px] h-5 w-5 shrink-0 accent-[var(--color-brand-600)]" checked={noRerequest} onChange={(e) => setNoRerequest(e.target.checked)} />
        <span><span className="block">Don't let {name} send me requests again</span><span className="block t-small text-ink-2">{name} won't be told. Any new request from them simply won't reach you.</span></span>
      </label>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Btn variant="danger-fill" onClick={() => {
          disconnect(connectionId, { noRerequest, withdrawFrom });
          toast(`You're no longer connected with ${name}.`, "neutral");
          onClose();
          navigate("/chats");
        }}>Disconnect</Btn>
        <Btn variant="secondary" onClick={onClose}>Stay connected</Btn>
      </div>
    </Modal>
  );
}
