import { SubmitButton } from "./fonts/(components)/submit-btn";
import { parse, stringify } from "@std/csv";

export default function Home() {
  async function parseCsv(formData: FormData) {
    "use server";
    const file = formData.get("cc-stmt") as File;

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
    return data;
  }

  return (
    <div>
      <h1>Upload a csv</h1>
      <form action={parseCsv}>
        <input
          type="file"
          name="cc-stmt"
          placeholder="upload csv here"
          accept=".csv"
        ></input>
        <SubmitButton />
      </form>
    </div>
  );
}
