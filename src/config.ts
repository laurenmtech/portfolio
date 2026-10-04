// Public, client-side settings. Nothing secret belongs in this file.

/**
 * Turnstile site key (public by design). The current value is Cloudflare's documented
 * test key, which always passes. Replace it with the real key before deploying, or the
 * production secret will reject every submission.
 */
export const TURNSTILE_SITE_KEY = '1x00000000000000000000AA';

/**
 * Off until the domain, Email Routing and Worker secrets are set up (see ~/Portfolio/TODO.md).
 * While false, /contact shows a "coming soon" note instead of a form that can't send.
 */
export const CONTACT_FORM_ENABLED = false;
