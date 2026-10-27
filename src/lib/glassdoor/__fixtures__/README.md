# Glass Door reference fixtures

Checked export datasets for every V2 market of the product#908 reference
borrower at block 25749504 (13 August 2026), one gzip file per market. They are
the output of `buildMarketDataset`, not raw RPC recordings, so the reference
test runs offline and only exercises the metric layer.

Regenerate them deliberately with `npm run build:glassdoor-reference`. This is
needed when the export pipeline version changes the dataset format. The script
reads `EXPORT_RPC_URLS`, `ETHERSCAN_API_KEY` and the database from `.env`, and
reconciles every market against the chain exactly as an export does.

Names stay neutral (`reference-<block>-<market address>.json.gz`); borrower and
token names do not belong in fixture filenames.
