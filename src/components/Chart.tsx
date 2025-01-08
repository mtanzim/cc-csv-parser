"use client";

import { Bar, BarChart, LabelList, XAxis, YAxis } from "recharts";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { currencyFormatter } from "@/ui-lib/utils";

export type ChartData = Array<{
  category: string;
  total: number;
}>;

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
export function Chart({ data, title, isLoading }: Props) {
  return (
    <div className="h-full overflow-y-auto w-full bg-transparent border-none p-2">
      <h1 className="text text-xl">{title}</h1>
      <ChartContainer config={chartConfig}>
        <BarChart accessibilityLayer data={data} layout="vertical">
          <XAxis type="number" dataKey="total" hide />
          <YAxis dataKey="category" type="category" tickLine={false} hide />
          <ChartTooltip
            formatter={(v) => currencyFormatter.format(Number(v))}
            cursor={false}
            content={<ChartTooltipContent />}
          />
          <Bar dataKey="total" className="fill-info" radius={5}>
            <LabelList
              dataKey="category"
              position="insideLeft"
              offset={8}
              className={isLoading ? "hidden" : "fill-info-content"}
              fontSize={16}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}
