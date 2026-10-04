"""Convert the original authors' public XLS releases into a versioned data asset."""
import argparse
import hashlib
import json
import math
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

import xlrd

SOURCE = "https://www.matteoiacoviello.com/gpr.htm"
MONTHLY_URL = "https://www.matteoiacoviello.com/gpr_files/data_gpr_export.xls"
DAILY_URL = "https://www.matteoiacoviello.com/gpr_files/data_gpr_daily_recent.xls"
COUNTRIES = {"ESP": "España", "PRT": "Portugal", "MEX": "México", "BRA": "Brasil", "COL": "Colombia", "CHL": "Chile", "ARG": "Argentina", "PER": "Perú", "SAU": "Arabia Saudí", "TUR": "Türkiye", "ISR": "Israel"}


def parse_workbook(raw, frequency, captured_at):
    book = xlrd.open_workbook(file_contents=raw)
    sheet = book.sheet_by_index(0)
    headers = sheet.row_values(0)
    labels = {}
    if "var_name" in headers and "var_label" in headers:
        for row in range(1, sheet.nrows):
            key, label = sheet.cell_value(row, headers.index("var_name")), sheet.cell_value(row, headers.index("var_label"))
            if key and label:
                labels[str(key)] = str(label)
    if frequency == "monthly":
        definitions = [("GPR", "Riesgo geopolítico global"), ("GPRT", "Amenazas"), ("GPRA", "Actos")]
        definitions += [("GPRC_" + code, label) for code, label in COUNTRIES.items()]
        date_column, years = "month", 10
    else:
        definitions = [("GPRD", "Riesgo geopolítico global diario"), ("GPRD_THREAT", "Amenazas diarias"), ("GPRD_ACT", "Actos diarios")]
        date_column, years = "DAY", 5
    required = [date_column, *[key for key, _ in definitions]]
    missing = [key for key in required if key not in headers]
    if missing:
        raise ValueError("GPR source schema changed: " + ", ".join(missing))
    cutoff = date(captured_at.year - years, captured_at.month, min(captured_at.day, 28))
    result = []
    for key, label in definitions:
        country = key.removeprefix("GPRC_") if key.startswith("GPRC_") else None
        points = {}
        for row in range(1, sheet.nrows):
            raw_date = sheet.cell_value(row, headers.index(date_column))
            if frequency == "monthly":
                observed = xlrd.xldate_as_datetime(float(raw_date), book.datemode).date().replace(day=1)
                if (observed.year, observed.month) < (cutoff.year, cutoff.month):
                    continue
            else:
                observed = datetime.strptime(str(raw_date).split(".")[0], "%Y%m%d").date()
                if observed < cutoff:
                    continue
            if observed > captured_at.date():
                raise ValueError("GPR contains a future observation")
            value = sheet.cell_value(row, headers.index(key))
            if value == "":
                continue
            value = float(value)
            if not math.isfinite(value) or value < 0:
                raise ValueError("Invalid GPR value for " + key)
            date_key = observed.isoformat()
            if date_key in points:
                raise ValueError("Duplicate GPR observation: " + key + " " + date_key)
            points[date_key] = value
        if not points:
            raise ValueError("No GPR observations for " + key)
        ordered = [{"date": day, "value": value} for day, value in sorted(points.items())]
        result.append({"id": key, "label": label, "country": country, "frequency": frequency,
                       "unit": "% de artículos" if country else "índice (1985–2019 = 100)",
                       "source_label": labels.get(key, key), "provider": "Caldara-Iacoviello GPR",
                       "source_url": SOURCE, "points": ordered, "latest": ordered[-1],
                       "history_years": years})
    return result


def download(url):
    with urlopen(Request(url, headers={"User-Agent": "ZRC-GeoRisk/1.0 (+https://zenithrisecapital.com)"}), timeout=30) as response:
        raw = response.read(12 * 1024 * 1024 + 1)
    if len(raw) > 12 * 1024 * 1024:
        raise ValueError("GPR workbook exceeded size limit")
    return raw


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="public/data/georisk-gpr.json")
    parser.add_argument("--monthly-file")
    parser.add_argument("--daily-file")
    parser.add_argument("--captured-at")
    args = parser.parse_args()
    captured = datetime.fromisoformat(args.captured_at.replace("Z", "+00:00")) if args.captured_at else datetime.now(timezone.utc)
    raws = [Path(args.monthly_file).read_bytes() if args.monthly_file else download(MONTHLY_URL),
            Path(args.daily_file).read_bytes() if args.daily_file else download(DAILY_URL)]
    sources = [{"frequency": frequency, "url": url, "sha256": hashlib.sha256(raw).hexdigest()}
               for frequency, url, raw in zip(["monthly", "daily"], [MONTHLY_URL, DAILY_URL], raws)]
    output = Path(args.output)
    if output.exists() and json.loads(output.read_text()).get("source_files") == sources:
        print("GPR source files unchanged")
        return
    series = parse_workbook(raws[0], "monthly", captured) + parse_workbook(raws[1], "daily", captured)
    payload = {"schema_version": 1, "provider": "Caldara-Iacoviello GPR", "source_url": SOURCE,
               "license": "CC BY 4.0", "license_url": "https://creativecommons.org/licenses/by/4.0/",
               "citation": "Caldara, Dario and Matteo Iacoviello (2022), Measuring Geopolitical Risk, American Economic Review 112(4): 1194–1225. DOI: 10.1257/aer.20191823",
               "source_captured_at": captured.isoformat(), "source_files": sources, "series": series}
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n")
    print("GPR asset saved:", len(series), "series;", sum(len(item["points"]) for item in series), "observations")


if __name__ == "__main__":
    main()
