import { createZodDto } from 'nestjs-zod';

import { createPaginatedSchema } from '~/common/schemas/pagination.schema';
import {
  TodoCreateRequestSchema,
  TodoPublicSchema,
  TodoUpdateRequestSchema,
} from '~/common/schemas/todo.schema';

export const PaginatedTodoSchema = createPaginatedSchema(TodoPublicSchema);

export class TodoResponseDto extends createZodDto(TodoPublicSchema) {}

export class TodoCreateRequestDto extends createZodDto(TodoCreateRequestSchema) {}

export class TodoUpdateRequestDto extends createZodDto(TodoUpdateRequestSchema) {}

export class PaginatedTodoResponseDto extends createZodDto(PaginatedTodoSchema) {}
