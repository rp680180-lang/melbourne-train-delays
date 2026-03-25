"""
Fetch ABS SEIFA 2021 data for Victorian suburbs.
Downloads the SEIFA by Suburbs and Localities Excel file and extracts
IRSAD scores for Victorian SALs.
"""
import os
import requests
import pandas as pd

RAW_DIR = os.path.join(os.path.dirname(__file__), '..', 'raw')
PROCESSED_DIR = os.path.join(os.path.dirname(__file__), '..', 'processed')

SEIFA_URL = "https://www.abs.gov.au/statistics/people/people-and-communities/socio-economic-indexes-areas-seifa-australia/2021/Suburbs%20and%20Localities%2C%20Indexes%2C%20SEIFA%202021.xlsx"

def main():
    os.makedirs(RAW_DIR, exist_ok=True)
    os.makedirs(PROCESSED_DIR, exist_ok=True)

    excel_path = os.path.join(RAW_DIR, 'seifa_2021_sal.xlsx')
    if not os.path.exists(excel_path):
        print("Downloading SEIFA 2021 data...")
        resp = requests.get(SEIFA_URL, timeout=60)
        resp.raise_for_status()
        with open(excel_path, 'wb') as f:
            f.write(resp.content)
        print(f"Downloaded ({len(resp.content) / 1024:.0f} KB)")
    else:
        print(f"Using cached {excel_path}")

    # Table 1 has the summary with Score and Decile for all 4 indexes
    # Header is at row 5 (0-indexed), but the row above (4) has the index group names
    # Row 5 columns: SAL Code, SAL Name, Score, Decile, Score, Decile, Score, Decile, Score, Decile, Population
    print("Parsing Table 1...")
    df = pd.read_excel(excel_path, sheet_name='Table 1', header=5)

    # The columns after header row 5 are:
    # 0: SAL Code, 1: SAL Name, 2: IRSD Score, 3: IRSD Decile,
    # 4: IRSAD Score, 5: IRSAD Decile, 6: IER Score, 7: IER Decile,
    # 8: IEO Score, 9: IEO Decile, 10: Population
    # But pandas may name duplicates as 'Score', 'Decile', 'Score.1', 'Decile.1', etc.
    cols = list(df.columns)
    print(f"Columns: {cols}")

    # Rename to explicit names
    df.columns = ['sal_code', 'sal_name', 'irsd_score', 'irsd_decile',
                   'irsad_score', 'irsad_decile', 'ier_score', 'ier_decile',
                   'ieo_score', 'ieo_decile', 'population']

    # Drop rows where sal_code is not numeric (footer notes etc.)
    df['sal_code'] = pd.to_numeric(df['sal_code'], errors='coerce')
    df = df.dropna(subset=['sal_code'])
    df['sal_code'] = df['sal_code'].astype(int)

    # Filter to Victorian SALs (codes 20001-29999)
    vic = df[(df['sal_code'] >= 20001) & (df['sal_code'] <= 29999)].copy()

    # Keep key columns
    vic = vic[['sal_code', 'sal_name', 'irsad_score', 'irsad_decile',
               'ier_score', 'population']].copy()

    # Ensure numeric
    for col in ['irsad_score', 'irsad_decile', 'ier_score', 'population']:
        vic[col] = pd.to_numeric(vic[col], errors='coerce')

    vic = vic.dropna(subset=['irsad_score'])

    print(f"Found {len(vic)} Victorian SALs")
    print(f"IRSAD score range: {vic['irsad_score'].min():.1f} - {vic['irsad_score'].max():.1f}")
    print(f"\nSample data:")
    print(vic.head(10).to_string())

    output_path = os.path.join(PROCESSED_DIR, 'seifa_vic_sal.csv')
    vic.to_csv(output_path, index=False)
    print(f"\nSaved to {output_path}")

if __name__ == '__main__':
    main()
