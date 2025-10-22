import { createZodDto } from 'nestjs-zod';

import { LoginRequestSchema, LoginResponseSchema } from '~/common/schemas/user.schema';

export class LoginRequestDto extends createZodDto(LoginRequestSchema) {}

export class LoginResponseDto extends createZodDto(LoginResponseSchema) {}
