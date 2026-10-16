"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { LogOut, Plus, ShieldCheck } from "lucide-react";
import Home from "./page-client";
import { api, setApiSession } from "./session-api";
import { passwordAuth, publicAuthConfig, revokeSession } from "./auth-client";
import { OrbitMark } from "./design-ui";
import { AppearanceToggle } from "./appearance";
import { Button } from "./ui";
import { SessionRenewal } from "./session-renewal";
import { PasswordRecovery } from "./password-recovery";
import type { AuthSession } from "./auth-client";
type Workspace = { id: string; name: string; role?: string };
export function WorkspaceApp() {
  const [token, setToken] = useState("");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selected, setSelected] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [signup, setSignup] = useState(false);
  const configured = !!publicAuthConfig();
  const selectedRef = useRef("");
  const tokenRef = useRef("");
  const authGeneration = useRef(0);
  const [renewal] = useState(
    () =>
      new SessionRenewal(
        (next) => {
          tokenRef.current = next.access_token;
          setToken(next.access_token);
          setApiSession({
            token: next.access_token,
            workspaceId: selectedRef.current,
          });
        },
        () => {
          authGeneration.current++;
          tokenRef.current = "";
          setBusy(false);
          setApiSession(null);
          setToken("");
          setSelected("");
          selectedRef.current = "";
          setWorkspaces([]);
          setNotice("Your session ended. Sign in again to continue.");
        },
      ),
  );
  useEffect(() => {
    const resume = () => {
      if (document.visibilityState === "visible") void renewal.check();
    };
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("online", resume);
    return () => {
      authGeneration.current++;
      tokenRef.current = "";
      renewal.stop();
      setApiSession(null);
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("online", resume);
    };
  }, [renewal]);
  async function connect(next: string, expires = 3600, session?: AuthSession) {
    const generation = ++authGeneration.current;
    setApiSession({ token: next, workspaceId: "" });
    try {
      const list = await api<Workspace[]>(
        "/workspaces",
        "GET",
        undefined,
        false,
      );
      if (generation !== authGeneration.current) return;
      tokenRef.current = next;
      setToken(next);
      setWorkspaces(list);
      const id = list[0]?.id ?? "";
      setSelected(id);
      selectedRef.current = id;
      setApiSession({ token: next, workspaceId: id });
      renewal.start(session ?? { access_token: next, expires_in: expires });
      setNotice(list.length ? "" : "Create your first workspace to start.");
    } catch (error) {
      if (generation === authGeneration.current) setApiSession(null);
      throw error;
    }
  }
  async function auth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const generation = authGeneration.current;
    setBusy(true);
    setNotice("");
    try {
      const session = await passwordAuth(
        signup ? "signup" : "signin",
        String(fields.get("email")),
        String(fields.get("password")),
      );
      if (generation !== authGeneration.current) return;
      if (session)
        await connect(session.access_token, session.expires_in, session);
      else
        setNotice(
          "If this address is eligible, check your email to confirm your account, then return here to sign in.",
        );
      form.reset();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Sign-in failed.");
    } finally {
      form.reset();
      setBusy(false);
    }
  }
  async function internal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setNotice("");
    try {
      await connect(String(new FormData(form).get("token") ?? "").trim());
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Session verification failed.",
      );
    } finally {
      form.reset();
      setBusy(false);
    }
  }
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const generation = authGeneration.current;
    setBusy(true);
    try {
      const workspace = await api<Workspace>(
        "/workspaces",
        "POST",
        { name: String(new FormData(form).get("name") ?? "").trim() },
        false,
      );
      if (generation !== authGeneration.current) return;
      setWorkspaces((old) => [...old, workspace]);
      select(workspace.id);
      setNotice("");
      form.reset();
    } catch (error) {
      if (generation !== authGeneration.current) return;
      setNotice(
        error instanceof Error ? error.message : "Could not create workspace.",
      );
    } finally {
      if (generation === authGeneration.current) setBusy(false);
    }
  }
  function select(id: string) {
    if (!tokenRef.current) return;
    selectedRef.current = id;
    setSelected(id);
    setApiSession({ token: tokenRef.current, workspaceId: id });
  }
  function signout() {
    setBusy(false);
    const previous = tokenRef.current;
    authGeneration.current++;
    tokenRef.current = "";
    renewal.stop();
    selectedRef.current = "";
    setApiSession(null);
    setToken("");
    setSelected("");
    setWorkspaces([]);
    setNotice("");
    void revokeSession(previous);
  }
  return (
    <>
      <section
        className={`workspace-session ${token && selected ? "session-compact" : ""}`}
        id="workspace-session"
        aria-label="Workspace session"
      >
        {!token ? (
          <>
            <div className="session-brand">
              <OrbitMark />
              <strong>
                orbit<span className="word-dot">.</span>
              </strong>
              <AppearanceToggle />
            </div>
            <h1>Your content. Your workspace.</h1>
            <a className="text-action" href="/preview">
              Explore the v1 design preview
            </a>
            <p>
              Sign in to keep drafts and brand profiles together across your
              devices.
            </p>
            {configured ? (
              recovering ? (
                <PasswordRecovery onCancel={() => setRecovering(false)} />
              ) : (
                <>
                  <form onSubmit={auth} className="session-form">
                    <label className="field">
                      Email
                      <input
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        maxLength={254}
                      />
                    </label>
                    <label className="field">
                      Password
                      <input
                        name="password"
                        type="password"
                        autoComplete={
                          signup ? "new-password" : "current-password"
                        }
                        required
                        minLength={signup ? 8 : 1}
                        maxLength={256}
                      />
                    </label>
                    <Button disabled={busy}>
                      {busy
                        ? "Connecting…"
                        : signup
                          ? "Create account"
                          : "Sign in"}
                    </Button>
                  </form>
                  <button
                    className="text-action"
                    disabled={busy}
                    onClick={() => {
                      setSignup(!signup);
                      setNotice("");
                    }}
                  >
                    {signup
                      ? "Already have an account? Sign in"
                      : "Create an Orbit account"}
                  </button>
                  {!signup ? (
                    <button
                      className="text-action"
                      disabled={busy}
                      onClick={() => {
                        setRecovering(true);
                        setNotice("");
                      }}
                    >
                      Forgot password?
                    </button>
                  ) : null}
                </>
              )
            ) : (
              <div className="surface session-setup">
                <ShieldCheck size={20} />
                <p>
                  Customer sign-in is awaiting operator setup. Configure the
                  public Supabase URL and publishable key, and the backend JWT
                  verifier, before inviting customers.
                </p>
              </div>
            )}
            <details className="small-details">
              <summary>Internal alpha access</summary>
              <p>
                For authorised testers with a server-issued access token. Tokens
                stay in memory and are cleared when you sign out or reload.
              </p>
              <form className="session-form" onSubmit={internal}>
                <label className="field">
                  Access token
                  <input
                    name="token"
                    type="password"
                    autoComplete="off"
                    required
                    maxLength={10000}
                  />
                </label>
                <Button disabled={busy}>Verify session</Button>
              </form>
            </details>
          </>
        ) : (
          <>
            <div className="session-controls">
              <label className="field">
                Workspace
                <select
                  value={selected}
                  onChange={(e) => select(e.target.value)}
                  disabled={busy}
                >
                  <option value="" disabled>
                    Choose a workspace
                  </option>
                  {workspaces.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                      {w.role ? ` · ${w.role}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <button className="text-action" onClick={signout}>
                <LogOut size={17} />
                Sign out
              </button>
            </div>
            <details className="small-details" open={!workspaces.length}>
              <summary>
                <Plus size={15} />
                Create workspace
              </summary>
              <form className="session-form" onSubmit={create}>
                <label className="field">
                  Workspace name
                  <input name="name" required minLength={2} maxLength={100} />
                </label>
                <Button disabled={busy}>Create workspace</Button>
              </form>
            </details>
          </>
        )}
        {notice ? (
          <p role="status" className="action-notice">
            {notice}
          </p>
        ) : null}
      </section>
      {token && selected ? (
        <Home key={selected} workspaceId={selected} />
      ) : null}
    </>
  );
}
