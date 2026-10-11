/* Seeded community members respond to what the signed in person does, after a short, human feeling delay.
   This only exists so the prototype can be demoed alone. It is not product behaviour. */
import { respondMeetupDraft } from "./actions";
import type { State } from "./model";
import { attendeesOf, describeSlots, findMatches, isFindable, otherOf, relationFor, spotsLeft } from "./rules";
import { fmtDay, fmtTime, getState, nowIso, uid, update, userById } from "./store";
import { toast } from "./toast";

const after = (iso: string | undefined, ms: number, now: number) => !!iso && new Date(iso).getTime() + ms <= now;
/** Only react to things done after the demo data was created, never to the seeded history itself. */
const fresh = (s: State, iso: string | undefined) => !!iso && iso > s.seededAt;
const name = (s: State, id: string) => userById(s, id)?.givenName ?? "Someone";

const REPLIES = [
  "Sounds good to me.",
  "That works. Want to send a meetup proposal so it's locked in?",
  "Great, looking forward to it.",
  "Perfect, see you then!",
  "Nice. Let me know if anything changes.",
];
const GROUP_REPLIES = ["Sounds good!", "See you all there.", "Thanks for organising.", "Count me in.", "Great, looking forward to it."];

export function runBots(now = Date.now()) {
  const s = getState();
  const me = s.session;
  if (!me) return;
  const isBot = (id: string) => id !== me && !!userById(s, id)?.seed;
  const notes: { msg: string; tone?: "success" | "info" }[] = [];
  let changed = false;

  const work = (d: State) => {
    // 1. Requests I sent are accepted after a few seconds (quiet members never answer)
    for (const c of d.connections) {
      if (c.status !== "pending" || c.from !== me || c.held || !isBot(c.to) || userById(d, c.to)?.quiet || !fresh(d, c.requestedAt)) continue;
      if (!after(c.requestedAt, 5000, now)) continue;
      c.status = "accepted"; c.respondedAt = nowIso(); changed = true;
      d.events.push({ name: "request_accepted", uid: c.to, at: nowIso(), props: { connectionId: c.id } });
      notes.push({ msg: `${name(d, c.to)} accepted! Say hi and find a time that works.` });
    }
    // 2. A first hello once connected, then replies to my messages
    for (const c of d.connections) {
      if (c.status !== "accepted" || (c.from !== me && c.to !== me)) continue;
      const other = otherOf(c, me);
      if (!isBot(other)) continue;
      const thread = `c:${c.id}`;
      const msgs = d.messages.filter((m) => m.thread === thread);
      const last = msgs[msgs.length - 1];
      const o = userById(d, other)!;
      if (!msgs.length && fresh(d, c.respondedAt) && after(c.respondedAt, 3000, now)) {
        d.messages.push({ id: `x${uid()}`, thread, from: other, body: `Hi ${name(d, me)}! ${c.from === me ? "Thanks for reaching out." : "Thanks for accepting."} I'm usually free ${describeSlots(o.slots)}. When suits you?`, at: nowIso() });
        changed = true;
      } else if (last && last.from === me && fresh(d, last.at) && after(last.at, 3500, now)) {
        const k = msgs.filter((m) => m.from === other).length;
        d.messages.push({ id: `x${uid()}`, thread, from: other, body: REPLIES[k % REPLIES.length]!, at: nowIso() });
        changed = true;
      }
    }
    // 3. Group thread replies
    for (const m of d.meetups) {
      if (m.type !== "group" || m.status === "cancelled") continue;
      const going = attendeesOf(d, m.id).filter((a) => a.status === "accepted");
      if (!going.some((a) => a.userId === me)) continue;
      const others = going.filter((a) => isBot(a.userId));
      if (!others.length) continue;
      const msgs = d.messages.filter((x) => x.thread === `m:${m.id}`);
      const last = msgs[msgs.length - 1];
      if (last && last.from === me && fresh(d, last.at) && after(last.at, 4000, now)) {
        const who = others[msgs.length % others.length]!.userId;
        d.messages.push({ id: `x${uid()}`, thread: `m:${m.id}`, from: who, body: GROUP_REPLIES[msgs.length % GROUP_REPLIES.length]!, at: nowIso() });
        changed = true;
      }
    }
    // 4. Meetups I propose are accepted; group invites I send are accepted
    for (const a of d.attendees) {
      if (a.status !== "invited" || !isBot(a.userId) || !fresh(d, a.at)) continue;
      const m = d.meetups.find((x) => x.id === a.meetupId);
      if (!m || m.createdBy !== me || m.status === "cancelled" || !after(a.at, m.type === "group" ? 7000 : 6000, now)) continue;
      respondMeetupDraft(d, m.id, true, a.userId);
      changed = true;
      notes.push(m.type === "one_to_one"
        ? { msg: `${name(d, a.userId)} accepted. You're on for ${fmtDay(m.startsAt)} at ${fmtTime(m.startsAt)}.` }
        : { msg: `${name(d, a.userId)} is in for ${m.activity.toLowerCase()} on ${fmtDay(m.startsAt)}.` });
    }
    // 5. Hosts answer my join requests
    for (const a of d.attendees) {
      if (a.status !== "requested" || a.userId !== me || !fresh(d, a.at)) continue;
      const m = d.meetups.find((x) => x.id === a.meetupId);
      if (!m || !isBot(m.createdBy) || m.status !== "scheduled" || !after(a.at, 6000, now)) continue;
      const room = spotsLeft(m, d) > 0;
      a.status = room ? "accepted" : "declined"; a.respondedAt = nowIso(); changed = true;
      d.events.push({ name: room ? "join_accepted" : "join_declined", uid: m.createdBy, at: nowIso(), props: { meetupId: m.id } });
      notes.push(room
        ? { msg: `${name(d, m.createdBy)} added you to ${m.activity.toLowerCase()} on ${fmtDay(m.startsAt)}. Say hi in the group chat.` }
        : { msg: `That meetup filled up before ${name(d, m.createdBy)} could add you.`, tone: "info" });
    }
    // 6. Seeded members report outcomes after a meetup's time passes (never for personas, whose prompts are part of the demo)
    for (const m of d.meetups) {
      if (m.status !== "scheduled" || !after(m.startsAt, 10_000, now)) continue;
      const going = attendeesOf(d, m.id).filter((a) => a.status === "accepted");
      if (!going.some((a) => a.userId === me)) continue;
      for (const r of going) {
        const u = userById(d, r.userId);
        if (!u?.seed || u.persona || r.userId === me) continue;
        if (d.outcomes.some((o) => o.meetupId === m.id && o.reporter === r.userId)) continue;
        for (const sub of going) if (sub.userId !== r.userId) d.outcomes.push({ meetupId: m.id, reporter: r.userId, subject: sub.userId, happened: true, rating: 5, at: nowIso() });
        changed = true;
      }
    }
    // 7. Storyline: shortly after a new profile becomes findable, the best nearby match reaches out
    const due = d.arrivals[me];
    const meUser = userById(d, me);
    if (due && due !== "done" && new Date(due).getTime() <= now && meUser && isFindable(meUser)) {
      const candidates = d.users.filter((u) => u.seed && !u.persona && !u.quiet && relationFor(d, me, u.id).kind === "none");
      const top = findMatches(meUser, candidates)[0];
      d.arrivals[me] = "done";
      changed = true;
      if (top) {
        const act = top.best.name.toLowerCase();
        d.connections.push({ id: `c${uid()}`, from: top.user.id, to: me, status: "pending", requestedAt: nowIso(),
          note: `Hi! Saw you're into ${act} nearby. I'm free ${describeSlots(top.user.slots)} if you'd like a game.` });
        d.events.push({ name: "request_sent", uid: top.user.id, at: nowIso(), props: { to: me } });
        notes.push({ msg: `${top.user.givenName} wants to play! Take a look in Chats.`, tone: "info" });
      }
    }
  };

  // Dry run on a copy to see if anything is due, so idle ticks don't rewrite storage
  const probe = structuredClone(s);
  work(probe);
  if (!changed) return;
  notes.length = 0;
  update(work);
  notes.forEach((n) => toast(n.msg, n.tone ?? "success"));
}
