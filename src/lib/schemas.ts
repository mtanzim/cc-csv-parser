import { z } from "zod";

export const eachExpenseSchema = z.object({
  id: z.string(),
  date: z.coerce.date(),
  name: z.string().trim().min(1, "Name is required"),
  category: z.string(),
  expense: z.number().min(0.05),
  splitFactor: z.coerce.number().int().min(1).max(9).optional().default(1),
  bankName: z.string().optional().default(""),
});
export const expenseSchema = z.array(eachExpenseSchema);

export const dateFormatOut = "MM/dd/yyyy";
export const dateFormatISO = "yyyy-MM-dd";
export type PersistedExpense = z.infer<typeof expenseSchema>;
export const expenseSchemaNonEmpty = expenseSchema.min(1);

export const UNCATEGORIZED = "Uncategorized";
export const categories = [
  ...new Set([
    "Fees",
    "Flights",
    "Eating Out",
    "Gift",
    "Travel",
    "Household",
    "Communication",
    "Entertainment",
    "Groceries",
    "Apparel",
    "Transportation",
    "Culture",
    "Education",
    "Health",
  ]),
];
