/**
 * @jest-environment node
 */

import type { SupportedChainId } from "@wildcatfi/wildcat-sdk"
import {
  encodeAbiParameters,
  type Hash,
  keccak256,
  type PublicClient,
  stringToHex,
} from "viem"

import { resolveRegisteredByMany, tryResolveRegisteredBy } from "./registrar"

const mockQuery = jest.fn()
const mockGetDeploymentAddress = jest.fn()

jest.mock("@apollo/client", () => ({ gql: jest.fn(() => ({})) }))

jest.mock("@wildcatfi/wildcat-sdk", () => ({
  getDeploymentAddress: (...args: unknown[]) =>
    mockGetDeploymentAddress(...args),
  getSubgraphClient: jest.fn(() => ({ query: mockQuery })),
}))

const chainId = 11155111 as SupportedChainId
const archController = "0x00000000000000000000000000000000000000a1"
const borrower = "0x00000000000000000000000000000000000000b2"
const otherBorrower = "0x00000000000000000000000000000000000000c3"
const executor = "0x00000000000000000000000000000000000000d4"
const transactionHash =
  "0x00000000000000000000000000000000000000000000000000000000000000e5"

const borrowerAddedTopic = keccak256(stringToHex("BorrowerAdded(address)"))

const makePublicClient = ({
  emittedBorrower = borrower,
  emitter = archController,
  from = executor,
}: {
  emittedBorrower?: string
  emitter?: string
  from?: string
} = {}) => {
  const getTransactionReceipt = jest.fn().mockResolvedValue({
    from,
    logs: [
      {
        address: emitter,
        topics: [borrowerAddedTopic],
        data: encodeAbiParameters(
          [{ type: "address" }],
          [emittedBorrower as `0x${string}`],
        ),
      },
    ],
  })

  return {
    publicClient: {
      getTransactionReceipt,
    } as unknown as Pick<PublicClient, "getTransactionReceipt">,
    getTransactionReceipt,
  }
}

const mockRegistration = ({
  address = borrower,
  isRegistered = true,
  changes = [
    {
      isRegistered: true,
      blockNumber: 10,
      blockLogIndex: 2,
      transactionHash,
    },
  ],
}: {
  address?: string
  isRegistered?: boolean
  changes?: Array<{
    isRegistered: boolean
    blockNumber: number
    blockLogIndex: number
    transactionHash: string
  }>
} = {}) => {
  mockQuery.mockResolvedValue({
    data: {
      registeredBorrowers: [
        {
          borrower: address,
          isRegistered,
          changes,
        },
      ],
    },
  })
}

describe("registrar resolution", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, "warn").mockImplementation(() => undefined)
    mockGetDeploymentAddress.mockReturnValue(archController)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("resolves the receipt sender after verifying the ArchController event", async () => {
    mockRegistration()
    const { publicClient, getTransactionReceipt } = makePublicClient()

    const result = await resolveRegisteredByMany(
      chainId,
      [borrower.toUpperCase()],
      publicClient,
    )

    expect(result.get(borrower)).toBe(executor)
    expect(getTransactionReceipt).toHaveBeenCalledWith({
      hash: transactionHash as Hash,
    })
    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: {
          archController,
          borrowers: [borrower],
        },
      }),
    )
  })

  it("rejects a receipt emitted by the wrong contract", async () => {
    mockRegistration()
    const { publicClient } = makePublicClient({
      emitter: "0x00000000000000000000000000000000000000f6",
    })

    const result = await resolveRegisteredByMany(
      chainId,
      [borrower],
      publicClient,
    )

    expect(result).toEqual(new Map())
  })

  it("rejects a receipt for a different borrower", async () => {
    mockRegistration()
    const { publicClient } = makePublicClient({
      emittedBorrower: otherBorrower,
    })

    const result = await resolveRegisteredByMany(
      chainId,
      [borrower],
      publicClient,
    )

    expect(result).toEqual(new Map())
  })

  it("ignores removal changes when selecting the latest registration", async () => {
    mockRegistration({
      changes: [
        {
          isRegistered: false,
          blockNumber: 12,
          blockLogIndex: 1,
          transactionHash:
            "0x00000000000000000000000000000000000000000000000000000000000000f7",
        },
        {
          isRegistered: true,
          blockNumber: 10,
          blockLogIndex: 2,
          transactionHash,
        },
      ],
    })
    const { publicClient, getTransactionReceipt } = makePublicClient()

    const result = await resolveRegisteredByMany(
      chainId,
      [borrower],
      publicClient,
    )

    expect(result.get(borrower)).toBe(executor)
    expect(getTransactionReceipt).toHaveBeenCalledTimes(1)
    expect(getTransactionReceipt).toHaveBeenCalledWith({
      hash: transactionHash,
    })
  })

  it("keeps the single-borrower helper best-effort", async () => {
    mockRegistration()
    const publicClient = {
      getTransactionReceipt: jest.fn().mockRejectedValue(new Error("RPC down")),
    } as unknown as Pick<PublicClient, "getTransactionReceipt">

    await expect(
      tryResolveRegisteredBy(chainId, borrower, publicClient),
    ).resolves.toBeUndefined()
  })
})
