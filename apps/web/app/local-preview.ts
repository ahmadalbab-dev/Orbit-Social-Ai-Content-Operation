// Device-only test adapter. It has no credentials, fetch calls or provider integration.
export const PREVIEW_STORAGE_KEY = "orbit-phone-preview-v1";
type Variant = { platform: string; copy: string; hashtags: string[]; callToAction: string };
type Item = { id: string; brandId: string; topic: string; variants: Variant[]; revision: number; status: string; source: "demo"; approvedRevision?: number; scheduledFor?: string };
type State = { version: 1; brands: { id: string; name: string; voice: string; audience: string }[]; items: Item[] };
const channels = ["facebook", "instagram", "threads"];
const empty = (): State => ({ version: 1, brands: [], items: [] });
function read(): State {
  const raw = localStorage.getItem(PREVIEW_STORAGE_KEY);
  if (!raw) return empty();
  if (raw.length > 3_000_000) throw new Error("Preview storage is too large. Clear this site's test data in browser settings.");
  let state: State;
  try { state = JSON.parse(raw); } catch { throw new Error("Preview data could not be read. Clear this site's test data in browser settings."); }
  if (state.version !== 1 || !Array.isArray(state.brands) || state.brands.length > 50 || !Array.isArray(state.items) || state.items.length > 200) throw new Error("Preview data format is unsupported.");
  return state;
}
function save(state: State) {
  try { localStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(state)); }
  catch { throw new Error("Phone storage is full or blocked. Your changes were not saved."); }
}
function validVariants(value: unknown): value is Variant[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 3) return false;
  return new Set(value.map(v => v?.platform)).size === value.length && value.every(v => v && channels.includes(v.platform) && typeof v.copy === "string" && v.copy.trim() && v.copy.length <= 4000 && Array.isArray(v.hashtags) && v.hashtags.length <= 12 && v.hashtags.every((h: unknown) => typeof h === "string" && h.length <= 100) && typeof v.callToAction === "string" && v.callToAction.length <= 240);
}
export async function localPreviewApi<T>(path: string, method = "GET", input?: unknown): Promise<T> {
  const state = read();
  const body = (input ?? {}) as Record<string, unknown>;
  let result: unknown;
  if (path === "/content" && method === "GET") result = state.items;
  else if (path === "/integrations/status" && method === "GET") result = { connectorMode: "mock", livePublishingSupported: false, persistence: "device-local", scheduledExecutionSupported: false, providers: Object.fromEntries(channels.map(p => [p, { credentialsConfigured: false, connected: false }])) };
  else if (path === "/brands" && method === "POST") {
    if ([body.name, body.voice, body.audience].some(v => typeof v !== "string" || !v.trim() || v.length > 2000)) throw new Error("Valid profile fields required.");
    const existing = state.brands.find(b => b.name === body.name && b.voice === body.voice && b.audience === body.audience);
    if (existing) return structuredClone(existing) as T;
    if (state.brands.length >= 50) throw new Error("Preview profile limit reached.");
    const brand = { id: crypto.randomUUID(), name: body.name as string, voice: body.voice as string, audience: body.audience as string };
    state.brands.push(brand); result = brand; save(state);
  } else if (path === "/content/generate" && method === "POST") {
    if (!state.brands.some(b => b.id === body.brandId)) throw new Error("Brand not found in workspace");
    if (state.items.length >= 200) throw new Error("Preview draft limit reached.");
    if (typeof body.topic !== "string" || !body.topic.trim() || body.topic.length > 4000 || !Array.isArray(body.platforms) || !body.platforms.length || body.platforms.length > 3 || new Set(body.platforms).size !== body.platforms.length || !body.platforms.every(p => channels.includes(p))) throw new Error("Valid topic and channels required.");
    const topic = body.topic.split(/\n(?:Account type|Language):/)[0];
    const item: Item = { id: crypto.randomUUID(), brandId: body.brandId as string, topic, variants: body.platforms.map(platform => ({ platform, copy: topic, hashtags: [], callToAction: "" })), revision: 1, status: "DRAFT", source: "demo" };
    state.items.unshift(item); result = item; save(state);
  } else {
    const match = /^\/content\/([^/]+)\/(review|approve|schedule|publish)$/.exec(path);
    if (!match) throw new Error("This operation is unavailable in the phone preview.");
    const item = state.items.find(i => i.id === match[1]);
    if (!item) throw new Error("Content not found in preview.");
    const action = match[2];
    if (method !== (action === "review" ? "PUT" : "POST")) throw new Error("Unsupported preview method.");
    if (action !== "publish" && (!Number.isInteger(body.expectedRevision) || body.expectedRevision !== item.revision)) throw new Error("Content revision changed; reload and review again.");
    if (action === "review") {
      if (item.status === "SIMULATED") throw new Error("Create a new draft after simulation.");
      if (!validVariants(body.variants)) throw new Error("Valid channel drafts required.");
      item.variants = structuredClone(body.variants); item.revision++; item.status = "DRAFT";
      delete item.approvedRevision; delete item.scheduledFor;
    } else if (action === "approve") {
      if (item.status !== "DRAFT" || !validVariants(item.variants)) throw new Error("Review a valid draft first.");
      item.approvedRevision = item.revision; item.status = "APPROVED";
    } else {
      if (!["APPROVED", "SCHEDULED"].includes(item.status) || item.approvedRevision !== item.revision) throw new Error("Explicit approval of the current revision required.");
      if (action === "schedule") {
        if (typeof body.scheduledFor !== "string" || !/T.*(?:Z|[+-]\d\d:\d\d)$/.test(body.scheduledFor) || !Number.isFinite(Date.parse(body.scheduledFor)) || Date.parse(body.scheduledFor) <= Date.now()) throw new Error("Choose a future schedule time.");
        item.scheduledFor = new Date(body.scheduledFor).toISOString(); item.status = "SCHEDULED";
      } else {
        if (item.scheduledFor && Date.parse(item.scheduledFor) > Date.now()) throw new Error("Scheduled content is not due yet.");
        item.status = "SIMULATED";
      }
    }
    result = item; save(state);
  }
  return structuredClone(result) as T;
}
