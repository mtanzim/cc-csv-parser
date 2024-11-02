"use client";
import { parseCsv, ReturnType, Row } from "@/app/actions/parse";
import { useFormState } from "react-dom";
import { SubmitButton } from "./fonts/(components)/submit-btn";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUp, ArrowDown } from "lucide-react";

const initialState: ReturnType = {
  data: [],
  start: "",
  end: "",
};

const columnHelper = createColumnHelper<Row>();
const columns = [
  columnHelper.accessor("date", {
    header: () => "Date",
    cell: (info) => info.getValue(),
    footer: (info) => info.column.id,
  }),

  columnHelper.accessor("description", {
    header: () => "Description",
    cell: (info) => info.renderValue(),
    footer: () => "Total",
  }),
  columnHelper.accessor("category", {
    header: () => <span>Category</span>,
  }),
  columnHelper.accessor("credit", {
    header: "Credit",
    footer: ({ table, column }) =>
      table
        .getFilteredRowModel()
        .rows.reduce(
          (total, row) => total + row.getValue<Row["credit"]>(column.id),
          0
        ),
  }),
  columnHelper.accessor("debit", {
    header: "Debit",
    footer: ({ table, column }) =>
      table
        .getFilteredRowModel()
        .rows.reduce(
          (total, row) => total + row.getValue<Row["debit"]>(column.id),
          0
        ),
  }),
];
export default function Home() {
  const [state, formAction] = useFormState<ReturnType, FormData>(
    parseCsv,
    initialState
  );
  const data = state?.data || [];
  // const [sorting, setSorting] = useState<SortingState>([]);
  // const headers: string[] = Object.keys(state?.data?.[0] || []);
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(), //client-side sorting
    // onSortingChange: setSorting, //optionally control sorting state in your own scope for easy access
  });

  return (
    <div className="m-16 flex flex-row gap-12">
      <form className="flex flex-col w-96 gap-4" action={formAction}>
        <h1 className="text-xl">Upload a csv</h1>

        <div className="border border-white p-4">
          <input
            type="file"
            name="cc-stmt"
            placeholder="upload csv here"
            accept=".csv"
          ></input>
        </div>
        <SubmitButton />
      </form>

      <div className="mt-8">
        <p>Start: {state.start}</p>
        <p>End: {state.end}</p>
        <table className="table-auto border-separate border-spacing-2">
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
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
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
    </div>
  );
}
function useState<T>(arg0: never[]): [any, any] {
  throw new Error("Function not implemented.");
}
