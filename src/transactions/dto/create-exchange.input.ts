export interface CreateExchangeInput {
  idempotencyKey: string;
  outcome: ExchangeLeg;
  income: ExchangeLeg;
  countryId?: number;
  comment?: string;
}

interface ExchangeLeg {
  accountCurrencyUnionId: number;
  amount: bigint;
}
