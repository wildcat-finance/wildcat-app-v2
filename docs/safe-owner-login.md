# Safe owner login

Embedded Safe apps authenticate with a personal signature from one owner
wallet. The owner connects through a separate Wagmi configuration; the Safe
remains the account used for agreements and transactions. Login requests use
the Safe address, selected chain and a timestamp created immediately before
signing.

The server verifies current ownership and issues a session with `address` set
to the Safe and `signer` set to the owner. Refresh checks ownership again on
the session's chain. Safe admin permissions remain scoped to the Safe and
that chain. Ordinary wallet login and full Safe signatures accepted by the API
continue to work.

The active browser configuration comes from Wagmi context. Owner-wallet
discovery is isolated from the primary Safe and the configuration used for
cookie hydration. The owner connection uses the existing gateway RPC routes,
has no Wagmi persistence, and has separate WalletConnect storage.

Pending Safe messages use persistence version 3. The migration removes login
proposals and obsolete create-market drafts while preserving current agreement
drafts and ready signatures. Integration's existing version-2 migration remains
in place. Develop's migration numbering is unchanged.

The implementation ports the login behavior from
[PR #434](https://github.com/wildcat-finance/wildcat-app-v2/pull/434).

## Validation

Regression tests cover owner identity, chain binding, removal before refresh,
ordinary wallet and full Safe API login, agreement verification, account/network
changes, cancellation, retries, concurrent login controls, and persisted-state
cleanup. RPC and the database are mocked in the API tests; signature recovery
and JWT validation run their real implementations.

Before release, exercise a Safe with a threshold greater than one in the real
Safe app: log in through an injected owner wallet and WalletConnect, reject
and retry a signature, cancel a pending connection, and verify that agreement
signing still requests Safe approval. The owner path requires a wallet capable
of producing an ECDSA personal signature.

Session lifetime follows the existing policy: issued JWTs last one week and
ordinary API verification does not recheck ownership. Legacy sessions that
recorded only the Safe remain refreshable. Immediate revocation and legacy
session invalidation are separate follow-up work.
