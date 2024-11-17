import { z } from "zod";

export const dynamic = "force-dynamic";

const stringToValidDate = z.coerce.date().transform((dateString, ctx) => {
  const date = new Date(dateString);
  if (!z.date().safeParse(date).success) {
    ctx.addIssue({
      code: z.ZodIssueCode.invalid_date,
    });
  }
  return date;
});

const argSchema = z.object({
  expenses: z.array(
    z.object({
      id: z.string(),
      date: z.coerce.date(),
      name: z.string(),
      category: z.string(),
      expense: z.number(),
    })
  ),
});

export type ExportArgs = z.infer<typeof argSchema>

export async function POST(request: Request) {
  const body = argSchema.parse(await request.json());
  console.log(body);
  return new Response("OK")
}
