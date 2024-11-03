"use server";
import { parse } from "@std/csv";
import { format, formatDate, isAfter, isBefore } from "date-fns";
import { z } from "zod";

const rowSchema = z.object({
  date: z.date(),
  description: z.string(),
  category: z.string().optional(),
  debit: z.number(),
  credit: z.number(),
});
export type Row = Omit<z.infer<typeof rowSchema>, "date"> & { date: string };

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
  const files = formData.getAll("cc-stmt") as File[];
  if (!files || files.length === 0) {
    throw new Error("No files provided");
  }
  files.forEach((f) => {
    if (f.size === 0) {
      throw new Error("Empty file provided");
    }
  });

  const decoder = new TextDecoder("utf-8");
  const dataAll = await Promise.all(
    files.map(async (file) => {
      const text = await decoder.decode(await file.arrayBuffer());
      return parse(text, {
        columns: ["date", "description", "debit", "credit", "balance"],
        skipFirstRow: false,
        strip: true,
      });
    })
  );

  const cleaned = dataAll
    .flat()
    .map((row) => {
      return {
        ...row,
        debit: isNaN(parseFloat(row.debit)) ? 0.0 : parseFloat(row.debit),
        credit: isNaN(parseFloat(row.credit)) ? 0.0 : parseFloat(row.debit),
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

  // categorize
  // const descriptionValues = [...new Set(cleaned.map((row) => row.description))];
  // console.log({ descriptionValues });
  // const mockRes = exampleResponse;
  // const parsedMockRes = openAIresponseArraySchema.parse(mockRes);
  // const mapped = new Map<string, string>();
  // parsedMockRes.forEach((row) => {
  //   mapped.set(row.description, row.category);
  // });
  // const categorized = cleaned.map((row) => {
  //   return {
  //     ...row,
  //     category: mapped.get(row.description) || "",
  //   };
  // });

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

  return {
    data: cleaned.map((row) => ({
      ...row,
      date: formatDate(row.date, dateFormat),
    })),
    start: format(startDateOfData, dateFormatIn),
    end: format(endDateOfData, dateFormatIn),
  };
}
