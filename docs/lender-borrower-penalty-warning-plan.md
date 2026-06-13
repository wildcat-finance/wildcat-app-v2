# lender borrower penalty warning plan

## goal

surface a borrower-level risk warning on lender market pages and deposit modals when any same-chain, non-closed market deployed by that borrower is at least 30 days past its delinquency grace period.

## implementation plan

1. add shared risk helpers

- add a 30-day threshold constant.
- add a helper that computes seconds past grace from `timeDelinquent - delinquencyGracePeriod`.
- add a helper that returns true only when a market is non-closed, incurring penalties, and at or beyond the 30-day threshold.
- prefer a small lender-local utility unless reuse pressure suggests `src/utils/marketStatus.ts`.

2. add borrower risk hook

- add `useBorrowerPenaltyWarning` under the lender market route hooks.
- accept the current `market`.
- fetch same-chain markets for `market.borrower`.
- reuse the existing borrower-market fetch/update machinery so lens-updated market fields drive the decision.
- return a confirmed boolean, plus optional triggering markets for debugging or future ui.
- return no warning while loading or on fetch failure.

3. add warning component/copy

- add i18n copy under `lenderMarketDetails`.
- use this text:

```text
INFO: AT LEAST ONE MARKET DEPLOYED BY THIS BORROWER HAS NOT HONOURED WITHDRAWAL REQUESTS FOR AT LEAST THIRTY DAYS PAST ITS GRACE PERIOD
```

- create a small red warning component if the existing generic alert is too cramped or visually wrong in the modal.
- keep styling consistent with existing red palette (`remy`, `dullRed`, `carminePink`) and avoid a new visual language.

4. wire market page

- call the borrower risk hook from the lender market page once the current market is available.
- render the warning near the top of the page, directly below the market header area.
- keep it visible regardless of the selected desktop sidebar section.
- include mobile and desktop route branches.
- do not require wallet connection or lender authorization.

5. wire deposit modal

- extend `DepositModalProps` with `showBorrowerPenaltyWarning?: boolean`.
- pass the flag through desktop `MarketActions`.
- pass the flag directly from the mobile lender market page when rendering the mobile deposit modal.
- render the warning in the amount-entry form state, near the legal name / alias disclosure and above the footer buttons.
- do not block approve/deposit and do not add an acknowledgement checkbox.

6. verify

- run `npm run lint:errors`.
- if helper logic is isolated, add focused tests for:
  - 29 days, 23:59:59 past grace: no warning.
  - exactly 30 days past grace: warning.
  - closed market past threshold: no trigger.
  - current market can trigger.
- visually check desktop and mobile:
  - healthy borrower: no warning.
  - one borrower market past threshold: warning on all same-chain non-closed borrower markets.
  - wrong-network alert plus borrower warning.
  - deposit modal warning placement near the action buttons.

## acceptance criteria

- warning appears on every same-chain lender market page for a borrower when any same-chain, non-closed borrower market is at least 30 days past grace.
- warning does not appear for borrowers whose same-chain non-closed markets are below the threshold.
- closed/terminated markets never trigger the borrower-level warning.
- warning appears in the deposit modal without disabling approve or deposit.
- no warning is shown while borrower risk data is unconfirmed.
- existing deposit modal legal-name gating remains unchanged.

## known non-goals

- no cross-chain borrower aggregation.
- no deposit-blocking acknowledgement.
- no change to on-chain deposit eligibility.
- no dashboard/table warning rollout unless explicitly requested later.

## risks

- the existing borrower-market hook lives under borrower code and has a semantically odd query key for lender use. reusing it is still preferable to a bespoke stale subgraph query.
- mobile deposit is a full-page branch while desktop deposit is a dialog, so both paths must be checked.
- the modal has previous overflow/alignment history. keep warning placement content-driven and avoid fixed-height regressions.

