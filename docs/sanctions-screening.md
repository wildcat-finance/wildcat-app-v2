# App sanctions screening

The browser queries `https://graph.wildcat.finance/mainnet-sanctions/v0.1.0`
directly before rendering connected-wallet pages. It validates the reviewed
RedStone Ethereum source locally. The same source screens all app networks;
market subgraphs, the SDK and contracts are unchanged. This is UI enforcement,
not an on-chain restriction or authorization for other API routes.

A CORS/network failure pauses the app. The gateway must permit the browser's
Origin on both the JSON POST and its OPTIONS preflight.

## Behaviour

- `clear`: normal app. A result is valid for at most 60 seconds, and never beyond
  either source freshness deadline. Refresh runs every 45 seconds while visible,
  and on focus, visibility and reconnect-to-network events.
- `blocked`: the entire page is replaced by the approved sanctions explanation,
  connected address and Disconnect wallet button. Failed refreshes retain known
  rejection; only a successful clear response releases it.
- `unavailable`: pause all app interactions (including withdrawals and repayment),
  with Retry and Disconnect. HTTP, GraphQL, schema, identity and freshness errors
  never mean clear. A previously valid clearance lasts only until its deadline.
- Checking/restoring a wallet also withholds pages and global dialogs. Account,
  wallet-chain and selected-app-network changes start a new screening scope.
- Disconnect restores normal disconnected browsing; Safe auto-connect cannot
  immediately undo an explicit disconnect. Reloading starts normal wallet
  restoration again.

The shared ethers transport and Safe signing helper check current account,
network and unexpired clearance immediately before new signing requests, so
callbacks waiting on async work cannot bypass a newly blocked screen. Transactions
already submitted, or prompts already handed to an external wallet, cannot be
recalled. Direct contract interaction remains outside this gate.

## Source checks and configuration

The checker validates source list, chain, oracle, reviewed implementation and
deployment CID, successful indexing, current indexed block, and list heartbeat.
Defaults: index age at most 900 seconds, heartbeat age at most 864000 seconds
(10 days). A membership removal retains a false record; an absent account is
treated as clear only after the reviewed index passes the other checks.
`lastUpdateTimestamp` includes empty heartbeats; membership-change time is not
the freshness clock. This validates a response from a reviewed deployment, not
an independent replay of the full oracle history on every request.

Public build-time env variables are documented in `.env.example`. The endpoint,
deployment and freshness variables use the `NEXT_PUBLIC_SANCTIONS_` prefix.
Only public, unauthenticated gateway URLs belong in this config. The default
gateway is included in the app's CSP connect sources; review that allowlist if
changing the hostname. Invalid limits fail
closed. Changing the deployment CID or oracle implementation requires review of
the new schema/source before accepting it. Browser POSTs use `cache: "default"`
so the browser can reuse CORS preflight permission (`Access-Control-Max-Age: 600`
on the current gateway); browser `no-store` prevents that reuse in Chromium. Every screening
check still sends a POST and validates the returned source timestamps. The
gateway's POST responses do not opt into HTTP response caching. CORS permission
contains no wallet decision and does not extend clearance or source freshness.
No clearance is persisted to local storage. Requests time out after
10 seconds. The browser subtracts request time from the validity duration.
Screening checks source timestamps against the device clock, so an incorrect
device clock can pause screening.

## Temporary PO demo

`0xF01D00E06Efe26272cAF01C79c71a46A8Ff22601` is temporarily hardcoded as blocked
in the app for PO acceptance testing. This simulates rejection without querying
RedStone for this wallet and applies in every build, including Vercel preview
and production, with no env settings required. Revert the separate temporary
test-wallet commit after PO testing and before the full deployment.

## Local manual testing

Set `SANCTIONS_DEV_ADDRESS` to your wallet and `SANCTIONS_DEV_STATUS` to `blocked`,
`clear` or `unavailable` in an ignored local env file. Restart `npm run dev`, then
reload the browser after changing the settings. Only the matching address uses
the forced status; all others query the live service. Remove the settings to
restore live screening. No wallet signature or transaction is needed to screen.

Overrides require `NODE_ENV=development` and no `VERCEL` or `VERCEL_ENV` marker.
The server layout passes only this validated address/status fixture into the
local page.
Production builds and deployed previews receive no fixture; the checker
also ignores supplied fixtures in production. Do not prefix these settings with
`NEXT_PUBLIC_`.

Check a deep link, mobile layout, Disconnect, wallet/account/network switching,
Retry and recovery. After changing a fixture, restart the dev server and reload
the page so the layout supplies the new fixture.

## Checking latency

Disable the fixture or use another address: forced results skip the gateway.
Inspect gateway requests in browser Network tools. Keep the wallet, network and
machine fixed. Compare several warm requests and the first request separately;
the first POST can require connection setup and a CORS preflight. Public env
changes require rebuilding production bundles.

With browser cache disabling turned off in DevTools, verify that repeated direct
checks still send POSTs and receive network responses, while OPTIONS is reused
until its permission expires. Repeat after changing gateway headers or endpoint
settings; preflight reuse is independent of screening-result freshness.

Automated tests separately mock upstream responses to cover actual parsing,
expiry, outages, response races and production override guards. Forcing a final
status manually does not test upstream validation. Finish integration acceptance
with a read-only live endpoint query; no gateway deployment is needed.
