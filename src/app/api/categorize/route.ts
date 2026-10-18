import { getDBClient } from "@/db";
import { Datastore } from "@/db/interfaces";
import OpenAI from "openai";
import { z } from "zod";
import { withAuth } from "@/lib/with-auth";
import { categories } from "@/lib/schemas";
import { zodResponseFormat } from "openai/helpers/zod.mjs";

const apiKey = process.env?.["OPENAI_API_KEY"];
const openAIbaseURL = process.env?.["OPENAI_BASE_URL"];
const model = process.env?.["AI_MODEL"] || "";

export const dynamic = "force-dynamic";
const postArgSchema = z.object({
  expenses: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
    }),
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
            encoder.encode(`data:${JSON.stringify(cRes.message)}\n\n`),
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
  category: z.string(),
});

type Line = z.infer<typeof lineSchema>;

async function* populateFromCache(
  { expenses }: CategorizeArgs,
  cacheClient: Datastore,
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
  cacheClient: Datastore,
) {
  const aiClient = new OpenAI({
    baseURL: openAIbaseURL,
    apiKey,
  });

  const categorySet = new Set(categories);
  const lines = [];
  const errors = [];
  let cachedKeys: Set<number>;
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
  const remainingExpenses = expenses.filter((e) => !cachedKeys?.has(e.id));

  if (remainingExpenses.length === 0) {
    return { lines, errors: [] };
  }

  const prompt = makePrompt({ expenses: remainingExpenses });

  const resSchema = z.object({
    body: z.array(
      z.object({
        id: z.number().min(0),
        category: z.string(),
      }),
    ),
  });
  const stream = await aiClient.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: prompt,
      },
    ],
    response_format: zodResponseFormat(resSchema, "category_res_schema"),
    stream: true,
    temperature: 1,
  });

  let started = false;
  let buffer = "";
  let overallMessage = "";
  // create illusion of progress
  for await (const chunk of stream) {
    const delta = chunk.choices[0].delta.content;

    overallMessage += delta;
    if (!delta) {
      continue;
    }
    buffer += delta;
    if (buffer.includes(`{"body":[`)) {
      buffer = "";
      started = true;
    }
    const isEntryEnd = buffer.includes("}");
    const isStreamEnd = buffer.includes("]");
    const lastIndex = buffer.indexOf("}");
    // console.log({ delta, started, buffer, isStreamEnd });
    if ((isEntryEnd || isStreamEnd) && started) {
      const token = buffer.slice(0, lastIndex + 1);
      try {
        // console.log({ token });
        const cleaned = (token || "")
          .replace("},", "}")
          .replaceAll("\n", "")
          .replaceAll("]", "");
        const parsed = JSON.parse(cleaned);
        const vr = lineSchema.safeParse(parsed);
        if (!vr.success) {
          errors.push(vr.error.message);
          yield { errMsg: vr.error.message };
        } else if (!categorySet.has(vr.data.category)) {
          const errMsg = `bad category: ${vr.data.category}`;
          errors.push(errMsg);
          yield { errMsg };
        } else {
          lines.push({ message: vr.data });
          yield { message: vr.data };
        }
      } catch (err) {
        console.error(err);
        console.log({ buffer, token });
        if (err instanceof Error) {
          const errMsg = err.message;
          errors.push(errMsg);
          yield { errMsg: err.message };
        } else {
          const errMsg = "Something went wrong";
          errors.push(errMsg);
          yield { errMsg };
        }
      }
    }

    if (isEntryEnd) {
      buffer = buffer.slice(lastIndex + 2);
    }
  }

  // reconcile with overall message
  try {
    const parsedOverall = JSON.parse(overallMessage);
    console.log({ parsedOverall });
    for (const entry of parsedOverall?.["data"]) {
      const parsedEntry = lineSchema.safeParse(entry);
      if (parsedEntry.success) {
        lines.push({ message: parsedEntry.data });
        yield { message: parsedEntry.data };
      }
    }
  } catch (err) {
    if (err instanceof Error) {
      console.error(err.message);
    } else {
      console.error("cannot parse overall message");
    }
  }

  const expenseMap = new Map<number, string>();
  remainingExpenses.forEach((e) => {
    expenseMap.set(e.id, e.name);
  });
  const promises = lines.map((l) => {
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
  Promise.allSettled(promises)
    .then(() => "cached values")
    .catch(console.error);
  return { lines, errors };
}

function makePrompt({ expenses }: CategorizeArgs) {
  return `\
<purpose>
You are an expert expense categorizer. You will be given a list of expenses in a csv format.\
The input csv will include the following headers: id, expense.\
Additionally, you will be provided a list of categories you **must** select from.
Make sure to return the categories exactly as they were passed in, including the casing of the words.
</purpose>

Following are the expenses in csv:
<expenses>
id,expense
${expenses.map((e) => `${e.id},${e.name}`).join("\n")}
</expenses>

Following are the available categories to select from, separated by newline.
<categories>
${categories.join("\n")}
</categories

Following is an example csv input:
<inputExample>
\`\`\`csv
id,expense
1,SECOND CUP 9578
2,FUBO
3,HERTZ RENT A CAR
\`\`\`
</inputExample>

The above input would result in the following output:
<outputExample>
\`\`\`json
[
  {
    "id": 1
    "category": "Eating out",
  },
  {
    "id": 2
    "category": "Entertainment"
  },
  {
    "id": 3,
    "category": "Transportation"
  }
]
\`\`\`
</outputExample>
`;
}
