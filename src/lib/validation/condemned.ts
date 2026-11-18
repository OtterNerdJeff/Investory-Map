import { z } from "zod";

export const CondemnDocCreateSchema = z.object({
  url: z.string().url(),
  fileName: z.string().min(1).max(200),
});

export type CondemnDocCreateInput = z.infer<typeof CondemnDocCreateSchema>;
