"use client";
import { Row } from "@/app/actions/parse";
import { ExportArgs } from "@/app/api/export/route";
import { ChartData } from "@/components/Chart";
import { UNCATEGORIZED } from "@/lib/schemas";
import { createColumnHelper } from "@tanstack/react-table";
import { isSameMonth } from "date-fns";

const columnHelper = createColumnHelper<Row>();

export const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

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
  // TODO: enable income? Also need to fix exports
  // columnHelper.accessor("income", {
  //   header: "Income",
  //   cell: (info) => info.renderValue(),
  //   footer: ({ table, column }) =>
  //     table
  //       .getFilteredRowModel()
  //       .rows.reduce(
  //         (total, row) => total + row.getValue<Row["income"]>(column.id),
  //         0
  //       )
  //       ?.toFixed(2),
  // }),
  columnHelper.accessor("expense", {
    header: "Expense",
    cell: (info) => currencyFormatter.format(info.renderValue() ?? 0),
    footer: ({ table, column }) => {
      const sum = table
        .getFilteredRowModel()
        .rows.reduce(
          (total, row) => total + row.getValue<Row["expense"]>(column.id),
          0,
        );
      return currencyFormatter.format(sum);
    },
  }),
];

export const makeChartData = (
  curData: Row[],
  attrName: keyof Row,
): ChartData => {
  const chartDataPrep: Record<string, number> = curData.reduce(
    (acc, cur) => {
      const category = cur?.category || UNCATEGORIZED;
      const _expense = Number(cur?.[attrName] || 0);
      const expense = isNaN(_expense) ? 0 : _expense;
      if (acc?.[category] === undefined) {
        acc[category] = expense;
        return acc;
      }
      acc[category] = acc[category] + expense;
      return acc;
    },
    {} as Record<string, number>,
  );
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
