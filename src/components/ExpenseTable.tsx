import { Row } from "@/app/actions/parse";
import { flexRender, Table } from "@tanstack/react-table";
import { ArrowDown, ArrowUp } from "lucide-react";

type Props = {
  table: Table<Row>;
  isBusy: boolean;
};

export const ExpenseTable = ({ table, isBusy }: Props) => {
  return (
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
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
            {table.options.meta?.removeRow && (
              <td>
                <button
                  className="btn btn-sm btn-error"
                  onClick={() => {
                    table.options.meta?.removeRow(row.index);
                  }}
                  disabled={isBusy}
                >
                  Delete
                </button>
              </td>
            )}
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
  );
};
