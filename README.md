# Find My Buddy: clickable prototype

Team Knife MVP demo. Covers Phases 1 to 4 of `Find-My-Buddy-PRD.md` (one to one loop plus group meetups), built on the locked design system (`DESIGN.md`, `tokens.json`). Mock data, simulated sign in, shown inside an iPhone 14 Pro Max frame.

## Run it

Needs Node 20.19 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:5173. On a laptop the app sits inside an iPhone 14 Pro Max frame (430 x 932). On a phone on the same Wi Fi, open the Network address Vite prints, and the app fills the screen.

Other commands: `npm test` (product rule tests), `npm run build` (static build in `dist/`), `npm run typecheck`.

Under the phone: **Reset demo data** restores the storyline, and **Open without the frame** shows the bare app.

## Share it as a link (Netlify Drop)

1. In the project folder, run `npm run build`. This creates a `dist` folder.
2. Go to https://app.netlify.com/drop and drag the `dist` folder onto the page.
3. Netlify gives you a public link right away. Log in to a free Netlify account first, or claim the site when Netlify prompts you, so the site is kept and you can update it. Drops made without an account are temporary.
4. To update the link after changes, run `npm run build` again, then in Netlify open the site, go to Deploys, and drag the new `dist` folder there.

What viewers get:

- **On a phone or tablet:** the app fills the screen, in any orientation, and they can tap through it like the real app.
- **On a laptop:** the app shows inside the iPhone frame. Add `?noframe=1` to the link to remove the frame, or `?frame=1` to force it.
- **Their own demo:** each person's data stays on their own device, so viewers don't affect each other. They can use "Reset demo data" at the bottom of the sign up screen or in Profile.

## Demo accounts

Everyone in the demo has a photo from the Untitled UI avatar library, and their first name matches the photo's file name.

Tick the 18+ box, choose a provider, then pick an account on the simulated provider screen.

| Account | Provider | What it shows |
| :-- | :-- | :-- |
| New account ("Use another account") | Any | Sign up, the 6 step wizard, the findability banner, matches, open spots. About 12 seconds after the profile becomes findable, a nearby member sends a request. |
| Ashwin (advanced badminton, Burnaby) | Google | The blocking post meetup prompt for yesterday's game with Priya, then the attendance mark filling in. Also: unread chat, an incoming request from Danyal, a scheduled meetup with Marco, and Nala's open spot in his matches. |
| Elena (beginner pickleball, Victoria) | Facebook | No prompt. Isobel's proposal to accept (scheduled celebration), a request from Katy (new member), and a scheduled hike with Owen to try Disconnect. |
| Nala (badminton host, New Westminster) | Google | The group outcome prompt for last Thursday (mark and rate three people in one pass). Then Thursday doubles: Danyal asking to join, Noah not replied yet, two open spots. |

Seeded members respond on their own while the app is open: they accept requests (Ali never answers, to show the pending state), reply in chat, accept proposals and invites, and hosts accept join requests. This exists only so one person can run the demo.

Data is kept in the browser, so it survives a refresh. Seeded times are relative to when the data was created, and the data rebuilds itself after 24 hours. **Reset before each demo.**

## Suggested 5 minute demo

1. Start as a new member: sign up, run the wizard (try typing "badmington" to show duplicate prevention), then wait for the incoming request.
2. Accept it, chat, propose a meetup. Watch it get accepted with the scheduled celebration.
3. Sign out and sign in as Ashwin. Answer the blocking prompt and show the attendance mark filling in. Show his reliability on his profile.
4. Sign in as Nala. Answer the group prompt, accept Danyal's join request and show the spots count drop.
5. Optional: as Elena, disconnect from Owen with "Don't let Owen send me requests again".

## How it maps to the PRD

| PRD | Where |
| :-- | :-- |
| R1 to R3 sign up, OAuth only, duplicate email by provider | `screens/SignUp.tsx`, `lib/actions.ts` signIn |
| R4 to R9 wizard, BC only, growing activity list, findability | `screens/Wizard.tsx`, `lib/rules.ts` |
| R10 to R14 matches, filters, three empty states, reliability | `screens/Matches.tsx`, `components/cards.tsx` |
| R15 to R18 requests, badges, toasts, chat | `screens/Person.tsx`, `screens/Chats.tsx`, `screens/Thread.tsx` |
| R19 to R25 meetups, cancel, blocking prompt, disconnect | `components/MeetupCard.tsx`, `components/OutcomePrompt.tsx` |
| R26 instrumentation | Every action records an event in `state.events` |
| R27 to R31 group meetups | `screens/NewGroup.tsx`, `screens/MeetupDetail.tsx`, open spots in Matches |

## Calls made where the docs were open (for the team to confirm)

1. **Don't let this person request again** (PRD 3.5 mitigation) is built as an optional checkbox on Disconnect. A blocked person's new request looks sent to them and never reaches you.
2. **A group meetup is on as soon as the host posts it.** Invitees then accept one by one (PRD S7.1).
3. **Withdrawal reopens the slot** (S7.5, proposed). An invitee who withdraws turns their place into an open spot.
4. **A declined connection request quietly returns** to "no request" for the sender (S4.3, proposed).
5. **"We rescheduled", "I cancelled" and "They cancelled"** don't count for or against attendance. Only "They didn't show" counts as a miss.
6. **Group "didn't happen" reasons** leave out "They didn't show", because per person attendance is marked in the "yes" path.
7. **No name step in the wizard.** The given name comes from the provider (S1.2).
8. **"Finish later" on the wizard** lets someone browse with the hidden profile banner (S2.8).
9. **Location** uses a fixed list of 21 BC places, standing in for the postal code dataset (still an open PRD item).

## Not in this prototype

Real OAuth, a backend, push or email, desktop list and detail layout (the demo is phone first), photo storage beyond the browser, and moderation tooling, which is out of scope per the PRD.

## Stack

Vite, React 19, TypeScript, Tailwind CSS v4, and Phosphor icons. There is no router or UI kit dependency: a small hash router, dialog and toasts are in `src/lib` and `src/components`.
