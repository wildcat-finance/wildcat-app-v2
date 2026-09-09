# App data gateway

The app uses `@wildcatfi/wildcat-sdk@3.2.10-beta`. Browser RPC and subgraph
requests go through these same-origin POST routes:

- `/api/gateway/rpc/{chainId}`
- `/api/gateway/graph/{chainId}`

The routes derive their upstream URLs from the SDK. Subgraph releases stay
pinned in the SDK; the browser cannot select an upstream URL or another release.
SDK metadata checks use the same proxy as normal subgraph queries.

On Sepolia, this SDK selects the protocol V2.5.4 factories and lens with
subgraph V2.5.12. See [the SDK integration notes](./sdk-v3.2.10-integration.md)
for historical wrapper compatibility and verification.

Server RPC reads, registrar lookups, and market discovery call the gateway
directly. Protocol statistics run in the browser and use the proxy. Wallet
connections and transaction signing continue to use the connected wallet.

## Vercel setup

1. Add `WILDCAT_GATEWAY_TOKEN` to each Vercel environment that serves the app
   (Production and any Preview environments you use). Its value must be a
   bearer token accepted by the gateway's trusted HTTP policy for both RPC
   and subgraph traffic.
2. Deploy this app revision after setting the variable. Existing deployments
   need a redeploy to receive changed environment variables.
3. Check market lists, a market detail page, lender history, and the protocol
   statistics page. In the browser Network panel, RPC and GraphQL requests
   should go to `/api/gateway/...` with no gateway bearer header.

Use the same server-only variable in `.env.local` for local development.
Never give it a `NEXT_PUBLIC_` prefix, put it in `next.config.mjs`'s `env`
object, or pass it to a client component. The credential module uses Next's
`server-only` guard. Missing or malformed credentials produce a proxy `503`;
there is no fallback to the anonymous gateway quota.

`NEXT_PUBLIC_ALCHEMY_API_KEY` is no longer used by the app. Existing
`WILDCAT_SERVER_RPC_URL_*` overrides still work for server reads; omit them
to use the authenticated gateway. Custom overrides never receive the
gateway token. They do not change the browser proxy destination.

The repository retains its seven-day npm release-age policy. The initial
install of the newly published SDK used the authorized command-local
`--min-release-age=0` exception. The committed lockfile pins the published
tarball and integrity; `npm ci --dry-run` succeeds with the normal policy.

## Proxy behavior

The proxy creates fresh upstream headers containing only JSON content type
and its bearer. Browser Origin, Cookie, Authorization, and routing headers
are not forwarded. Authenticated fetches reject redirects. Responses retain
the upstream status and `Retry-After`, use `Cache-Control: no-store`, and
discard other upstream headers. Failed fetches return generic errors without
credentials or provider diagnostics.

The app proxy permits ordinary RPC reads, simulations, filters, and submission
of already signed transactions. It rejects node-held signing, administrative
methods, and tracing. GraphQL accepts query operations, including fragments,
variables, deployment metadata, and 1000-record history requests; mutations,
subscriptions, and HTTP query batching are rejected.

Resource limits are 1 MiB per request, 20 calls per RPC batch, 20,000 GraphQL
parser tokens, and a 30-second request deadline. Responses stream, with byte
limits of 16 MiB for RPC and 32 MiB for GraphQL. Cancellation aborts upstream
work. The routes declare the Node runtime and a 60-second function duration.
Streaming avoids Vercel's 4.5 MB buffered-response limit; the request limit
remains below Vercel's request-body limit. See
[Vercel's streaming guidance](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions).

These remain public app endpoints. Cross-site browser requests are rejected,
but Origin is not authentication for scripts. A per-instance guard allows a
60-operation burst, refills at 10 operations per second per client IP, and
caps active requests at 32. RPC batch members count individually. Gateway
global resource limits still apply. A deployment-wide quota, if needed,
belongs in Vercel Firewall; the in-memory guard is not shared across instances.

## Verification

Gateway tests cover bearer isolation, exact routing, request validation,
upstream errors, cancellation, timeouts, size limits, and a 5 MiB streamed
result. They also cover Next's loopback URL normalization so development
requests from `127.0.0.1` retain their actual browser origin. Run them with:

```sh
npm test -- --runInBand src/lib/gateway src/lib/provider.test.ts
```

The app's unit suites expect `NEXT_PUBLIC_TARGET_NETWORK=Mainnet`. The existing
`src/app/api/profiles/profile.test.ts` suite additionally requires a dedicated
test database and server RPC configuration; do not point it at production.
Live checks through a local production app server passed for RPC and SDK
subgraph queries on all four chains, plus Sepolia metadata validation and
server-side market discovery. The Vercel smoke checks above still need to run
after deployment.
