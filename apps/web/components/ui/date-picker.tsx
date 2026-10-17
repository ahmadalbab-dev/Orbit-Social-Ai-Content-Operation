"use client";
import { useEffect, useId, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { malaysiaDateKey, monthGrid } from "../../app/orbit/calendar-data";
import "./date-picker.css";

/** Date-only keys stay in Malaysia calendar time, without UTC conversion of user input. */
export function DatePicker({ value, onChange, label = "Choose date", disabled = false, withTime = false }: {
  value: string; onChange: (value: string) => void; label?: string; disabled?: boolean; withTime?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const initial = (value || malaysiaDateKey(new Date())).slice(0, 10);
  const [month, setMonth] = useState(() => new Date(`${initial}T12:00:00Z`));
  const root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null);
  const id = useId(), today = malaysiaDateKey(new Date()), selected = value.slice(0, 10);
  const year = month.getUTCFullYear(), index = month.getUTCMonth();
  const days = monthGrid(year, index);
  const close = () => { setOpen(false); trigger.current?.focus({ preventScroll: true }); };
  useEffect(() => {
    if (!open) return;
    (root.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]') ?? root.current?.querySelector<HTMLButtonElement>('[aria-current="date"]') ?? root.current?.querySelector<HTMLButtonElement>('.ios-date-days button[data-current-month="true"]'))?.focus({ preventScroll: true });
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  const select = (key: string) => { onChange(withTime ? `${key}T${value.slice(11,16) || "09:00"}` : key); if (!withTime) close(); };
  const text = selected ? new Intl.DateTimeFormat("en-MY", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${selected}T12:00:00Z`)) : "Choose date";
  function moveMonth(amount: number) { setMonth(new Date(Date.UTC(year, index + amount, 1, 12))); }
  return <div className="ios-date-picker" ref={root}>
    <button className="ios-date-trigger" type="button" ref={trigger} disabled={disabled} aria-label={label} aria-expanded={open} aria-haspopup="dialog" aria-controls={open ? id : undefined} onClick={() => { if (!open && selected) setMonth(new Date(`${selected}T12:00:00Z`)); setOpen(!open); }}>
      <CalendarDays size={18} aria-hidden="true"/><span>{text}{withTime && value ? ` · ${value.slice(11,16) || "09:00"}` : ""}</span>
    </button>
    {open ? <section id={id} role="dialog" aria-label={`${label} calendar`} className="ios-date-popover" onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); close(); } }}>
      <header><strong>{new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(month)}</strong><div><button type="button" aria-label="Previous month" onClick={() => moveMonth(-1)}><ChevronLeft size={20}/></button><button type="button" aria-label="Next month" onClick={() => moveMonth(1)}><ChevronRight size={20}/></button></div></header>
      <div className="ios-date-weekdays" aria-hidden="true">{["M","T","W","T","F","S","S"].map((day,i) => <span key={i}>{day}</span>)}</div>
      <div className="ios-date-days" role="group" aria-label="Calendar dates" onKeyDown={event => {
        const offset = ({ ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 } as Record<string, number>)[event.key];
        if (!offset || !(event.target instanceof HTMLButtonElement)) return;
        const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button'));
        const next = buttons.indexOf(event.target) + offset;
        if (buttons[next]) { event.preventDefault(); buttons[next].focus(); }
      }}>{days.map(day => <button type="button" key={day.key} aria-label={new Intl.DateTimeFormat("en", { dateStyle: "full", timeZone: "UTC" }).format(new Date(`${day.key}T12:00:00Z`))} aria-pressed={day.key===selected} aria-current={day.key===today ? "date" : undefined} data-current-month={day.current} onClick={() => select(day.key)}>{day.day}</button>)}</div>
      {withTime ? <label className="ios-date-time">Malaysia time<input aria-label={`${label} clock`} type="time" value={value.slice(11,16) || "09:00"} onChange={event => onChange(`${selected || today}T${event.target.value || "09:00"}`)}/></label> : null}
      <footer><button type="button" onClick={() => { setMonth(new Date(`${today}T12:00:00Z`)); select(today); }}>Today</button><button type="button" onClick={() => { onChange(""); close(); }}>Clear</button>{withTime ? <button type="button" onClick={close}>Done</button> : null}</footer>
    </section> : null}
  </div>;
}
