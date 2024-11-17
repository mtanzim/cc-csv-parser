import { z } from "zod";
import { formatDate } from "date-fns";
export const dynamic = "force-dynamic";

const argSchema = z.object({
  expenses: z.array(
    z.object({
      id: z.string(),
      date: z.coerce.date(),
      name: z.string(),
      category: z.string(),
      expense: z.number(),
    })
  ),
});

export type ExportArgs = z.infer<typeof argSchema>;

// https://help.realbyteapps.com/hc/en-us/articles/360043223253-How-to-import-bulk-data-by-Excel-file
export async function POST(request: Request) {
  const body = argSchema.parse(await request.json());
  const headers = [
    "Date",
    "Account",
    "Category",
    "Subcategory",
    "Note",
    "Amount",
    "Income/Expense",
    "Description",
  ].join("\t");
  const rows = body.expenses.map((row) => {
    return [
      formatDate(row.date, "MM/dd/yyyy"),
      "Cash",
      row.category,
      "",
      "",
      row.expense,
      "Expense",
      "",
      row.name,
    ].join("\t");
  });
  const tsvText = [headers].concat(rows).join("\n");
  console.log(body);
  console.log(tsvText);

  return new Response(tsvText);
}
