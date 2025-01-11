"use client";

import { LabelList, Pie, PieChart } from "recharts";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { currencyFormatter } from "@/ui-lib/utils";
import { ChartData } from "./Chart";

const chartConfig = {
  total: {
    label: "total",
  },
} satisfies ChartConfig;

type Props = {
  data: ChartData;
  title: string;
  subtitle: string;
  isLoading: boolean;
};

const colors = [
  "oklch(var(--er))",
  "oklch(var(--wa))",
  "oklch(var(--p))",
  "oklch(var(--a))",
  "oklch(var(--in))",
  "oklch(var(--su))",
];

export function ExpensePieChart({ data, title, isLoading }: Props) {
  return (
    <div className="overflow-y-auto w-full bg-transparent border-none p-2">
      <h1 className="text text-xl">{title}</h1>
      <ChartContainer config={chartConfig}>
        <PieChart>
          <ChartTooltip
            formatter={(v, name) =>
              `${name}: ${currencyFormatter.format(Number(v))}`
            }
            content={<ChartTooltipContent />}
          />
          <Pie
            data={data.map((d, idx) => ({
              ...d,
              fill: colors[idx % colors.length],
            }))}
            dataKey="total"
            nameKey="category"
          >
            <LabelList dataKey="category" offset={8} fontSize={12} />
          </Pie>
        </PieChart>
      </ChartContainer>
    </div>
  );
}
