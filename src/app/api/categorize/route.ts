import { getDBClient } from "@/db";
import { Datastore } from "@/db/interfaces";
import OpenAI from "openai";
import { z } from "zod";
import { withAuth } from "@/lib/with-auth";
import { categories } from "@/lib/schemas";

const apiKey = process.env?.["OPENAI_API_KEY"];

export const dynamic = "force-dynamic";
const postArgSchema = z.object({
  expenses: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
    })
  ),
});
export type CategorizeArgs = z.infer<typeof postArgSchema>;

const patchArgSchema = z.object({
  expense: z.string(),
  category: z.string(),
  validCategories: z.array(z.string()),
});
export type PatchCategoryArg = z.infer<typeof patchArgSchema>;

function upsertCategoriesStore(client: Datastore, p: PatchCategoryArg) {
  if (!new Set(p.validCategories).has(p.category)) {
    console.log("Skipping");
    return;
  }

  client.setCategory(p.expense, p.category).catch(console.error);
}

export const PATCH = withAuth(async (request: Request) => {
  const body = patchArgSchema.parse(await request.json());
  const cacheClient = getDBClient();
  upsertCategoriesStore(cacheClient, body);

  return new Response("OK");
});

export const POST = withAuth(async (request: Request) => {
  const body = postArgSchema.parse(await request.json());
  const { expenses } = body;

  const encoder = new TextEncoder();
  const customReadable = new ReadableStream({
    async start(controller) {
      for await (const cRes of categorize({ expenses }, getDBClient())) {
        if ("message" in cRes) {
          controller.enqueue(
            encoder.encode(`data:${JSON.stringify(cRes.message)}\n\n`)
          );
        } else if ("errMsg" in cRes) {
          console.error(cRes.errMsg);
        } else {
          console.error("Unexpected response format");
        }
      }
      controller.close();
    },
  });

  return new Response(customReadable, {
    headers: {
      Connection: "keep-alive",
      "Content-Encoding": "none",
      "Cache-Control": "no-cache, no-transform",
      "Content-Type": "text/event-stream; charset=utf-8",
    },
  });
});

const lineSchema = z.object({
  id: z.number(),
  // expense: z.string(),
  category: z.string(),
});

type Line = z.infer<typeof lineSchema>;

async function* populateFromCache(
  { expenses }: CategorizeArgs,
  cacheClient: Datastore
) {
  const cachedIds = new Set<number>();

  for (const e of expenses) {
    const prev = await cacheClient.getCategory(e.name);
    if (!prev) {
      continue;
    }
    const line: Line = {
      category: prev,
      id: e.id,
    };
    if (!lineSchema.safeParse(line).success) {
      continue;
    }
    cachedIds.add(e.id);
    yield { message: line };
  }
  return cachedIds;
}

async function* categorize(
  { expenses }: CategorizeArgs,
  cacheClient: Datastore
) {
  const aiClient = new OpenAI({
    apiKey,
  });
  const categorySet = new Set(categories);
  let cachedKeys: Set<number>;
  const lines = [];
  const errors = [];
  const gen = populateFromCache({ expenses }, cacheClient);
  while (true) {
    const line = await gen.next();

    if (line.done) {
      cachedKeys = line.value;
      break;
    }
    lines.push(line.value);
    yield line.value;
  }

  const remainingExpenses = expenses.filter((e) => !cachedKeys.has(e.id));

  if (remainingExpenses.length === 0) {
    return { lines, errors: [] };
  }

  const prompt = makePrompt({ expenses: remainingExpenses });

  const stream = await aiClient.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    stream: true,
  });
  let buffer = "";
  let csvStarted = false;

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    buffer += delta;
    if (csvStarted && buffer.includes("```")) {
      break;
    }
    const isLineEnd = buffer.includes("\n");

    if (csvStarted && isLineEnd) {
      const tokens = buffer
        .slice(0, -1)
        .split(",")
        .map((s) => s.trim());
      const nl = {
        id: Number(tokens?.[0]),
        category: tokens?.[1],
      };
      const vr = lineSchema.safeParse(nl);
      if (!vr.success) {
        errors.push(vr.error.message);
        yield { errMsg: vr.error.message };
      } else if (!categorySet.has(vr.data.category)) {
        const errMsg = `bad category: ${vr.data.category}`;
        errors.push(errMsg);
        yield { errMsg };
      } else {
        lines.push({ message: nl });
        yield { message: nl };
      }
    }

    if (buffer.includes("```csv\n")) {
      csvStarted = true;
    }

    if (isLineEnd) {
      buffer = "";
    }
  }

  const expenseMap = new Map<number, string>();
  remainingExpenses.forEach((e) => {
    expenseMap.set(e.id, e.name);
  });
  const ps = lines.map((l) => {
    const expense = expenseMap.get(l.message.id);
    if (!expense) {
      return Promise.resolve();
    }
    return upsertCategoriesStore(cacheClient, {
      expense,
      category: l.message.category,
      validCategories: categories,
    });
  });
  Promise.allSettled(ps)
    .then(() => "cached values")
    .catch(console.error);

  return { lines, errors };
}

function makePrompt({ expenses }: CategorizeArgs) {
  return `
Please categorize these expenses from the provided category options.   
Respond in a csv format with the id as the first column, and category as the second.
You can omit the expense name from the response.
Use markdown only, starting your response with \`\`\`csv.
Do not include the csv headers in your response.
Make sure to keep the ids intact.
Following are the expenses in csv with the headers:
\`\`\`csv
id,name
${expenses.map((e) => `${e.id},${e.name}`).join("\n")}
\`\`\`

Following are the available categories to select from in plaintext, separated by newline:
\`\`\`plaintext
${categories.join("\n")}
\`\`\`
`;
}
