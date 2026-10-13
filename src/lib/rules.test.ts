/* Product rule tests. Run with: npm test */
import { test } from "node:test";
import assert from "node:assert/strict";
import type { User, State } from "./model";
import { activitySuggestions, describeSlots, dueOutcome, findMatches, isFindable, matchReasons, missingStep, openSlotsFor, reliabilityOf, reliabilityView, relationFor, resolveActivity, spotsLeft, tagCounts, hostRecord, hostLine } from "./rules";
import { buildSeed } from "./seed";

const base: User = {
  id: "a", provider: "google", email: "a@x.com", fullName: "Ann A", givenName: "Ann", photo: null, area: "Burnaby", travelKm: 15,
  activities: [{ name: "Badminton", level: "intermediate" }], slots: ["tue-evening", "thu-evening"], lookingFor: "", termsAcceptedAt: null, createdAt: "",
};
const u = (p: Partial<User>): User => ({ ...base, ...p });

test("findability needs activity, level, area and availability, not photo or looking for", () => {
  assert.equal(isFindable(base), true);
  assert.equal(missingStep(u({ activities: [] })), "activities");
  assert.equal(missingStep(u({ activities: [{ name: "Badminton", level: null }] })), "skill");
  assert.equal(missingStep(u({ area: "" })), "location");
  assert.equal(missingStep(u({ slots: [] })), "availability");
});

test("matching requires a shared activity and travel distance, then ranks by skill then overlap", () => {
  const near = u({ id: "b", area: "New Westminster", activities: [{ name: "badminton", level: "intermediate" }], slots: ["tue-evening"] });
  const nearMore = u({ id: "c", area: "Vancouver", activities: [{ name: "Badminton", level: "intermediate" }], slots: ["tue-evening", "thu-evening"] });
  const levelOff = u({ id: "d", area: "Burnaby", activities: [{ name: "Badminton", level: "advanced" }], slots: ["tue-evening", "thu-evening"] });
  const far = u({ id: "e", area: "Kelowna" });
  const other = u({ id: "f", activities: [{ name: "Tennis", level: "intermediate" }] });
  const hidden = u({ id: "g", slots: [] });
  const ids = findMatches(base, [near, nearMore, levelOff, far, other, hidden]).map((m) => m.user.id);
  assert.deepEqual(ids, ["c", "b", "d"]);
});

test("match reasons explain the ranking", () => {
  const m = findMatches(base, [u({ id: "b", slots: ["tue-evening", "thu-evening"] })])[0]!;
  assert.deepEqual(matchReasons(m), ["Badminton, intermediate, same as you", "Free Tue and Thu evenings, overlaps"]);
  assert.equal(describeSlots(["sat-morning", "tue-evening", "thu-evening"]), "Tue and Thu evenings and more");
});

test("activities normalise, suggest close matches and block duplicates", () => {
  const list = ["Badminton", "Pickleball", "Table tennis"];
  assert.deepEqual(resolveActivity("  badMINTON ", list), { name: "Badminton", isNew: false });
  assert.deepEqual(resolveActivity("ultimate   frisbee", list), { name: "Ultimate frisbee", isNew: true });
  assert.ok("error" in resolveActivity("x", list));
  assert.ok(activitySuggestions("pickle ball", list).includes("Pickleball"));
  assert.ok(activitySuggestions("badmington", list).includes("Badminton"));
});

test("reliability shows attendance from the first meetup and a rating only from three", () => {
  assert.deepEqual(reliabilityView(null), { kind: "new" });
  const s = buildSeed(Date.parse("2026-10-10T18:00:00Z"));
  const arjun = reliabilityOf("arjun", s);
  assert.equal(arjun.total, 9);
  assert.equal(arjun.attended, 8);
  const v = reliabilityView(arjun);
  assert.equal(v.kind === "history" && v.line1, "Showed up to 8 of 9");
  assert.match(v.kind === "history" ? v.line2 : "", /^\d\.\d ★ by 8 buddies$/);
  const sofia = reliabilityView(reliabilityOf("sofia", s));
  assert.equal(sofia.kind === "history" && sofia.line2, "Too early for a rating");
  assert.equal(reliabilityView(reliabilityOf("daniel", s)).kind, "new");
});

test("a person's own answers never change their own record", () => {
  const s = buildSeed(Date.now());
  const before = reliabilityOf("arjun", s);
  s.outcomes.push({ meetupId: "m1", reporter: "arjun", subject: "arjun", happened: false, reason: "no_show", at: "" });
  assert.deepEqual(reliabilityOf("arjun", s), before);
});

test("seeded storyline: Ashwin and Nala each have a blocking prompt, Elena does not", () => {
  const s = buildSeed(Date.now()) as State;
  assert.equal(dueOutcome(s, "arjun")?.type, "one_to_one");
  assert.equal(dueOutcome(s, "nadia")?.type, "group");
  assert.equal(dueOutcome(s, "claire"), undefined);
});

test("open slots appear for people who match the activity and distance, and stop when full", () => {
  const s = buildSeed(Date.now());
  const arjun = s.users.find((x) => x.id === "arjun")!;
  const thursday = openSlotsFor(s, arjun).find((m) => m.createdBy === "nadia")!;
  assert.ok(thursday);
  assert.equal(spotsLeft(thursday, s), 2);
  const claire = s.users.find((x) => x.id === "claire")!;
  assert.equal(openSlotsFor(s, claire).some((m) => m.createdBy === "nadia"), false);
  s.attendees.find((a) => a.meetupId === thursday.id && a.userId === "daniel")!.status = "accepted";
  assert.equal(spotsLeft(thursday, s), 1);
  s.attendees.push({ meetupId: thursday.id, userId: "priya", role: "joiner", status: "accepted", at: "" });
  assert.equal(spotsLeft(thursday, s), 0);
  assert.equal(openSlotsFor(s, arjun).some((m) => m.id === thursday.id), false);
});

test("a held request looks sent to the sender and is invisible to the person who blocked them", () => {
  const s = buildSeed(Date.now());
  Object.assign(s.connections.find((c) => c.id === "c-arjun-ravi")!, { status: "disconnected", disconnectedBy: "arjun", noRerequest: true });
  s.connections.push({ id: "z2", from: "ravi", to: "arjun", status: "pending", note: "", requestedAt: new Date(Date.now() + 1000).toISOString(), held: true });
  assert.equal(relationFor(s, "ravi", "arjun").kind, "sent");
  assert.equal(relationFor(s, "arjun", "ravi").kind, "disconnected");
});

test("tags show only once 3 or more people gave them, and host record counts groups that went ahead", () => {
  const s = buildSeed(Date.now());
  const tags = tagCounts("arjun", s);
  assert.ok(tags.length > 0, "Ashwin has seeded tags");
  assert.ok(tags.every((t) => t.count >= 3));
  assert.ok(tags.every((t, i) => i === 0 || tags[i - 1]!.count >= t.count));
  const fake = { outcomes: [1, 2].map((i) => ({ meetupId: `x${i}`, reporter: `r${i}`, subject: "z", happened: true, rating: 5, tags: ["on_time" as const], at: "" })) };
  assert.equal(tagCounts("z", fake).length, 0);
  const rec = hostRecord("nadia", s);
  assert.equal(rec.hosted, 4);
  assert.equal(rec.wentAhead, 4);
  assert.equal(hostLine("Nala", rec), "Nala has hosted 4 groups, all went ahead");
  assert.equal(hostLine("Sam", { hosted: 0, wentAhead: 0 }), "First group Sam has hosted");
});
