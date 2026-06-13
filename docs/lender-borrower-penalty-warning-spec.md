# lender borrower penalty warning spec

## problem

lenders can currently deposit into a market even when the borrower has another market that has been in penalized delinquency for a materially long period. the app should surface that borrower-level risk on every lender-facing market for that borrower before a lender deposits.

## proposed warning condition

show the warning on a market when any visible market deployed by the same borrower has been past its delinquency grace period for at least 30 days.

in app/sdk terms, that is:

```ts
const thirtyDays = 30 * 24 * 60 * 60
const penaltySeconds = market.timeDelinquent - market.delinquencyGracePeriod
const isBorrowerPenaltyWarningMarket =
  !market.isClosed && market.isIncurringPenalties && penaltySeconds >= thirtyDays
```

notes:

- `market.isIncurringPenalties` is already defined by the sdk as `timeDelinquent > delinquencyGracePeriod`.
- `src/utils/marketStatus.ts` already computes `penaltyPeriod` from `timeDelinquent - delinquencyGracePeriod`, but rounds it to days for display. the warning should use seconds to avoid threshold ambiguity.
- the 30-day threshold is borrower-level: if market a crosses the threshold, markets b/c/d by the same borrower get the warning too.
- the scope is same-chain only. cross-chain borrower risk can be added later if the app becomes meaningfully cross-chain.
- closed/terminated markets do not trigger the warning.
- the current market counts. if it is the market that crosses the threshold, all of that borrower's same-chain, non-closed markets should show the warning, including itself.

## warning copy

current provided copy:

> info: at least one market deployed by this borrower has not honoured withdrawal requests for at least thirty days past it's grace period

copy decisions:

- use all caps.
- use british spelling: `honoured`.
- correct `it's` to `its`.
- prefer the user-facing withdrawal-request phrasing over a more technically exact `penalized delinquency` phrasing.

implementation copy:

> INFO: AT LEAST ONE MARKET DEPLOYED BY THIS BORROWER HAS NOT HONOURED WITHDRAWAL REQUESTS FOR AT LEAST THIRTY DAYS PAST ITS GRACE PERIOD

## display surfaces

### lender market page

likely location:

- `src/app/[locale]/lender/market/[address]/page.tsx`

candidate placements:

1. below `MarketHeader`, above any `SwitchChainAlert`.
2. below `SwitchChainAlert`, above section content.
3. inside the transactions section only.

recommendation for scope:

- place the banner at the top of the market page, just below the market header. if the wrong-network alert also appears, keep the borrower-risk warning in that same top context rather than hiding it inside a section.
- show it on desktop and mobile market pages.
- keep it independent of the currently selected desktop sidebar section, because the risk is market-level context, not transaction-tab context.
- show it to everyone on the lender market page. no connected wallet should be required unless implementation uncovers a technical blocker.

### deposit modal

likely location:

- `src/app/[locale]/lender/market/[address]/components/Modals/DepositModal/index.tsx`

candidate placements:

1. after available/minimum deposit rows and before the amount input.
2. after the amount input and before fixed-term/usdt alerts.
3. near the footer above approve/deposit buttons.

recommendation for scope:

- show a compact red warning during the value-entry form state only.
- place it close to the deposit action, ideally directly below the legal name / alias disclosure and above the modal footer buttons.
- pass the derived borrower-level risk into the modal rather than making the modal refetch all borrower markets.
- warning only. do not block deposits and do not add an acknowledgement checkbox.

## data path options

### option a: reuse borrower markets hook

use the existing borrower market fetch path:

- `src/app/[locale]/borrower/hooks/getMaketsHooks/useGetBorrowerMarkets.ts`
- `src/app/[locale]/borrower/hooks/getMaketsHooks/updateMarkets.ts`

pros:

- already queries markets by borrower.
- already filters excluded/frontend-hidden markets.
- already refreshes sdk market objects through lens `getMarketsData`.
- already polls on the app polling interval.

cons:

- located under borrower hooks despite being useful to lender pages.
- query key is named `GET_OWN_MARKETS`, which is semantically off for lender views.
- may fetch more data than strictly needed for a boolean warning.

### option b: create lender-local borrower risk hook

add a small hook near the lender market route, likely:

- `src/app/[locale]/lender/market/[address]/hooks/useBorrowerPenaltyWarning.ts`

implementation shape:

- accept `market`.
- query all markets for `market.borrower` on `market.chainId`.
- reuse `getMarketsForBorrower` and `updateMarkets`, or wrap `useGetBorrowerMarkets`.
- return `{ shouldWarn, triggeringMarkets, isLoading, isError }`.

pros:

- keeps the lender feature readable and testable.
- avoids threading raw borrower market lists through the page.
- can centralize threshold constants and closed-market policy.

cons:

- possible duplication of borrower hook behavior unless carefully reused.

### option c: subgraph-only filter

query markets by borrower with subgraph filters such as `isIncurringPenalties: true`.

pros:

- cheaper than hydrating every market through lens.

cons:

- riskier freshness model.
- threshold needs `timeDelinquent - delinquencyGracePeriod >= 30 days`; subgraph filter cannot express field-minus-field cleanly.
- would still need lens refresh if we care about current penalty state.

recommendation:

- use option b, implemented by reusing the existing borrower market query/update machinery where possible.

## implementation candidates

shared logic:

- add a constant such as `borrowerPenaltyWarningThresholdSeconds = 30 * 24 * 60 * 60`.
- add a pure helper such as `getPenaltySecondsPastGrace(market)` and `shouldMarketTriggerBorrowerPenaltyWarning(market)`.
- likely home: either `src/utils/marketStatus.ts` or a route-local lender helper.

page integration:

- call borrower-risk hook in lender market page after current `market` is available.
- render warning banner on desktop and mobile routes.
- pass `shouldWarn` to `MarketActions`, `MobileMarketActions`, and `DepositModal` only if the modal cannot receive it directly from page state.

modal integration:

- extend `DepositModalProps` with `showBorrowerPenaltyWarning?: boolean`.
- desktop `MarketActions` currently mounts `DepositModal` directly, so it needs the prop.
- mobile page renders `DepositModal` directly when `isMobileDepositOpen`, so page can pass the prop there.

i18n:

- add warning copy under `lenderMarketDetails`, probably:
  - `lenderMarketDetails.borrowerPenaltyWarning`
  - or `lenderMarketDetails.transactions.deposit.borrowerPenaltyWarning`
- avoid hardcoded modal copy if possible.

## resolved decisions

- closed/terminated markets do not count.
- current market counts.
- same-chain only.
- show to everyone.
- warning only.
- no banner until confirmed by the borrower-risk query.
- use all caps, british spelling, and corrected `its`.

## verification targets

- unit-test pure helper threshold behavior if helper lands outside a component.
- run `npm run lint:errors`.
- run desktop and mobile visual checks for:
  - healthy borrower: no banner, modal unchanged.
  - borrower with one market more than 30 days past grace: banner on all borrower markets and warning in deposit modal.
  - wrong-network alert plus borrower warning.
  - mobile full-page deposit flow.
