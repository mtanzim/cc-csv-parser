import { Row } from "@/app/actions/parse";
import { flexRender, Table as TableType } from "@tanstack/react-table";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { AddExpenseForm } from "./AddExpenseForm";

type Props = {
  table: TableType<Row>;
  isBusy: boolean;
  allowEdits?: boolean;
};

export const ExpenseTable = ({ table, allowEdits = false, isBusy }: Props) => {
  const [isAddingRow, setAddingRow] = useState(false);

  return (
    <>
      {allowEdits ? (
        <>
          <button
            className={
              isAddingRow
                ? "btn btn-accent btn-outline my-2"
                : "btn btn-accent my-2"
            }
            onClick={() => setAddingRow((cur) => !cur)}
          >
            Add a new expense
          </button>
          {isAddingRow && <AddExpenseForm table={table} isBusy={isBusy} />}
        </>
      ) : null}
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
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
                </TableHead>
              ))}
              {table.options.meta?.removeRow ? (
                <TableHead key="delete-btn"></TableHead>
              ) : (
                <TableHead />
              )}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
              {table.options.meta?.removeRow ? (
                <TableCell>
                  <button
                    className="btn btn-sm btn-error"
                    onClick={() => {
                      table.options.meta?.removeRow(row.index);
                    }}
                    disabled={isBusy}
                  >
                    Delete
                  </button>
                </TableCell>
              ) : (
                <TableCell />
              )}
            </TableRow>
          ))}
        </TableBody>
        {/* <TableFooter> */}
        {table.getFooterGroups().map((footerGroup) => (
          <TableRow key={footerGroup.id}>
            {footerGroup.headers.map((header) => (
              <TableHead key={header.id}>
                {header.isPlaceholder
                  ? null
                  : flexRender(
                      header.column.columnDef.footer,
                      header.getContext()
                    )}
              </TableHead>
            ))}
            <TableHead />
          </TableRow>
        ))}
        {/* </TableFooter> */}
      </Table>
    </>
  );
};
