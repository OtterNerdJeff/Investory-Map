import { z } from "zod";

export const RepairCreateSchema = z.object({
  description: z.string().min(1),
  technician: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  completeDate: z.string().optional().nullable(),
  cost: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type RepairCreateInput = z.infer<typeof RepairCreateSchema>;
