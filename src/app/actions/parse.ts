"use server";
import { parse } from "@std/csv";
import {
  format,
  formatDate,
  isAfter,
  isBefore,
  isEqual,
  parse as parseDate,
} from "date-fns";
import { z } from "zod";

const rowSchema = z.object({
  date: z.date(),
  description: z.string(),
  debit: z.number(),
  credit: z.number(),
});
type Row = Omit<z.infer<typeof rowSchema>, "date"> & { date: string };

const sortBySchema = z.enum(["date", "description", "debit", "credit"]);
const sortOrderSchema = z.enum(["asc", "desc"]);
const dateFormat = "MM/dd/yyyy";
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
  const sortBy = (formData.get("sort-by") as keyof Row) || "date";
  const sortOrder = formData.get("sort-order") || "desc";
  const startDateStr =
    formData.get("start-date") || format(minDate, dateFormat);
  const endDateStr = formData.get("end-date") || format(maxDate, dateFormat);

  // Validate input
  sortBySchema.parse(sortBy);
  sortOrderSchema.parse(sortOrder);

  console.log("startDateStr", startDateStr);
  console.log("endDateStr", endDateStr);

  if (typeof startDateStr !== "string" || typeof endDateStr !== "string") {
    throw new Error("Invalid date format");
  }
  const startDate = parseDate(startDateStr, dateFormat, new Date());
  const endDate = parseDate(endDateStr, dateFormat, new Date());

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
    .filter((row) => {
      return (
        (isEqual(row.date, startDate) || isAfter(row.date, startDate)) &&
        (isBefore(row.date, endDate) || isEqual(row.date, endDate))
      );
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

  const sorted = cleaned.toSorted((a, b) => {
    if (sortBy === "date") {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    }
    if (sortBy === "description") {
      return a.description.localeCompare(b.description);
    }
    if (sortBy === "debit" || sortBy === "credit") {
      return a[sortBy] - b[sortBy];
    }
    throw new Error("Invalid sort by value");
  });

  if (sortOrder === "desc") {
    sorted.reverse();
  }

  const makeTotal = (nums: number[]) => nums.reduce((acc, v) => acc + v, 0);
  const totalDebit = makeTotal(cleaned.map((row) => row.debit)).toFixed(2);
  const totalCredit = makeTotal(cleaned.map((row) => row.credit)).toFixed(2);
  const finalRow = {
    date: "",
    description: "Total",
    debit: Number(totalDebit),
    credit: Number(totalCredit),
  };

  return {
    data: sorted
      .map((row) => ({ ...row, date: formatDate(row.date, dateFormat) }))
      .concat(finalRow),
    start: format(startDateOfData, dateFormat),
    end: format(endDateOfData, dateFormat),
  };
}
