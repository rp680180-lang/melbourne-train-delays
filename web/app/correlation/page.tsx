"use client";

import { useState } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
  LineChart,
  Legend,
} from "recharts";
import correlationByYear from "@/data/correlationByYear.json";
import summary from "@/data/summary.json";

type YearData = (typeof correlationByYear)[keyof typeof correlationByYear];
type Point = YearData["points"][0];

const allKeys = Object.keys(correlationByYear).sort();
// Separate "All Years" from individual FYs
const years = allKeys.filter((k) => k !== "All Years");

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: Point & { x: number; y: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d?.punctuality) return null;
  return (
    <div
      className="p-3 rounded-sm text-sm"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ background: d.color }}
        />
        <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
          {d.line}
        </span>
      </div>
      <div
        className="text-xs space-y-0.5"
        style={{ color: "var(--text-secondary)" }}
      >
        <p>Punctuality: {d.punctuality.toFixed(1)}%</p>
        <p>IRSAD Score: {d.seifa}</p>
        {d.cancelled != null && (
          <p>Cancelled: {d.cancelled.toFixed(1)}%</p>
        )}
      </div>
    </div>
  );
}

function CustomDot(props: {
  cx?: number;
  cy?: number;
  payload?: Point & { x: number; y: number };
}) {
  const { cx = 0, cy = 0, payload } = props;
  if (!payload) return null;
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={7}
        fill={payload.color}
        fillOpacity={0.7}
        stroke={payload.color}
        strokeWidth={1.5}
        style={{ cursor: "pointer" }}
      />
      <text
        x={cx}
        y={cy - 12}
        textAnchor="middle"
        fill="var(--text-muted)"
        fontSize={9}
        fontFamily="var(--font-body)"
      >
        {payload.line}
      </text>
    </g>
  );
}

export default function CorrelationPage() {
  const [selectedYear, setSelectedYear] = useState("All Years");
  const yearData = (correlationByYear as Record<string, YearData>)[selectedYear];

  // Build correlation trend data
  const correlationTrend = years.map((fy) => {
    const d = (correlationByYear as Record<string, YearData>)[fy];
    return {
      fy: fy.replace("20", "'").replace("-20", "\u2013'").replace("-", "\u2013"),
      fyFull: fy,
      r: d.spearmanR,
      significant: d.significant,
    };
  });

  // Build regression line from slope/intercept
  const minX = Math.min(...yearData.points.map((p) => p.seifa)) - 20;
  const maxX = Math.max(...yearData.points.map((p) => p.seifa)) + 20;
  const regressionLine = [
    { x: minX, y: yearData.intercept + yearData.slope * minX },
    { x: maxX, y: yearData.intercept + yearData.slope * maxX },
  ];

  return (
    <div style={{ background: "var(--bg-primary)" }}>
      <div className="max-w-6xl mx-auto px-6 pt-28 pb-20">
        <p
          className="text-xs uppercase tracking-wider mb-4"
          style={{ color: "var(--accent-gold)", letterSpacing: "0.2em" }}
        >
          Statistical Analysis &middot; {summary.totalYears} Years of Data
        </p>
        <h1
          className="text-4xl md:text-5xl mb-4"
          style={{ fontFamily: "var(--font-display)" }}
        >
          IRSAD vs. punctuality
        </h1>
        <p
          className="text-base max-w-2xl mb-12"
          style={{ color: "var(--text-secondary)" }}
        >
          Each dot is a train line. Use the year selector to see how the
          IRSAD&ndash;punctuality correlation has moved over time.
        </p>

        {/* Year selector */}
        <div className="flex flex-wrap gap-2 mb-8">
          {/* All Years button first */}
          <button
            onClick={() => setSelectedYear("All Years")}
            className="px-3 py-1.5 text-xs rounded-sm transition-all"
            style={{
              background: selectedYear === "All Years" ? "var(--accent-gold)" : "var(--bg-card)",
              color: selectedYear === "All Years" ? "var(--bg-primary)" : "var(--text-secondary)",
              border: `1px solid ${selectedYear === "All Years" ? "var(--accent-gold)" : "var(--border)"}`,
              fontWeight: selectedYear === "All Years" ? 600 : 400,
            }}
          >
            All Years *
          </button>
          <span className="self-center text-xs" style={{ color: "var(--border)" }}>|</span>
          {years.map((fy) => {
            const d = (correlationByYear as Record<string, YearData>)[fy];
            const isSelected = fy === selectedYear;
            return (
              <button
                key={fy}
                onClick={() => setSelectedYear(fy)}
                className="px-3 py-1.5 text-xs rounded-sm transition-all"
                style={{
                  background: isSelected ? "var(--accent-gold)" : "var(--bg-card)",
                  color: isSelected ? "var(--bg-primary)" : "var(--text-secondary)",
                  border: `1px solid ${isSelected ? "var(--accent-gold)" : "var(--border)"}`,
                  fontWeight: isSelected ? 600 : 400,
                }}
              >
                {fy}
                {d.significant && (
                  <span style={{ color: isSelected ? "var(--bg-primary)" : "var(--accent-gold)" }}>
                    {" *"}
                  </span>
                )}
              </button>
            );
          })}
          <span className="text-xs self-center ml-2" style={{ color: "var(--text-muted)" }}>
            * = statistically significant
          </span>
        </div>

        {/* Scatter plot */}
        <div
          className="p-6 rounded-sm mb-4"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg" style={{ fontFamily: "var(--font-display)" }}>
              {selectedYear === "All Years" ? "All Years Combined (Average per Line)" : `FY ${selectedYear}`}
            </h3>
            <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
              <span style={{ color: "var(--accent-gold)" }}>
                {"\u03C1"} = {yearData.spearmanR.toFixed(3)}
              </span>
              {" | "}
              <span>p = {yearData.spearmanP.toFixed(3)}</span>
              {" | "}
              <span
                style={{
                  color: yearData.significant
                    ? "var(--accent-gold)"
                    : "var(--text-muted)",
                }}
              >
                {yearData.significant ? "Significant" : "Not significant"}
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={450}>
            <ComposedChart
              margin={{ top: 20, right: 40, bottom: 40, left: 20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                strokeOpacity={0.5}
              />
              <XAxis
                dataKey="x"
                type="number"
                domain={[940, 1150]}
                tick={{
                  fill: "var(--text-muted)",
                  fontSize: 11,
                  fontFamily: "var(--font-body)",
                }}
                label={{
                  value: "IRSAD Score",
                  position: "bottom",
                  offset: 15,
                  fill: "var(--text-secondary)",
                  fontSize: 12,
                }}
              />
              <YAxis
                dataKey="y"
                type="number"
                domain={[84, 100]}
                tick={{
                  fill: "var(--text-muted)",
                  fontSize: 11,
                  fontFamily: "var(--font-body)",
                }}
                label={{
                  value: "Punctuality %",
                  angle: -90,
                  position: "insideLeft",
                  offset: 5,
                  fill: "var(--text-secondary)",
                  fontSize: 12,
                }}
              />

              {/* Regression line */}
              <Line
                data={regressionLine}
                dataKey="y"
                stroke="var(--accent-gold)"
                strokeWidth={1.5}
                strokeDasharray="6 4"
                dot={false}
                type="monotone"
                isAnimationActive={false}
              />

              {/* 92% target reference line */}
              <Line
                data={[
                  { x: 940, y: 92 },
                  { x: 1150, y: 92 },
                ]}
                dataKey="y"
                stroke="var(--accent-red)"
                strokeWidth={1}
                strokeDasharray="4 4"
                strokeOpacity={0.5}
                dot={false}
                isAnimationActive={false}
              />

              {/* Data points */}
              <Scatter
                data={yearData.points.map((p) => ({
                  ...p,
                  x: p.seifa,
                  y: p.punctuality,
                }))}
                shape={<CustomDot />}
              />

              <Tooltip content={<CustomTooltip />} cursor={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Correlation trend over time */}
        <div
          className="p-6 rounded-sm mb-10"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <h3
            className="text-xl mb-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Correlation by year
          </h3>
          <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
            Spearman {"\u03C1"} between IRSAD score and punctuality, by
            financial year. Higher values indicate a stronger correlation.
          </p>
          <ResponsiveContainer width="100%" height={250}>
            <ComposedChart
              data={correlationTrend}
              margin={{ top: 10, right: 30, bottom: 10, left: 10 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                strokeOpacity={0.5}
              />
              <XAxis
                dataKey="fy"
                tick={{
                  fill: "var(--text-muted)",
                  fontSize: 10,
                  fontFamily: "var(--font-body)",
                }}
              />
              <YAxis
                domain={[0, 1]}
                tick={{
                  fill: "var(--text-muted)",
                  fontSize: 11,
                  fontFamily: "var(--font-body)",
                }}
                label={{
                  value: "Spearman \u03C1",
                  angle: -90,
                  position: "insideLeft",
                  offset: 5,
                  fill: "var(--text-secondary)",
                  fontSize: 12,
                }}
              />
              <Line
                dataKey="r"
                stroke="var(--accent-gold)"
                strokeWidth={2}
                dot={(props) => {
                  const { cx = 0, cy = 0, payload } = props as { cx?: number; cy?: number; payload?: { significant: boolean; fyFull: string } };
                  if (!payload) return <circle />;
                  return (
                    <circle
                      key={payload.fyFull}
                      cx={cx}
                      cy={cy}
                      r={payload.significant ? 5 : 4}
                      fill={
                        payload.significant
                          ? "var(--accent-gold)"
                          : "var(--bg-card)"
                      }
                      stroke="var(--accent-gold)"
                      strokeWidth={1.5}
                      style={{ cursor: "pointer" }}
                      onClick={() => setSelectedYear(payload.fyFull)}
                    />
                  );
                }}
              />
              {/* Significance threshold reference */}
              <Line
                data={correlationTrend.map((d) => ({ ...d, threshold: 0.05 }))}
                dataKey="threshold"
                stroke="var(--accent-red)"
                strokeWidth={1}
                strokeDasharray="4 4"
                strokeOpacity={0.3}
                dot={false}
                isAnimationActive={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div
                      className="p-2 rounded-sm text-xs"
                      style={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <p style={{ color: "var(--text-primary)" }}>
                        FY {d.fyFull}
                      </p>
                      <p style={{ color: "var(--accent-gold)" }}>
                        {"\u03C1"} = {d.r.toFixed(3)}
                      </p>
                      <p
                        style={{
                          color: d.significant
                            ? "var(--accent-gold)"
                            : "var(--text-muted)",
                        }}
                      >
                        {d.significant
                          ? "Statistically significant"
                          : "Not significant"}
                      </p>
                    </div>
                  );
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
          <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
            Filled dots = statistically significant (p &lt; 0.05). Hollow dots = not significant. Click to view year.
          </p>
        </div>

        {/* Interpretation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <div
            className="p-6 rounded-sm"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
            }}
          >
            <h3
              className="text-xl mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Key findings
            </h3>
            <div
              className="space-y-4 text-sm leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              <p>
                The IRSAD&ndash;punctuality correlation was{" "}
                <strong style={{ color: "var(--accent-gold)" }}>
                  statistically significant in {summary.significantYears} of{" "}
                  {summary.totalAnalyzedYears} years
                </strong>{" "}
                analysed, with Spearman {"\u03C1"} ranging from 0.24 to 0.77.
              </p>
              <p>
                The{" "}
                <strong style={{ color: "var(--text-primary)" }}>
                  strongest correlations were pre-COVID
                </strong>{" "}
                (2017&ndash;2020, {"\u03C1"} &gt; 0.7).
              </p>
              <p>
                The correlation{" "}
                <strong style={{ color: "var(--text-primary)" }}>
                  weakened during 2021&ndash;2023
                </strong>{" "}
                as COVID disruptions, reduced services, and staffing issues
                affected all lines more uniformly, and has begun recovering
                in 2023&ndash;2025.
              </p>
            </div>
          </div>

          <div
            className="p-6 rounded-sm"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
            }}
          >
            <h3
              className="text-xl mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Potential confounders
            </h3>
            <div
              className="space-y-3 text-sm leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              {[
                {
                  title: "Line length & distance from CBD",
                  text: "Lines with higher IRSAD scores tend to be inner-city with shorter routes that naturally perform better.",
                },
                {
                  title: "Infrastructure age & investment",
                  text: "Older infrastructure is more fault-prone, and maintenance investment varies across the network.",
                },
                {
                  title: "Level crossings",
                  text: "More level crossings mean more disruptions. The Level Crossing Removal Project has been uneven.",
                },
                {
                  title: "Patronage & crowding",
                  text: "Busier lines experience more dwell time at stations, cascading into delays.",
                },
              ].map((item) => (
                <div key={item.title}>
                  <h4
                    className="text-sm font-medium mb-0.5"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {item.title}
                  </h4>
                  <p>{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
