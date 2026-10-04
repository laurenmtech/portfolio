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
let sendMock: ReturnType<typeof vi.fn>;
const env = (over: Partial<Env> = {}): Env =>
  ({
    ASSETS: {} as Fetcher,
    CONTACT_LIMITER: { limit: async () => ({ success: allow }) },
    SEND_EMAIL: { send: sendMock },
    TURNSTILE_SECRET: 'secret',
    CONTACT_TO: 'me@example.com',
    CONTACT_FROM: 'contact@site.test',
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
let sendFails = false;

beforeEach(() => {
  allow = true;
  turnstileOk = true;
  sendFails = false;
  sendMock = vi.fn(async () => {
    if (sendFails) throw new Error('destination address not verified');
    return { messageId: 'm1' };
  });
  fetchMock = vi.fn(async (url: string) => {
    if (url.includes('turnstile')) return Response.json({ success: turnstileOk });
    throw new Error(`unexpected fetch ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());


describe('POST /api/contact', () => {
  it('sends a valid message with the visitor as reply-to', async () => {
    const res = await post(valid);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(sendMock).toHaveBeenCalledTimes(1);
    const sent = sendMock.mock.calls[0]![0];
    expect(sent.to).toBe('me@example.com');
    expect(sent.from.email).toBe('contact@site.test');
    expect(sent.replyTo).toEqual({ name: 'Ada', email: 'ada@example.com' });
    expect(sent.subject).toBe('Portfolio: A web app or portal — Ada');
    expect(sent.text).toContain('Budget: $2k–5k');
  });

  it('returns field errors for invalid input and sends nothing', async () => {
    const res = await post({ ...valid, email: 'nope', message: 'hi' });
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error).toBe('invalid');
    expect(Object.keys(body.fields).sort()).toEqual(['email', 'message']);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('rejects a newline in the name (header injection)', async () => {
    const res = await post({ ...valid, name: 'Ada\nBcc: x@evil.test' });
    expect(res.status).toBe(400);
  });

  it('pretends success for a filled honeypot and sends nothing', async () => {
    const res = await post({ ...valid, website: 'http://spam.test' });
    expect(await res.json()).toEqual({ ok: true });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('blocks a failed Turnstile check', async () => {
    turnstileOk = false;
    const res = await post(valid);
    expect(res.status).toBe(403);
    expect((await json(res)).error).toBe('bot_check_failed');
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('blocks a missing Turnstile token without calling Cloudflare', async () => {
    const res = await post({ ...valid, turnstileToken: '' });
    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('rate limits', async () => {
    allow = false;
    const res = await post(valid);
    expect(res.status).toBe(429);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('rejects cross-origin posts', async () => {
    const res = await post(valid, { Origin: 'https://evil.test' });
    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('rejects a malformed body', async () => {
    const res = await post('not json');
    expect(res.status).toBe(400);
  });

  it('reports a send failure as send_failed without logging the message', async () => {
    sendFails = true;
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await post(valid);
    expect(res.status).toBe(502);
    expect((await json(res)).error).toBe('send_failed');
    expect(JSON.stringify(error.mock.calls)).not.toContain('booking app');
    error.mockRestore();
  });

  it('logs instead of sending in MAIL_MODE=log', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const res = await post(valid, {}, env({ MAIL_MODE: 'log' }));
    expect(await res.json()).toEqual({ ok: true });
    expect(sendMock).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
