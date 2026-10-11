/* Match card, open slot card, availability grid. */
import { CalendarBlank, HandWaving, MapPin, PaperPlaneTilt, UsersThree, Clock } from "@phosphor-icons/react";
import { Avatar, ReasonChip, ReliabilitySignal, Tag } from "@/components/ui";
import { cn } from "@/lib/cn";
import { DAYS, PARTS } from "@/lib/data";
import type { Meetup, State, User } from "@/lib/model";
import { distanceKm, distanceLabel, going, matchReasons, reliabilityOf, spotsLeft, type Match } from "@/lib/rules";
import { Link } from "@/lib/router";
import { fmtWhen, userById } from "@/lib/store";

/** Leads with why someone fits, then whether they show up. Tap opens the profile; requests live there (Layer 6b). */
export function MatchCard({ m, s, pending }: { m: Match; s: State; pending: "sent" | "incoming" | null }) {
  const u = m.user;
  return (
    <Link to={`/people/${u.id}`} className="block w-full rounded-[12px] border border-hairline bg-surface p-4 text-left transition-[border-color,transform] duration-150 ease-[var(--ease-out)] hover:border-field active:scale-[0.99]">
      {pending && (
        <div className="mb-3 flex">
          {pending === "sent" && <Tag tone="info" icon={PaperPlaneTilt}>Request sent</Tag>}
          {pending === "incoming" && <Tag tone="new" icon={HandWaving}>Wants to play</Tag>}
        </div>
      )}
      <div className="flex items-center gap-3">
        <Avatar name={u.givenName} url={u.photo} />
        <div className="min-w-0 flex-1">
          <p className="t-strong">{u.givenName}</p>
          <p className="t-small text-ink-2">{u.area} · {distanceLabel(m.km)}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">{matchReasons(m).map((r) => <ReasonChip key={r}>{r}</ReasonChip>)}</div>
      <div className="my-4 h-px bg-hairline" />
      <ReliabilitySignal r={reliabilityOf(u.id, s)} />
    </Link>
  );
}

/** A group plan with open spots, discovered inside suggested matches (PRD S7.2). */
export function OpenSlotCard({ m, s, me }: { m: Meetup; s: State; me: User }) {
  const host = userById(s, m.createdBy)!;
  const left = spotsLeft(m, s);
  const count = going(s, m.id).length;
  const mine = s.attendees.find((a) => a.meetupId === m.id && a.userId === me.id);
  return (
    <Link to={`/meetups/${m.id}`} className="block rounded-[12px] border border-hairline bg-surface p-4 transition-[border-color,transform] duration-150 hover:border-field active:scale-[0.99]">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 t-strong">{m.activity} with {host.givenName}</p>
        {mine?.status === "requested" ? <Tag tone="info" icon={Clock}>Requested</Tag>
          : left > 0 ? <Tag tone="new" icon={UsersThree}>{left === 1 ? "1 spot left" : `${left} spots left`}</Tag>
          : <Tag tone="neutral">Full</Tag>}
      </div>
      <p className="mt-1 flex items-center gap-2 t-small text-ink-2"><CalendarBlank size={16} aria-hidden />{fmtWhen(m.startsAt)}</p>
      <p className="flex items-center gap-2 t-small text-ink-2"><MapPin size={16} className="shrink-0" aria-hidden />{m.place}</p>
      <p className="pl-6 t-small text-ink-2">{distanceLabel(distanceKm(me.area, host.area))}</p>
      <p className="mt-2 t-small text-ink-2">{count} going · hosted by {host.givenName}</p>
    </Link>
  );
}

export function SlotGrid({ slots, highlight }: { slots: string[]; highlight: string[] }) {
  return (
    <table className="mt-2 w-full max-w-sm border-separate border-spacing-1 t-caption">
      <thead><tr><th className="w-20" />{DAYS.map((d) => <th key={d.id} className="font-bold text-ink-2">{d.short}</th>)}</tr></thead>
      <tbody>
        {PARTS.map((p) => (
          <tr key={p.id}>
            <th scope="row" className="pr-2 text-left font-bold text-ink-2">{p.label}</th>
            {DAYS.map((d) => {
              const id = `${d.id}-${p.id}`; const on = slots.includes(id); const both = on && highlight.includes(id);
              return (
                <td key={d.id} aria-label={`${d.short} ${p.label}: ${on ? (both ? "free, overlaps with you" : "free") : "not free"}`}
                  className={cn("h-6 rounded-[3px]", both ? "bg-brand-600" : on ? "bg-brand-100" : "bg-neutral-100")} />
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
