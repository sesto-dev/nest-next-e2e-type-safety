
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { Request } from 'express';

import type { AuthenticatedUser } from '~/auth/types/authenticated-user.type';
import { buildPagination } from '~/common/pagination/pagination';
import type { PaginatedResult } from '~/common/pagination/pagination';
import { TodoPublicSchema } from '~/common/schemas/todo.schema';
import { PrismaService } from '~/prisma/prisma.service';

import type { TodoListQuery } from './dto/todo-query.dto';
import type { TodoCreateRequestDto, TodoUpdateRequestDto } from './dto/todo.dto';

type TodoWithOwner = Prisma.TodoGetPayload<{ include: { owner: true } }>;

@Injectable()
export class TodosService {
  private readonly pageSize = 100;

  constructor(private readonly prisma: PrismaService) {}

  async list(
    query: TodoListQuery,
    request: Request,
    user: AuthenticatedUser,
  ): Promise<PaginatedResult<ReturnType<typeof TodoPublicSchema.parse>>> {
    const page = query.page ?? 1;
    const skip = (page - 1) * this.pageSize;

    const where = this.buildWhere(query, user.id);
    const orderBy = this.buildOrdering(query.ordering);

    const [todos, total] = await Promise.all([
      this.prisma.todo.findMany({
        where,
        orderBy,
        skip,
        take: this.pageSize,
        include: { owner: true },
      }),
      this.prisma.todo.count({ where }),
    ]);

    const results = todos.map(todo => this.toView(todo));

    return buildPagination(results, { page, pageSize: this.pageSize, total, request });
  }

  async create(body: TodoCreateRequestDto, user: AuthenticatedUser) {
    const todo = await this.prisma.todo.create({
      data: {
        title: body.title,
        description: body.description ?? '',
        is_complete: body.is_complete ?? false,
        owner: {
          connect: { id: user.id },
        },
      },
      include: { owner: true },
    });

    return this.toView(todo);
  }

  async findOneOrFail(id: string, user: AuthenticatedUser) {
    const todo = await this.prisma.todo.findUnique({
      where: { id },
      include: { owner: true },
    });

    if (!todo) {
      throw new NotFoundException('Todo not found');
    }

    if (todo.owner_id !== user.id) {
      throw new ForbiddenException('You can only access your own todos');
    }

    return this.toView(todo);
  }

  async update(id: string, body: TodoUpdateRequestDto, user: AuthenticatedUser) {
    await this.ensureOwnership(id, user.id);

    const data: Prisma.TodoUpdateInput = {};

    if (Object.prototype.hasOwnProperty.call(body, 'title') && body.title !== undefined) {
      data.title = body.title;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'description')) {
      data.description = body.description ?? '';
    }
    if (Object.prototype.hasOwnProperty.call(body, 'is_complete') && body.is_complete !== undefined) {
      data.is_complete = body.is_complete;
    }

    const updated = await this.prisma.todo.update({
      where: { id },
      data,
      include: { owner: true },
    });

    return this.toView(updated);
  }

  async remove(id: string, user: AuthenticatedUser) {
    await this.ensureOwnership(id, user.id);
    await this.prisma.todo.delete({ where: { id } });
  }

  private async ensureOwnership(id: string, ownerId: number) {
    const todo = await this.prisma.todo.findUnique({ where: { id }, select: { owner_id: true } });
    if (!todo) {
      throw new NotFoundException('Todo not found');
    }
    if (todo.owner_id !== ownerId) {
      throw new ForbiddenException('You can only modify your own todos');
    }
  }

  private buildWhere(query: TodoListQuery, ownerId: number): Prisma.TodoWhereInput {
    const andConditions: Prisma.TodoWhereInput[] = [{ owner_id: ownerId }];

    if (query.search) {
      andConditions.push({
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
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

    return { AND: andConditions };
  }

  private buildOrdering(ordering?: string): Prisma.TodoOrderByWithRelationInput[] {
    if (!ordering) {
      return [{ created_at: 'desc' }];
    }

    const direction = ordering.startsWith('-') ? 'desc' : 'asc';
    const field = ordering.replace(/^-/, '');

    const allowed: Array<keyof Prisma.TodoOrderByWithRelationInput> = [
      'title',
      'created_at',
      'updated_at',
    ];

    if (allowed.includes(field as keyof Prisma.TodoOrderByWithRelationInput)) {
      return [{ [field]: direction } as Prisma.TodoOrderByWithRelationInput];
    }

    return [{ created_at: 'desc' }];
  }

  private toView(todo: TodoWithOwner) {
    return TodoPublicSchema.parse({
      id: todo.id,
      title: todo.title,
      description: todo.description,
      is_complete: todo.is_complete,
      created_at: todo.created_at,
      updated_at: todo.updated_at,
      owner: todo.owner_id,
      owner_email: todo.owner.email,
    });
  }
}
