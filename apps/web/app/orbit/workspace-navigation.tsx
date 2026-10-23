"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, X, type LucideIcon } from "lucide-react";

type Destination = { id: string; label: string; accessible: string; icon: LucideIcon; badge?: string };

/** The sentinel stays in document flow; the floating menu cannot affect its observation. */
export function WorkspaceNavigation({ items, activeId, onSelect }: { items: readonly Destination[]; activeId: string; onSelect: (id: string) => void }) {
  const [floating, setFloating] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const sentinel = useRef<HTMLSpanElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const popover = useRef<HTMLDivElement>(null);
  const headerNav = useRef<HTMLElement>(null);
  const menuNav = useRef<HTMLElement>(null);
  const pendingDestination = useRef<string | null>(null);

  useEffect(() => {
    const element = sentinel.current;
    if (!element) return;
    let frame = 0;
    const sync = () => {
      frame = 0;
      // Read current geometry: an observer entry can predate hydration or font layout.
      const rect = element.getBoundingClientRect();
      const belowHeader = rect.height > 0 && rect.bottom <= 0;
      setFloating(belowHeader);
      if (!belowHeader) setExpanded(false);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(sync); };
    const observer = new IntersectionObserver(schedule);
    const layout = new ResizeObserver(schedule);
    observer.observe(element);
    if (element.parentElement) layout.observe(element.parentElement);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); layout.disconnect();
      window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule);
    };
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const first = menuNav.current?.querySelector<HTMLButtonElement>('[aria-current="page"]') ?? menuNav.current?.querySelector<HTMLButtonElement>("button");
    first?.focus();
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !popover.current?.contains(event.target)) {
        setExpanded(false);
        // A click on non-focusable content must not strand focus inside the closed menu.
        if (!(event.target instanceof Element) || !event.target.closest("button,a,input,select,textarea,[tabindex]")) launcher.current?.focus();
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setExpanded(false);
        launcher.current?.focus();
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [expanded]);

  // IntersectionObserver reveals the header after navigation scrolls to the top.
  // Wait for that render rather than focusing a still-hidden destination in rAF.
  useEffect(() => {
    if (floating || expanded || !pendingDestination.current) return;
    const target = headerNav.current?.querySelector<HTMLButtonElement>(`[data-destination="${pendingDestination.current}"]`);
    if (target) {
      target.focus({ preventScroll: true });
      pendingDestination.current = null;
    }
  }, [floating, expanded, activeId]);

  function select(id: string) {
    if (expanded) pendingDestination.current = id;
    setExpanded(false);
    onSelect(id);
  }

  function links() {
    return items.map(({ id, label, accessible, icon: Icon, badge }) => <button key={id} type="button" className="workspace-nav-link" data-destination={id} aria-label={accessible} aria-current={id === activeId ? "page" : undefined} onClick={() => select(id)}>
      <span className="workspace-nav-symbol"><Icon size={21} strokeWidth={1.5} aria-hidden="true"/>{badge ? <span className="workspace-nav-count" aria-hidden="true">{badge}</span> : null}</span>
      <span aria-hidden="true">{label}</span>
    </button>);
  }

  return <>
    <div className="workspace-nav-slot" data-floating={floating}>
      <nav ref={headerNav} className="workspace-navigation" aria-label="Workspace">{links()}</nav>
      <span ref={sentinel} className="workspace-nav-sentinel" aria-hidden="true"/>
    </div>
    <div className="workspace-nav-popover" ref={popover} data-visible={floating} data-expanded={expanded} onBlur={event => {
      if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) setExpanded(false);
    }}>
      <nav ref={menuNav} id="orbit-workspace-menu" className="workspace-collapse-menu" aria-label="Workspace menu" hidden={!expanded}>
        <p>YOUR WORKSPACE</p>{links()}
      </nav>
      <button ref={launcher} type="button" className="workspace-nav-launcher" aria-label={expanded ? "Close navigation" : "Open navigation"} aria-expanded={expanded} aria-controls="orbit-workspace-menu" onClick={() => setExpanded(old => !old)}>
        <Menu size={23} strokeWidth={1.5} className="workspace-menu-open-icon" aria-hidden="true"/>
        <X size={23} strokeWidth={1.5} className="workspace-menu-close-icon" aria-hidden="true"/>
      </button>
    </div>
  </>;
}
