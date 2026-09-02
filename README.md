# Canada Dashboard

A mobile-friendly dashboard for Canadian population, major census metropolitan areas (CMAs), economic context, and long-run demographic scenarios.

## Live data pipeline

The dashboard uses a small `data/live.json` cache so GitHub Pages stays fast and reliable. A scheduled GitHub Action refreshes that cache from official public APIs on weekdays.

Current automated sources:

- **Statistics Canada WDS** — quarterly Canada population (table 17-10-0009-01 / vector 1)
- **Statistics Canada Full Table Download API** — annual CMA populations and growth (table 17-10-0148-01)
- **Bank of Canada Valet API** — policy interest rate (series V39079)

The refresh script is `scripts/update_data.py` and the schedule is `.github/workflows/update-data.yml`.

The site keeps built-in fallback values, so a temporary source/API outage does not break the dashboard.

## Current features

- Latest official Canada population estimate and quarterly change
- Latest annual population and growth for Canada's top 10 CMAs
- CMA total population, urban share, and annual growth
- Ottawa–Gatineau spotlight
- Bank of Canada policy rate
- Adjustable CMA growth scenarios to 2050
- Official Statistics Canada national population projection range to 2075

## Run locally

Open `index.html` in a browser. The page will try to load `data/live.json`; when served directly from a filesystem, browser security rules may prevent that fetch, so using a local web server is better for testing the live-data path.

## GitHub Pages

The public site is deployed from the `main` branch using GitHub Pages.

## Data notes

The 2050 CMA figures are illustrative scenarios, not official forecasts. The national 2075 figures shown in the dashboard are official Statistics Canada projection scenarios.
