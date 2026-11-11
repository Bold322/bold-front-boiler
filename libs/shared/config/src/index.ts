import { z } from 'zod';

const appConfigSchema = z.object({
  apiBaseUrl: z.string().url().default('http://localhost:3000'),
});

export type AppConfig = z.infer<typeof appConfigSchema>;

export function readAppConfig(env: Record<string, string | undefined>): AppConfig {
  return appConfigSchema.parse({
    apiBaseUrl: env['VITE_API_BASE_URL'],
  });
}
