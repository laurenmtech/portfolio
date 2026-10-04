// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // Swap for the custom domain at M5.
  site: 'https://portfolio.laurenmtech-aef.workers.dev',
  output: 'static',
  // Emit /about.html rather than /about/index.html so Workers assets serve /about
  // directly instead of redirecting to /about/ first.
  build: { format: 'file' },
  trailingSlash: 'never',
  integrations: [mdx()],
  vite: {
    plugins: [tailwindcss()],
  },
});
