#!/usr/bin/env python3
"""
Extract Melbourne metro train line-by-line performance data from
Victorian Government Power BI dashboards.

Outputs: pipeline/output/performance_data.json
"""

import json
import gzip
import os
import time
import uuid
import csv
from datetime import datetime
from urllib.request import Request, urlopen

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "output")
API_CLUSTER = "https://wabi-australia-southeast-api.analysis.windows.net"


def query(rk, mid, sq):
    """Execute a Power BI semantic query."""
    url = f"{API_CLUSTER}/public/reports/querydata?synchronous=true"
    payload = {
        "version": "1.0.0",
        "queries": [
            {
                "Query": {"Commands": [{"SemanticQueryDataShapeCommand": sq}]},
                "QueryId": "",
                "ApplicationContext": {
                    "DatasetId": "",
                    "Sources": [{"ReportId": "", "VisualId": ""}],
                },
            }
        ],
        "cancelQueries": [],
        "modelId": mid,
        "userPreferredLocale": "en-AU",
        "resourceKey": rk,
    }
    headers = {
        "Content-Type": "application/json;charset=UTF-8",
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-PowerBI-ResourceKey": rk,
        "ActivityId": str(uuid.uuid4()),
        "RequestId": str(uuid.uuid4()),
        "Origin": "https://app.powerbi.com",
        "Referer": "https://app.powerbi.com/",
    }
    body = json.dumps(payload).encode()
    req = Request(url, data=body, headers=headers, method="POST")
    with urlopen(req, timeout=60) as resp:
        raw = resp.read()
        if raw[:2] == b"\x1f\x8b":
            raw = gzip.decompress(raw)
        return json.loads(raw)


def parse_rows(result):
    """Parse Power BI DSR format into rows, resolving ValueDicts and R-bits."""
    ds = result["results"][0]["result"]["data"]["dsr"]["DS"][0]
    vd = ds.get("ValueDicts", {})
    dm = ds["PH"][0]["DM0"]

    rows = []
    prev_c = None
    for item in dm:
        c = list(item.get("C", []))
        r_bits = item.get("R", 0)

        if r_bits and prev_c:
            merged = list(c)
            c_idx = 0
            full = []
            for pos in range(len(prev_c)):
                if r_bits & (1 << pos):
                    full.append(prev_c[pos])
                else:
                    if c_idx < len(merged):
                        full.append(merged[c_idx])
                        c_idx += 1
                    else:
                        full.append(None)
            c = full

        # Resolve ValueDict references
        resolved = list(c)
        for i, val in enumerate(resolved):
            dk = f"D{i}"
            if dk in vd and isinstance(val, int) and 0 <= val < len(vd[dk]):
                resolved[i] = vd[dk][val]

        rows.append(resolved)
        prev_c = c

    return rows


def epoch_to_fy(epoch_ms):
    """Convert epoch milliseconds to Australian financial year string."""
    dt = datetime.utcfromtimestamp(epoch_ms / 1000)
    # FY starts July 1, so Jul 2015 = FY 2015-2016
    if dt.month >= 7:
        return f"{dt.year}-{dt.year + 1}"
    else:
        return f"{dt.year - 1}-{dt.year}"


def extract_post_2022():
    """Extract post-2022 data (FY 2021-22 to 2025-26)."""
    print("Extracting post-2022 data...")
    rk = "5d509001-0065-488e-ac78-28a9343e79f1"
    mid = 4949687

    result = query(rk, mid, {
        "Query": {
            "Version": 2,
            "From": [
                {"Name": "l", "Entity": "vw_line_dim", "Type": 0},
                {"Name": "d", "Entity": "vw_date_dim", "Type": 0},
                {"Name": "p", "Entity": "Performance measures - Metro", "Type": 0},
            ],
            "Select": [
                {"Column": {"Expression": {"SourceRef": {"Source": "l"}}, "Property": "Line_Name"}, "Name": "Line"},
                {"Column": {"Expression": {"SourceRef": {"Source": "d"}}, "Property": "Financial_Year_Name"}, "Name": "FY"},
                {"Measure": {"Expression": {"SourceRef": {"Source": "p"}}, "Property": "% ontime (Train|dest)"}, "Name": "Punct"},
                {"Measure": {"Expression": {"SourceRef": {"Source": "p"}}, "Property": "% TT delivered (Train)"}, "Name": "Reliab"},
                {"Measure": {"Expression": {"SourceRef": {"Source": "p"}}, "Property": "% cancelled (Train)"}, "Name": "Cancel"},
            ],
        },
        "Binding": {
            "Primary": {"Groupings": [{"Projections": [0, 1, 2, 3, 4]}]},
            "DataReduction": {"DataVolume": 6, "Primary": {"Window": {"Count": 30000}}},
            "Version": 1,
        },
    })

    rows = parse_rows(result)
    data = []
    for row in rows:
        if len(row) >= 5:
            data.append({
                "line": row[0],
                "financial_year": row[1],
                "punctuality_pct": round(float(row[2]) * 100, 2),
                "reliability_pct": round(float(row[3]) * 100, 2),
                "cancelled_pct": round(float(row[4]) * 100, 2),
            })
    print(f"  Got {len(data)} rows ({len(set(r['line'] for r in data))} lines, {len(set(r['financial_year'] for r in data))} FYs)")
    return data


def extract_pre_2022():
    """Extract pre-2022 data by Route x Financial Year."""
    print("Extracting pre-2022 data...")
    rk = "5cc9cc2b-92a9-4718-a086-fc9248fe0e2f"
    mid = 3478733

    result = query(rk, mid, {
        "Query": {
            "Version": 2,
            "From": [
                {"Name": "m", "Entity": "Metro data", "Type": 0},
                {"Name": "c", "Entity": "Calendar", "Type": 0},
            ],
            "Select": [
                {"Column": {"Expression": {"SourceRef": {"Source": "m"}}, "Property": "Route"}, "Name": "Route"},
                {"Column": {"Expression": {"SourceRef": {"Source": "c"}}, "Property": "Financial Year"}, "Name": "FY"},
                {"Measure": {"Expression": {"SourceRef": {"Source": "m"}}, "Property": "% ontime (Train|dest)"}, "Name": "Punct"},
                {"Measure": {"Expression": {"SourceRef": {"Source": "m"}}, "Property": "% TT delivered (Train)"}, "Name": "Reliab"},
            ],
        },
        "Binding": {
            "Primary": {"Groupings": [{"Projections": [0, 1, 2, 3]}]},
            "DataReduction": {"DataVolume": 6, "Primary": {"Window": {"Count": 30000}}},
            "Version": 1,
        },
    })

    rows = parse_rows(result)
    data = []
    for row in rows:
        if len(row) >= 4:
            fy_epoch = row[1]
            fy_str = epoch_to_fy(fy_epoch) if isinstance(fy_epoch, (int, float)) else str(fy_epoch)
            punct = row[2]
            reliab = row[3]

            # Some rows may have no data (null measures)
            if punct is not None and punct != "":
                data.append({
                    "line": row[0],
                    "financial_year": fy_str,
                    "punctuality_pct": round(float(punct) * 100, 2),
                    "reliability_pct": round(float(reliab) * 100, 2) if reliab else None,
                    "cancelled_pct": None,  # Not available in pre-2022
                })

    # Filter to only rows with valid data
    data = [r for r in data if r["punctuality_pct"] > 0]
    fys = sorted(set(r["financial_year"] for r in data))
    print(f"  Got {len(data)} rows ({len(set(r['line'] for r in data))} lines, {len(fys)} FYs)")
    print(f"  FY range: {fys[0]} to {fys[-1]}")
    return data


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Extract from both dashboards
    pre_data = extract_pre_2022()
    time.sleep(1)
    post_data = extract_post_2022()

    # Merge: post-2022 data takes precedence for overlapping FY 2021-2022
    post_keys = {(r["line"], r["financial_year"]) for r in post_data}
    merged = [r for r in pre_data if (r["line"], r["financial_year"]) not in post_keys]
    merged.extend(post_data)

    # Sort by line and FY
    merged.sort(key=lambda r: (r["line"], r["financial_year"]))

    # Save JSON
    json_path = os.path.join(OUTPUT_DIR, "performance_data.json")
    with open(json_path, "w") as f:
        json.dump(merged, f, indent=2)

    # Save CSV
    csv_path = os.path.join(OUTPUT_DIR, "performance_data.csv")
    with open(csv_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["line", "financial_year", "punctuality_pct", "reliability_pct", "cancelled_pct"])
        writer.writeheader()
        writer.writerows(merged)

    # Summary
    lines = sorted(set(r["line"] for r in merged))
    fys = sorted(set(r["financial_year"] for r in merged))
    print(f"\n{'='*60}")
    print(f"MERGED: {len(merged)} rows")
    print(f"  Lines ({len(lines)}): {lines}")
    print(f"  FYs ({len(fys)}): {fys}")
    print(f"  Saved to {json_path}")
    print(f"  Saved to {csv_path}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
