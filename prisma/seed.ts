import 'dotenv/config';
import { existsSync, readFileSync } from 'node:fs';
import { z } from 'zod';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '../src/generated/prisma/client';
import {
  ACCOUNTS,
  APPLY_DATES,
  PAYMENT_REASONS,
  REPORT_TYPES,
} from '../src/common/reference-data';

const PERSONAL_PATH = 'prisma/data/personal.json';
const EXAMPLE_PATH = 'prisma/data/personal.example.json';

const personalSchema = z.object({
  currencies: z.array(z.object({ id: z.int().positive(), code: z.string() })),
  countries: z.array(z.object({ id: z.int().positive(), title: z.string() })),
  accounts: z.array(z.object({ id: z.int().positive(), title: z.string() })),
  unions: z.array(z.object({ account: z.string(), currency: z.string() })),
});

type PersonalData = z.infer<typeof personalSchema>;

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

function loadPersonalData(): PersonalData {
  const path = existsSync(PERSONAL_PATH) ? PERSONAL_PATH : EXAMPLE_PATH;
  console.log(`Personal data: ${path}`);

  const data = personalSchema.parse(JSON.parse(readFileSync(path, 'utf8')));

  const systemAccountIds: number[] = Object.values(ACCOUNTS).map((a) => a.id);
  const clash = data.accounts.find((a) => systemAccountIds.includes(a.id));
  if (clash) {
    throw new Error(
      `Account "${clash.title}" uses id ${clash.id} reserved for a system account`,
    );
  }

  return data;
}

async function syncSequence(tx: Prisma.TransactionClient, table: string) {
  await tx.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE(MAX(id), 0) + 1, false) FROM ${table}`,
  );
}

async function main() {
  const personal = loadPersonalData();

  await prisma.$transaction(async (tx) => {
    for (const { id, title } of Object.values(PAYMENT_REASONS)) {
      await tx.paymentCommonReason.upsert({
        where: { id },
        create: { id, title },
        update: { title },
      });
    }
    for (const { id, title } of Object.values(REPORT_TYPES)) {
      await tx.reportType.upsert({
        where: { id },
        create: { id, title },
        update: { title },
      });
    }
    for (const { id, title } of Object.values(APPLY_DATES)) {
      await tx.applyDateRule.upsert({
        where: { id },
        create: { id, title },
        update: { title },
      });
    }

    const accounts = [...Object.values(ACCOUNTS), ...personal.accounts];
    for (const { id, title } of accounts) {
      await tx.account.upsert({
        where: { id },
        create: { id, title },
        update: { title },
      });
    }
    for (const { id, code } of personal.currencies) {
      await tx.currency.upsert({
        where: { id },
        create: { id, code },
        update: { code },
      });
    }
    for (const { id, title } of personal.countries) {
      await tx.country.upsert({
        where: { id },
        create: { id, title },
        update: { title },
      });
    }

    const accountIdByTitle = new Map(accounts.map((a) => [a.title, a.id]));
    const currencyIdByCode = new Map(
      personal.currencies.map((c) => [c.code, c.id]),
    );
    for (const union of personal.unions) {
      const accountId = accountIdByTitle.get(union.account);
      const currencyId = currencyIdByCode.get(union.currency);
      if (accountId === undefined || currencyId === undefined) {
        throw new Error(
          `Union ${union.account}/${union.currency}: unknown account or currency`,
        );
      }
      await tx.accountCurrencyUnion.upsert({
        where: { accountId_currencyId: { accountId, currencyId } },
        create: { accountId, currencyId },
        update: {},
      });
    }

    for (const table of [
      'payment_common_reasons',
      'report_types',
      'apply_date_rules',
      'accounts',
      'currencies',
      'countries',
    ]) {
      await syncSequence(tx, table);
    }
  });

  console.log(
    `Seeded: ${Object.keys(PAYMENT_REASONS).length} reasons, ` +
      `${Object.keys(ACCOUNTS).length + personal.accounts.length} accounts, ` +
      `${personal.currencies.length} currencies, ${personal.countries.length} countries, ` +
      `${personal.unions.length} unions`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
