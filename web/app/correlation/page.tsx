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
  Area,
} from "recharts";
import correlationData from "@/data/correlationData.json";
import summary from "@/data/summary.json";

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: typeof correlationData.points[0] }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
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
          {d.lineName}
        </span>
      </div>
      <div
        className="text-xs space-y-0.5"
        style={{ color: "var(--text-secondary)" }}
      >
        <p>Punctuality: {d.punctualityPct}%</p>
        <p>IRSAD Score: {d.irsadScore}</p>
        <p>Stations: {d.stationCount}</p>
      </div>
    </div>
  );
}

function CustomDot(props: {
  cx?: number;
  cy?: number;
  payload?: typeof correlationData.points[0];
}) {
  const { cx = 0, cy = 0, payload } = props;
  if (!payload) return null;
  const r = Math.max(6, Math.min(14, payload.stationCount / 2));
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={payload.color}
        fillOpacity={0.7}
        stroke={payload.color}
        strokeWidth={1.5}
        style={{ cursor: "pointer" }}
      />
      <text
        x={cx}
        y={cy - r - 4}
        textAnchor="middle"
        fill="var(--text-muted)"
        fontSize={9}
        fontFamily="var(--font-body)"
      >
        {payload.lineName}
      </text>
    </g>
  );
}

export default function CorrelationPage() {
  const [hoveredLine, setHoveredLine] = useState<string | null>(null);
  const { statistics, regression, points } = correlationData;

  // Build data for the regression line + confidence band
  const regressionLine = regression.line.map((p, i) => ({
    x: p.x,
    y: p.y,
    ciUpper: regression.ciUpper[i].y,
    ciLower: regression.ciLower[i].y,
  }));

  return (
    <div style={{ background: "var(--bg-primary)" }}>
      <div className="max-w-6xl mx-auto px-6 pt-28 pb-20">
        <p
          className="text-xs uppercase tracking-wider mb-4"
          style={{ color: "var(--accent-gold)", letterSpacing: "0.2em" }}
        >
          Statistical Analysis
        </p>
        <h1
          className="text-4xl md:text-5xl mb-4"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Wealth vs. punctuality
        </h1>
        <p
          className="text-base max-w-2xl mb-12"
          style={{ color: "var(--text-secondary)" }}
        >
          Each dot represents a train line. The x-axis shows the
          population-weighted median IRSAD score (higher = wealthier suburbs),
          and the y-axis shows the percentage of trains that arrived on time.
        </p>

        {/* Scatter plot */}
        <div
          className="p-6 rounded-sm mb-10"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <ResponsiveContainer width="100%" height={500}>
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
                domain={[920, 1160]}
                tick={{ fill: "var(--text-muted)", fontSize: 11, fontFamily: "var(--font-body)" }}
                label={{
                  value: "IRSAD Score (Suburb Wealth)",
                  position: "bottom",
                  offset: 15,
                  fill: "var(--text-secondary)",
                  fontSize: 12,
                  fontFamily: "var(--font-body)",
                }}
              />
              <YAxis
                dataKey="y"
                type="number"
                domain={[88, 98]}
                tick={{ fill: "var(--text-muted)", fontSize: 11, fontFamily: "var(--font-body)" }}
                label={{
                  value: "Punctuality %",
                  angle: -90,
                  position: "insideLeft",
                  offset: 5,
                  fill: "var(--text-secondary)",
                  fontSize: 12,
                  fontFamily: "var(--font-body)",
                }}
              />

              {/* Confidence interval band */}
              <Area
                data={regressionLine}
                dataKey="ciUpper"
                stroke="none"
                fill="var(--accent-gold)"
                fillOpacity={0.06}
                type="monotone"
                isAnimationActive={false}
              />
              <Area
                data={regressionLine}
                dataKey="ciLower"
                stroke="none"
                fill="var(--bg-card)"
                fillOpacity={1}
                type="monotone"
                isAnimationActive={false}
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
                  { x: 920, y: 92 },
                  { x: 1160, y: 92 },
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
                data={points.map((p) => ({
                  ...p,
                  x: p.irsadScore,
                  y: p.punctualityPct,
                }))}
                shape={<CustomDot />}
              />

              <Tooltip
                content={<CustomTooltip />}
                cursor={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Statistics */}
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
              Statistical results
            </h3>
            <div className="space-y-3">
              {[
                {
                  label: "Spearman \u03C1",
                  value: statistics.spearmanR.toFixed(3),
                  note: "Rank correlation coefficient",
                },
                {
                  label: "p-value (Spearman)",
                  value: statistics.spearmanP.toFixed(4),
                  note: statistics.significant
                    ? "Significant at 95%"
                    : "Not significant at 95%",
                },
                {
                  label: "Pearson r",
                  value: statistics.pearsonR.toFixed(3),
                  note: "Linear correlation coefficient",
                },
                {
                  label: "R\u00B2",
                  value: statistics.rSquared.toFixed(3),
                  note: `${(statistics.rSquared * 100).toFixed(1)}% of variance explained`,
                },
                {
                  label: "Sample size",
                  value: `n = ${statistics.n}`,
                  note: "One observation per train line",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex justify-between items-baseline py-2"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <div>
                    <span
                      className="text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {stat.label}
                    </span>
                    <span
                      className="text-xs block"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {stat.note}
                    </span>
                  </div>
                  <span
                    className="text-lg tabular-nums"
                    style={{
                      fontFamily: "var(--font-display)",
                      color: "var(--accent-gold)",
                    }}
                  >
                    {stat.value}
                  </span>
                </div>
              ))}
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
              What this means
            </h3>
            <div className="space-y-4 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              <p>
                The Spearman rank correlation of{" "}
                <strong style={{ color: "var(--accent-gold)" }}>
                  \u03C1 = {statistics.spearmanR.toFixed(2)}
                </strong>{" "}
                suggests a {summary.correlationStrength} {summary.correlationDirection}{" "}
                relationship between suburb wealth and train punctuality. Lines
                serving wealthier suburbs tend to have better on-time performance.
              </p>
              <p>
                However, with a p-value of{" "}
                <strong style={{ color: "var(--text-primary)" }}>
                  {statistics.spearmanP.toFixed(3)}
                </strong>
                , this result{" "}
                {statistics.significant
                  ? "is statistically significant"
                  : "does not reach statistical significance"}{" "}
                at the conventional 95% confidence level. With only {statistics.n}{" "}
                data points, we lack the statistical power to draw strong conclusions.
              </p>
              <p>
                The R\u00B2 of {statistics.rSquared.toFixed(2)} means that suburb
                wealth explains about{" "}
                {(statistics.rSquared * 100).toFixed(0)}% of the variation in
                punctuality across lines. The remaining{" "}
                {(100 - statistics.rSquared * 100).toFixed(0)}% is driven by other
                factors.
              </p>
            </div>
          </div>
        </div>

        {/* Confounders */}
        <div
          className="p-8 rounded-sm"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <p
            className="text-xs uppercase tracking-wider mb-4"
            style={{ color: "var(--accent-copper)", letterSpacing: "0.15em" }}
          >
            Potential Confounders
          </p>
          <h3
            className="text-2xl mb-6"
            style={{ fontFamily: "var(--font-display)" }}
          >
            What else could explain the pattern?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm" style={{ color: "var(--text-secondary)" }}>
            {[
              {
                title: "Line length & distance from CBD",
                text: "Longer lines have more opportunities for delays. Wealthier suburbs tend to be inner-city with shorter lines, which naturally perform better.",
              },
              {
                title: "Infrastructure age",
                text: "Older infrastructure is more prone to faults. Lines serving established wealthy suburbs may have received more maintenance investment.",
              },
              {
                title: "Level crossings",
                text: "Lines with more level crossings experience more disruptions. The Level Crossing Removal Project has targeted some of the worst but not all.",
              },
              {
                title: "Patronage & crowding",
                text: "Busier lines may experience more dwell time at stations, cascading into delays. Patronage patterns don\u2019t perfectly correlate with wealth.",
              },
            ].map((item) => (
              <div key={item.title}>
                <h4
                  className="text-sm font-medium mb-1"
                  style={{ color: "var(--text-primary)" }}
                >
                  {item.title}
                </h4>
                <p className="leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
