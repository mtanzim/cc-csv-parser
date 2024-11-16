import { SubmitButton } from "@/components/submit-btn";

type Props = {
  formAction: (p: FormData) => void;
};

export const FileForm = ({ formAction }: Props) => {
  return (
    <form className="flex flex-col w-96 gap-4" action={formAction}>
      <h1 className="text-xl">Upload a csv</h1>

      <div className="border border-white p-4">
        <input
          type="file"
          name="cc-stmt"
          placeholder="upload csv here"
          accept=".csv"
          multiple
        ></input>
      </div>
      <SubmitButton />
    </form>
  );
};
