import { z } from "zod";
import { getDBClient } from "@/db";
import { expenseSchemaNonEmpty } from "@/lib/schemas";
export const dynamic = "force-dynamic";

const persistArgsSchema = z.object({
  expenses: expenseSchemaNonEmpty,
  month: z.string(),
});

export type PersistArgs = z.infer<typeof persistArgsSchema>;

// https://help.realbyteapps.com/hc/en-us/articles/360043223253-How-to-import-bulk-data-by-Excel-file
export async function POST(request: Request) {
  const body = persistArgsSchema.parse(await request.json());
  console.log(JSON.stringify(body, null, 2));
  const client = getDBClient();
  const res = await client.persistMonth(body.month, body.expenses);
  console.log(res);
  return new Response("OK");
}
