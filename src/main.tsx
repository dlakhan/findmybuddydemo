import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { App } from "./App";
import { DeviceFrame } from "./frame/DeviceFrame";

const params = new URLSearchParams(window.location.search);
const inFrame = params.has("app");
// On a laptop or desktop (wide screen with a mouse) the app is shown inside an iPhone 14 Pro Max frame.
// Phones and tablets, in any orientation, get the app full screen. ?frame=1 forces the frame, ?noframe=1 removes it.
const desktop = window.matchMedia("(min-width: 700px) and (hover: hover) and (pointer: fine)").matches;
const showFrame = !inFrame && window.self === window.top && !params.has("noframe") && (desktop || params.has("frame"));

if (inFrame) {
  // The frame draws the status bar and home indicator, so reserve the same safe areas iOS would.
  const root = document.documentElement;
  root.style.setProperty("--sat", "54px");
  root.style.setProperty("--sab", "34px");
  root.classList.add("in-frame");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>{showFrame ? <DeviceFrame /> : <App />}</StrictMode>,
);
