import { Prisma } from '../generated/prisma/client';
import { DomainError, isUniqueViolation } from './errors';

class TestError extends DomainError {}

describe('isUniqueViolation', () => {
  it.each([
    {
      case: 'Prisma error with P2002',
      input: new Prisma.PrismaClientKnownRequestError('', {
        code: 'P2002',
        clientVersion: 'test',
      }),
      expected: true,
    },
    {
      case: 'Prisma error with another code',
      input: new Prisma.PrismaClientKnownRequestError('', {
        code: 'P2004',
        clientVersion: 'test',
      }),
      expected: false,
    },
    { case: 'plain Error', input: new Error('...'), expected: false },
    {
      case: 'plain object with P2002 code',
      input: { code: 'P2002' },
      expected: false,
    },
    { case: 'thrown string instead of error', input: 'P2025', expected: false },
  ])('$case → $expected', ({ input, expected }) => {
    expect(isUniqueViolation(input)).toBe(expected);
  });
});

describe('DomainError', () => {
  it('sets name to the subclass name', () => {
    const error = new TestError();

    expect(error.name).toBe('TestError');
    expect(error).toBeInstanceOf(DomainError);
  });
});
