import { useEffect, useState, type ReactNode } from "react";
import { UsersThree, ChatsCircle, CalendarDots, UserCircle, type Icon } from "@phosphor-icons/react";
import { runBots } from "@/lib/bots";
import { cn } from "@/lib/cn";
import { threadOf, type State } from "@/lib/model";
import { attendeesOf, dueOutcome, missingStep, relationFor } from "@/lib/rules";
import { Link, match, navigate, usePath } from "@/lib/router";
import { me as getMe, useStore } from "@/lib/store";
import { ToastHost } from "@/components/ui";
import { OutcomePrompt } from "@/components/OutcomePrompt";
import { Landing, LogIn, SignUp } from "@/screens/SignUp";
import { Wizard } from "@/screens/Wizard";
import { Matches, OpenSpots } from "@/screens/Matches";
import { Person } from "@/screens/Person";
import { Chats } from "@/screens/Chats";
import { Thread } from "@/screens/Thread";
import { Meetups } from "@/screens/Meetups";
import { NewGroup } from "@/screens/NewGroup";
import { MeetupDetail } from "@/screens/MeetupDetail";
import { Profile } from "@/screens/Profile";

/** Unseen requests and unread threads (Chats), and anything waiting on my reply (Meetups). PRD R16. */
export function badges(s: State, uid: string) {
  const incoming = s.connections.filter((c) => c.status === "pending" && c.to === uid && !c.held && relationFor(s, uid, c.from).kind === "incoming").length;
  const unreadThread = (thread: string) => {
    const read = s.reads[`${uid}|${thread}`] ?? "";
    return s.messages.some((m) => m.thread === thread && m.from !== uid && m.at > read);
  };
  const oneToOne = s.connections.filter((c) => (c.from === uid || c.to === uid) && (c.status === "accepted" || c.status === "disconnected") && unreadThread(threadOf.connection(c.id))).length;
  const groups = s.meetups.filter((m) => m.type === "group" && m.status === "scheduled" && attendeesOf(s, m.id).some((a) => a.userId === uid && a.status === "accepted") && unreadThread(threadOf.meetup(m.id))).length;
  const now = Date.now();
  const toAnswer = s.attendees.filter((a) => {
    if (a.userId !== uid || a.status !== "invited") return false;
    const m = s.meetups.find((x) => x.id === a.meetupId);
    return !!m && m.status !== "cancelled" && m.status !== "declined" && new Date(m.startsAt).getTime() > now;
  }).length;
  const joinRequests = s.attendees.filter((a) => a.status === "requested" && s.meetups.some((m) => m.id === a.meetupId && m.createdBy === uid && m.status === "scheduled" && new Date(m.startsAt).getTime() > now)).length;
  return { chats: incoming + oneToOne + groups, meetups: toAnswer + joinRequests };
}

const TABS: { to: string; label: string; icon: Icon; key?: "chats" | "meetups" }[] = [
  { to: "/matches", label: "Matches", icon: UsersThree },
  { to: "/chats", label: "Chats", icon: ChatsCircle, key: "chats" },
  { to: "/meetups", label: "Meetups", icon: CalendarDots, key: "meetups" },
  { to: "/profile", label: "Profile", icon: UserCircle },
];

function TabBar({ path, counts }: { path: string; counts: { chats: number; meetups: number } }) {
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-surface/95 pb-safe backdrop-blur">
      <div className="mx-auto grid max-w-[600px] grid-cols-4">
        {TABS.map((t) => {
          const active = path.startsWith(t.to);
          const n = t.key ? counts[t.key] : 0;
          const I = t.icon;
          return (
            <Link key={t.to} to={t.to} aria-current={active ? "page" : undefined}
              className={cn("flex h-[var(--tabbar-h)] flex-col items-center justify-center gap-[2px] t-caption font-bold", active ? "text-brand-700" : "text-ink-2")}>
              <span className="relative">
                <I size={24} weight={active ? "fill" : "regular"} aria-hidden />
                {n > 0 && (
                  <span className="absolute -right-3 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 t-caption font-bold text-white">
                    {n > 9 ? "9+" : n}<span className="sr-only"> new</span>
                  </span>
                )}
              </span>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function App() {
  const s = useStore();
  const path = usePath();
  const me = getMe(s);
  // The blocking prompt stays open through its own thank you step, then the next due meetup (if any) follows
  const [prompt, setPrompt] = useState<string | null>(null);
  const dueId = me && !path.startsWith("/setup") ? dueOutcome(s, me.id)?.id ?? null : null;
  useEffect(() => { if (!prompt && dueId) setPrompt(dueId); }, [prompt, dueId]);
  useEffect(() => { if (!me) setPrompt(null); }, [me]);

  // Seeded people respond while the app is open
  useEffect(() => {
    if (!s.session) return;
    runBots();
    const i = window.setInterval(() => runBots(), 1000);
    return () => window.clearInterval(i);
  }, [s.session]);

  // Nothing is visible without an account, including by direct link (PRD S1.1)
  useEffect(() => {
    if (!me && path !== "/" && path !== "/signup" && path !== "/login") navigate("/", { replace: true });
    if (me && (path === "/" || path === "/signup" || path === "/login")) {
      const step = missingStep(me);
      navigate(step ? `/setup/${step}` : "/matches", { replace: true });
    }
  }, [me, path]);

  if (!me) return <>{path === "/signup" ? <SignUp /> : path === "/login" ? <LogIn /> : <Landing />}<ToastHost aboveTabs={false} /></>;

  let screen: ReactNode = null;
  let tabs = false;
  let p: Record<string, string> | null;
  if ((p = match("/setup/:step", path))) screen = <Wizard step={p["step"]!} />;
  else if (path === "/matches/spots") screen = <OpenSpots />;
  else if (path.startsWith("/matches")) { screen = <Matches />; tabs = true; }
  else if ((p = match("/people/:id", path))) screen = <Person key={p["id"]} id={p["id"]!} />;
  else if (path === "/chats") { screen = <Chats />; tabs = true; }
  else if ((p = match("/chats/:id", path))) screen = <Thread key={p["id"]} id={p["id"]!} />;
  else if (path === "/meetups") { screen = <Meetups />; tabs = true; }
  else if (path.split("?")[0] === "/meetups/new") screen = <NewGroup />;
  else if ((p = match("/meetups/:id", path))) screen = <MeetupDetail key={p["id"]} id={p["id"]!} />;
  else if (path === "/profile") { screen = <Profile />; tabs = true; }

  const shown = prompt ? s.meetups.find((m) => m.id === prompt) : undefined;
  const counts = badges(s, me.id);

  return (
    <div className={cn("min-h-dvh", tabs && "pb-[calc(var(--tabbar-h)+var(--sab))]")}>
      {screen}
      {tabs && <TabBar path={path} counts={counts} />}
      {shown && <OutcomePrompt key={shown.id} meetup={shown} onDone={() => setPrompt(null)} />}
      <ToastHost aboveTabs={tabs} />
    </div>
  );
}

