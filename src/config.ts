// Public, client-side settings. Nothing secret belongs in this file.

/**
 * Turnstile site key (public by design). The current value is Cloudflare's documented
 * test key, which always passes. Replace it with the real key before deploying, or the
 * production secret will reject every submission.
 */
export const TURNSTILE_SITE_KEY = '1x00000000000000000000AA';
