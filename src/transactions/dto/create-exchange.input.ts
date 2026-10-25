export interface CreateExchangeInput {
  idempotencyKey: string;
  outcome: ExchangeLeg;
  income: ExchangeLeg;
  countryId?: number;
  comment?: string;
  paymentCommonReasonId: number;
}

interface ExchangeLeg {
  accountCurrencyUnionId: number;
  amount: bigint;
}
