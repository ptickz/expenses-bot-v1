import { z } from 'zod';
import { type Env, envSchema } from './env.schema';

export function validate(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) throw new Error(z.prettifyError(result.error));
  return result.data;
}
