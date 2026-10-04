import { Hono } from 'hono';
import contact from './contact';
import type { Env } from './env';

const app = new Hono<{ Bindings: Env }>().basePath('/api');

app.get('/health', (c) => c.json({ ok: true }));
app.route('/contact', contact);

app.notFound((c) => c.json({ error: 'not_found' }, 404));
app.onError((err, c) => {
  console.error('[api] unhandled', err.message);
  return c.json({ ok: false, error: 'server_error' }, 500);
});

export { app };

export default {
  fetch(request, env, ctx) {
    // wrangler.jsonc routes only /api/* here; everything else is served from static assets
    // before the Worker runs. This fallback covers anything that slips through.
    const { pathname } = new URL(request.url);
    if (pathname === '/api' || pathname.startsWith('/api/')) {
      return app.fetch(request, env, ctx);
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
