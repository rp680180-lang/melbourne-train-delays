# Track Record — Melbourne Metro Punctuality Dashboard

A dashboard of 26 years of Melbourne metro train punctuality, line by line, with socioeconomic indicators from the ABS SEIFA index.

## What This Project Does

1. **Collects** train punctuality data by line from PTV (Public Transport Victoria)
2. **Maps** each train station to its suburb's IRSAD score (ABS SEIFA 2021)
3. **Analyses** the correlation between per-line IRSAD score and punctuality
4. **Presents** the data in an interactive web dashboard with charts

## Data Sources

- **Train Performance**: PTV monthly performance reports and Power BI dashboards
- **Socioeconomic Data**: ABS SEIFA 2021 (Index of Relative Socio-economic Advantage and Disadvantage)
- **Station/Line Data**: PTV GTFS static feed

## Project Structure

```
data-pipeline/     # Python scripts for data collection and analysis
web/               # Next.js interactive dashboard
```

## Running the Data Pipeline

```bash
cd data-pipeline
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python scripts/01_fetch_seifa.py
python scripts/02_fetch_gtfs.py
python scripts/03_scrape_powerbi.py
python scripts/04_map_stations.py
python scripts/05_compute_scores.py
python scripts/06_build_frontend_data.py
```

## Running the Web App

```bash
cd web
npm install
npm run dev
```

## License

MIT
