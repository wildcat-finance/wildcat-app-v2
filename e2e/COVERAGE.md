# Coverage notes — main variant

Runsheet rows (UAT ids) that have no test on this branch, and why. "feature absent on main" rows
will never have one; "not yet tested here" rows are owed and tracked in the notes that track the
harness work (outside this repo).

The UAT report parses this table into its header — a row here is a row the board is not allowed to
claim.

| UAT id | class | reason |
|---|---|---|
| ADM-06 | not yet tested here | public-profile half has no oracle on main (no /profile/borrower route); needs a main-side oracle |
| ADM-07 | not yet tested here | as ADM-06 |
| ADM-08 | not yet tested here | as ADM-06 |
| ADM-09 | not yet tested here | test.fixme on v2.5 (no per-borrower history view in either app); absent on main |
| ADM-11 | not yet tested here | test.fixme on v2.5 (no removeBorrower in either app); absent on main |
| ADM-13 | not yet tested here | test.fixme on v2.5 (no ToU publishing surface in either app); absent on main |
| BOP-03b | not yet tested here | member removal needs the allowlist fixture on main (W6.4) |
| BOP-06-UI | not yet tested here | main's useBorrow awaits tx.wait() without checking receipt.status (KNOWN-ISSUES row 5); UI borrow proof pending on main |
| BOP-09b | not yet tested here | days-mode repay submission not ported to main |
| BOP-16 | feature absent on main | revolving/RCF markets do not exist on main |
| BOP-16b | feature absent on main | revolving/RCF markets do not exist on main |
| BOP-17 | feature absent on main | periodic-term markets do not exist on main |
| BOP-17b | feature absent on main | periodic-term markets do not exist on main |
| BOP-27 | not yet tested here | executed-document assertions exist on v2.5; main has no implementation |
| BOP-33 | feature absent on main | revolving/RCF markets do not exist on main |
| EDG-01 | not yet tested here | not ported |
| EDG-02 | not yet tested here | test.fixme on v2.5 (external service); absent on main |
| EDG-03 | not yet tested here | not ported |
| EDG-04 | not yet tested here | test.fixme on v2.5 (external service); absent on main |
| EDG-05 | not yet tested here | not ported; overlaps V2P-06 |
| EDG-06 | not yet tested here | test.fixme on v2.5 (sanctions); absent on main |
| EDG-07 | not yet tested here | not ported |
| EDG-08 | not yet tested here | needs a main-side oracle (periodic filter and SDK 3.1.17 penalty arithmetic differ) |
| EDG-09 | not yet tested here | test.fixme on v2.5; absent on main |
| EDG-10 | not yet tested here | not ported |
| EDG-14 | not yet tested here | test.fixme on v2.5 (ADM-11 dependency); absent on main |
| EDG-15 | not yet tested here | test.fixme on v2.5; absent on main |
| LEN-16 | not yet tested here | needs a borrower-administered allowlist fixture on main (W6.4) |
| LEN-20 | not yet tested here | needs a disposable market closed with a lender balance on main (W6.4) |
| LEN-23 | feature absent on main | periodic-term markets do not exist on main (`PeriodicTerms*` absent; `isFrontendVisibleMarket` hides them) |
| LEN-23b | feature absent on main | periodic-term markets do not exist on main (`PeriodicTerms*` absent; `isFrontendVisibleMarket` hides them) |
| LEN-23c | feature absent on main | periodic-term markets do not exist on main (`PeriodicTerms*` absent; `isFrontendVisibleMarket` hides them) |
| LEN-24 | feature absent on main | periodic-term markets do not exist on main |
| LEN-25 | feature absent on main | periodic-term markets do not exist on main |
| LEN-26 | feature absent on main | revolving/RCF markets do not exist on main |
| LEN-27 | feature absent on main | revolving/RCF pricing does not exist on main |
| LEN-34 | not yet tested here | needs a TTL-bearing access-list provider on main (W6.4) |
| MKT-05 | feature absent on main | revolving market creation does not exist on main (`create-market/flow-variants` absent) |
| MKT-06 | feature absent on main | periodic market creation does not exist on main |
| MKT-07 | feature absent on main | revolving + periodic creation does not exist on main |
| MKT-09 | feature absent on main | periodic timing fields do not exist on main |
| WAL-01 | not yet tested here | Safe/Rabby manual lane; test.fixme on v2.5, absent on main |
| WAL-02 | not yet tested here | as WAL-01 |
| WAL-03 | not yet tested here | as WAL-01 |
| WAL-04 | not yet tested here | as WAL-01 |
| WAL-05 | not yet tested here | wallet-transition suite uses the v2.5 branch's test-mode connector events; not ported |
| WAL-06 | not yet tested here | as WAL-05 |
| WAL-07 | not yet tested here | as WAL-05 |
| WRP-01 | not yet tested here | wrappers-deployment suite (UAT sheet 6) exists only on v2.5; canonical-uniqueness and closure have legacy counterparts (W6.4) |
| WRP-02 | not yet tested here | as WRP-01 |
| WRP-03 | not yet tested here | as WRP-01 |
| WRP-04 | feature absent on main | wrapper-at-creation lifecycle on the v2.5 wrapper factory |
| WRP-05 | feature absent on main | termination with wrapped supply on a revolving+periodic market |

## Present but skips at run time until a fixture exists

These UAT ids have a real, running test on this branch (`e2e/borrowerflows/borrower-ops.spec.ts`),
but the test itself calls `test.skip` when the ops borrower's current policy fixture is
self-onboarding rather than borrower-administered allowlist — so a run reports them skipped until
that fixture exists (W6.4).

| UAT id | why it skips |
|---|---|
| BOP-02 | `test.skip` when the ops borrower's primary policy is self-onboarding — needs a borrower-administered access-list policy owned by the ops borrower |
| BOP-03 | `test.skip` when BOP-02 skipped (same policy fixture) |
| BOP-05 | `test.skip` when BOP-02 skipped (same policy fixture) |
