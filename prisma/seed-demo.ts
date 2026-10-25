// Demo transactions for local development. Wipes transactions and idempotency keys!
// Requires the reference seed first: npx prisma db seed
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Direction } from '../src/generated/prisma/client';
import {
  BILL,
  FOOD,
  MISC,
  RENT,
  SALARY,
  SAVINGS,
  SUBSCRIPTIONS,
} from '../src/common/reference-data';

if (process.env.NODE_ENV === 'production') {
  throw new Error('Demo seed must not run in production');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

// Deterministic PRNG so every seed run produces the same data
let state = 42;
const rand = () => {
  state = (state * 1664525 + 1013904223) % 2 ** 32;
  return state / 2 ** 32;
};
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const between = (min: number, max: number) =>
  Math.round(min + rand() * (max - min));

const TRANSACTIONS_COUNT = 100;
const DAYS_BACK = 90;

// Typical amounts in major units; currencies come from personal data, so unknown codes fall back to default
const DEFAULT_OUTCOME_RANGE: [number, number] = [10, 200];
const DEFAULT_INCOME_RANGE: [number, number] = [500, 5000];
const outcomeRange: Record<string, [number, number]> = {
  GEL: [5, 300],
  RUB: [200, 15000],
};
const incomeRange: Record<string, [number, number]> = {
  GEL: [500, 4000],
  RUB: [30000, 250000],
};

// Exchange and Saving are two-leg operations — not generated here
const INCOME_REASON_IDS = [SALARY.id];
const OUTCOME_REASON_IDS = [
  RENT.id,
  SUBSCRIPTIONS.id,
  FOOD.id,
  BILL.id,
  MISC.id,
];

async function main() {
  // Savings moves money only via exchange, so demo income/outcome skips it
  const unions = await prisma.accountCurrencyUnion.findMany({
    where: { accountId: { not: SAVINGS.id } },
    include: { currency: true },
  });
  if (unions.length === 0) {
    throw new Error(
      'No account/currency unions — run `npx prisma db seed` first',
    );
  }
  const countryIds = (await prisma.country.findMany()).map((c) => c.id);

  await prisma.$executeRawUnsafe(
    'TRUNCATE transactions, idempotency_keys RESTART IDENTITY',
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
    const code = union.currency.code;
    const balance = balances.get(union.id) ?? 0;

    let direction: Direction =
      rand() < 0.2 ? Direction.INCOME : Direction.OUTCOME;
    const [outMin, outMax] = outcomeRange[code] ?? DEFAULT_OUTCOME_RANGE;
    let amount = between(outMin, outMax) * 100;
    // An outcome that would push the balance below zero becomes an income instead
    if (direction === Direction.INCOME || amount > balance) {
      direction = Direction.INCOME;
      const [inMin, inMax] = incomeRange[code] ?? DEFAULT_INCOME_RANGE;
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
        paymentCommonReasonId: pick(
          direction === Direction.INCOME
            ? INCOME_REASON_IDS
            : OUTCOME_REASON_IDS,
        ),
        countryId:
          countryIds.length > 0 && rand() < 0.9 ? pick(countryIds) : null,
        comment: rand() < 0.3 ? 'seed' : null,
        createdAt,
        deletedAt,
        idempotencyKeyId: idempotencyKey.id,
      },
    });
  }

  console.log(
    `Seeded ${TRANSACTIONS_COUNT} demo transactions over ${unions.length} unions`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
