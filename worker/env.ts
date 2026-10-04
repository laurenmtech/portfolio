export type Env = {
  ASSETS: Fetcher;
  CONTACT_LIMITER: RateLimit;
  /** Cloudflare Email Routing send binding. Can only deliver to verified destination addresses. */
  SEND_EMAIL: SendEmail;
  /** Secret. Turnstile server-side key. */
  TURNSTILE_SECRET: string;
  /** Secret. Where contact messages go: a verified Email Routing destination. Kept out of the public repo. */
  CONTACT_TO: string;
  /** Sender address. Must be on the domain that has Email Routing enabled. */
  CONTACT_FROM: string;
  /** "log" prints emails instead of sending them. Local dev only. */
  MAIL_MODE?: 'log' | 'send';
};
