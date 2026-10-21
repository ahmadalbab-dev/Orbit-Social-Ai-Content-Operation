"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LogOut,
  Plus,
  ShieldCheck,
} from "lucide-react";
import Home from "./page-client";
import { EditorWorkspace } from "./editor-workspace";
import { api, setApiSession } from "./session-api";
import { passwordAuth, publicAuthConfig, revokeSession } from "./auth-client";
import { OrbitMark } from "./design-ui";
import { AppearanceToggle, useAppearance } from "./appearance";
import { OrbitField } from "./orbit-field";
import { Button } from "./ui";
import {browserSession,clearBrowserSession} from "./browser-session";
import { SessionRenewal } from "./session-renewal";
import { PasswordRecovery } from "./password-recovery";
import type { AuthSession } from "./auth-client";
import { confirmEmailRedirect } from "./confirmation-client";
type Workspace = { id: string; name: string; role?: string };
export function WorkspaceApp({ editorKind }: { editorKind?: "image" | "video" } = {}) {
  const [restoring,setRestoring]=useState(true);
  const restoreRequest=useRef<Promise<AuthSession|null>|null>(null);
  const [token, setToken] = useState("");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selected, setSelected] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [signup, setSignup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { motion } = useAppearance();
  const configured = !!publicAuthConfig();
  const selectedRef = useRef("");
  const tokenRef = useRef("");
  const authGeneration = useRef(0);
  const confirmation = useRef<Promise<string | null> | null>(null);
  useEffect(() => {
    let active = true;
    const checkConfirmation = () => {
      // Clear credentials from history before any request. Strict Mode reuses the promise.
      const fragment = window.location.hash;
      const params = new URLSearchParams(fragment.slice(1));
      if (params.has("access_token") || params.has("error_code") || params.has("error")) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        confirmation.current = confirmEmailRedirect(fragment);
      }
      if (confirmation.current) {
        setBusy(true);
        setSignup(false);
        setRecovering(false);
        setNotice("Checking your email confirmation…");
        void confirmation.current.then(message => {
          if (active) { setNotice(message ?? ""); setBusy(false); }
        });
      }
    };
    checkConfirmation();
    window.addEventListener("hashchange", checkConfirmation);
    return () => { active = false; window.removeEventListener("hashchange", checkConfirmation); };
  }, []);
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
          void clearBrowserSession().catch(()=>{});
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
        async()=>{const session=await browserSession();if(!session)throw Error("Session expired");return session;},
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
  useEffect(()=>{
    let active=true;
    if(confirmation.current){setRestoring(false);return;}
    // Share the provider refresh across Strict Mode effect replay.
    restoreRequest.current??=browserSession();
    void restoreRequest.current.then(async session=>{
      if(!active)return;
      if(session)await connect(session.access_token,session.expires_in,session);
    }).catch(error=>{if(active)setNotice(error instanceof Error?error.message:"Could not restore session.");}).finally(()=>{if(active)setRestoring(false);});
    return()=>{active=false;};
  },[]);
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
      let preferred="";try{preferred=localStorage.getItem("orbit-workspace")??"";}catch{}
      const id = list.find(item=>item.id===preferred)?.id ?? list[0]?.id ?? "";
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
      if (signup) {
        if (session) await revokeSession(session.access_token, "local");
        setSignup(false);
        setNotice("Check your inbox and spam folder for your confirmation email. Confirm your email, then sign in here.");
      } else if (session) {
        const saved=session.refresh_token?await browserSession(session.refresh_token):session;
        if(!saved)throw Error("Could not save your session. Please sign in again.");
        await connect(saved.access_token,saved.expires_in,saved);
      }
      else
        setNotice(
          "If this address is eligible, check your email to confirm your account, then return here to sign in.",
        );
      form.reset();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Sign-in failed.");
    } finally {
      const password = form.elements.namedItem("password");
      if (password instanceof HTMLInputElement) password.value = "";
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
    try{localStorage.setItem("orbit-workspace",id);}catch{}
    setSelected(id);
    setApiSession({ token: tokenRef.current, workspaceId: id });
  }
  async function signout() {
    if(busy)return;
    setBusy(true);
    const previous=tokenRef.current;
    try{
      await clearBrowserSession();
      await revokeSession(previous,"local");
    }catch{
      setNotice("Could not sign out on this device. Check your connection and retry Sign out.");
      setBusy(false);return;
    }
    authGeneration.current++;
    tokenRef.current="";renewal.stop();selectedRef.current="";
    try{localStorage.removeItem("orbit-workspace");}catch{}
    setApiSession(null);setToken("");setSelected("");setWorkspaces([]);setNotice("");setBusy(false);
  }
  if(restoring)return <main className="orbit-auth"><p role="status">Restoring your session…</p></main>;
  if (!token)
    return (
      <main className="orbit-auth" id="workspace-session">
        <div className="auth-frame">
          <header className="auth-topbar">
            <a
              href="/"
              className="auth-brand"
              aria-label="Orbit AI Studio home"
            >
              <OrbitMark small />
              <span>Orbit AI Studio</span>
            </a>
            <AppearanceToggle />
          </header>
          <div className="auth-orbit-visual" aria-hidden="true">
            <OrbitField paused={!motion} centered />
          </div>
          <section className="auth-card" aria-labelledby="auth-title">
            <div className="auth-heading">
              <p className="auth-eyebrow">A LITTLE SPACE TO CREATE</p>
              <h1 id="auth-title">
                {recovering
                  ? "Find your way back."
                  : signup
                    ? "Make room for your ideas."
                    : "Welcome to Orbit."}
              </h1>
              <p>
                {recovering
                  ? "Let's get you back to your workspace."
                  : signup
                    ? "Create your account. Bring your ideas to life."
                    : "Sign in to your content, your channels, your space."}
              </p>
            </div>
            {recovering && configured ? (
              <PasswordRecovery
                onCancel={() => {
                  setRecovering(false);
                  setNotice("");
                }}
              />
            ) : (
              <>
                <form
                  onSubmit={auth}
                  className="session-form auth-form"
                  aria-label={
                    signup ? "Create Orbit account" : "Sign in to Orbit"
                  }
                >
                  <label className="field" htmlFor="orbit-auth-email">
                    Email address
                  </label>
                  <input
                    id="orbit-auth-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    placeholder="you@example.com"
                    required
                    maxLength={254}
                    disabled={busy}
                  />
                  <label className="field" htmlFor="orbit-auth-password">
                    {signup ? "Create a password" : "Password"}
                  </label>
                  <div className="auth-password-field">
                    <input
                      id="orbit-auth-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete={
                        signup ? "new-password" : "current-password"
                      }
                      placeholder={
                        signup ? "At least 8 characters" : "Your password"
                      }
                      required
                      minLength={signup ? 8 : 1}
                      maxLength={256}
                      disabled={busy}
                      aria-describedby={
                        signup ? "auth-password-hint" : undefined
                      }
                    />
                    <button
                      type="button"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      aria-pressed={showPassword}
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                    </button>
                  </div>
                  {signup ? (
                    <p className="auth-password-hint" id="auth-password-hint">
                      Use at least 8 characters.
                    </p>
                  ) : (
                    <button
                      type="button"
                      className="auth-link auth-forgot"
                      disabled={busy || !configured}
                      onClick={() => {
                        setRecovering(true);
                        setNotice("");
                        setShowPassword(false);
                      }}
                    >
                      Forgot password?
                    </button>
                  )}
                  {notice ? (
                    <p role="status" className="action-notice auth-notice">
                      {notice}
                    </p>
                  ) : null}
                  <Button
                    className="auth-submit"
                    disabled={busy || !configured}
                  >
                    {busy
                      ? "Connecting…"
                      : signup
                        ? "Create account"
                        : "Sign in"}
                    {!busy ? <ArrowRight size={18} aria-hidden="true" /> : null}
                  </Button>
                </form>
                {!configured ? (
                  <div className="auth-setup" role="status">
                    <ShieldCheck size={17} aria-hidden="true" />
                    <p>Sign-in is being set up. Please check back shortly.</p>
                  </div>
                ) : null}
                <div className="auth-switch">
                  <span>
                    {signup ? "Already have an account?" : "New to Orbit?"}
                  </span>
                  <button
                    type="button"
                    className="auth-link"
                    disabled={busy}
                    onClick={() => {
                      setSignup(!signup);
                      setShowPassword(false);
                      setNotice("");
                    }}
                  >
                    {signup ? "Sign in" : "Create an account"}
                  </button>
                </div>
              </>
            )}
            <a className="auth-preview-link" href="/preview">
              Explore Orbit before signing in{" "}
              <ArrowRight size={15} aria-hidden="true" />
            </a>
          </section>
          <footer className="auth-footer">
            <span>Your ideas. Every channel.</span>
            <nav aria-label="Legal">
              <a href="/privacy">Privacy</a>
              <a href="/terms">Terms</a>
            </nav>
          </footer>
        </div>
      </main>
    );
  const workspaceControls = (
      <section
        className="workspace-session workspace-management surface"
        id="workspace-session"
        aria-label="Workspace session"
      >
        <div className="session-controls">
          <label className="field">
            Workspace
            <select
              aria-label="Workspace"
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
        {notice ? (
          <p role="status" className="action-notice">
            {notice}
          </p>
        ) : null}
      </section>
  );
  if (selected && editorKind) return <EditorWorkspace key={selected} kind={editorKind} workspaceName={workspaces.find(workspace=>workspace.id===selected)?.name ?? "Your workspace"}/>;
  return selected ? <Home key={selected} workspaceId={selected} workspaceName={workspaces.find(workspace=>workspace.id===selected)?.name ?? "Your workspace"} workspaceControls={workspaceControls}/> : <main className="workspace-onboarding"><div className="session-brand"><OrbitMark/><h1>Your workspace</h1><AppearanceToggle/></div>{workspaceControls}</main>;
}
