export type MarketDataT = {
  name: string
  address: string
}

export type LendersDataT = {
  isAuthorized: boolean
  address: string
  markets: MarketDataT[]
}

export const mockLendersData: LendersDataT[] = [
  {
    isAuthorized: true,
    address: "0x1717503EE3f56e644cf8b1058e3F83F03a71b2E1",
    markets: [
      {
        name: "Test EUG25 USDC USDC",
        address: "0xdaef38622b547907ca5966ec836e543e1ba65cb3",
      },
      {
        name: "JUL20 USDC",
        address: "0xaedfd7255f30b651c687831b47d73b179a8adc89",
      },
      {
        name: "Test MRKT V3 USDC",
        address: "0x9911419d445d8d05cdeca57873b3c5e8562cc41f",
      },
    ],
  },
  {
    isAuthorized: true,
    address: "0x8cEe746bCA27EAb5c349e0b1757eB74543C29574",
    markets: [
      {
        name: "JUL20 USDC",
        address: "0xaedfd7255f30b651c687831b47d73b179a8adc89",
      },
      {
        name: "Test MRKT V3 USDC",
        address: "0x9911419d445d8d05cdeca57873b3c5e8562cc41f",
      },
    ],
  },
  {
    isAuthorized: false,
    address: "0x5F55005B15B9E00Ec52528fe672eb30f450151F5",
    markets: [
      {
        name: "JUL20 USDC",
        address: "0xaedfd7255f30b651c687831b47d73b179a8adc89",
      },
      {
        name: "Test EUG25 USDC USDC",
        address: "0xdaef38622b547907ca5966ec836e543e1ba65cb3",
      },
    ],
  },
]
