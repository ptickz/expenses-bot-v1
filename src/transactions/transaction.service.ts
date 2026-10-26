import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionInput } from './dto/create-transaction.input';
import { CreateExchangeInput } from './dto/create-exchange.input';
import {
  DuplicateOperationError,
  NothingToDeleteError,
  WrongPaymentReasonError,
  SameAccountCurrencyUnionError,
} from './transaction.errors';
import { InvalidAmountError } from '../common/money';
import { isUniqueViolation } from '../common/errors';
import { Prisma, Direction } from '../generated/prisma/client';
import { EXCHANGE, SAVING } from '../common/reference-data';

@Injectable()
export class TransactionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTransactionInput): Promise<void> {
    if (dto.amount <= 0n) {
      throw new InvalidAmountError('Сумма должна быть больше нуля');
    }
    if (
      dto.paymentCommonReasonId === EXCHANGE.id ||
      dto.paymentCommonReasonId === SAVING.id
    ) {
      throw new WrongPaymentReasonError(
        'Эта цель платежа доступна только для операций с двумя счетами',
      );
    }
    await this.withIdempotencyKey(dto.idempotencyKey, async (tx, keyId) => {
      await tx.transaction.create({
        data: {
          idempotencyKeyId: keyId,
          accountCurrencyUnionId: dto.accountCurrencyUnionId,
          direction: dto.direction,
          amount: dto.amount,
          paymentCommonReasonId: dto.paymentCommonReasonId,
          countryId: dto.countryId,
          comment: dto.comment,
          isFixedExpense: dto.isFixedExpense,
        },
      });
    });
  }

  async createExchange(dto: CreateExchangeInput): Promise<void> {
    if (dto.income.amount <= 0n || dto.outcome.amount <= 0n) {
      throw new InvalidAmountError('Сумма должна быть больше нуля');
    }
    if (
      dto.income.accountCurrencyUnionId === dto.outcome.accountCurrencyUnionId
    ) {
      throw new SameAccountCurrencyUnionError();
    }
    await this.withIdempotencyKey(dto.idempotencyKey, async (tx, keyId) => {
      await tx.transaction.create({
        data: {
          idempotencyKeyId: keyId,
          accountCurrencyUnionId: dto.outcome.accountCurrencyUnionId,
          direction: Direction.OUTCOME,
          amount: dto.outcome.amount,
          paymentCommonReasonId: dto.paymentCommonReasonId,
          countryId: dto.countryId,
          comment: dto.comment,
          isFixedExpense: true,
        },
      });
      await tx.transaction.create({
        data: {
          idempotencyKeyId: keyId,
          accountCurrencyUnionId: dto.income.accountCurrencyUnionId,
          direction: Direction.INCOME,
          amount: dto.income.amount,
          paymentCommonReasonId: dto.paymentCommonReasonId,
          countryId: dto.countryId,
          comment: dto.comment,
          isFixedExpense: true,
        },
      });
    });
  }

  async cancelLast(): Promise<void> {
    const last = await this.prisma.idempotencyKey.findFirst({
      orderBy: { id: 'desc' },
    });

    if (last === null) throw new NothingToDeleteError();
    await this.softDelete(last.id);
  }

  private async softDelete(idempotencyKeyId: number): Promise<void> {
    const { count } = await this.prisma.transaction.updateMany({
      where: { idempotencyKeyId, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    if (count === 0) throw new NothingToDeleteError();
  }

  private async withIdempotencyKey(
    idempotencyKey: string,
    write: (tx: Prisma.TransactionClient, keyId: number) => Promise<void>,
  ): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        const key = await tx.idempotencyKey.create({
          data: { key: idempotencyKey },
        });
        await write(tx, key.id);
      });
    } catch (e) {
      if (isUniqueViolation(e)) {
        throw new DuplicateOperationError(
          `Операция ${idempotencyKey} уже записана`,
        );
      }
      throw e;
    }
  }
}
