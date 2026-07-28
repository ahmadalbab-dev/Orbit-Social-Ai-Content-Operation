import Link from "next/link";
import type { ReactNode } from "react";

export function LegalPage({ eyebrow, title, summary, children }: { eyebrow: string; title: string; summary: string; children: ReactNode }) {
  return <main className="min-h-screen bg-[#f5f5f2] px-4 py-10 text-slate-950 sm:px-7 sm:py-16">
    <article className="mx-auto max-w-3xl">
      <Link href="/" className="inline-flex min-h-11 items-center rounded-xl border bg-white px-4 text-sm font-medium shadow-sm hover:bg-slate-50">← Orbit Social</Link>
      <header className="mt-8 rounded-[28px] bg-slate-950 p-7 text-white shadow-xl sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-emerald-300">{eyebrow}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">{summary}</p>
        <p className="mt-5 text-xs text-slate-400">Effective July 28, 2026 • Last updated July 28, 2026</p>
      </header>
      <div className="mt-6 space-y-6 rounded-2xl border bg-white p-6 text-sm leading-7 shadow-sm sm:p-9 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2:first-child]:mt-0 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6">{children}</div>
      <nav className="mt-6 flex flex-wrap gap-3 text-sm">
        <Link className="underline" href="/privacy">Privacy Policy</Link>
        <Link className="underline" href="/terms">Terms</Link>
        <Link className="underline" href="/data-deletion">Data Deletion</Link>
      </nav>
    </article>
  </main>;
}
