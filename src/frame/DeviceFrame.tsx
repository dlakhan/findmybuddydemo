/* iPhone 14 Pro Max frame for demoing on a laptop or projector: 430 x 932 CSS pixels, Dynamic Island, status bar, home indicator.
   The app runs inside an iframe so it behaves exactly as it would at phone width. */
import { useEffect, useState } from "react";
import { resetDemo } from "@/lib/store";

const W = 430, H = 932, BEZEL = 14;

function useClock() {
  const fmt = () => new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).replace(/\s?[AP]M$/i, "");
  const [t, setT] = useState(fmt);
  useEffect(() => { const i = window.setInterval(() => setT(fmt()), 10_000); return () => window.clearInterval(i); }, []);
  return t;
}

function useScale() {
  const calc = () => Math.min(1, (window.innerHeight - 72) / (H + BEZEL * 2), (window.innerWidth - 32) / (W + BEZEL * 2));
  const [s, setS] = useState(calc);
  useEffect(() => { const on = () => setS(calc()); window.addEventListener("resize", on); return () => window.removeEventListener("resize", on); }, []);
  return s;
}

export function DeviceFrame() {
  const time = useClock();
  const scale = useScale();
  const [key, setKey] = useState(0);
  const src = `${window.location.pathname}?app=1${window.location.hash}`;
  const outerW = W + BEZEL * 2, outerH = H + BEZEL * 2;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#E9ECEA] py-4">
      <div className="flex items-center gap-16">
      <aside className="hidden w-[300px] flex-col items-center text-center min-[1100px]:flex">
        <img src="/brand/logo-full.webp" alt="Find My Buddy. Buddies, activities, repeat." width={300} height={225} className="h-auto w-[300px]" />
        <p className="mt-8 t-label text-ink-2">Clickable prototype</p>
        <p className="mt-2 t-small text-ink-2 measure">Find a few reliable people nearby to share your hobby with, then actually meet up. Open this link on your phone to try it full screen.</p>
      </aside>
      <div style={{ width: outerW * scale, height: outerH * scale }}>
        <div style={{ width: outerW, height: outerH, transform: `scale(${scale})`, transformOrigin: "top left" }}
          className="relative rounded-[68px] bg-[#1C1D1F] shadow-[0_30px_80px_rgba(27,33,30,.28),inset_0_0_0_2px_#3A3C3F]">
          {/* side buttons */}
          <span aria-hidden className="absolute -left-[3px] top-[190px] h-[34px] w-[3px] rounded-l bg-[#2A2B2E]" />
          <span aria-hidden className="absolute -left-[3px] top-[250px] h-[64px] w-[3px] rounded-l bg-[#2A2B2E]" />
          <span aria-hidden className="absolute -left-[3px] top-[330px] h-[64px] w-[3px] rounded-l bg-[#2A2B2E]" />
          <span aria-hidden className="absolute -right-[3px] top-[280px] h-[100px] w-[3px] rounded-r bg-[#2A2B2E]" />
          <div className="absolute overflow-hidden rounded-[55px] bg-white" style={{ left: BEZEL, top: BEZEL, width: W, height: H }}>
            <iframe key={key} title="Find My Buddy prototype" src={src} className="block h-full w-full border-0" />
            {/* status bar */}
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 flex h-[54px] items-center justify-between px-[34px] pt-[6px] text-[#1B211E]">
              <span className="w-[86px] text-center text-[17px] font-semibold tracking-[-0.2px]" style={{ fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif" }}>{time}</span>
              <span className="flex w-[86px] items-center justify-center gap-[6px]">
                <svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1" fill="currentColor" /><rect x="5" y="6" width="3" height="6" rx="1" fill="currentColor" /><rect x="10" y="3" width="3" height="9" rx="1" fill="currentColor" /><rect x="15" y="0" width="3" height="12" rx="1" fill="currentColor" /></svg>
                <svg width="16" height="12" viewBox="0 0 16 12"><path d="M8 2.2c2.3 0 4.4.9 6 2.4l1.1-1.2A10.2 10.2 0 0 0 8 .5 10.2 10.2 0 0 0 .9 3.4L2 4.6a8.6 8.6 0 0 1 6-2.4Zm0 3.4c1.4 0 2.7.5 3.7 1.4l1.1-1.2A7 7 0 0 0 8 3.9a7 7 0 0 0-4.8 1.9L4.3 7c1-.9 2.3-1.4 3.7-1.4Zm0 3.3c-.6 0-1.2.2-1.6.6L8 11.3l1.6-1.8c-.4-.4-1-.6-1.6-.6Z" fill="currentColor" /></svg>
                <svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.5" stroke="currentColor" opacity=".4" fill="none" /><rect x="2" y="2" width="18" height="9" rx="2" fill="currentColor" /><path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2Z" fill="currentColor" opacity=".45" /></svg>
              </span>
            </div>
            {/* Dynamic Island */}
            <div aria-hidden className="pointer-events-none absolute left-1/2 top-[11px] h-[37px] w-[126px] -translate-x-1/2 rounded-full bg-black" />
            {/* home indicator */}
            <div aria-hidden className="pointer-events-none absolute bottom-[8px] left-1/2 h-[5px] w-[140px] -translate-x-1/2 rounded-full bg-[#1B211E]" />
          </div>
        </div>
      </div>
      </div>
      <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 text-center t-caption text-ink-2">
        <span>Find My Buddy clickable prototype · iPhone 14 Pro Max, 430 × 932</span>
        <button type="button" className="underline underline-offset-2 hover:text-ink" onClick={() => { resetDemo(); setKey((k) => k + 1); }}>Reset demo data</button>
        <a className="underline underline-offset-2 hover:text-ink" href={`${window.location.pathname}?noframe=1`}>Open without the frame</a>
      </p>
    </div>
  );
}
