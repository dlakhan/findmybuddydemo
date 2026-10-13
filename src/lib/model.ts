/* Data model, following PRD section 6.1. Stored in the browser for the prototype; shaped so a real backend can replace it. */
import type { GroupLevel, Level, OutcomeReason, Provider, TagId } from "./data";

export type Activity = { name: string; level: Level | null };

export type User = {
  id: string;
  provider: Provider;
  email: string;
  fullName: string;
  givenName: string;
  photo: string | null; // data URL in the prototype
  area: string; // BC place, shown as approximate area only
  travelKm: number;
  activities: Activity[];
  slots: string[]; // "tue-evening"
  lookingFor: string;
  termsAcceptedAt: string | null;
  createdAt: string;
  /** Seeded community member. Seeded people respond automatically (see bots.ts). */
  seed?: boolean;
  /** Seeded account you can sign in as during the demo. */
  persona?: boolean;
  /** Seeded people who never answer new connection requests, to show the pending state. */
  quiet?: boolean;
};

export type ConnectionStatus = "pending" | "accepted" | "declined" | "disconnected";
export type Connection = {
  id: string;
  from: string; // requested_by
  to: string;
  status: ConnectionStatus;
  note: string;
  requestedAt: string;
  respondedAt?: string;
  disconnectedBy?: string;
  disconnectedAt?: string;
  /** Set by the person who disconnects: do not let this person request again (PRD 3.5 mitigation). */
  noRerequest?: boolean;
  /** A fresh request from someone who was blocked from requesting again. Shown as sent to them, never delivered. */
  held?: boolean;
};

export type Message = { id: string; thread: string; from: string; body: string; at: string };

export type MeetupType = "one_to_one" | "group";
export type MeetupStatus = "proposed" | "scheduled" | "declined" | "cancelled";
export type Meetup = {
  id: string;
  type: MeetupType;
  createdBy: string;
  activity: string;
  startsAt: string;
  place: string; // free text, the product never suggests one
  note: string;
  /** Group only: open slots for people to request. Withdrawals add a slot back. */
  spots: number;
  /** Group only: the level the host is looking for. */
  level?: GroupLevel;
  status: MeetupStatus;
  connectionId?: string;
  cancelledBy?: string;
  cancelNote?: string;
  /** Cancelled because of a disconnect: counts against neither person. */
  cancelledByDisconnect?: boolean;
  createdAt: string;
};

export type AttendeeRole = "creator" | "invitee" | "joiner";
export type AttendeeStatus = "invited" | "requested" | "accepted" | "declined" | "withdrawn";
export type Attendee = {
  meetupId: string;
  userId: string;
  role: AttendeeRole;
  status: AttendeeStatus;
  note?: string;
  at: string;
  respondedAt?: string;
};

export type Outcome = {
  meetupId: string;
  reporter: string;
  subject: string;
  happened: boolean;
  reason?: OutcomeReason;
  rating?: number;
  /** Optional positive tags, only with a rating. */
  tags?: TagId[];
  at: string;
};

export type DemoEvent = { name: string; uid: string | null; at: string; props: Record<string, unknown> };

export type State = {
  v: number;
  seededAt: string;
  session: string | null;
  users: User[];
  activities: string[];
  connections: Connection[];
  messages: Message[];
  meetups: Meetup[];
  attendees: Attendee[];
  outcomes: Outcome[];
  /** Last read time per user per thread: key `${uid}|${thread}` */
  reads: Record<string, string>;
  /** When a newly findable user gets their first incoming request (demo storyline). */
  arrivals: Record<string, string>;
  events: DemoEvent[];
};

export const threadOf = {
  connection: (id: string) => `c:${id}`,
  meetup: (id: string) => `m:${id}`,
};
