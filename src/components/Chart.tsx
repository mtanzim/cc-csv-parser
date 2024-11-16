"use client";

import { Bar, BarChart, LabelList, XAxis, YAxis } from "recharts";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export type ChartData = Array<{
  category: string;
  total: number;
}>;

const chartConfig = {
  total: {
    label: "total",
    color: "#60a5fa",
  },
} satisfies ChartConfig;

type Props = {
  data: ChartData;
  title: string;
  subtitle: string;
};
export function Chart({ data, title, subtitle }: Props) {
  return (
    <div>
      <h1 className="text-xl">{title}</h1>
      <h2 className="text-sm">{subtitle}</h2>
      <ChartContainer
        config={chartConfig}
        className="min-h-[600px] max-h-[1200px] w-full"
      >
        <BarChart accessibilityLayer data={data} layout="vertical">
          <XAxis type="number" dataKey="total" hide />
          <YAxis dataKey="category" type="category" tickLine={false} hide />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel />}
          />
          <Bar dataKey="total" fill="var(--color-total)" radius={5}>
            <LabelList
              dataKey="category"
              position="insideLeft"
              offset={8}
              className="fill-white"
              fontSize={18}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}
