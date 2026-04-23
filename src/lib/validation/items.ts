import { z } from "zod";
import { STATUS_LIST, STATUS_ENUM_FOR_VALIDATION } from "@/lib/constants";

// Status accepted on POST: only user-selectable values from STATUS_LIST.
const CreateStatusEnum = z.enum(
  STATUS_LIST as unknown as [string, ...string[]]
);

// Status accepted on PUT: all 6 including server-derived "Faulty".
// See CLAUDE.md "Fault auto-escalation" — Faulty/Under Maintenance are set
// by the faults API based on severity, so they must round-trip on update.
const UpdateStatusEnum = z.enum(
  STATUS_ENUM_FOR_VALIDATION as unknown as [string, ...string[]]
);

export const ItemCreateSchema = z.object({
  label: z.string().min(1, "label is required"),
  assetCode: z.string().optional().nullable(),
  type: z.string().min(1).default("Projector"),
  brand: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  serial: z.string().optional().nullable(),
  locationName: z.string().min(1).default("Spare"),
  cost: z.union([z.string(), z.number()]).optional().nullable(),
  warrantyEnd: z.string().optional().nullable(),
  status: CreateStatusEnum.default("Operational"),
  statusNote: z.string().optional().nullable(),
  loanable: z.boolean().default(false),
  remark: z.string().max(300).optional().nullable(),
  comment: z.string().max(300).optional().nullable(),
  sheet: z.string().optional().nullable(),
});

export const ItemUpdateSchema = ItemCreateSchema.partial()
  .extend({
    status: UpdateStatusEnum.optional(),
    isLoaned: z.boolean().optional(),
    loanedTo: z.string().optional().nullable(),
  });

export const ItemMoveSchema = z.object({
  toLocation: z.string().min(1, "toLocation is required"),
  reason: z.string().optional().nullable(),
  movedBy: z.string().optional().nullable(),
});

export type ItemCreateInput = z.infer<typeof ItemCreateSchema>;
export type ItemUpdateInput = z.infer<typeof ItemUpdateSchema>;
export type ItemMoveInput = z.infer<typeof ItemMoveSchema>;
