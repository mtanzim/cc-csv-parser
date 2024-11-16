"use client";

import { Bar, BarChart, LabelList, XAxis, YAxis } from "recharts";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

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
export function Chart({ data, title }: Props) {
  return (
    <Card className="h-full overflow-y-auto w-full bg-transparent border-none">
      <CardHeader>
        <CardTitle className="text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
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
                fontSize={16}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
