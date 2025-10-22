import {
  Body,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { CurrentUser } from '~/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '~/common/guards/jwt-auth.guard';

import { AuthService } from './auth.service';
import { CurrentUserDto } from './dto/current-user.dto';
import { LoginRequestDto, LoginResponseDto } from './dto/login.dto';
import { RegisterRequestDto, RegisterResponseDto } from './dto/register.dto';
import type { AuthenticatedUser } from './types/authenticated-user.type';

@ApiTags('api')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register/')
  @ApiOperation({ operationId: 'api_auth_register_create' })
  @ApiCreatedResponse({ type: RegisterResponseDto })
  async register(
    @Body() body: RegisterRequestDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<RegisterResponseDto> {
    const user = await this.authService.register(body);
    const tokens = await this.authService.issueTokens(user);
    this.authService.attachAuthCookies(response, tokens);

    return {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
    };
  }

  @Post('login/')
  @ApiOperation({ operationId: 'api_auth_login_create' })
  @ApiOkResponse({ type: LoginResponseDto })
  async login(
    @Body() body: LoginRequestDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponseDto> {
    const user = await this.authService.validateCredentials(body.email, body.password);
    const tokens = await this.authService.issueTokens(user);
    this.authService.attachAuthCookies(response, tokens);

    return { email: user.email };
  }

  @Post('logout/')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ operationId: 'api_auth_logout_create' })
  @ApiBearerAuth('jwtAuth')
  @HttpCode(HttpStatus.RESET_CONTENT)
  async logout(@Res({ passthrough: true }) response: Response): Promise<void> {
    this.authService.clearAuthCookies(response);
  }

  @Get('me/')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ operationId: 'api_auth_me_retrieve' })
  @ApiOkResponse({ type: CurrentUserDto })
  @ApiBearerAuth('jwtAuth')
  async me(@CurrentUser() user: AuthenticatedUser): Promise<AuthenticatedUser> {
    return user;
  }

  @Post('token/refresh/')
  @ApiOperation({ operationId: 'api_auth_token_refresh_create' })
  @ApiOkResponse({ type: CurrentUserDto })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthenticatedUser> {
    const refreshToken = request.cookies?.refresh_token;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found in cookies');
    }

    const user = await this.authService.hydrateFromRefreshToken(refreshToken);
    const tokens = await this.authService.issueTokens(user);
    this.authService.attachAuthCookies(response, tokens);

    return user;
  }
}
