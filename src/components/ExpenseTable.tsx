import { Row } from "@/app/actions/parse";
import { flexRender, Table as TableType } from "@tanstack/react-table";
import { ArrowDown, ArrowUp } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { categories, UNCATEGORIZED } from "@/lib/schemas";

type Props = {
  table: TableType<Row>;
  isBusy: boolean;
};

const AddExpenseForm = ({ table, isBusy }: Props) => {
  const headerVals = table
    .getHeaderGroups()
    .map((hg) => hg.headers)
    .flat();

  const getInputType = (hid: string) => {
    if (hid.toLowerCase() === "date") {
      return <input name={hid} className="input input-bordered" type="date" />;
    }
    if (hid.toLowerCase() === "expense") {
      return (
        <input name={hid} className="input input-bordered" type="number" />
      );
    }
    if (hid.toLowerCase() === "category") {
      return (
        <select name={hid} className="select select-bordered">
          {[...categories, UNCATEGORIZED].map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      );
    }

    return <input name={hid} className="input input-bordered" type="text" />;
  };

  return (
    <form className="flex flex-col gap-2">
      {headerVals.map((h) => {
        return (
          <label key={h.id} className="flex flex-col">
            <span className="font-semibold mb-1">{h.id}</span>
            {getInputType(h.id)}
          </label>
        );
      })}
      <button type="submit" className="btn btn-primary mt-2">
        Add
      </button>
    </form>
  );
};

export const ExpenseTable = ({ table, isBusy }: Props) => {
  return (
    <>
      <AddExpenseForm table={table} isBusy={isBusy} />
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
