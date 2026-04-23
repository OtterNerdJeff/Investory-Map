import { z } from "zod";
import { FAULT_TYPES } from "@/lib/constants";

// Valid fault lifecycle statuses. See CLAUDE.md "Fault auto-escalation".
export const FAULT_STATUSES = ["Open", "In Progress", "Resolved"] as const;

// Severity drives item.status escalation (Low/Medium → Under Maintenance,
// High/Critical → Faulty). See CLAUDE.md.
export const FAULT_SEVERITIES = ["Low", "Medium", "High", "Critical"] as const;

export const FaultCreateSchema = z.object({
  faultType: z.enum(FAULT_TYPES as unknown as [string, ...string[]]),
  severity: z
    .enum(FAULT_SEVERITIES as unknown as [string, ...string[]])
    .default("Medium"),
  description: z.string().optional().nullable(),
  reportedBy: z.string().optional().nullable(),
  photos: z.array(z.string()).optional().default([]),
});

export const FaultUpdateSchema = z.object({
  status: z
    .enum(FAULT_STATUSES as unknown as [string, ...string[]])
    .optional(),
  resolvedBy: z.string().optional().nullable(),
  resolutionNote: z.string().optional().nullable(),
});

export type FaultCreateInput = z.infer<typeof FaultCreateSchema>;
export type FaultUpdateInput = z.infer<typeof FaultUpdateSchema>;
