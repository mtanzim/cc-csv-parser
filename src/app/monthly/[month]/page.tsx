"use client";

import { Row } from "@/app/actions/parse";
import { Chart } from "@/components/Chart";
import { ExpenseTable } from "@/components/ExpenseTable";
import { Navbar } from "@/components/Nav";
import { PageContainer } from "@/components/PageContainer";
import { dateFormatOut, PersistedExpense } from "@/lib/schemas";
import { columns, makeChartData } from "@/ui-lib/utils";
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
    debit: d.expense,
    credit: 0,
  }));
};

// TODO: add editing capabilities
export default function Page({ params }: { params: { month: string } }) {
  const slug = params.month;
  const [data, setData] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
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

  return (
    <div>
      <Navbar onLogout={() => null} />
      <PageContainer>
        <h1 className="text-xl mt-2">Current Month: {slug}</h1>
        {!loading && data.length === 0 && (
          <div className="flex gap-2 mt-4">
            <h1 className="text-xl">No data found</h1>
          </div>
        )}
        {!loading && data.length > 0 && (
          <div className="flex gap-2 mt-4">
            <div className="w-1/3">
              <ExpenseTable table={table} isBusy={loading} />
            </div>
            <div className="w-2/3">
              <Chart
                title="Expenses pareto"
                isLoading={loading}
                subtitle=""
                data={makeChartData(
                  table.getFilteredRowModel().rows.map((r) => r.original) || [],
                  "debit"
                )}
              />
            </div>
          </div>
        )}
      </PageContainer>
    </div>
  );
}
