/* Your own profile, exactly as others see it, including your own reliability signal (PRD S9.4, R22). */
import { PencilSimple, SignOut, MapPin, Eye } from "@phosphor-icons/react";
import { SlotGrid } from "@/components/cards";
import { TabPage } from "@/components/layout";
import { Avatar, Btn, Card, ReliabilitySignal } from "@/components/ui";
import { ResetDemo } from "@/components/ResetDemo";
import { signOut } from "@/lib/actions";
import { CONTACT_EMAIL, type WizardStep } from "@/lib/data";
import { levelLabel, reliabilityOf } from "@/lib/rules";
import { Link, navigate } from "@/lib/router";
import { me as getMe, useStore } from "@/lib/store";

function Edit({ step, label }: { step: WizardStep; label: string }) {
  return (
    <Link to={`/setup/${step}?edit=1`} className="inline-flex min-h-11 items-center gap-1 t-label text-brand-600 underline underline-offset-4" aria-label={`Edit ${label}`}>
      <PencilSimple size={18} aria-hidden />Edit
    </Link>
  );
}

const PROVIDER: Record<string, string> = { google: "Google", facebook: "Facebook", x: "X" };

export function Profile() {
  const s = useStore();
  const me = getMe(s)!;
  return (
    <TabPage me={me} title="Your profile" sub="This is what other members see.">
      <div className="mt-6 grid gap-4">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-4">
              <Avatar name={me.givenName} url={me.photo} size={72} />
              <div className="min-w-0">
                <p className="t-heading">{me.givenName}</p>
                <p className="flex items-center gap-1 t-small text-ink-2"><MapPin size={16} aria-hidden className="shrink-0" />{me.area || "Area not set"}{me.area && ` · travels up to ${me.travelKm} km`}</p>
              </div>
            </div>
            <Edit step="photo" label="photo" />
          </div>
          <div className="mt-4 border-t border-hairline pt-4">
            <p className="mb-2 flex items-center gap-1 t-label text-ink-2"><Eye size={16} aria-hidden />Your reliability, as others see it</p>
            <ReliabilitySignal r={reliabilityOf(me.id, s)} max={10} />
            <p className="mt-2 t-caption text-ink-muted">Built only from what the people you met reported. You never see who rated you or what they gave.</p>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between"><h2 className="t-label text-ink-2">Activities</h2><Edit step="activities" label="activities" /></div>
          {me.activities.length ? (
            <ul className="grid gap-1">{me.activities.map((a) => <li key={a.name}><span className="t-strong">{a.name}</span> <span className="t-small text-ink-2">· {levelLabel(a.level)}</span></li>)}</ul>
          ) : <p className="text-ink-2">None yet</p>}
          {me.activities.length > 0 && <div className="mt-1"><Link to="/setup/skill?edit=1" className="t-small text-brand-600 underline underline-offset-4">Change levels</Link></div>}
        </Card>
        <Card>
          <div className="flex items-center justify-between"><h2 className="t-label text-ink-2">Area and travel</h2><Edit step="location" label="area and travel" /></div>
          <p>{me.area ? `${me.area}, up to ${me.travelKm} km` : "Not set"}</p>
        </Card>
        <Card>
          <div className="flex items-center justify-between"><h2 className="t-label text-ink-2">Usually free</h2><Edit step="availability" label="availability" /></div>
          <SlotGrid slots={me.slots} highlight={me.slots} />
        </Card>
        <Card>
          <div className="flex items-center justify-between"><h2 className="t-label text-ink-2">Looking for</h2><Edit step="looking" label="looking for" /></div>
          <p className="measure text-ink-2">{me.lookingFor || "Nothing added yet."}</p>
        </Card>
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
