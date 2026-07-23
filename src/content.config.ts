import { glob } from 'astro/loaders';
import { defineCollection, z } from 'astro:content';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    org: z.string(),
    dateRange: z.string(),
    description: z.string(),
    tags: z.array(z.string()),
    featured: z.boolean().default(false),
    image: z.string().optional(),
    repoUrl: z.string().url().optional(),
    caseStudy: z.object({ slug: z.string() }).optional(),
  }),
});

export const collections = { projects };
