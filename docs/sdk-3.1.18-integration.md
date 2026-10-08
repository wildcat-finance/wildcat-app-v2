# SDK 3.1.18 integration

This change targets `develop` from
`4e347f2072889011e7dee4cb7628940d52589295`. It uses the published maintenance
SDK for V2.0/V2.1 and the maintenance subgraphs: mainnet/Plasma `v2.0.31` and
legacy Sepolia `v2.1.9`.

## Existing wrapper screens

`useWrapperForMarket` now returns the hydrated `TokenWrapper` used by both
borrower and lender pages. The SDK reads indexed wrapper/token metadata first;
an indexed hit needs no factory or token-metadata RPC. Missing indexed data or
a failed subgraph read retains the SDK's factory fallback, including immediately
after creating a wrapper. Identity mismatches remain errors.

The hook selects the client by the market's chain and preserves the existing
`GET_WRAPPER_FOR_MARKET` key. Creation invalidation therefore still works. Each
refresh uses Apollo `network-only`, so React Query invalidation cannot get stuck
on an earlier cached absence. An absent wrapper is stored as `null`; a failed
lookup shows a retry action instead of offering creation. Cached wrapper/token
contracts are rebound when the signer or provider changes.

The separate metadata hook is removed. Existing balances, limits, previews,
allowances, EOA/Safe transaction paths and creation preflight remain contract
reads/writes. Protocol-statistics endpoints now use SDK `SubgraphUrls`, including
the mainnet and Plasma paths previously hardcoded to `v2.0.30`.

## Handoff for composable markets

The inspected `feat/composable-markets` revision was
`34c5015131d5759aa419d111d872c41d5aa801dd`. Its
`src/lib/destinations/server/universe.ts` still enumerates registered markets and
multicalls `wrapperForMarket` for every market. That feature is separate from
this develop integration.

After incorporating this branch, adapt `getWildcatTokens` as follows:

1. Call `getWrappedMarketsPage(getSubgraphClient(chainId), { first, after })`.
   Follow `pageInfo.nextCursor` unchanged; continuation pages retain the first
   page's indexed block. This returns registered markets with wrappers, metadata
   and deployment provenance without an RPC scan.
2. The feature also needs each market's underlying asset and borrower, which
   are not included in `WrappedMarket`. Fetch those for the returned market IDs
   in one batch at `page.indexedAt.blockNumber`:

   ```graphql
   query WrappedMarketContext($ids: [ID!]!, $block: Block_height!) {
     markets(first: 1000, where: { id_in: $ids }, block: $block) {
       id
       borrower
       asset { address }
     }
   }
   ```

3. Join by normalized market address and require a context row for every
   discovered market. Use `tokenWrapper.address` for the wrapper. Its
   `marketToken.address` is the Wildcat debt token, **not** the underlying asset.
4. Keep transport/indexing failures distinct from a successful empty inventory;
   preserve the feature's existing failure/stale-result handling. A factory-less
   chain can retain its existing empty result.

This makes the feature's inventory fully indexed with two requests per page and
does not require another SDK release. Keep the feature's additions to the lender
page and shared `querySubgraph` helper when incorporating this integration.

## Validation and dependency update

Validated using Node 22.22.1 and npm 11.12.0:

- Production build, TypeScript check and existing dependency-policy check pass.
- Seven targeted Jest suites pass (31 tests), including the published SDK's
  indexed/fallback behavior through the hook, identity failures, creation
  invalidation, chain isolation, wallet rebinding and lookup-error UI.
- Touched-source lint has no errors; ten existing hook-dependency warnings in
  the surrounding market pages/components remain.
- On 2026-10-08 at 17:44 UTC, the installed SDK paginated 14 mainnet and 24
  legacy-Sepolia wrappers, hydrated their metadata without RPC, and passed
  single-market indexed lookups. Both Plasma chains returned zero wrappers and
  no configured factory. All four subgraphs reported no indexing errors.

The build used public Mainnet configuration and a local API URL, with no
production database/storage credentials. This is build/unit/read-path validation,
not a deployed-app or live-wallet transaction acceptance claim.

The dependency was installed intentionally using:

```sh
npm install --save-exact @wildcatfi/wildcat-sdk@3.1.18 \
  --ignore-scripts --min-release-age=0 --audit=false --fund=false
```

The seven-day policy in `.npmrc` remains unchanged. The regenerated lockfile
changes only the SDK root pin and its version, registry URL and integrity; no
transitive package changed. The registry integrity matches the published release
artifact. Push, merge and deployment remain operator steps.
