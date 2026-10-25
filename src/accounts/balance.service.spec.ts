import { AccountNotFoundError } from './account.errors';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../generated/prisma/client';
import { BalanceService } from './balance.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AccountBalance } from './account-balance.interface';

describe('BalanceService', () => {
  let service: BalanceService;

  const prismaMock = {
    $queryRaw: jest.fn(),
  };

  const cash: AccountBalance = {
    accountCurrencyUnionId: 1,
    account: 'Cash',
    currency: 'RUB',
    balance: 150n,
  };
  const card: AccountBalance = {
    accountCurrencyUnionId: 2,
    account: 'Card',
    currency: 'USD',
    balance: 0n,
  };

  // Tagged template call: (strings, ...values); the only value is the WHERE fragment.
  const whereArg = (): Prisma.Sql => {
    const [, where] = prismaMock.$queryRaw.mock.calls[0];
    return where as Prisma.Sql;
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BalanceService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get(BalanceService);
  });

  describe('getBalance', () => {
    it('returns the row from the query result', async () => {
      prismaMock.$queryRaw.mockResolvedValue([cash]);

      await expect(service.getBalance(1)).resolves.toEqual(cash);
    });

    it('throws AccountNotFoundError when no row is returned', async () => {
      prismaMock.$queryRaw.mockResolvedValue([]);

      await expect(service.getBalance(42)).rejects.toThrow(
        AccountNotFoundError,
      );
    });

    it('filters by accountCurrencyUnionId as a query parameter', async () => {
      prismaMock.$queryRaw.mockResolvedValue([cash]);

      await service.getBalance(7);

      expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
      const where = whereArg();
      expect(where.sql).toContain('WHERE acu.id = ?');
      expect(where.values).toEqual([7]);
    });
  });

  describe('getAllBalances', () => {
    it('returns all rows from the query result', async () => {
      prismaMock.$queryRaw.mockResolvedValue([cash, card]);

      await expect(service.getAllBalances()).resolves.toEqual([cash, card]);
    });

    it('returns an empty array when there are no accounts', async () => {
      prismaMock.$queryRaw.mockResolvedValue([]);

      await expect(service.getAllBalances()).resolves.toEqual([]);
    });

    it('queries without a WHERE clause', async () => {
      prismaMock.$queryRaw.mockResolvedValue([]);

      await service.getAllBalances();

      expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
      expect(whereArg()).toBe(Prisma.empty);
    });
  });
});
