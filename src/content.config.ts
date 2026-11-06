import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const gate = { listed: z.boolean().default(true), cleared: z.boolean().default(false), order: z.number() };

const work = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/work' }),
  schema: z.object({
    company: z.string(), title: z.string(), project: z.string(), dates: z.string(),
    start: z.string(), end: z.string(), summary: z.string(), stack: z.array(z.string()),
    logo: z.string(), logoFill: z.boolean().default(false), current: z.boolean().default(false), ...gate,
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/projects' }),
  schema: z.object({
    name: z.string(), kicker: z.string(), lede: z.string(), summary: z.string(), tag: z.string(),
    meta: z.object({ role: z.string(), status: z.string(), stack: z.string() }),
    repoUrl: z.string().url().optional(), ...gate,
  }),
});

export const collections = { work, projects };
