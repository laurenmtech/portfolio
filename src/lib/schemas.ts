import { z } from 'zod';

export const CONTACT_TOPICS = {
  website: 'A website (new or upgraded)',
  app: 'A web app or portal',
  ai: 'An AI feature',
  support: 'Help with something I already have',
  job: 'A job opportunity',
  hi: 'Just saying hi',
} as const;

export type ContactTopic = keyof typeof CONTACT_TOPICS;

// Topics where a budget question makes sense.
export const CLIENT_TOPICS: readonly ContactTopic[] = ['website', 'app', 'ai'];

export const BUDGETS = {
  'under-2k': 'Under $2k',
  '2k-5k': '$2k–5k',
  '5k-15k': '$5k–15k',
  '15k-plus': '$15k+',
  unsure: 'Not sure yet',
} as const;

const oneLine = (max: number) =>
  z
    .string()
    .trim()
    .min(1, 'Required')
    .max(max, `Keep it under ${max} characters`)
    .refine((s) => !/[\r\n]/.test(s), 'Single line only');

export const ContactRequest = z.object({
  name: oneLine(100),
  email: z.string().trim().max(254).pipe(z.email('That email address doesn’t look right')),
  topic: z.enum(Object.keys(CONTACT_TOPICS) as [ContactTopic, ...ContactTopic[]]),
  budget: z.enum(Object.keys(BUDGETS) as [keyof typeof BUDGETS, ...(keyof typeof BUDGETS)[]]).optional(),
  message: z
    .string()
    .trim()
    .min(10, 'Tell me a little more (10 characters or so)')
    .max(5000, 'Keep it under 5,000 characters'),
  // Honeypot: hidden from people, irresistible to form-filling bots. Must be empty.
  website: z.string().max(500).optional().default(''),
  turnstileToken: z.string().max(2048).optional().default(''),
});

export type ContactRequest = z.infer<typeof ContactRequest>;

export type ContactResponse =
  | { ok: true }
  | { ok: false; error: 'invalid'; fields: Partial<Record<keyof ContactRequest, string>> }
  | { ok: false; error: 'rate_limited' | 'bot_check_failed' | 'send_failed' | 'bad_request' };
