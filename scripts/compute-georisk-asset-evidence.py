"""Historical asset behaviour by geopolitical-risk band (GPR, Caldara & Iacoviello).

Produces src/data/georisk-asset-evidence.json, the snapshot behind the
"Lo que dice la historia" table in GeoRiskIndex.jsx.

Method
- Each month since 1985 is assigned to a band by its percentile of the
  monthly GPR index over the full sample: <40 bajo, 40-65 moderado,
  65-80 elevado, >=80 critico (same cut points as the ZRC-GRI bands).
- For each asset we measure the change over the next 3 months (monthly
  average prices; % for prices, basis points for yields) and report the
  median for the band minus the median over all months ("excess").
- Significance: 90% interval from a moving-block bootstrap (3-month
  blocks, to respect overlapping windows).
- "Shock" months: GPR at least the top-decile jump versus its prior
  3-month average; we report the asset change during that month.

Sources (public, no credentials): GPR monthly export (matteoiacoviello.com),
FRED (DGS10, IRLTLT01DEM156N, MCOILBRENTEU, DEXUSEU), Shiller S&P 500
monthly (econ.yale.edu), World Bank Pink Sheet gold (monthly).

Offline research script: needs pandas, numpy, xlrd, openpyxl.
    python3 scripts/compute-georisk-asset-evidence.py
"""
import argparse
import io
import json
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

import numpy as np
import pandas as pd

GPR_URL = "https://www.matteoiacoviello.com/gpr_files/data_gpr_export.xls"
SHILLER_URL = "http://www.econ.yale.edu/~shiller/data/ie_data.xls"
WB_URL = "https://thedocs.worldbank.org/en/doc/18675f1d1639c7a34d463f59263ba0a2-0050012025/related/CMO-Historical-Data-Monthly.xlsx"
FRED_URL = "https://fred.stlouisfed.org/graph/fredgraph.csv?id={}&cosd=1980-01-01"
HORIZON = 3
BANDS = [("bajo", 0, 40), ("moderado", 40, 65), ("elevado", 65, 80), ("critico", 80, 100.0001)]


def fetch(url, attempts=4):
    for i in range(attempts):
        try:
            with urlopen(Request(url, headers={"User-Agent": "ZRC-GeoRisk/1.0", "Accept": "*/*"}), timeout=60) as r:
                return r.read()
        except OSError:
            if i == attempts - 1:
                raise
            time.sleep(2 ** (i + 1))


def fred(series_id):
    d = pd.read_csv(io.BytesIO(fetch(FRED_URL.format(series_id))))
    d.columns = ["date", "v"]
    d["v"] = pd.to_numeric(d["v"], errors="coerce")
    d = d.dropna()
    d["m"] = pd.to_datetime(d["date"]).dt.to_period("M")
    return d.groupby("m")["v"].mean()


def shiller_spx():
    sh = pd.read_excel(io.BytesIO(fetch(SHILLER_URL)), sheet_name="Data", header=7)[["Date", "P"]]
    sh = sh[pd.to_numeric(sh["Date"], errors="coerce").notna()].copy()
    sh["Date"] = sh["Date"].astype(float)
    sh["m"] = sh["Date"].apply(lambda x: pd.Period(f"{int(x)}-{int(round((x - int(x)) * 100)):02d}", "M"))
    return sh.set_index("m")["P"].astype(float)


def wb_gold():
    wb = pd.read_excel(io.BytesIO(fetch(WB_URL)), sheet_name="Monthly Prices", header=4)
    wb = wb[wb.iloc[:, 0].astype(str).str.match(r"^\d{4}M\d{2}$")].copy()
    wb["m"] = wb.iloc[:, 0].apply(lambda s: pd.Period(f"{s[:4]}-{s[5:]}", "M"))
    return pd.to_numeric(wb.set_index("m")["Gold"], errors="coerce")


def change(s, unit, a, b):
    """Change from month t+a to t+b (% for prices, bp for yields)."""
    return (s.shift(-b) / s.shift(-a) - 1) * 100 if unit == "pct" else (s.shift(-b) - s.shift(-a)) * 100


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="src/data/georisk-asset-evidence.json")
    args = parser.parse_args()
    rng = np.random.default_rng(7)

    g = pd.read_excel(io.BytesIO(fetch(GPR_URL)))[["month", "GPR"]].dropna()
    g["month"] = pd.to_datetime(g["month"]).dt.to_period("M")
    g = g[g["month"] >= pd.Period("1985-01", "M")].set_index("month")["GPR"]
    pct = g.rank(pct=True) * 100
    band = pd.Series(pd.cut(pct, [b[1] for b in BANDS] + [100.0001], labels=[b[0] for b in BANDS], right=False), index=pct.index)
    jump = np.log(g) - np.log(g.shift(1).rolling(3).mean())
    shock = jump >= jump.quantile(0.90)

    assets = [
        ("gold", "Oro", wb_gold(), "pct", "World Bank Pink Sheet"),
        ("brent", "Brent", fred("MCOILBRENTEU"), "pct", "FRED MCOILBRENTEU"),
        ("equity_us", "S&P 500", shiller_spx(), "pct", "Shiller (Yale)"),
        ("bund10", "Bund 10a", fred("IRLTLT01DEM156N"), "bp", "FRED IRLTLT01DEM156N"),
        ("ust10", "Treasury 10a", fred("DGS10"), "bp", "FRED DGS10"),
        ("eurusd", "EUR/USD", fred("DEXUSEU"), "pct", "FRED DEXUSEU"),
    ]
    out_assets = []
    for key, label, s, unit, source in assets:
        s = s.dropna().sort_index()
        fwd = change(s, unit, 0, HORIZON)
        df = pd.concat([fwd.rename("f"), band.rename("b")], axis=1).dropna()
        f_all, b_all = df["f"].values, df["b"].astype(str).values
        all_med = float(np.median(f_all))
        cells = {}
        for name, _, _ in BANDS:
            x = f_all[b_all == name]
            diffs = []
            for _ in range(2000):
                starts = rng.integers(0, len(f_all) - HORIZON, size=len(f_all) // HORIZON + 1)
                idx = np.concatenate([np.arange(s0, s0 + HORIZON) for s0 in starts])[: len(f_all)]
                xb = f_all[idx][b_all[idx] == name]
                if len(xb) > 5:
                    diffs.append(np.median(xb) - np.median(f_all[idx]))
            lo, hi = np.percentile(diffs, [5, 95])
            cells[name] = {"n": int(len(x)), "excess": round(float(np.median(x) - all_med), 2),
                           "p25": round(float(np.percentile(x, 25)), 2), "p75": round(float(np.percentile(x, 75)), 2),
                           "share_up": round(float((x > 0).mean() * 100)), "significant": bool(lo > 0 or hi < 0)}
        on = change(s, unit, -1, 0)
        d = pd.concat([on.rename("on"), shock.rename("k")], axis=1).dropna()
        x = d.loc[d["k"].astype(bool), "on"].values
        base = float(d["on"].median())
        boots = [np.median(rng.choice(d["on"].values, size=len(x))) for _ in range(3000)]
        lo, hi = np.percentile(boots, [5, 95])
        med = float(np.median(x))
        cells["shock"] = {"n": int(len(x)), "excess": round(med - base, 2), "p25": round(float(np.percentile(x, 25)), 2),
                          "p75": round(float(np.percentile(x, 75)), 2), "share_up": round(float((x > 0).mean() * 100)),
                          "significant": bool(med < lo or med > hi)}
        out_assets.append({"key": key, "label": label, "unit": unit, "source": source,
                           "sample": [str(df.index.min()), str(df.index.max())], "cells": cells})

    result = {
        "schema_version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "horizon_months": HORIZON,
        "gpr_sample": [str(g.index.min()), str(g.index.max())],
        "gpr_thresholds": {name: round(float(np.percentile(g, lo)), 1) for name, lo, _ in BANDS[1:]},
        "current": {"month": str(g.index.max()), "gpr": round(float(g.iloc[-1]), 1),
                    "percentile": round(float(pct.iloc[-1]), 1), "band": str(band.iloc[-1])},
        "shock_rule": {"jump_vs_3m_avg_pct": round(float((np.exp(jump.quantile(0.90)) - 1) * 100), 1), "n_months": int(shock.sum())},
        "assets": out_assets,
        "sources": {"gpr": GPR_URL, "shiller": SHILLER_URL, "world_bank": WB_URL, "fred": "https://fred.stlouisfed.org"},
    }
    Path(args.output).write_text(json.dumps(result, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"wrote {args.output}: GPR {result['current']}")


if __name__ == "__main__":
    main()
