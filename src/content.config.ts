import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const docs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/docs' }),
  schema: z.object({
    title: z.string(),
    doc: z.string(),
    upstream: z.string(),
    category: z.string(),
    order: z.number(),
    summary: z.string(),
  }),
});

export const collections = { docs };
