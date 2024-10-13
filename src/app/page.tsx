"use client";
import { parseCsv, ReturnType } from "@/app/actions/parse";
import { useFormState } from "react-dom";
import { SubmitButton } from "./fonts/(components)/submit-btn";

const initialState: ReturnType = {
  data: [],
  start: "",
  end: "",
};

export default function Home() {
  const [state, formAction] = useFormState<ReturnType, FormData>(
    parseCsv,
    initialState
  );
  const data = state?.data || [];
  const headers: string[] = Object.keys(state?.data?.[0] || []);

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
        <p>Start: {state.start}</p>
        <p>End: {state.end}</p>
        <table className="table-auto border-separate border-spacing-2 ">
          <thead>
            <tr>
              {headers.map((key) => (
                <th key={key}>{key}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.date}>
                {Object.entries(row).map(([k, v]) => (
                  <td key={k}>{v}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
