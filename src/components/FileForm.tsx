import { BankNames } from "@/app/actions/parse";
import { SubmitButton } from "@/components/submit-btn";
import { Fragment, useEffect, useState } from "react";

type Props = {
  formAction: (p: FormData) => void;
};

const bankNames: BankNames[] = ["TD", "Wealthsimple", "Wise", "Scotia"];
export const FileForm = ({ formAction }: Props) => {
  const [files, setFiles] = useState<File[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMultipleChange = (event: any) => {
    setFiles([...event.target.files]);
  };

  useEffect(() => {
    console.log(files);
  }, [files]);
  return (
    <form className="flex flex-col w-full max-w-full sm:max-w-4xl gap-4 px-4 sm:px-0" action={formAction}>
      <h1 className="text-xl">Upload a csv</h1>
      <div className="p-4">
        <input
          type="file"
          name="cc-stmt"
          placeholder="Upload csvs here"
          accept=".csv"
          multiple
          onChange={handleMultipleChange}
          className="w-full"
        ></input>
        <div className="flex flex-col mx-0 my-6 gap-4 sm:mx-4">
          {files.map((f) => {
            const splitFieldName = `${f.name}-split`;
            return (
              <Fragment key={f.name}>
                <div className="flex flex-col gap-3 rounded border border-neutral-700 bg-slate-950/80 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="min-w-0 break-words text-sm font-medium text-slate-100 sm:max-w-[40%]">
                    {f?.name}
                  </span>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end w-full">
                    <select
                      defaultValue={bankNames[0]}
                      name={f.name}
                      id={f.name}
                      className="select select-bordered w-full sm:w-40"
                    >
                      {bankNames.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-2">
                      <label htmlFor={splitFieldName} className="text-sm">
                        Split expense or income by
                      </label>
                      <input
                        id={splitFieldName}
                        name={splitFieldName}
                        type="number"
                        min="1"
                        max="9"
                        step="1"
                        defaultValue={1}
                        className="w-20 rounded border p-2"
                      />
                    </div>
                  </div>
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>
      <SubmitButton />
    </form>
  );
};
