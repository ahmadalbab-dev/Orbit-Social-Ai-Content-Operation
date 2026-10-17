"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CreditCard, ExternalLink, FlaskConical, RefreshCw } from "lucide-react";
import { Card, Button } from "./ui";
import { checkoutAttempts, createBillingPortal, createCheckout, getBillingStatus, type BillingPlan, type BillingStatus } from "./billing-api";

const statusLabels: Record<string, string> = {
  active: "Active", trialing: "Trial", past_due: "Payment overdue", canceled: "Canceled",
  unpaid: "Unpaid", incomplete: "Awaiting payment", incomplete_expired: "Checkout expired", paused: "Paused",
};

export function BillingPanel() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const attempts = useRef<ReturnType<typeof checkoutAttempts> | null>(null);
  const busy = useRef(false);
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const refresh = useCallback(async () => {
    setLoading(true);
    try { setStatus(await getBillingStatus()); setNotice(""); }
    catch { setStatus(null); setNotice("Billing status is unavailable. Check your connection and refresh."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  async function openStripe(plan?: BillingPlan) {
    if (busy.current || loading || !status?.enabled || status.mode !== "test" || !status.canManage) return;
    if (plan && !status.plans.some(item => item.id === plan && item.configured)) return;
    busy.current = true; setPending(true); setNotice("");
    try {
      attempts.current ??= checkoutAttempts();
      const url = plan ? await createCheckout(attempts.current(plan)) : await createBillingPortal();
      if (mounted.current) window.location.assign(url);
    } catch {
      setNotice("Could not open Stripe. Refresh billing before retrying. Retrying the same plan reuses this checkout request.");
    } finally { busy.current = false; setPending(false); }
  }

  const canAct = !!status?.enabled && status.mode === "test" && status.canManage && !pending && !loading;
  const subscription = status?.subscription;
  const existingSubscription = !!subscription && !["canceled", "incomplete_expired"].includes(subscription.status);
  const periodEnd = subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null;
  const dateLabel = periodEnd && Number.isFinite(periodEnd.getTime())
    ? new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeZone: "Asia/Kuala_Lumpur" }).format(periodEnd) : null;

  return <Card className="surface profile-settings" style={{ marginTop: "var(--orbit-space)", minWidth: 0 }} aria-label="Subscription and billing" aria-busy={loading || pending}>
    <div className="panel-label" style={{ flexWrap: "wrap" }}><CreditCard size={19} aria-hidden="true"/><h2>Subscription</h2><span className="status-badge"><FlaskConical size={14} aria-hidden="true"/>Sandbox · test only</span></div>
    <p className="revision-label">Test checkout with Stripe. Live payments are not enabled.</p>
    {loading ? <p role="status">Checking billing…</p> : status ? <>
      {!status.enabled ? <p>Stripe sandbox setup is awaiting operator configuration.</p> : null}
      {subscription ? <div style={{ overflowWrap: "anywhere" }}><p><strong>{subscription.plan ?? "Plan not assigned"}</strong> · {statusLabels[subscription.status] ?? "Status awaiting confirmation"} (test)</p>{dateLabel ? <p className="revision-label">{subscription.cancelAtPeriodEnd ? "Cancellation scheduled for" : "Current period ends"} {dateLabel}</p> : null}</div> : <p>No sandbox subscription is recorded for this workspace.</p>}
      {!status.canManage ? <p className="revision-label">Only workspace owners and administrators can manage billing.</p> : <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 16 }}>
        {existingSubscription ? <Button disabled={!canAct} onClick={() => void openStripe()}><ExternalLink size={16} aria-hidden="true"/>Manage test subscription</Button> : status.plans.map(plan => <Button key={plan.id} variant="outline" disabled={!canAct || !plan.configured} onClick={() => void openStripe(plan.id)} style={{ whiteSpace: "normal", minWidth: 0, maxWidth: "100%" }}><CreditCard size={16} aria-hidden="true"/>{plan.label}{plan.configured ? " · test checkout" : " · awaiting setup"}</Button>)}
      </div>}
      <p className="revision-label" style={{ marginTop: 16 }}>Stripe displays the configured amount before confirmation. Subscription changes appear after server confirmation. Returning from checkout does not activate a plan.</p>
    </> : null}
    {notice ? <p role="alert" className="action-notice">{notice}</p> : null}
    <Button variant="ghost" disabled={loading || pending} onClick={() => void refresh()}><RefreshCw size={16} aria-hidden="true"/>Refresh billing</Button>
  </Card>;
}
