import { BankNames } from "@/app/actions/parse";
import { SubmitButton } from "@/components/submit-btn";
import { Fragment, useEffect, useState } from "react";

type Props = {
  formAction: (p: FormData) => void;
};

const bankNames: BankNames[] = ["TD", "Wealthsimple"];
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
    <form className="flex flex-col w-96 gap-4" action={formAction}>
      <h1 className="text-xl">Upload a csv</h1>
      <div className="p-4">
        <input
          type="file"
          name="cc-stmt"
          placeholder="Upload csvs here"
          accept=".csv"
          multiple
          onChange={handleMultipleChange}
        ></input>
        <div className="flex flex-col m-2 gap-4">
          {files.map((f) => {
            return (
              <Fragment key={f.name}>
                <label htmlFor={f.name}>{f?.name}</label>
                <select defaultValue={bankNames[0]} name={f.name} id={f.name}>
                  {bankNames.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </Fragment>
            );
          })}
        </div>
      </div>
      <SubmitButton />
    </form>
  );
};
