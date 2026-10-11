/* Person profile and connection request (PRD S3.4, S3.5, S4.1 to S4.3). */
import { useState } from "react";
import { PaperPlaneTilt, ChatsCircle, MapPin, HandWaving, Info } from "@phosphor-icons/react";
import { SlotGrid } from "@/components/cards";
import { Avatar, Btn, FieldError, Label, LinkBtn, Modal, ReliabilitySignal, ScreenHeader, Tag, inputCls } from "@/components/ui";
import { respondRequest, sendRequest } from "@/lib/actions";
import { cn } from "@/lib/cn";
import { distanceKm, distanceLabel, isFindable, levelLabel, relationFor, reliabilityOf } from "@/lib/rules";
import { navigate, query, usePath } from "@/lib/router";
import { me as getMe, track, useStore, userById } from "@/lib/store";
import { toast } from "@/lib/toast";
import { useEffect } from "react";

export function Person({ id }: { id: string }) {
  const s = useStore();
  const me = getMe(s)!;
  const path = usePath();
  const from = query(path).get("from") ?? "/matches";
  const person = userById(s, id);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDecline, setConfirmDecline] = useState(false);

  useEffect(() => { if (person) track("profile_viewed", { id }); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!person || person.id === me.id) {
    return <><ScreenHeader backTo={from} title="Profile" /><p className="p-4 text-ink-2">This profile isn't available.</p></>;
  }
  const name = person.givenName;
  const km = distanceKm(me.area, person.area);
  const rel = relationFor(s, me.id, person.id);

  const send = () => {
    if (!isFindable(me)) { setErr("Finish your profile first so they can see who you are."); return; }
    if (note.length > 200) { setErr("Keep the note to 200 characters or fewer."); return; }
    setBusy(true); setErr("");
    window.setTimeout(() => {
      sendRequest(person.id, note);
      setBusy(false); setOpen(false); setNote("");
      toast("Request sent");
    }, 400);
  };

  const respond = (accept: boolean) => {
    if (rel.kind !== "incoming") return;
    respondRequest(rel.c.id, accept);
    setConfirmDecline(false);
    if (accept) { toast(`You and ${name} are connected! Say hi and find a time that works.`); navigate(`/chats/${rel.c.id}`); }
    else { toast("Request declined", "neutral"); navigate(from); }
  };

  return (
    <div className="min-h-dvh bg-page pb-[calc(var(--sab)+24px)]">
      <ScreenHeader backTo={from} title={name} />
      <article className="mx-auto max-w-[600px] px-4 pt-6">
        <div className="flex items-center gap-4">
          <Avatar name={name} url={person.photo} size={72} />
          <div>
            <h1 className="t-heading">{name}</h1>
            <p className="flex items-center gap-1 t-small text-ink-2"><MapPin size={16} aria-hidden />{person.area}{km !== null && ` · ${distanceLabel(km)}`}</p>
          </div>
        </div>

        {rel.kind === "incoming" && (
          <div className="mt-6 rounded-[12px] border border-hairline bg-surface p-4">
            <p className="flex items-center gap-2 t-strong"><HandWaving size={20} className="text-marigold-800" aria-hidden />{name} wants to play! Take a look.</p>
            {rel.c.note && <p className="mt-2 rounded-[8px] bg-neutral-100 p-3 t-small text-ink">"{rel.c.note}"</p>}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Btn onClick={() => respond(true)}>Accept</Btn>
              <Btn variant="secondary" onClick={() => setConfirmDecline(true)}>Decline</Btn>
            </div>
          </div>
        )}

        <section className="mt-6"><h2 className="t-label text-ink-2">Reliability</h2><div className="mt-2"><ReliabilitySignal r={reliabilityOf(person.id, s)} max={10} /></div></section>

        <section className="mt-6">
          <h2 className="t-label text-ink-2">Activities</h2>
          <ul className="mt-2 grid gap-1">
            {person.activities.map((a) => <li key={a.name}><span className="t-strong">{a.name}</span> <span className="t-small text-ink-2">· {levelLabel(a.level)}</span></li>)}
          </ul>
        </section>

        <section className="mt-6">
          <h2 className="t-label text-ink-2">Usually free</h2>
          <SlotGrid slots={person.slots} highlight={me.slots} />
          <p className="mt-1 flex items-center gap-2 t-caption text-ink-2"><span className="inline-block h-3 w-3 rounded-[3px] bg-brand-600" />Overlaps with you<span className="ml-2 inline-block h-3 w-3 rounded-[3px] bg-brand-100" />Free</p>
        </section>

        {person.lookingFor && (
          <section className="mt-6"><h2 className="t-label text-ink-2">Looking for</h2><p className="mt-1 measure">{person.lookingFor}</p></section>
        )}

        <div className="mt-8">
          {(rel.kind === "none" || rel.kind === "disconnected") && (
            <>
              {rel.kind === "disconnected" && <p className="mb-3 flex items-start gap-2 t-small text-ink-2"><Info size={18} className="mt-[1px] shrink-0" aria-hidden />You're no longer connected. You can send a fresh request.</p>}
              <Btn block onClick={() => { setErr(""); setOpen(true); }}><PaperPlaneTilt size={20} aria-hidden />Send request</Btn>
            </>
          )}
          {rel.kind === "sent" && (
            <div className="flex flex-wrap items-center gap-3">
              <Tag tone="info" icon={PaperPlaneTilt}>Request sent</Tag>
              <span className="t-small text-ink-2">You'll see it in Chats when {name} replies.</span>
            </div>
          )}
          {rel.kind === "connected" && <LinkBtn block to={`/chats/${rel.c.id}`}><ChatsCircle size={20} aria-hidden />Open chat</LinkBtn>}
        </div>
      </article>

      <Modal open={open} onOpenChange={setOpen} title={`Send ${name} a request`} description="Add a short note if you like. If they accept, you can chat and plan a meetup.">
        <Label htmlFor="req-note">Note (optional)</Label>
        <textarea id="req-note" rows={3} className={cn(inputCls(note.length > 200), "min-h-24")} value={note} onChange={(e) => setNote(e.target.value)}
          placeholder={`Hi ${name}, fancy a game?`} />
        <p className={cn("mt-1 text-right t-caption", note.length > 200 ? "text-danger-800" : "text-ink-muted")}>{note.length} / 200</p>
        <FieldError>{err}</FieldError>
        <div className="mt-4 grid grid-cols-2 gap-3"><Btn loading={busy} onClick={send}>Send request</Btn><Btn variant="secondary" onClick={() => setOpen(false)}>Not now</Btn></div>
      </Modal>

      <Modal open={confirmDecline} onOpenChange={setConfirmDecline} title={`Decline ${name}'s request?`} description="They won't get a message. They can still find you in their suggestions.">
        <div className="grid grid-cols-2 gap-3"><Btn variant="danger-fill" onClick={() => respond(false)}>Decline</Btn><Btn variant="secondary" onClick={() => setConfirmDecline(false)}>Keep it</Btn></div>
      </Modal>
    </div>
  );
}
