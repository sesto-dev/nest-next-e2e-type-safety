import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { AuthenticatedUser } from '~/auth/types/authenticated-user.type';
import { CurrentUser } from '~/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '~/common/guards/jwt-auth.guard';

import { TodoListQueryDto } from './dto/todo-query.dto';
import {
  PaginatedTodoResponseDto,
  TodoCreateRequestDto,
  TodoResponseDto,
  TodoUpdateRequestDto,
} from './dto/todo.dto';
import { TodosService } from './todos.service';

@ApiTags('api')
@ApiBearerAuth('jwtAuth')
@UseGuards(JwtAuthGuard)
@Controller('todos')
export class TodosController {
  constructor(private readonly todosService: TodosService) {}

  @Get('/')
  @ApiOperation({ operationId: 'api_todos_list' })
  @ApiOkResponse({ type: PaginatedTodoResponseDto })
  async list(
    @Query() query: TodoListQueryDto,
    @Req() request: Request,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.todosService.list(query, request, user);
  }

  @Post('/')
  @ApiOperation({ operationId: 'api_todos_create' })
  @ApiCreatedResponse({ type: TodoResponseDto })
  async create(@Body() body: TodoCreateRequestDto, @CurrentUser() user: AuthenticatedUser) {
    return this.todosService.create(body, user);
  }

  @Get(':id/')
  @ApiOperation({ operationId: 'api_todos_retrieve' })
  @ApiOkResponse({ type: TodoResponseDto })
  async retrieve(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.todosService.findOneOrFail(id, user);
  }

  @Patch(':id/')
  @ApiOperation({ operationId: 'api_todos_partial_update' })
  @ApiOkResponse({ type: TodoResponseDto })
  async update(
    @Param('id') id: string,
    @Body() body: TodoUpdateRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.todosService.update(id, body, user);
  }

  @Delete(':id/')
  @ApiOperation({ operationId: 'api_todos_destroy' })
  @ApiNoContentResponse()
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.todosService.remove(id, user);
  }
}
