import OpenAI from "openai";

const apiKey = process.env?.["OPENAI_API_KEY"]

const client = new OpenAI({
  apiKey, // This is the default and can be omitted
});

async function main() {
  if (!apiKey) {
    throw new Error("api key needed")
  }
  const stream = await client.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: "Say this is a test" }],
    stream: true,
  });
  for await (const chunk of stream) {
    process.stdout.write(chunk.choices[0]?.delta?.content || "");
  }
}

main()
