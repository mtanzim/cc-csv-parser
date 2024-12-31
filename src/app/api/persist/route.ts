import { z } from "zod";
import { getDBClient } from "@/db";
import { expenseSchemaNonEmpty } from "@/lib/schemas";
import { withAuth } from "../with-auth";
export const dynamic = "force-dynamic";

const persistArgsSchema = z.object({
  expenses: expenseSchemaNonEmpty,
  month: z.string(),
});

const getMonthArgsSchema = z.object({
  month: z.string().min(1),
});

export type PersistArgs = z.infer<typeof persistArgsSchema>;

export const POST = withAuth(async (request: Request) => {
  const body = persistArgsSchema.parse(await request.json());
  console.log(JSON.stringify(body, null, 2));
  const client = getDBClient();
  const res = await client.persistMonth(body.month, body.expenses);
  console.log(res);
  return new Response("OK");
});

export const GET = withAuth(async (request: Request) => {
  const url = new URL(request.url);
  const month = url.searchParams.get("month");
  const monthV = getMonthArgsSchema.parse({ month }).month;
  const client = getDBClient();

  const expensesRes = await client.getMonth(monthV);
  const expenses = expensesRes.expenses
  expenseSchemaNonEmpty.parse(expenses);

  return new Response(JSON.stringify(expenses), {
    headers: {
      "Content-Type": "application/json",
    },
  });
});
