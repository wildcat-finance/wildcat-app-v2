/**
 * @jest-environment node
 */

import {
  DepositAccess,
  getDeploymentAddress,
  HooksKind,
  SupportedChainId,
  Token,
  TransferAccess,
  WithdrawalAccess,
} from "@wildcatfi/wildcat-sdk"
import { getAddress } from "viem"

import type { BasicBorrowerInfo } from "./mla"

process.env.NEXT_PUBLIC_TARGET_NETWORK ||= "Sepolia"

const { getFieldValuesForBorrower } = jest.requireActual(
  "./mla",
) as typeof import("./mla")

const token = new Token(
  SupportedChainId.Sepolia,
  "0x0000000000000000000000000000000000000001",
  "Test Token",
  "TEST",
  18,
  true,
  {},
)

const borrowerInfo: BasicBorrowerInfo = {
  address: "0x0000000000000000000000000000000000000002",
  name: "Borrower",
}

const getHooksFactoryAddressField = (
  implementationType?: "legacy" | "revolving",
) => {
  const values = getFieldValuesForBorrower({
    market: {
      address: "0x0000000000000000000000000000000000000003",
      implementationType,
      name: "Market",
      symbol: "MKT",
      marketTerm: HooksKind.OpenTerm,
      depositAccess: DepositAccess.RequiresCredential,
      transferAccess: TransferAccess.Open,
      withdrawalAccess: WithdrawalAccess.Open,
      capacity: token.getAmount(100n),
      minimumDeposit: token.getAmount(1n),
      delinquencyGracePeriod: 3600,
      withdrawalBatchDuration: 3600,
      fixedTermEndTime: undefined,
      apr: 1000,
      delinquencyFee: 200,
      reserveRatio: 1000,
      allowClosureBeforeTerm: undefined,
      allowTermReduction: undefined,
      allowForceBuyBack: false,
    },
    borrowerInfo,
    asset: token,
    timeSigned: 1_700_000_000,
    lastSlaUpdateTime: 1_700_000_000,
    networkData: {
      chainId: SupportedChainId.Sepolia,
      name: "Sepolia",
    },
  })

  return values.get("hooksFactory.address")
}

describe("MLA field values", () => {
  it("defaults hooksFactory.address to the legacy factory", () => {
    expect(getHooksFactoryAddressField()).toBe(
      getAddress(
        getDeploymentAddress(SupportedChainId.Sepolia, "HooksFactory"),
      ),
    )
  })

  it("uses the revolving factory for revolving market MLA values", () => {
    expect(getHooksFactoryAddressField("revolving")).toBe(
      getAddress(
        getDeploymentAddress(SupportedChainId.Sepolia, "HooksFactoryRevolving"),
      ),
    )
  })
})
