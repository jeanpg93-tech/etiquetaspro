import { z } from "zod";

export const productInputSchema = z.object({
  sku: z.string().trim().min(1, "SKU obrigatório").max(64),
  name: z.string().trim().min(1, "Nome obrigatório").max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  width_cm: z.number().nonnegative().optional().nullable(),
  height_cm: z.number().nonnegative().optional().nullable(),
  length_cm: z.number().nonnegative().optional().nullable(),
  weight_g: z.number().nonnegative().optional().nullable(),
});

export type ProductInput = z.infer<typeof productInputSchema>;

export const productUpdateSchema = productInputSchema.partial().extend({
  id: z.string().uuid(),
});

export const apiKeyCreateSchema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório").max(100),
});
