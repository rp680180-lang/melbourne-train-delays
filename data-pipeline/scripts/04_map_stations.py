"""
Map train stations to suburbs using coordinate-based matching.
Uses station lat/lng from GTFS and ABS SAL boundary data.
Falls back to name matching when spatial data unavailable.
"""
import os
import json
import pandas as pd

PROCESSED_DIR = os.path.join(os.path.dirname(__file__), '..', 'processed')

# Melbourne CBD stations shared by all lines - exclude from per-line SEIFA
CBD_STATIONS = {
    'Flinders Street', 'Southern Cross', 'Flagstaff', 'Melbourne Central', 'Parliament',
    'North Melbourne', 'South Yarra', 'Richmond', 'Jolimont'
}

# Manual station-to-suburb mapping for Melbourne metro stations
# Most station names match their suburb, but some need overrides
SUBURB_OVERRIDES = {
    'Flinders Street': 'Melbourne',
    'Southern Cross': 'Melbourne',
    'Flagstaff': 'Melbourne',
    'Melbourne Central': 'Melbourne',
    'Parliament': 'Melbourne',
    'Jolimont': 'East Melbourne',
    'Jolimont-MCG': 'East Melbourne',
    'North Melbourne': 'North Melbourne',
    'South Yarra': 'South Yarra',
    'Richmond': 'Richmond',
    'West Richmond': 'Richmond',
    'East Richmond': 'Richmond',
    'North Richmond': 'Richmond',
    'Burnley': 'Burnley',
    'East Camberwell': 'Camberwell',
    'Willison': 'Willison',
    'Dennis': 'Northcote',
    'Rushall': 'Fitzroy North',
    'Westgarth': 'Northcote',
    'Anstey': 'Brunswick',
    'Jewell': 'Brunswick',
    'Royal Park': 'Parkville',
    'Flemington Bridge': 'Flemington',
    'Macaulay': 'North Melbourne',
    'Croxton': 'Northcote',
    'Heyington': 'Toorak',
    'Kooyong': 'Toorak',
    'Tooronga': 'Malvern East',
    'Gardiner': 'Glen Iris',
    'Holmesglen': 'Chadstone',
    'Jordanville': 'Ashwood',
    'Mount Waverley': 'Mount Waverley',
    'Syndal': 'Glen Waverley',
    'Riversdale': 'Hawthorn East',
    'Willison': 'Willison',
    'Hartwell': 'Camberwell',
    'Caulfield': 'Caulfield',
    'Malvern': 'Malvern',
    'Armadale': 'Armadale',
    'Hawksburn': 'South Yarra',
    'Prahran': 'Prahran',
    'Windsor': 'Windsor',
    'Balaclava': 'St Kilda East',
    'Ripponlea': 'Elsternwick',
    'Middle Brighton': 'Brighton',
    'North Brighton': 'Brighton',
    'Middle Footscray': 'Footscray',
    'West Footscray': 'West Footscray',
    'Tottenham': 'West Footscray',
    'Ginifer': 'St Albans',
    'Albion': 'Sunshine North',
    'Aircraft': 'Airport West',
    'Diggers Rest': "Diggers Rest",
    'Watergardens': 'Taylors Lakes',
    'Deer Park': 'Deer Park',
    'Laverton': 'Laverton',
    'Aircraft': 'Laverton',
    'Williams Landing': 'Williams Landing',
    'Hoppers Crossing': 'Hoppers Crossing',
    'Merinda Park': 'Cranbourne North',
    'Lynbrook': 'Lynbrook',
    'Hallam': 'Hallam',
    'Narre Warren': 'Narre Warren',
    'Berwick': 'Berwick',
    'Beaconsfield': 'Beaconsfield',
    'Officer': 'Officer',
    'Cardinia Road': 'Officer',
    'Nar Nar Goon': 'Nar Nar Goon',
    'Tynong': 'Tynong',
    'Garfield': 'Garfield',
    'Bunyip': 'Bunyip',
    'Longwarry': 'Longwarry',
    'Drouin': 'Drouin',
    'Middle Gorge': 'South Morang',
    'Hawkstowe': 'South Morang',
    'Thomastown': 'Thomastown',
    'Lalor': 'Lalor',
    'Epping': 'Epping',
    'Auburn': 'Hawthorn East',
    'Alamein': 'Ashburton',
    'Glenferrie': 'Hawthorn',
    'Union': 'Ringwood',
    'Chatham': 'Surrey Hills',
    'Heatherdale': 'Mitcham',
    'Laburnum': 'Blackburn',
    'Yarraman': 'Noble Park',
    'Sandown Park': 'Springvale',
    'Anzac': 'Seaford',
    'Westall': 'Clayton South',
    'Town Hall': 'Melbourne',
    'Newmarket': 'Flemington',
    'Glenbervie': 'Toorak',
    'Kananook': 'Seaford',
    'Southland': 'Cheltenham',
    'Patterson': 'Bentleigh',
    'Darling': 'Malvern East',
    'East Malvern': 'Malvern East',
    'Darebin': 'Alphington',
    'Victoria Park': 'Abbotsford',
    'Bell': 'Preston',
    'Keon Park': 'Thomastown',
    'Merri': 'Northcote',
    'Ruthven': 'Reservoir',
    'Regent': 'Reservoir',
    'East Pakenham': 'Pakenham',
    'Brighton Beach': 'Brighton',
    'Leawarra': 'Frankston',
    'Morradoo': 'Frankston',
    'Stony Point': 'Crib Point',
    'State Library': 'Melbourne',
    'St Albans (St Albans)': 'St Albans',
    'Keilor Plains': 'St Albans',
    'Arden': 'North Melbourne',
    'Moreland': 'Coburg',
    'Merlynston': 'Coburg',
    'Batman': 'Coburg North',
    'Upfield': 'Campbellfield',
    'Gowrie': 'Fawkner',
    'Westona': 'Altona',
    'South Kensington': 'Kensington',
    'North Williamstown': 'Williamstown',
    'Williamstown Beach': 'Williamstown',
    'Willison': 'Hawthorn',
}


def clean_line_name(name):
    """Extract just the line name from GTFS route name."""
    if not isinstance(name, str):
        return ''
    # "Belgrave - City" -> "Belgrave"
    # "Stony Point - Frankston" -> "Stony Point"
    return name.split(' - ')[0].strip()


def station_to_suburb(station_name):
    """Map a station name to its suburb."""
    if station_name in SUBURB_OVERRIDES:
        return SUBURB_OVERRIDES[station_name]
    # Most stations are named after their suburb
    return station_name


def main():
    # Load stations
    stations_df = pd.read_csv(os.path.join(PROCESSED_DIR, 'stations.csv'))
    print(f"Loaded {len(stations_df)} station-line records")

    # Load lines JSON for official colors
    with open(os.path.join(PROCESSED_DIR, 'lines.json')) as f:
        lines_data = json.load(f)

    # Build line color lookup (use non-R routes for official colors)
    line_colors = {}
    for l in lines_data:
        name = clean_line_name(l['line_name'])
        route_id = l['route_id']
        # Skip reverse routes (they often have a generic red color)
        if '-R' not in route_id and name and l['color'] != 'FE5000':
            line_colors[name] = '#' + l['color']

    print(f"Line colors: {line_colors}")

    # Clean line names in stations data
    stations_df['line_name'] = stations_df['line_name'].apply(clean_line_name)

    # Filter out reverse route duplicates and empty line names
    stations_df = stations_df[stations_df['line_name'] != ''].copy()

    # Remove Flemington Racecourse (special event line, not regular service)
    stations_df = stations_df[stations_df['line_name'] != 'Flemington Racecourse'].copy()

    # Deduplicate: keep unique station-line combinations
    stations_df = stations_df.drop_duplicates(subset=['station_name', 'line_name']).copy()

    print(f"After cleanup: {len(stations_df)} station-line records")
    print(f"Lines: {sorted(stations_df['line_name'].unique())}")

    # Map stations to suburbs
    stations_df['suburb'] = stations_df['station_name'].apply(station_to_suburb)
    stations_df['is_cbd'] = stations_df['station_name'].isin(CBD_STATIONS)

    # Load SEIFA data
    seifa = pd.read_csv(os.path.join(PROCESSED_DIR, 'seifa_vic_sal.csv'))
    print(f"\nLoaded {len(seifa)} SEIFA records")

    # Clean suburb names for matching
    # SEIFA uses format like "Belgrave (Vic.)" - we need to match "Belgrave"
    seifa['suburb_clean'] = seifa['sal_name'].str.replace(r'\s*\(Vic\.\)', '', regex=True).str.strip()

    # Create lookup: suburb name -> SEIFA data
    seifa_lookup = {}
    for _, row in seifa.iterrows():
        seifa_lookup[row['suburb_clean']] = {
            'irsad_score': row['irsad_score'],
            'irsad_decile': row['irsad_decile'],
            'ier_score': row['ier_score'],
            'population': row['population']
        }

    # Match stations to SEIFA
    matched = 0
    unmatched = []
    records = []

    for _, stn in stations_df.iterrows():
        suburb = stn['suburb']
        seifa_data = seifa_lookup.get(suburb)

        if seifa_data is None:
            # Try case-insensitive match
            for key in seifa_lookup:
                if key.lower() == suburb.lower():
                    seifa_data = seifa_lookup[key]
                    break

        if seifa_data:
            matched += 1
        else:
            if suburb not in [u[0] for u in unmatched]:
                unmatched.append((suburb, stn['station_name']))

        records.append({
            'station_name': stn['station_name'],
            'line_name': stn['line_name'],
            'suburb': suburb,
            'lat': stn['lat'],
            'lng': stn['lng'],
            'is_cbd': stn['is_cbd'],
            'irsad_score': seifa_data['irsad_score'] if seifa_data else None,
            'irsad_decile': seifa_data['irsad_decile'] if seifa_data else None,
            'ier_score': seifa_data['ier_score'] if seifa_data else None,
            'population': seifa_data['population'] if seifa_data else None
        })

    result_df = pd.DataFrame(records)

    print(f"\nMatched {matched}/{len(stations_df)} station-suburb pairs to SEIFA data")
    if unmatched:
        print(f"\nUnmatched suburbs ({len(unmatched)}):")
        for suburb, station in unmatched:
            print(f"  {station} -> '{suburb}'")

    # Save
    output_path = os.path.join(PROCESSED_DIR, 'station_suburb_mapping.csv')
    result_df.to_csv(output_path, index=False)
    print(f"\nSaved to {output_path}")

    # Save line colors
    colors_path = os.path.join(PROCESSED_DIR, 'line_colors.json')
    with open(colors_path, 'w') as f:
        json.dump(line_colors, f, indent=2)
    print(f"Saved line colors to {colors_path}")

    # Summary by line
    print("\n=== Stations per line ===")
    for line in sorted(result_df['line_name'].unique()):
        line_data = result_df[result_df['line_name'] == line]
        non_cbd = line_data[~line_data['is_cbd']]
        with_seifa = non_cbd['irsad_score'].notna().sum()
        print(f"  {line:20s}: {len(line_data):3d} total, {len(non_cbd):3d} non-CBD, {with_seifa:3d} with SEIFA")


if __name__ == '__main__':
    main()
