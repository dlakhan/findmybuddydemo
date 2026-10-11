/* Product content: curated activities, levels, BC places, availability grid. */

export type Level = "beginner" | "intermediate" | "advanced";
export type Provider = "google" | "facebook" | "x";

/** Curated starting list. The shared list grows when people add activities (PRD 5.3). */
export const CURATED_ACTIVITIES = [
  "Badminton", "Pickleball", "Tennis", "Table tennis", "Squash", "Volleyball", "Basketball", "Soccer",
  "Bowling", "Running", "Hiking", "Cycling", "Climbing", "Swimming", "Yoga", "Golf", "Kayaking", "Skiing",
  "Board games", "Chess", "Pottery", "Photography", "Book club", "Language exchange", "Cooking",
];

export const LEVELS: { id: Level; label: string; hint: string }[] = [
  { id: "beginner", label: "Beginner", hint: "New to it, or getting back into it. Learning the basics." },
  { id: "intermediate", label: "Intermediate", hint: "Comfortable with the basics and play or practise regularly." },
  { id: "advanced", label: "Advanced", hint: "Confident and consistent. You've played competitively or for years." },
];

/** Fixed list of BC places with approximate centres, used only for distance maths. Never an address. */
export const BC_AREAS: { name: string; lat: number; lng: number }[] = [
  { name: "Vancouver", lat: 49.2827, lng: -123.1207 },
  { name: "Burnaby", lat: 49.2488, lng: -122.9805 },
  { name: "Surrey", lat: 49.1913, lng: -122.849 },
  { name: "Richmond", lat: 49.1666, lng: -123.1336 },
  { name: "Coquitlam", lat: 49.2838, lng: -122.7932 },
  { name: "North Vancouver", lat: 49.32, lng: -123.0724 },
  { name: "West Vancouver", lat: 49.3286, lng: -123.1602 },
  { name: "New Westminster", lat: 49.2057, lng: -122.911 },
  { name: "Delta", lat: 49.0847, lng: -123.0587 },
  { name: "Langley", lat: 49.1044, lng: -122.66 },
  { name: "Maple Ridge", lat: 49.2194, lng: -122.5984 },
  { name: "Abbotsford", lat: 49.0504, lng: -122.3045 },
  { name: "Chilliwack", lat: 49.1579, lng: -121.9515 },
  { name: "Squamish", lat: 49.7016, lng: -123.1558 },
  { name: "Whistler", lat: 50.1163, lng: -122.9574 },
  { name: "Victoria", lat: 48.4284, lng: -123.3656 },
  { name: "Saanich", lat: 48.484, lng: -123.381 },
  { name: "Nanaimo", lat: 49.1659, lng: -123.9401 },
  { name: "Kelowna", lat: 49.888, lng: -119.496 },
  { name: "Kamloops", lat: 50.6745, lng: -120.3273 },
  { name: "Prince George", lat: 53.9171, lng: -122.7497 },
];

export const TRAVEL_OPTIONS = [5, 10, 15, 25, 50];

export const DAYS = [
  { id: "mon", short: "Mon" }, { id: "tue", short: "Tue" }, { id: "wed", short: "Wed" },
  { id: "thu", short: "Thu" }, { id: "fri", short: "Fri" }, { id: "sat", short: "Sat" }, { id: "sun", short: "Sun" },
];
export const PARTS = [
  { id: "morning", label: "Morning", plural: "mornings" },
  { id: "afternoon", label: "Afternoon", plural: "afternoons" },
  { id: "evening", label: "Evening", plural: "evenings" },
];

/** Wizard steps. No name step: the given name comes from the sign in provider (PRD S1.2). */
export const WIZARD_STEPS = ["activities", "skill", "location", "availability", "looking", "photo"] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];

export const OUTCOME_REASONS = [
  { id: "i_cancelled", label: "I cancelled" },
  { id: "they_cancelled", label: "They cancelled" },
  { id: "no_show", label: "They didn't show" },
  { id: "rescheduled", label: "We rescheduled" },
] as const;
export type OutcomeReason = (typeof OUTCOME_REASONS)[number]["id"];

export const CONTACT_EMAIL = "privacy@findmybuddy.app";

/** Simple screen for user added activities (PRD 5.3 rule 6). No human review step. */
export const ACTIVITY_BLOCKLIST = ["fuck", "shit", "sex", "porn", "nude", "dating", "hookup", "drugs", "asdf", "qwerty", "test"];
