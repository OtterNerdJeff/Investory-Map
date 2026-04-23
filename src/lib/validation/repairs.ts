import { z } from "zod";

export const RepairCreateSchema = z
  .object({
    description: z.string().min(1),
    technician: z.string().optional().nullable(),
    startDate: z.string().optional().nullable(),
    completeDate: z.string().optional().nullable(),
    cost: z
      .string()
      .optional()
      .nullable()
      .refine((v) => v == null || v === "" || !isNaN(parseFloat(v)), {
        message: "cost must be a valid number",
      }),
    notes: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.startDate && data.completeDate) {
      if (new Date(data.completeDate) < new Date(data.startDate)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "completeDate must not be before startDate",
          path: ["completeDate"],
        });
      }
    }
  });

export type RepairCreateInput = z.infer<typeof RepairCreateSchema>;
