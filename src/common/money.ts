export class InvalidAmountError extends Error {
  name = 'InvalidAmountError';
}

const AMOUNT_RE = /^(\d+)(?:[.,](\d{1,2}))?$/;
const MINOR_PER_MAJOR = 100n;

export function parseAmount(amountString: string): bigint {
  const normalizedAmountString = amountString.replace(/\s/g, '');
  const matchFormat = AMOUNT_RE.exec(normalizedAmountString);

  if (!matchFormat)
    throw new InvalidAmountError(`Некорректная сумма: ${amountString}`);

  const [, whole, fraction = ''] = matchFormat;

  const bigIntAmount =
    BigInt(whole) * MINOR_PER_MAJOR + BigInt(fraction.padEnd(2, '0'));

  if (bigIntAmount <= 0n)
    throw new InvalidAmountError('Сумма должна быть больше 0');

  return bigIntAmount;
}

export function formatAmount(amount: bigint): string {
  const sign = amount < 0n ? '-' : '';
  const absoluteAmountValue = amount < 0n ? -amount : amount;
  const whole = absoluteAmountValue / MINOR_PER_MAJOR;
  const fraction = (absoluteAmountValue % MINOR_PER_MAJOR)
    .toString()
    .padStart(2, '0');

  return `${sign}${whole}.${fraction}`;
}
