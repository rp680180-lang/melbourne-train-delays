"use client";

import { useState } from "react";
import lineComparison from "@/data/lineComparison.json";

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

  function SortButton({ label, field }: { label: string; field: SortKey }) {
    const active = sortKey === field;
    return (
      <button
        onClick={() => handleSort(field)}
        className="px-3 py-1.5 text-xs rounded-sm transition-all"
        style={{
          background: active ? "var(--accent-gold)" : "var(--bg-card)",
          color: active ? "var(--bg-primary)" : "var(--text-secondary)",
          border: `1px solid ${active ? "var(--accent-gold)" : "var(--border)"}`,
          fontWeight: active ? 600 : 400,
        }}
      >
        {label} {active ? (sortAsc ? "\u2191" : "\u2193") : ""}
      </button>
    );
  }

  return (
    <div style={{ background: "var(--bg-primary)" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 sm:pt-28 pb-20">
        <p
          className="text-xs uppercase tracking-wider mb-4"
          style={{ color: "var(--accent-gold)", letterSpacing: "0.2em" }}
        >
          Line Comparison
        </p>
        <h1
          className="text-3xl sm:text-4xl md:text-5xl mb-4"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Performance by line
        </h1>
        <p
          className="text-sm sm:text-base max-w-2xl mb-8"
          style={{ color: "var(--text-secondary)" }}
        >
          Melbourne&rsquo;s 16 metro train lines, ranked by punctuality, with
          IRSAD score and multi-year trend.
        </p>

        {/* Sort controls */}
        <div className="flex flex-wrap gap-2 mb-8">
          <span className="text-xs self-center mr-1" style={{ color: "var(--text-muted)" }}>
            Sort by:
          </span>
          <SortButton label="Punctuality" field="latestPunctuality" />
          <SortButton label="IRSAD" field="seifaScore" />
          <SortButton label="Name" field="name" />
          <SortButton label="Avg (All)" field="avgPunctuality10y" />
        </div>

        {/* Line cards - mobile friendly */}
        <div className="space-y-3">
          {sorted.map((line, i) => {
            const pct = line.latestPunctuality ?? 0;
            const seifa = line.seifaScore ?? 0;
            const pctWidth = ((pct - 85) / (maxPct - 85)) * 100;

            return (
              <div
                key={line.name}
                className="rounded-sm overflow-hidden"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                }}
              >
                {/* Punctuality bar background */}
                <div className="relative">
                  <div
                    className="absolute inset-y-0 left-0 bar-animate"
                    style={{
                      width: `${pctWidth}%`,
                      background: `linear-gradient(90deg, ${line.color}22, ${line.color}33)`,
                      animationDelay: `${i * 30}ms`,
                    }}
                  />
                  {/* 92% target line */}
                  <div
                    className="absolute top-0 bottom-0 w-px"
                    style={{
                      left: `${((92 - 85) / (maxPct - 85)) * 100}%`,
                      background: "var(--accent-red)",
                      opacity: 0.4,
                    }}
                  />

                  <div className="relative p-4">
                    {/* Top row: name + punctuality */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ background: line.color }}
                        />
                        <span
                          className="text-sm font-medium"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {line.name}
                        </span>
                        <span
                          className="text-xs px-1.5 py-0.5 rounded-full hidden sm:inline"
                          style={{
                            background: "rgba(255,255,255,0.05)",
                            color: "var(--text-muted)",
                          }}
                        >
                          {line.group}
                        </span>
                      </div>
                      <span
                        className="text-lg tabular-nums font-medium"
                        style={{
                          fontFamily: "var(--font-display)",
                          color:
                            pct >= 92
                              ? "var(--accent-green)"
                              : "var(--accent-red)",
                        }}
                      >
                        {pct.toFixed(1)}%
                      </span>
                    </div>

                    {/* Bottom row: stats */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: "var(--text-muted)" }}>
                      <span>
                        Avg:{" "}
                        <span style={{ color: "var(--text-secondary)" }}>
                          {line.avgPunctuality10y?.toFixed(1)}%
                        </span>
                      </span>
                      <span>
                        IRSAD:{" "}
                        <span style={{ color: "var(--accent-gold)" }}>
                          {seifa.toFixed(0)}
                        </span>
                      </span>
                      <span>
                        {line.stationCount} stations
                      </span>
                      <span
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
                          ? "\u2191 improving"
                          : line.trend === "declining"
                          ? "\u2193 declining"
                          : "\u2192 stable"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div
          className="flex flex-wrap gap-4 sm:gap-8 mt-4 text-xs"
          style={{ color: "var(--text-muted)" }}
        >
          <span className="flex items-center gap-2">
            <span
              className="w-px h-4"
              style={{ background: "var(--accent-red)" }}
            />
            92% target
          </span>
          <span>
            Punctuality = FY 2024-25
          </span>
          <span>
            Avg = all-time average
          </span>
        </div>

        {/* Data source note */}
        <p className="text-xs mt-8" style={{ color: "var(--text-muted)" }}>
          Performance data: Victorian Government Power BI dashboards (official
          PTV data). SEIFA: ABS IRSAD 2021 Census. Trend based on linear
          regression across all available years. All data extracted programmatically.
        </p>
      </div>
    </div>
  );
}
