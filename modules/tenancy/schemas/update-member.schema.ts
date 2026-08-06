import { z } from "zod";

export const updateMemberSchema = z.object({
  role: z.enum(["owner", "manager", "menu_editor", "kitchen", "cashier", "viewer"]).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
