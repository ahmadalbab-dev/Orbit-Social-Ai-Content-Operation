"use client";
import { useEffect, useRef } from "react";
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
      mask = document.createElement("canvas");
    const paint = layer.getContext("2d"),
      shape = mask.getContext("2d");
    if (!paint || !shape) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0,
      width = 0,
      height = 0,
      last = 0,
      disposed = false;
    const draw = (now: number) => {
      if (!width || !height || disposed) return;
      if (now - last < 32 && !paused && !reduced.matches) {
        frame = requestAnimationFrame(draw);
        return;
      }
      last = now;
      const dark = document.documentElement.dataset.theme !== "light";
      const phase = paused || reduced.matches ? 0 : now / 2600;
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
      paint.clearRect(0, 0, width, height);
      paint.drawImage(mask, 0, 0, width, height);
      paint.globalCompositeOperation = "source-in";
      const gradient = paint.createLinearGradient(0, 0, width, height * 0.5);
      gradient.addColorStop(0, dark ? "#94f0e4" : "#237e85");
      gradient.addColorStop(0.5, dark ? "#c7afff" : "#6849bc");
      gradient.addColorStop(1, dark ? "#ffb5df" : "#a9397b");
      paint.fillStyle = gradient;
      // A faint body keeps the logo readable between the code rows.
      paint.fillRect(0, 0, width, height);
      paint.globalCompositeOperation = "source-atop";
      paint.fillStyle = dark ? "rgba(7,6,6,.48)" : "rgba(250,248,243,.55)";
      paint.fillRect(0, 0, width, height);
      paint.fillStyle = gradient;
      paint.font = "600 11px JetBrains Mono, monospace";
      for (let row = 0; row < Math.ceil(height / 13); row++) {
        paint.fillText(
          codeLines[row % codeLines.length].repeat(Math.ceil(width / 320)),
          -25 + Math.sin(phase + row * 0.2) * 8,
          row * 13 + 11,
        );
      }
      paint.globalCompositeOperation = "source-over";
      context.drawImage(layer, 0, 0, width, height);
      if (!document.hidden && !paused && !reduced.matches)
        frame = requestAnimationFrame(draw);
    };
    const resize = () => {
      const rect = element.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      if (!width || !height) {
        cancelAnimationFrame(frame);
        return;
      }
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      for (const target of [element, layer, mask]) {
        target.width = Math.round(width * ratio);
        target.height = Math.round(height * ratio);
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      paint.setTransform(ratio, 0, 0, ratio, 0, 0);
      shape.setTransform(ratio, 0, 0, ratio, 0, 0);
      const size = Math.min(width * 0.19, centered ? 210 : 300),
        logo = size * 0.7,
        gap = size * 0.14;
      shape.font = `800 ${size}px JetBrains Mono, monospace`;
      const textWidth = shape.measureText("Orbit").width,
        total = logo + gap + textWidth;
      const left =
          centered || width < 700
            ? (width - total) / 2
            : width - total - width * 0.055,
        cy = centered ? height * 0.4 : width < 700 ? 130 : height * 0.34;
      element.parentElement?.style.setProperty(
        "--signature-top",
        `${cy + size * 0.61}px`,
      );
      element.parentElement?.style.setProperty(
        "--signature-left",
        `${left + logo + gap}px`,
      );
      element.parentElement?.style.setProperty(
        "--signature-width",
        `${textWidth}px`,
      );
      shape.fillStyle = "#fff";
      shape.textBaseline = "middle";
      shape.fillText("Orbit", left + logo + gap, cy);
      shape.save();
      shape.translate(left + logo / 2, cy);
      shape.strokeStyle = "#fff";
      shape.lineWidth = logo * 0.065;
      shape.beginPath();
      shape.arc(0, 0, logo * 0.3, 0, Math.PI * 2);
      shape.stroke();
      shape.rotate(-0.6);
      shape.beginPath();
      shape.ellipse(0, 0, logo * 0.46, logo * 0.19, 0, 0, Math.PI * 2);
      shape.stroke();
      shape.rotate(0.6);
      shape.beginPath();
      shape.arc(0, 0, logo * 0.085, 0, Math.PI * 2);
      shape.fill();
      shape.beginPath();
      shape.arc(logo * 0.35, -logo * 0.25, logo * 0.085, 0, Math.PI * 2);
      shape.fill();
      shape.restore();
      cancelAnimationFrame(frame);
      last = 0;
      draw(performance.now());
    };
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
      <span className="orbit-ai-signature" aria-hidden="true">
        {Array.from("ai studio").map((letter, index) => (
          <span key={index} style={{ animationDelay: `${index * 0.09}s` }}>
            {letter === " " ? "\u00a0" : letter}
          </span>
        ))}
      </span>
    </div>
  );
}
