"use client"

import { Pie, PieChart, Cell } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import type { ChartConfig } from '@/components/ui/chart';


const chartConfig = {
  amount: {
    label: '$',
  },
  retail: {
    label: 'Retail',
    color: 'hsl(var(--chart-1))',
  },
  wholesale: {
    label: 'Wholesale',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig;

export function RevenueChart({ data }: { data: any }) {
  const chartData = [
    { type: 'Retail Revenue', amount: data.retailRevenue || 0, fill: 'var(--color-retail)' },
    { type: 'Wholesale Revenue', amount: data.wholesaleRevenue || 0, fill: 'var(--color-wholesale)' },
  ];
  
  return (
    <Card className="h-full bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="font-headline">Revenue Breakdown</CardTitle>
        <CardDescription>Retail vs. Wholesale</CardDescription>
      </CardHeader>
      <CardContent className="pb-0">
        <ChartContainer
          id="revenue-breakdown"
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey="amount"
              nameKey="type"
              innerRadius={60}
              strokeWidth={5}
              stroke="hsl(var(--card))"
            >
               {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
             <ChartLegend
              content={<ChartLegendContent nameKey="type" />}
              className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
