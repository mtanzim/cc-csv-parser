"use server";
import { parse } from "@std/csv";
import { format, formatDate, isAfter, isBefore } from "date-fns";
import { z } from "zod";

const rowSchema = z.object({
  date: z.date(),
  description: z.string(),
  amount: z.number(),
});
type Row = Omit<z.infer<typeof rowSchema>, "date"> & { date: string };

const dateFormat = "MM/dd/yyyy";
const dateFormatIn = "yyyy-MM-dd";
const maxDate = new Date("3000");
const minDate = new Date("1900");

export type ReturnType = {
  data: Row[];
  start: string;
  end: string;
};

export async function parseCsv(
  _prevState: unknown,
  formData: FormData
): Promise<ReturnType> {
  const file = formData.get("cc-stmt") as File;
  if (!file || file.size === 0) {
    throw new Error("No file provided");
  }
  const expenseColumnRaw = formData.get("expense-column");
  const expenseColumn = z.enum(["debit", "credit"]).parse(expenseColumnRaw);

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
        amount: Number(row?.[expenseColumn]),
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
    });

  const startDateOfData = cleaned.reduce((acc, row) => {
    if (isBefore(row.date, acc)) {
      return new Date(row.date);
    }
    return acc;
  }, maxDate);
  const endDateOfData = cleaned.reduce((acc, row) => {
    if (isAfter(row.date, acc)) {
      return new Date(row.date);
    }
    return acc;
  }, minDate);

  const makeTotal = (nums: number[]) => nums.reduce((acc, v) => acc + v, 0);
  const totalAmount = makeTotal(cleaned.map((row) => row.amount)).toFixed(2);
  const finalRow = {
    date: "",
    description: "Total",
    amount: Number(totalAmount),
  };

  return {
    data: cleaned
      .map((row) => ({ ...row, date: formatDate(row.date, dateFormat) }))
      .concat(finalRow),
    start: format(startDateOfData, dateFormatIn),
    end: format(endDateOfData, dateFormatIn),
  };
}
