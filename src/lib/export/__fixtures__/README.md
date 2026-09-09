# Export acceptance fixtures

These gzip files are sanitized recordings of public Ethereum JSON-RPC and
Etherscan responses. Jest replays them without network access through the same
pipeline used in production. They contain response data only: the recorder does
not persist API keys, provider URLs, request headers, or environment variables.

The neutral labels follow the export specification:

- `reference-market-a-25632396.json.gz` exercises the primary ledger, position,
  APR, reconciliation, statement, and determinism acceptance checks.
- `reference-market-c-25632396.json.gz` exercises a closed market, rate changes,
  protocol-fee totals, and the untracked close refund.

The files remain compressed because the complete recordings are substantially
larger as plain JSON and are never reviewed as line-oriented source code.

Refresh a fixture deliberately with:

```sh
npm run record:export-fixture -- <chainId> <market> <snapshotBlock> <output.json.gz>
```

Fixture snapshots are immutable test inputs. Review expected-value changes before
replacing them. Never extend the recorder to persist credentials, provider URLs,
or arbitrary HTTP metadata.
