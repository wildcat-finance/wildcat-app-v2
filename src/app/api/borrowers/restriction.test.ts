/**
 * @jest-environment node
 */
import { NextRequest } from "next/server"

import { GET, POST, PUT } from "./[address]/restriction/route"

const BORROWER = "0x1717503EE3f56e644cf8b1058e3F83F03a71b2E1"
const BORROWER_LC = BORROWER.toLowerCase()
const CHAIN = 11155111 // Sepolia

const findUnique = jest.fn()
const update = jest.fn()
jest.mock("@/lib/db", () => ({
  prisma: {
    borrower: {
      findUnique: (...args: unknown[]) => findUnique(...args),
      update: (...args: unknown[]) => update(...args),
    },
  },
}))

const isRegisteredBorrower = jest.fn()
jest.mock("@wildcatfi/wildcat-sdk", () => ({
  ...jest.requireActual("@wildcatfi/wildcat-sdk"),
  getArchControllerContract: () => ({
    isRegisteredBorrower: (...args: unknown[]) => isRegisteredBorrower(...args),
  }),
}))

jest.mock("@/lib/provider", () => ({
  getProviderForServer: () => ({}),
}))

const verifyApiToken = jest.fn()
const isAdminForChain = jest.fn()
jest.mock("@/app/api/auth/verify-header", () => ({
  verifyApiToken: (...args: unknown[]) => verifyApiToken(...args),
  isAdminForChain: (...args: unknown[]) => isAdminForChain(...args),
}))

const row = (overrides: Record<string, unknown> = {}) => ({
  removedFromArchController: false,
  removedAt: null,
  restrictionOverride: null,
  restrictionOverrideBy: null,
  restrictionOverrideAt: null,
  ...overrides,
})

const url = (address: string, chainId: number | string = CHAIN) =>
  `http://localhost/api/borrowers/${address}/restriction?chainId=${chainId}`

const getReq = (address: string, chainId?: number | string) =>
  GET(new NextRequest(url(address, chainId ?? CHAIN)), {
    params: { address },
  })

const postReq = (address: string) =>
  POST(new NextRequest(url(address), { method: "POST" }), {
    params: { address },
  })

const putReq = (address: string, body: unknown) =>
  PUT(
    new NextRequest(url(address), {
      method: "PUT",
      body: JSON.stringify(body),
    }),
    { params: { address } },
  )

beforeEach(() => {
  jest.clearAllMocks()
  delete process.env.SLACK_WEBHOOK_URL
})

describe("GET restriction", () => {
  it("rejects a bad chain id and a bad address", async () => {
    expect((await getReq(BORROWER, "999")).status).toBe(400)
    expect((await getReq("not-an-address")).status).toBe(400)
    expect(findUnique).not.toHaveBeenCalled()
  })

  it("computes the state from the stored row", async () => {
    findUnique.mockResolvedValue(row({ removedFromArchController: true }))
    const response = await getReq(BORROWER)
    expect(await response.json()).toEqual({
      restricted: true,
      source: "removal",
    })
    expect(findUnique.mock.calls[0][0].where.chainId_address.address).toBe(
      BORROWER_LC,
    )
  })

  it("treats an unknown borrower as unrestricted", async () => {
    findUnique.mockResolvedValue(null)
    expect(await (await getReq(BORROWER)).json()).toEqual({
      restricted: false,
      source: "none",
    })
  })
})

describe("POST sync", () => {
  it("404s for a borrower the app does not know", async () => {
    findUnique.mockResolvedValue(null)
    expect((await postReq(BORROWER)).status).toBe(404)
    expect(isRegisteredBorrower).not.toHaveBeenCalled()
  })

  it("persists a first observed removal after its own onchain read", async () => {
    findUnique.mockResolvedValue(row())
    isRegisteredBorrower.mockResolvedValue(false)
    const response = await postReq(BORROWER)
    expect(await response.json()).toMatchObject({ changed: true })
    expect(update).toHaveBeenCalledTimes(1)
    expect(update.mock.calls[0][0].data.removedFromArchController).toBe(true)
  })

  it("is idempotent when nothing changes", async () => {
    findUnique.mockResolvedValue(row({ removedFromArchController: true }))
    isRegisteredBorrower.mockResolvedValue(false)
    const response = await postReq(BORROWER)
    expect(await response.json()).toMatchObject({ changed: false })
    expect(update).not.toHaveBeenCalled()
  })

  it("auto-clears on verified re-registration without an override", async () => {
    findUnique.mockResolvedValue(row({ removedFromArchController: true }))
    isRegisteredBorrower.mockResolvedValue(true)
    await postReq(BORROWER)
    expect(update.mock.calls[0][0].data.removedFromArchController).toBe(false)
  })

  it("keeps the flag when a manual restriction exists", async () => {
    findUnique.mockResolvedValue(
      row({
        removedFromArchController: true,
        restrictionOverride: "restricted",
      }),
    )
    isRegisteredBorrower.mockResolvedValue(true)
    const response = await postReq(BORROWER)
    expect(await response.json()).toMatchObject({ changed: false })
    expect(update).not.toHaveBeenCalled()
  })

  it("fails closed when the chain is unreachable", async () => {
    findUnique.mockResolvedValue(row())
    isRegisteredBorrower.mockRejectedValue(new Error("rpc down"))
    expect((await postReq(BORROWER)).status).toBe(502)
    expect(update).not.toHaveBeenCalled()
  })

  it("does not fail the write when the Slack webhook fails", async () => {
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.example/T000/B000"
    const fetchSpy = jest
      .spyOn(global, "fetch")
      .mockRejectedValue(new Error("webhook down"))
    findUnique.mockResolvedValue(row())
    isRegisteredBorrower.mockResolvedValue(false)
    const response = await postReq(BORROWER)
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ changed: true })
    fetchSpy.mockRestore()
  })
})

describe("PUT override", () => {
  it("requires a token and admin rights", async () => {
    verifyApiToken.mockResolvedValue(undefined)
    expect((await putReq(BORROWER, { override: "restricted" })).status).toBe(
      401,
    )
    verifyApiToken.mockResolvedValue({
      address: "0xadmin",
      isAdmin: false,
      chainId: CHAIN,
    })
    isAdminForChain.mockResolvedValue(false)
    expect((await putReq(BORROWER, { override: "restricted" })).status).toBe(
      403,
    )
    expect(update).not.toHaveBeenCalled()
  })

  it("rejects junk override values", async () => {
    verifyApiToken.mockResolvedValue({ address: "0xadmin", chainId: CHAIN })
    isAdminForChain.mockResolvedValue(true)
    expect((await putReq(BORROWER, { override: "banned" })).status).toBe(400)
    expect(update).not.toHaveBeenCalled()
  })

  it("404s before writing for an unknown borrower", async () => {
    verifyApiToken.mockResolvedValue({ address: "0xadmin", chainId: CHAIN })
    isAdminForChain.mockResolvedValue(true)
    findUnique.mockResolvedValue(null)
    expect((await putReq(BORROWER, { override: "restricted" })).status).toBe(
      404,
    )
    expect(update).not.toHaveBeenCalled()
  })

  it("writes the override and returns the computed state", async () => {
    verifyApiToken.mockResolvedValue({ address: "0xADMIN", chainId: CHAIN })
    isAdminForChain.mockResolvedValue(true)
    findUnique.mockResolvedValue(row({ removedFromArchController: true }))
    const response = await putReq(BORROWER, { override: "cleared" })
    expect(await response.json()).toEqual({
      restricted: false,
      source: "override",
    })
    expect(update.mock.calls[0][0].data.restrictionOverride).toBe("cleared")
    expect(update.mock.calls[0][0].data.restrictionOverrideBy).toBe("0xadmin")
  })
})
