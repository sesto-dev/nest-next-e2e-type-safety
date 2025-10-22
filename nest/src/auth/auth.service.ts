import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import * as bcrypt from 'bcrypt';
import type { Response } from 'express';
import { UserPublicSchema } from '~/common/schemas/user.schema';
import { PrismaService } from '~/prisma/prisma.service';

import type { AuthenticatedUser } from './types/authenticated-user.type';
import type { JwtPayload } from './types/jwt-payload.type';

interface AuthCookies {
  access: string;
  refresh: string;
}

@Injectable()
export class AuthService {
  private readonly accessTtl: number;
  private readonly refreshTtl: number;
  private readonly jwtSecret: string;
  private readonly cookieDomain: string | undefined;
  private readonly cookieSecure: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.accessTtl = Number(this.configService.get('JWT_ACCESS_TOKEN_TTL', 3600));
    this.refreshTtl = Number(this.configService.get('JWT_REFRESH_TOKEN_TTL', 259200));
    this.jwtSecret = this.configService.get<string>('JWT_SECRET') ?? 'change-me';
    this.cookieDomain = this.configService.get<string>('COOKIE_DOMAIN');
    this.cookieSecure = this.configService.get('NODE_ENV', 'development') === 'production';
  }

  async register(input: { email: string; password: string; name?: string | null }) {
    const email = input.email.toLowerCase().trim();
    const password = input.password;

    const passwordHash = await bcrypt.hash(password, 12);

    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          password: passwordHash,
          name: input.name ?? null,
        },
        include: {
          groups: {
            include: {
              group: true,
            },
          },
        },
      });

      return this.toAuthenticatedUser(user);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Email is already registered');
      }
      throw new InternalServerErrorException('Unable to register user');
    }
  }

  async validateCredentials(email: string, password: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        groups: {
          include: { group: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.toAuthenticatedUser(user);
  }

  async validateJwtPayload(payload: JwtPayload): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        groups: {
          include: { group: true },
        },
      },
    });

    return user ? this.toAuthenticatedUser(user) : null;
  }

  async issueTokens(user: AuthenticatedUser): Promise<AuthCookies> {
    const payload = { sub: user.id, email: user.email };

    const [access, refresh] = await Promise.all([
      this.jwtService.signAsync({ ...payload, type: 'access' }, { secret: this.jwtSecret, expiresIn: this.accessTtl }),
      this.jwtService.signAsync({ ...payload, type: 'refresh' }, { secret: this.jwtSecret, expiresIn: this.refreshTtl }),
    ]);

    return { access, refresh };
  }

  async hydrateFromRefreshToken(refreshToken: string): Promise<AuthenticatedUser> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.jwtSecret,
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const user = await this.validateJwtPayload(payload);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return user;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  attachAuthCookies(response: Response, tokens: AuthCookies) {
    const cookieOptions = {
      httpOnly: true,
      secure: this.cookieSecure,
      sameSite: 'lax' as const,
      domain: this.cookieDomain ?? undefined,
      path: '/',
    };

    const accessExpires = new Date(Date.now() + this.accessTtl * 1000);
    const refreshExpires = new Date(Date.now() + this.refreshTtl * 1000);

    response.cookie('access_token', tokens.access, {
      ...cookieOptions,
      expires: accessExpires,
    });
    response.cookie('refresh_token', tokens.refresh, {
      ...cookieOptions,
      expires: refreshExpires,
    });
  }

  clearAuthCookies(response: Response) {
    const options = {
      httpOnly: true,
      secure: this.cookieSecure,
      sameSite: 'lax' as const,
      domain: this.cookieDomain ?? undefined,
      path: '/',
    };
    response.clearCookie('access_token', options);
    response.clearCookie('refresh_token', options);
  }

  toAuthenticatedUser(user: {
    id: number;
    email: string;
    avatar: string | null;
    name: string | null;
    phone: string | null;
    birthday: Date | null;
    is_active: boolean;
    is_staff: boolean;
    is_email_verified: boolean;
    is_phone_verified: boolean;
    created_at: Date;
    updated_at: Date;
    groups: { group: { id: number; name: string } }[];
  }): AuthenticatedUser {
    const safeUser = {
      id: user.id,
      email: user.email,
      avatar: user.avatar,
      name: user.name,
      phone: user.phone,
      birthday: user.birthday,
      is_active: user.is_active,
      is_staff: user.is_staff,
      is_email_verified: user.is_email_verified,
      is_phone_verified: user.is_phone_verified,
      created_at: user.created_at,
      updated_at: user.updated_at,
      groups: user.groups.map(connection => connection.group),
    };

    return UserPublicSchema.parse(safeUser);
  }
}
