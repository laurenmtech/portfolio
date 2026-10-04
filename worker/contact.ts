import { Hono } from 'hono';
import { BUDGETS, CONTACT_TOPICS, ContactRequest, type ContactResponse } from '../src/lib/schemas';
import type { Env } from './env';

const contact = new Hono<{ Bindings: Env }>();

contact.post('/', async (c) => {
  const reply = (body: ContactResponse, status: 200 | 400 | 403 | 429 | 502 | 500 = 200) => c.json(body, status);

  // Same-origin only. Browsers always send Origin on a cross-site POST.
  const origin = c.req.header('Origin');
  if (origin && origin !== new URL(c.req.url).origin) return reply({ ok: false, error: 'bad_request' }, 403);

  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown';
  const { success } = await c.env.CONTACT_LIMITER.limit({ key: ip });
  if (!success) return reply({ ok: false, error: 'rate_limited' }, 429);

  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return reply({ ok: false, error: 'bad_request' }, 400);
  }

  const parsed = ContactRequest.safeParse(raw);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? '');
      if (key && !fields[key]) fields[key] = issue.message;
    }
    return reply({ ok: false, error: 'invalid', fields }, 400);
  }
  const form = parsed.data;

  // Bots that fill the honeypot get a cheerful success and nothing is sent.
  if (form.website) return reply({ ok: true });

  if (!(await verifyTurnstile(c.env.TURNSTILE_SECRET, form.turnstileToken, ip))) {
    return reply({ ok: false, error: 'bot_check_failed' }, 403);
  }

  const topic = CONTACT_TOPICS[form.topic];
  const lines = [
    `From: ${form.name} <${form.email}>`,
    `About: ${topic}`,
    ...(form.budget ? [`Budget: ${BUDGETS[form.budget]}`] : []),
    '',
    form.message,
    '',
    '—',
    'Sent from the contact form on your portfolio. Reply to this email to answer them directly.',
  ];
  const email = {
    from: { name: 'Portfolio contact form', email: c.env.CONTACT_FROM },
    to: c.env.CONTACT_TO,
    replyTo: { name: form.name, email: form.email },
    subject: `Portfolio: ${topic} — ${form.name}`,
    text: lines.join('\n'),
  };

  if (c.env.MAIL_MODE === 'log') {
    console.log('[contact] MAIL_MODE=log, not sending:\n' + JSON.stringify(email, null, 2));
    return reply({ ok: true });
  }

  try {
    await c.env.SEND_EMAIL.send(email);
  } catch (err) {
    // Log the reason only. The message itself is personal data and never gets logged.
    console.error('[contact] send failed:', err instanceof Error ? err.message : 'unknown');
    return reply({ ok: false, error: 'send_failed' }, 502);
  }
  return reply({ ok: true });
});

async function verifyTurnstile(secret: string, token: string, ip: string): Promise<boolean> {
  if (!token) return false;
  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token);
  if (ip !== 'unknown') body.append('remoteip', ip);
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

export default contact;
