/* Demo storyline. All times are relative to when the data is created, so the demo always looks current.
   Personas (sign in as them): Ashwin, Elena, Nala. Everyone else is a seeded community member who responds automatically. */
import { CURATED_ACTIVITIES, type GroupLevel, type Level, type OutcomeReason, type Provider, type TagId } from "./data";
import type { Attendee, Connection, Meetup, Message, Outcome, State, User } from "./model";

const H = 3600_000;
const D = 24 * H;

export function buildSeed(nowMs: number): State {
  const now = new Date(nowMs);
  const iso = (ms: number) => new Date(ms).toISOString();
  const startOfDay = (ms: number) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
  /** daysAgo at hour:min local time */
  const at = (daysAgo: number, hour = 19, min = 0) => startOfDay(nowMs - daysAgo * D) + hour * H + min * 60_000;
  const nextDow = (dow: number, hour: number, gapH = 12) => {
    for (let i = 0; i < 14; i++) {
      const t = startOfDay(nowMs + i * D) + hour * H;
      if (new Date(t).getDay() === dow && t > nowMs + gapH * H) return t;
    }
    return nowMs + 7 * D;
  };
  const lastDow = (dow: number, hour: number) => {
    for (let i = 0; i < 14; i++) {
      const t = startOfDay(nowMs - i * D) + hour * H;
      if (new Date(t).getDay() === dow && t < nowMs - H) return t;
    }
    return nowMs - 7 * D;
  };

  /* ---------- People ---------- */
  const users: User[] = [];
  const person = (
    id: string, fullName: string, provider: Provider, email: string, area: string, travelKm: number,
    activities: [string, Level][], slots: string[], lookingFor: string, extra: Partial<User> = {},
  ) => {
    users.push({
      id, provider, email, fullName, givenName: fullName.split(" ")[0]!, photo: `/avatars/${id}.webp`, area, travelKm,
      activities: activities.map(([name, level]) => ({ name, level })), slots, lookingFor,
      termsAcceptedAt: iso(nowMs - 120 * D), createdAt: iso(nowMs - 120 * D), seed: true, ...extra,
    });
  };

  // Personas
  person("arjun", "Ashwin Santiago", "google", "ashwin.santiago@gmail.com", "Burnaby", 25, [["Badminton", "advanced"], ["Bowling", "intermediate"]],
    ["tue-evening", "thu-evening", "sat-morning", "sun-morning"], "Someone at an advanced level for a regular weekly game. Happy to split court costs.", { persona: true });
  person("claire", "Elena Owens", "facebook", "elena.owens@outlook.com", "Victoria", 15, [["Pickleball", "beginner"], ["Hiking", "intermediate"]],
    ["wed-evening", "sat-morning", "sat-afternoon", "sun-morning"], "Someone patient and friendly to learn pickleball with. Weekend hikes too.", { persona: true });
  person("nadia", "Nala Goins", "google", "nala.goins@gmail.com", "New Westminster", 15, [["Badminton", "intermediate"], ["Hiking", "intermediate"]],
    ["mon-evening", "thu-evening", "sat-morning", "sun-morning"], "A reliable fourth for Thursday doubles at my court in New West. Occasional weekend hikes.", { persona: true });

  // Lower Mainland community
  person("priya", "Priya Shepard", "google", "priya.shepard@gmail.com", "Vancouver", 25, [["Badminton", "advanced"], ["Running", "beginner"]],
    ["tue-evening", "thu-evening", "sat-morning"], "Competitive singles or doubles. I book courts at Hillcrest most weeks.");
  person("marcus", "Marco Gross", "google", "marco.gross@gmail.com", "Burnaby", 15, [["Badminton", "intermediate"], ["Tennis", "intermediate"]],
    ["mon-evening", "tue-evening", "sun-afternoon"], "Friendly games after work. Always up for doubles.");
  person("daniel", "Danyal Lester", "facebook", "danyal.lester@yahoo.ca", "Coquitlam", 25, [["Badminton", "intermediate"]],
    ["tue-evening", "thu-evening", "sat-afternoon"], "Working on my game and keen to play people a bit better than me.", { createdAt: iso(nowMs - 6 * D) });
  person("lena", "Lana Steiner", "google", "lana.steiner@gmail.com", "New Westminster", 10, [["Badminton", "intermediate"], ["Yoga", "beginner"]],
    ["wed-evening", "thu-evening"], "Regular doubles, nothing too serious.");
  person("tomas", "Noah Pierre", "x", "noah.pierre@proton.me", "Burnaby", 15, [["Badminton", "intermediate"], ["Climbing", "beginner"]],
    ["thu-evening", "fri-evening", "sat-afternoon"], "Doubles when my shifts allow, and a climbing partner for the bouldering gym.");
  person("ravi", "Ali Mahdi", "google", "ali.mahdi@gmail.com", "Burnaby", 25, [["Badminton", "advanced"], ["Tennis", "advanced"], ["Cricket", "intermediate"]],
    ["thu-evening", "sat-afternoon", "sun-afternoon"], "Fast games and a cricket net session now and then.", { quiet: true });
  person("mei", "Rhea Levine", "google", "rhea.levine@gmail.com", "Richmond", 15, [["Pickleball", "intermediate"], ["Table tennis", "advanced"]],
    ["wed-evening", "sat-morning", "sun-morning"], "Weekend pickleball doubles. Patient with newer players.");
  person("ben", "Liam Hood", "facebook", "liam.hood@hotmail.com", "Vancouver", 15, [["Pickleball", "beginner"], ["Board games", "intermediate"]],
    ["fri-evening", "sat-morning", "sun-afternoon"], "Learning pickleball and always keen for a board game night.");
  person("jordan", "Jordan Burgess", "x", "jordan.burgess@gmail.com", "North Vancouver", 25, [["Hiking", "advanced"], ["Running", "intermediate"]],
    ["tue-morning", "sat-morning", "sun-morning"], "Early starts on the North Shore trails.");
  person("sofia", "Sophia Perez", "google", "sophia.perez@gmail.com", "Vancouver", 10, [["Running", "intermediate"], ["Hiking", "beginner"]],
    ["tue-morning", "thu-morning", "sat-morning"], "A running buddy for the seawall before work.");
  person("kenji", "Nicolas Wang", "google", "nicolas.wang@gmail.com", "Vancouver", 10, [["Climbing", "intermediate"], ["Chess", "intermediate"]],
    ["mon-evening", "wed-evening", "sun-afternoon"], "Bouldering partner who wants to push grades together.");
  person("aisha", "Aysha Becker", "google", "aysha.becker@gmail.com", "Surrey", 15, [["Tennis", "beginner"], ["Yoga", "intermediate"]],
    ["wed-evening", "sat-afternoon"], "Just picked up a racquet. Looking for someone patient to rally with.", { createdAt: iso(nowMs - 3 * D) });

  // Greater Victoria community
  person("hannah", "Isobel Fuller", "google", "isobel.fuller@gmail.com", "Victoria", 15, [["Pickleball", "beginner"], ["Hiking", "beginner"]],
    ["wed-evening", "sat-morning"], "Relaxed pickleball, still learning the rules.");
  person("owen", "Owen Harding", "facebook", "owen.harding@shaw.ca", "Saanich", 15, [["Hiking", "intermediate"], ["Cycling", "intermediate"]],
    ["sat-morning", "sun-morning"], "Weekend hikes around the peninsula.");
  person("grace", "Katy Fuller", "google", "katy.fuller@gmail.com", "Victoria", 10, [["Pickleball", "intermediate"]],
    ["wed-evening", "sat-afternoon", "sun-morning"], "New to Victoria and keen to find a regular game.", { createdAt: iso(nowMs - 2 * D) });

  /* ---------- Meetups, attendees and outcomes ---------- */
  const meetups: Meetup[] = [];
  const attendees: Attendee[] = [];
  const outcomes: Outcome[] = [];
  let n = 0;
  const mid = () => `m${++n}`;

  /** Seeded tags: deterministic per reporter and subject, roughly three in four ratings carry each tag. */
  const TAG_IDS: TagId[] = ["level", "company", "on_time"];
  const tagsFor = (key: string, rating: number): TagId[] => {
    if (rating < 4) return [];
    let h = 0;
    for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return TAG_IDS.filter((_, i) => ((h >> (i * 3)) & 3) !== 0);
  };
  /** A past meetup with outcome reports. `skipReporter` leaves that person's own report missing, which triggers their prompt. */
  const past = (
    type: Meetup["type"], startsAt: number, activity: string, place: string,
    people: { id: string; role: Attendee["role"]; show?: boolean }[],
    ratings: Record<string, number> = {}, skipReporter?: string, spots = 0, level?: GroupLevel,
  ) => {
    const id = mid();
    meetups.push({ id, type, createdBy: people[0]!.id, activity, startsAt: iso(startsAt), place, note: "", spots, status: "scheduled", createdAt: iso(startsAt - 5 * D), ...(level ? { level } : {}) });
    for (const p of people) attendees.push({ meetupId: id, userId: p.id, role: p.role, status: "accepted", at: iso(startsAt - 5 * D), respondedAt: iso(startsAt - 4 * D) });
    for (const r of people) {
      if (r.id === skipReporter) continue;
      const rShowed = r.show !== false;
      for (const s of people) {
        if (s.id === r.id) continue;
        const sShowed = s.show !== false;
        if (!rShowed) {
          outcomes.push({ meetupId: id, reporter: r.id, subject: s.id, happened: false, reason: "i_cancelled" as OutcomeReason, at: iso(startsAt + 2 * H) });
        } else if (!sShowed) {
          outcomes.push({ meetupId: id, reporter: r.id, subject: s.id, happened: false, reason: "no_show", at: iso(startsAt + 2 * H) });
        } else {
          const rating = ratings[`${r.id}>${s.id}`] ?? ratings[s.id] ?? 5;
          outcomes.push({ meetupId: id, reporter: r.id, subject: s.id, happened: true, rating, tags: tagsFor(`${id}${r.id}${s.id}`, rating), at: iso(startsAt + 2 * H) });
        }
      }
    }
    return id;
  };
  const one = (a: string, b: string, daysAgo: number, activity: string, place: string, r: Record<string, number> = {}, show: Record<string, boolean> = {}, skip?: string, hour = 19) =>
    past("one_to_one", at(daysAgo, hour), activity, place, [{ id: a, role: "creator", show: show[a] }, { id: b, role: "invitee", show: show[b] }], r, skip);

  // Ashwin: showed up to 8 of 9, one old no show (shift change), rated by 8
  one("arjun", "priya", 56, "Badminton", "Hillcrest Centre", { arjun: 5, priya: 5 });
  one("priya", "arjun", 49, "Badminton", "Hillcrest Centre", { arjun: 4 });
  one("marcus", "arjun", 42, "Badminton", "Bonsor Recreation Complex", { arjun: 5, marcus: 4 });
  one("tomas", "arjun", 35, "Badminton", "Edmonds Community Centre", { arjun: 5, tomas: 4 });
  one("ravi", "arjun", 30, "Badminton", "Bonsor Recreation Complex", {}, { arjun: false });
  one("arjun", "priya", 28, "Badminton", "Hillcrest Centre", { arjun: 5, priya: 5 });
  one("marcus", "arjun", 21, "Badminton", "Bonsor Recreation Complex", { arjun: 4, marcus: 5 });
  one("arjun", "marcus", 14, "Badminton", "Bonsor Recreation Complex", { arjun: 5, marcus: 4 });
  // Yesterday with Priya: Priya has answered, Ashwin has not, so Ashwin's prompt is waiting
  const yesterday = one("priya", "arjun", 1, "Badminton", "Hillcrest Centre, court 3", { arjun: 4 }, {}, "arjun");

  // Priya, Marco, Ali, Noah, Nicolas extra history
  one("priya", "marcus", 60, "Badminton", "Hillcrest Centre", { priya: 5, marcus: 4 });
  one("marcus", "priya", 45, "Badminton", "Hillcrest Centre", { priya: 5, marcus: 4 });
  one("priya", "ravi", 38, "Badminton", "Hillcrest Centre", { priya: 5, ravi: 5 });
  one("ravi", "priya", 17, "Badminton", "Hillcrest Centre", { priya: 4, ravi: 5 });
  one("tomas", "marcus", 50, "Badminton", "Edmonds Community Centre", {}, { marcus: false });
  one("kenji", "tomas", 33, "Climbing", "The Hive Vancouver", { kenji: 5, tomas: 5 }, {}, undefined, 18);
  one("tomas", "kenji", 12, "Climbing", "The Hive Vancouver", { kenji: 4, tomas: 5 }, {}, undefined, 18);
  one("mei", "ben", 40, "Pickleball", "Minoru Park courts", { mei: 5, ben: 5 }, {}, undefined, 10);
  one("ben", "mei", 26, "Pickleball", "Minoru Park courts", { mei: 5, ben: 4 }, {}, undefined, 10);
  one("mei", "ben", 9, "Pickleball", "Minoru Park courts", { mei: 4, ben: 5 }, {}, undefined, 10);
  one("jordan", "sofia", 24, "Hiking", "Lynn Canyon Park", { jordan: 5, sofia: 5 }, {}, undefined, 8);

  // Nala's Thursday doubles, weekly. Noah missed one after his shifts changed.
  const lastThu = lastDow(4, 19);
  past("group", lastThu - 21 * D, "Badminton", "Queen's Park Arena, court 2",
    [{ id: "nadia", role: "creator" }, { id: "lena", role: "invitee" }, { id: "tomas", role: "invitee" }, { id: "marcus", role: "joiner" }], { "lena>nadia": 5, "marcus>tomas": 4 }, undefined, 1, "intermediate");
  past("group", lastThu - 14 * D, "Badminton", "Queen's Park Arena, court 2",
    [{ id: "nadia", role: "creator" }, { id: "lena", role: "invitee" }, { id: "tomas", role: "invitee", show: false }, { id: "marcus", role: "joiner" }], { "marcus>nadia": 4 }, undefined, 1, "intermediate");
  past("group", lastThu - 7 * D, "Badminton", "Queen's Park Arena, court 2",
    [{ id: "nadia", role: "creator" }, { id: "lena", role: "invitee" }, { id: "tomas", role: "invitee" }, { id: "ravi", role: "joiner" }], { "ravi>lena": 4 }, undefined, 1, "intermediate");
  // Last Thursday: everyone else has answered. Nala's group prompt is waiting.
  const lastGroup = past("group", lastThu, "Badminton", "Queen's Park Arena, court 2",
    [{ id: "nadia", role: "creator" }, { id: "lena", role: "invitee" }, { id: "tomas", role: "invitee" }, { id: "marcus", role: "joiner" }], { "marcus>tomas": 4 }, "nadia", 1, "intermediate");
  one("nadia", "jordan", 40, "Hiking", "Buntzen Lake", { nadia: 5, jordan: 5 }, {}, undefined, 9);
  one("jordan", "nadia", 20, "Hiking", "Quarry Rock, Deep Cove", { nadia: 5, jordan: 4 }, {}, undefined, 8);

  // Elena: showed up to 3 of 3
  one("hannah", "claire", 21, "Pickleball", "Cedar Hill Recreation Centre", { claire: 5, hannah: 5 }, {}, undefined, 10);
  one("owen", "claire", 14, "Hiking", "Mount Douglas Park", { claire: 4, owen: 5 }, {}, undefined, 9);
  one("claire", "hannah", 7, "Pickleball", "Cedar Hill Recreation Centre", { claire: 5, hannah: 5 }, {}, undefined, 10);
  one("owen", "hannah", 30, "Hiking", "Thetis Lake Park", { owen: 5, hannah: 5 }, {}, undefined, 9);

  /* ---------- Upcoming plans ---------- */
  const future = (m: Omit<Meetup, "id" | "createdAt" | "note" | "spots" | "status"> & Partial<Meetup>, people: Omit<Attendee, "meetupId">[]) => {
    const id = mid();
    meetups.push({ id, note: "", spots: 0, status: "scheduled", createdAt: iso(nowMs - 2 * D), ...m });
    for (const p of people) attendees.push({ meetupId: id, ...p });
    return id;
  };
  const accepted = (userId: string, role: Attendee["role"], daysAgo = 2): Omit<Attendee, "meetupId"> =>
    ({ userId, role, status: "accepted", at: iso(nowMs - daysAgo * D), respondedAt: iso(nowMs - daysAgo * D + H) });

  const nextTue = nextDow(2, 20);
  const arjunMarcus = future({ type: "one_to_one", createdBy: "marcus", activity: "Badminton", startsAt: iso(nextTue), place: "Bonsor Recreation Complex, court 1", note: "I'll book the court.", connectionId: "c-arjun-marcus" },
    [accepted("marcus", "creator"), accepted("arjun", "invitee")]);

  const nextThu = nextDow(4, 19);
  const thursday = future({ type: "group", createdBy: "nadia", activity: "Badminton", startsAt: iso(nextThu), place: "Queen's Park Arena, court 2", note: "Doubles, 7 to 9. Court is paid for, split between us.", spots: 2, level: "intermediate", createdAt: iso(nowMs - 2 * D) },
    [accepted("nadia", "creator"), accepted("lena", "invitee"),
      { userId: "tomas", role: "invitee", status: "invited", at: iso(nowMs - 2 * D) },
      { userId: "daniel", role: "joiner", status: "requested", note: "I'm intermediate and free Thursday evenings. Would love to fill in.", at: iso(nowMs - 5 * H) }]);

  const nextSat = nextDow(6, 10);
  future({ type: "group", createdBy: "mei", activity: "Pickleball", startsAt: iso(nextSat), place: "Minoru Park courts, Richmond", note: "Friendly doubles. Spare paddles available.", spots: 2, level: "intermediate" },
    [accepted("mei", "creator"), accepted("ben", "invitee")]);
  const nextSun = nextDow(0, 8);
  future({ type: "group", createdBy: "jordan", activity: "Hiking", startsAt: iso(nextSun), place: "Lynn Canyon Park, main lot", note: "Moderate pace, about 3 hours. Bring water.", spots: 3, level: "all" },
    [accepted("jordan", "creator"), accepted("sofia", "invitee")]);

  // Elena: Isobel has proposed Saturday pickleball, waiting for Elena. Owen and Elena are set for Sunday.
  const hannahProposal = future({ type: "one_to_one", createdBy: "hannah", activity: "Pickleball", startsAt: iso(nextDow(6, 10, 20)), place: "Cedar Hill Recreation Centre", note: "Beginner friendly. I'll bring a spare paddle.", status: "proposed", connectionId: "c-claire-hannah", createdAt: iso(nowMs - 3 * H) },
    [accepted("hannah", "creator", 0), { userId: "claire", role: "invitee", status: "invited", at: iso(nowMs - 3 * H) }]);
  future({ type: "one_to_one", createdBy: "owen", activity: "Hiking", startsAt: iso(nextDow(0, 9, 20)), place: "Mount Douglas Park, main lot", connectionId: "c-claire-owen" },
    [accepted("owen", "creator"), accepted("claire", "invitee")]);

  /* ---------- Connections ---------- */
  const connections: Connection[] = [];
  const conn = (id: string, from: string, to: string, daysAgo: number, status: Connection["status"] = "accepted", note = "") =>
    connections.push({ id, from, to, status, note, requestedAt: iso(nowMs - daysAgo * D), ...(status !== "pending" ? { respondedAt: iso(nowMs - daysAgo * D + 2 * H) } : {}) });
  conn("c-arjun-priya", "priya", "arjun", 60, "accepted", "Saw you're advanced too. Fancy a proper game?");
  conn("c-arjun-marcus", "arjun", "marcus", 45);
  conn("c-arjun-tomas", "tomas", "arjun", 37);
  conn("c-arjun-ravi", "arjun", "ravi", 32);
  conn("c-daniel-arjun", "daniel", "arjun", 0.2, "pending", "Saw you play at an advanced level. I'm working my way up. Would you be up for a rally sometime?");
  conn("c-priya-marcus", "priya", "marcus", 62);
  conn("c-priya-ravi", "ravi", "priya", 40);
  conn("c-nadia-lena", "nadia", "lena", 90);
  conn("c-nadia-tomas", "tomas", "nadia", 80);
  conn("c-nadia-jordan", "jordan", "nadia", 45);
  conn("c-tomas-kenji", "kenji", "tomas", 35);
  conn("c-mei-ben", "ben", "mei", 42);
  conn("c-jordan-sofia", "sofia", "jordan", 26);
  conn("c-claire-hannah", "hannah", "claire", 25, "accepted", "Also a pickleball beginner! Want to learn together?");
  conn("c-claire-owen", "claire", "owen", 16);
  conn("c-hannah-owen", "owen", "hannah", 32);
  conn("c-grace-claire", "grace", "claire", 0.1, "pending", "I'm new to Victoria and just getting into pickleball. Fancy a game this weekend?");

  /* ---------- Messages ---------- */
  const messages: Message[] = [];
  let mn = 0;
  const msg = (thread: string, from: string, ms: number, body: string) => messages.push({ id: `x${++mn}`, thread, from, body, at: iso(ms) });
  const y = at(1, 19);
  msg("c:c-arjun-priya", "priya", y - 2 * D, "Court 3 at Hillcrest is booked for tomorrow at 7. Still good for you?");
  msg("c:c-arjun-priya", "arjun", y - 2 * D + 40 * 60_000, "Yes, I'll be there. I'll bring shuttles.");
  msg("c:c-arjun-priya", "priya", y - 2 * D + 55 * 60_000, "Perfect. Singles first, then doubles if the others show.");
  msg("c:c-arjun-priya", "priya", y + 2.5 * H, "Great games tonight! Same time next week?");
  msg("c:c-arjun-marcus", "marcus", nowMs - 2 * D - 3 * H, "Tuesday at 8 at Bonsor? I'll book court 1.");
  msg("c:c-arjun-marcus", "arjun", nowMs - 2 * D - 2 * H, "Works for me. Sent you the meetup so it's locked in.");
  msg("c:c-arjun-tomas", "tomas", nowMs - 20 * D, "Shifts are all over the place this month, but I'm keen for a game when they settle.");
  msg("c:c-arjun-ravi", "arjun", nowMs - 29 * D, "Sorry again about missing our game. Work ran late and I couldn't get away.");
  msg("c:c-arjun-ravi", "ravi", nowMs - 29 * D + 3 * H, "No worries, it happens.");
  msg("c:c-claire-hannah", "hannah", nowMs - 6 * D, "That was fun on Saturday! I think I finally get the kitchen rule.");
  msg("c:c-claire-hannah", "claire", nowMs - 6 * D + H, "Ha, me too. Same time next week?");
  msg("c:c-claire-hannah", "hannah", nowMs - 3 * H, "Sent you a proposal for Saturday. Let me know if the time works.");
  msg("c:c-claire-owen", "owen", nowMs - 2 * D, "Mount Doug on Sunday? Main lot at 9.");
  msg("c:c-claire-owen", "claire", nowMs - 2 * D + 2 * H, "Sounds great, see you there.");
  msg("c:c-nadia-lena", "lena", nowMs - 4 * D, "Same court Thursday?");
  msg("c:c-nadia-lena", "nadia", nowMs - 4 * D + H, "Yes! Setting up the group now.");
  msg("c:c-nadia-jordan", "jordan", nowMs - 10 * D, "Thinking about Quarry Rock again soon if you're up for it.");
  msg(`m:${thursday}`, "nadia", nowMs - 2 * D, "Court is booked for Thursday. Noah, let me know if your shift works out.");
  msg(`m:${thursday}`, "lena", nowMs - 2 * D + H, "Count me in as usual!");
  msg(`m:${thursday}`, "nadia", nowMs - 1 * D, "Posted an open spot in case Noah can't make it.");
  msg(`m:${lastGroup}`, "lena", lastThu + 2.5 * H, "Good games everyone. Same again next week.");

  const reads: Record<string, string> = {};
  // Everything is read except Priya's latest message to Ashwin
  for (const c of connections) for (const u of [c.from, c.to]) reads[`${u}|c:${c.id}`] = iso(nowMs - 1 * D - 6 * H);
  reads["arjun|c:c-arjun-priya"] = iso(y);
  reads["arjun|c:c-arjun-marcus"] = iso(nowMs);
  reads["claire|c:c-claire-hannah"] = iso(nowMs - 4 * H);
  reads["claire|c:c-claire-owen"] = iso(nowMs);
  reads["nadia|c:c-nadia-lena"] = iso(nowMs);
  reads["nadia|c:c-nadia-jordan"] = iso(nowMs);
  reads[`nadia|m:${thursday}`] = iso(nowMs);
  reads[`nadia|m:${lastGroup}`] = iso(nowMs);

  void yesterday; void arjunMarcus; void hannahProposal;

  return {
    v: 5,
    seededAt: now.toISOString(),
    session: null,
    users,
    activities: [...CURATED_ACTIVITIES, "Cricket"],
    connections,
    messages,
    meetups,
    attendees,
    outcomes,
    reads,
    arrivals: {},
    events: [],
  };
}
