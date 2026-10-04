"""Capture the official BLS CPI index distributed by FRED, without API credentials."""
import argparse
import csv
import hashlib
import io
import json
import math
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen


def convert(raw, captured_at):
    now = datetime.fromisoformat(captured_at.replace('Z', '+00:00'))
    reader = csv.DictReader(io.StringIO(raw.decode('utf-8-sig')))
    headers = reader.fieldnames or []
    date_key = next((key for key in ['observation_date', 'DATE'] if key in headers), None)
    if not date_key or 'CPIAUCNS' not in headers:
        raise ValueError('Unexpected FRED columns')
    points, seen = [], set()
    for row in reader:
        date = row[date_key]
        parsed = datetime.strptime(date, '%Y-%m-%d')
        if parsed.strftime('%Y-%m-%d') != date or parsed.day != 1 or date > now.date().isoformat() or date in seen:
            raise ValueError('Invalid or duplicate CPI month')
        seen.add(date)
        value = row['CPIAUCNS'].strip()
        if value in ['', '.']:
            continue
        value = float(value)
        if not math.isfinite(value) or value <= 0:
            raise ValueError('Invalid CPI index')
        points.append({'date': date, 'value': value})
    points.sort(key=lambda point: point['date'])
    if len(points) < 13 or (now.date() - datetime.strptime(points[-1]['date'], '%Y-%m-%d').date()).days > 100:
        raise ValueError('Insufficient or outdated FRED history')
    url = f'https://fred.stlouisfed.org/graph/fredgraph.csv?id=CPIAUCNS&cosd={now.year - 11}-01-01'
    return {'schema_version': 1, 'provider': 'FRED', 'original_provider': 'BLS', 'series': 'CPIAUCNS',
            'seasonal_adjustment': 'none', 'unit': 'index (1982-1984=100)', 'source_url': 'https://fred.stlouisfed.org/series/CPIAUCNS',
            'download_url': url, 'source_captured_at': now.isoformat(), 'source_sha256': hashlib.sha256(raw).hexdigest(), 'points': points}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input-file')
    parser.add_argument('--captured-at')
    parser.add_argument('--output', default='public/data/georisk-fred-cpi.json')
    args = parser.parse_args()
    captured = args.captured_at or datetime.now(timezone.utc).isoformat()
    now = datetime.fromisoformat(captured.replace('Z', '+00:00'))
    url = f'https://fred.stlouisfed.org/graph/fredgraph.csv?id=CPIAUCNS&cosd={now.year - 11}-01-01'
    if args.input_file:
        raw = Path(args.input_file).read_bytes()
    else:
        with urlopen(Request(url, headers={'Accept': 'text/csv', 'User-Agent': 'ZRC-GeoRisk/1.0'}), timeout=30) as response:
            raw = response.read(2_000_001)
        if len(raw) > 2_000_000:
            raise ValueError('FRED response too large')
    snapshot = convert(raw, captured)
    output = Path(args.output)
    # One successful verified snapshot per UTC day, including unchanged observations.
    if output.exists():
        previous = json.loads(output.read_text())
        if previous.get('source_sha256') == snapshot['source_sha256'] and previous.get('source_captured_at', '')[:10] == captured[:10]:
            print('FRED snapshot already verified today')
            return
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(snapshot, ensure_ascii=False, separators=(',', ':')) + '\n')
    print(f"Saved {len(snapshot['points'])} official CPI indices")


if __name__ == '__main__':
    main()
