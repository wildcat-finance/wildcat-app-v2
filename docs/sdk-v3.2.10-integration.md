# SDK 3.2.10-beta integration

Branch `fix/sdk-v3.2.10-beta` starts from `fix/v2.5-batch-1` at
`2e1459daf86abcf58f361e7e23098b39d7fca468`. The manifest and lockfile pin the
published `@wildcatfi/wildcat-sdk@3.2.10-beta`; its npm integrity matches the
verified SDK release package. No other dependency changed.

Existing SDK calls pick up the V2.5.4 Sepolia standard, revolving, and wrapper
factories, plus the new V2.5 lens. The gateway continues to route Sepolia to
subgraph V2.5.12. Indexed market reads now carry `totalAssets`, and V2.5
`Market.scaleAmount()` uses floor rounding.

Historical wrappers still load through `TokenWrapper.fromMarketWithSubgraph()`.
New wrapper deployment uses `WrapperFactory.getDeploymentCapability()`, which
rejects retired factories. This does not repair existing affected wrappers or
make their preview limits proof that wrapping will succeed.

Verification on 2026-09-09:

- 129 unit suites / 699 tests passed with `NEXT_PUBLIC_TARGET_NETWORK=Mainnet`.
  The existing `src/app/api/profiles/profile.test.ts` database integration
  suite was excluded because it requires a dedicated test database.
- TypeScript, error-level lint, both translation checks, exact dependency
  checks, and `npm ci --dry-run` passed.
- The production build passed with `NEXT_PUBLIC_TARGET_NETWORK=Sepolia`.
  The served browser bundle contains all four current deployment addresses;
  the previous addresses are absent from the 104 browser JavaScript artifacts.
- All 184 exported SDK GraphQL documents fit the app proxy's parser limit.
- Live reads through the local production app's gateway proxy returned 482
  markets, including 227 with nonzero liquidity, and no factory target
  mismatches. Indexed market detail and current lens reads agreed on the
  checked market's liquidity.
- All 29 indexed wrappers remained discoverable. A retired V2.5.3 wrapper's
  indexed account, history, balances, allowance, and limit reads succeeded;
  its factory correctly returned `UnsupportedFactory` for new deployment.
- The local `/lender` page and SDK configuration chunk returned HTTP 200.
  Bind the local production server to `localhost`; binding to `127.0.0.1`
  triggered a Next/i18n rewrite loop during the page check.

The one-time SDK installation used `--min-release-age=0` for the freshly
published, verified package. The repository's seven-day policy is unchanged,
and the committed lockfile installs with the normal policy.

Deploy this app branch with the existing server-only gateway configuration,
then verify the served targets and wrap/unwrap on a fresh restricted-transfer
V2.5.4 market without approving the wrapper as a lender. Deployment and that
wallet transaction check remain outstanding for product #872.
