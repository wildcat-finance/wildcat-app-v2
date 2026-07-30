/**
 * @jest-environment node
 */

import {
  DepositAccess,
  HooksKind,
  type SignerOrProvider,
  SupportedChainId,
  Token,
  TransferAccess,
  WithdrawalAccess,
} from "@wildcatfi/wildcat-sdk"
import { getAddress } from "viem"

import type { BasicBorrowerInfo } from "./mla"

process.env.NEXT_PUBLIC_TARGET_NETWORK ||= "Sepolia"

const { fillInMlaTemplate, getFieldValuesForBorrower } = jest.requireActual(
  "./mla",
) as typeof import("./mla")

const token = new Token(
  SupportedChainId.Sepolia,
  "0x0000000000000000000000000000000000000001",
  "Test Token",
  "TEST",
  18,
  true,
  {} as unknown as SignerOrProvider,
)

const borrowerInfo: BasicBorrowerInfo = {
  address: "0x0000000000000000000000000000000000000002",
  name: "Borrower",
}

const standardFactory = "0x00000000000000000000000000000000000000a1"
const revolvingFactory = "0x00000000000000000000000000000000000000b2"

const getMlaValues = (
  marketKind: "standard" | "revolving" = "standard",
  hooksFactory: string | null = marketKind === "revolving"
    ? revolvingFactory
    : standardFactory,
  borrower: BasicBorrowerInfo = borrowerInfo,
) =>
  getFieldValuesForBorrower({
    market: {
      address: "0x0000000000000000000000000000000000000003",
      marketKind,
      hooksFactory: hooksFactory ?? undefined,
      name: "Market",
      symbol: "MKT",
      marketTerm: HooksKind.OpenTerm,
      depositAccess: DepositAccess.RequiresCredential,
      transferAccess: TransferAccess.Open,
      withdrawalAccess: WithdrawalAccess.Open,
      capacity: token.getAmount(BigInt(100)),
      minimumDeposit: token.getAmount(BigInt(1)),
      delinquencyGracePeriod: 3600,
      withdrawalBatchDuration: 3600,
      fixedTermEndTime: undefined,
      firstWithdrawalWindowStart: undefined,
      periodDuration: undefined,
      withdrawalWindowDuration: undefined,
      nextWithdrawalWindowStart: undefined,
      apr: 1000,
      delinquencyFee: 200,
      reserveRatio: 1000,
      allowClosureBeforeTerm: undefined,
      allowTermReduction: undefined,
    },
    borrowerInfo: borrower,
    asset: token,
    timeSigned: 1_700_000_000,
    lastSlaUpdateTime: 1_700_000_000,
    networkData: {
      chainId: SupportedChainId.Sepolia,
      name: "Sepolia",
    },
  })

describe("MLA field values", () => {
  it("uses the actual historical standard factory", () => {
    expect(getMlaValues("standard").get("hooksFactory.address")).toBe(
      getAddress(standardFactory),
    )
  })

  it("uses the actual historical revolving factory", () => {
    expect(getMlaValues("revolving").get("hooksFactory.address")).toBe(
      getAddress(revolvingFactory),
    )
  })

  it("does not substitute a configured factory when provenance is absent", () => {
    expect(
      getMlaValues("standard", null).get("hooksFactory.address"),
    ).toBeUndefined()
  })

  it("exposes an APR label for revolving MLA templates", () => {
    expect(getMlaValues("revolving").get("market.aprLabel")).toBe(
      "Utilization APR",
    )
  })

  it("preserves the canonical legal entity form in the signed MLA message", () => {
    const values = getMlaValues("standard", standardFactory, {
      ...borrowerInfo,
      jurisdiction: "AG",
      entityKind: "CDOV",
    })

    expect(values.get("borrower.entityKind")).toBe(
      "International Business Corporation",
    )

    const rendered = fillInMlaTemplate(
      {
        html: "{{borrower.entityKind}} for {{market.address}}",
        plaintext: "{{borrower.entityKind}} for {{market.address}}",
        borrowerFields: [
          {
            source: "borrower.entityKind",
            placeholder: "Insert Entity Kind",
          },
          {
            source: "market.address",
            placeholder: "Insert Market Address",
          },
        ],
        lenderFields: [],
      },
      values,
    )

    expect(rendered.message).toBe(
      "I accept the Master Loan Agreement for market " +
        "0x0000000000000000000000000000000000000003 with hash " +
        "0xc188d9d0dbe43e248289dd256c9ff465a1e01dda3a10ad9de462414c6d1b82d5.",
    )
  })
})
