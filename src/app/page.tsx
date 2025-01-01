"use client";
import {
  wrappedParseCsv as parseCsv,
  ReturnType,
  Row,
} from "@/app/actions/parse";
import { Chart } from "@/components/Chart";
import { ExpenseTable } from "@/components/ExpenseTable";
import { FileForm } from "@/components/FileForm";
import { Navbar } from "@/components/Nav";
import {
  categories,
  columns,
  exportToSpreadsheet,
  makeChartData,
  UNCATEGORIZED,
} from "@/ui-lib/utils";
import {
  ColumnDef,
  ColumnFiltersState,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  RowData,
  useReactTable,
} from "@tanstack/react-table";
import { addMonths, formatDate } from "date-fns";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { z } from "zod";
import { CategorizeArgs, PatchCategoryArg } from "./api/categorize/route";
import { ExportArgs } from "./api/export/route";
import { PersistArgs } from "./api/persist/route";
const initialState: ReturnType = {
  data: [],
  start: "",
  end: "",
};

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData extends RowData> {
    updateData: (rowIndex: number, columnId: string, value: unknown) => void;
    removeRow: (rowIndex: number) => void;
  }
}

const upsetExpenseCategory = (patchArg: PatchCategoryArg) => {
  return fetch("/api/categorize", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(patchArg),
  })
    .then((res) => res.text())
    .then(console.log)
    .catch(console.error);
};
const lineSchema = z.object({
  id: z.number(),
  category: z.string(),
});
const defaultColumn: Partial<ColumnDef<Row>> = {
  cell: ({ getValue, row, column: { id }, table }) => {
    const initialValue = getValue();
    // We need to keep and update the state of the cell normally
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [value, setValue] = useState(initialValue);

    // When the input is blurred, we'll call our table meta's updateData function
    const onBlur = () => {
      const category = value;
      const expense = row.getValue("description");
      if (
        typeof category === "string" &&
        category &&
        category !== UNCATEGORIZED &&
        typeof expense === "string" &&
        expense
      ) {
        upsetExpenseCategory({
          category,
          expense,
          validCategories: categories,
        });
      }
      table.options.meta?.updateData(row.index, id, value);
    };

    // If the initialValue is changed external, sync it up with our state
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      setValue(initialValue);
    }, [initialValue]);

    return (
      <select
        value={value as string}
        onChange={(e) => setValue(e.target.value)}
        onBlur={onBlur}
      >
        <option value={UNCATEGORIZED}>Select a category</option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
    );
  },
};

export default function Home() {
  const [state, formAction] = useFormState<ReturnType, FormData>(
    parseCsv,
    initialState
  );
  const router = useRouter();
  const [data, setData] = useState<Row[]>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submitErrMsg, setSubmitErrMsg] = useState<null | string>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    fetch("api/auth-ping")
      .then((res) => {
        if (res.ok) {
          setIsAuthenticated(true);
          return;
        }
        setIsAuthenticated(false);
      })
      .finally(() => setIsAuthLoading(false));
  }, [isBusy]);

  const resetData = () => {
    setData([]);
    setSubmitErrMsg(null);
    setHasSubmitted(false);
  };

  useEffect(() => {
    if ((state?.data?.length || 0) > 0) {
      setData(state?.data || []);
      setSubmitErrMsg(null);
      setHasSubmitted(true);
    }
    if (state.errorMsg) {
      setSubmitErrMsg(state.errorMsg);
    }
  }, [state]);

  const autoCategorizeWithLoader = async () => {
    setIsBusy(true);
    try {
      await autoCategorize();
    } finally {
      setIsBusy(false);
    }
  };

  const persitMonthData = async () => {
    setIsBusy(true);
    const exportBody: PersistArgs = {
      month: currentMonth,
      expenses: table.getFilteredRowModel().rows.map((r) => {
        return {
          id: r.id,
          category: r.getValue("category"),
          name: r.getValue("description"),
          date: r.getValue("date"),
          expense: r.getValue("debit"),
        };
      }),
    };
    try {
      const res = await fetch("/api/persist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(exportBody),
      });
      if (!res.ok) {
        console.error(await res.text());
        return;
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error(err.message);
      } else {
        console.error("Something went wrong");
      }
    } finally {
      setIsBusy(false);
    }
  };
  const exportFilteredTable = async () => {
    setIsBusy(true);

    const exportBody: ExportArgs = {
      expenses: table.getFilteredRowModel().rows.map((r) => {
        return {
          id: r.id,
          category: r.getValue("category"),
          name: r.getValue("description"),
          date: r.getValue("date"),
          expense: r.getValue("debit"),
        };
      }),
    };

    try {
      await exportToSpreadsheet(exportBody);
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error(err.message);
      } else {
        console.error("Something went wrong");
      }
    } finally {
      setIsBusy(false);
    }
  };

  const autoCategorize = async () => {
    const body: CategorizeArgs = {
      expenses: data.map((d, idx) => ({
        id: idx,
        name: d.description,
      })),
      categories,
    };
    const res = await fetch("/api/categorize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.body) return;

    // To decode incoming data as a string
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }
      if (value) {
        const lines = value.split("\n\n").filter(Boolean);
        for (const l of lines) {
          console.log(l);
          const lData = l.replace("data:", "").trimEnd();
          try {
            const jsonData = JSON.parse(lData);
            const validLdata = lineSchema.parse(jsonData);
            const { id, category } = validLdata;
            setData((cur) =>
              cur.map((v, idx) =>
                idx === id ? { ...v, category: category } : v
              )
            );
          } catch (err) {
            console.error(err);
            console.log({ value, lData });
          }
        }
      }
    }
  };

  const table = useReactTable({
    data,
    columns,
    defaultColumn,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(), //client-side sorting
    getFilteredRowModel: getFilteredRowModel(), //client side filtering
    // onSortingChange: setSorting, //optionally control sorting state in your own scope for easy access
    filterFns: {},
    state: {
      columnFilters,
    },
    onColumnFiltersChange: setColumnFilters,

    meta: {
      removeRow: (rowIndex: number) => {
        if (isBusy) {
          return;
        }
        setData((old) => old.filter((_row, index) => index !== rowIndex));
      },
      updateData: (rowIndex, columnId, value) => {
        if (isBusy) {
          return;
        }
        setData((old) =>
          old.map((row, index) => {
            if (index === rowIndex) {
              return {
                ...old[rowIndex]!,
                [columnId]: value,
              };
            }
            return row;
          })
        );
      },
    },
  });

  const [monthOffset, setMonthOffset] = useState(0);
  const [isMonthFilterOn, setMonthFilterOn] = useState(false);
  const currentMonth = formatDate(
    addMonths(new Date(), monthOffset),
    "MM-yyyy"
  );

  useEffect(() => {
    if (isMonthFilterOn) {
      const filterMonthDate = addMonths(new Date(), monthOffset);
      table.getColumn("date")?.setFilterValue(filterMonthDate);
    } else {
      table.getColumn("date")?.setFilterValue(undefined);
    }
    console.log(); //get filtered client-side selected rows
  }, [isMonthFilterOn, monthOffset, table]);

  if (isAuthLoading) {
    return (
      <div className="m-16 flex flex-row gap-12 max-h-fit">
        <p className="animate-pulse text-2xl">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="m-16 flex flex-row gap-12 max-h-fit">
        <button
          className="btn btn-primary"
          onClick={() => router.push("/login")}
        >
          Please log in
        </button>
      </div>
    );
  }

  const onLogout = () => {
    fetch("api/logout").then((res) => {
      if (res.ok) {
        setIsAuthenticated(false);
      }
    });
  };

  return (
    <div>
      <Navbar onLogout={onLogout} />
      <div className="m-16 flex flex-row gap-12 max-h-fit">
        <div>
          {!hasSubmitted && <FileForm formAction={formAction} />}
          {submitErrMsg ?? (
            <p className="text-lg text-red-400">{submitErrMsg}</p>
          )}
        </div>
        {hasSubmitted && (
          <div className="flex gap-24 justify-center max-h-[1100px]">
            <div className="w-1/3 h-full max-h-screen overflow-y-auto">
              <h1 className="text text-xl mb-2">Expenses</h1>
              <div className="flex gap-2">
                <button
                  disabled={isBusy}
                  className="btn btn-primary"
                  onClick={resetData}
                >
                  New files
                </button>
                <button
                  disabled={isBusy}
                  className="btn btn-secondary"
                  onClick={autoCategorizeWithLoader}
                >
                  {isBusy && <span className="loading loading-spinner"></span>}
                  Categorize with AI
                </button>
                <button
                  disabled={isBusy || !isMonthFilterOn}
                  className="btn btn-info"
                  onClick={exportFilteredTable}
                >
                  {isBusy && <span className="loading loading-spinner"></span>}
                  Export filtered table
                </button>
                <button
                  disabled={isBusy || !isMonthFilterOn}
                  className="btn btn-accent"
                  onClick={persitMonthData}
                >
                  {isBusy && <span className="loading loading-spinner"></span>}
                  {"Persist Month's Data"}
                </button>
              </div>
              <div className="mt-8">
                <div className="flex gap-4">
                  <button
                    onClick={() => setMonthOffset(0)}
                    className="btn btn-sm"
                  >
                    {currentMonth}
                  </button>
                  <button
                    className="btn btn-sm"
                    onClick={() => setMonthOffset((prev) => prev + 1)}
                  >
                    Up
                  </button>
                  <button
                    className="btn btn-sm"
                    onClick={() => setMonthOffset((prev) => prev - 1)}
                  >
                    Down
                  </button>
                  <input
                    disabled={isBusy}
                    type="checkbox"
                    className="toggle toggle-lg"
                    onChange={() => setMonthFilterOn((prev) => !prev)}
                    defaultChecked={isMonthFilterOn}
                  />
                </div>
              </div>

              <ExpenseTable table={table} isBusy={isBusy} />
            </div>
            <div className="w-2/3">
              <Chart
                title="Expenses pareto"
                isLoading={isBusy}
                subtitle=""
                data={makeChartData(
                  table.getFilteredRowModel().rows.map((r) => r.original) || [],
                  "debit"
                )}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
