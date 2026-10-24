import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Direction } from '../src/generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

// Deterministic PRNG so every seed run produces the same data
let state = 42;
const rand = () => {
  state = (state * 1664525 + 1013904223) % 2 ** 32;
  return state / 2 ** 32;
};
const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const between = (min: number, max: number) =>
  Math.round(min + rand() * (max - min));

const TRANSACTIONS_COUNT = 100;
const DAYS_BACK = 90;

async function main() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE transactions, idempotency_keys, account_currency_unions, accounts,
             currencies, countries, payment_common_reasons RESTART IDENTITY CASCADE
  `);

  const [russia, georgia] = await prisma.country.createManyAndReturn({
    data: [{ title: 'Russia' }, { title: 'Georgia' }],
  });

  const currencies = await prisma.currency.createManyAndReturn({
    data: [{ code: 'USD' }, { code: 'USDT' }, { code: 'GEL' }, { code: 'RUB' }],
  });
  const cur = Object.fromEntries(currencies.map((c) => [c.code, c.id]));

  const accounts = await prisma.account.createManyAndReturn({
    data: [
      { title: 'TBC' },
      { title: 'Bybit' },
      { title: 'Tinkoff' },
      { title: 'Cash' },
    ],
  });
  const acc = Object.fromEntries(accounts.map((a) => [a.title, a.id]));

  const reasons = await prisma.paymentCommonReason.createManyAndReturn({
    data: [
      'Salary',
      'Freelance',
      'Cashback', // income
      'Rent',
      'Food',
      'Subscriptions',
      'Transport',
      'Utilities',
      'Entertainment',
      'Health',
    ].map((title) => ({ title })),
  });
  const reason = Object.fromEntries(reasons.map((r) => [r.title, r.id]));

  const unionSpecs: [string, string, number][] = [
    // account, currency, country the account is used in
    ['TBC', 'GEL', georgia.id],
    ['TBC', 'USD', georgia.id],
    ['Bybit', 'USDT', georgia.id],
    ['Tinkoff', 'RUB', russia.id],
    ['Cash', 'GEL', georgia.id],
    ['Cash', 'RUB', russia.id],
  ];
  const unions = await Promise.all(
    unionSpecs.map(async ([account, currency, countryId]) => ({
      ...(await prisma.accountCurrencyUnion.create({
        data: { accountId: acc[account], currencyId: cur[currency] },
      })),
      currency,
      countryId,
    })),
  );

  // Typical amounts per currency, in major units
  const outcomeRange: Record<string, [number, number]> = {
    GEL: [5, 300],
    USD: [10, 150],
    USDT: [10, 200],
    RUB: [200, 15000],
  };
  const incomeRange: Record<string, [number, number]> = {
    GEL: [500, 4000],
    USD: [1000, 5000],
    USDT: [500, 6000],
    RUB: [30000, 250000],
  };
  const incomeReasons = ['Salary', 'Freelance', 'Cashback'];
  const outcomeReasons = Object.keys(reason).filter(
    (r) => !incomeReasons.includes(r),
  );

  // Generate in chronological order so the running balance can be tracked
  const now = Date.now();
  const timestamps = Array.from(
    { length: TRANSACTIONS_COUNT },
    () => now - rand() * DAYS_BACK * 24 * 60 * 60 * 1000,
  )
    .sort((a, b) => a - b)
    .map((ts) => new Date(ts));

  // Running balance per union (non-deleted transactions only), in minor units
  const balances = new Map<number, number>();

  for (const createdAt of timestamps) {
    const union = pick(unions);
    const balance = balances.get(union.id) ?? 0;

    let direction: Direction =
      rand() < 0.2 ? Direction.INCOME : Direction.OUTCOME;
    const [outMin, outMax] = outcomeRange[union.currency];
    let amount = between(outMin, outMax) * 100;
    // An outcome that would push the balance below zero becomes an income instead
    if (direction === Direction.INCOME || amount > balance) {
      direction = Direction.INCOME;
      const [inMin, inMax] = incomeRange[union.currency];
      amount = between(inMin, inMax) * 100;
    }

    const deletedAt =
      rand() < 0.05 ? new Date(createdAt.getTime() + 60 * 60 * 1000) : null;
    if (!deletedAt) {
      balances.set(
        union.id,
        balance + (direction === Direction.INCOME ? amount : -amount),
      );
    }

    const idempotencyKey = await prisma.idempotencyKey.create({
      data: { key: randomUUID() },
    });
    await prisma.transaction.create({
      data: {
        accountCurrencyUnionId: union.id,
        direction,
        amount: BigInt(amount), // minor units
        paymentCommonReasonId:
          reason[
            pick(
              direction === Direction.INCOME ? incomeReasons : outcomeReasons,
            )
          ],
        countryId: rand() < 0.9 ? union.countryId : null,
        comment: rand() < 0.3 ? 'seed' : null,
        createdAt,
        deletedAt,
        idempotencyKeyId: idempotencyKey.id,
      },
    });
  }

  console.log(
    `Seeded: 2 countries, ${currencies.length} currencies, ${accounts.length} accounts, ` +
      `${unions.length} account/currency unions, ${reasons.length} reasons, ${TRANSACTIONS_COUNT} transactions`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
