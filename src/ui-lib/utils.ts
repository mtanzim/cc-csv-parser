"use client";
import { Row } from "@/app/actions/parse";
import { ExportArgs } from "@/app/api/export/route";
import { createColumnHelper } from "@tanstack/react-table";
import { isSameMonth } from "date-fns";

export const UNCATEGORIZED = "Uncategorized";
export const categories = [
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

const columnHelper = createColumnHelper<Row>();
// Give our default column cell renderer editing superpowers!

export const columns = [
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
  // TODO: need income column?
  // columnHelper.accessor("credit", {
  //   header: "Income",
  //   cell: (info) => info.renderValue(),
  //   footer: ({ table, column }) =>
  //     table
  //       .getFilteredRowModel()
  //       .rows.reduce(
  //         (total, row) => total + row.getValue<Row["credit"]>(column.id),
  //         0
  //       )
  //       ?.toFixed(2),
  // }),
  columnHelper.accessor("debit", {
    header: "Expense",
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

export const makeChartData = (
  curData: Row[],
  attrName: keyof Row
): ChartData => {
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

export const exportToSpreadsheet = async (exportBody: ExportArgs) => {
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
};
