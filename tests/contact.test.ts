import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { app } from '../worker/index';
import type { Env } from '../worker/env';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const json = (res: Response) => res.json() as Promise<any>;

const valid = {
  name: 'Ada',
  email: 'ada@example.com',
  topic: 'app',
  budget: '2k-5k',
  message: 'I would like a booking app for my studio.',
  website: '',
  turnstileToken: 'token-123',
};

let allow = true;
const env = (over: Partial<Env> = {}): Env =>
  ({
    ASSETS: {} as Fetcher,
    CONTACT_LIMITER: { limit: async () => ({ success: allow }) },
    TURNSTILE_SECRET: 'secret',
    RESEND_API_KEY: 're_test',
    CONTACT_TO: 'me@example.com',
    CONTACT_FROM: 'Portfolio <onboarding@resend.dev>',
    MAIL_MODE: 'send',
    ...over,
  }) as Env;

const post = (body: unknown, headers: Record<string, string> = {}, e = env()) =>
  app.request(
    'https://site.test/api/contact',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://site.test', ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    },
    e,
  );

let fetchMock: ReturnType<typeof vi.fn>;
let turnstileOk = true;
let resendStatus = 200;

beforeEach(() => {
  allow = true;
  turnstileOk = true;
  resendStatus = 200;
  fetchMock = vi.fn(async (url: string) => {
    if (url.includes('turnstile')) return Response.json({ success: turnstileOk });
    if (url.includes('resend')) return new Response('{}', { status: resendStatus });
    throw new Error(`unexpected fetch ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const resendCalls = () => fetchMock.mock.calls.filter(([u]) => String(u).includes('resend'));

describe('POST /api/contact', () => {
  it('sends a valid message with the visitor as reply-to', async () => {
    const res = await post(valid);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(resendCalls()).toHaveLength(1);
    const sent = JSON.parse(resendCalls()[0]![1].body);
    expect(sent.to).toEqual(['me@example.com']);
    expect(sent.reply_to).toBe('ada@example.com');
    expect(sent.subject).toBe('Portfolio: A web app — Ada');
    expect(sent.text).toContain('Budget: $2k–5k');
  });

  it('returns field errors for invalid input and sends nothing', async () => {
    const res = await post({ ...valid, email: 'nope', message: 'hi' });
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toBe('invalid');
    expect(Object.keys(body.fields).sort()).toEqual(['email', 'message']);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a newline in the name (header injection)', async () => {
    const res = await post({ ...valid, name: 'Ada\nBcc: x@evil.test' });
    expect(res.status).toBe(400);
  });

  it('pretends success for a filled honeypot and sends nothing', async () => {
    const res = await post({ ...valid, website: 'http://spam.test' });
    expect(await res.json()).toEqual({ ok: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('blocks a failed Turnstile check', async () => {
    turnstileOk = false;
    const res = await post(valid);
    expect(res.status).toBe(403);
    expect((await json(res)).error).toBe('bot_check_failed');
    expect(resendCalls()).toHaveLength(0);
  });

  it('blocks a missing Turnstile token without calling Cloudflare', async () => {
    const res = await post({ ...valid, turnstileToken: '' });
    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rate limits', async () => {
    allow = false;
    const res = await post(valid);
    expect(res.status).toBe(429);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects cross-origin posts', async () => {
    const res = await post(valid, { Origin: 'https://evil.test' });
    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a malformed body', async () => {
    const res = await post('not json');
    expect(res.status).toBe(400);
  });

  it('reports a Resend failure as send_failed', async () => {
    resendStatus = 500;
    const res = await post(valid);
    expect(res.status).toBe(502);
    expect((await json(res)).error).toBe('send_failed');
  });

  it('logs instead of sending in MAIL_MODE=log', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const res = await post(valid, {}, env({ MAIL_MODE: 'log' }));
    expect(await res.json()).toEqual({ ok: true });
    expect(resendCalls()).toHaveLength(0);
    log.mockRestore();
  });
});
