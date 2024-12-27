import { z } from "zod";
import { formatDate } from "date-fns";
export const dynamic = "force-dynamic";


const argSchema = z.object({
  month: z.string(),
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

export type ExportArgs = z.infer<typeof argSchema>;

// https://help.realbyteapps.com/hc/en-us/articles/360043223253-How-to-import-bulk-data-by-Excel-file
export async function POST(request: Request) {
  const body = argSchema.parse(await request.json());
  

}
