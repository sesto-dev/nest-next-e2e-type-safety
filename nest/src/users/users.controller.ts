import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { AuthenticatedUser } from '~/auth/types/authenticated-user.type';
import { CurrentUser } from '~/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '~/common/guards/jwt-auth.guard';

import { UserListQueryDto } from './dto/user-query.dto';
import { PaginatedUserResponseDto, UserResponseDto, UserUpdateRequestDto } from './dto/user.dto';
import { UsersService } from './users.service';

@ApiTags('api')
@ApiBearerAuth('jwtAuth')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('/')
  @ApiOperation({ operationId: 'api_users_list' })
  @ApiOkResponse({ type: PaginatedUserResponseDto })
  async list(@Query() query: UserListQueryDto, @Req() request: Request) {
    return this.usersService.list(query, request);
  }

  @Get(':id/')
  @ApiOperation({ operationId: 'api_users_retrieve' })
  @ApiOkResponse({ type: UserResponseDto })
  async retrieve(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOneOrFail(id);
  }

  @Patch(':id/')
  @ApiOperation({ operationId: 'api_users_partial_update' })
  @ApiOkResponse({ type: UserResponseDto })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UserUpdateRequestDto,
    @CurrentUser() current: AuthenticatedUser,
  ) {
    return this.usersService.update(id, body, current);
  }
}
