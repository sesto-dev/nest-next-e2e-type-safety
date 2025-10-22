import type { z } from 'zod';

import { UserPublicSchema } from '~/common/schemas/user.schema';

export type AuthenticatedUser = z.infer<typeof UserPublicSchema>;
