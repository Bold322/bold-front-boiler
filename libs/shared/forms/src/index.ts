import { z } from 'zod';

/**
 * Shared Zod schemas for forms. Keep the schema next to the data it validates
 * so the mock client, the real client and the form all agree on one shape.
 */

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['user', 'admin']).default('user'),
  levelIds: z.array(z.string()).default([]),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const tenantFilterSchema = z.object({
  search: z.string().default(''),
  status: z.enum(['active', 'paused', 'onboarding', 'archived']).optional(),
});

export type TenantFilterInput = z.infer<typeof tenantFilterSchema>;
