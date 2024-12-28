import { z } from "zod";

export const expenseSchema = z.array(
  z.object({
    id: z.string(),
    date: z.coerce.date(),
    name: z.string(),
    category: z.string(),
    expense: z.number(),
  })
);

export const expenseSchemaNonEmpty = expenseSchema.min(1);
