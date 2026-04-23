import { z } from "zod";

export const SectionCreateSchema = z.object({
  name: z.string().min(1, "name is required"),
  isProtected: z.boolean().optional(),
});

export const SectionUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  sortOrder: z.number().int().optional(),
});

export const RoomCreateSchema = z.object({
  name: z.string().min(1, "name is required"),
});

export const RoomUpdateSchema = z.object({
  roomId: z.string().min(1, "roomId is required"),
  name: z.string().min(1).optional(),
  sortOrder: z.number().int().optional(),
});

export const RoomDeleteSchema = z.object({
  roomId: z.string().min(1, "roomId is required"),
  redirectTo: z.string().optional().default("Spare"),
});

export type SectionCreateInput = z.infer<typeof SectionCreateSchema>;
export type SectionUpdateInput = z.infer<typeof SectionUpdateSchema>;
export type RoomCreateInput = z.infer<typeof RoomCreateSchema>;
export type RoomUpdateInput = z.infer<typeof RoomUpdateSchema>;
export type RoomDeleteInput = z.infer<typeof RoomDeleteSchema>;
