# Safe owner login dialog

WalletConnect's default modal z-index is 89, below MUI's 1300. Both Wagmi
connections set its shared modal theme to 1400 so the QR code and wallet
picker appear above the owner chooser. The chooser releases keyboard focus
while WalletConnect is connecting, then restores containment after connection
or rejection. Cancelling login, changing the primary account/network or
unmounting the provider closes a pending WalletConnect modal.

Run `npm run test:browser:safe-login` for the Chromium iframe regression. It
renders the actual provider and Wagmi configuration with the real MUI and
WalletConnect dialogs, testing stacking, wallet search, restored focus,
pairing cancellation and retention of the primary Safe account. Safe
connection, relay pairing and Explorer responses are simulated; it requires
no real wallet or external connection.

The browser regression fails on the original PR #434 head (`be7c45d3`) because
WalletConnect appears below the chooser. Unit tests additionally cover
cancellation while the provider initializes and during pairing. Real Safe
and WalletConnect sessions still need a manual pass before release.
