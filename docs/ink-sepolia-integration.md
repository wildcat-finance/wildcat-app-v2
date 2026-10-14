# Ink Sepolia integration

## Prepared

- Local `develop` fast-forwarded from `ccc10a40` to `origin/main` at `bb4a8d4b`.
- Branch: `integration/ink-sepolia`; worktree: `.worktrees/wildcat-app-v2-ink`.
- SDK pinned to published `3.1.21`; lock integrity matches the reviewed package.
- Used command-local `--min-release-age=0`; `.npmrc` still requires seven days.
- App work only; no protocol deployments or database writes by the agent.
- No v2 delinquency backport: retain the deployed contracts and finish UI reporting separately.

## Integration checklist

1. [x] **Network and RPC registration.** `InkSepolia` (`763373`,
   testnet, no V1) is registered in the UI, Wagmi and server providers. The
   five-chain list sorts by configured chain ID. Browser and server reads use
   `https://ink-sepolia.g.alchemy.com/v2/` with the same
   `NEXT_PUBLIC_ALCHEMY_API_KEY` used by Ethereum and Sepolia.
   The supplied key is in ignored `.env.local`; set the same variable in the
   hosting environment. This key is browser-visible, as before.
   CSP lists the Ink Alchemy host explicitly. There is no public-RPC fallback.

2. [x] **Network presentation.** Official Ink SVG, icon rendering,
   explorer links and labels are wired. Desktop/mobile selectors derive options
   from `NETWORKS`; `NEXT_PUBLIC_HIDE_TESTNETS` still controls visibility.
   Ink mainnet remains disabled. Set `NEXT_PUBLIC_TARGET_NETWORK=InkSepolia` only
   when Ink should be the default network.

3. [ ] **Deferred bucket: test tokens and backend/database setup.**
   Token templates are deployed; database setup is complete (operator-confirmed).
   `useDeployV2Market.ts` creates a new mock token on every testnet deployment,
   including the Safe batch path.
   - [x] Protocol factory deployed and verified; SDK `3.1.21` published and pinned.
   - [x] Keep subgraph `ink-sepolia/v2.1.9`: it discovers underlying tokens from
     `MarketDeployed`, not factory events. No subgraph redeployment is needed.
   - [ ] Test EOA creation, Safe address prediction/batching, and lender faucet.
   - [x] Picker uses five deployed Ink mocks (WETH, USDC, USDT, DAI, WBTC),
     with addresses in `src/app/api/tokens-list/tokens-list/ink-sepolia.ts`.
     Names, symbols, `isMock()` and 18 decimals verified onchain for all five.
     Fresh mock creation per market is unchanged.

4. [ ] **Backend validation.** Database provisioning is complete (operator-confirmed;
   not inspected here). Verify EOA/Safe login, agreements, invitation,
   registration, and server reads. Borrower registration uses the SDK's testnet helper.

5. [ ] **Exports.** Blockscout adapter implemented; public Ink exports remain disabled
   until a real-market export passes. Vercel `BLOCKSCOUT_API_KEY` and the Ink entry
   in `EXPORT_RPC_URLS` are configured (operator-confirmed). Validate the
   market history, then add `763373` to `EXPORT_CHAIN_IDS`. See
   `docs/export-operations.md` for limits and the read-only adapter check.
   The authenticated adapter check passed against archive RPC.

## Validation checkpoint

Multicall3 was checked at block `63000040`: code is also present at genesis,
and `aggregate3` returned the expected chain ID and block number. Runtime hash:
`0xd5c15df687b16f2ff992fc8d767b4216323184a2bbc6ee2f9c398c318e770891`.
Alchemy Multicall3 and server block reads passed at block `63000314` using the
shared key. Typechecking, focused lint, dependency-policy checks and 21 tests passed.
Database setup is operator-confirmed. End-to-end validation remains open.
The export pass added 193 passing offline tests across the checked suites, one
passing live adapter check, and passing typecheck, lint, and production compilation.

Sources: [network details](https://docs.inkonchain.com/general/network-information),
[contract addresses](https://docs.inkonchain.com/useful-information/contracts),
[icon](https://raw.githubusercontent.com/inkonchain/docs/main/public/img/icons/ink-icon.svg).

After implementation: test desktop/mobile switching, disconnected reads,
cross-chain cache isolation, EOA/Safe registration, open/fixed-term creation,
deposit/faucet behavior, wrapping/redemption, and queued withdrawals. Verify
that existing networks and the production testnet-visibility setting are unchanged.
