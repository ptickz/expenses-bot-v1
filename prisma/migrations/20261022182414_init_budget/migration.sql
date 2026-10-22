-- CreateEnum
CREATE TYPE "Direction" AS ENUM ('INCOME', 'OUTCOME');

-- CreateTable
CREATE TABLE "report_types" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "report_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_common_reasons" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "payment_common_reasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currencies" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,

    CONSTRAINT "currencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "countries" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apply_date_rules" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "apply_date_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" SERIAL NOT NULL,
    "report_type_id" INTEGER NOT NULL,
    "period_start" DATE NOT NULL,
    "external_ref" TEXT,
    "delivered_at" TIMESTAMPTZ,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_currency_unions" (
    "id" SERIAL NOT NULL,
    "account_id" INTEGER NOT NULL,
    "currency_id" INTEGER NOT NULL,

    CONSTRAINT "account_currency_unions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_templates" (
    "id" SERIAL NOT NULL,
    "account_currency_union_id" INTEGER NOT NULL,
    "direction" "Direction" NOT NULL,
    "amount" BIGINT NOT NULL,
    "payment_common_reason_id" INTEGER NOT NULL,
    "country_id" INTEGER,
    "active" BOOLEAN NOT NULL,
    "comment" TEXT,
    "apply_date_rule_id" INTEGER NOT NULL,

    CONSTRAINT "transaction_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" SERIAL NOT NULL,
    "account_currency_union_id" INTEGER NOT NULL,
    "direction" "Direction" NOT NULL,
    "amount" BIGINT NOT NULL,
    "payment_common_reason_id" INTEGER NOT NULL,
    "country_id" INTEGER,
    "comment" TEXT,
    "transaction_template_id" INTEGER,
    "idempotency_key_id" INTEGER NOT NULL,
    "period" DATE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "currencies_code_key" ON "currencies"("code");

-- CreateIndex
CREATE UNIQUE INDEX "reports_report_type_id_period_start_key" ON "reports"("report_type_id", "period_start");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_keys_key_key" ON "idempotency_keys"("key");

-- CreateIndex
CREATE UNIQUE INDEX "account_currency_unions_account_id_currency_id_key" ON "account_currency_unions"("account_id", "currency_id");

-- CreateIndex
CREATE INDEX "transactions_account_currency_union_id_created_at_idx" ON "transactions"("account_currency_union_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_transaction_template_id_period_key" ON "transactions"("transaction_template_id", "period");

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_report_type_id_fkey" FOREIGN KEY ("report_type_id") REFERENCES "report_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_currency_unions" ADD CONSTRAINT "account_currency_unions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_currency_unions" ADD CONSTRAINT "account_currency_unions_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_templates" ADD CONSTRAINT "transaction_templates_apply_date_rule_id_fkey" FOREIGN KEY ("apply_date_rule_id") REFERENCES "apply_date_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_templates" ADD CONSTRAINT "transaction_templates_account_currency_union_id_fkey" FOREIGN KEY ("account_currency_union_id") REFERENCES "account_currency_unions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_templates" ADD CONSTRAINT "transaction_templates_payment_common_reason_id_fkey" FOREIGN KEY ("payment_common_reason_id") REFERENCES "payment_common_reasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_templates" ADD CONSTRAINT "transaction_templates_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_currency_union_id_fkey" FOREIGN KEY ("account_currency_union_id") REFERENCES "account_currency_unions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_payment_common_reason_id_fkey" FOREIGN KEY ("payment_common_reason_id") REFERENCES "payment_common_reasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_transaction_template_id_fkey" FOREIGN KEY ("transaction_template_id") REFERENCES "transaction_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_idempotency_key_id_fkey" FOREIGN KEY ("idempotency_key_id") REFERENCES "idempotency_keys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
