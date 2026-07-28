/**
 * @jest-environment node
 */

import {
  type SignerOrProvider,
  SupportedChainId,
  Token,
} from "@wildcatfi/wildcat-sdk"
import { getAddress } from "viem"

import type { NetworkInfo } from "@/config/network"

import type { MarketValidationSchemaType } from "../../create-market/validation/validationSchema"

process.env.NEXT_PUBLIC_TARGET_NETWORK ||= "Sepolia"

jest.mock("@/hooks/useEthersSigner", () => ({}))
jest.mock("@/hooks/useSelectedNetwork", () => ({}))
jest.mock("./useCalculateMarketAddress", () => ({}))

const { getFieldValuesForBorrowerFromForm } = jest.requireActual(
  "./usePreviewMla",
) as typeof import("./usePreviewMla")

const historicalFactory = "0x00000000000000000000000000000000000000a1"

const token = new Token(
  SupportedChainId.Sepolia,
  "0x0000000000000000000000000000000000000001",
  "Test Token",
  "TEST",
  18,
  false,
  {} as SignerOrProvider,
)

const formValues: MarketValidationSchemaType = {
  implementationType: "standard",
  marketName: "Test Market",
  mla: "1",
  accessControl: "manualApproval",
  marketType: "standard",
  asset: token.address,
  namePrefix: "Wildcat ",
  symbolPrefix: "wc",
  maxTotalSupply: 1_000_000,
  annualInterestBips: 5,
  delinquencyFeeBips: 1,
  reserveRatioBips: 10,
  minimumDeposit: 1,
  delinquencyGracePeriod: 24,
  withdrawalBatchDuration: 24,
  policy: "createNewPolicy",
  policyName: "Test Policy",
  disableTransfers: false,
  transferRequiresAccess: false,
  depositRequiresAccess: true,
  withdrawalRequiresAccess: false,
  deployWrapper: false,
}

describe("create-market MLA provenance", () => {
  it("uses the committed historical factory instead of the configured target", () => {
    const values = getFieldValuesForBorrowerFromForm(
      formValues,
      {
        address: "0x0000000000000000000000000000000000000002",
        name: "Borrower",
      },
      1_700_000_000,
      "0x0000000000000000000000000000000000000003",
      token,
      {
        chainId: SupportedChainId.Sepolia,
        stringID: "sepolia",
        name: "Sepolia",
        blockExplorerUrl: "https://sepolia.etherscan.io",
        isTestnet: true,
        hasV1Deployment: true,
      } satisfies NetworkInfo,
      historicalFactory,
    )

    expect(values.get("hooksFactory.address")).toBe(
      getAddress(historicalFactory),
    )
  })
})
