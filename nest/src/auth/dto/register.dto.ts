import { createZodDto } from 'nestjs-zod';

import { RegisterRequestSchema, RegisterResponseSchema } from '~/common/schemas/user.schema';

export class RegisterRequestDto extends createZodDto(RegisterRequestSchema) {}

export class RegisterResponseDto extends createZodDto(RegisterResponseSchema) {}
