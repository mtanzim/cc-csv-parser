"use client";
import {
  wrappedParseCsv as parseCsv,
  ReturnType,
  Row,
} from "@/app/actions/parse";
import { Chart, type ChartData } from "@/components/Chart";
import { FileForm } from "@/components/FileForm";
import {
  ColumnDef,
  ColumnFiltersState,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  RowData,
  useReactTable,
} from "@tanstack/react-table";
import { addMonths, formatDate, isSameMonth } from "date-fns";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { z } from "zod";
import { CategorizeArgs, PatchCategoryArg } from "./api/categorize/route";
import { ExportArgs } from "./api/export/route";
import { useRouter } from "next/navigation";
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

const UNCATEGORIZED = "Uncategorized";
const categories = [
  ...new Set([
    "Fees",
    "Flights",
    "Eating Out",
    "Gift",
    "Travel",
    "Household",
    "Communication",
    "Entertainment",
    "Groceries",
    "Apparel",
    "Transportation",
    "Culture",
    "Education",
    "Health",
  ]),
];

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

// Give our default column cell renderer editing superpowers!
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

const columnHelper = createColumnHelper<Row>();
const columns = [
  columnHelper.accessor("date", {
    header: () => "Date",
    cell: (info) => info.getValue(),
    filterFn: (row, columnId, filterMonthDate) => {
      if (filterMonthDate === undefined) {
        return true;
      }
      const rowDate = new Date(row.getValue(columnId));
      return isSameMonth(rowDate, filterMonthDate);
    },
  }),
  columnHelper.accessor("description", {
    header: () => "Description",
    cell: (info) => info.renderValue(),
    footer: () => "Total",
  }),
  columnHelper.accessor("category", {
    header: () => "Category",
  }),
  columnHelper.accessor("credit", {
    header: "Credit",
    cell: (info) => info.renderValue(),
    footer: ({ table, column }) =>
      table
        .getFilteredRowModel()
        .rows.reduce(
          (total, row) => total + row.getValue<Row["credit"]>(column.id),
          0
        )
        ?.toFixed(2),
  }),
  columnHelper.accessor("debit", {
    header: "Debit",
    cell: (info) => info.renderValue(),
    footer: ({ table, column }) =>
      table
        .getFilteredRowModel()
        .rows.reduce(
          (total, row) => total + row.getValue<Row["debit"]>(column.id),
          0
        )
        ?.toFixed(2),
  }),
];

const lineSchema = z.object({
  id: z.number(),
  category: z.string(),
});

const makeChartData = (curData: Row[], attrName: keyof Row): ChartData => {
  const chartDataPrep: Record<string, number> = curData.reduce((acc, cur) => {
    const category = cur?.category || UNCATEGORIZED;
    const _expense = Number(cur?.[attrName] || 0);
    const expense = isNaN(_expense) ? 0 : _expense;
    if (acc?.[category] === undefined) {
      acc[category] = expense;
      return acc;
    }
    acc[category] = acc[category] + expense;
    return acc;
  }, {} as Record<string, number>);
  return Object.entries(chartDataPrep)
    .map((cur) => {
      const [k, v] = cur;
      return { category: k, total: v };
    })
    .toSorted((a, b) => b.total - a.total)
    .filter((r) => r.total > 0);
};

export default function Home() {
  const [state, formAction] = useFormState<ReturnType, FormData>(
    parseCsv,
    initialState
  );
  const router = useRouter();
  const [data, setData] = useState<Row[]>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [isAIRunning, setAIRunning] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submitErrMsg, setSubmitErrMsg] = useState<null | string>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    fetch("api/auth-ping")
      .then((res) => {
        if (res.ok) {
          setIsAuthenticated(true);
        }
      })
      .finally(() => setIsAuthLoading(false));
  }, []);

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
    setAIRunning(true);
    try {
      await autoCategorize();
    } finally {
      setAIRunning(false);
    }
  };

  const exportFilteredTable = async () => {
    setAIRunning(true);

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
      const res = await fetch("/api/export", {
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
      const blob = await res.blob();
      const filename =
        res?.headers?.get?.("Content-Disposition")?.split("filename=")?.[1] ||
        '"export.tsv"';

      console.log({ filename });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a); // append the element to the dom
      a.click();
      a.remove(); // afterwards, remove the element
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error(err.message);
      } else {
        console.error("Something went wrong");
      }
    } finally {
      setAIRunning(false);
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
        if (isAIRunning) {
          return;
        }
        setData((old) => old.filter((_row, index) => index !== rowIndex));
      },
      updateData: (rowIndex, columnId, value) => {
        if (isAIRunning) {
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

  return (
    <div className="m-16 flex flex-row gap-12 max-h-fit">
      <div>
        {!hasSubmitted && <FileForm formAction={formAction} />}
        {submitErrMsg ?? <p className="text-lg text-red-400">{submitErrMsg}</p>}
      </div>
      {hasSubmitted && (
        <div className="flex gap-24 justify-center max-h-[1100px]">
          <div className="w-1/3 h-full max-h-screen overflow-y-auto">
            <h1 className="text text-xl mb-2">Expenses</h1>
            <div className="flex gap-2">
              <button
                disabled={isAIRunning}
                className="btn btn-primary"
                onClick={resetData}
              >
                New files
              </button>
              <button
                disabled={isAIRunning}
                className="btn btn-secondary"
                onClick={autoCategorizeWithLoader}
              >
                {isAIRunning && (
                  <span className="loading loading-spinner"></span>
                )}
                Categorize with AI
              </button>
              <button
                disabled={isAIRunning}
                className="btn btn-info"
                onClick={exportFilteredTable}
              >
                {isAIRunning && (
                  <span className="loading loading-spinner"></span>
                )}
                Export filtered table
              </button>
            </div>
            <div className="mt-8">
              <div className="flex gap-4">
                <button
                  onClick={() => setMonthOffset(0)}
                  className="btn btn-sm"
                >
                  {formatDate(addMonths(new Date(), monthOffset), "MMM yyyy")}
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
                  disabled={isAIRunning}
                  type="checkbox"
                  className="toggle toggle-lg"
                  onChange={() => setMonthFilterOn((prev) => !prev)}
                  defaultChecked={isMonthFilterOn}
                />
              </div>
            </div>
            {/* <p className="text badge badge-info mt-4 mb-4">
              {state.start} to {state.end}
            </p> */}
            <table className="mt-8 table-auto border-separate border-spacing-2 ">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        onClick={header.column.getToggleSortingHandler()}
                        className="cursor-pointer select-none"
                        title={
                          header.column.getCanSort()
                            ? header.column.getNextSortingOrder() === "asc"
                              ? "Sort ascending"
                              : header.column.getNextSortingOrder() === "desc"
                              ? "Sort descending"
                              : "Clear sort"
                            : undefined
                        }
                      >
                        <div className="flex items-center gap-2">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {{
                            asc: <ArrowUp />,
                            desc: <ArrowDown />,
                          }[header.column.getIsSorted() as string] ?? (
                            <ArrowUp className="invisible" />
                          )}
                        </div>
                      </th>
                    ))}
                    <tr key="delete-btn"></tr>
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                    <td>
                      <button
                        className="btn btn-sm btn-error"
                        onClick={() => {
                          table.options.meta?.removeRow(row.index);
                        }}
                        disabled={isAIRunning}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {table.getFooterGroups().map((footerGroup) => (
                  <tr key={footerGroup.id}>
                    {footerGroup.headers.map((header) => (
                      <th key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.footer,
                              header.getContext()
                            )}
                      </th>
                    ))}
                  </tr>
                ))}
              </tfoot>
            </table>
          </div>
          <div className="w-2/3">
            <Chart
              title="Expenses pareto"
              isLoading={isAIRunning}
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
  );
}
