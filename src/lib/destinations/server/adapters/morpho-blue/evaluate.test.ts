/** @jest-environment node */

import type { MorphoMarket } from "./api"
import { evaluateMorphoMarket } from "./evaluate"

// Mainnet USDC loan market against a Wildcat wrapper, as the Morpho API
// returns it. Its params hash to marketId.
const MARKET_ID =
  "0xa5c0eb58bc78ed86ba709a16f47f45d7e96c52c8975e2828d2d485c8fbde4434"

const market = (overrides: Partial<MorphoMarket> = {}): MorphoMarket => ({
  marketId: MARKET_ID,
  lltv: "860000000000000000",
  irmAddress: "0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC",
  oracle: { address: "0x9792558Bc33DFF171115CdbFC198f44278719B62" },
  collateralAsset: {
    address: "0xF65460B84c13eeb911303336Ab0f9D63CC79839f",
    symbol: "v-wmtUSDC",
  },
  loanAsset: {
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    symbol: "USDC",
    decimals: 6,
    price: { usd: 1 },
  },
  warnings: [],
  state: {
    timestamp: 1_760_000_000,
    supplyAssets: "1000000000000",
    supplyAssetsUsd: 1_000_000,
    liquidityAssets: "400000000000",
    liquidityAssetsUsd: 400_000,
    avgBorrowApy: 0.08,
  },
  supplyingVaults: [],
  supplyingVaultV2s: [
    {
      name: "Curated USDC",
      listed: true,
      owner: { address: "0x1111111111111111111111111111111111111111" },
      curator: { address: "0x2222222222222222222222222222222222222222" },
      curators: { items: [{ name: "Curator", addresses: [] }] },
      caps: {
        items: [
          {
            allocation: "900000000000",
            data: { kind: "MarketV1CapData", market: { marketId: MARKET_ID } },
          },
        ],
      },
    },
  ],
  ...overrides,
})

const evaluate = (row: MorphoMarket) =>
  evaluateMorphoMarket({ appSlug: "ethereum", market: row })

describe("evaluateMorphoMarket", () => {
  it("accepts a row whose params hash to its market id", () => {
    const output = evaluate(market())

    expect(output?.venueKey).toBe(MARKET_ID)
    expect(output?.destination.figures.lltv).toBe(0.86)
    expect(output?.destination.url).toBe(
      `https://app.morpho.org/ethereum/variable/${MARKET_ID}/usdc-v-wmtusdc`,
    )
  })

  it("rejects a row whose collateral does not belong to the market id", () => {
    const row = market()
    expect(
      evaluate({
        ...row,
        collateralAsset: {
          ...row.collateralAsset,
          address: "0x7D7f0fC27E53239e8e50dE461d2a544917AB4366",
        },
      }),
    ).toBeNull()
  })

  it("rejects a row whose lltv does not belong to the market id", () => {
    expect(evaluate(market({ lltv: "915000000000000000" }))).toBeNull()
  })

  it("rejects a row without an oracle, since its id cannot be checked", () => {
    expect(evaluate(market({ oracle: null }))).toBeNull()
  })
})
