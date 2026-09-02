#!/usr/bin/env python3
"""Refresh the dashboard's official-data cache using public Canadian APIs.

Sources:
- Statistics Canada WDS vector 1 / table 17-10-0009-01 (Canada population)
- Statistics Canada full-table API / table 17-10-0148-01 (CMA populations)
- Bank of Canada Valet / V39079 (target overnight rate)

No API keys or secrets are required.
"""

from __future__ import annotations

import csv
import io
import json
import re
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path

USER_AGENT = "canada-dashboard/1.0 (+https://github.com/Kazzfrazz/canada-dashboard)"
WDS = "https://www150.statcan.gc.ca/t1/wds/rest"
OUTPUT = Path(__file__).resolve().parents[1] / "data" / "live.json"


def request_bytes(url: str, *, body=None, headers=None, timeout=120) -> bytes:
    hdrs = {"User-Agent": USER_AGENT, "Accept": "application/json,*/*"}
    if headers:
        hdrs.update(headers)
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        hdrs["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=hdrs)
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return response.read()


def request_json(url: str, *, body=None):
    return json.loads(request_bytes(url, body=body).decode("utf-8"))


def statcan_vector(vector_id: int, latest_n: int = 12):
    payload = [{"vectorId": vector_id, "latestN": latest_n}]
    response = request_json(f"{WDS}/getDataFromVectorsAndLatestNPeriods", body=payload)
    if not response or response[0].get("status") != "SUCCESS":
        raise RuntimeError(f"Statistics Canada vector {vector_id} request failed: {response}")
    return response[0]["object"]["vectorDataPoint"]


def latest_canada_population():
    # Statistics Canada documents vector 1 as the Canada total-population series
    # in table 17-10-0009-01.
    points = sorted(statcan_vector(1, 16), key=lambda p: p["refPer"])
    latest, previous = points[-1], points[-2]
    value = float(latest["value"])
    previous_value = float(previous["value"])
    growth = (value / previous_value - 1) * 100
    return {
        "population": round(value),
        "populationDate": latest["refPer"],
        "quarterlyGrowthPct": round(growth, 3),
        "history": [
            {"date": p["refPer"], "population": round(float(p["value"]))}
            for p in points[-12:]
        ],
        "_points": points,
    }


def full_table_rows(product_id: str):
    manifest = request_json(f"{WDS}/getFullTableDownloadCSV/{product_id}/en")
    if manifest.get("status") != "SUCCESS":
        raise RuntimeError(f"Statistics Canada table {product_id} manifest failed: {manifest}")
    archive = request_bytes(manifest["object"])
    with zipfile.ZipFile(io.BytesIO(archive)) as zf:
        names = [
            n for n in zf.namelist()
            if n.lower().endswith(".csv") and "metadata" not in n.lower()
        ]
        if not names:
            raise RuntimeError(f"No data CSV found in Statistics Canada table {product_id}")
        with zf.open(names[0]) as raw:
            text = io.TextIOWrapper(raw, encoding="utf-8-sig", newline="")
            return list(csv.DictReader(text))


def canonical_cma_name(geo: str) -> str:
    name = re.split(r"\s*\(CMA\)", geo, maxsplit=1)[0].strip()
    name = re.sub(r"\s+-\s+", "–", name)
    aliases = {
        "Ottawa–Gatineau": "Ottawa–Gatineau",
        "Kitchener–Cambridge–Waterloo": "Kitchener–Cambridge–Waterloo",
        "Quebec": "Québec",
        "Montreal": "Montréal",
    }
    return aliases.get(name, name)


def find_dimension(columns, *needles):
    for col in columns:
        low = col.lower()
        if any(n in low for n in needles):
            return col
    return None


def is_total_gender(value: str) -> bool:
    v = (value or "").strip().lower()
    return v in {"total - gender", "both sexes", "total - sex", "total gender"} or v.startswith("total - gender")


def is_total_age(value: str) -> bool:
    v = (value or "").strip().lower()
    return v in {"all ages", "total - age", "total age"} or v.startswith("all ages")


def cma_data(canada_points):
    rows = full_table_rows("17100148")
    if not rows:
        raise RuntimeError("Statistics Canada CMA table returned no rows")

    columns = rows[0].keys()
    gender_col = find_dimension(columns, "gender", "sex")
    age_col = find_dimension(columns, "age group", "age")

    years = sorted({str(r.get("REF_DATE", "")) for r in rows if str(r.get("REF_DATE", "")).isdigit()})
    if len(years) < 2:
        raise RuntimeError(f"Could not identify two reference years in CMA table: {years[-5:]}")
    latest_year, prior_year = years[-1], years[-2]

    def eligible(row):
        geo = row.get("GEO", "")
        if "(CMA)" not in geo:
            return False
        if gender_col and not is_total_gender(row.get(gender_col, "")):
            return False
        if age_col and not is_total_age(row.get(age_col, "")):
            return False
        if row.get("UOM") and row.get("UOM") != "Persons":
            return False
        return bool(row.get("VALUE"))

    by_year = {}
    for row in rows:
        year = str(row.get("REF_DATE", ""))
        if year not in {latest_year, prior_year} or not eligible(row):
            continue
        name = canonical_cma_name(row["GEO"])
        try:
            value = float(row["VALUE"])
        except (TypeError, ValueError):
            continue
        by_year.setdefault(year, {})[name] = value

    latest = by_year.get(latest_year, {})
    prior = by_year.get(prior_year, {})
    if len(latest) < 35:
        gender_values = sorted({r.get(gender_col, "") for r in rows})[:20] if gender_col else []
        age_values = sorted({r.get(age_col, "") for r in rows})[:20] if age_col else []
        raise RuntimeError(
            f"Only found {len(latest)} CMAs for {latest_year}. "
            f"Gender column={gender_col!r} sample={gender_values!r}; "
            f"age column={age_col!r} sample={age_values!r}"
        )

    total_latest = sum(latest.values())
    total_prior = sum(prior.get(name, 0) for name in latest)
    total_growth = (total_latest / total_prior - 1) * 100 if total_prior else None

    july_key = f"{latest_year}-07-01"
    canada_same_date = next(
        (float(p["value"]) for p in canada_points if p["refPer"] == july_key),
        None,
    )
    share = (total_latest / canada_same_date * 100) if canada_same_date else None

    top = sorted(latest.items(), key=lambda kv: kv[1], reverse=True)[:10]
    top10 = []
    for rank, (name, population) in enumerate(top, start=1):
        old = prior.get(name)
        growth = (population / old - 1) * 100 if old else None
        top10.append({
            "rank": rank,
            "name": name,
            "population": round(population),
            "previousPopulation": round(old) if old else None,
            "annualGrowthPct": round(growth, 3) if growth is not None else None,
        })

    return {
        "referenceYear": int(latest_year),
        "previousYear": int(prior_year),
        "totalPopulation": round(total_latest),
        "annualGrowthPct": round(total_growth, 3) if total_growth is not None else None,
        "sharePct": round(share, 3) if share is not None else None,
        "count": len(latest),
        "top10": top10,
    }


def policy_rate():
    data = request_json("https://www.bankofcanada.ca/valet/observations/V39079/json?recent=10")
    observations = data.get("observations", [])
    if not observations:
        raise RuntimeError("Bank of Canada Valet returned no V39079 observations")
    latest = observations[-1]
    return {
        "policyRate": float(latest["V39079"]["v"]),
        "policyRateDate": latest["d"],
    }


def validate(payload):
    if payload["canada"]["population"] < 30_000_000:
        raise RuntimeError("Canada population validation failed")
    if payload["cmas"]["count"] < 35:
        raise RuntimeError("CMA count validation failed")
    if len(payload["cmas"]["top10"]) != 10:
        raise RuntimeError("Top-10 CMA validation failed")
    if payload["cmas"]["top10"][0]["population"] < 1_000_000:
        raise RuntimeError("Largest CMA validation failed")
    if not 0 <= payload["economy"]["policyRate"] <= 20:
        raise RuntimeError("Policy rate validation failed")


def main():
    canada = latest_canada_population()
    canada_points = canada.pop("_points")
    cmas = cma_data(canada_points)
    economy = policy_rate()

    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "canada": canada,
        "cmas": cmas,
        "economy": economy,
        "sources": {
            "canadaPopulation": "Statistics Canada table 17-10-0009-01 / WDS vector 1",
            "cmaPopulation": "Statistics Canada table 17-10-0148-01 / Full Table Download API",
            "policyRate": "Bank of Canada Valet V39079",
        },
    }
    validate(payload)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {OUTPUT}")
    print(json.dumps({
        "population": payload["canada"]["population"],
        "populationDate": payload["canada"]["populationDate"],
        "cmaYear": payload["cmas"]["referenceYear"],
        "cmaCount": payload["cmas"]["count"],
        "largestCMA": payload["cmas"]["top10"][0],
        "policyRate": payload["economy"]["policyRate"],
    }, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
