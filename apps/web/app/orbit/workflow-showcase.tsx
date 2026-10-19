"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useAppearance } from "./appearance";
import { ArrowUpRight, Check, Copy, Code2 } from "lucide-react";
import { IconButton } from "./design-ui";
const workflows = [
  {
    id: "content",
    label: "Content",
    file: "content.workflow",
    target: "studio" as const,
    action: "Open studio",
    description:
      "Start with an idea, prepare a caption for each channel, then review the draft before recording a schedule.",
    steps: ["Idea", "Draft", "Review", "Calendar"],
    lines: [
      "// Orbit workflow · illustrative, not an executable API",
      'const channels = ["facebook", "instagram", "threads"];',
      "",
      'idea("Kerja kosong di sekitar Kuala Lumpur")',
      '  → draft({ channels, voice: "Santai & bersahaja" })',
      "  → editCaption({ perChannel: true })",
      '  → review({ approval: "required" })',
      '  → calendar({ timezone: "Asia/Kuala_Lumpur" });',
      "",
      "// Drafts and planned dates are saved in your workspace.",
      "// Live publishing is not enabled.",
    ],
  },
  {
    id: "media",
    label: "Media",
    file: "media.workflow",
    target: "video" as const,
    action: "Open media",
    description:
      "Prepare an image or a video using the same media workspace, then bring the finished asset into your content process.",
    steps: ["Upload", "Edit", "Preview", "Export"],
    lines: [
      "// Image + video · one media workspace",
      'image.upload("photo.jpg")',
      '  → crop({ ratio: "1:1" })',
      "  → adjust({ colour, rotation, caption })",
      '  → export({ format: "PNG or JPEG" });',
      "",
      'video.upload("clip.mp4")',
      '  → template("News report")',
      '  → title({ date: "above", panel: "transparent" })',
      "  → preview()",
      '  → export({ encoder: "MP4 or WebM", onDevice: true });',
    ],
  },
  {
    id: "accounts",
    label: "Channels",
    file: "channels.workflow",
    target: "connections" as const,
    action: "Open channels",
    description:
      "Account authorization uses each platform’s official consent screen. The complete publishing flow remains a planned capability.",
    steps: ["Connect", "Consent", "Accounts", "Review"],
    lines: [
      "// Account authorization · official provider consent",
      'connect("Facebook + Instagram")',
      '  → providerConsent("Meta")',
      "  → callback({ validateState: true })",
      '  → accounts({ tokens: "encrypted on server" });',
      "",
      'connect("Threads") → separateConsent();',
      "",
      "// Planned publishing flow, currently unavailable:",
      "approvedPost → scheduledPublish → checkResult;",
      "// Live posting remains off in this preview.",
    ],
  },
];
export function WorkflowShowcase({
  go,
}: {
  go: (view: "studio" | "video" | "connections") => void;
}) {
  const [active, setActive] = useState(0),
    [copied, setCopied] = useState(false),
    [notice, setNotice] = useState("");
  const [visible, setVisible] = useState(false),
    [characters, setCharacters] = useState(0);
  const section = useRef<HTMLElement>(null),
    { motion } = useAppearance();
  const id = useId(),
    workflow = workflows[active],
    script = workflow.lines.join("\n");
  useEffect(() => {
    const element = section.current;
    if (!element) return;
    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!motion) {
      setCharacters(script.length);
      return;
    }
    setCharacters(0);
    if (!visible) return;
    let current = 0;
    const timer = setInterval(() => {
      current++;
      setCharacters(current);
      if (current >= script.length) clearInterval(timer);
    }, 12);
    return () => clearInterval(timer);
  }, [script, motion, visible]);
  const complete = characters >= script.length;
  const status = complete ? "ready" : visible ? "writing" : "waiting";
  const activeStep = Math.min(
    workflow.steps.length - 1,
    Math.floor(
      (characters / Math.max(1, script.length)) * workflow.steps.length,
    ),
  );
  async function copy() {
    try {
      await navigator.clipboard.writeText(script);
      setCopied(true);
      setNotice("Workflow copied.");
    } catch {
      setNotice("Copy is unavailable. Select the workflow text to copy it.");
    }
  }
  let offset = 0;
  return (
    <section
      ref={section}
      className="numbered-section workflow-showcase"
      aria-labelledby={`${id}-heading`}
    >
      <div className="section-index">
        <span>04</span>Inside Orbit
      </div>
      <div className="workflow-showcase-body">
        <h2 id={`${id}-heading`}>
          One idea.
          <br />
          <em>A clear workflow.</em>
        </h2>
        <p className="workflow-lead">
          See how your content moves through Orbit.
        </p>
        <div className="workflow-code-tabs" aria-label="Workflow examples">
          {workflows.map((item, index) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={active === index}
              aria-controls={`${id}-panel`}
              onClick={() => {
                setActive(index);
                setCopied(false);
                setNotice("");
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div
          className="workflow-code-panel"
          id={`${id}-panel`}
          data-state={status}
        >
          <div className="workflow-code-header">
            <span>
              <span className="workflow-terminal-lights" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <Code2 size={17} aria-hidden="true" />
              {workflow.file}
            </span>
            <IconButton label="Copy workflow" onClick={copy}>
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </IconButton>
          </div>
          <pre tabIndex={0} aria-label={`${workflow.label} workflow example`}>
            <code aria-hidden="true">
              {workflow.lines.map((line, index) => {
                const start = offset;
                offset += line.length + 1;
                const count = Math.max(
                    0,
                    Math.min(line.length, characters - start),
                  ),
                  cursor =
                    !complete &&
                    characters >= start &&
                    characters <= start + line.length;
                return (
                  <span
                    className={`workflow-code-line ${line.startsWith("//") || line.startsWith("  //") ? "code-comment" : ""}`}
                    key={index}
                  >
                    <span className="code-line-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>{line.slice(0, count) || " "}</span>
                    {cursor ? (
                      <span className="workflow-type-cursor" aria-hidden="true">|</span>
                    ) : null}
                  </span>
                );
              })}
            </code>
            <span className="sr-only">{script}</span>
          </pre>
          <div className="workflow-code-footer">
            <span className="workflow-indicator" aria-hidden="true" />
            <span>
              {complete
                ? "Example ready"
                : visible
                  ? "Typing workflow example…"
                  : "Workflow example"}
            </span>
            <span>Illustrative guide</span>
          </div>
        </div>
        <ol className="workflow-stages" aria-label={`${workflow.label} stages`}>
          {workflow.steps.map((step, index) => (
            <li
              key={step}
              data-state={
                complete || index < activeStep
                  ? "complete"
                  : visible && index === activeStep
                    ? "active"
                    : "waiting"
              }
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              {step}
            </li>
          ))}
        </ol>
        <p className="workflow-explanation">{workflow.description}</p>
        <button
          className="text-action"
          type="button"
          onClick={() => go(workflow.target)}
        >
          {workflow.action}
          <ArrowUpRight size={17} aria-hidden="true" />
        </button>
        <p className="workflow-copy-notice" role="status">
          {notice}
        </p>
      </div>
    </section>
  );
}
