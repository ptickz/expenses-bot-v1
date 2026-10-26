import {
  countWeekSlots,
  getPeriod,
  getWeekSlot,
  isPeriodStart,
  toDbDate,
} from './period';

// 'npm run test:tz' for multiple timezone testing
type Ymd = [year: number, month: number, day: number, hour?: number];
const d = ([year, month, day, hour = 0]: Ymd) =>
  new Date(year, month - 1, day, hour);

type PeriodCase = { date: Ymd; startDay: number; start: Ymd; nextStart: Ymd };
type SlotCase = { date: Ymd; index: number; start: Ymd; nextStart: Ymd };

describe('getPeriod', () => {
  it.each([
    {
      date: [2026, 10, 24],
      startDay: 25,
      start: [2026, 9, 25],
      nextStart: [2026, 10, 25],
    },
    {
      date: [2026, 10, 25],
      startDay: 25,
      start: [2026, 10, 25],
      nextStart: [2026, 11, 25],
    },
    {
      date: [2026, 10, 25, 23],
      startDay: 25,
      start: [2026, 10, 25],
      nextStart: [2026, 11, 25],
    },
    {
      date: [2026, 10, 24, 23],
      startDay: 25,
      start: [2026, 9, 25],
      nextStart: [2026, 10, 25],
    },
    {
      date: [2026, 12, 30],
      startDay: 25,
      start: [2026, 12, 25],
      nextStart: [2027, 1, 25],
    },
    {
      date: [2026, 1, 10],
      startDay: 25,
      start: [2025, 12, 25],
      nextStart: [2026, 1, 25],
    },
    {
      date: [2026, 2, 28],
      startDay: 31,
      start: [2026, 2, 28],
      nextStart: [2026, 3, 31],
    },
    {
      date: [2026, 3, 15],
      startDay: 31,
      start: [2026, 2, 28],
      nextStart: [2026, 3, 31],
    },
    {
      date: [2026, 3, 31],
      startDay: 31,
      start: [2026, 3, 31],
      nextStart: [2026, 4, 30],
    },
    {
      date: [2026, 4, 30],
      startDay: 31,
      start: [2026, 4, 30],
      nextStart: [2026, 5, 31],
    },
    {
      date: [2028, 2, 29],
      startDay: 30,
      start: [2028, 2, 29],
      nextStart: [2028, 3, 30],
    },
    {
      date: [2027, 2, 28],
      startDay: 30,
      start: [2027, 2, 28],
      nextStart: [2027, 3, 30],
    },
    {
      date: [2027, 2, 27],
      startDay: 30,
      start: [2027, 1, 30],
      nextStart: [2027, 2, 28],
    },
    {
      date: [2026, 10, 1],
      startDay: 1,
      start: [2026, 10, 1],
      nextStart: [2026, 11, 1],
    },
    {
      date: [2026, 9, 30, 23],
      startDay: 1,
      start: [2026, 9, 1],
      nextStart: [2026, 10, 1],
    },
  ] satisfies PeriodCase[])(
    '$date with startDay $startDay',
    ({ date, startDay, start, nextStart }) => {
      expect(getPeriod(d(date), startDay)).toEqual({
        start: d(start),
        nextStart: d(nextStart),
      });
    },
  );
});

describe('countWeekSlots', () => {
  it.each([
    { start: [2026, 10, 25], nextStart: [2026, 11, 25], expected: 5 },
    { start: [2026, 9, 25], nextStart: [2026, 10, 25], expected: 5 },
    { start: [2026, 2, 1], nextStart: [2026, 3, 1], expected: 4 },
    { start: [2028, 2, 1], nextStart: [2028, 3, 1], expected: 5 },
  ] satisfies { start: Ymd; nextStart: Ymd; expected: number }[])(
    '$start – $nextStart → $expected',
    ({ start, nextStart, expected }) => {
      expect(countWeekSlots({ start: d(start), nextStart: d(nextStart) })).toBe(
        expected,
      );
    },
  );
});

describe('getWeekSlot', () => {
  const period = { start: d([2026, 10, 25]), nextStart: d([2026, 11, 25]) };

  it.each([
    {
      date: [2026, 10, 25],
      index: 0,
      start: [2026, 10, 25],
      nextStart: [2026, 11, 1],
    },
    {
      date: [2026, 10, 31, 23],
      index: 0,
      start: [2026, 10, 25],
      nextStart: [2026, 11, 1],
    },
    {
      date: [2026, 11, 1],
      index: 1,
      start: [2026, 11, 1],
      nextStart: [2026, 11, 8],
    },
    {
      date: [2026, 11, 1, 12],
      index: 1,
      start: [2026, 11, 1],
      nextStart: [2026, 11, 8],
    },
    {
      date: [2026, 11, 15],
      index: 3,
      start: [2026, 11, 15],
      nextStart: [2026, 11, 22],
    },
    {
      date: [2026, 11, 22],
      index: 4,
      start: [2026, 11, 22],
      nextStart: [2026, 11, 25],
    },
    {
      date: [2026, 11, 24, 23],
      index: 4,
      start: [2026, 11, 22],
      nextStart: [2026, 11, 25],
    },
  ] satisfies SlotCase[])(
    '$date → slot $index',
    ({ date, index, start, nextStart }) => {
      expect(getWeekSlot(d(date), period)).toEqual({
        index,
        start: d(start),
        nextStart: d(nextStart),
      });
    },
  );

  it('last slot of a 28-day period is a full week', () => {
    const february = { start: d([2026, 2, 1]), nextStart: d([2026, 3, 1]) };

    expect(getWeekSlot(d([2026, 2, 28]), february)).toEqual({
      index: 3,
      start: d([2026, 2, 22]),
      nextStart: d([2026, 3, 1]),
    });
  });
});

describe('isPeriodStart', () => {
  it.each([
    { date: [2026, 10, 25], startDay: 25, expected: true },
    { date: [2026, 10, 25, 23], startDay: 25, expected: true },
    { date: [2026, 10, 24], startDay: 25, expected: false },
    { date: [2026, 10, 26], startDay: 25, expected: false },
    { date: [2026, 10, 20], startDay: 15, expected: false },
    { date: [2026, 4, 30], startDay: 31, expected: true },
    { date: [2026, 3, 30], startDay: 31, expected: false },
    { date: [2026, 3, 31], startDay: 31, expected: true },
    { date: [2026, 2, 28], startDay: 31, expected: true },
    { date: [2028, 2, 29], startDay: 30, expected: true },
    { date: [2028, 2, 28], startDay: 30, expected: false },
  ] satisfies { date: Ymd; startDay: number; expected: boolean }[])(
    '$date with startDay $startDay → $expected',
    ({ date, startDay, expected }) => {
      expect(isPeriodStart(d(date), startDay)).toBe(expected);
    },
  );
});

describe('toDbDate', () => {
  it.each([
    { date: [2026, 10, 25], expected: '2026-10-25T00:00:00.000Z' },
    { date: [2026, 10, 25, 23], expected: '2026-10-25T00:00:00.000Z' },
    { date: [2026, 1, 1], expected: '2026-01-01T00:00:00.000Z' },
  ] satisfies { date: Ymd; expected: string }[])(
    'local $date → UTC midnight of the same calendar day',
    ({ date, expected }) => {
      expect(toDbDate(d(date)).toISOString()).toBe(expected);
    },
  );
});
