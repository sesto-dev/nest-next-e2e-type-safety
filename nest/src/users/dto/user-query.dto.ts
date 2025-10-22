import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const UserListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1).optional(),
    search: z.string().trim().min(1).optional(),
    ordering: z
      .enum(['name', '-name', 'created_at', '-created_at', 'updated_at', '-updated_at'])
      .optional(),
    created_at__gte: z.coerce.date().optional(),
    created_at__lte: z.coerce.date().optional(),
    updated_at__gte: z.coerce.date().optional(),
    updated_at__lte: z.coerce.date().optional(),
  })
  .partial();

export class UserListQueryDto extends createZodDto(UserListQuerySchema) {}

export type UserListQuery = z.infer<typeof UserListQuerySchema>;
