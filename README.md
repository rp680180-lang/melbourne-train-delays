# Melbourne Train Delays vs Suburb Wealth

An interactive data analysis exploring whether wealthier Melbourne suburbs get better train service.

## The Question

Melbourne's 16 metropolitan train lines serve suburbs ranging from some of Australia's wealthiest to its most disadvantaged. Do lines serving wealthier areas experience fewer delays?

## What This Project Does

1. **Collects** train punctuality data by line from PTV (Public Transport Victoria)
2. **Maps** each train station to its suburb's socioeconomic score (ABS SEIFA 2021)
3. **Analyses** the correlation between line-level wealth and service quality
4. **Presents** findings in an interactive web dashboard with charts and maps

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
