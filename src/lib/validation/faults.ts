import { z } from "zod";

// Valid fault lifecycle statuses. See CLAUDE.md "Fault auto-escalation".
export const FAULT_STATUSES = ["Open", "In Progress", "Resolved"] as const;

// Severity drives item.status escalation (Low/Medium → Under Maintenance,
// High/Critical → Faulty). See CLAUDE.md.
export const FAULT_SEVERITIES = ["Low", "Medium", "High", "Critical"] as const;

export const FaultCreateSchema = z.object({
  faultType: z.string().min(1),
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
