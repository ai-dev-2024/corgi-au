export interface Env {
  DB: D1Database;
  OCM_API_KEY: string;
  /** Optional so unit tests and `wrangler dev` without KV still work (fail-open). */
  RATE_LIMIT_KV?: KVNamespace;
}
