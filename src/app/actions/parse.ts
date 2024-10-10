"use server";
import { parse } from "@std/csv";

type Row = {
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
};

export type ReturnType = {
  data: Row[];
}

export async function parseCsv(
  prevState: unknown,
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
  const cleaned = data.map((row) => {
    return {
      ...row,
      debit: parseFloat(row.debit),
      credit: parseFloat(row.credit),
      balance: parseFloat(row.balance),
    };
  }) as Row[];
  return { data: cleaned };
}
