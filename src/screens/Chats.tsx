/* Requests, then one list of chats and upcoming group chats, then past group chats (PRD S4.2, S4.3, S5.1, S7.4; screen review 5). */
import { useState } from "react";
import { ChatsCircle, HandWaving, PaperPlaneTilt, UsersThree, CaretDown } from "@phosphor-icons/react";
import { TabPage } from "@/components/layout";
import { Avatar, EmptyState, LinkBtn, Tag } from "@/components/ui";
import { cn } from "@/lib/cn";
import { threadOf, type Connection, type Meetup } from "@/lib/model";
import { attendeesOf, isPast, otherOf, relationFor } from "@/lib/rules";
import { Link } from "@/lib/router";
import { fmtDate, fmtShort, me as getMe, useStore, userById } from "@/lib/store";

type Row = { kind: "one"; c: Connection; sort: string } | { kind: "group"; m: Meetup; sort: string };

const rowCls = "flex items-center gap-3 rounded-[12px] border border-hairline bg-surface p-3 hover:border-field";

export function Chats() {
  const s = useStore();
  const me = getMe(s)!;
  const [showPast, setShowPast] = useState(false);
  const lastOf = (thread: string) => s.messages.filter((m) => m.thread === thread).at(-1);
  const unread = (thread: string) => { const r = s.reads[`${me.id}|${thread}`] ?? ""; return s.messages.filter((m) => m.thread === thread && m.from !== me.id && m.at > r).length; };

  const mine = s.connections.filter((c) => c.from === me.id || c.to === me.id);
  // Only the latest record per person counts
  const latest = mine.filter((c) => { const r = relationFor(s, me.id, otherOf(c, me.id)); return "c" in r && r.c.id === c.id; });
  const incoming = latest.filter((c) => c.status === "pending" && c.to === me.id && !c.held);
  const outgoing = latest.filter((c) => c.status === "pending" && c.from === me.id);
  const myGroups = s.meetups.filter((m) => m.type === "group" && m.status === "scheduled" && attendeesOf(s, m.id).some((a) => a.userId === me.id && a.status === "accepted"));
  const upcoming = myGroups.filter((m) => !isPast(m));
  const past = myGroups.filter((m) => isPast(m)).sort((a, b) => b.startsAt.localeCompare(a.startsAt));

  // One list: one to one chats and upcoming group chats, sorted by latest activity
  const rows: Row[] = [
    ...latest.filter((c) => c.status === "accepted" || c.status === "disconnected")
      .map((c): Row => ({ kind: "one", c, sort: lastOf(threadOf.connection(c.id))?.at ?? c.respondedAt ?? c.requestedAt })),
    ...upcoming.map((m): Row => ({ kind: "group", m, sort: lastOf(threadOf.meetup(m.id))?.at ?? m.createdAt })),
  ].sort((a, b) => b.sort.localeCompare(a.sort));

  const nothing = !incoming.length && !rows.length && !outgoing.length && !past.length;
  const Unread = ({ n }: { n: number }) => n > 0 ? <span className="grid h-6 min-w-6 place-items-center rounded-full bg-brand-600 px-2 t-caption font-bold text-white">{n}<span className="sr-only"> unread</span></span> : null;

  const groupRow = (m: Meetup, isOld = false) => {
    const t = threadOf.meetup(m.id);
    const last = lastOf(t);
    const n = isOld ? 0 : unread(t);
    const who = attendeesOf(s, m.id).filter((a) => a.status === "accepted").length;
    return (
      <li key={m.id}>
        <Link to={`/meetups/${m.id}?tab=chat&from=/chats`} className={rowCls}>
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-800"><UsersThree size={24} aria-hidden /></span>
          <div className="min-w-0 flex-1">
            <p className="flex items-baseline justify-between gap-2"><span className="truncate t-strong">{m.activity}, {fmtDate(m.startsAt)}</span>{last && !isOld && <span className="shrink-0 t-caption text-ink-muted">{fmtShort(last.at)}</span>}</p>
            <p className={n ? "truncate t-small font-bold text-ink" : "truncate t-small text-ink-2"}>
              {last ? `${last.from === me.id ? "You" : userById(s, last.from)?.givenName}: ${last.body}` : `${who} going`}
            </p>
          </div>
          <Unread n={n} />
        </Link>
      </li>
    );
  };

  return (
    <TabPage me={me} title="Chats">
      {nothing && (
        <EmptyState icon={ChatsCircle} title="No chats yet" body="When someone accepts your request, or you accept theirs, your chat shows up here."
          action={<LinkBtn to="/matches">See your matches</LinkBtn>} />
      )}

      {(incoming.length > 0 || outgoing.length > 0) && (
        <section className="mt-6" aria-labelledby="req-h">
          <h2 id="req-h" className="t-heading">Requests</h2>
          {incoming.length > 0 && (
            <>
              <h3 className="mt-3 t-label text-ink-2">For you</h3>
              <ul className="mt-2 flex flex-col gap-2">
                {incoming.map((c) => {
                  const p = userById(s, c.from)!;
                  return (
                    <li key={c.id}>
                      <Link to={`/people/${p.id}?from=/chats`} className={rowCls}>
                        <Avatar name={p.givenName} url={p.photo} size={44} />
                        <div className="min-w-0 flex-1">
                          <p className="t-strong">{p.givenName} <span className="font-normal text-ink-2">· Wants to play</span></p>
                          {c.note && <p className="truncate t-small text-ink-2">"{c.note}"</p>}
                        </div>
                        <Tag tone="new" icon={HandWaving}>New</Tag>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
          {outgoing.length > 0 && (
            <>
              <h3 className="mt-4 t-label text-ink-2">Sent</h3>
              <ul className="mt-2 flex flex-col gap-2">
                {outgoing.map((c) => {
                  const p = userById(s, c.to)!;
                  return (
                    <li key={c.id}>
                      <Link to={`/people/${p.id}?from=/chats`} className={rowCls}>
                        <Avatar name={p.givenName} url={p.photo} size={44} />
                        <span className="min-w-0 flex-1 t-strong">{p.givenName}</span>
                        <Tag tone="info" icon={PaperPlaneTilt}>Request sent</Tag>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>
      )}

      {rows.length > 0 && (
        <section className="mt-6" aria-labelledby="chats-h">
          <h2 id="chats-h" className="t-heading">Chats</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {rows.map((r) => {
              if (r.kind === "group") return groupRow(r.m);
              const c = r.c;
              const p = userById(s, otherOf(c, me.id))!;
              const t = threadOf.connection(c.id);
              const last = lastOf(t);
              const n = unread(t);
              return (
                <li key={c.id}>
                  <Link to={`/chats/${c.id}`} className={rowCls}>
                    <Avatar name={p.givenName} url={p.photo} size={48} />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-baseline justify-between gap-2"><span className="t-strong">{p.givenName}</span>{last && <span className="t-caption text-ink-muted">{fmtShort(last.at)}</span>}</p>
                      <p className={n ? "truncate t-small font-bold text-ink" : "truncate t-small text-ink-2"}>
                        {c.status === "disconnected" ? "No longer connected · read only" : last ? `${last.from === me.id ? "You: " : ""}${last.body}` : "Say hi and find a time that works."}
                      </p>
                    </div>
                    <Unread n={n} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {past.length > 0 && (
        <section className="mt-6">
          <button type="button" onClick={() => setShowPast(!showPast)} aria-expanded={showPast}
            className="flex min-h-11 w-full items-center justify-between t-label text-ink-2">
            Past group chats ({past.length})
            <CaretDown size={18} aria-hidden className={cn("transition-transform duration-200", showPast && "rotate-180")} />
          </button>
          {showPast && <ul className="mt-2 flex flex-col gap-2">{past.map((m) => groupRow(m, true))}</ul>}
        </section>
      )}
    </TabPage>
  );
}
