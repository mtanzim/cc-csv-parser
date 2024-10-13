"use client";

"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="butto" type="submit" disabled={pending}>
      Add
    </button>
  );
}
