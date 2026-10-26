import type { Direction } from '../../generated/prisma/client';

export interface CreateTransactionInput {
  accountCurrencyUnionId: number;
  direction: Direction;
  amount: bigint;
  paymentCommonReasonId: number;
  countryId?: number;
  comment?: string;
  idempotencyKey: string;
  isFixedExpense: boolean;
}
