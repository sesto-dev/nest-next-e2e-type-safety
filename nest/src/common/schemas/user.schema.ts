import { z } from 'zod';

import { GroupModelSchema } from '~/prisma/generated/schemas/variants/pure/Group.pure';
import { UserModelSchema } from '~/prisma/generated/schemas/variants/pure/User.pure';
import { UserCreateInputObjectZodSchema } from '~/prisma/generated/schemas/objects/UserCreateInput.schema';

export const GroupPublicSchema = GroupModelSchema.pick({
  id: true,
  name: true,
});

export const UserPublicSchema = UserModelSchema.pick({
  id: true,
  email: true,
  avatar: true,
  name: true,
  phone: true,
  birthday: true,
  is_active: true,
  is_staff: true,
  is_email_verified: true,
  is_phone_verified: true,
  created_at: true,
  updated_at: true,
}).extend({
  groups: z.array(GroupPublicSchema),
});

export const RegisterRequestSchema = UserCreateInputObjectZodSchema.pick({
  email: true,
  password: true,
  name: true,
});

export const RegisterResponseSchema = RegisterRequestSchema.omit({
  password: true,
}).extend({
  id: UserPublicSchema.shape.id,
});

export const LoginRequestSchema = RegisterRequestSchema.pick({
  email: true,
  password: true,
});

export const LoginResponseSchema = z.object({
  email: UserPublicSchema.shape.email,
});

export const AuthenticatedUserSchema = UserPublicSchema;

export const UserUpdateRequestSchema = UserModelSchema.pick({
  email: true,
  name: true,
  avatar: true,
  phone: true,
  birthday: true,
}).partial().extend({
  birthday: z.coerce.date().nullable().optional(),
});

export const CurrentUserSchema = AuthenticatedUserSchema;
