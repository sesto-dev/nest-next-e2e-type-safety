import type { ZodTypeAny } from 'zod';
import { z } from 'zod';

export const PaginationEnvelopeSchema = z.object({
  count: z.number().int(),
  next: z.string().url().nullable(),
  previous: z.string().url().nullable(),
});

export const createPaginatedSchema = <T extends ZodTypeAny>(itemSchema: T) =>
  PaginationEnvelopeSchema.extend({
    results: z.array(itemSchema),
  });
