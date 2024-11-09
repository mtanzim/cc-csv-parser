import OpenAI from "openai";
import { z } from "zod";

const apiKey = process.env?.["OPENAI_API_KEY"];

// Prevents this route's response from being cached on Vercel
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

  const encoder = new TextEncoder();
  // Create a streaming response
  const customReadable = new ReadableStream({
    start(controller) {
      const message = "A sample message.";
      controller.enqueue(encoder.encode(`data: ${message}\n\n`));
    },
  });
  // Return the stream response and keep the connection alive
  for await (const cRes of categorize({ categories, expenses })) {
    console.log(cRes);
  }
  return new Response(customReadable, {
    // Set the headers for Server-Sent Events (SSE)
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
  expense: z.string(),
  category: z.string(),
});

async function* categorize({ categories, expenses }: CategorizeArgs) {
  const prompt = makePrompt(
    expenses.map((e) => e.name),
    categories
  );
  console.log(prompt);
  const stream = await aiClient.chat.completions.create({
    model: "gpt-3.5-turbo",
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
    if (csvStarted && buffer.includes("```\n")) {
      break;
    }
    const isLineEnd = buffer.includes("\n");
    if (csvStarted && isLineEnd) {
      const tokens = buffer.slice(0, -1).split(",");
      const nl = {
        expense: tokens?.[0],
        category: tokens?.[1],
      };
      const vr = lineSchema.safeParse(nl);
      if (vr.success) {
        lines.push(nl);
        console.log(nl);
        yield { message: nl };
      } else {
        errors.push(vr.error.message);
        console.error(vr.error);
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

function makePrompt(expenses: string[], categories: string[]) {
  return `
Please categorize these expenses from the provided options.   
Respond in a csv format with the expense as the first column, and category as the second.
Use markdown only, starting your response with \`\`\`csv. Do not include the headers.
Following are the expenses:
\`\`\`plaintext
${expenses.join("\n")}
\`\`\`

Following are the available categories to select from:
\`\`\`plaintext
${categories.join("\n")}
\`\`\`
`;
}
