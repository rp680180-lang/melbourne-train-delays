"""
Compute per-line wealth scores from station-suburb SEIFA data.
"""
import os
import json
import numpy as np
import pandas as pd

PROCESSED_DIR = os.path.join(os.path.dirname(__file__), '..', 'processed')


def weighted_median(values, weights):
    """Compute weighted median."""
    sorted_idx = np.argsort(values)
    sorted_vals = np.array(values)[sorted_idx]
    sorted_weights = np.array(weights)[sorted_idx]
    cumulative = np.cumsum(sorted_weights)
    cutoff = sorted_weights.sum() / 2.0
    return sorted_vals[cumulative >= cutoff][0]


def main():
    mapping = pd.read_csv(os.path.join(PROCESSED_DIR, 'station_suburb_mapping.csv'))

    # Filter to non-CBD stations with SEIFA data
    data = mapping[(~mapping['is_cbd']) & (mapping['irsad_score'].notna())].copy()

    print(f"Processing {len(data)} station-suburb records across {data['line_name'].nunique()} lines\n")

    results = []
    for line_name in sorted(data['line_name'].unique()):
        line_data = data[data['line_name'] == line_name]

        # Get unique suburbs on this line (avoid double-counting)
        suburbs = line_data.drop_duplicates(subset=['suburb'])

        scores = suburbs['irsad_score'].values
        populations = suburbs['population'].fillna(1).values

        # Population-weighted median
        w_median = weighted_median(scores, populations)

        results.append({
            'line_name': line_name,
            'irsad_weighted_median': round(float(w_median), 1),
            'irsad_mean': round(float(scores.mean()), 1),
            'irsad_min': round(float(scores.min()), 1),
            'irsad_max': round(float(scores.max()), 1),
            'irsad_std': round(float(scores.std()), 1),
            'station_count': len(line_data),
            'suburb_count': len(suburbs),
            'suburbs': sorted(suburbs['suburb'].tolist())
        })

    df = pd.DataFrame(results)
    df = df.sort_values('irsad_weighted_median', ascending=False)

    print("Per-line SEIFA scores (by weighted median IRSAD):")
    print(f"{'Line':<20s} {'W.Median':>8s} {'Mean':>8s} {'Min':>8s} {'Max':>8s} {'Stations':>8s}")
    print("-" * 72)
    for _, row in df.iterrows():
        print(f"{row['line_name']:<20s} {row['irsad_weighted_median']:>8.1f} {row['irsad_mean']:>8.1f} "
              f"{row['irsad_min']:>8.1f} {row['irsad_max']:>8.1f} {row['station_count']:>8d}")

    output_path = os.path.join(PROCESSED_DIR, 'line_seifa_scores.csv')
    df.to_csv(output_path, index=False)
    print(f"\nSaved to {output_path}")


if __name__ == '__main__':
    main()
