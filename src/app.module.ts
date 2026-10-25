import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AccountsModule } from './accounts/accounts.module';
import { TransactionModule } from './transactions/transaction.module';
import { PrismaModule } from './prisma/prisma.module';
import { validate } from './config/env.validation';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validate, cache: true }),
    AccountsModule,
    TransactionModule,
    PrismaModule,
  ],
})
export class AppModule {}
