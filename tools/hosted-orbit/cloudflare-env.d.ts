declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
declare namespace Cloudflare { interface Env { TOKEN_ENCRYPTION_KEY?:string; META_APP_ID?:string; THREADS_APP_ID?:string; ORBIT_ORIGIN?:string; META_GRAPH_API_VERSION?:string; } }
