# Safe owner login

Embedded Safe apps authenticate with a personal signature from one owner
wallet, or through **Use Safe approvals** when an owner is a contract wallet
or cannot produce a personal signature. The owner connects through a separate
Wagmi configuration; the Safe remains the account used for agreements and
transactions. Login requests use the Safe address, selected chain and a
timestamp created immediately before signing.

The server verifies current ownership and issues a session with `address` set
to the Safe and `signer` set to the owner. Refresh checks ownership again on
the session's chain. Safe admin permissions remain scoped to the Safe and
that chain. Ordinary wallet login and full Safe signatures accepted by the API
continue to work.

The Safe approvals option uses the existing message coordinator and the
Safe's approval threshold. It supports both off-chain signatures and on-chain
approved messages whose proof is `0x`. Cancelling stops the active login wait
while retaining any queued proposal for retry. Retrying reuses its original
message and timestamp; login proposals expire after one hour. A rejected API
submission retains the proof, and successful login removes it. Full Safe
sessions record the Safe itself as `signer`.

The active browser configuration comes from Wagmi context. Owner-wallet
discovery is isolated from the primary Safe and the configuration used for
cookie hydration. The owner connection uses the existing gateway RPC routes,
has no Wagmi persistence, and has separate WalletConnect storage.
Both connections set the shared WalletConnect modal above MUI's dialogs.
The owner chooser releases its focus trap only while WalletConnect is
connecting, then restores it after connection or rejection. Cancelling login
also closes a pending WalletConnect modal.

Pending Safe messages remain at persistence version 3. Its migration removes
legacy `login` proposals and obsolete create-market drafts while preserving
current agreement drafts and ready signatures. The restored fallback uses
`safe-login`, so it survives rehydration without reviving the retired login
flow. Integration's existing version-2 migration remains in place. Develop's
migration numbering is unchanged.

The implementation ports the login behavior from
[PR #434](https://github.com/wildcat-finance/wildcat-app-v2/pull/434).

## Validation

Regression tests cover owner identity, chain binding, removal before refresh,
ordinary wallet and full Safe API login, agreement verification, account/network
changes, cancellation, retries, concurrent login controls, and persisted-state
cleanup. RPC and the database are mocked in the API tests; signature recovery
and JWT validation run their real implementations.

Run `npm run test:browser:safe-login` for the Chromium iframe regression.
It checks the real MUI and WalletConnect dialogs, wallet-search focus,
focus restoration, cancellation, the Safe approvals choice and the primary
Safe account. Safe SDK approval, relay pairing and Explorer responses are
simulated; no wallet or external connection is needed. This regression fails
on the integration base before the dialog fix.

Before release, exercise a Safe with a threshold greater than one in the real
Safe app: log in through an injected owner wallet and WalletConnect, reject
and retry a signature, cancel a pending connection, and verify that agreement
signing still requests Safe approval. Also exercise **Use Safe approvals**
with a contract-owned Safe, including cancellation and resuming a pending
proposal. The direct owner path requires an ECDSA personal signature; the
fallback requires a valid full Safe proof.

Session lifetime follows the existing policy: issued JWTs last one week and
ordinary API verification does not recheck ownership. Legacy sessions that
recorded only the Safe remain refreshable. Immediate revocation and legacy
session invalidation are separate follow-up work.
