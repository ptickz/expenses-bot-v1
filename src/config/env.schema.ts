import { z } from 'zod';

const isValidTimeZone = (tz: string): boolean => {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  TZ: z.string().refine(isValidTimeZone, 'Unknown timezone'),

  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),

  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_CHAT_ID: z.string().min(1),

  PERIOD_START_DAY: z.coerce.number().int().min(1).max(31).default(25),
});

export type Env = z.infer<typeof envSchema>;
