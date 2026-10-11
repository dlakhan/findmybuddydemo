/* Requests, one to one chats, group chats and sent requests (PRD S4.2, S4.3, S5.1, S7.4). */
import { ChatsCircle, HandWaving, PaperPlaneTilt, UsersThree, CaretRight } from "@phosphor-icons/react";
import { TabPage } from "@/components/layout";
import { Avatar, EmptyState, LinkBtn, Tag } from "@/components/ui";
import { threadOf } from "@/lib/model";
import { attendeesOf, otherOf, relationFor } from "@/lib/rules";
import { Link } from "@/lib/router";
import { fmtDay, fmtShort, me as getMe, useStore, userById } from "@/lib/store";

export function Chats() {
  const s = useStore();
  const me = getMe(s)!;
  const lastOf = (thread: string) => s.messages.filter((m) => m.thread === thread).at(-1);
  const unread = (thread: string) => { const r = s.reads[`${me.id}|${thread}`] ?? ""; return s.messages.filter((m) => m.thread === thread && m.from !== me.id && m.at > r).length; };

  const mine = s.connections.filter((c) => c.from === me.id || c.to === me.id);
  // Only the latest record per person counts
  const latest = mine.filter((c) => relationFor(s, me.id, otherOf(c, me.id)).kind !== "none" && (() => { const r = relationFor(s, me.id, otherOf(c, me.id)); return "c" in r && r.c.id === c.id; })());
  const incoming = latest.filter((c) => c.status === "pending" && c.to === me.id && !c.held);
  const outgoing = latest.filter((c) => c.status === "pending" && c.from === me.id);
  const threads = latest.filter((c) => c.status === "accepted" || c.status === "disconnected")
    .sort((a, b) => (lastOf(threadOf.connection(b.id))?.at ?? b.respondedAt ?? "").localeCompare(lastOf(threadOf.connection(a.id))?.at ?? a.respondedAt ?? ""));
  const groups = s.meetups.filter((m) => m.type === "group" && m.status === "scheduled" && attendeesOf(s, m.id).some((a) => a.userId === me.id && a.status === "accepted"))
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt));

  const nothing = !incoming.length && !threads.length && !groups.length && !outgoing.length;

  return (
    <TabPage me={me} title="Chats">
      {nothing && (
        <EmptyState icon={ChatsCircle} title="No chats yet" body="When someone accepts your request, or you accept theirs, your chat shows up here."
          action={<LinkBtn to="/matches">See your matches</LinkBtn>} />
      )}

      {incoming.length > 0 && (
        <section className="mt-6">
          <h2 className="t-heading">Requests</h2>
          <ul className="mt-3 flex flex-col gap-3">
            {incoming.map((c) => {
              const p = userById(s, c.from)!;
              return (
                <li key={c.id}>
                  <Link to={`/people/${p.id}?from=/chats`} className="flex items-center gap-3 rounded-[12px] border border-hairline bg-surface p-4 hover:border-field">
                    <Avatar name={p.givenName} url={p.photo} size={48} />
                    <div className="min-w-0 flex-1">
                      <p className="t-strong">{p.givenName} wants to play! Take a look.</p>
                      {c.note && <p className="truncate t-small text-ink-2">"{c.note}"</p>}
                    </div>
                    <Tag tone="new" icon={HandWaving}>New</Tag>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {threads.length > 0 && (
        <section className="mt-6">
          <h2 className="t-heading">Chats</h2>
          <ul className="mt-3 flex flex-col gap-3">
            {threads.map((c) => {
              const p = userById(s, otherOf(c, me.id))!;
              const t = threadOf.connection(c.id);
              const last = lastOf(t);
              const n = unread(t);
              return (
                <li key={c.id}>
                  <Link to={`/chats/${c.id}`} className="flex items-center gap-3 rounded-[12px] border border-hairline bg-surface p-4 hover:border-field">
                    <Avatar name={p.givenName} url={p.photo} size={48} />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-baseline justify-between gap-2"><span className="t-strong">{p.givenName}</span>{last && <span className="t-caption text-ink-muted">{fmtShort(last.at)}</span>}</p>
                      <p className={n ? "truncate t-small font-bold text-ink" : "truncate t-small text-ink-2"}>
                        {c.status === "disconnected" ? "No longer connected · read only" : last ? `${last.from === me.id ? "You: " : ""}${last.body}` : "Say hi and find a time that works."}
                      </p>
                    </div>
                    {n > 0 && <span className="grid h-6 min-w-6 place-items-center rounded-full bg-brand-600 px-2 t-caption font-bold text-white">{n}<span className="sr-only"> unread</span></span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {groups.length > 0 && (
        <section className="mt-6">
          <h2 className="t-heading">Group chats</h2>
          <p className="t-small text-ink-2">One chat per group meetup, for the people going.</p>
          <ul className="mt-3 flex flex-col gap-3">
            {groups.map((m) => {
              const t = threadOf.meetup(m.id);
              const last = lastOf(t);
              const n = unread(t);
              const who = attendeesOf(s, m.id).filter((a) => a.status === "accepted").length;
              return (
                <li key={m.id}>
                  <Link to={`/meetups/${m.id}?from=/chats`} className="flex items-center gap-3 rounded-[12px] border border-hairline bg-surface p-4 hover:border-field">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-800"><UsersThree size={24} aria-hidden /></span>
                    <div className="min-w-0 flex-1">
                      <p className="t-strong">{m.activity}, {fmtDay(m.startsAt)}</p>
                      <p className={n ? "truncate t-small font-bold text-ink" : "truncate t-small text-ink-2"}>
                        {last ? `${last.from === me.id ? "You" : userById(s, last.from)?.givenName}: ${last.body}` : `${who} going`}
                      </p>
                    </div>
                    {n > 0 ? <span className="grid h-6 min-w-6 place-items-center rounded-full bg-brand-600 px-2 t-caption font-bold text-white">{n}<span className="sr-only"> unread</span></span> : <CaretRight size={20} className="text-ink-muted" aria-hidden />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {outgoing.length > 0 && (
        <section className="mt-8">
          <h2 className="t-heading">Waiting for a reply</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {outgoing.map((c) => {
              const p = userById(s, c.to)!;
              return (
                <li key={c.id}>
                  <Link to={`/people/${p.id}?from=/chats`} className="flex items-center justify-between gap-3 rounded-[12px] border border-hairline bg-surface p-3">
                    <span className="flex items-center gap-3"><Avatar name={p.givenName} url={p.photo} size={40} /><span className="t-strong">{p.givenName}</span></span>
                    <Tag tone="info" icon={PaperPlaneTilt}>Request sent</Tag>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </TabPage>
  );
}
