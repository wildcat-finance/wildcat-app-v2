import { defineChain } from "viem"

export const plasmaTestnet = defineChain({
  id: 9746,
  name: "Plasma Testnet",
  nativeCurrency: { name: "Test XPL", symbol: "XPL", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://testnet-rpc.plasma.to"],
    },
  },
  blockExplorers: {
    default: {
      name: "Plasma Scan",
      url: "https://testnet.plasmascan.to",
      apiUrl: "https://testnet.plasmascan.to/api",
    },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
      blockCreated: 0,
    },
  },
  testnet: true,
})
