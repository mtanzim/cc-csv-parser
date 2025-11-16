import { z } from "zod";
import { getDBClient } from "@/db";
import { expenseSchemaNonEmpty } from "@/lib/schemas";
import { withAuth } from "@/lib/with-auth";
import { Datastore } from "@/db/interfaces";
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

// TODO: clean up this api
export const GET = withAuth(async (request: Request) => {
  const url = new URL(request.url);
  const client = getDBClient();
  const month = url.searchParams.get("month");
  const year = url.searchParams.get("year");
  console.log({ year, month });
  if (!month && !year) {
    const months = await client.listMonths();
    console.log({ months });
    return new Response(JSON.stringify(months), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  let expenses: unknown[] = [];
  if (month) {
    const monthV = getMonthArgsSchema.parse({ month }).month;
    expenses = await getMonthData(client, monthV);
  }
  if (year) {
    const months = Array.from(
      { length: 12 },
      (_, i) => `${String(i + 1).padStart(2, "0")}-${year}`
    );
    const promises = months.map((m) => () => getMonthData(client, m));
    expenses = (await Promise.allSettled(promises.map((p) => p()))).flatMap(
      (res) => {
        if (res.status === "fulfilled") {
          return res.value;
        }
        console.error(res.status, res.reason);
        return [];
      }
    );
  }

  return new Response(JSON.stringify(expenses), {
    headers: {
      "Content-Type": "application/json",
    },
  });
});

async function getMonthData(client: Datastore, monthV: string) {
  console.log(`getting ${monthV}`);
  const expensesRes = await client.getMonth(monthV);
  const expenses = expensesRes.expenses;
  const parsed = expenseSchemaNonEmpty.safeParse(expenses);
  if (parsed.success) {
    return parsed.data;
  }
  console.error(parsed.error);
  return [];
}
