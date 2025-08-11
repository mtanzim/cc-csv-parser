"use client";
import {
  wrappedParseCsv as parseCsv,
  ReturnType,
  Row,
} from "@/app/actions/parse";
import { Chart } from "@/components/Chart";
import { ExpenseTable } from "@/components/ExpenseTable";
import { FileForm } from "@/components/FileForm";
import { columns, exportToSpreadsheet, makeChartData } from "@/ui-lib/utils";
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
import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { z } from "zod";
import { CategorizeArgs, PatchCategoryArg } from "./api/categorize/route";
import { ExportArgs } from "./api/export/route";
import { PersistArgs } from "./api/persist/route";
import { ExpensePieChart } from "@/components/PieChart";
import { CategoryFilter } from "@/components/CategoryFilter";
const initialState: ReturnType = {
  data: [],
  start: "",
  end: "",
  errCount: 0,
  errors: [],
};

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData extends RowData> {
    updateData: (rowIndex: number, columnId: string, value: unknown) => void;
    removeRow: (rowIndex: number) => void;
    addRow: (row: Row) => void;
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

export default function InnerPage({
  categories,
  uncategorized: UNCATEGORIZED,
}: {
  categories: string[];
  uncategorized: string;
}) {
  const [state, formAction] = useFormState<ReturnType, FormData>(
    parseCsv,
    initialState,
  );
  const [data, setData] = useState<Row[]>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submitErrMsg, setSubmitErrMsg] = useState<null | string>(null);
  const [isPie, setPie] = useState(false);
  const [categoryValueFilters, setCategoryValueFilters] = useState<string[]>(
    [],
  );

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

  const persistMonthData = async () => {
    setIsBusy(true);
    const exportBody: PersistArgs = {
      month: currentMonth,
      expenses: table.getFilteredRowModel().rows.map((r) => {
        return {
          id: r.id,
          category: r.getValue("category"),
          name: r.getValue("description"),
          date: r.getValue("date"),
          expense: r.getValue("expense"),
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
          expense: r.getValue("expense"),
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
      expenses: data
        // only ask to categorize what doesn't have a category
        // and is a valid expense
        .filter((d) => d.category === UNCATEGORIZED && d.expense > 0)
        .map((d, idx) => ({
          id: idx,
          name: d.description,
        })),
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
                idx === id ? { ...v, category: category } : v,
              ),
            );
          } catch (err) {
            console.error(err);
            console.log({ value, lData });
          }
        }
      }
    }
  };

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
      addRow: (row: Row) => {
        setData((old) => [...old, row]);
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
          }),
        );
      },
    },
  });

  const [monthOffset, setMonthOffset] = useState(0);
  const [isMonthFilterOn, setMonthFilterOn] = useState(false);
  const currentMonth = formatDate(
    addMonths(new Date(), monthOffset),
    "MM-yyyy",
  );

  useEffect(() => {
    if (isMonthFilterOn) {
      const filterMonthDate = addMonths(new Date(), monthOffset);
      table.getColumn("date")?.setFilterValue(filterMonthDate);
    } else {
      table.getColumn("date")?.setFilterValue(undefined);
    }
  }, [isMonthFilterOn, monthOffset, table]);

  useEffect(() => {
    if (categoryValueFilters.length > 0) {
      table
        .getColumn("category")
        ?.setFilterValue(
          categoryValueFilters.length > 0 ? categoryValueFilters : [],
        );
    } else {
      table.getColumn("category")?.setFilterValue([]);
    }
  }, [categoryValueFilters, table]);

  return (
    <div>
      <div>
        {!hasSubmitted && <FileForm formAction={formAction} />}
        {submitErrMsg ?? <p className="text-lg text-red-400">{submitErrMsg}</p>}
      </div>
      {hasSubmitted && (
        <div className="2xl:flex gap-24 justify-center max-h-[968px]">
          <div className="2xl:w-1/3 overflow-auto overflow-x-hidden min-w-[800px]">
            <h1 className="text text-xl mb-2">Expenses</h1>
            {state.errCount > 0 ? (
              <div className="collapse collapse-plus">
                <input type="checkbox" />
                <div className="collapse-title font-medium">
                  {state.errCount} parsing error(s)
                </div>
                <div className="collapse-content">
                  <div className="flex flex-col gap-2 mt-2 mb-2">
                    {(state?.errors || []).map((err) => (
                      <p className="text-sm" key={err}>
                        {err}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
            <div className="flex flex-col gap-2 mt-2 mb-2"></div>
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
                onClick={persistMonthData}
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
            <CategoryFilter
              categoryValueFilters={categoryValueFilters}
              categories={categories}
              setCategoryValueFilters={(v) => setCategoryValueFilters(v)}
            />
            <ExpenseTable allowEdits={true} table={table} isBusy={isBusy} />
          </div>
          <div className="2xl:w-2/3">
            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="text-xl">Change chart type</span>
                <input
                  type="checkbox"
                  className="toggle toggle-xl"
                  checked={isPie}
                  onChange={() => setPie((c) => !c)}
                />
              </label>
            </div>
            {!isPie ? (
              <Chart
                title="Expenses pareto"
                isLoading={isBusy}
                subtitle=""
                data={makeChartData(
                  table.getFilteredRowModel().rows.map((r) => r.original) || [],
                  "expense",
                )}
              />
            ) : (
              <ExpensePieChart
                title="Expenses pie chart"
                isLoading={isBusy}
                subtitle=""
                data={makeChartData(
                  table.getFilteredRowModel().rows.map((r) => r.original) || [],
                  "expense",
                )}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
