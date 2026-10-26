export interface Period {
  start: Date;
  nextStart: Date;
}

export interface WeekSlot {
  index: number;
  start: Date;
  nextStart: Date;
}

const MS_PER_DAY = 86_400_000;

const DAYS_IN_WEEK = 7;

export function getPeriod(date: Date, startDay: number): Period {
  const year = date.getFullYear();
  const month = date.getMonth();
  const thisStart = periodStartIn(year, month, startDay);

  if (date >= thisStart) {
    return {
      start: thisStart,
      nextStart: periodStartIn(year, month + 1, startDay),
    };
  }
  return {
    start: periodStartIn(year, month - 1, startDay),
    nextStart: thisStart,
  };
}

export function countWeekSlots(period: Period): number {
  return Math.ceil(daysBetween(period.start, period.nextStart) / DAYS_IN_WEEK);
}

export function getWeekSlot(date: Date, period: Period): WeekSlot {
  const index = Math.floor(
    daysBetween(period.start, startOfDay(date)) / DAYS_IN_WEEK,
  );
  const start = addDays(period.start, index * DAYS_IN_WEEK);
  const weekEnd = addDays(start, DAYS_IN_WEEK);
  const nextStart = weekEnd < period.nextStart ? weekEnd : period.nextStart;

  return {
    index: index,
    start: start,
    nextStart: nextStart,
  };
}

export function isPeriodStart(date: Date, startDay: number): boolean {
  return (
    getPeriod(date, startDay).start.getTime() === startOfDay(date).getTime()
  );
}

export function toDbDate(date: Date): Date {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function periodStartIn(year: number, month: number, startDay: number): Date {
  return new Date(year, month, Math.min(daysInMonth(year, month), startDay));
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function addDays(date: Date, n: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / MS_PER_DAY);
}
