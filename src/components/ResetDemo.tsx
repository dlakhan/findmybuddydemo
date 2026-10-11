/* Prototype control, not product UI. On a phone there is no device frame, so the reset lives inside the app. */
import { useState } from "react";
import { ArrowCounterClockwise, Flask } from "@phosphor-icons/react";
import { Btn, Modal } from "@/components/ui";
import { navigate } from "@/lib/router";
import { resetDemo } from "@/lib/store";
import { toast } from "@/lib/toast";

export function ResetDemo({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={className}>
      <div className="rounded-[8px] border border-dashed border-field p-4">
        <p className="flex items-center gap-2 t-label text-ink-2"><Flask size={18} aria-hidden />Prototype</p>
        <p className="mt-1 t-small text-ink-2">This is a clickable prototype with sample people. Nothing you do here leaves this device.</p>
        <Btn variant="tertiary" onClick={() => setOpen(true)}><ArrowCounterClockwise size={18} aria-hidden />Reset demo data</Btn>
      </div>
      <Modal open={open} onOpenChange={setOpen} title="Reset the demo?"
        description="This signs you out, clears everything you did on this device, and brings back the sample people and their meetups.">
        <div className="grid grid-cols-2 gap-3">
          <Btn variant="danger-fill" onClick={() => { resetDemo(); setOpen(false); navigate("/", { replace: true }); toast("Demo data reset", "neutral"); }}>Reset</Btn>
          <Btn variant="secondary" onClick={() => setOpen(false)}>Keep my data</Btn>
        </div>
      </Modal>
    </div>
  );
}
