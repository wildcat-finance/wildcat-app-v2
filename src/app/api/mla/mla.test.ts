/**
 * @jest-environment node
 */

import {
  DepositAccess,
  HooksKind,
  SignerOrProvider,
  Token,
  TransferAccess,
  WithdrawalAccess,
} from "@wildcatfi/wildcat-sdk"
import { getAddress } from "viem"

import {
  fillInMlaTemplate,
  getFieldValuesForBorrower,
  MlaFieldValueKey,
  MlaTemplateField,
} from "@/lib/mla"
import { fillInMlaForLender, getFieldValuesForLender } from "@/lib/mlaLender"

const marketAddress = "0x0000000000000000000000000000000000000001"
const lenderAddress = "0x0000000000000000000000000000000000000002"

describe("mla helpers", () => {
  const token = new Token(
    11155111,
    "0x0000000000000000000000000000000000000003",
    "Mock USDC",
    "mUSDC",
    6,
    true,
    {} as SignerOrProvider,
  )

  test("fills borrower template values and derives an acceptance message", () => {
    const borrowerFields: MlaTemplateField[] = [
      {
        source: "market.name",
        placeholder: "Insert Market Name",
      },
      {
        source: "market.address",
        placeholder: "Insert Market Address",
      },
    ]
    const fieldValues = new Map<MlaFieldValueKey, string | undefined>([
      ["market.name", "Sepolia Credit"],
      ["market.address", marketAddress],
    ])

    const result = fillInMlaTemplate(
      {
        html: "<p>{{market.name}}</p><p>{{market.address}}</p>",
        plaintext: "market {{market.name}} at {{market.address}}",
        borrowerFields,
        lenderFields: [],
      },
      fieldValues,
    )

    expect(result.html).toBe(`<p>Sepolia Credit</p><p>${marketAddress}</p>`)
    expect(result.plaintext).toBe(`market Sepolia Credit at ${marketAddress}`)
    expect(result.message).toBe(
      `I accept the Master Loan Agreement for market ${getAddress(
        marketAddress,
      )} with hash 0xd58b3a18b56fcbb738a70817e4f5ae1200467abd9921c1e1e413d2f042e81026.`,
    )
  })

  test("fills lender fields while preserving borrower-filled content", () => {
    const result = fillInMlaForLender(
      {
        html: "<p>borrower terms</p><p>{{lender.address}}</p>",
        plaintext: "borrower terms\n{{lender.address}}",
        lenderFields: [
          {
            source: "lender.address",
            placeholder: "Insert Lender Address",
          },
        ],
      },
      new Map<MlaFieldValueKey, string | undefined>([
        ["lender.address", lenderAddress],
      ]),
      marketAddress,
    )

    expect(result.html).toBe(`<p>borrower terms</p><p>${lenderAddress}</p>`)
    expect(result.plaintext).toBe(`borrower terms\n${lenderAddress}`)
    expect(result.message).toBe(
      `I accept the Master Loan Agreement for market ${getAddress(
        marketAddress,
      )} with hash 0xd37bd1ba4fc31de4940fd6261371bf91db28caca658eb1f1a9d60e39b21d6a58.`,
    )
  })

  test("preserves lender date and address fields used in signed MLA text", () => {
    const values = getFieldValuesForLender(lenderAddress, Date.UTC(2026, 0, 21))

    expect(Object.fromEntries(values)).toEqual({
      "lender.timeSigned": "January 21, 2026",
      "lender.timeSignedDayOrdinal": "21st",
      "lender.timeSignedMonthYear": "January 2026",
      "lender.address": getAddress(lenderAddress),
    })
  })

  test("maps periodic mla fields without fixed-term placeholders", () => {
    const firstWindowStart = Date.UTC(2026, 4, 30) / 1000
    const nextWindowStart = Date.UTC(2026, 5, 30) / 1000
    const fieldValues = getFieldValuesForBorrower({
      networkData: {
        chainId: 11155111,
        name: "Sepolia",
      },
      market: {
        address: marketAddress,
        name: "Periodic Credit",
        symbol: "pCREDIT",
        marketTerm: HooksKind.PeriodicTerm,
        depositAccess: DepositAccess.Open,
        transferAccess: TransferAccess.Open,
        withdrawalAccess: WithdrawalAccess.Open,
        capacity: token.parseAmount("1000"),
        minimumDeposit: token.parseAmount("10"),
        delinquencyGracePeriod: 86_400,
        withdrawalBatchDuration: 86_400,
        fixedTermEndTime: undefined,
        firstWithdrawalWindowStart: firstWindowStart,
        periodDuration: 2 * 86_400,
        withdrawalWindowDuration: 86_400,
        nextWithdrawalWindowStart: nextWindowStart,
        apr: 500,
        delinquencyFee: 200,
        reserveRatio: 1_000,
        allowClosureBeforeTerm: undefined,
        allowTermReduction: undefined,
      },
      borrowerInfo: {
        address: "0x0000000000000000000000000000000000000004",
      },
      asset: token,
      timeSigned: Date.UTC(2026, 4, 1),
      lastSlaUpdateTime: Date.UTC(2026, 0, 1),
    })

    expect(fieldValues.get("market.marketType")).toBe("Periodic Term")
    expect(fieldValues.get("market.fixedTermEndTime")).toBe("N/A")
    expect(fieldValues.get("market.allowClosureBeforeTerm")).toBe("N/A")
    expect(fieldValues.get("market.allowTermReduction")).toBe("N/A")
    expect(fieldValues.get("market.firstWithdrawalWindowStart")).toBe(
      "May 30, 2026",
    )
    expect(fieldValues.get("market.periodDuration")).toBe("2 days")
    expect(fieldValues.get("market.withdrawalWindowDuration")).toBe("1 day")
    expect(fieldValues.get("market.nextWithdrawalWindowStart")).toBe(
      "June 30, 2026",
    )
  })
})
