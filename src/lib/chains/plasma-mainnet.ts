import { defineChain } from "viem"

export const plasmaMainnet = defineChain({
  id: 9745,
  name: "Plasma Mainnet Beta",
  nativeCurrency: { name: "XPL", symbol: "XPL", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://rpc.plasma.to"],
    },
  },
  blockExplorers: {
    default: {
      name: "Plasma Scan",
      url: "https://plasmascan.to",
      apiUrl: "https://plasmascan.to/api",
    },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
      blockCreated: 0,
    },
  },
  testnet: false,
})
