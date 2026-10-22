#!/usr/bin/env python3
"""Collect public US-government market data distributed through FRED CSV.

The resulting snapshot is a *current download*, not a point-in-time/vintage
archive. First collection time and SHA256 are explicit. Fail closed on errors.
"""
import csv
import hashlib
import io
import json
import math
import os
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

BASE = "https://fred.stlouisfed.org/graph/fredgraph.csv?id="
CATALOG = {
    "DCOILBRENTEU": ("Brent", "USD/barrel", "EIA via FRED"),
    "DCOILWTICO": ("WTI", "USD/barrel", "EIA via FRED"),
    "DHHNGSP": ("Henry Hub gas", "USD/MMBtu", "EIA via FRED"),
    "DGS10": ("US Treasury 10Y", "percent", "US Treasury / Federal Reserve via FRED"),
    "SP500": ("S&P 500 index", "index points", "S&P Dow Jones Indices via FRED"),
}
API_BASE = 'https://api.stlouisfed.org/fred/series/observations'
DEFAULT = Path(__file__).resolve().parent.parent / "public/data/georisk-market-research.json"

def parse_csv(raw, series_id, today):
    if len(raw) > 5_000_000:
        raise ValueError("Oversized feed")
    text = raw.decode("utf-8-sig")
    rows = csv.DictReader(io.StringIO(text))
    if not rows.fieldnames or series_id not in rows.fieldnames:
        raise ValueError("Unexpected FRED CSV headers")
    date_key = "observation_date" if "observation_date" in rows.fieldnames else "DATE"
    if date_key not in rows.fieldnames:
        raise ValueError("Missing observation date")
    result = []
    seen = set()
    for row in rows:
        date = row[date_key]
        if not date or date > today or date in seen:
            if date in seen:
                raise ValueError("Duplicate observation date")
            continue
        try:
            date_obj = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError as e:
            raise ValueError("Invalid observation date") from e
        value_text = row[series_id]
        if not value_text or value_text == ".":
            continue
        try:
            value = float(value_text)
        except (ValueError, TypeError) as e:
            raise ValueError("Invalid numeric observation") from e
        if not math.isfinite(value) or (value <= 0 and series_id != "DCOILWTICO"):
            raise ValueError("Invalid non-finite or non-positive market observation")
        seen.add(date)
        result.append({"date": date_obj.isoformat(), "value": value})
    result.sort(key=lambda x: x["date"])
    if len(result) < 365:
        raise ValueError("Insufficient historical observations")
    return result[-5000:]

def fetch_fred_api(series_id, api_key):
    params=urllib.parse.urlencode({'series_id':series_id,'api_key':api_key,'file_type':'json','observation_start':'2000-01-01'})
    request=urllib.request.Request(API_BASE+'?'+params,headers={'User-Agent':'ZRC-GeoRisk-Research/1.0'})
    with urllib.request.urlopen(request,timeout=20) as response:
        payload=json.load(response)
    observations=payload.get('observations')
    if not isinstance(observations,list):
        raise ValueError('Invalid FRED API observations')
    lines=['observation_date,'+series_id]
    lines.extend(str(x['date'])+','+str(x['value']) for x in observations)
    return ('\n'.join(lines)+'\n').encode('utf-8')

def collect(fetch=None, now=None):
    """Collect independent feeds. Failed sources are explicit, never replaced."""
    now = now or datetime.now(timezone.utc)
    api_key=os.environ.get('FRED_API_KEY','').strip()
    if fetch is None:
        if not api_key:
            raise RuntimeError('FRED_API_KEY secret required for official FRED API ingestion')
        fetch=lambda url: fetch_fred_api(url.split('id=')[-1],api_key)
    series = []
    failures = []
    for series_id, (label, unit, provider) in CATALOG.items():
        url = BASE + series_id
        try:
            raw = fetch(url)
            points = parse_csv(raw, series_id, now.date().isoformat())
            latest = points[-1]["date"]
            age = (now.date() - datetime.strptime(latest, "%Y-%m-%d").date()).days
            if age > 10:
                raise ValueError(f"source stale ({age} calendar days)")
            series.append({
                "id": series_id, "label": label, "unit": unit,
                "provider": provider, "frequency": "business_day",
                "source_url": "https://fred.stlouisfed.org/series/" + series_id,
                "collected_at": now.isoformat().replace("+00:00", "Z"),
                "download_sha256": hashlib.sha256(raw).hexdigest(),
                "latest": points[-1], "points": points,
            })
        except (ValueError, RuntimeError, OSError, TimeoutError) as error:
            failures.append({"id": series_id, "reason": str(error)[:180]})
    status = "available" if len(series) == len(CATALOG) else ("partial" if series else "unavailable")
    return {"schema_version": 2, "status": status,
            "collected_at": now.isoformat().replace("+00:00", "Z"),
            "expected_series": list(CATALOG),
            "failures": failures,
            "vintage_warning": "Downloaded historical data are not point-in-time vintages.",
            "series": series}

def main():
    snapshot = collect()
    DEFAULT.parent.mkdir(parents=True, exist_ok=True)
    tmp = DEFAULT.with_suffix(".tmp")
    tmp.write_text(json.dumps(snapshot, separators=(",", ":"), ensure_ascii=False) + "\n", encoding="utf-8")
    tmp.replace(DEFAULT)
    print("Collection status:", snapshot["status"], "Verified", len(snapshot["series"]), "of", len(CATALOG), "series; latest:", [(s["id"], s["latest"]["date"]) for s in snapshot["series"]], "failures:", snapshot["failures"])
    if not snapshot["series"]:
        raise SystemExit("No valid market feeds. Snapshot explicitly unavailable.")

if __name__ == "__main__":
    main()
