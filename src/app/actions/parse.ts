"use server";
import { parse } from "@std/csv";
import { z } from "zod";

const rowSchema = z.object({
  date: z.date(),
  description: z.string(),
  debit: z.number(),
  credit: z.number(),
});
type Row = Omit<z.infer<typeof rowSchema>, "date"> & { date: string };

export type ReturnType = {
  data: Row[];
};

export async function parseCsv(
  _prevState: unknown,
  formData: FormData
): Promise<{ data: Row[] }> {
  const file = formData.get("cc-stmt") as File;

  if (!file) {
    throw new Error("No file provided");
  }

  const decoder = new TextDecoder("utf-8");
  const text = await decoder.decode(await file.arrayBuffer());
  const data = parse(text, {
    columns: ["date", "description", "debit", "credit", "balance"],
    skipFirstRow: false,
    strip: true,
  });
  const cleaned = data
    .map((row) => {
      return {
        ...row,
        debit: Number(row.debit),
        credit: Number(row.credit),
        date: new Date(row.date),
      };
    })
    .filter((row) => {
      const r = rowSchema.safeParse(row);
      if (r.success) {
        return true;
      }
      console.log("Invalid row", row);
      console.log("error", r.error);
      return false;
    })
    .map((r) => {
      return rowSchema.parse(r);
    })
    .map((row) => ({ ...row, date: row.date.toLocaleDateString() }));
  console.log(cleaned);
  return { data: cleaned };
}
