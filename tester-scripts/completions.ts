import OpenAI from "openai";
import { z } from "zod";

const apiKey = process.env?.["OPENAI_API_KEY"];

const client = new OpenAI({
  apiKey,
});

const lineSchema = z.object({
  id: z.string(),
  category: z.string(),
});

async function main() {
  const expenseSlc = expenses.slice(0, 500);
  const prompt = makePrompt(expenseSlc, categories);
  console.log(prompt);
  const stream = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: prompt,
      },
    ],
    stream: true,
    temperature: 0.2,
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
        id: tokens?.[0],
        category: tokens?.[1].trim(),
      };
      const vr = lineSchema.safeParse(nl);
      if (vr.success) {
        lines.push(nl);
        console.log(nl);
      } else {
        errors.push(vr.error.message);
        console.error(vr.error);
      }
    }

    if (buffer.includes("```csv\n")) {
      csvStarted = true;
    }

    if (isLineEnd) {
      buffer = "";
    }

    // process.stdout.write(detla || "");
  }

  console.log({ lines, errors });
  // test mapping
  const expenseMap = Object.fromEntries(
    expenseSlc.map((e, idx) => [hashFn(idx), e]),
  );
  const categoriesMap = Object.fromEntries(
    lines.map((l) => [l.id, l.category]),
  );
  const res = Object.entries(expenseMap).map((em) => {
    const [k, v] = em;
    return { id: k, expense: v, category: categoriesMap?.[k] || "unknown" };
  });
  console.log({ res });
}

const expenses = [
  "SECOND CUP 9578",
  "WWW.MEUI.CA",
  "SQ *WUBAEATS",
  "SHOPPERS DRUG MART #08",
  "SQ *BRETT'S",
  "BAM*HUNGERHUB",
  "TIM HORTONS #4365",
  "UBER CANADA/UBERTRIP",
  "GARDENVIEW-PETVIEW",
  "SQ *NEO COFFEE BAR",
  "PAYPAL *PLAYSTATION",
  "FARM BOY #29",
  "TIM HORTONS #5840",
  "SONNET INSURANCE COMPANY",
  "BEANFIELD TECHNOLOGIES",
  "DE MELLO ONLINE INC.",
  "RABBA FINE FOODS #191",
  "PREAUTHORIZED PAYMENT",
  "HUDSON STO1564",
  "GOOGLE *CLOUD GBDM9N",
  "TIM HORTONS #0488",
  "CABIN COFFEE",
  "Spotify P2F02356B7",
  "THE WOODEN MONKEY DARTMOU",
  "TIM HORTONS #1742",
  "PANE E CIRCO DOYLE",
  "MARTHAS PIZZA II HALIFAX",
  "Wired Monk",
  "LAWTONS #114",
  "HERTZ RENT A CAR",
  "PHO MANIAC",
  "CIRCLE K/IRVING #2094",
  "FISH LAND INN",
  "BUOY & ARROW",
  "GROS MORNE CRAFTS",
  "FISHERMANS LANDING LTD",
  "IRVING STATION #37215",
  "AIRALO",
  "BONTOURS WBP",
  "PN GROS MORNE NP-VRC",
  "JAVA JACKS RESTAURANT AND",
  "SQ *SUNSET GIFT SHOPPE",
  "DEER LAKE BIG STOP",
  "SCOTLAND YARD",
  "OH MY GYRO",
  "RANDYS ROTI & DOUBLES",
  "Amazon.ca Prime Member",
  "JAPADOG",
  "ICHA TEA",
  "SAIGON LOTUS",
  "FIDO Mobile ******2993",
  "FUBO",
  "MCDONALD'S #8728   Q04",
  "SQ *THE LIBRARY SPECIALTY",
  "AIR CAN*    0142102524424",
];

const categories = [
  "Fees",
  "Flights",
  "Eating Out",
  "Gift",
  "Travel",
  "Household",
  "Communication",
  "Entertainment",
  "Groceries",
  "Apparel",
  "Transportation",
  "Apparel",
  "Culture",
  "Education",
  "Health",
];

function makePrompt(expenses: string[], categories: string[]) {
  return `
<purpose>
You are an expert expense categorizer. You will be given a list of expenses in a csv format.\
The input csv will include the following headers: id, expense.\
Additionally, you will be provided a list of categories you **must** select from.
You must respond with the following entries: id, category.\
However, you must omit the csv headers in your response.\
Use markdown only, starting your response with \`\`\`csv. End your response with \`\`\`.\

</purpose>

Following are the expenses in csv:
<expenses>
id,expense
${expenses.map((e, idx) => `${hashFn(idx)},${e}`).join("\n")}
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
\`\`\`csv
1, Eating Out
2, Entertainment
3, Transportation
\`\`\`
<\outputExample>
`;
}

function hashFn(idx: number) {
  return String(idx + 1);
}

main();
