import { refreshAuth, type AuthSession } from "./auth-client";

/** One in-memory refresh at a time. Late replies cannot restore a signed-out session. */
export class SessionRenewal {
  private session: AuthSession | null = null;
  private expiresAt = 0;
  private generation = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private pending: Promise<void> | null = null;

  constructor(
    private onRenew: (session: AuthSession) => void,
    private onExpire: () => void,
    private refresh = refreshAuth,
  ) {}

  start(session: AuthSession) {
    this.stop();
    this.session = session;
    this.schedule();
  }

  stop() {
    this.generation++;
    clearTimeout(this.timer);
    this.session = null;
    this.pending = null;
    this.expiresAt = 0;
  }

  private schedule() {
    const session = this.session;
    if (!session) return;
    const lifetime = Math.min(session.expires_in, 86400) * 1000;
    this.expiresAt = Date.now() + lifetime;
    const lead = session.refresh_token ? Math.min(60000, lifetime / 4) : 0;
    this.timer = setTimeout(() => {
      void this.check();
    }, lifetime - lead);
  }

  /** Also called after a phone tab wakes up, when background timers may have paused. */
  check(): Promise<void> {
    if (this.pending) return this.pending;
    const session = this.session;
    if (!session) return Promise.resolve();
    const lead = session.refresh_token
      ? Math.min(60000, session.expires_in * 250)
      : 0;
    if (Date.now() < this.expiresAt - lead) return Promise.resolve();
    const generation = this.generation;
    this.pending = (async () => {
      try {
        if (!session.refresh_token) throw Error("Session expired");
        const next = await this.refresh(session.refresh_token);
        if (generation !== this.generation) return;
        this.session = next;
        this.onRenew(next);
        this.schedule();
      } catch {
        if (generation !== this.generation) return;
        this.stop();
        this.onExpire();
      } finally {
        if (generation === this.generation) this.pending = null;
      }
    })();
    return this.pending;
  }
}
