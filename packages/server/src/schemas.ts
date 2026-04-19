import { z } from 'zod';

export const CreateSessionBodySchema = z.object({
  commitSha: z.string().min(1),
  tester: z.string(),
});

export const AppendDeltaBodySchema = z.object({
  sequenceNumber: z.number().int().nonnegative(),
  capturedAt: z.string(),
  changes: z.record(z.unknown()),
});

export type CreateSessionBody = z.infer<typeof CreateSessionBodySchema>;
export type AppendDeltaBody = z.infer<typeof AppendDeltaBodySchema>;
