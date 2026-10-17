"use client";
import { useEffect, useRef } from "react";
import {
  AI_STUDIO_SCALE,
  codeCellOpacity,
  heroSequence,
} from "./hero-sequence";
const codeLines = [
  "const orbit = { create, edit, review, schedule };",
  'draft.channels = ["facebook", "instagram", "threads"];',
  "media.edit({ image: true, video: true });",
  "await review.approve(draft.revision);",
  'calendar.plan({ timezone: "Asia/Kuala_Lumpur" });',
  "ideas → content → media → approval → calendar",
];
export function OrbitField({
  paused,
  centered = false,
}: {
  paused: boolean;
  centered?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const context = element.getContext("2d");
    if (!context) return;
    const layer = document.createElement("canvas"),
      orbitMask = document.createElement("canvas"),
      studioMask = document.createElement("canvas");
    const paint = layer.getContext("2d"),
      orbit = orbitMask.getContext("2d"),
      studio = studioMask.getContext("2d");
    if (!paint || !orbit || !studio) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0,
      width = 0,
      height = 0,
      last = 0,
      disposed = false;
    const started = performance.now();
    function draw(now: number) {
      if (!context || !paint || !width || !height || disposed) return;
      if (now - last < 32 && !paused && !reduced.matches) {
        frame = requestAnimationFrame(draw);
        return;
      }
      last = now;
      const frozen = paused || reduced.matches,
        dark = document.documentElement.dataset.theme !== "light";
      const elapsed = frozen ? 0 : now - started,
        phase = elapsed / 2600;
      context.clearRect(0, 0, width, height);
      context.font = "12px JetBrains Mono, monospace";
      for (let row = 0; row < Math.ceil(height / 20); row++) {
        context.fillStyle = dark
          ? "rgba(180,156,255,.16)"
          : "rgba(82,55,142,.14)";
        context.fillText(
          codeLines[row % codeLines.length].repeat(Math.ceil(width / 320)),
          -40 + Math.sin(row * 0.23 + phase) * 15,
          row * 20 + 14,
        );
      }
      const weights = heroSequence(elapsed, frozen);
      element!.dataset.scene = weights.studio > 0.5 ? "ai-studio" : "orbit";
      for (const [mask, weight] of [
        [orbitMask, weights.orbit],
        [studioMask, weights.studio],
      ] as const) {
        if (weight <= 0) continue;
        paint.clearRect(0, 0, width, height);
        paint.globalCompositeOperation = "source-over";
        paint.drawImage(mask, 0, 0, width, height);
        paint.globalCompositeOperation = "source-in";
        const gradient = paint.createLinearGradient(0, 0, width, height * 0.5);
        gradient.addColorStop(0, dark ? "#94f0e4" : "#237e85");
        gradient.addColorStop(0.5, dark ? "#c7afff" : "#6849bc");
        gradient.addColorStop(1, dark ? "#ffb5df" : "#a9397b");
        paint.fillStyle = gradient;
        paint.fillRect(0, 0, width, height);
        paint.globalCompositeOperation = "source-atop";
        paint.fillStyle = dark ? "rgba(7,6,6,.48)" : "rgba(250,248,243,.55)";
        paint.fillRect(0, 0, width, height);
        paint.fillStyle = gradient;
        paint.font = "600 11px JetBrains Mono, monospace";
        for (let row = 0; row < Math.ceil(height / 13); row++) {
          const line = codeLines[row % codeLines.length].repeat(
            Math.ceil(width / 320),
          );
          paint.fillText(
            line,
            -25 + Math.sin(phase + row * 0.2) * 8,
            row * 13 + 11,
          );
        }
        if (weight < 1) {
          paint.globalCompositeOperation = "destination-out";
          for (let row = 0; row < Math.ceil(height / 13); row++)
            for (let column = 0; column < Math.ceil(width / 8); column++) {
              paint.globalAlpha = 1 - codeCellOpacity(weight, column, row);
              paint.fillRect(column * 8, row * 13, 8.5, 13.5);
            }
        }
        paint.globalAlpha = 1;
        paint.globalCompositeOperation = "source-over";
        context.drawImage(layer, 0, 0, width, height);
      }
      if (!document.hidden && !frozen) frame = requestAnimationFrame(draw);
    }
    function resize() {
      if (!element || !context || !paint || !orbit || !studio) return;
      const rect = element.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      if (!width || !height) {
        cancelAnimationFrame(frame);
        return;
      }
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      for (const target of [element, layer, orbitMask, studioMask]) {
        target.width = Math.round(width * ratio);
        target.height = Math.round(height * ratio);
      }
      for (const drawing of [context, paint, orbit, studio])
        drawing.setTransform(ratio, 0, 0, ratio, 0, 0);
      const size = Math.min(width * 0.19, centered ? 210 : 300),
        logo = size * 0.7,
        gap = size * 0.14;
      orbit.font = `800 ${size}px JetBrains Mono, monospace`;
      const textWidth = orbit.measureText("Orbit").width,
        total = logo + gap + textWidth;
      const left =
          centered || width < 700
            ? (width - total) / 2
            : width - total - width * 0.055,
        cy = centered ? height * 0.4 : width < 700 ? 130 : height * 0.34;
      orbit.fillStyle = "#fff";
      orbit.textBaseline = "middle";
      orbit.fillText("Orbit", left + logo + gap, cy);
      orbit.save();
      orbit.translate(left + logo / 2, cy);
      orbit.strokeStyle = "#fff";
      orbit.lineWidth = logo * 0.065;
      orbit.beginPath();
      orbit.arc(0, 0, logo * 0.3, 0, Math.PI * 2);
      orbit.stroke();
      orbit.rotate(-0.6);
      orbit.beginPath();
      orbit.ellipse(0, 0, logo * 0.46, logo * 0.19, 0, 0, Math.PI * 2);
      orbit.stroke();
      orbit.rotate(0.6);
      orbit.beginPath();
      orbit.arc(0, 0, logo * 0.085, 0, Math.PI * 2);
      orbit.fill();
      orbit.beginPath();
      orbit.arc(logo * 0.35, -logo * 0.25, logo * 0.085, 0, Math.PI * 2);
      orbit.fill();
      orbit.restore();
      studio.font = `800 ${size * AI_STUDIO_SCALE}px JetBrains Mono, monospace`;
      studio.fillStyle = "#fff";
      studio.textAlign = "center";
      studio.textBaseline = "middle";
      studio.fillText("ai studio", left + total / 2, cy);
      cancelAnimationFrame(frame);
      last = 0;
      draw(performance.now());
    }
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    const refresh = () => {
      cancelAnimationFrame(frame);
      last = 0;
      draw(performance.now());
    };
    const visibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden) refresh();
    };
    window.addEventListener("orbit-appearance", refresh);
    reduced.addEventListener("change", refresh);
    document.addEventListener("visibilitychange", visibility);
    void document.fonts.ready.then(() => {
      if (!disposed) resize();
    });
    resize();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("orbit-appearance", refresh);
      reduced.removeEventListener("change", refresh);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [paused, centered]);
  return (
    <div
      className={`orbit-artwork ${centered ? "orbit-artwork-centered" : ""}`}
      data-paused={paused}
    >
      <canvas className="orbit-field" ref={canvas} aria-hidden="true" />
    </div>
  );
}
