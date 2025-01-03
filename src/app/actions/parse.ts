"use server";
import { getDBClient } from "@/db";
import { Datastore } from "@/db/interfaces";
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

type RowFirstPass = z.infer<typeof rowSchema>;
export type Row = Omit<RowFirstPass, "date"> & { date: string };
const dateFormatIn = "yyyy-MM-dd";
const maxDate = new Date("3000");
const minDate = new Date("1900");

const bankNames = z.enum(["TD", "Wealthsimple", "etc"]);
export type BankNames = z.infer<typeof bankNames>;

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

const tdParser = (text: string): RowFirstPass[] => {
  const data = parse(text, {
    columns: ["date", "description", "debit", "credit", "balance"],
    skipFirstRow: false,
    strip: true,
  });
  return data.map((r) => {
    let expense = 0;
    let income = 0;

    const incomeRow = Number(r.credit);
    const expenseRow = Number(r.debit);
    if (z.number().safeParse(expenseRow).success) {
      expense = Number(expenseRow);
    }
    if (z.number().safeParse(incomeRow).success) {
      income = Number(incomeRow);
    }
    const date = new Date(r.date);
    const description = r.description;
    return {
      income,
      expense,
      date,
      description,
      category: UNCATEGORIZED,
    };
  });
};

const wsParser = (text: string): RowFirstPass[] => {
  const data = parse(text, {
    columns: ["date", "transaction", "description", "amount", "balance"],
    skipFirstRow: false,
    strip: true,
  });
  return data.map((r) => {
    let amount = 0;
    const amountRow = Number(r.amount);
    if (z.number().safeParse(amountRow).success) {
      amount = Number(amountRow);
    }
    const date = new Date(r.date);
    const description = r.description;
    return {
      income: amount > 0 ? amount : 0,
      expense: amount < 0 ? -1 * amount : 0,
      date,
      description,
      category: UNCATEGORIZED,
    };
  });
};

const parserFnMap: Record<BankNames, (text: string) => RowFirstPass[]> = {
  TD: tdParser,
  Wealthsimple: wsParser,
  etc: () => [],
};

async function parseCsv(
  _prevState: unknown,
  formData: FormData
): Promise<ReturnType> {
  const files = formData.getAll("cc-stmt") as File[];
  // TODO: hardcoded for now, fix
  const bNames: BankNames[] = files.map(() => "Wealthsimple");
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
      const parserFn = parserFnMap?.[validatedBName];
      if (!parserFnMap) {
        console.error(`invalid parser function for ${validatedBName}`);
        return [];
      }
      return parserFn(text);
    })
  );

  const cleaned = dataAll
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

  const formattedRows = cleaned.map((row) => ({
    ...row,
    date: formatDate(row.date, dateFormatOut),
  }));
  let data = formattedRows.slice();
  if (process.env["EAGER_CATEGORIZE"]) {
    console.log("eagerly categorizing");
    const dbClient = getDBClient();
    data = await eagerCategorize(formattedRows, dbClient);
  }

  return {
    data,
    start: format(startDateOfData, dateFormatIn),
    end: format(endDateOfData, dateFormatIn),
  };
}

// try categorizing on csv parse
async function eagerCategorize(
  rows: Row[],
  dbClient: Datastore
): Promise<Row[]> {
  return Promise.all(
    rows.map(async (r) => {
      const category = await dbClient.getCategory(r.description);
      if (category) {
        return { ...r, category };
      }
      return r;
    })
  );
}
