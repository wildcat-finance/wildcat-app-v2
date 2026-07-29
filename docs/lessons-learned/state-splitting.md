# Splitting "we don't know yet" from "no"

@andfletcher @allend13 flagging you both. **Laurence specifically asked for this to go in
here** as a lessons-learned branch rather than straight into a ticket, so the reasoning
lives next to the code.

Two asks:

1. Could one of you **raise a ticket** for this so it is tracked properly?
2. Could you **take a peek** at the fix below? It is deliberately small and I would rather
   it got argued with before it goes anywhere near `develop`.

Background note, with the on-chain investigation that produced it:
<https://claude.ai/code/artifact/aeeb18f0-2426-4a4e-ace5-48e5b67ecc3d>

## What happened

A lender holding a position in a closed FixedTerm market reported that the app offered them
no way to redeem. They concluded they needed the borrower to whitelist them, and asked us to
arrange it.

They did not need whitelisting. On-chain they already held a valid credential and
known-lender status, and a simulated `queueFullWithdrawal()` from their address succeeded.
The access was there the whole time. The UI just did not say so.

## Why the UI said otherwise

`src/app/[locale]/lender/market/[address]/page.tsx` derived the verdict inline:

```ts
const authorizedInMarket =
  marketAccount &&
  isConnected &&
  !isWrongNetwork &&
  [LenderStatus.DepositAndWithdraw, LenderStatus.WithdrawOnly]
    .includes(getEffectiveLenderRole(marketAccount))
```

and when it was falsy, force-routed the page to the STATUS section with no action panel.

That expression collapses three unrelated situations into one:

1. the lender genuinely has no access,
2. the wallet is not connected, or is on the wrong network,
3. **the data has not loaded yet.**

The third is reachable in normal operation. `useLenderMarketAccount` reads the account from
the subgraph first, then reconciles it against the on-chain lens. When the subgraph has not
indexed the lender yet, `getLenderAccountForMarket` falls back to
`MarketAccount.fromMarketDataOnly(market, lender, false)`, which carries a zero balance, no
credential and no known-lender flag. The SDK then derives
`withdrawalAvailability = RequiresAccess` and `inferredRole = Null`.

Subgraph-only state is therefore **indistinguishable from having no access**, and we were
treating it as a verdict.

It usually recovers when the lens query lands, which is why this is intermittent rather than
constant. It does not recover if that query errors, or if the wallet is on the wrong network.

An unindexed lender is not an edge case. It is the normal state of any wallet that acquired
market tokens by transfer rather than by depositing, which is exactly the population most
likely to be confused about whether they can redeem.

`MarketActions` compounded it: `hideWithdraw` hid the button while the withdraw row still
rendered with a balance, so the failure presented as a missing control with no explanation.

## The fix

New module, `lenderAccessState.ts`, holding the whole decision as pure functions so it can be
tested without a wallet or a DOM.

`resolveLenderAccess` returns an explicit state rather than a boolean:

| State | Meaning |
| --- | --- |
| `Resolving` | still loading; render a loading state, never a verdict |
| `Indeterminate` | cannot be determined: no wallet, wrong network, or the authoritative read failed |
| `Blocked` | authoritatively blocked |
| `Authorized` | authoritatively holds a role that permits action |
| `Unauthorized` | authoritatively holds no such role |

Two things make it correct where the old expression was not.

**The authoritative-data gate.** `useLenderMarketAccount` now exposes `isAuthoritative`,
true only once the lens update has landed. `resolveLenderAccess` refuses to return any
verdict before that, so subgraph-only data can no longer produce `Unauthorized`. There is a
test asserting exactly this, and another asserting that no role value whatsoever can produce
`Authorized` while `isAuthoritative` is false.

**Routing only once loading is done.** The page effect returns early unless
`shouldRouteOnAccess`, which is false only while `Resolving`. `Indeterminate` still routes to
STATUS, because a disconnected or wrong-network visitor cannot be offered actions either way,
and not routing them would leave them on the default TRANSACTIONS section.

`resolveWithdrawAvailability` covers the second half: it maps the SDK's
`QueueWithdrawalStatus` to a reason, and `MarketActions` renders that reason where the button
would be. A lender now sees "Nothing to withdraw", or "This market is in its fixed term", or
"Withdrawing from this market needs a credential", instead of blank space.

### Files

- `lenderAccessState.ts` (new) — the resolver and its states
- `lenderAccessState.test.ts` (new) — 20 tests
- `page.tsx` — uses the resolver; routes only once loading is done
- `hooks/useLenderMarketAccount.ts` — exposes `isAuthoritative`
- `components/MarketActions/index.tsx` — explains a hidden withdraw control

## Testing

Run against the pinned toolchain from `.nvmrc` (Node 22.22.1, npm 11.12.0).

| Check | Result |
| --- | --- |
| `node scripts/check-exact-versions.mjs` | pass |
| `next lint --quiet` (the CI gate) | pass, 0 errors |
| `tsc --noEmit` | pass, 0 errors |
| `jest` | 52 passed, up from 32 on `main` |

Two suites fail identically before and after this change, and neither touches this code:

- `src/app/api/profiles/profile.test.ts` — 27 `PrismaClientInitializationError`; needs a live
  Postgres, which I had no way to provision here
- `src/app/api/mla/mla.test.ts` — reports "must contain at least one test"

That second one looks like a real gap rather than an environment problem. Worth a look
independently of this branch.

Also worth knowing, because it cost me time: `jest` dies before running anything unless
`NEXT_PUBLIC_TOKENS_IMG_HOSTNAME` is set, because `next.config.mjs` validation rejects an
undefined `images.remotePatterns[0].hostname`. And `npm ci --ignore-scripts` skips
`prisma generate`, which fails three suites until you run it by hand.

## What I am not claiming

The fix is verified by unit tests over the pure resolver, by typecheck, and by lint. I have
**not** driven the actual lender page in a browser against an unindexed wallet, so the
end-to-end behaviour is reasoned rather than observed. That is the main thing I would want a
second pair of eyes on.

An `Indeterminate` state caused by a failed lens read still routes to STATUS, which is the
pre-existing behaviour but is arguably the same class of problem in miniature: an errored read
presented as a verdict. Surfacing a retry there felt like a separate change, so I left it.

The copy strings in `MarketActions` are hardcoded rather than routed through i18n, which is
inconsistent with the rest of the component. Deliberate, to keep the diff small enough to
argue with. Say the word and I will move them into the locale files.
