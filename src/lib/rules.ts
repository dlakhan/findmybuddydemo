/* Product rules. Pure functions so they can be unit tested (rules.test.ts). */
import { ACTIVITY_BLOCKLIST, BC_AREAS, DAYS, GROUP_LEVELS, LEVELS, PARTS, TAG_MIN, TAGS, type GroupLevel, type Level, type TagId, type WizardStep } from "./data";
import type { Attendee, Connection, Meetup, Outcome, State, User } from "./model";

/* ---------- Profile and findability (PRD 5.3, R9) ---------- */

/** First required wizard step still missing, or null when the profile is findable. */
export function missingStep(p: User | null | undefined): WizardStep | null {
  if (!p) return "activities";
  if (p.activities.length === 0) return "activities";
  if (p.activities.some((a) => !a.level)) return "skill";
  if (!p.area) return "location";
  if (p.slots.length === 0) return "availability";
  return null;
}
export const isFindable = (p: User | null | undefined) => missingStep(p) === null;

/* ---------- Activities (PRD 5.3) ---------- */

export const normaliseActivity = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
export const titleCase = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase().replace(/^\p{L}/u, (c) => c.toUpperCase());

function lev(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0]![j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length]![b.length]!;
}
const squash = (s: string) => normaliseActivity(s).replace(/[\s-]/g, "").replace(/(es|s)$/, "");

/** Close matches from the shared list, so "pickle ball" surfaces Pickleball before a new record is made. */
export function activitySuggestions(query: string, list: string[]): string[] {
  const q = squash(query);
  if (q.length < 2) return [];
  return list.filter((a) => {
    const s = squash(a);
    return s.includes(q) || q.includes(s) || lev(s, q) <= (q.length > 6 ? 2 : 1);
  });
}

/** Resolves typed text to an existing activity, or a new title cased one. Returns an error message when blocked. */
export function resolveActivity(query: string, list: string[]): { name: string; isNew: boolean } | { error: string } {
  const n = normaliseActivity(query);
  if (n.length < 2) return { error: "Type at least two letters." };
  if (n.length > 40) return { error: "Keep it under 40 characters." };
  const existing = list.find((a) => normaliseActivity(a) === n);
  if (existing) return { name: existing, isNew: false };
  if (ACTIVITY_BLOCKLIST.some((w) => n.includes(w)) || !/\p{L}/u.test(n)) return { error: "That can't be added as an activity. Try another name." };
  return { name: titleCase(query), isNew: true };
}

/* ---------- Location ---------- */

export function distanceKm(a: string, b: string): number | null {
  const A = BC_AREAS.find((x) => x.name === a);
  const B = BC_AREAS.find((x) => x.name === b);
  if (!A || !B) return null;
  const R = 6371;
  const dLat = ((B.lat - A.lat) * Math.PI) / 180;
  const dLng = ((B.lng - A.lng) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((A.lat * Math.PI) / 180) * Math.cos((B.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}
export const distanceLabel = (km: number | null) => (km === null ? "" : km < 3 ? "Same area" : `About ${km} km away`);

/* ---------- Matching (PRD 5.3, R10) ---------- */

const levelIdx = (l: Level | null) => (l ? LEVELS.findIndex((x) => x.id === l) : 1);

export type Match = {
  user: User;
  km: number;
  skillGap: number;
  overlap: string[];
  best: { name: string; theirs: Level | null; mine: Level | null };
};

/** Required: shares an activity and is inside my travel distance. Ranked by skill closeness, then availability overlap. */
export function findMatches(me: User, others: User[], exclude: Set<string> = new Set()): Match[] {
  const out: Match[] = [];
  for (const o of others) {
    if (o.id === me.id || exclude.has(o.id) || !isFindable(o)) continue;
    const km = distanceKm(me.area, o.area);
    if (km === null || km > me.travelKm) continue;
    let best: Match["best"] | null = null;
    let gap = Infinity;
    for (const m of me.activities) {
      const t = o.activities.find((x) => normaliseActivity(x.name) === normaliseActivity(m.name));
      if (!t) continue;
      const g = Math.abs(levelIdx(m.level) - levelIdx(t.level));
      if (g < gap) { gap = g; best = { name: m.name, theirs: t.level, mine: m.level }; }
    }
    if (!best) continue;
    const overlap = me.slots.filter((s) => o.slots.includes(s));
    out.push({ user: o, km, skillGap: gap, overlap, best });
  }
  return out.sort((a, b) => a.skillGap - b.skillGap || b.overlap.length - a.overlap.length || a.km - b.km);
}

function listWords(xs: string[]) {
  if (xs.length <= 1) return xs.join("");
  return `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}

/** "Tue and Thu evenings", using the part of day with the most entries. */
export function describeSlots(slots: string[]) {
  if (!slots.length) return "";
  const byPart = PARTS.map((p) => ({ p, days: DAYS.filter((d) => slots.includes(`${d.id}-${p.id}`)).map((d) => d.short) }))
    .filter((x) => x.days.length)
    .sort((a, b) => b.days.length - a.days.length);
  const top = byPart[0];
  if (!top) return "";
  const days = top.days.length === 7 ? "Every day" : listWords(top.days);
  return `${days} ${top.p.plural}${byPart.length > 1 ? " and more" : ""}`;
}

export const levelLabel = (l: Level | null | undefined) => LEVELS.find((x) => x.id === l)?.label ?? "Level not set";

export function matchReasons(m: Match): string[] {
  const lvl = m.best.theirs ? levelLabel(m.best.theirs).toLowerCase() : null;
  const same = m.best.theirs === m.best.mine;
  const reasons = [[m.best.name, lvl].filter(Boolean).join(", ") + (same ? ", same as you" : "")];
  if (m.overlap.length) reasons.push(`Free ${describeSlots(m.overlap)}, overlaps`);
  return reasons;
}

/* ---------- Reliability (PRD 5.3, R23). Derived, never stored. ---------- */

export type Reliability = { attended: number; total: number; marks: { attended: boolean; meetupId: string }[]; ratingAvg: number | null; ratingCount: number };

/** Built only from what other attendees reported about this person. Most recent first. */
export function reliabilityOf(uid: string, s: Pick<State, "outcomes" | "meetups">): Reliability {
  const byMeetup = new Map<string, Outcome[]>();
  for (const o of s.outcomes) {
    if (o.subject !== uid || o.reporter === uid) continue;
    const list = byMeetup.get(o.meetupId) ?? [];
    list.push(o);
    byMeetup.set(o.meetupId, list);
  }
  const meetups = new Map(s.meetups.map((m) => [m.id, m]));
  const rows: { meetupId: string; at: number; attended: boolean }[] = [];
  const ratings: number[] = [];
  for (const [meetupId, outs] of byMeetup) {
    const m = meetups.get(meetupId);
    if (m?.cancelledByDisconnect || m?.status === "cancelled") continue;
    const attended = outs.some((o) => o.happened);
    const noShow = !attended && outs.some((o) => o.reason === "no_show");
    if (!attended && !noShow) continue; // cancelled or rescheduled: not counted either way
    rows.push({ meetupId, at: m ? new Date(m.startsAt).getTime() : 0, attended });
    for (const o of outs) if (o.happened && o.rating) ratings.push(o.rating);
  }
  rows.sort((a, b) => b.at - a.at);
  return {
    attended: rows.filter((r) => r.attended).length,
    total: rows.length,
    marks: rows.map((r) => ({ attended: r.attended, meetupId: r.meetupId })),
    ratingAvg: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
    ratingCount: ratings.length,
  };
}

export type ReliabilityView =
  | { kind: "new" }
  | { kind: "history"; rating: string | null; ratingA11y: string; line1: string; line2: string; marks: { attended: boolean; meetupId: string }[]; a11y: string };

/** Rating leads as "4.6 ★ by 8 buddies" once 3 or more people have rated; attendance sits with it (screen review 11). */
export function reliabilityView(r: Reliability | null | undefined, maxMarks = 5): ReliabilityView {
  if (!r || r.total === 0) return { kind: "new" };
  const hasRating = r.ratingCount >= 3 && r.ratingAvg !== null;
  const rating = hasRating ? `${r.ratingAvg!.toFixed(1)} ★ by ${r.ratingCount} buddies` : null;
  const marks = r.marks.slice(0, maxMarks);
  return {
    kind: "history",
    rating,
    ratingA11y: hasRating ? `Rated ${r.ratingAvg!.toFixed(1)} out of 5 by ${r.ratingCount} buddies` : "",
    line1: `Showed up to ${r.attended} of ${r.total}`,
    line2: rating ?? "Too early for a rating",
    marks,
    a11y: `Attended ${marks.filter((m) => m.attended).length} of the last ${marks.length} meetups`,
  };
}

/** Tags others gave this person, only those given by 3 or more, most given first. */
export function tagCounts(uid: string, s: Pick<State, "outcomes">): { id: TagId; label: string; said: string; count: number }[] {
  const counts = new Map<TagId, number>();
  for (const o of s.outcomes) {
    if (o.subject !== uid || o.reporter === uid || !o.happened || !o.tags) continue;
    for (const t of o.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return TAGS.map((t) => ({ id: t.id, label: t.label, said: t.said, count: counts.get(t.id) ?? 0 }))
    .filter((t) => t.count >= TAG_MIN)
    .sort((a, b) => b.count - a.count);
}

/** "Hosted 4 groups, all went ahead". A group went ahead when anyone reported it happened. */
export function hostRecord(uid: string, s: Pick<State, "meetups" | "outcomes">, now = Date.now()): { hosted: number; wentAhead: number } {
  const past = s.meetups.filter((m) => m.type === "group" && m.createdBy === uid && m.status === "scheduled" && isPast(m, now));
  const wentAhead = past.filter((m) => s.outcomes.some((o) => o.meetupId === m.id && o.happened)).length;
  return { hosted: past.length, wentAhead };
}
export function hostLine(name: string, r: { hosted: number; wentAhead: number }) {
  if (r.hosted === 0) return `First group ${name} has hosted`;
  const g = r.hosted === 1 ? "1 group" : `${r.hosted} groups`;
  const ahead = r.wentAhead === r.hosted ? (r.hosted === 1 ? "it went ahead" : r.hosted === 2 ? "both went ahead" : "all went ahead") : `${r.wentAhead} went ahead`;
  return `${name} has hosted ${g}, ${ahead}`;
}

export const groupLevelLabel = (l: GroupLevel | undefined) => GROUP_LEVELS.find((x) => x.id === l)?.label ?? "";
/** The viewer's level in an activity, if they play it. */
export const levelIn = (u: Pick<User, "activities">, activity: string) => u.activities.find((a) => normaliseActivity(a.name) === normaliseActivity(activity))?.level ?? null;

/* ---------- Connections (PRD 5.3) ---------- */

export const otherOf = (c: Pick<Connection, "from" | "to">, uid: string) => (c.from === uid ? c.to : c.from);

/** The live connection between two people: the most recent record. Declined and disconnected pairs can request again. */
export function connectionBetween(s: Pick<State, "connections">, a: string, b: string): Connection | undefined {
  const list = s.connections.filter((c) => (c.from === a && c.to === b) || (c.from === b && c.to === a));
  return list.sort((x, y) => y.requestedAt.localeCompare(x.requestedAt))[0];
}

/** What a viewer sees about their relationship with someone. A held request looks sent to its sender and is invisible to the recipient. */
export function relationFor(s: Pick<State, "connections">, viewer: string, other: string):
  | { kind: "none" } | { kind: "sent"; c: Connection } | { kind: "incoming"; c: Connection } | { kind: "connected"; c: Connection } | { kind: "disconnected"; c: Connection } {
  const c = connectionBetween(s, viewer, other);
  if (!c) return { kind: "none" };
  if (c.status === "pending") {
    if (c.from === viewer) return { kind: "sent", c };
    if (c.held) {
      const prev = s.connections.filter((x) => x !== c && ((x.from === viewer && x.to === other) || (x.from === other && x.to === viewer)))
        .sort((x, y) => y.requestedAt.localeCompare(x.requestedAt))[0];
      return prev?.status === "disconnected" ? { kind: "disconnected", c: prev } : { kind: "none" };
    }
    return { kind: "incoming", c };
  }
  if (c.status === "accepted") return { kind: "connected", c };
  if (c.status === "disconnected") return { kind: "disconnected", c };
  // Declined: quietly back to no request for the sender (PRD S4.3, proposed)
  return { kind: "none" };
}

/** True when the person I'm requesting asked not to be requested by me again. */
export function isBlockedFromRequesting(s: Pick<State, "connections">, requester: string, target: string) {
  return s.connections.some((c) => c.status === "disconnected" && c.noRerequest && c.disconnectedBy === target && otherOf(c, target) === requester);
}

/* ---------- Meetups (PRD 5.3) ---------- */

export type MeetupView = "proposed" | "scheduled" | "check" | "completed" | "cancelled" | "declined" | "not_happened";

export const attendeesOf = (s: Pick<State, "attendees">, meetupId: string) => s.attendees.filter((a) => a.meetupId === meetupId);
export const going = (s: Pick<State, "attendees">, meetupId: string) => attendeesOf(s, meetupId).filter((a) => a.status === "accepted");
export const isPast = (m: Meetup, now = Date.now()) => new Date(m.startsAt).getTime() <= now;

/** Status as the viewer sees it. */
export function meetupView(m: Meetup, viewer: string, s: Pick<State, "outcomes">, now = Date.now()): MeetupView {
  if (m.status === "proposed") return isPast(m, now) ? "declined" : "proposed";
  if (m.status === "declined") return "declined";
  if (m.status === "cancelled") return "cancelled";
  if (!isPast(m, now)) return "scheduled";
  const mine = s.outcomes.filter((o) => o.meetupId === m.id && o.reporter === viewer);
  if (!mine.length) return "check";
  return mine.some((o) => o.happened) ? "completed" : "not_happened";
}

/** Group spots left for new people to request. */
export function spotsLeft(m: Meetup, s: Pick<State, "attendees">) {
  const joined = attendeesOf(s, m.id).filter((a) => a.role === "joiner" && a.status === "accepted").length;
  return Math.max(0, m.spots - joined);
}

/** The meetup that blocks the app until its outcome is reported (PRD S9.1, mandatory and blocking). */
export function dueOutcome(s: State, uid: string, now = Date.now()): Meetup | undefined {
  return s.meetups
    .filter((m) => m.status === "scheduled" && isPast(m, now))
    .filter((m) => attendeesOf(s, m.id).some((a) => a.userId === uid && a.status === "accepted"))
    .filter((m) => !s.outcomes.some((o) => o.meetupId === m.id && o.reporter === uid))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
}

/** Open slots that the viewer can discover inside suggested matches (PRD S7.2). */
export function openSlotsFor(s: State, me: User, now = Date.now()): Meetup[] {
  return s.meetups.filter((m) => {
    if (m.type !== "group" || m.status !== "scheduled" || isPast(m, now) || m.createdBy === me.id) return false;
    if (spotsLeft(m, s) === 0 && !attendeesOf(s, m.id).some((a) => a.userId === me.id)) return false;
    if (attendeesOf(s, m.id).some((a) => a.userId === me.id && (a.status === "accepted" || a.status === "invited"))) return false;
    const host = s.users.find((u) => u.id === m.createdBy);
    if (!host) return false;
    const km = distanceKm(me.area, host.area);
    if (km === null || km > me.travelKm) return false;
    return me.activities.some((a) => normaliseActivity(a.name) === normaliseActivity(m.activity));
  }).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export type { Attendee };
