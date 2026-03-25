"""
Fetch PTV GTFS static data and extract metro train stations, lines, and geometries.
"""
import os
import io
import csv
import json
import zipfile
import requests

RAW_DIR = os.path.join(os.path.dirname(__file__), '..', 'raw')
PROCESSED_DIR = os.path.join(os.path.dirname(__file__), '..', 'processed')

GTFS_URL = "http://data.ptv.vic.gov.au/downloads/gtfs.zip"

def main():
    os.makedirs(RAW_DIR, exist_ok=True)
    os.makedirs(PROCESSED_DIR, exist_ok=True)

    # Download GTFS zip
    gtfs_path = os.path.join(RAW_DIR, 'gtfs.zip')
    if not os.path.exists(gtfs_path):
        print("Downloading PTV GTFS data...")
        resp = requests.get(GTFS_URL, timeout=120)
        resp.raise_for_status()
        with open(gtfs_path, 'wb') as f:
            f.write(resp.content)
        print(f"Downloaded ({len(resp.content) / 1024 / 1024:.1f} MB)")
    else:
        print(f"Using cached {gtfs_path}")

    # The GTFS zip contains multiple sub-zips, one per mode
    # Metro train is typically in a folder/zip like "2/" or "metro/"
    print("\nExploring GTFS zip structure...")
    with zipfile.ZipFile(gtfs_path) as zf:
        names = zf.namelist()
        # Find the metro train folder - it's typically folder "2/" in PTV data
        folders = set()
        for name in names:
            parts = name.split('/')
            if len(parts) > 1:
                folders.add(parts[0])
        print(f"Top-level folders/files: {sorted(folders)}")

        # PTV GTFS structure: numbered folders (1=tram, 2=metro train, 3=bus, etc.)
        # Or it might contain sub-zips
        metro_prefix = None

        # Check if there are sub-zips
        sub_zips = [n for n in names if n.endswith('.zip')]
        if sub_zips:
            print(f"Found sub-zips: {sub_zips}")
            # Find the metro train one (usually "2" or contains "metro")
            for sz in sub_zips:
                if '2' in sz.split('/')[0] or 'metro' in sz.lower() or 'train' in sz.lower():
                    print(f"Using sub-zip: {sz}")
                    # Extract the sub-zip
                    sub_zip_data = zf.read(sz)
                    sub_zip_path = os.path.join(RAW_DIR, 'gtfs_metro.zip')
                    with open(sub_zip_path, 'wb') as f:
                        f.write(sub_zip_data)
                    # Process the sub-zip
                    process_gtfs_zip(sub_zip_path)
                    return

        # Check for direct numbered folders
        for folder in sorted(folders):
            # Folder "2" is typically metro train in PTV data
            if folder == '2':
                metro_prefix = '2/'
                break

        if metro_prefix is None:
            # Try to identify by looking at agency.txt or routes.txt
            for folder in sorted(folders):
                agency_file = f"{folder}/agency.txt"
                if agency_file in names:
                    content = zf.read(agency_file).decode('utf-8')
                    if 'metro' in content.lower() or 'train' in content.lower():
                        metro_prefix = f"{folder}/"
                        print(f"Found metro train data in folder '{folder}'")
                        break

        if metro_prefix is None:
            print("Could not identify metro train folder. Available folders:")
            for folder in sorted(folders):
                agency_file = f"{folder}/agency.txt"
                routes_file = f"{folder}/routes.txt"
                if agency_file in names:
                    content = zf.read(agency_file).decode('utf-8')
                    print(f"  {folder}/agency.txt: {content[:200]}")
            return

        print(f"\nUsing metro prefix: {metro_prefix}")

        # Extract metro train files
        metro_zip_path = os.path.join(RAW_DIR, 'gtfs_metro.zip')
        with zipfile.ZipFile(metro_zip_path, 'w') as metro_zf:
            for name in names:
                if name.startswith(metro_prefix):
                    # Write with the prefix stripped
                    new_name = name[len(metro_prefix):]
                    if new_name:
                        metro_zf.writestr(new_name, zf.read(name))

        process_gtfs_zip(metro_zip_path)


def process_gtfs_zip(zip_path):
    """Process a GTFS zip file containing metro train data."""
    print(f"\nProcessing {zip_path}...")

    with zipfile.ZipFile(zip_path) as zf:
        available = zf.namelist()
        print(f"Files: {available}")

        # Parse routes
        routes = parse_csv(zf, 'routes.txt')
        print(f"\nFound {len(routes)} routes")
        for r in routes[:5]:
            print(f"  {r.get('route_id')}: {r.get('route_long_name', r.get('route_short_name', '?'))}")

        # Parse stops - get parent stations only
        all_stops = parse_csv(zf, 'stops.txt')
        # Parent stations have location_type=1, or if not set, all stops
        parent_stops = [s for s in all_stops if s.get('location_type', '0') == '1']
        if not parent_stops:
            # No parent stations marked - use all stops
            parent_stops = [s for s in all_stops if s.get('stop_lat') and s.get('stop_lon')]
            # Deduplicate by name (remove platform-level entries)
            seen = {}
            for s in parent_stops:
                name = s['stop_name'].replace(' Railway Station', '').replace(' Station', '').strip()
                if name not in seen:
                    seen[name] = s
            parent_stops = list(seen.values())

        print(f"Found {len(parent_stops)} stations")

        # Parse trips to map routes to stops
        trips = parse_csv(zf, 'trips.txt')
        stop_times = parse_csv(zf, 'stop_times.txt')

        # Build route_id -> set of stop_ids
        trip_to_route = {t['trip_id']: t['route_id'] for t in trips}

        # Build route -> stops mapping (use stop parent if available)
        route_stops = {}
        stop_parent = {}
        for s in all_stops:
            if s.get('parent_station'):
                stop_parent[s['stop_id']] = s['parent_station']

        for st in stop_times:
            route_id = trip_to_route.get(st['trip_id'])
            if route_id:
                stop_id = stop_parent.get(st['stop_id'], st['stop_id'])
                if route_id not in route_stops:
                    route_stops[route_id] = set()
                route_stops[route_id].add(stop_id)

        # Build stop lookup
        stop_lookup = {s['stop_id']: s for s in all_stops}

        # Build lines data
        lines = []
        station_rows = []

        for route in routes:
            route_id = route['route_id']
            line_name = route.get('route_long_name', route.get('route_short_name', route_id))

            stops_for_route = route_stops.get(route_id, set())
            station_names = []

            for stop_id in stops_for_route:
                stop = stop_lookup.get(stop_id, {})
                if stop.get('stop_lat') and stop.get('stop_lon'):
                    name = stop['stop_name'].replace(' Railway Station', '').replace(' Station', '').strip()
                    station_names.append(name)
                    station_rows.append({
                        'station_id': stop_id,
                        'station_name': name,
                        'line_name': line_name,
                        'route_id': route_id,
                        'lat': float(stop['stop_lat']),
                        'lng': float(stop['stop_lon'])
                    })

            lines.append({
                'route_id': route_id,
                'line_name': line_name,
                'color': route.get('route_color', ''),
                'station_count': len(stops_for_route)
            })
            print(f"  {line_name}: {len(stops_for_route)} stations")

        # Parse shapes for map geometries
        shapes_data = {}
        if 'shapes.txt' in available:
            shapes = parse_csv(zf, 'shapes.txt')
            for s in shapes:
                shape_id = s['shape_id']
                if shape_id not in shapes_data:
                    shapes_data[shape_id] = []
                shapes_data[shape_id].append({
                    'lat': float(s['shape_pt_lat']),
                    'lng': float(s['shape_pt_lon']),
                    'seq': int(s['shape_pt_sequence'])
                })
            # Sort points by sequence
            for shape_id in shapes_data:
                shapes_data[shape_id].sort(key=lambda p: p['seq'])

        # Map routes to shapes via trips
        route_shapes = {}
        for trip in trips:
            if trip.get('shape_id') and trip['route_id'] not in route_shapes:
                route_shapes[trip['route_id']] = trip['shape_id']

        # Build GeoJSON for map
        geojson = {
            "type": "FeatureCollection",
            "features": []
        }
        for route in routes:
            shape_id = route_shapes.get(route['route_id'])
            if shape_id and shape_id in shapes_data:
                coords = [[p['lng'], p['lat']] for p in shapes_data[shape_id]]
                feature = {
                    "type": "Feature",
                    "properties": {
                        "route_id": route['route_id'],
                        "line_name": route.get('route_long_name', route.get('route_short_name', '')),
                        "color": route.get('route_color', '888888')
                    },
                    "geometry": {
                        "type": "LineString",
                        "coordinates": coords
                    }
                }
                geojson["features"].append(feature)

        # Save outputs
        # Stations CSV
        import pandas as pd
        stations_df = pd.DataFrame(station_rows)
        # Deduplicate - a station can appear on multiple lines
        stations_path = os.path.join(PROCESSED_DIR, 'stations.csv')
        stations_df.to_csv(stations_path, index=False)
        print(f"\nSaved {len(stations_df)} station-line records to {stations_path}")

        # Unique stations
        unique_stations = stations_df.drop_duplicates(subset=['station_name', 'lat', 'lng'])
        print(f"Unique stations: {len(unique_stations)}")

        # Lines JSON
        lines_path = os.path.join(PROCESSED_DIR, 'lines.json')
        with open(lines_path, 'w') as f:
            json.dump(lines, f, indent=2)
        print(f"Saved {len(lines)} lines to {lines_path}")

        # GeoJSON
        geojson_path = os.path.join(PROCESSED_DIR, 'line_shapes.geojson')
        with open(geojson_path, 'w') as f:
            json.dump(geojson, f)
        print(f"Saved {len(geojson['features'])} line shapes to {geojson_path}")


def parse_csv(zf, filename):
    """Parse a CSV file from within a zip."""
    content = zf.read(filename).decode('utf-8-sig')
    reader = csv.DictReader(io.StringIO(content))
    return list(reader)


if __name__ == '__main__':
    main()
