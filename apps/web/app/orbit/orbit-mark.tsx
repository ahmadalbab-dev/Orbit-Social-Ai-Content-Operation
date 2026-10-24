"use client";

import { ThinkingOrb } from "thinking-orbs";
import { useAppearance } from "./appearance";

/** The connecting animation is Orbit's brand mark, not a connection-status claim. */
export function OrbitMark({ small = false }: { small?: boolean }) {
  const { resolved, motion } = useAppearance();
  return <span className={small ? "orbit-mark small" : "orbit-mark"} aria-hidden="true" data-orbit-mark="connecting">
    <ThinkingOrb state="connecting" size={64} theme={resolved} paused={!motion}
      aria-hidden="true" style={{ width: "100%", height: "100%", display: "block" }}/>
  </span>;
}
