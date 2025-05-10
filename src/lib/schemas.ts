import { z } from "zod";

export const expenseSchema = z.array(
  z.object({
    id: z.string(),
    date: z.coerce.date(),
    name: z.string(),
    category: z.string(),
    expense: z.number(),
  }),
);
export const dateFormatOut = "MM/dd/yyyy";
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
