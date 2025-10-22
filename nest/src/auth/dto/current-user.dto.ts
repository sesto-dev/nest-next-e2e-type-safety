import { createZodDto } from 'nestjs-zod';

import { CurrentUserSchema } from '~/common/schemas/user.schema';

export class CurrentUserDto extends createZodDto(CurrentUserSchema) {}
