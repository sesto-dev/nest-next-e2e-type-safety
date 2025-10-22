import { z } from 'zod';

import { TodoModelSchema } from '~/prisma/generated/schemas/variants/pure/Todo.pure';

export const TodoPublicSchema = TodoModelSchema.pick({
  id: true,
  title: true,
  description: true,
  is_complete: true,
  created_at: true,
  updated_at: true,
}).extend({
  owner: TodoModelSchema.shape.owner_id,
  owner_email: z.string().email(),
});

export const TodoCreateRequestSchema = TodoPublicSchema.pick({
  title: true,
  description: true,
  is_complete: true,
}).partial({
  description: true,
  is_complete: true,
});

export const TodoUpdateRequestSchema = TodoCreateRequestSchema.partial();
