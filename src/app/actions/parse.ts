"use server";
import { parse } from "@std/csv";

export async function parseCsv(prevState: unknown, formData: FormData) {
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
  return { data };
}
