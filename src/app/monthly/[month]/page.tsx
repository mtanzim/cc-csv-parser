"use client";

import { Row } from "@/app/actions/parse";
import { ExportArgs } from "@/app/api/export/route";
import { Chart } from "@/components/Chart";
import { ExpenseTable } from "@/components/ExpenseTable";
import { ExpensePieChart } from "@/components/PieChart";
import { dateFormatOut, PersistedExpense } from "@/lib/schemas";
import { columns, exportToSpreadsheet, makeChartData } from "@/ui-lib/utils";
import {
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { formatDate } from "date-fns";
import { useEffect, useState } from "react";

const getMonthData = async (month: string) => {
  return fetch(`/api/persist?month=${month}`, {
    method: "GET",
  }).then((res) => res.json());
};

const transformData = (data: PersistedExpense): Row[] => {
  return data.map((d) => ({
    date: formatDate(d.date, dateFormatOut),
    description: d.name,
    category: d.category,
    expense: d.expense,
    income: 0,
  }));
};

// TODO: add editing capabilities
export default function Page({ params }: { params: { month: string } }) {
  const slug = params.month;
  const [data, setData] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const [isPie, setPie] = useState(false);

  useEffect(() => {
    getMonthData(slug)
      .then((d) => setData(transformData(d)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(), //client-side sorting
    getFilteredRowModel: getFilteredRowModel(), //client side filtering
  });

  const exportFilteredTable = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  return (
    <div className="w-screen">
      <div className="flex gap-4 justify-center">
        <div className="max-w-md text-center flex gap-4 align-middle">
          <h1 className="text-xl font-bold">{slug}</h1>
          <button className="btn btn-info btn-sm" onClick={exportFilteredTable}>
            {loading && <span className="loading loading-spinner"></span>}
            Export table
          </button>
        </div>
      </div>
      {!loading && data.length === 0 && (
        <div className="flex gap-2 mt-4">
          <h1 className="text-xl">No data found</h1>
        </div>
      )}
      {!loading && data.length > 0 && (
        <div className="lg:flex gap-24 max-h-[968px] w-full justify-center">
          <div className="w-full lg:w-1/2 h-full max-h-screen overflow-y-auto max-w-2xl min-w-2xl">
            <h1 className="text text-xl mb-2">Expenses</h1>
            <ExpenseTable table={table} isBusy={loading} />
          </div>
          <div className="w-full lg:w-1/2 max-w-5xl">
            <div className="form-control m-1">
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
            {isPie ? (
              <ExpensePieChart
                title="Expenses pie chart"
                isLoading={loading}
                subtitle=""
                data={makeChartData(
                  table.getFilteredRowModel().rows.map((r) => r.original) || [],
                  "expense",
                )}
              />
            ) : (
              <Chart
                title="Expenses pareto"
                isLoading={loading}
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
