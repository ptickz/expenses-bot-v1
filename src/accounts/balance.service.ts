import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AccountBalance } from './account-balance.interface';

@Injectable()
export class BalanceService {
  constructor(private readonly prisma: PrismaService) {}

  async getBalance(accountCurrencyUnionId: number): Promise<AccountBalance> {
    const [row] = await this.queryBalances(
      Prisma.sql`WHERE acu.id = ${accountCurrencyUnionId}`,
    );

    if (!row) {
      throw new NotFoundException(`Счёт ${accountCurrencyUnionId} не найден`);
    }

    return row;
  }

  async getAllBalances(): Promise<AccountBalance[]> {
    return this.queryBalances(Prisma.empty);
  }

  private queryBalances(where: Prisma.Sql): Promise<AccountBalance[]> {
    return this.prisma.$queryRaw<AccountBalance[]>`
      SELECT acu.id  AS "accountCurrencyUnionId",
             a.title AS account,
             c.code  AS currency,
             COALESCE(SUM(CASE WHEN t.direction = 'INCOME' THEN t.amount ELSE -t.amount END), 0)::bigint AS balance
      FROM account_currency_unions AS acu
      JOIN accounts   AS a ON a.id = acu.account_id
      JOIN currencies AS c ON c.id = acu.currency_id
      LEFT JOIN transactions AS t
             ON t.account_currency_union_id = acu.id
            AND t.deleted_at IS NULL
      ${where}
      GROUP BY acu.id, a.title, c.code
      ORDER BY a.title, c.code
    `;
  }
}
