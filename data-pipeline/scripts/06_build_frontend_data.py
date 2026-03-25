"""
Build JSON data files for the Next.js frontend.
Joins performance data with SEIFA scores and computes correlation statistics.
"""
import os
import json
import numpy as np
import pandas as pd
from scipy import stats

PROCESSED_DIR = os.path.join(os.path.dirname(__file__), '..', 'processed')
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'output')
WEB_DATA_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'web', 'data')


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(WEB_DATA_DIR, exist_ok=True)

    # Load data
    performance = pd.read_csv(os.path.join(PROCESSED_DIR, 'train_performance.csv'))
    seifa_scores = pd.read_csv(os.path.join(PROCESSED_DIR, 'line_seifa_scores.csv'))
    station_mapping = pd.read_csv(os.path.join(PROCESSED_DIR, 'station_suburb_mapping.csv'))

    with open(os.path.join(PROCESSED_DIR, 'line_colors.json')) as f:
        line_colors = json.load(f)

    # Load manual dataset metadata
    with open(os.path.join(os.path.dirname(__file__), '..', 'raw', 'train_performance_manual.json')) as f:
        manual_meta = json.load(f)

    # Join performance with SEIFA
    merged = performance.merge(seifa_scores, on='line_name', how='inner')
    print(f"Merged {len(merged)} lines with both performance and SEIFA data")

    # === 1. Line Comparison Data ===
    line_comparison = []
    for _, row in merged.iterrows():
        line_comparison.append({
            'lineName': row['line_name'],
            'punctualityPct': round(float(row['punctuality_pct']), 1),
            'irsadScore': round(float(row['irsad_weighted_median']), 1),
            'irsadMean': round(float(row['irsad_mean']), 1),
            'irsadMin': round(float(row['irsad_min']), 1),
            'irsadMax': round(float(row['irsad_max']), 1),
            'stationCount': int(row['station_count']),
            'suburbCount': int(row['suburb_count']),
            'color': line_colors.get(row['line_name'], '#888888'),
            'source': row['source']
        })

    line_comparison.sort(key=lambda x: x['punctualityPct'], reverse=True)

    # === 2. Correlation Analysis ===
    x = merged['irsad_weighted_median'].values
    y = merged['punctuality_pct'].values

    # Spearman rank correlation
    spearman_r, spearman_p = stats.spearmanr(x, y)

    # Pearson correlation
    pearson_r, pearson_p = stats.pearsonr(x, y)

    # OLS regression
    slope, intercept, r_value, p_value, std_err = stats.linregress(x, y)

    # Regression line points
    x_range = np.linspace(x.min() - 20, x.max() + 20, 100)
    y_pred = slope * x_range + intercept

    # 95% confidence interval for regression
    n = len(x)
    x_mean = x.mean()
    se_y = np.sqrt(np.sum((y - (slope * x + intercept)) ** 2) / (n - 2))
    t_crit = stats.t.ppf(0.975, n - 2)

    ci_upper = []
    ci_lower = []
    for xi in x_range:
        se_pred = se_y * np.sqrt(1/n + (xi - x_mean)**2 / np.sum((x - x_mean)**2))
        ci_upper.append(float(slope * xi + intercept + t_crit * se_pred))
        ci_lower.append(float(slope * xi + intercept - t_crit * se_pred))

    correlation_data = {
        'points': [{
            'lineName': row['line_name'],
            'irsadScore': round(float(row['irsad_weighted_median']), 1),
            'punctualityPct': round(float(row['punctuality_pct']), 1),
            'stationCount': int(row['station_count']),
            'color': line_colors.get(row['line_name'], '#888888')
        } for _, row in merged.iterrows()],
        'regression': {
            'slope': round(float(slope), 6),
            'intercept': round(float(intercept), 2),
            'rSquared': round(float(r_value ** 2), 4),
            'line': [{'x': round(float(xi), 1), 'y': round(float(yi), 2)}
                     for xi, yi in zip(x_range, y_pred)],
            'ciUpper': [{'x': round(float(xi), 1), 'y': round(float(yi), 2)}
                        for xi, yi in zip(x_range, ci_upper)],
            'ciLower': [{'x': round(float(xi), 1), 'y': round(float(yi), 2)}
                        for xi, yi in zip(x_range, ci_lower)]
        },
        'statistics': {
            'spearmanR': round(float(spearman_r), 4),
            'spearmanP': round(float(spearman_p), 4),
            'pearsonR': round(float(pearson_r), 4),
            'pearsonP': round(float(pearson_p), 4),
            'rSquared': round(float(r_value ** 2), 4),
            'n': int(n),
            'significant': bool(spearman_p < 0.05)
        }
    }

    print(f"\n=== Correlation Results ===")
    print(f"Spearman rho = {spearman_r:.4f} (p = {spearman_p:.4f})")
    print(f"Pearson r    = {pearson_r:.4f} (p = {pearson_p:.4f})")
    print(f"R-squared    = {r_value**2:.4f}")
    print(f"Significant at 95%: {spearman_p < 0.05}")

    # === 3. Line Details ===
    line_details = {}
    for line_name in merged['line_name']:
        stations = station_mapping[
            (station_mapping['line_name'] == line_name) & (~station_mapping['is_cbd'])
        ].sort_values('irsad_score', ascending=False)

        line_details[line_name] = [{
            'stationName': row['station_name'],
            'suburb': row['suburb'],
            'irsadScore': round(float(row['irsad_score']), 1) if pd.notna(row['irsad_score']) else None,
            'irsadDecile': int(row['irsad_decile']) if pd.notna(row['irsad_decile']) else None,
            'lat': round(float(row['lat']), 6),
            'lng': round(float(row['lng']), 6)
        } for _, row in stations.iterrows()]

    # === 4. Map Data (GeoJSON) ===
    with open(os.path.join(PROCESSED_DIR, 'line_shapes.geojson')) as f:
        geojson = json.load(f)

    # Enrich GeoJSON with performance + SEIFA data
    perf_lookup = {row['line_name']: row for _, row in merged.iterrows()}
    enriched_features = []

    for feature in geojson['features']:
        line_name = feature['properties']['line_name'].split(' - ')[0].strip()
        if line_name in perf_lookup:
            row = perf_lookup[line_name]
            feature['properties']['punctualityPct'] = round(float(row['punctuality_pct']), 1)
            feature['properties']['irsadScore'] = round(float(row['irsad_weighted_median']), 1)
            feature['properties']['color'] = line_colors.get(line_name, '#888888')
            enriched_features.append(feature)

    map_geojson = {
        "type": "FeatureCollection",
        "features": enriched_features
    }

    # === 5. Summary Stats ===
    best_line = merged.loc[merged['punctuality_pct'].idxmax()]
    worst_line = merged.loc[merged['punctuality_pct'].idxmin()]
    wealthiest = merged.loc[merged['irsad_weighted_median'].idxmax()]
    poorest = merged.loc[merged['irsad_weighted_median'].idxmin()]

    summary = {
        'correlationDirection': 'positive' if spearman_r > 0 else 'negative',
        'correlationStrength': (
            'strong' if abs(spearman_r) > 0.6 else
            'moderate' if abs(spearman_r) > 0.3 else 'weak'
        ),
        'spearmanR': round(float(spearman_r), 3),
        'spearmanP': round(float(spearman_p), 4),
        'isSignificant': bool(spearman_p < 0.05),
        'bestLine': {
            'name': best_line['line_name'],
            'punctualityPct': round(float(best_line['punctuality_pct']), 1)
        },
        'worstLine': {
            'name': worst_line['line_name'],
            'punctualityPct': round(float(worst_line['punctuality_pct']), 1)
        },
        'wealthiestLine': {
            'name': wealthiest['line_name'],
            'irsadScore': round(float(wealthiest['irsad_weighted_median']), 1)
        },
        'leastWealthyLine': {
            'name': poorest['line_name'],
            'irsadScore': round(float(poorest['irsad_weighted_median']), 1)
        },
        'networkAvgPunctuality': round(float(merged['punctuality_pct'].mean()), 1),
        'networkAvgSeifa': round(float(merged['irsad_weighted_median'].mean()), 1),
        'punctualityGap': round(float(best_line['punctuality_pct'] - worst_line['punctuality_pct']), 1),
        'seifaGap': round(float(wealthiest['irsad_weighted_median'] - poorest['irsad_weighted_median']), 1),
        'period': manual_meta['metadata']['period'],
        'lineCount': int(n)
    }

    # === 6. Methodology ===
    methodology = {
        'dataSources': manual_meta['metadata']['sources'],
        'period': manual_meta['metadata']['period'],
        'punctualityDefinition': manual_meta['metadata']['punctuality_definition'],
        'seifaSource': {
            'name': 'ABS SEIFA 2021',
            'url': 'https://www.abs.gov.au/statistics/people/people-and-communities/socio-economic-indexes-areas-seifa-australia/latest-release',
            'index': 'IRSAD (Index of Relative Socio-economic Advantage and Disadvantage)',
            'geography': 'Suburbs and Localities (SAL)',
            'year': 2021
        },
        'stationData': {
            'source': 'PTV GTFS Static Feed',
            'url': 'http://data.ptv.vic.gov.au/downloads/gtfs.zip',
            'stationCount': int(station_mapping['station_name'].nunique()),
            'lineCount': 16
        },
        'methodology': {
            'wealthMetric': 'Population-weighted median IRSAD score per line',
            'stationMapping': 'Station coordinates matched to ABS Suburb boundaries',
            'cbdExclusion': 'CBD stations (Flinders St, Southern Cross, etc.) excluded from per-line SEIFA as they are shared',
            'statisticalTest': 'Spearman rank correlation (robust with small n)',
            'sampleSize': int(n)
        },
        'limitations': [
            'Small sample size (n=16 train lines) limits statistical power',
            'Some line performance data is estimated from network averages',
            'SEIFA scores are from 2021 Census while performance data is from FY 2022-23',
            'Ecological fallacy: suburb-level wealth applied to line-level analysis',
            'Confounders not controlled: line length, distance from CBD, infrastructure age',
            'Single time period analyzed - trends over time not captured'
        ],
        'dataQualityNotes': manual_meta['metadata']['notes']
    }

    # Save all files to both output/ and web/data/
    files = {
        'lineComparison.json': line_comparison,
        'correlationData.json': correlation_data,
        'lineDetails.json': line_details,
        'mapData.geojson': map_geojson,
        'summary.json': summary,
        'methodology.json': methodology
    }

    for filename, data in files.items():
        for dir_path in [OUTPUT_DIR, WEB_DATA_DIR]:
            path = os.path.join(dir_path, filename)
            with open(path, 'w') as f:
                json.dump(data, f, indent=2)

    print(f"\nSaved {len(files)} data files to output/ and web/data/")

    # Print summary
    print(f"\n=== Summary ===")
    print(f"Correlation: {summary['correlationStrength']} {summary['correlationDirection']} "
          f"(rho={summary['spearmanR']}, p={summary['spearmanP']})")
    print(f"Best line: {summary['bestLine']['name']} ({summary['bestLine']['punctualityPct']}%)")
    print(f"Worst line: {summary['worstLine']['name']} ({summary['worstLine']['punctualityPct']}%)")
    print(f"Wealthiest: {summary['wealthiestLine']['name']} (IRSAD {summary['wealthiestLine']['irsadScore']})")
    print(f"Least wealthy: {summary['leastWealthyLine']['name']} (IRSAD {summary['leastWealthyLine']['irsadScore']})")


if __name__ == '__main__':
    main()
