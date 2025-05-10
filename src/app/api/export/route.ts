import { expenseSchemaNonEmpty } from "@/lib/schemas";
import { formatDate } from "date-fns";
import { z } from "zod";
import { withAuth } from "@/lib/with-auth";
export const dynamic = "force-dynamic";

const argSchema = z.object({
  expenses: expenseSchemaNonEmpty,
});

export type ExportArgs = z.infer<typeof argSchema>;

// https://help.realbyteapps.com/hc/en-us/articles/360043223253-How-to-import-bulk-data-by-Excel-file
export const POST = withAuth(async (request: Request) => {
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
  const rows = body.expenses
    .filter((r) => r.expense > 0)
    .map((row) => {
      return [
        formatDate(row.date, "MM/dd/yyyy"),
        "Cash",
        row.category,
        "",
        row.name.replace("\t", " "),
        row.expense.toFixed(2),
        "Expense",
        "",
        "",
      ].join("\t");
    });
  const tsvText = [headers].concat(rows).join("\n");
  const tsvBuffer = Buffer.from(tsvText, "utf8");

  return new Response(tsvBuffer, {
    headers: {
      "Content-Type": "text/tsv; charset=utf-8",
      "Content-Disposition": `attachment; filename=expenses.tsv`,
    },
  });
});
