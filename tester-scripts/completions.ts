import OpenAI from "openai";

const apiKey = process.env?.["OPENAI_API_KEY"];

const client = new OpenAI({
  apiKey, // This is the default and can be omitted
});

async function main() {
  const stream = await client.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "user",
        content: makePrompt(expenses, categories),
      },
    ],
    stream: true,
  });
  let buffer = "";
  let csvStarted = false;
  const lines = [];
  for await (const chunk of stream) {
    const detla = chunk.choices[0]?.delta?.content;
    buffer += detla;
    if (csvStarted && buffer.includes("```\n")) {
      break;
    }
    const isLineEnd = buffer.includes("\n");
    if (csvStarted && isLineEnd) {
      const tokens = buffer.slice(0, -1).split(",");
      const nl = {
        expense: tokens[0],
        category: tokens[1],
      };
      console.log(nl);
      lines.push(nl);
    }

    if (buffer.includes("```csv\n")) {
      csvStarted = true;
    }

    if (isLineEnd) {
      buffer = "";
    }

    // process.stdout.write(detla || "");
  }

  // console.log({ lines });
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
  return `Please categorize these expenses from the provided options. 
  
Respond in a csv format with the expense as the first column, and category as the second.
Following are the expenses:
\`\`\`csv
${expenses.join(",")}
\`\`\`

Following are the available categories to select from:
\`\`\`csv
${categories.join(",")}
\`\`\`
`;
}

main();
