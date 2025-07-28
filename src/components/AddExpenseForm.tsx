import { Row } from "@/app/actions/parse";
import {
  categories,
  dateFormatISO,
  dateFormatOut,
  eachExpenseSchema,
  UNCATEGORIZED,
} from "@/lib/schemas";
import { flexRender, Table as TableType } from "@tanstack/react-table";
import { formatDate } from "date-fns";
import { useState } from "react";

type Props = {
  table: TableType<Row>;
  isBusy: boolean;
};

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export const AddExpenseForm = ({ table, isBusy }: Props) => {
  const headerVals = table
    .getHeaderGroups()
    .map((hg) => hg.headers)
    .flat();
  const maxDateStr = formatDate(new Date(), dateFormatISO);
  const initValues: Row = {
    date: maxDateStr,
    category: UNCATEGORIZED,
    description: "",
    expense: 0,
    income: 0,
  };
  const [formData, setFormData] = useState<Row>(initValues);

  const [errMsg, setErrMsg] = useState<string | null>(null);
  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setFormData({ ...formData, [name]: value });
  };
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const exp = eachExpenseSchema.safeParse({
      ...formData,
      date: parseLocalDate(formData.date),
      name: formData?.description,
      expense: Number(formData.expense),
      id: window.crypto.randomUUID(),
    });
    if (!exp.success) {
      const friendlyMsg = exp.error.issues
        .map((issue) => issue.message)
        .join(", ");
      setErrMsg(friendlyMsg);
      return;
    }
    const row: Row = {
      date: formatDate(exp.data.date, dateFormatOut),
      category: exp.data.category,
      description: exp.data.name,
      expense: exp.data.expense,
      income: 0,
    };
    table?.options.meta?.addRow(row);
    setErrMsg(null);
    setFormData(initValues);
  };

  const getInputType = (hid: string) => {
    if (hid.toLowerCase() === "date") {
      return (
        <input
          onChange={handleInputChange}
          name={hid}
          value={formData.date}
          className="input input-bordered"
          type="date"
          max={maxDateStr}
        />
      );
    }
    if (hid.toLowerCase() === "expense") {
      return (
        <input
          onChange={handleInputChange}
          value={formData.expense}
          name={hid}
          className="input input-bordered"
          type="number"
          min="0.00"
          max="10000.00"
          step="0.01"
        />
      );
    }
    if (hid.toLowerCase() === "category") {
      return (
        <select
          value={formData.category}
          name={hid}
          className="select select-bordered"
          onChange={handleInputChange}
        >
          {[...categories, UNCATEGORIZED].map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        onChange={handleInputChange}
        value={formData?.[hid as keyof Row]}
        name={hid}
        className="input input-bordered"
        type="text"
      />
    );
  };

  return (
    <>
      {errMsg && (
        <div className="alert alert-error mb-2">
          <span>{errMsg}</span>
        </div>
      )}
      <form className="flex flex-col gap-2 mt-4 mb-4" onSubmit={handleSubmit}>
        {headerVals.map((h) => {
          return (
            <label key={h.id} className="flex flex-col">
              <span className="font-semibold mb-1">
                {flexRender(h.column.columnDef.header, h.getContext())}
              </span>
              {getInputType(h.id)}
            </label>
          );
        })}
        <button
          type="submit"
          disabled={isBusy}
          className="btn btn-primary mt-2"
        >
          Add
        </button>
      </form>
    </>
  );
};
