import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request } from 'express';

import { AuthService } from '~/auth/auth.service';
import type { AuthenticatedUser } from '~/auth/types/authenticated-user.type';
import { buildPagination } from '~/common/pagination/pagination';
import type { PaginatedResult } from '~/common/pagination/pagination';
import { PrismaService } from '~/prisma/prisma.service';
import type { UserListQuery } from './dto/user-query.dto';
import type { UserUpdateRequestDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  private readonly pageSize = 100;

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async list(query: UserListQuery, request: Request): Promise<PaginatedResult<AuthenticatedUser>> {
    const page = query.page ?? 1;
    const skip = (page - 1) * this.pageSize;

    const where = this.buildWhere(query);
    const orderBy = this.buildOrdering(query.ordering);

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy,
        skip,
        take: this.pageSize,
        include: {
          groups: {
            include: { group: true },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const results = users.map(user => this.authService.toAuthenticatedUser(user));

    return buildPagination(results, {
      page,
      pageSize: this.pageSize,
      total,
      request,
    });
  }

  async findOneOrFail(id: number): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        groups: {
          include: { group: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.authService.toAuthenticatedUser(user);
  }

  async update(
    id: number,
    input: UserUpdateRequestDto,
    currentUser: AuthenticatedUser,
  ): Promise<AuthenticatedUser> {
    if (id !== currentUser.id) {
      throw new ForbiddenException('You can only update your own profile');
    }

    const data: Prisma.UserUpdateInput = {};
    if (Object.prototype.hasOwnProperty.call(input, 'email') && input.email !== undefined) {
      data.email = input.email.toLowerCase();
    }
    if (Object.prototype.hasOwnProperty.call(input, 'name')) {
      data.name = input.name ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(input, 'avatar')) {
      data.avatar = input.avatar ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(input, 'phone')) {
      data.phone = input.phone ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(input, 'birthday')) {
      data.birthday = input.birthday;
    }

    try {
      const updated = await this.prisma.user.update({
        where: { id },
        data,
        include: {
          groups: {
            include: { group: true },
          },
        },
      });

      return this.authService.toAuthenticatedUser(updated);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Email or phone is already in use');
      }
      throw error;
    }
  }

  private buildWhere(query: UserListQuery): Prisma.UserWhereInput {
    const andConditions: Prisma.UserWhereInput[] = [];

    if (query.search) {
      andConditions.push({
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
          { phone: { contains: query.search, mode: 'insensitive' } },
        ],
      });
    }

    if (query.created_at__gte) {
      andConditions.push({ created_at: { gte: query.created_at__gte } });
    }

    if (query.created_at__lte) {
      andConditions.push({ created_at: { lte: query.created_at__lte } });
    }

    if (query.updated_at__gte) {
      andConditions.push({ updated_at: { gte: query.updated_at__gte } });
    }

    if (query.updated_at__lte) {
      andConditions.push({ updated_at: { lte: query.updated_at__lte } });
    }

    return andConditions.length > 0 ? { AND: andConditions } : {};
  }

  private buildOrdering(ordering?: string): Prisma.UserOrderByWithRelationInput[] {
    if (!ordering) {
      return [{ created_at: 'desc' }];
    }

    const direction = ordering.startsWith('-') ? 'desc' : 'asc';
    const field = ordering.replace(/^-/, '');

    const allowed: Array<keyof Prisma.UserOrderByWithRelationInput> = [
      'name',
      'created_at',
      'updated_at',
    ];

    if (allowed.includes(field as keyof Prisma.UserOrderByWithRelationInput)) {
      return [
        {
          [field]: direction,
        } as Prisma.UserOrderByWithRelationInput,
      ];
    }

    return [{ created_at: 'desc' }];
  }
}
