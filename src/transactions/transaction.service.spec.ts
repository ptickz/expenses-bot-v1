import { Test, TestingModule } from '@nestjs/testing';
import { TransactionService } from './transaction.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionInput } from './dto/create-transaction.input';
import { Direction, Prisma } from '../generated/prisma/client';
import { FOOD, EXCHANGE, SAVING } from '../common/reference-data';
import { InvalidAmountError } from '../common/money';
import {
  DuplicateOperationError,
  WrongPaymentReasonError,
  SameAccountCurrencyUnionError,
  NothingToDeleteError,
} from './transaction.errors';
import { CreateExchangeInput } from './dto/create-exchange.input';

describe('TransactionService', () => {
  let service: TransactionService;

  const prismaMock = {
    idempotencyKey: { create: jest.fn(), findFirst: jest.fn() },
    transaction: { create: jest.fn(), updateMany: jest.fn() },
    $transaction: jest.fn(),
  };

  const dto: CreateTransactionInput = {
    idempotencyKey: 'telegram:100',
    accountCurrencyUnionId: 3,
    direction: Direction.OUTCOME,
    amount: 1050n,
    paymentCommonReasonId: FOOD.id,
  };

  const exchangeDto: CreateExchangeInput = {
    idempotencyKey: 'telegram:101',
    paymentCommonReasonId: EXCHANGE.id,
    outcome: {
      accountCurrencyUnionId: 3,
      amount: 1050n,
    },
    income: {
      accountCurrencyUnionId: 1,
      amount: 2700n,
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation((cb) => cb(prismaMock));
    prismaMock.idempotencyKey.create.mockResolvedValue({ id: 1 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<TransactionService>(TransactionService);
  });

  describe('create', () => {
    it('writes key and transaction', async () => {
      await expect(service.create(dto)).resolves.toBeUndefined();

      expect(prismaMock.idempotencyKey.create).toHaveBeenCalledWith({
        data: { key: 'telegram:100' },
      });

      expect(prismaMock.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          accountCurrencyUnionId: 3,
          paymentCommonReasonId: FOOD.id,
          idempotencyKeyId: 1,
          amount: 1050n,
          direction: Direction.OUTCOME,
        }),
      });
    });

    it('rejects exchange payment reason', async () => {
      await expect(
        service.create({
          ...dto,
          paymentCommonReasonId: EXCHANGE.id,
        }),
      ).rejects.toThrow(WrongPaymentReasonError);

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('rejects savings payment reason', async () => {
      await expect(
        service.create({
          ...dto,
          paymentCommonReasonId: SAVING.id,
        }),
      ).rejects.toThrow(WrongPaymentReasonError);

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('rejects non-positive amount', async () => {
      await expect(service.create({ ...dto, amount: 0n })).rejects.toThrow(
        InvalidAmountError,
      );

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('maps unique violation to DuplicateOperationError', async () => {
      prismaMock.idempotencyKey.create.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(service.create(dto)).rejects.toThrow(
        DuplicateOperationError,
      );

      expect(prismaMock.transaction.create).not.toHaveBeenCalled();
    });

    it('rejects on internal db error', async () => {
      prismaMock.idempotencyKey.create.mockRejectedValueOnce(
        new Error('db down'),
      );

      await expect(service.create(dto)).rejects.toThrow('db down');

      expect(prismaMock.transaction.create).not.toHaveBeenCalled();
    });
  });

  describe('createExchange', () => {
    it('writes key and exchange transaction legs as exchange', async () => {
      await expect(
        service.createExchange(exchangeDto),
      ).resolves.toBeUndefined();

      expect(prismaMock.idempotencyKey.create).toHaveBeenCalledWith({
        data: { key: 'telegram:101' },
      });

      expect(prismaMock.transaction.create.mock.calls).toEqual([
        [
          {
            data: expect.objectContaining({
              idempotencyKeyId: 1,
              direction: Direction.OUTCOME,
              amount: 1050n,
              accountCurrencyUnionId: 3,
              paymentCommonReasonId: EXCHANGE.id,
            }),
          },
        ],
        [
          {
            data: expect.objectContaining({
              idempotencyKeyId: 1,
              direction: Direction.INCOME,
              amount: 2700n,
              accountCurrencyUnionId: 1,
              paymentCommonReasonId: EXCHANGE.id,
            }),
          },
        ],
      ]);
    });

    it('writes key and exchange transaction legs as saving', async () => {
      await expect(
        service.createExchange({
          ...exchangeDto,
          paymentCommonReasonId: SAVING.id,
        }),
      ).resolves.toBeUndefined();

      expect(prismaMock.idempotencyKey.create).toHaveBeenCalledWith({
        data: { key: 'telegram:101' },
      });

      expect(prismaMock.transaction.create.mock.calls).toEqual([
        [
          {
            data: expect.objectContaining({
              idempotencyKeyId: 1,
              direction: Direction.OUTCOME,
              amount: 1050n,
              accountCurrencyUnionId: 3,
              paymentCommonReasonId: SAVING.id,
            }),
          },
        ],
        [
          {
            data: expect.objectContaining({
              idempotencyKeyId: 1,
              direction: Direction.INCOME,
              amount: 2700n,
              accountCurrencyUnionId: 1,
              paymentCommonReasonId: SAVING.id,
            }),
          },
        ],
      ]);
    });

    it('rejects on same account currency union id', async () => {
      await expect(
        service.createExchange({
          ...exchangeDto,
          income: { accountCurrencyUnionId: 1, amount: 1n },
          outcome: { accountCurrencyUnionId: 1, amount: 2n },
        }),
      ).rejects.toThrow(SameAccountCurrencyUnionError);

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('maps unique violation to DuplicateOperationError', async () => {
      prismaMock.idempotencyKey.create.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(service.createExchange(exchangeDto)).rejects.toThrow(
        DuplicateOperationError,
      );

      expect(prismaMock.transaction.create).not.toHaveBeenCalled();
    });

    it.each([
      { leg: 'income', amount: 0n },
      { leg: 'outcome', amount: 0n },
      { leg: 'income', amount: -5n },
      { leg: 'outcome', amount: -5n },
    ] as const)('rejects $amount in $leg', async ({ leg, amount }) => {
      await expect(
        service.createExchange({
          ...exchangeDto,
          [leg]: { ...exchangeDto[leg], amount },
        }),
      ).rejects.toThrow(InvalidAmountError);

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('cancelLast', () => {
    it('soft-deletes the last operation', async () => {
      prismaMock.idempotencyKey.findFirst.mockResolvedValueOnce({ id: 7 });
      prismaMock.transaction.updateMany.mockResolvedValueOnce({ count: 2 });

      await expect(service.cancelLast()).resolves.toBeUndefined();

      expect(prismaMock.idempotencyKey.findFirst).toHaveBeenCalledWith({
        orderBy: { id: 'desc' },
      });
      expect(prismaMock.transaction.updateMany).toHaveBeenCalledWith({
        where: { idempotencyKeyId: 7, deletedAt: null },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('nothing to delete on no idempotency key', async () => {
      prismaMock.idempotencyKey.findFirst.mockResolvedValueOnce(null);

      await expect(service.cancelLast()).rejects.toThrow(NothingToDeleteError);

      expect(prismaMock.transaction.updateMany).not.toHaveBeenCalled();
    });
    it('nothing to delete on transactions linked already cancelled', async () => {
      prismaMock.idempotencyKey.findFirst.mockResolvedValueOnce({ id: 7 });
      prismaMock.transaction.updateMany.mockResolvedValueOnce({ count: 0 });

      await expect(service.cancelLast()).rejects.toThrow(NothingToDeleteError);
    });
  });
});
