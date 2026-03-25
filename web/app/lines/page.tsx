"use client";

import { useState } from "react";
import lineComparison from "@/data/lineComparison.json";

type SortKey = "punctualityPct" | "irsadScore" | "lineName" | "stationCount";

export default function LinesPage() {
  const [sortKey, setSortKey] = useState<SortKey>("punctualityPct");
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = [...lineComparison].sort((a, b) => {
    const va = a[sortKey];
    const vb = b[sortKey];
    if (typeof va === "string" && typeof vb === "string")
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    return sortAsc ? (va as number) - (vb as number) : (vb as number) - (va as number);
  });

  const maxPct = Math.max(...lineComparison.map((l) => l.punctualityPct));
  const minPct = Math.min(...lineComparison.map((l) => l.punctualityPct));
  const maxSeifa = Math.max(...lineComparison.map((l) => l.irsadScore));
  const minSeifa = Math.min(...lineComparison.map((l) => l.irsadScore));

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
          socioeconomic profile. Click column headers to sort.
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
              const pctWidth =
                ((line.punctualityPct - 85) / (maxPct - 85)) * 100;
              const seifaWidth =
                ((line.irsadScore - 900) / (maxSeifa - 900)) * 100;
              return (
                <div key={line.lineName} className="grid grid-cols-[140px_1fr_1fr_60px] gap-3 items-center">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ background: line.color }}
                    />
                    <span
                      className="text-sm truncate"
                      style={{
                        color: "var(--text-primary)",
                        animationDelay: `${i * 40}ms`,
                      }}
                    >
                      {line.lineName}
                    </span>
                  </div>

                  {/* Punctuality bar */}
                  <div className="relative h-7 rounded-sm overflow-hidden" style={{ background: "var(--bg-card)" }}>
                    <div
                      className="absolute inset-y-0 left-0 rounded-sm bar-animate"
                      style={{
                        width: `${pctWidth}%`,
                        background: `linear-gradient(90deg, ${line.color}66, ${line.color})`,
                        animationDelay: `${i * 40}ms`,
                      }}
                    />
                    {/* 92% target line */}
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
                      {line.punctualityPct}%
                    </span>
                  </div>

                  {/* SEIFA bar */}
                  <div className="relative h-7 rounded-sm overflow-hidden" style={{ background: "var(--bg-card)" }}>
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
                      {line.irsadScore.toFixed(0)}
                    </span>
                  </div>

                  <span
                    className="text-xs text-right tabular-nums"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {line.stationCount} stn
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-8 mt-4 text-xs" style={{ color: "var(--text-muted)" }}>
            <span className="flex items-center gap-2">
              <span className="w-8 h-2 rounded-sm" style={{ background: "var(--text-muted)" }} />
              Punctuality %
            </span>
            <span className="flex items-center gap-2">
              <span className="w-8 h-2 rounded-sm" style={{ background: "var(--accent-gold)" }} />
              IRSAD Score
            </span>
            <span className="flex items-center gap-2">
              <span className="w-px h-4" style={{ background: "var(--accent-red)" }} />
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
                    <SortHeader label="Line" field="lineName" />
                  </th>
                  <th className="text-left p-4">
                    <SortHeader label="Punctuality" field="punctualityPct" />
                  </th>
                  <th className="text-left p-4">
                    <SortHeader label="IRSAD Score" field="irsadScore" />
                  </th>
                  <th className="text-left p-4">
                    <SortHeader label="Stations" field="stationCount" />
                  </th>
                  <th className="text-left p-4">
                    <span
                      className="text-xs uppercase tracking-wider"
                      style={{ color: "var(--text-muted)", letterSpacing: "0.12em" }}
                    >
                      SEIFA Range
                    </span>
                  </th>
                  <th className="text-left p-4">
                    <span
                      className="text-xs uppercase tracking-wider"
                      style={{ color: "var(--text-muted)", letterSpacing: "0.12em" }}
                    >
                      Data Source
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((line, i) => (
                  <tr
                    key={line.lineName}
                    className="transition-colors"
                    style={{
                      borderTop: "1px solid var(--border)",
                      background: i % 2 === 0 ? "var(--bg-primary)" : "var(--bg-secondary)",
                    }}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ background: line.color }}
                        />
                        <span style={{ color: "var(--text-primary)" }}>
                          {line.lineName}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 tabular-nums">
                      <span
                        style={{
                          color:
                            line.punctualityPct >= 92
                              ? "var(--accent-green)"
                              : "var(--accent-red)",
                        }}
                      >
                        {line.punctualityPct}%
                      </span>
                    </td>
                    <td className="p-4 tabular-nums" style={{ color: "var(--accent-gold)" }}>
                      {line.irsadScore.toFixed(0)}
                    </td>
                    <td className="p-4 tabular-nums" style={{ color: "var(--text-secondary)" }}>
                      {line.stationCount}
                    </td>
                    <td className="p-4 tabular-nums text-xs" style={{ color: "var(--text-muted)" }}>
                      {line.irsadMin.toFixed(0)} &ndash; {line.irsadMax.toFixed(0)}
                    </td>
                    <td className="p-4">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background:
                            line.source === "timeout_2023"
                              ? "var(--accent-green)"
                              : "var(--text-muted)",
                          color: "var(--bg-primary)",
                          opacity: line.source === "timeout_2023" ? 1 : 0.6,
                        }}
                      >
                        {line.source === "timeout_2023" ? "PTV cited" : "Estimated"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
