import { InvalidAmountError, parseAmount, formatAmount } from './money';

describe('parseAmount', () => {
  it.each([
    { input: '100', expected: 10000n },
    { input: '10.5', expected: 1050n },
    { input: '10,05', expected: 1005n },
    { input: '1 000', expected: 100000n },
    { input: '0,05', expected: 5n },
  ])('parse $input as $expected', ({ input, expected }) => {
    expect(parseAmount(input)).toBe(expected);
  });

  it.each(['0', 'abc', '10.555', '', '-1', '0.00'])('rejects %p', (input) => {
    expect(() => parseAmount(input)).toThrow(InvalidAmountError);
  });
});

describe('formatAmount', () => {
  it.each([
    { input: 10000n, expected: '100.00' },
    { input: 1050n, expected: '10.50' },
    { input: 1005n, expected: '10.05' },
    { input: 100000n, expected: '1000.00' },
    { input: -105n, expected: '-1.05' },
    { input: 0n, expected: '0.00' },
    { input: 5n, expected: '0.05' },
  ])('format $input as $expected', ({ input, expected }) => {
    expect(formatAmount(input)).toBe(expected);
  });
});
