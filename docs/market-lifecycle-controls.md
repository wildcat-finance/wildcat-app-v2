# Market lifecycle controls

Implementation prepared on 2026-10-04 on
`feat/v2.5-market-lifecycle-controls`, based on app commit
`a27fa9534a573939d4901c6935e5f4c934aa0792` and the published
`@wildcatfi/wildcat-sdk@3.2.16-beta`. This is application source work, not evidence
of an app deployment. The preceding compatibility and default-count work is
documented in [the SDK integration note](sdk-v3.2.16-integration.md).

## Creation

The financial-terms step offers an optional repayment schedule for both standard
and revolving markets, across open, fixed and periodic policies. Availability is
determined from the SDK's configured factory ABI; current supported deployment
targets are on Sepolia. Existing markets cannot be rescheduled.

Dates use UTC. The period is entered in hours and stored in integer seconds;
zero hours is valid and means the repayment date is also the deadline. Turning
the schedule off sends both terms as zero, including when the form retains old
input values. Confirmation and optional agreement placeholders include the exact
deadline, with seconds.

Validation checks a future date, fixed-term maturity, the constructor's `uint32`
deadline range and the policy's limits. Existing instances supply the SDK lens
constraints, preserving actual zero limits. New policies use the built-in
V2.5.6 bounds: a 90-day maximum period; a 730-day maximum date delay for open and
periodic terms; and the core timestamp bound for fixed terms. These defaults
correspond to `MarketConstraintHooks` and `FixedTermPolicy` in protocol source
`fe431bbdfc157b8778ac3690772c6556c74a0a9d`. Revisit them if the configured policies
change. The shared schema checks constructor bounds without imposing a second,
conflicting policy limit.

Schedules are checked again before signing and new deployment. The existing
form fingerprints bind them to agreement signatures and Safe deployment drafts.
Resuming an already-proposed or deployed Safe operation preserves its signed
terms even after the date passes; a new onchain deployment still has to satisfy
the constructor at execution time.

The same terms reach the SDK preview and existing EOA/Safe factory paths. The
agreement renderer now accepts `market.repaymentDate`, `market.repaymentPeriod`
and `market.repaymentDeadline` in both form previews and deployed-market reads.
Existing agreement templates are unchanged; adding these placeholders to a
template is a separate editorial choice.

## Market details and recovery

The shared parameters panel shows the schedule, deadline, observed repayment
state and permanent recorded-default timestamp. It uses SDK state rather than
forecasting a default from browser time. Unsupported legacy markets omit the
panel; supported zero values mean no schedule. Legacy default counts continue
to use the SDK fallback introduced in the preceding integration.

Repayment history is loaded on demand from the app's gateway-backed subgraph
client. It separates effective timestamps from the recording transactions and
links to the market chain's explorer. Empty history and query failures have
distinct states. Neither is presented as evidence of timely repayment.

Closed, supported borrower markets offer **Recover surplus**. Opening the dialog
obtains a live SDK quote and retains full token precision. Confirmation is
disabled during refreshes, on errors, or unless the SDK reports readiness.
Submission verifies the current wallet, borrower and chain, refreshes again,
then uses the SDK recovery calldata. There is no token approval or user-supplied
amount: the contract sends all excess underlying above lender and fee liabilities
to the borrower. Safe proposals wait for execution, and only confirmed success
refreshes market/account/list state.

The repayment dialog also explains that full repayment during the repayment
phase automatically closes the market.

## Verification scope

Final checks on 2026-10-04 passed: 149 Jest suites / 945 tests, TypeScript checks,
error-level lint, both locale gates (1,947 resolved call sites), `git diff --check`
and the Sepolia Next production build. The existing database-dependent profile
integration suite was excluded because this host has no configured test database.

Chromium checks at 1440px and 390px passed with no uncaught page errors or
horizontal overflow. They rendered schedule inputs and confirmation, linked
lifecycle records and the exact surplus quote in the recovery dialog. Temporary
fixture routes were removed before the final build.

Tests cover creation bounds, UTC inputs, zero and empty periods, disabled-term
normalization, constructor encoding for both factory kinds and both deployment
methods, agreement placeholders, legacy/unscheduled/closed/default displays,
history provenance, EOA/Safe recovery, identity mismatches, failed refreshes,
stale surplus and transaction failures. Browser layout checks use local fixtures,
not public-chain writes. Wallet execution and a newly deployed scheduled market
remain operator acceptance checks; these checks do not establish deployed app
behavior.
