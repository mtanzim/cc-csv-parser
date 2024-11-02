"use server";
import { parse } from "@std/csv";
import { format, formatDate, isAfter, isBefore } from "date-fns";
import { z } from "zod";

const rowSchema = z.object({
  date: z.date(),
  description: z.string(),
  category: z.string().optional(),
  debit: z.number(),
  credit: z.number(),
});
export type Row = Omit<z.infer<typeof rowSchema>, "date"> & { date: string };

const dateFormat = "MM/dd/yyyy";
const dateFormatIn = "yyyy-MM-dd";
const maxDate = new Date("3000");
const minDate = new Date("1900");

export type ReturnType = {
  data: Row[];
  start: string;
  end: string;
};

export async function parseCsv(
  _prevState: unknown,
  formData: FormData
): Promise<ReturnType> {
  const file = formData.get("cc-stmt") as File;
  if (!file || file.size === 0) {
    throw new Error("No file provided");
  }
  // const expenseColumnRaw = formData.get("expense-column");
  // const expenseColumn = z.enum(["debit", "credit"]).parse(expenseColumnRaw);

  if (!file) {
    throw new Error("No file provided");
  }

  const decoder = new TextDecoder("utf-8");
  const text = await decoder.decode(await file.arrayBuffer());
  const data = parse(text, {
    columns: ["date", "description", "debit", "credit", "balance"],
    skipFirstRow: false,
    strip: true,
  });
  const cleaned = data
    .map((row) => {
      return {
        ...row,
        debit: parseFloat(row.debit),
        credit: parseFloat(row.debit),
        date: new Date(row.date),
      };
    })
    .filter((row) => {
      const r = rowSchema.safeParse(row);
      if (r.success) {
        return true;
      }
      console.log("Invalid row", row);
      console.log("error", r.error);
      return false;
    })
    .map((r) => {
      return rowSchema.parse(r);
    });

  // categorize
  const descriptionValues = [...new Set(cleaned.map((row) => row.description))];
  console.log({ descriptionValues });
  const mockRes = exampleResponse;
  const parsedMockRes = openAIresponseArraySchema.parse(mockRes);
  const mapped = new Map<string, string>();
  parsedMockRes.forEach((row) => {
    mapped.set(row.description, row.category);
  });
  const categorized = cleaned.map((row) => {
    return {
      ...row,
      category: mapped.get(row.description) || "",
    };
  });

  const startDateOfData = cleaned.reduce((acc, row) => {
    if (isBefore(row.date, acc)) {
      return new Date(row.date);
    }
    return acc;
  }, maxDate);
  const endDateOfData = cleaned.reduce((acc, row) => {
    if (isAfter(row.date, acc)) {
      return new Date(row.date);
    }
    return acc;
  }, minDate);

  return {
    data: categorized.map((row) => ({
      ...row,
      date: formatDate(row.date, dateFormat),
    })),
    start: format(startDateOfData, dateFormatIn),
    end: format(endDateOfData, dateFormatIn),
  };
}

const openAIresponseSchema = z.object({
  description: z.string(),
  category: z.string(),
});
const openAIresponseArraySchema = z.array(openAIresponseSchema);

const exampleResponse: z.infer<typeof openAIresponseArraySchema> = [
  { description: "SECOND CUP 9578", category: "Food & Drink" },
  { description: "WWW.MEUI.CA", category: "Retail" },
  { description: "SQ *WUBAEATS", category: "Food & Drink" },
  { description: "SHOPPERS DRUG MART #08", category: "Pharmacy" },
  { description: "SQ *BRETT'S", category: "Food & Drink" },
  { description: "BAM*HUNGERHUB", category: "Food & Drink" },
  { description: "TIM HORTONS #4365", category: "Food & Drink" },
  { description: "UBER CANADA/UBERTRIP", category: "Transportation" },
  { description: "GARDENVIEW-PETVIEW", category: "Pet Care" },
  { description: "SQ *NEO COFFEE BAR", category: "Food & Drink" },
  { description: "PAYPAL *PLAYSTATION", category: "Entertainment" },
  { description: "FARM BOY #29", category: "Groceries" },
  { description: "TIM HORTONS #5840", category: "Food & Drink" },
  { description: "SONNET INSURANCE COMPANY", category: "Insurance" },
  { description: "BEANFIELD TECHNOLOGIES", category: "Utilities" },
  { description: "DE MELLO ONLINE INC.", category: "Food & Drink" },
  { description: "RABBA FINE FOODS #191", category: "Groceries" },
  { description: "PREAUTHORIZED PAYMENT", category: "General Expenses" },
  { description: "HUDSON STO1564", category: "Retail" },
  { description: "GOOGLE *CLOUD GBDM9N", category: "Tech Services" },
  { description: "TIM HORTONS #0488", category: "Food & Drink" },
  { description: "CABIN COFFEE", category: "Food & Drink" },
  { description: "Spotify P2F02356B7", category: "Entertainment" },
  { description: "THE WOODEN MONKEY DARTMOU", category: "Food & Drink" },
  { description: "TIM HORTONS #1742", category: "Food & Drink" },
  { description: "PANE E CIRCO DOYLE", category: "Food & Drink" },
  { description: "MARTHAS PIZZA II HALIFAX", category: "Food & Drink" },
  { description: "Wired Monk", category: "Food & Drink" },
  { description: "LAWTONS #114", category: "Pharmacy" },
  { description: "HERTZ RENT A CAR", category: "Transportation" },
  { description: "PHO MANIAC", category: "Food & Drink" },
  { description: "CIRCLE K/IRVING #2094", category: "Gas & Convenience" },
  { description: "FISH LAND INN", category: "Accommodation" },
  { description: "BUOY & ARROW", category: "Food & Drink" },
  { description: "GROS MORNE CRAFTS", category: "Retail" },
  { description: "FISHERMANS LANDING LTD", category: "Retail" },
  { description: "IRVING STATION #37215", category: "Gas & Convenience" },
  { description: "AIRALO", category: "Tech Services" },
  { description: "BONTOURS WBP", category: "Travel & Tourism" },
  { description: "PN GROS MORNE NP-VRC", category: "Travel & Tourism" },
  { description: "JAVA JACKS RESTAURANT AND", category: "Food & Drink" },
  { description: "SQ *SUNSET GIFT SHOPPE", category: "Retail" },
  { description: "DEER LAKE BIG STOP", category: "Food & Drink" },
  { description: "SCOTLAND YARD", category: "Food & Drink" },
  { description: "OH MY GYRO", category: "Food & Drink" },
  { description: "RANDYS ROTI & DOUBLES", category: "Food & Drink" },
  { description: "Amazon.ca Prime Member", category: "Retail" },
  { description: "JAPADOG", category: "Food & Drink" },
  { description: "ICHA TEA", category: "Food & Drink" },
  { description: "SAIGON LOTUS", category: "Food & Drink" },
  { description: "FIDO Mobile ******2993", category: "Utilities" },
  { description: "FUBO", category: "Entertainment" },
  { description: "MCDONALD'S #8728   Q04", category: "Food & Drink" },
  { description: "SQ *THE LIBRARY SPECIALTY", category: "Retail" },
  { description: "AIR CAN*    0142102524424", category: "Travel" },
];

const makePrompt = (descriptions: string[]) => `
Please categorize these expenses, respond in a json array consisting of objects with the titles: \`description\` and \`category\`:
\`\`\`json
${JSON.stringify(descriptions, null, 2)}
\`\`\`
`;
