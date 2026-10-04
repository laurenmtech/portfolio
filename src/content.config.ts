import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/projects' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      tagline: z.string(),
      role: z.string(),
      stack: z.array(z.string()).min(1),
      tags: z.array(z.string()),
      status: z.enum(['live', 'in-progress', 'archived']),
      links: z
        .object({ live: z.url().optional(), repo: z.url().optional() })
        .default({}),
      featured: z.boolean().default(false),
      order: z.number().int().default(100),
      cover: image().optional(),
      coverAlt: z.string().default(''),
      // Three or four short proof points shown beside the case study.
      highlights: z.array(z.string()).default([]),
      // Extra facts the chat may use. Treat as public: anyone can get the chat to repeat it.
      chatNotes: z.string().optional(),
      draft: z.boolean().default(false),
    }),
});

// Single entry with id "me".
const profile = defineCollection({
  loader: file('./src/content/profile.yaml'),
  schema: z.object({
    name: z.string(),
    headline: z.string(),
    // Region only. Never a city or address (spec §9).
    region: z.string(),
    availability: z.enum(['open', 'limited', 'closed']),
    bio: z.string(),
    skills: z.array(z.object({ group: z.string(), items: z.array(z.string()) })),
    services: z.array(z.object({ title: z.string(), blurb: z.string() })),
    links: z.object({ github: z.url().optional(), resume: z.string().optional() }),
  }),
});

const faq = defineCollection({
  loader: file('./src/content/faq.yaml'),
  schema: z.object({
    q: z.string(),
    a: z.string(),
    // Keywords for nap-mode matching when the LLM is unavailable.
    keywords: z.array(z.string()).default([]),
    // Display order on the Services page (lowest first).
    order: z.number().int().default(100),
  }),
});

export const collections = { projects, profile, faq };
