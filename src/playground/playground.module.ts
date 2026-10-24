import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AccountsModule } from '../accounts/accounts.module';
import { ConfigModule } from '@nestjs/config';
import { validate } from '../config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validate, cache: true }),
    PrismaModule,
    AccountsModule,
  ],
})
export class PlaygroundModule {}
