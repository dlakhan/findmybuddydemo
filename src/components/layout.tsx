import type { ReactNode } from "react";
import { WarningCircle } from "@phosphor-icons/react";
import type { User } from "@/lib/model";
import { missingStep } from "@/lib/rules";
import { Link } from "@/lib/router";
import type { WizardStep } from "@/lib/data";

const MISSING_COPY: Record<WizardStep, string> = {
  activities: "Pick an activity so people nearby can find you. It takes about a minute.",
  skill: "Add your skill level so people nearby can find you. It takes about a minute.",
  location: "Add your area so people nearby can find you. It takes about a minute.",
  availability: "Add your availability so people nearby can find you. It takes about a minute.",
  looking: "",
  photo: "",
};

/** Persistent banner while the profile is incomplete (PRD S2.8). */
export function FindabilityBanner({ me }: { me: User }) {
  const step = missingStep(me);
  if (!step) return null;
  return (
    <div role="status" className="mt-4 flex items-start gap-3 rounded-[8px] bg-warning-50 px-4 py-3 text-warning-800">
      <WarningCircle size={20} className="mt-[2px] shrink-0" aria-hidden />
      <div className="t-small">
        <span className="font-bold">Your profile is hidden.</span> {MISSING_COPY[step]}
        <div className="mt-1"><Link to={`/setup/${step}`} className="t-label underline underline-offset-4">Finish profile</Link></div>
      </div>
    </div>
  );
}

/** Main tab screen: large title under the status bar, optional action, banner, content. */
export function TabPage({ title, sub, action, me, children }: { title: string; sub?: string; action?: ReactNode; me: User; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-[600px] px-4 pb-8 pt-[calc(var(--sat)+16px)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="screen-title">{title}</h1>
          {sub && <p className="mt-1 text-ink-2">{sub}</p>}
        </div>
        {action}
      </div>
      <FindabilityBanner me={me} />
      {children}
    </main>
  );
}
