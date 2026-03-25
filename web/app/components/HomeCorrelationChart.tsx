"use client";

import {
  ComposedChart,
  Scatter,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import correlationByYear from "@/data/correlationByYear.json";

type YearData = (typeof correlationByYear)[keyof typeof correlationByYear];
type Point = YearData["points"][0];

// Use "All Years" combined view as default
const data = (correlationByYear as Record<string, YearData>)["All Years"];

function Dot(props: { cx?: number; cy?: number; payload?: Point & { x: number; y: number } }) {
  const { cx = 0, cy = 0, payload } = props;
  if (!payload) return null;
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={6}
        fill={payload.color}
        fillOpacity={0.7}
        stroke={payload.color}
        strokeWidth={1.5}
      />
      <text
        x={cx}
        y={cy - 10}
        textAnchor="middle"
        fill="var(--text-muted)"
        fontSize={8}
        fontFamily="var(--font-body)"
      >
        {payload.line}
      </text>
    </g>
  );
}

export default function HomeCorrelationChart() {
  const minX = Math.min(...data.points.map((p) => p.seifa)) - 20;
  const maxX = Math.max(...data.points.map((p) => p.seifa)) + 20;
  const regression = [
    { x: minX, y: data.intercept + data.slope * minX },
    { x: maxX, y: data.intercept + data.slope * maxX },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          All Years Combined &middot; {"\u03C1"} = {data.spearmanR.toFixed(2)}{" "}
          (p = {data.spearmanP.toFixed(3)})
        </p>
      </div>
      <ResponsiveContainer width="100%" height={360}>
        <ComposedChart margin={{ top: 15, right: 20, bottom: 30, left: 10 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            strokeOpacity={0.5}
          />
          <XAxis
            dataKey="x"
            type="number"
            domain={[940, 1150]}
            tick={{ fill: "var(--text-muted)", fontSize: 10 }}
            label={{
              value: "IRSAD Score (Wealth)",
              position: "bottom",
              offset: 10,
              fill: "var(--text-secondary)",
              fontSize: 11,
            }}
          />
          <YAxis
            dataKey="y"
            type="number"
            domain={[85, 100]}
            tick={{ fill: "var(--text-muted)", fontSize: 10 }}
            label={{
              value: "Punctuality %",
              angle: -90,
              position: "insideLeft",
              offset: 0,
              fill: "var(--text-secondary)",
              fontSize: 11,
            }}
          />
          <Line
            data={regression}
            dataKey="y"
            stroke="var(--accent-gold)"
            strokeWidth={1.5}
            strokeDasharray="6 4"
            dot={false}
            isAnimationActive={false}
          />
          <Scatter
            data={data.points.map((p) => ({
              ...p,
              x: p.seifa,
              y: p.punctuality,
            }))}
            shape={<Dot />}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as Point & { x: number; y: number };
              return (
                <div
                  className="p-2 rounded-sm text-xs"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
                  }}
                >
                  <p style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                    {d.line}
                  </p>
                  <p style={{ color: "var(--text-secondary)" }}>
                    Punctuality: {d.punctuality.toFixed(1)}% | IRSAD: {d.seifa}
                  </p>
                </div>
              );
            }}
            cursor={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
