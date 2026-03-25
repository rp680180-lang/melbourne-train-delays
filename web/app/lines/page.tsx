"use client";

import { useState } from "react";
import lineComparison from "@/data/lineComparison.json";

type LineData = (typeof lineComparison)[0];
type SortKey = "latestPunctuality" | "seifaScore" | "name" | "stationCount" | "avgPunctuality10y";

export default function LinesPage() {
  const [sortKey, setSortKey] = useState<SortKey>("latestPunctuality");
  const [sortAsc, setSortAsc] = useState(false);

  const lines = lineComparison.filter((l) => l.latestPunctuality != null);

  const sorted = [...lines].sort((a, b) => {
    const va = a[sortKey];
    const vb = b[sortKey];
    if (va == null || vb == null) return 0;
    if (typeof va === "string" && typeof vb === "string")
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    return sortAsc ? (va as number) - (vb as number) : (vb as number) - (va as number);
  });

  const maxPct = Math.max(...lines.map((l) => l.latestPunctuality ?? 0));
  const maxSeifa = Math.max(...lines.map((l) => l.seifaScore ?? 0));

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  function SortHeader({ label, field }: { label: string; field: SortKey }) {
    const active = sortKey === field;
    return (
      <button
        onClick={() => handleSort(field)}
        className="text-xs uppercase tracking-wider text-left transition-colors"
        style={{
          color: active ? "var(--accent-gold)" : "var(--text-muted)",
          letterSpacing: "0.12em",
        }}
      >
        {label} {active ? (sortAsc ? "\u2191" : "\u2193") : ""}
      </button>
    );
  }

  return (
    <div style={{ background: "var(--bg-primary)" }}>
      <div className="max-w-6xl mx-auto px-6 pt-28 pb-20">
        <p
          className="text-xs uppercase tracking-wider mb-4"
          style={{ color: "var(--accent-gold)", letterSpacing: "0.2em" }}
        >
          Line Comparison
        </p>
        <h1
          className="text-4xl md:text-5xl mb-4"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Performance by line
        </h1>
        <p
          className="text-base max-w-2xl mb-12"
          style={{ color: "var(--text-secondary)" }}
        >
          Melbourne&rsquo;s 16 metro train lines ranked by punctuality, with their
          socioeconomic profile and 10-year trend. Click column headers to sort.
        </p>

        {/* Visual bar chart */}
        <div className="mb-16">
          <h2
            className="text-2xl mb-6"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Punctuality &amp; wealth side-by-side
          </h2>
          <div className="space-y-3">
            {sorted.map((line, i) => {
              const pct = line.latestPunctuality ?? 0;
              const seifa = line.seifaScore ?? 0;
              const pctWidth = ((pct - 85) / (maxPct - 85)) * 100;
              const seifaWidth = ((seifa - 900) / (maxSeifa - 900)) * 100;
              return (
                <div
                  key={line.name}
                  className="grid grid-cols-[140px_1fr_1fr_80px] gap-3 items-center"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ background: line.color }}
                    />
                    <span
                      className="text-sm truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {line.name}
                    </span>
                  </div>

                  {/* Punctuality bar */}
                  <div
                    className="relative h-7 rounded-sm overflow-hidden"
                    style={{ background: "var(--bg-card)" }}
                  >
                    <div
                      className="absolute inset-y-0 left-0 rounded-sm bar-animate"
                      style={{
                        width: `${pctWidth}%`,
                        background: `linear-gradient(90deg, ${line.color}66, ${line.color})`,
                        animationDelay: `${i * 40}ms`,
                      }}
                    />
                    <div
                      className="absolute top-0 bottom-0 w-px"
                      style={{
                        left: `${((92 - 85) / (maxPct - 85)) * 100}%`,
                        background: "var(--accent-red)",
                        opacity: 0.6,
                      }}
                    />
                    <span
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs tabular-nums"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {pct.toFixed(1)}%
                    </span>
                  </div>

                  {/* SEIFA bar */}
                  <div
                    className="relative h-7 rounded-sm overflow-hidden"
                    style={{ background: "var(--bg-card)" }}
                  >
                    <div
                      className="absolute inset-y-0 left-0 rounded-sm bar-animate"
                      style={{
                        width: `${seifaWidth}%`,
                        background: `linear-gradient(90deg, var(--accent-gold)44, var(--accent-gold))`,
                        animationDelay: `${i * 40 + 200}ms`,
                      }}
                    />
                    <span
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs tabular-nums"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {seifa.toFixed(0)}
                    </span>
                  </div>

                  {/* Trend badge */}
                  <div className="text-right">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background:
                          line.trend === "improving"
                            ? "rgba(72, 199, 142, 0.15)"
                            : line.trend === "declining"
                            ? "rgba(255, 99, 71, 0.15)"
                            : "rgba(255, 255, 255, 0.05)",
                        color:
                          line.trend === "improving"
                            ? "var(--accent-green)"
                            : line.trend === "declining"
                            ? "var(--accent-red)"
                            : "var(--text-muted)",
                      }}
                    >
                      {line.trend === "improving"
                        ? "\u2191 improving"
                        : line.trend === "declining"
                        ? "\u2193 declining"
                        : "\u2192 stable"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div
            className="flex gap-8 mt-4 text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            <span className="flex items-center gap-2">
              <span
                className="w-8 h-2 rounded-sm"
                style={{ background: "var(--text-muted)" }}
              />
              Punctuality % (FY 2024-25)
            </span>
            <span className="flex items-center gap-2">
              <span
                className="w-8 h-2 rounded-sm"
                style={{ background: "var(--accent-gold)" }}
              />
              IRSAD Score
            </span>
            <span className="flex items-center gap-2">
              <span
                className="w-px h-4"
                style={{ background: "var(--accent-red)" }}
              />
              92% target
            </span>
          </div>
        </div>

        {/* Sortable table */}
        <div
          className="rounded-sm overflow-hidden"
          style={{ border: "1px solid var(--border)" }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--bg-card)" }}>
                  <th className="text-left p-4">
                    <SortHeader label="Line" field="name" />
                  </th>
                  <th className="text-left p-4">
                    <SortHeader label="Latest Punct." field="latestPunctuality" />
                  </th>
                  <th className="text-left p-4">
                    <SortHeader label="10yr Avg" field="avgPunctuality10y" />
                  </th>
                  <th className="text-left p-4">
                    <SortHeader label="IRSAD" field="seifaScore" />
                  </th>
                  <th className="text-left p-4">
                    <SortHeader label="Stations" field="stationCount" />
                  </th>
                  <th className="text-left p-4">
                    <span
                      className="text-xs uppercase tracking-wider"
                      style={{
                        color: "var(--text-muted)",
                        letterSpacing: "0.12em",
                      }}
                    >
                      Group
                    </span>
                  </th>
                  <th className="text-left p-4">
                    <span
                      className="text-xs uppercase tracking-wider"
                      style={{
                        color: "var(--text-muted)",
                        letterSpacing: "0.12em",
                      }}
                    >
                      Trend
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((line, i) => (
                  <tr
                    key={line.name}
                    className="transition-colors"
                    style={{
                      borderTop: "1px solid var(--border)",
                      background:
                        i % 2 === 0
                          ? "var(--bg-primary)"
                          : "var(--bg-secondary)",
                    }}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ background: line.color }}
                        />
                        <span style={{ color: "var(--text-primary)" }}>
                          {line.name}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 tabular-nums">
                      <span
                        style={{
                          color:
                            (line.latestPunctuality ?? 0) >= 92
                              ? "var(--accent-green)"
                              : "var(--accent-red)",
                        }}
                      >
                        {line.latestPunctuality?.toFixed(1)}%
                      </span>
                    </td>
                    <td
                      className="p-4 tabular-nums"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {line.avgPunctuality10y?.toFixed(1)}%
                    </td>
                    <td
                      className="p-4 tabular-nums"
                      style={{ color: "var(--accent-gold)" }}
                    >
                      {line.seifaScore?.toFixed(0) ?? "\u2014"}
                    </td>
                    <td
                      className="p-4 tabular-nums"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {line.stationCount}
                    </td>
                    <td className="p-4 text-xs" style={{ color: "var(--text-muted)" }}>
                      {line.group}
                    </td>
                    <td className="p-4">
                      <span
                        className="text-xs"
                        style={{
                          color:
                            line.trend === "improving"
                              ? "var(--accent-green)"
                              : line.trend === "declining"
                              ? "var(--accent-red)"
                              : "var(--text-muted)",
                        }}
                      >
                        {line.trend === "improving"
                          ? "\u2191 Improving"
                          : line.trend === "declining"
                          ? "\u2193 Declining"
                          : "\u2192 Stable"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Data source note */}
        <p className="text-xs mt-6" style={{ color: "var(--text-muted)" }}>
          Performance data: Victorian Government Power BI dashboards (official
          PTV data). SEIFA: ABS IRSAD 2021 Census. Trend based on 10-year linear
          regression. All data extracted programmatically.
        </p>
      </div>
    </div>
  );
}
