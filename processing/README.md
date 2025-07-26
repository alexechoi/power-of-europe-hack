# European Alternatives Scraper

Scrapes European alternatives from https://european-alternatives.eu/

## Usage

```bash
pip install -r requirements_dev.txt
python3 scraper_v2.py
```

## Output

- `european_alternatives_final.json` - Complete data
- `european_alternatives_final.csv` - Tabular data

## Enhancing and Verifying Data

To filter and verify the scraped alternatives, run the `enhance_data.py` script. This script processes `european_alternatives_final.json`, checks each potential alternative, and outputs a new file: `european_alternatives_verified_final.csv`.

The resulting CSV contains only those alternatives that are:

- Actually verified as EU-based (or EFTA-based, depending on your criteria)
- Still existing and operational

This step ensures that your dataset is accurate and only includes trustworthy, up-to-date European alternatives.

**Usage:**

```bash
pip install -r requirements_dev.txt
python3 scraper_v2.py
```
