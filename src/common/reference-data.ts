//цели платежа
export const SAVING = { id: 1, title: 'Saving' } as const;
export const EXCHANGE = { id: 2, title: 'Exchange' } as const;
export const SALARY = { id: 3, title: 'Salary' } as const;
export const RENT = { id: 4, title: 'Rent' } as const;
export const SUBSCRIPTIONS = { id: 5, title: 'Subscriptions' } as const;
export const FOOD = { id: 6, title: 'Food' } as const;
export const BILL = { id: 7, title: 'Bill' } as const;
export const MISC = { id: 8, title: 'Misc' } as const;
export const PAYMENT_REASONS = {
  SAVING,
  EXCHANGE,
  SALARY,
  RENT,
  SUBSCRIPTIONS,
  FOOD,
  BILL,
  MISC,
} as const;

//системные счета; личные счета — в prisma/data/personal.json
export const SAVINGS = { id: 1, title: 'Savings' } as const;
export const ACCOUNTS = {
  SAVINGS,
} as const;

//периодичность применения
export const WEEKLY = { id: 1, title: 'Weekly' } as const;
export const MONTHLY = { id: 2, title: 'Monthly' } as const;
export const YEARLY = { id: 3, title: 'Yearly' } as const;
export const APPLY_DATES = {
  WEEKLY,
  MONTHLY,
  YEARLY,
} as const;

//тип уведомления
export const MORNING = { id: 1, title: 'Morning' } as const;
export const EVENING = { id: 2, title: 'Evening' } as const;
export const START_MONTH = { id: 3, title: 'Start month' } as const;
export const END_MONTH = { id: 4, title: 'End month' } as const;
export const REPORT_TYPES = {
  MORNING,
  EVENING,
  START_MONTH,
  END_MONTH,
} as const;
