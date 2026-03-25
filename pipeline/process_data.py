#!/usr/bin/env python3
"""
Process extracted performance data + SEIFA wealth scores into
analysis-ready JSON for the web frontend.

Inputs:
  - pipeline/output/performance_data.json (from extract_data.py)
  - web/data/lineDetails.json (existing SEIFA station data)
  - web/data/correlationData.json (existing line colors)

Outputs (to web/data/):
  - performanceTimeSeries.json - all lines x all FYs
  - correlationByYear.json - wealth vs punctuality for each FY
  - summary.json - updated summary stats
  - methodology.json - updated methodology
"""

import json
import math
import os
import statistics

PIPELINE_DIR = os.path.dirname(__file__)
WEB_DATA_DIR = os.path.join(PIPELINE_DIR, "..", "web", "data")


def load_json(path):
    with open(path) as f:
        return json.load(f)


def save_json(path, data):
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
    print(f"  Saved {path}")


def spearman_r(x, y):
    """Calculate Spearman rank correlation."""
    n = len(x)
    if n < 3:
        return 0, 1

    # Rank the values
    def rank(vals):
        sorted_idx = sorted(range(n), key=lambda i: vals[i])
        ranks = [0.0] * n
        i = 0
        while i < n:
            j = i
            while j < n - 1 and vals[sorted_idx[j]] == vals[sorted_idx[j + 1]]:
                j += 1
            avg_rank = (i + j) / 2.0 + 1
            for k in range(i, j + 1):
                ranks[sorted_idx[k]] = avg_rank
            i = j + 1
        return ranks

    rx = rank(x)
    ry = rank(y)

    d_sq = sum((rx[i] - ry[i]) ** 2 for i in range(n))
    rs = 1 - (6 * d_sq) / (n * (n * n - 1))

    # Approximate p-value using t-distribution
    if abs(rs) >= 1:
        return rs, 0.0
    t = rs * math.sqrt((n - 2) / (1 - rs * rs))
    # Rough p-value approximation
    df = n - 2
    p = 2 * (1 - t_cdf(abs(t), df))
    return rs, p


def t_cdf(t, df):
    """Approximate t-distribution CDF using normal for large df."""
    # Use the regularized incomplete beta function approximation
    x = df / (df + t * t)
    if df <= 1:
        return 0.5 + math.atan(t / math.sqrt(df)) / math.pi
    # Approximation via normal for df > 30
    if df > 30:
        z = t * (1 - 1 / (4 * df)) / math.sqrt(1 + t * t / (2 * df))
        return 0.5 * (1 + math.erf(z / math.sqrt(2)))
    # Simple numerical approximation for small df
    from functools import reduce
    import operator
    # Use series expansion
    a = 0.5 * df
    b = 0.5
    result = 0.5 * incomplete_beta(x, a, b)
    if t >= 0:
        return 1 - result
    return result


def incomplete_beta(x, a, b, max_iter=200):
    """Regularized incomplete beta function via continued fraction."""
    if x < 0 or x > 1:
        return 0
    if x == 0 or x == 1:
        return x

    # Use continued fraction (Lentz's method)
    lbeta = math.lgamma(a) + math.lgamma(b) - math.lgamma(a + b)
    front = math.exp(math.log(x) * a + math.log(1 - x) * b - lbeta) / a

    # Modified Lentz's method
    f = 1.0
    c = 1.0
    d = 1.0 - (a + b) * x / (a + 1)
    if abs(d) < 1e-30:
        d = 1e-30
    d = 1.0 / d
    f = d

    for m in range(1, max_iter):
        # Even step
        numerator = m * (b - m) * x / ((a + 2 * m - 1) * (a + 2 * m))
        d = 1.0 + numerator * d
        if abs(d) < 1e-30:
            d = 1e-30
        c = 1.0 + numerator / c
        if abs(c) < 1e-30:
            c = 1e-30
        d = 1.0 / d
        f *= c * d

        # Odd step
        numerator = -(a + m) * (a + b + m) * x / ((a + 2 * m) * (a + 2 * m + 1))
        d = 1.0 + numerator * d
        if abs(d) < 1e-30:
            d = 1e-30
        c = 1.0 + numerator / c
        if abs(c) < 1e-30:
            c = 1e-30
        d = 1.0 / d
        delta = c * d
        f *= delta

        if abs(delta - 1.0) < 1e-10:
            break

    return front * f


# Line colors from Metro Trains branding
LINE_COLORS = {
    "Alamein": "#152C6B",
    "Belgrave": "#152C6B",
    "Cranbourne": "#34ACE1",
    "Craigieburn": "#FFBE00",
    "Frankston": "#028430",
    "Glen Waverley": "#152C6B",
    "Hurstbridge": "#BE1014",
    "Lilydale": "#152C6B",
    "Mernda": "#BE1014",
    "Pakenham": "#34ACE1",
    "Sandringham": "#F178AF",
    "Stony Point": "#028430",
    "Sunbury": "#34ACE1",
    "Upfield": "#FFBE00",
    "Werribee": "#F178AF",
    "Williamstown": "#F178AF",
}

# Line groups
LINE_GROUPS = {
    "Burnley": ["Alamein", "Belgrave", "Glen Waverley", "Lilydale"],
    "Clifton Hill": ["Hurstbridge", "Mernda"],
    "Caulfield": ["Cranbourne", "Frankston", "Pakenham", "Sandringham", "Stony Point"],
    "Northern": ["Craigieburn", "Sunbury", "Upfield"],
    "Cross City": ["Werribee", "Williamstown"],
}


def main():
    # Load data
    perf_data = load_json(os.path.join(PIPELINE_DIR, "output", "performance_data.json"))
    line_details = load_json(os.path.join(WEB_DATA_DIR, "lineDetails.json"))

    # Compute SEIFA score per line (population-weighted median from existing data)
    line_seifa = {}
    for line_name, stations in line_details.items():
        scores = [s["irsadScore"] for s in stations if s.get("irsadScore")]
        if scores:
            line_seifa[line_name] = round(statistics.median(scores), 1)

    print(f"Loaded {len(perf_data)} performance rows")
    print(f"SEIFA data for {len(line_seifa)} lines")

    # Get unique lines and FYs
    all_lines = sorted(set(r["line"] for r in perf_data))
    all_fys = sorted(set(r["financial_year"] for r in perf_data))
    print(f"Lines: {all_lines}")
    print(f"FYs: {all_fys}")

    # ── 1. Performance Time Series ──
    print("\n1. Building time series...")
    time_series = {}
    for line in all_lines:
        line_data = [r for r in perf_data if r["line"] == line]
        line_data.sort(key=lambda r: r["financial_year"])
        time_series[line] = {
            "color": LINE_COLORS.get(line, "#666666"),
            "seifaScore": line_seifa.get(line),
            "group": next((g for g, lines in LINE_GROUPS.items() if line in lines), "Other"),
            "years": [
                {
                    "fy": r["financial_year"],
                    "punctuality": r["punctuality_pct"],
                    "reliability": r.get("reliability_pct"),
                    "cancelled": r.get("cancelled_pct"),
                }
                for r in line_data
            ],
        }
    save_json(os.path.join(WEB_DATA_DIR, "performanceTimeSeries.json"), time_series)

    # ── 2. Correlation by Year ──
    print("\n2. Computing correlations by year...")
    # All FYs, exclude Stony Point (outlier rural line)
    recent_fys = all_fys
    analysis_lines = [l for l in all_lines if l != "Stony Point" and l in line_seifa]

    correlations_by_year = {}
    for fy in recent_fys:
        fy_data = [r for r in perf_data if r["financial_year"] == fy and r["line"] in analysis_lines]
        if len(fy_data) < 5:
            continue

        points = []
        seifa_vals = []
        punct_vals = []
        for r in fy_data:
            seifa = line_seifa.get(r["line"])
            if seifa and r["punctuality_pct"]:
                points.append({
                    "line": r["line"],
                    "seifa": seifa,
                    "punctuality": r["punctuality_pct"],
                    "reliability": r.get("reliability_pct"),
                    "cancelled": r.get("cancelled_pct"),
                    "color": LINE_COLORS.get(r["line"], "#666"),
                })
                seifa_vals.append(seifa)
                punct_vals.append(r["punctuality_pct"])

        if len(seifa_vals) >= 5:
            r_val, p_val = spearman_r(seifa_vals, punct_vals)
            # Linear regression
            n = len(seifa_vals)
            x_mean = sum(seifa_vals) / n
            y_mean = sum(punct_vals) / n
            ss_xy = sum((x - x_mean) * (y - y_mean) for x, y in zip(seifa_vals, punct_vals))
            ss_xx = sum((x - x_mean) ** 2 for x in seifa_vals)
            slope = ss_xy / ss_xx if ss_xx else 0
            intercept = y_mean - slope * x_mean

            correlations_by_year[fy] = {
                "points": points,
                "spearmanR": round(r_val, 4),
                "spearmanP": round(p_val, 4),
                "significant": p_val < 0.05,
                "slope": round(slope, 6),
                "intercept": round(intercept, 2),
                "n": n,
            }

    # Add "All Years" combined entry using average punctuality per line
    all_years_points = []
    all_years_seifa = []
    all_years_punct = []
    for line in analysis_lines:
        line_rows = [r for r in perf_data if r["line"] == line]
        if not line_rows:
            continue
        seifa = line_seifa.get(line)
        if not seifa:
            continue
        avg_p = statistics.mean([r["punctuality_pct"] for r in line_rows])
        avg_r = statistics.mean([r["reliability_pct"] for r in line_rows if r.get("reliability_pct")])
        all_years_points.append({
            "line": line,
            "seifa": seifa,
            "punctuality": round(avg_p, 2),
            "reliability": round(avg_r, 2),
            "cancelled": None,
            "color": LINE_COLORS.get(line, "#666"),
        })
        all_years_seifa.append(seifa)
        all_years_punct.append(avg_p)

    if len(all_years_seifa) >= 5:
        r_val, p_val = spearman_r(all_years_seifa, all_years_punct)
        n = len(all_years_seifa)
        x_mean = sum(all_years_seifa) / n
        y_mean = sum(all_years_punct) / n
        ss_xy = sum((x - x_mean) * (y - y_mean) for x, y in zip(all_years_seifa, all_years_punct))
        ss_xx = sum((x - x_mean) ** 2 for x in all_years_seifa)
        slope = ss_xy / ss_xx if ss_xx else 0
        intercept = y_mean - slope * x_mean
        correlations_by_year["All Years"] = {
            "points": all_years_points,
            "spearmanR": round(r_val, 4),
            "spearmanP": round(p_val, 4),
            "significant": p_val < 0.05,
            "slope": round(slope, 6),
            "intercept": round(intercept, 2),
            "n": n,
        }

    save_json(os.path.join(WEB_DATA_DIR, "correlationByYear.json"), correlations_by_year)

    # Print correlation summary
    print("\n  Correlation summary (Spearman r):")
    for fy in sorted(correlations_by_year.keys()):
        c = correlations_by_year[fy]
        sig = "*" if c["significant"] else " "
        print(f"    {fy}: r={c['spearmanR']:+.3f} p={c['spearmanP']:.3f} {sig}")

    # ── 3. Updated Summary ──
    print("\n3. Building summary...")
    # Use most recent complete FY (2024-2025)
    latest_fy = "2024-2025"
    latest_data = [r for r in perf_data if r["financial_year"] == latest_fy]
    latest_with_seifa = [
        {**r, "seifa": line_seifa.get(r["line"])}
        for r in latest_data
        if r["line"] in line_seifa and r["line"] != "Stony Point"
    ]

    best = max(latest_with_seifa, key=lambda r: r["punctuality_pct"])
    worst = min(latest_with_seifa, key=lambda r: r["punctuality_pct"])
    wealthiest = max(latest_with_seifa, key=lambda r: r["seifa"])
    least_wealthy = min(latest_with_seifa, key=lambda r: r["seifa"])

    avg_punct = statistics.mean([r["punctuality_pct"] for r in latest_with_seifa])
    avg_seifa = statistics.mean([r["seifa"] for r in latest_with_seifa])

    # Overall correlation across all years
    all_seifa = [line_seifa[r["line"]] for r in perf_data if r["line"] in line_seifa and r["line"] != "Stony Point"]
    all_punct = [r["punctuality_pct"] for r in perf_data if r["line"] in line_seifa and r["line"] != "Stony Point"]
    overall_r, overall_p = spearman_r(all_seifa, all_punct)

    # Count significant years
    sig_years = sum(1 for c in correlations_by_year.values() if c["significant"])
    total_years = len(correlations_by_year)

    summary = {
        "latestPeriod": f"FY {latest_fy}",
        "dataRange": f"FY {all_fys[0]} to FY {all_fys[-1]}",
        "totalYears": len(all_fys),
        "lineCount": len(all_lines),
        "overallSpearmanR": round(overall_r, 4),
        "overallSpearmanP": round(overall_p, 4),
        "significantYears": sig_years,
        "totalAnalyzedYears": total_years,
        "correlationDirection": "positive" if overall_r > 0 else "negative",
        "correlationStrength": (
            "strong" if abs(overall_r) > 0.6
            else "moderate" if abs(overall_r) > 0.3
            else "weak"
        ),
        "bestLine": {"name": best["line"], "punctualityPct": best["punctuality_pct"]},
        "worstLine": {"name": worst["line"], "punctualityPct": worst["punctuality_pct"]},
        "wealthiestLine": {"name": wealthiest["line"], "irsadScore": wealthiest["seifa"]},
        "leastWealthyLine": {"name": least_wealthy["line"], "irsadScore": least_wealthy["seifa"]},
        "networkAvgPunctuality": round(avg_punct, 1),
        "networkAvgSeifa": round(avg_seifa, 1),
        "punctualityGap": round(best["punctuality_pct"] - worst["punctuality_pct"], 1),
        "seifaGap": round(wealthiest["seifa"] - least_wealthy["seifa"], 1),
    }
    save_json(os.path.join(WEB_DATA_DIR, "summary.json"), summary)

    # ── 4. Line Comparison (updated with all years) ──
    print("\n4. Building line comparison...")
    line_comparison = []
    for line in all_lines:
        line_data = [r for r in perf_data if r["line"] == line]
        recent = line_data  # Use all years
        latest = next((r for r in line_data if r["financial_year"] == latest_fy), None)

        avg_punct_10y = statistics.mean([r["punctuality_pct"] for r in recent]) if recent else None
        trend_data = sorted(recent, key=lambda r: r["financial_year"])

        # Calculate trend (slope over recent years)
        if len(trend_data) >= 3:
            x = list(range(len(trend_data)))
            y = [r["punctuality_pct"] for r in trend_data]
            n = len(x)
            x_mean = sum(x) / n
            y_mean = sum(y) / n
            slope = sum((xi - x_mean) * (yi - y_mean) for xi, yi in zip(x, y)) / sum((xi - x_mean) ** 2 for xi in x)
            trend = "improving" if slope > 0.2 else "declining" if slope < -0.2 else "stable"
        else:
            trend = "unknown"

        line_comparison.append({
            "name": line,
            "color": LINE_COLORS.get(line, "#666"),
            "group": next((g for g, lines in LINE_GROUPS.items() if line in lines), "Other"),
            "seifaScore": line_seifa.get(line),
            "latestPunctuality": latest["punctuality_pct"] if latest else None,
            "latestReliability": latest.get("reliability_pct") if latest else None,
            "avgPunctuality10y": round(avg_punct_10y, 1) if avg_punct_10y else None,
            "trend": trend,
            "stationCount": len(line_details.get(line, [])),
        })

    line_comparison.sort(key=lambda r: r.get("latestPunctuality") or 0, reverse=True)
    save_json(os.path.join(WEB_DATA_DIR, "lineComparison.json"), line_comparison)

    # ── 5. Updated Methodology ──
    print("\n5. Updating methodology...")
    methodology = {
        "dataSources": [
            {
                "name": "Victorian Government Power BI Dashboard (Post-2022)",
                "url": "https://www.vic.gov.au/public-transport-monthly-performance",
                "data_provided": "Line-specific monthly punctuality, reliability, and cancellation rates from January 2022 onwards",
                "extraction_method": "Programmatic extraction via Power BI embedded report API",
            },
            {
                "name": "Victorian Government Power BI Dashboard (Pre-2022)",
                "url": "https://www.vic.gov.au/public-transport-monthly-performance",
                "data_provided": "Line-specific monthly punctuality and reliability rates from July 2000 to December 2021",
                "extraction_method": "Programmatic extraction via Power BI embedded report API",
            },
            {
                "name": "ABS SEIFA 2021",
                "url": "https://www.abs.gov.au/statistics/people/people-and-communities/socio-economic-indexes-areas-seifa-australia/latest-release",
                "data_provided": "IRSAD scores by suburb (SAL geography)",
            },
            {
                "name": "PTV GTFS Static Feed",
                "url": "http://data.ptv.vic.gov.au/downloads/gtfs.zip",
                "data_provided": "Station locations and line-station mappings",
            },
        ],
        "period": f"FY {all_fys[0]} to FY {all_fys[-1]}",
        "totalDataPoints": len(perf_data),
        "punctualityDefinition": "Percentage of trains arriving within 4 min 59 sec of scheduled time at destination",
        "reliabilityDefinition": "Percentage of scheduled timetable delivered",
        "seifaSource": {
            "name": "ABS SEIFA 2021",
            "index": "IRSAD (Index of Relative Socio-economic Advantage and Disadvantage)",
            "geography": "Suburbs and Localities (SAL)",
            "year": 2021,
        },
        "methodology": {
            "wealthMetric": "Median IRSAD score of suburbs served by each line",
            "stationMapping": "Station coordinates matched to ABS Suburb boundaries",
            "cbdExclusion": "CBD stations excluded from per-line SEIFA as they are shared",
            "statisticalTest": "Spearman rank correlation (robust with small n per year)",
            "stonyPointExclusion": "Stony Point line excluded from correlation analysis (rural shuttle service, not comparable)",
            "dataExtraction": "Performance data extracted programmatically from Victorian Government Power BI dashboards via the embedded report API",
        },
        "limitations": [
            "Small sample size per year (n=15 train lines after excluding Stony Point)",
            "SEIFA scores are from 2021 Census while performance data spans 2000-2026",
            "Ecological fallacy: suburb-level wealth applied to line-level analysis",
            "Confounders not controlled: line length, distance from CBD, infrastructure age, patronage levels",
            "Stony Point excluded as a rural shuttle service with different operational characteristics",
        ],
    }
    save_json(os.path.join(WEB_DATA_DIR, "methodology.json"), methodology)

    print("\nDone!")


if __name__ == "__main__":
    main()
