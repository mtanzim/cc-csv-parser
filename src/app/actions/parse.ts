"use server";
import { dateFormatOut } from "@/lib/schemas";
import { parse } from "@std/csv";
import { format, formatDate, isAfter, isBefore } from "date-fns";
import { z } from "zod";

const rowSchema = z.object({
  date: z.date(),
  description: z.string(),
  category: z.string(),
  income: z.number(),
  expense: z.number(),
});

const UNCATEGORIZED = "Uncategorized";

export type Row = Omit<z.infer<typeof rowSchema>, "date"> & { date: string };

const dateFormatIn = "yyyy-MM-dd";
const maxDate = new Date("3000");
const minDate = new Date("1900");

const bankNames = z.enum(["TD", "etc"]);
export type BankNames = z.infer<typeof bankNames>;

type BankConfig = {
  csvConfig: {
    columns: string[];
    skipFirstRow: boolean;
    strip: boolean;
  };
  incomeHeader: string;
  dateHeader: string;
  descHeader: string;
  expenseHeader: string;
};

const parserConfig: Record<BankNames, BankConfig | undefined | null> = {
  TD: {
    csvConfig: {
      columns: ["date", "description", "debit", "credit", "balance"],
      skipFirstRow: false,
      strip: true,
    },
    dateHeader: "date",
    descHeader: "description",
    expenseHeader: "debit",
    incomeHeader: "credit",
  },
  etc: null,
};

export type ReturnType = {
  data: Row[];
  start: string;
  end: string;
  errorMsg?: string;
};

export async function wrappedParseCsv(
  prevState: unknown,
  formData: FormData
): Promise<ReturnType> {
  try {
    const r = await parseCsv(prevState, formData);
    return r;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Something went wrong";

    console.error(err);
    return {
      data: [],
      start: "",
      end: "",
      errorMsg: msg,
    };
  }
}

async function parseCsv(
  _prevState: unknown,
  formData: FormData
): Promise<ReturnType> {
  const files = formData.getAll("cc-stmt") as File[];
  // TODO: hardcoded for now, fix
  const bNames: BankNames[] = files.map(() => "TD");
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
    files.map(async (file, idx) => {
      const text = await decoder.decode(await file.arrayBuffer());
      const bankName = bNames?.[idx];
      // TODO: safe parse here
      const validatedBName = bankNames.parse(bankName);
      const cfg = parserConfig[bankName]?.csvConfig;
      if (!cfg) {
        throw new Error("misconfigured csv parsing");
      }
      return { bankName: validatedBName, data: parse(text, cfg) };
    })
  );

  const cleaned = dataAll
    .map((v) => {
      const { bankName, data } = v;
      const rows = data.map((row) => {
        let expense = 0;
        let income = 0;
        if (!parserConfig?.[bankName]) {
          return [];
        }
        const { incomeHeader, expenseHeader, dateHeader, descHeader } =
          parserConfig?.[bankName];
        const incomeRow = Number(row?.[incomeHeader]);
        const expenseRow = Number(row?.[expenseHeader]);
        if (z.number().safeParse(incomeRow).success) {
          expense = Number(expenseRow);
        }
        if (z.number().safeParse(incomeRow).success) {
          income = Number(incomeRow);
        }
        const date = new Date(row?.[dateHeader]);
        const description = row?.[descHeader];
        return {
          income,
          expense,
          date,
          description,
          category: UNCATEGORIZED,
        };
      });
      return rows;
    })
    .flat()
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

  return {
    data: cleaned.map((row) => ({
      ...row,
      date: formatDate(row.date, dateFormatOut),
    })),
    start: format(startDateOfData, dateFormatIn),
    end: format(endDateOfData, dateFormatIn),
  };
}
