#!/usr/bin/env python3
"""
Scrape Melbourne metro train line-by-line performance data from
Victorian Government Power BI dashboards.

Two dashboards with different schemas:
  - Pre-2022: Table "Metro data", column "Route", calendar "Calendar"
  - Post-2022: Table "Performance measures - Metro", dim "vw_line_dim.Line_Name",
               calendar "vw_date_dim"

Outputs: pipeline/output/powerbi_performance.csv
"""

import json
import csv
import gzip
import os
import time
import uuid
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "output")
API_CLUSTER = "https://wabi-australia-southeast-api.analysis.windows.net"


def api_request(url, resource_key, data=None):
    """Make an HTTP request with proper Power BI headers."""
    headers = {
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "X-PowerBI-ResourceKey": resource_key,
        "ActivityId": str(uuid.uuid4()),
        "RequestId": str(uuid.uuid4()),
        "Origin": "https://app.powerbi.com",
        "Referer": "https://app.powerbi.com/",
    }
    if data is not None:
        headers["Content-Type"] = "application/json;charset=UTF-8"
        body = json.dumps(data).encode("utf-8")
        req = Request(url, data=body, headers=headers, method="POST")
    else:
        req = Request(url, headers=headers, method="GET")

    try:
        with urlopen(req, timeout=60) as resp:
            raw = resp.read()
            if raw[:2] == b'\x1f\x8b':
                raw = gzip.decompress(raw)
            return json.loads(raw.decode("utf-8"))
    except HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(f"  HTTP {e.code}: {body[:500]}")
        raise


def query_data(resource_key, model_id, semantic_query):
    """Execute a semantic query against the Power BI dataset."""
    url = f"{API_CLUSTER}/public/reports/querydata?synchronous=true"
    payload = {
        "version": "1.0.0",
        "queries": [
            {
                "Query": {
                    "Commands": [
                        {"SemanticQueryDataShapeCommand": semantic_query}
                    ]
                },
                "QueryId": "",
                "ApplicationContext": {
                    "DatasetId": "",
                    "Sources": [{"ReportId": "", "VisualId": ""}],
                },
            }
        ],
        "cancelQueries": [],
        "modelId": model_id,
        "userPreferredLocale": "en-AU",
        "resourceKey": resource_key,
    }
    return api_request(url, resource_key, payload)


def parse_dsr_result(result):
    """Parse Power BI DSR format into rows, resolving ValueDicts."""
    rows = []
    try:
        data = result["results"][0]["result"]["data"]
        dsr = data.get("dsr", {})
        ds_list = dsr.get("DS", [])

        for ds in ds_list:
            value_dicts = ds.get("ValueDicts", {})
            if value_dicts:
                print(f"  ValueDicts:")
                for k, v in value_dicts.items():
                    sample = v[:8] if len(v) > 8 else v
                    print(f"    {k}: {sample}")

            ph_list = ds.get("PH", [])
            for ph in ph_list:
                dm = ph.get("DM0", [])
                prev_values = None
                for item in dm:
                    c_values = list(item.get("C", []))
                    r_bits = item.get("R", 0)

                    if prev_values and r_bits:
                        merged = list(c_values)
                        c_idx = 0
                        full = []
                        for pos in range(len(prev_values)):
                            if r_bits & (1 << pos):
                                full.append(prev_values[pos])
                            else:
                                if c_idx < len(merged):
                                    full.append(merged[c_idx])
                                    c_idx += 1
                                else:
                                    full.append(None)
                        c_values = full

                    # Resolve ValueDict references
                    resolved = []
                    for i, val in enumerate(c_values):
                        key = f"D{i}"
                        if key in value_dicts and isinstance(val, int) and 0 <= val < len(value_dicts[key]):
                            resolved.append(value_dicts[key][val])
                        else:
                            resolved.append(val)

                    rows.append(resolved)
                    prev_values = c_values  # Keep unresolved for R-bit matching

    except (KeyError, IndexError, TypeError) as e:
        print(f"  Parse error: {e}")
        import traceback
        traceback.print_exc()

    return rows


# ── Pre-2022 queries ──

def build_pre2022_yearly_query():
    """Query pre-2022: Route x Financial Year with measures."""
    return {
        "Query": {
            "Version": 2,
            "From": [
                {"Name": "m", "Entity": "Metro data", "Type": 0},
                {"Name": "c", "Entity": "Calendar", "Type": 0},
            ],
            "Select": [
                {
                    "Column": {
                        "Expression": {"SourceRef": {"Source": "m"}},
                        "Property": "Route",
                    },
                    "Name": "Metro data.Route",
                },
                {
                    "Column": {
                        "Expression": {"SourceRef": {"Source": "c"}},
                        "Property": "Financial Year",
                    },
                    "Name": "Calendar.Financial Year",
                },
                {
                    "Measure": {
                        "Expression": {"SourceRef": {"Source": "m"}},
                        "Property": "% ontime (Metro|dest)",
                    },
                    "Name": "Punctuality",
                },
                {
                    "Measure": {
                        "Expression": {"SourceRef": {"Source": "m"}},
                        "Property": "% TT delivered (Metro)",
                    },
                    "Name": "Reliability",
                },
                {
                    "Measure": {
                        "Expression": {"SourceRef": {"Source": "m"}},
                        "Property": "% cancelled (Metro)",
                    },
                    "Name": "Cancelled",
                },
            ],
        },
        "Binding": {
            "Primary": {"Groupings": [{"Projections": [0, 1, 2, 3, 4]}]},
            "DataReduction": {
                "DataVolume": 6,
                "Primary": {"Window": {"Count": 30000}},
            },
            "Version": 1,
        },
    }


def build_pre2022_monthly_query():
    """Query pre-2022: Route x Year x Month with measures."""
    return {
        "Query": {
            "Version": 2,
            "From": [
                {"Name": "m", "Entity": "Metro data", "Type": 0},
                {"Name": "c", "Entity": "Calendar", "Type": 0},
            ],
            "Select": [
                {
                    "Column": {
                        "Expression": {"SourceRef": {"Source": "m"}},
                        "Property": "Route",
                    },
                    "Name": "Metro data.Route",
                },
                {
                    "HierarchyLevel": {
                        "Expression": {
                            "Hierarchy": {
                                "Expression": {
                                    "Column": {
                                        "Expression": {"SourceRef": {"Source": "c"}},
                                        "Property": "Date",
                                    }
                                },
                                "Hierarchy": "Date Hierarchy",
                            }
                        },
                        "Level": "Year",
                    },
                    "Name": "Calendar.Year",
                },
                {
                    "HierarchyLevel": {
                        "Expression": {
                            "Hierarchy": {
                                "Expression": {
                                    "Column": {
                                        "Expression": {"SourceRef": {"Source": "c"}},
                                        "Property": "Date",
                                    }
                                },
                                "Hierarchy": "Date Hierarchy",
                            }
                        },
                        "Level": "Month",
                    },
                    "Name": "Calendar.Month",
                },
                {
                    "Measure": {
                        "Expression": {"SourceRef": {"Source": "m"}},
                        "Property": "% ontime (Metro|dest)",
                    },
                    "Name": "Punctuality",
                },
                {
                    "Measure": {
                        "Expression": {"SourceRef": {"Source": "m"}},
                        "Property": "% TT delivered (Metro)",
                    },
                    "Name": "Reliability",
                },
            ],
        },
        "Binding": {
            "Primary": {"Groupings": [{"Projections": [0, 1, 2, 3, 4]}]},
            "DataReduction": {
                "DataVolume": 6,
                "Primary": {"Window": {"Count": 30000}},
            },
            "Version": 1,
        },
    }


# ── Post-2022 queries ──

def build_post2022_yearly_query():
    """Query post-2022: Line_Name x Year with measures."""
    return {
        "Query": {
            "Version": 2,
            "From": [
                {"Name": "p", "Entity": "Performance measures - Metro", "Type": 0},
                {"Name": "l", "Entity": "vw_line_dim", "Type": 0},
                {"Name": "d", "Entity": "vw_date_dim", "Type": 0},
            ],
            "Select": [
                {
                    "Column": {
                        "Expression": {"SourceRef": {"Source": "l"}},
                        "Property": "Line_Name",
                    },
                    "Name": "vw_line_dim.Line_Name",
                },
                {
                    "HierarchyLevel": {
                        "Expression": {
                            "Hierarchy": {
                                "Expression": {
                                    "Column": {
                                        "Expression": {"SourceRef": {"Source": "d"}},
                                        "Property": "Date",
                                    }
                                },
                                "Hierarchy": "Date Hierarchy",
                            }
                        },
                        "Level": "Year",
                    },
                    "Name": "vw_date_dim.Year",
                },
                {
                    "HierarchyLevel": {
                        "Expression": {
                            "Hierarchy": {
                                "Expression": {
                                    "Column": {
                                        "Expression": {"SourceRef": {"Source": "d"}},
                                        "Property": "Date",
                                    }
                                },
                                "Hierarchy": "Date Hierarchy",
                            }
                        },
                        "Level": "Month",
                    },
                    "Name": "vw_date_dim.Month",
                },
                {
                    "Measure": {
                        "Expression": {"SourceRef": {"Source": "p"}},
                        "Property": "% ontime (Train|dest)",
                    },
                    "Name": "Punctuality",
                },
                {
                    "Measure": {
                        "Expression": {"SourceRef": {"Source": "p"}},
                        "Property": "% TT delivered (Train)",
                    },
                    "Name": "Reliability",
                },
            ],
        },
        "Binding": {
            "Primary": {"Groupings": [{"Projections": [0, 1, 2, 3, 4]}]},
            "DataReduction": {
                "DataVolume": 6,
                "Primary": {"Window": {"Count": 30000}},
            },
            "Version": 1,
        },
    }


def scrape_dashboard(label, resource_key, model_id, queries):
    """Scrape a dashboard with multiple query attempts."""
    print(f"\n{'='*60}")
    print(f"Scraping: {label} (model={model_id})")
    print(f"{'='*60}")

    for i, (qname, query_fn) in enumerate(queries):
        print(f"\n  Attempt {i+1}: {qname}")
        try:
            result = query_data(resource_key, model_id, query_fn())
            debug_path = os.path.join(OUTPUT_DIR, f"raw_{label.replace(' ', '_')}_{qname}.json")
            with open(debug_path, "w") as f:
                json.dump(result, f, indent=2)
            print(f"  Saved to {debug_path}")

            rows = parse_dsr_result(result)
            print(f"  Got {len(rows)} rows")
            if rows:
                for r in rows[:3]:
                    print(f"    {r}")
            return rows, result, qname

        except Exception as e:
            print(f"  Failed: {e}")

    return [], None, None


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    all_csv_rows = []

    # ── Pre-2022 ──
    pre_rows, pre_result, pre_qname = scrape_dashboard(
        "pre_2022",
        "5cc9cc2b-92a9-4718-a086-fc9248fe0e2f",
        3478733,
        [
            ("yearly", build_pre2022_yearly_query),
            ("monthly", build_pre2022_monthly_query),
        ],
    )

    if pre_rows and pre_qname == "yearly":
        for row in pre_rows:
            if len(row) >= 3:
                all_csv_rows.append({
                    "line": row[0],
                    "period": row[1],
                    "period_type": "financial_year",
                    "punctuality_pct": row[2],
                    "reliability_pct": row[3] if len(row) > 3 else None,
                    "cancelled_pct": row[4] if len(row) > 4 else None,
                    "source": "pre_2022",
                })
    elif pre_rows and pre_qname == "monthly":
        for row in pre_rows:
            if len(row) >= 4:
                all_csv_rows.append({
                    "line": row[0],
                    "period": f"{row[1]}-{row[2]:02d}" if isinstance(row[2], int) else f"{row[1]}-{row[2]}",
                    "period_type": "monthly",
                    "punctuality_pct": row[3],
                    "reliability_pct": row[4] if len(row) > 4 else None,
                    "cancelled_pct": None,
                    "source": "pre_2022",
                })

    time.sleep(2)

    # ── Post-2022 ──
    post_rows, post_result, post_qname = scrape_dashboard(
        "post_2022",
        "5d509001-0065-488e-ac78-28a9343e79f1",
        4949687,
        [
            ("monthly", build_post2022_yearly_query),  # year+month
        ],
    )

    if post_rows:
        for row in post_rows:
            if len(row) >= 4:
                year = row[1]
                month = row[2]
                period = f"{year}-{month:02d}" if isinstance(month, int) else f"{year}-{month}"
                all_csv_rows.append({
                    "line": row[0],
                    "period": period,
                    "period_type": "monthly",
                    "punctuality_pct": row[3],
                    "reliability_pct": row[4] if len(row) > 4 else None,
                    "cancelled_pct": None,
                    "source": "post_2022",
                })

    # Save CSV
    if all_csv_rows:
        csv_path = os.path.join(OUTPUT_DIR, "powerbi_performance.csv")
        fieldnames = ["line", "period", "period_type", "punctuality_pct", "reliability_pct", "cancelled_pct", "source"]
        with open(csv_path, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(all_csv_rows)
        print(f"\nSaved {len(all_csv_rows)} rows to {csv_path}")

        # Show unique lines and periods
        lines = sorted(set(r["line"] for r in all_csv_rows if r["line"]))
        periods = sorted(set(r["period"] for r in all_csv_rows if r["period"]))
        print(f"\nLines ({len(lines)}): {lines}")
        print(f"Periods ({len(periods)}): {periods[:10]}...{periods[-5:]}")
    else:
        print("\nNo data extracted!")

    print(f"\n{'='*60}")
    print(f"TOTAL: {len(all_csv_rows)} rows")
    print(f"  Pre-2022: {len(pre_rows)} rows")
    print(f"  Post-2022: {len(post_rows)} rows")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
