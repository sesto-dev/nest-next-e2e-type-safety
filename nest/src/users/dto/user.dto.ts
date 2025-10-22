import { createZodDto } from 'nestjs-zod';

import { createPaginatedSchema } from '~/common/schemas/pagination.schema';
import { UserPublicSchema, UserUpdateRequestSchema } from '~/common/schemas/user.schema';

export const PaginatedUserSchema = createPaginatedSchema(UserPublicSchema);

export class UserResponseDto extends createZodDto(UserPublicSchema) {}

export class UserUpdateRequestDto extends createZodDto(UserUpdateRequestSchema) {}

export class PaginatedUserResponseDto extends createZodDto(PaginatedUserSchema) {}
