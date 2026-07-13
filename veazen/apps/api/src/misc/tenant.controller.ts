import { createHash, randomBytes } from 'node:crypto';

import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsIn, IsObject, IsOptional, IsString, Length } from 'class-validator';
import type { Request } from 'express';

import { INVITABLE_ROLES, type InvitableRole } from '@veazen/shared';

import { CONSOLE_READ, CONSOLE_WRITE, OWNER_ONLY, RETURNS_READ } from '../auth/permissions';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { TenantAuthGuard } from '../auth/tenant-auth.guard';
import { TenantId } from '../auth/tenant.decorator';
import { Audit } from '../audit/audit.decorator';
import { AppConfigService } from '../config/app-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../risk/notification.service';

/** Invite validity window (E1): 7 days. */
const INVITE_TTL_MS = 7 * 24 * 3600 * 1000;

class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  @Length(2, 120)
  name?: string;

  /** merged into tenants.settings (brand color, logo, verify-page copy, …) */
  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;

  /** §7.5 onboarding fork, switchable at any time */
  @IsOptional()
  @IsIn(['standard', 'lite'])
  mode?: 'standard' | 'lite';
}

class CreateInviteDto {
  @IsEmail()
  email!: string;

  /** never a second owner via invite */
  @IsIn(INVITABLE_ROLES as readonly string[])
  role!: InvitableRole;
}

/** hash stored instead of the token — same posture as api_keys.key_hash */
export function hashInviteToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/** Dashboard tenant context: /auth-ish info, settings, team, sites (§6). */
@ApiTags('tenant')
@ApiBearerAuth()
@Controller('tenant')
@UseGuards(TenantAuthGuard, RolesGuard)
export class TenantController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly notifications: NotificationService,
  ) {}

  @Get('me')
  // warehouse included: the console shell bootstraps every session from here
  @Roles(...RETURNS_READ)
  me(@TenantId() tenantId: string, @Req() req: Request & { user?: { userId: string } }) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const tenant = await tx.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, name: true, slug: true, plan: true, settings: true, createdAt: true },
      });
      const user = req.user
        ? await tx.user.findFirst({
            where: { id: req.user.userId },
            select: { id: true, email: true, role: true, locale: true },
          })
        : null;
      return { tenant, user };
    });
  }

  @Patch('settings')
  @Roles(...CONSOLE_WRITE)
  @Audit('settings.update')
  update(@TenantId() tenantId: string, @Body() dto: UpdateSettingsDto) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const tenant = await tx.tenant.findUniqueOrThrow({ where: { id: tenantId } });
      const settings = {
        ...(tenant.settings as Record<string, unknown>),
        ...(dto.settings ?? {}),
        ...(dto.mode ? { mode: dto.mode } : {}),
      };
      return tx.tenant.update({
        where: { id: tenantId },
        data: { ...(dto.name ? { name: dto.name } : {}), settings },
        select: { id: true, name: true, slug: true, plan: true, settings: true },
      });
    });
  }

  @Get('users')
  @Roles(...CONSOLE_READ)
  users(@TenantId() tenantId: string) {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.user.findMany({
        select: { id: true, email: true, role: true, locale: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    );
  }

  /**
   * E1 team management (owner-only): remove a member. Two backend
   * invariants regardless of what the UI disables — you cannot remove
   * yourself, and you cannot remove the last owner.
   */
  @Delete('users/:id')
  @Roles(...OWNER_ONLY)
  @Audit('user.remove')
  removeUser(
    @TenantId() tenantId: string,
    @Req() req: Request & { user?: { userId: string } },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      if (req.user?.userId === id) {
        throw new ConflictException('you cannot remove your own account (409)');
      }
      const target = await tx.user.findFirst({ where: { id } });
      if (!target) {
        throw new NotFoundException('user not found');
      }
      if (target.role === 'owner') {
        const owners = await tx.user.count({ where: { role: 'owner' } });
        if (owners <= 1) {
          throw new ConflictException('cannot remove the last owner (409)');
        }
      }
      await tx.user.delete({ where: { id } });
      return { deleted: true, id, email: target.email };
    });
  }

  /**
   * E1 team invites (owner-only, PD-004): 32-byte random token, sha256 in
   * the DB, 7-day expiry. The accept URL is returned to the owner (and
   * echoed in the pending list right after creation) so the invite still
   * works when the email cannot be delivered — forward it by hand.
   */
  @Post('invites')
  @Roles(...OWNER_ONLY)
  @Audit('user.invite')
  async createInvite(
    @TenantId() tenantId: string,
    @Req() req: Request & { user?: { userId: string } },
    @Body() dto: CreateInviteDto,
  ) {
    const email = dto.email.toLowerCase();
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

    // users.email is globally unique — a member (of any tenant) cannot be invited
    const existingUser = await this.prisma.asSystem((sys) =>
      sys.user.findUnique({ where: { email } }),
    );
    if (existingUser) {
      throw new ConflictException('this email already has an account');
    }
    const invite = await this.prisma.withTenant(tenantId, async (tx) => {
      const pending = await tx.invite.findFirst({
        where: { email, acceptedAt: null, expiresAt: { gt: new Date() } },
      });
      if (pending) {
        throw new ConflictException('a pending invite for this email already exists — revoke it first');
      }
      return tx.invite.create({
        data: {
          tenantId,
          email,
          role: dto.role,
          tokenHash: hashInviteToken(token),
          expiresAt,
          createdBy: req.user?.userId ?? tenantId,
        },
        select: { id: true, email: true, role: true, expiresAt: true, createdAt: true },
      });
    });

    const acceptUrl = `${this.config.publicVerifyBaseUrl.replace(/\/$/, '')}/dashboard/invite/${token}`;
    const tenant = await this.prisma.withTenant(tenantId, (tx) =>
      tx.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
    );
    // best-effort (sendMail never throws): the accept_url below is the
    // owner's manual fallback when the mailbox is unreachable
    await this.notifications.sendInviteEmail(email, {
      tenantName: tenant?.name ?? 'Veazen',
      role: dto.role,
      acceptUrl,
      expiresAt,
    });
    return { ...invite, accept_url: acceptUrl };
  }

  /** Pending (not yet accepted) invites, newest first. */
  @Get('invites')
  @Roles(...CONSOLE_READ)
  invites(@TenantId() tenantId: string) {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.invite.findMany({
        where: { acceptedAt: null },
        select: { id: true, email: true, role: true, expiresAt: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
    );
  }

  /** Revoke a pending invite — the token dies with its hash. */
  @Delete('invites/:id')
  @Roles(...OWNER_ONLY)
  @Audit('user.invite_revoke')
  revokeInvite(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const invite = await tx.invite.findFirst({ where: { id, acceptedAt: null } });
      if (!invite) {
        throw new NotFoundException('pending invite not found');
      }
      await tx.invite.delete({ where: { id } });
      return { deleted: true, id, email: invite.email };
    });
  }

  @Get('sites')
  @Roles(...CONSOLE_READ)
  sites(@TenantId() tenantId: string) {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.wpSite.findMany({ orderBy: { lastSeenAt: 'desc' } }),
    );
  }
}
