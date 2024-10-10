"use client";
import { parseCsv, ReturnType } from "@/app/actions/parse";
import { useFormState } from "react-dom";
import { SubmitButton } from "./fonts/(components)/submit-btn";

const initialState: ReturnType = {
  data: [],
};

export default function Home() {
  const [state, formAction] = useFormState<ReturnType, FormData>(
    parseCsv,
    initialState
  );
  return (
    <div className="m-16">
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
      <div className="mt-8">
        <table>
          <thead>
            <tr>
              {Object.keys(state?.data?.[0] || []).map((key) => (
                <th key={key}>{key}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {state.data.map((row) => (
              <tr key={row.date}>
                {Object.values(row).map((value) => (
                  <td key={value}>{Number.isNaN(value) ? "" : value}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
