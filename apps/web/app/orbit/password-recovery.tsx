"use client";
import { useState, type FormEvent } from "react";
import { requestRecovery, resetRecoveredPassword } from "./recovery-client";
import { Button } from "./ui";

export function PasswordRecovery({ onCancel }: { onCancel: () => void }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setNotice("");
    try {
      if (!sent) {
        const address = String(data.get("email") ?? "").trim();
        await requestRecovery(address);
        setEmail(address);
        setSent(true);
        setNotice(
          "If this address is eligible, a recovery email will arrive. Enter its code below.",
        );
      } else {
        const password = String(data.get("password") ?? "");
        if (password !== data.get("confirmation"))
          throw Error("The passwords do not match.");
        await resetRecoveredPassword(
          email,
          String(data.get("code") ?? "").trim(),
          password,
        );
        setDone(true);
        setNotice("Password updated. Sign in with your new password.");
      }
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Recovery could not be completed.",
      );
    } finally {
      form.reset();
      setBusy(false);
    }
  }
  return (
    <div>
      <h2>Reset your password</h2>
      {!done ? (
        <form className="session-form" onSubmit={submit}>
          {!sent ? (
            <label className="field">
              Email
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                disabled={busy}
              />
            </label>
          ) : (
            <>
              <p>Enter the code sent to {email}.</p>
              <label className="field">
                Recovery code
                <input
                  name="code"
                  type="text"
                  autoComplete="one-time-code"
                  required
                  minLength={6}
                  maxLength={128}
                  disabled={busy}
                />
              </label>
              <label className="field">
                New password
                <input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={256}
                  disabled={busy}
                />
              </label>
              <label className="field">
                Confirm password
                <input
                  name="confirmation"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={256}
                  disabled={busy}
                />
              </label>
            </>
          )}
          <Button disabled={busy}>
            {busy
              ? "Please wait…"
              : sent
                ? "Update password"
                : "Send recovery email"}
          </Button>
        </form>
      ) : null}
      {notice ? (
        <p role="status" className="action-notice">
          {notice}
        </p>
      ) : null}
      <button className="text-action" disabled={busy} onClick={onCancel}>
        Back to sign in
      </button>
    </div>
  );
}
