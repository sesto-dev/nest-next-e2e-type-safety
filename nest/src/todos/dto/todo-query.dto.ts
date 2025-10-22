import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const TodoListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1).optional(),
    search: z.string().trim().min(1).optional(),
    ordering: z
      .enum(['title', '-title', 'created_at', '-created_at', 'updated_at', '-updated_at'])
      .optional(),
    created_at__gte: z.coerce.date().optional(),
    created_at__lte: z.coerce.date().optional(),
    updated_at__gte: z.coerce.date().optional(),
    updated_at__lte: z.coerce.date().optional(),
  })
  .partial();

export class TodoListQueryDto extends createZodDto(TodoListQuerySchema) {}

export type TodoListQuery = z.infer<typeof TodoListQuerySchema>;
