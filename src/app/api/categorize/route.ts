import OpenAI from "openai";
import { z } from "zod";
import ollama from "ollama";

const apiKey = process.env?.["OPENAI_API_KEY"];

export const dynamic = "force-dynamic";
const argSchema = z.object({
  expenses: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
    })
  ),
  categories: z.array(z.string()),
});
export type CategorizeArgs = z.infer<typeof argSchema>;

export async function POST(request: Request) {
  const body = argSchema.parse(await request.json());
  console.log(body);
  const { categories, expenses } = body;
  const categorySet = new Set(categories);

  const encoder = new TextEncoder();
  const customReadable = new ReadableStream({
    async start(controller) {
      for await (const cRes of categorizeOllama({ categories, expenses })) {
        console.log(cRes);
        if (cRes.message) {
          if (categorySet.has(cRes.message.category)) {
            controller.enqueue(
              encoder.encode(`data:${JSON.stringify(cRes.message)}\n\n`)
            );
          } else {
            console.error(`bad category: ${JSON.stringify(cRes.message)}`);
          }
        } else {
          console.error(cRes.errMsg);
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
}

const aiClient = new OpenAI({
  apiKey,
});

const lineSchema = z.object({
  id: z.number(),
  // expense: z.string(),
  category: z.string(),
});

async function* categorizeOllama({ categories, expenses }: CategorizeArgs) {
  const prompt = makePrompt({ expenses, categories });

  console.log(prompt);
  const message = { role: "user", content: prompt };
  const stream = await ollama.chat({
    model: "llama3.1:8b",
    messages: [message],
    stream: true,
  });

  let buffer = "";
  let csvStarted = false;
  const lines = [];
  const errors = [];
  for await (const chunk of stream) {
    const delta = chunk.message.content;
    console.log({ delta });
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
      if (vr.success) {
        lines.push(nl);
        // console.log(nl);
        yield { message: nl };
      } else {
        errors.push(vr.error.message);
        // console.error(vr.error);
        yield { errMsg: vr.error.message };
      }
    }

    if (buffer.includes("```csv\n")) {
      csvStarted = true;
    }

    if (isLineEnd) {
      buffer = "";
    }
  }

  console.log({ lines, errors });
  return { lines, errors };
}

async function* categorize({ categories, expenses }: CategorizeArgs) {
  const prompt = makePrompt({ expenses, categories });

  console.log(prompt);
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
  const lines = [];
  const errors = [];
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    console.log({ delta });
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
      if (vr.success) {
        lines.push(nl);
        // console.log(nl);
        yield { message: nl };
      } else {
        errors.push(vr.error.message);
        // console.error(vr.error);
        yield { errMsg: vr.error.message };
      }
    }

    if (buffer.includes("```csv\n")) {
      csvStarted = true;
    }

    if (isLineEnd) {
      buffer = "";
    }
  }

  console.log({ lines, errors });
  return { lines, errors };
}

function makePrompt({ categories, expenses }: CategorizeArgs) {
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
