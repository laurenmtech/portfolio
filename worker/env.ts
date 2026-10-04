export type Env = {
  ASSETS: Fetcher;
  CONTACT_LIMITER: RateLimit;
  /** Secret. Turnstile server-side key. */
  TURNSTILE_SECRET: string;
  /** Secret. Resend API key. Unused when MAIL_MODE is "log". */
  RESEND_API_KEY: string;
  /** Secret. Where contact messages are delivered. Kept out of the public repo. */
  CONTACT_TO: string;
  /** Sender address. onboarding@resend.dev until a domain is verified with Resend. */
  CONTACT_FROM: string;
  /** "log" prints emails instead of sending them. Local dev only. */
  MAIL_MODE?: 'log' | 'send';
};
