/* Every state change in the product. Each one records an event (PRD R26) so notifications can follow later. */
import type { GroupLevel, Provider, OutcomeReason, TagId } from "./data";
import type { Attendee, Meetup, State, User } from "./model";
import { threadOf } from "./model";
import { connectionBetween, isBlockedFromRequesting, isFindable, resolveActivity, otherOf, attendeesOf, spotsLeft } from "./rules";
import { getState, nowIso, uid, update } from "./store";

const ev = (d: State, name: string, props: Record<string, unknown> = {}) => {
  d.events.push({ name, uid: d.session, at: nowIso(), props });
};

/* ---------- Sign in (simulated OAuth) ---------- */

export type SignInResult = { ok: true; userId: string; isNew: boolean } | { ok: false; error: string; code: "duplicate" | "no_account" };

/** Sign up and log in both go through the provider. Log in never creates an account (screen review 1b). */
export function signIn(provider: Provider, identity: { fullName: string; email: string }, mode: "signup" | "login" = "signup"): SignInResult {
  const s = getState();
  const email = identity.email.trim().toLowerCase();
  const existing = s.users.find((u) => u.email.toLowerCase() === email);
  if (existing && existing.provider !== provider) {
    const names: Record<Provider, string> = { google: "Google", facebook: "Facebook", x: "X" };
    update((d) => ev(d, "sign_in_duplicate_email", { provider, existing: existing.provider }));
    return { ok: false, code: "duplicate", error: `That email is already in use by an account that signs in with ${names[existing.provider]}. Continue with ${names[existing.provider]} instead, or use a different account.` };
  }
  if (existing) {
    update((d) => { d.session = existing.id; ev(d, "sign_in", { provider }); });
    return { ok: true, userId: existing.id, isNew: false };
  }
  if (mode === "login") {
    update((d) => ev(d, "log_in_no_account", { provider }));
    return { ok: false, code: "no_account", error: "We don't have an account for that email yet." };
  }
  const id = `u${uid()}`;
  const fullName = identity.fullName.trim() || email.split("@")[0]!;
  const user: User = {
    id, provider, email, fullName, givenName: fullName.split(/\s+/)[0]!, photo: null, area: "", travelKm: 15,
    activities: [], slots: [], lookingFor: "", termsAcceptedAt: nowIso(), createdAt: nowIso(),
  };
  update((d) => { d.users.push(user); d.session = id; ev(d, "sign_up_completed", { provider }); });
  return { ok: true, userId: id, isNew: true };
}

export function signOut() {
  update((d) => { ev(d, "sign_out"); d.session = null; });
}

/* ---------- Profile ---------- */

/** Saves profile fields. Returns true when this save made the profile findable. */
export function saveProfile(patch: Partial<User>, step: string): boolean {
  let became = false;
  update((d) => {
    const u = d.users.find((x) => x.id === d.session);
    if (!u) return;
    const was = isFindable(u);
    Object.assign(u, patch);
    ev(d, "wizard_step_completed", { step });
    if (!was && isFindable(u)) {
      became = true;
      ev(d, "profile_findable");
      // Demo storyline: someone nearby notices the new profile shortly after it becomes findable
      if (!d.arrivals[u.id]) d.arrivals[u.id] = new Date(Date.now() + 12_000).toISOString();
    }
  });
  return became;
}

/** Adds a user activity to the shared list (PRD 5.3), or resolves to the existing one. */
export function addActivity(text: string): { name: string } | { error: string } {
  const r = resolveActivity(text, getState().activities);
  if ("error" in r) return r;
  if (r.isNew) update((d) => { d.activities.push(r.name); ev(d, "activity_added", { name: r.name }); });
  return { name: r.name };
}

/* ---------- Connections ---------- */

export function sendRequest(to: string, note: string) {
  update((d) => {
    const from = d.session!;
    const held = isBlockedFromRequesting(d, from, to);
    d.connections.push({ id: `c${uid()}`, from, to, status: "pending", note: note.trim(), requestedAt: nowIso(), ...(held ? { held: true } : {}) });
    ev(d, "request_sent", { to, held });
  });
}

export function respondRequest(connectionId: string, accept: boolean) {
  update((d) => {
    const c = d.connections.find((x) => x.id === connectionId);
    if (!c || c.status !== "pending") return;
    c.status = accept ? "accepted" : "declined";
    c.respondedAt = nowIso();
    ev(d, accept ? "request_accepted" : "request_declined", { connectionId });
  });
}

/** Group meetups both people are attending, for the disconnect choice (PRD 3.5). */
export function sharedGroups(s: State, a: string, b: string): Meetup[] {
  return s.meetups.filter((m) => m.type === "group" && m.status === "scheduled" && new Date(m.startsAt).getTime() > Date.now()
    && [a, b].every((u) => attendeesOf(s, m.id).some((x) => x.userId === u && x.status === "accepted")));
}

export function disconnect(connectionId: string, opts: { noRerequest: boolean; withdrawFrom: string[] }) {
  update((d) => {
    const me = d.session!;
    const c = d.connections.find((x) => x.id === connectionId);
    if (!c) return;
    const other = otherOf(c, me);
    c.status = "disconnected";
    c.disconnectedBy = me;
    c.disconnectedAt = nowIso();
    c.noRerequest = opts.noRerequest;
    // One to one meetups between the two are cancelled and count against neither person
    for (const m of d.meetups) {
      if (m.type !== "one_to_one" || (m.status !== "scheduled" && m.status !== "proposed") || new Date(m.startsAt).getTime() <= Date.now()) continue;
      const ids = d.attendees.filter((a) => a.meetupId === m.id).map((a) => a.userId);
      if (ids.includes(me) && ids.includes(other)) { m.status = "cancelled"; m.cancelledByDisconnect = true; }
    }
    for (const mId of opts.withdrawFrom) withdrawDraft(d, mId, me);
    ev(d, "disconnected", { connectionId, noRerequest: opts.noRerequest, withdrew: opts.withdrawFrom.length });
  });
}

/* ---------- Messages ---------- */

export function sendMessage(thread: string, body: string) {
  update((d) => {
    d.messages.push({ id: `x${uid()}`, thread, from: d.session!, body: body.trim(), at: nowIso() });
    d.reads[`${d.session}|${thread}`] = nowIso();
    ev(d, "message_sent", { thread });
  });
}

export function markRead(thread: string) {
  const s = getState();
  const last = s.messages.filter((m) => m.thread === thread).reduce((a, m) => (m.at > a ? m.at : a), "");
  const key = `${s.session}|${thread}`;
  if (last && (s.reads[key] ?? "") >= last) return;
  update((d) => { d.reads[key] = nowIso(); });
}

/* ---------- One to one meetups ---------- */

export function proposeMeetup(connectionId: string, f: { activity: string; startsAt: string; place: string; note: string }) {
  update((d) => {
    const me = d.session!;
    const c = d.connections.find((x) => x.id === connectionId)!;
    const id = `m${uid()}`;
    d.meetups.push({ id, type: "one_to_one", createdBy: me, activity: f.activity, startsAt: f.startsAt, place: f.place, note: f.note, spots: 0, status: "proposed", connectionId, createdAt: nowIso() });
    d.attendees.push({ meetupId: id, userId: me, role: "creator", status: "accepted", at: nowIso() });
    d.attendees.push({ meetupId: id, userId: otherOf(c, me), role: "invitee", status: "invited", at: nowIso() });
    // Second meetup with the same person is the G2 signal
    const before = d.meetups.filter((m) => m.type === "one_to_one" && m.id !== id && d.attendees.some((a) => a.meetupId === m.id && a.userId === otherOf(c, me)) && d.attendees.some((a) => a.meetupId === m.id && a.userId === me) && d.outcomes.some((o) => o.meetupId === m.id && o.happened));
    ev(d, "meetup_proposed", { meetupId: id, repeat: before.length > 0 });
  });
}

export function respondMeetup(meetupId: string, accept: boolean, by?: string) {
  update((d) => respondMeetupDraft(d, meetupId, accept, by ?? d.session!));
}
export function respondMeetupDraft(d: State, meetupId: string, accept: boolean, by: string) {
  const m = d.meetups.find((x) => x.id === meetupId);
  const a = d.attendees.find((x) => x.meetupId === meetupId && x.userId === by);
  if (!m || !a || a.status !== "invited") return;
  a.status = accept ? "accepted" : "declined";
  a.respondedAt = nowIso();
  if (m.type === "one_to_one") m.status = accept ? "scheduled" : "declined";
  d.events.push({ name: accept ? "meetup_accepted" : "meetup_declined", uid: by, at: nowIso(), props: { meetupId, type: m.type } });
}

export function cancelMeetup(meetupId: string, note: string) {
  update((d) => {
    const m = d.meetups.find((x) => x.id === meetupId);
    if (!m) return;
    m.status = "cancelled";
    m.cancelledBy = d.session!;
    m.cancelNote = note.trim();
    ev(d, "meetup_cancelled", { meetupId, type: m.type });
  });
}

/* ---------- Outcomes ---------- */

/** One to one: did it happen, then a rating or a reason (PRD S9.1, S9.2). */
export function submitOutcome(meetupId: string, subject: string, r: { happened: true; rating: number; tags?: TagId[] } | { happened: false; reason: OutcomeReason }) {
  update((d) => {
    d.outcomes.push({ meetupId, reporter: d.session!, subject, at: nowIso(), ...r });
    ev(d, "outcome_answered", { meetupId, happened: r.happened, ...(r.happened ? {} : { reason: r.reason }) });
    if (r.happened) ev(d, "rating_submitted", { meetupId, tags: r.tags?.length ?? 0 });
  });
}

/** Group: every attendee marks attendance for, and rates, every other attendee. No partial responses (PRD S9.3). */
export function submitGroupOutcome(meetupId: string, answers: { happened: false; reason: OutcomeReason; subjects: string[] } | { happened: true; people: Record<string, { showed: boolean; rating?: number; tags?: TagId[] }> }) {
  update((d) => {
    const me = d.session!;
    if (!answers.happened) {
      for (const s of answers.subjects) d.outcomes.push({ meetupId, reporter: me, subject: s, happened: false, reason: answers.reason, at: nowIso() });
    } else {
      for (const [subject, p] of Object.entries(answers.people)) {
        d.outcomes.push(p.showed
          ? { meetupId, reporter: me, subject, happened: true, rating: p.rating!, ...(p.tags?.length ? { tags: p.tags } : {}), at: nowIso() }
          : { meetupId, reporter: me, subject, happened: false, reason: "no_show", at: nowIso() });
      }
    }
    ev(d, "outcome_answered", { meetupId, group: true, happened: answers.happened });
  });
}

/* ---------- Group meetups (P1) ---------- */

export function createGroup(f: { activity: string; startsAt: string; place: string; note: string; spots: number; invite: string[]; level: GroupLevel }): string {
  const id = `m${uid()}`;
  update((d) => {
    const me = d.session!;
    d.meetups.push({ id, type: "group", createdBy: me, activity: f.activity, startsAt: f.startsAt, place: f.place, note: f.note, spots: f.spots, level: f.level, status: "scheduled", createdAt: nowIso() });
    d.attendees.push({ meetupId: id, userId: me, role: "creator", status: "accepted", at: nowIso() });
    for (const u of f.invite) d.attendees.push({ meetupId: id, userId: u, role: "invitee", status: "invited", at: nowIso() });
    ev(d, "group_meetup_created", { meetupId: id, invited: f.invite.length, spots: f.spots });
  });
  return id;
}

export function requestJoin(meetupId: string, note: string) {
  update((d) => {
    const me = d.session!;
    const prev = d.attendees.find((a) => a.meetupId === meetupId && a.userId === me);
    if (prev) { prev.status = "requested"; prev.note = note.trim(); prev.at = nowIso(); prev.role = "joiner"; }
    else d.attendees.push({ meetupId, userId: me, role: "joiner", status: "requested", note: note.trim(), at: nowIso() });
    ev(d, "join_requested", { meetupId });
  });
}

/** Creator accepts or declines a join request. A full meetup stops accepting. */
export function respondJoin(meetupId: string, userId: string, accept: boolean): boolean {
  let ok = true;
  update((d) => {
    const m = d.meetups.find((x) => x.id === meetupId);
    const a = d.attendees.find((x) => x.meetupId === meetupId && x.userId === userId);
    if (!m || !a || a.status !== "requested") return;
    if (accept && spotsLeft(m, d) === 0) { ok = false; return; }
    a.status = accept ? "accepted" : "declined";
    a.respondedAt = nowIso();
    d.events.push({ name: accept ? "join_accepted" : "join_declined", uid: m.createdBy, at: nowIso(), props: { meetupId, userId } });
    if (accept && spotsLeft(m, d) === 0) d.events.push({ name: "slot_filled", uid: m.createdBy, at: nowIso(), props: { meetupId } });
  });
  return ok;
}

function withdrawDraft(d: State, meetupId: string, userId: string) {
  const m = d.meetups.find((x) => x.id === meetupId);
  const a = d.attendees.find((x) => x.meetupId === meetupId && x.userId === userId);
  if (!m || !a) return;
  const wasIn = a.status === "accepted";
  a.status = "withdrawn";
  a.respondedAt = nowIso();
  // The slot reopens (PRD S7.5, proposed). An invitee's place becomes an open slot; a joiner's frees itself.
  if (wasIn && a.role === "invitee") m.spots += 1;
  d.events.push({ name: "meetup_withdrawn", uid: userId, at: nowIso(), props: { meetupId, role: a.role } });
}

export function withdraw(meetupId: string) {
  update((d) => withdrawDraft(d, meetupId, d.session!));
}

export function myAttendance(s: State, meetupId: string, userId: string): Attendee | undefined {
  return s.attendees.find((a) => a.meetupId === meetupId && a.userId === userId);
}

export { connectionBetween, threadOf };
