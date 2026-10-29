import { providers, utils } from "ethers"

import { simulateSafeRepayment } from "./simulateSafeRepayment"

const safe = "0x0000000000000000000000000000000000000001"
const token = "0x0000000000000000000000000000000000000002"
const market = "0x0000000000000000000000000000000000000003"
const panic = `0x4e487b71${"0".repeat(62)}11`
const transactions = [
  { to: token, value: "0", data: "0x01" },
  { to: market, value: "0", data: "0x02" },
]
const multicallInterface = new utils.Interface([
  "function aggregate3(tuple(address target, bool allowFailure, bytes callData)[] calls) payable returns (tuple(bool success, bytes returnData)[] results)",
])

function envelope(
  results: { success: boolean; returnData: string }[],
  outerSuccess = true,
) {
  const data = multicallInterface.encodeFunctionResult("aggregate3", [results])
  return utils.hexConcat([
    utils.hexZeroPad(outerSuccess ? "0x01" : "0x00", 32),
    utils.hexZeroPad(utils.hexlify(utils.hexDataLength(data)), 32),
    data,
  ])
}

function setup() {
  const call = jest.fn()
  const provider = { call } as unknown as providers.Provider
  return {
    call,
    simulate: () => simulateSafeRepayment(provider, safe, transactions, 123),
  }
}

describe("simulateSafeRepayment", () => {
  it.each([false, true])(
    "accepts a complete successful Safe response (provider throws: %s)",
    async (throws) => {
      const fixture = setup()
      const response = envelope([
        // Supports approval functions that do not return a boolean.
        { success: true, returnData: "0x" },
        { success: true, returnData: "0x" },
      ])
      if (throws) fixture.call.mockRejectedValueOnce({ data: response })
      else fixture.call.mockResolvedValueOnce(response)

      await expect(fixture.simulate()).resolves.toBeUndefined()
      expect(fixture.call).toHaveBeenCalledWith(
        expect.objectContaining({ from: safe, to: safe }),
        123,
      )
    },
  )

  it.each([panic, "0xdeadbeef"])(
    "preserves repayment revert data %s",
    async (data) => {
      const fixture = setup()
      fixture.call.mockResolvedValueOnce(
        envelope([
          { success: true, returnData: "0x" },
          { success: false, returnData: data },
        ]),
      )

      await expect(fixture.simulate()).rejects.toMatchObject({ data })
    },
  )

  it("does not classify an approval panic as a repayment panic", async () => {
    const fixture = setup()
    fixture.call.mockResolvedValueOnce(
      envelope([
        { success: false, returnData: panic },
        { success: false, returnData: panic },
      ]),
    )

    const error = await fixture.simulate().catch((cause) => cause)

    expect(error.message).toBe("Safe approval 1 simulation reverted")
    expect(error).not.toHaveProperty("data")
  })

  it.each([
    "0x", // Unsupported Safe or missing Multicall3 deployment.
    panic, // A panic outside the repayment must not select fallback.
    envelope([{ success: true, returnData: "0x" }]), // Missing call result.
    envelope(
      [
        { success: true, returnData: "0x" },
        { success: true, returnData: "0x" },
      ],
      false,
    ),
    `${envelope([
      { success: true, returnData: "0x" },
      { success: true, returnData: "0x" },
    ])}00`, // Incorrect envelope length.
    utils.hexConcat([
      utils.hexZeroPad("0x01", 32),
      utils.hexZeroPad("0x01", 32),
      "0x00", // Correct envelope length, malformed Multicall3 result.
    ]),
  ])("rejects malformed or failed outer responses: %s", async (response) => {
    const fixture = setup()
    fixture.call.mockResolvedValueOnce(response)

    const error = await fixture.simulate().catch((cause) => cause)

    expect(error.message).toBe("Could not simulate Safe approval and repayment")
    expect(error).not.toHaveProperty("data")
  })

  it.each([new Error("RPC unavailable"), { data: panic }])(
    "does not classify provider errors as repayment panics: %s",
    async (providerError) => {
      const fixture = setup()
      fixture.call.mockRejectedValueOnce(providerError)

      const error = await fixture.simulate().catch((cause) => cause)

      expect(error.message).toBe(
        "Could not simulate Safe approval and repayment",
      )
      expect(error).not.toHaveProperty("data")
    },
  )
})
