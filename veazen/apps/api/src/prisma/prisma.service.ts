import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

/** Prisma transaction client with the RLS tenant context already set. */
export type Tx = Prisma.TransactionClient;

export const SYSTEM_TENANT = '__system__';

/**
 * PrismaClient wrapper implementing the ADR-006 RLS contract: every query
 * runs inside a transaction whose `app.tenant_id` setting is either a tenant
 * uuid or the '__system__' sentinel. The connection role (veazen_app) is not
 * the table owner, so the policies actually bite.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  // Generous queueing budget: the verify path bursts well past the pool
  // size under load tests; waiting beats failing (§1.8).
  private static readonly TX_OPTIONS = { maxWait: 10_000, timeout: 15_000 };

  /** Run `fn` in a transaction scoped to one tenant's rows. */
  async withTenant<T>(tenantId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
    return this.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
      return fn(tx);
    }, PrismaService.TX_OPTIONS);
  }

  /** Run `fn` with cross-tenant visibility (verify lookups, workers, digests). */
  async asSystem<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    return this.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${SYSTEM_TENANT}, true)`;
      return fn(tx);
    }, PrismaService.TX_OPTIONS);
  }
}
