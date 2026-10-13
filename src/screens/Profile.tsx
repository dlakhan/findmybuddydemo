/* Your own profile and details, including your own reliability signal (PRD S9.4, R22; screen review 11). */
import type { ReactNode } from "react";
import { PencilSimple, SignOut, Eye } from "@phosphor-icons/react";
import { SlotGrid } from "@/components/cards";
import { TabPage } from "@/components/layout";
import { Avatar, Btn, Card, ReliabilitySignal } from "@/components/ui";
import { ResetDemo } from "@/components/ResetDemo";
import { signOut } from "@/lib/actions";
import { CONTACT_EMAIL, type WizardStep } from "@/lib/data";
import { levelLabel, reliabilityOf, tagCounts } from "@/lib/rules";
import { Link, navigate } from "@/lib/router";
import { me as getMe, useStore } from "@/lib/store";

/** The whole card is the edit target, with a small pencil in the corner (screen review 11). */
function EditCard({ step, label, title, children }: { step: WizardStep; label: string; title?: string; children: ReactNode }) {
  return (
    <Link to={`/setup/${step}?edit=1`} aria-label={`Edit ${label}`}
      className="relative block rounded-[12px] border border-hairline bg-surface p-4 pr-12 transition-[border-color,transform] duration-150 ease-[var(--ease-out)] hover:border-field active:scale-[0.99]">
      <PencilSimple size={18} className="absolute right-4 top-4 text-brand-600" aria-hidden />
      {title && <h2 className="mb-1 t-label text-ink-2">{title}</h2>}
      {children}
    </Link>
  );
}

const PROVIDER: Record<string, string> = { google: "Google", facebook: "Facebook", x: "X" };

export function Profile() {
  const s = useStore();
  const me = getMe(s)!;
  return (
    <TabPage me={me} title="Your profile" sub="Your details">
      <div className="mt-6 grid gap-4">
        <EditCard step="photo" label="photo">
          <div className="flex items-center gap-4">
            <Avatar name={me.givenName} url={me.photo} size={72} />
            <p className="t-heading">{me.givenName}</p>
          </div>
        </EditCard>

        <Card>
          <p className="mb-2 flex items-center gap-1 t-label text-ink-2"><Eye size={16} aria-hidden />Your reliability, as others see it</p>
          <ReliabilitySignal r={reliabilityOf(me.id, s)} max={10} tags={tagCounts(me.id, s)} />
          <p className="mt-3 t-caption text-ink-muted">Built only from what the people you met reported. You never see who rated you or what they gave.</p>
        </Card>

        <EditCard step="activities" label="activities and levels" title="Activities">
          {me.activities.length ? (
            <ul className="grid gap-1">{me.activities.map((a) => <li key={a.name}><span className="t-strong">{a.name}</span> <span className="t-small text-ink-2">· {levelLabel(a.level)}</span></li>)}</ul>
          ) : <p className="text-ink-2">None yet</p>}
        </EditCard>
        <EditCard step="location" label="area and travel" title="Area and travel">
          <p>{me.area ? `${me.area}, up to ${me.travelKm} km` : "Not set"}</p>
        </EditCard>
        <EditCard step="availability" label="availability" title="Usually free">
          <SlotGrid slots={me.slots} highlight={me.slots} />
        </EditCard>
        <EditCard step="looking" label="looking for" title="Looking for">
          <p className="measure text-ink-2">{me.lookingFor || "Nothing added yet."}</p>
        </EditCard>
        <Card>
          <h2 className="t-label text-ink-2">Your account</h2>
          <p className="mt-1 t-small text-ink-2">Signed in with {PROVIDER[me.provider]} as {me.email}. Only your first name is shown to others.</p>
          <p className="mt-2 t-small text-ink-2">To remove your account, email <a className="text-brand-600 underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
          <Btn variant="secondary" className="mt-4" onClick={() => { signOut(); navigate("/", { replace: true }); }}><SignOut size={20} aria-hidden />Sign out</Btn>
        </Card>
        <ResetDemo />
      </div>
    </TabPage>
  );
}
