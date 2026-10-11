/* Meetups: what needs a reply, what's coming up, and past meetups. Group meetups live here too (PRD S6, S7). */
import { CalendarDots, CalendarBlank, MapPin, UsersThree, Plus, HandWaving, Clock, EnvelopeSimple } from "@phosphor-icons/react";
import { TabPage } from "@/components/layout";
import { MeetupCard } from "@/components/MeetupCard";
import { EmptyState, LinkBtn, StatusTag, Tag } from "@/components/ui";
import type { Meetup, State, User } from "@/lib/model";
import { attendeesOf, going, isPast, meetupView, spotsLeft } from "@/lib/rules";
import { Link } from "@/lib/router";
import { fmtDay, fmtWhen, me as getMe, useStore, userById } from "@/lib/store";

export function GroupCard({ m, s, me }: { m: Meetup; s: State; me: User }) {
  const host = userById(s, m.createdBy)!;
  const mine = attendeesOf(s, m.id).find((a) => a.userId === me.id);
  const view = meetupView(m, me.id, s);
  const left = spotsLeft(m, s);
  return (
    <Link to={`/meetups/${m.id}`} className="block rounded-[12px] border border-hairline bg-surface p-4 transition-[border-color,transform] duration-150 hover:border-field active:scale-[0.99]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {mine?.status === "invited" ? <Tag tone="info" icon={EnvelopeSimple}>Invited</Tag>
          : mine?.status === "requested" ? <Tag tone="info" icon={Clock}>Requested</Tag>
          : <StatusTag status={view} />}
        <span className="flex items-center gap-1 t-caption text-ink-muted"><UsersThree size={14} aria-hidden />Group</span>
      </div>
      <p className="mt-2 t-strong">{m.activity}{m.createdBy === me.id ? " · you're hosting" : ` with ${host.givenName}`}</p>
      <p className="mt-1 flex items-center gap-2 t-small text-ink-2"><CalendarBlank size={16} aria-hidden />{fmtWhen(m.startsAt)}</p>
      <p className="flex items-center gap-2 t-small text-ink-2"><MapPin size={16} aria-hidden />{m.place}</p>
      <p className="mt-2 t-small text-ink-2">{going(s, m.id).length} going{!isPast(m) && m.spots > 0 ? ` · ${left === 0 ? "full" : left === 1 ? "1 spot open" : `${left} spots open`}` : ""}</p>
    </Link>
  );
}

export function Meetups() {
  const s = useStore();
  const me = getMe(s)!;
  const now = Date.now();
  const mineIds = new Set(s.attendees.filter((a) => a.userId === me.id).map((a) => a.meetupId));
  const list = s.meetups.filter((m) => mineIds.has(m.id) && !(m.type === "group" && m.status === "cancelled"));
  const att = (m: Meetup) => attendeesOf(s, m.id).find((a) => a.userId === me.id)!;
  const future = (m: Meetup) => new Date(m.startsAt).getTime() > now;

  const toReply = list.filter((m) => future(m) && att(m).status === "invited" && m.status !== "declined" && m.status !== "cancelled");
  const joinRequests = s.attendees.filter((a) => a.status === "requested" && s.meetups.some((m) => m.id === a.meetupId && m.createdBy === me.id && m.status === "scheduled" && future(m)));
  const upcoming = list.filter((m) => future(m) && !toReply.includes(m) && (
    (m.type === "one_to_one" && (m.status === "scheduled" || m.status === "proposed")) ||
    (m.type === "group" && m.status === "scheduled" && (att(m).status === "accepted" || att(m).status === "requested"))
  )).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const past = list.filter((m) => !toReply.includes(m) && !upcoming.includes(m) && (m.type === "one_to_one" || att(m).status === "accepted" || att(m).status === "withdrawn"))
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt)).slice(0, 12);

  const card = (m: Meetup) => (m.type === "one_to_one" ? <MeetupCard m={m} showWith /> : <GroupCard m={m} s={s} me={me} />);

  return (
    <TabPage me={me} title="Meetups" action={<LinkBtn variant="secondary" to="/meetups/new" className="shrink-0 px-3"><Plus size={18} aria-hidden />Group</LinkBtn>}>
      {!list.length && !joinRequests.length ? (
        <EmptyState icon={CalendarDots} title="No meetups yet" body="Once you're connected with someone, propose a time from your chat. Or plan a group meetup and invite your connections."
          action={<LinkBtn to="/chats">Go to chats</LinkBtn>} />
      ) : (
        <>
          {(toReply.length > 0 || joinRequests.length > 0) && (
            <section className="mt-6">
              <h2 className="t-heading">Needs your reply</h2>
              <ul className="mt-3 flex flex-col gap-3">
                {joinRequests.map((a) => {
                  const m = s.meetups.find((x) => x.id === a.meetupId)!;
                  const p = userById(s, a.userId)!;
                  return (
                    <li key={`${a.meetupId}-${a.userId}`}>
                      <Link to={`/meetups/${m.id}`} className="flex items-center gap-3 rounded-[12px] border border-hairline bg-surface p-4 hover:border-field">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-marigold-100 text-marigold-800"><HandWaving size={20} aria-hidden /></span>
                        <span className="min-w-0 flex-1"><span className="block t-strong">{p.givenName} asked to join</span><span className="block t-small text-ink-2">{m.activity}, {fmtDay(m.startsAt)}</span></span>
                        <Tag tone="new">Review</Tag>
                      </Link>
                    </li>
                  );
                })}
                {toReply.map((m) => <li key={m.id}>{card(m)}</li>)}
              </ul>
            </section>
          )}
          {upcoming.length > 0 && (
            <section className="mt-8">
              <h2 className="t-heading">Coming up</h2>
              <ul className="mt-3 flex flex-col gap-3">{upcoming.map((m) => <li key={m.id}>{card(m)}</li>)}</ul>
            </section>
          )}
          {past.length > 0 && (
            <section className="mt-8">
              <h2 className="t-heading">Past</h2>
              <ul className="mt-3 flex flex-col gap-3">{past.map((m) => <li key={m.id}>{card(m)}</li>)}</ul>
            </section>
          )}
        </>
      )}
    </TabPage>
  );
}
