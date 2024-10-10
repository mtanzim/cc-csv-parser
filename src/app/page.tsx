"use client";
import { parseCsv } from "@/app/actions/parse";
import { useFormState } from "react-dom";
import { SubmitButton } from "./fonts/(components)/submit-btn";

const initialState = {
  data: [],
};

export default function Home() {
  const [state, formAction] = useFormState(parseCsv, initialState);
  return (
    <div>
      <h1>Upload a csv</h1>
      <form action={formAction}>
        <input
          type="file"
          name="cc-stmt"
          placeholder="upload csv here"
          accept=".csv"
        ></input>
        <SubmitButton />
      </form>
      <div>
        {state.data.map((row) => (
          <p key={row.date}> {JSON.stringify(row)}</p>
        ))}
      </div>
    </div>
  );
}
