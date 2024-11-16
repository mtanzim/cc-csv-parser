"use client";
import { parseCsv, ReturnType, Row } from "@/app/actions/parse";
import {
  ColumnFiltersState,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  RowData,
  ColumnDef,
} from "@tanstack/react-table";
import { addMonths, formatDate, isSameMonth } from "date-fns";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { SubmitButton } from "./fonts/(components)/submit-btn";
import { CategorizeArgs } from "./api/categorize/route";
import { z } from "zod";
import { Chart, type ChartData } from "@/components/Chart";

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

// Give our default column cell renderer editing superpowers!
const defaultColumn: Partial<ColumnDef<Row>> = {
  cell: ({ getValue, row: { index }, column: { id }, table }) => {
    const initialValue = getValue();
    // We need to keep and update the state of the cell normally
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [value, setValue] = useState(initialValue);

    // When the input is blurred, we'll call our table meta's updateData function
    const onBlur = () => {
      table.options.meta?.updateData(index, id, value);
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
  const [data, setData] = useState<Row[]>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [isAIRunning, setAIRunning] = useState(false);

  useEffect(() => {
    setData(state?.data || []);
  }, [state?.data]);

  const autoCategorizeWithLoader = async () => {
    setAIRunning(true);
    try {
      await autoCategorize();
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

  return (
    <div className="m-16 flex flex-row gap-12">
      <div>
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

        {data.length > 0 && (
          <div className="mt-4">
            <h1 className="text-lg">Date range of data</h1>
            <p className="text">Start: {state.start}</p>
            <p className="text">End: {state.end}</p>
          </div>
        )}
      </div>

      {data.length > 0 && (
        <div className="mt-8">
          <button
            disabled={isAIRunning}
            className="btn btn-secondary"
            onClick={autoCategorizeWithLoader}
          >
            Categorize with AI
          </button>
          <div className="mt-8">
            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text mr-2">Filter to Month</span>
                <input
                  disabled={isAIRunning}
                  type="checkbox"
                  className="toggle"
                  onChange={() => setMonthFilterOn((prev) => !prev)}
                  defaultChecked={isMonthFilterOn}
                />
              </label>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setMonthOffset(0)} className="btn btn-sm">
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
            </div>
          </div>
          <table className="mt-8 table-auto border-separate border-spacing-2">
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
      )}
      {data.length > 0 ? (
        <div className="flex flex-col gap-8">
          <Chart
            title="Debits pareto"
            subtitle=""
            data={makeChartData(
              table.getFilteredRowModel().rows.map((r) => r.original) || [],
              "debit"
            )}
          />
          {/* <Chart
            title="Credits pareto"
            subtitle={`${state.start} to ${state.end}`}
            data={makeChartData(data, "credit")}
          /> */}
        </div>
      ) : null}
    </div>
  );
}
