export const walletConnectOptions = {
  metadata: {
    description: "An undercollateralised credit facility protocol.",
    name: "Wildcat",
    url: "https://app.wildcat.finance",
    icons: ["https://avatars.githubusercontent.com/u/113041915?s=200&v=4"],
  },
  projectId: "b129ed6623af640bbab035d6b906dfd6",
  // WalletConnect renders outside MUI's portal; its default z-index is 89.
  // Set this on both connections because the modal theme is shared globally.
  qrModalOptions: {
    themeVariables: { "--wcm-z-index": "1400" },
  },
}
