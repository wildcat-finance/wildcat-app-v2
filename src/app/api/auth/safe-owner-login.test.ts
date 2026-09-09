/** @jest-environment node */

import { AccountKind, describeAccount } from "@wildcatfi/wildcat-sdk"
import { verify } from "jsonwebtoken"
import { NextRequest } from "next/server"
import { encodeAbiParameters, toFunctionSelector } from "viem"
import { privateKeyToAccount } from "viem/accounts"

import {
  getLoginSignatureMessage,
  LOGIN_SIGNATURE_MAX_AGE_SECONDS,
} from "@/config/api"
import { prisma } from "@/lib/db"
import { getProviderForServer } from "@/lib/provider"
import { verifyAndDescribeSignature } from "@/lib/signatures"

import { POST as login } from "./login/route"
import { POST as refresh } from "./refresh/route"
import { createApiToken } from "./verify-header"

jest.mock("@/lib/db", () => ({
  prisma: { adminAccount: { findFirst: jest.fn() } },
}))
jest.mock("@/lib/provider", () => ({ getProviderForServer: jest.fn() }))
jest.mock("@wildcatfi/wildcat-sdk", () => ({
  ...jest.requireActual("@wildcatfi/wildcat-sdk"),
  describeAccount: jest.fn(),
}))

const owner = privateKeyToAccount(`0x${"11".repeat(32)}`)
const stranger = privateKeyToAccount(`0x${"22".repeat(32)}`)
const address = "0xc15be5214978d1fc509ecdd4f9d5bc067c94d9ae"
const getOwners = jest.fn()
const provider = {
  getBlockNumber: jest.fn().mockResolvedValue(123),
  call: jest.fn(async ({ data }: { data: string }, blockTag?: number) => {
    if (data === toFunctionSelector("getOwners()")) {
      const owners = await getOwners({ blockTag })
      return encodeAbiParameters([{ type: "address[]" }], [owners])
    }
    return encodeAbiParameters([{ type: "bytes4" }], ["0xffffffff"])
  }),
} as unknown as ReturnType<typeof getProviderForServer>
const originalSecret = process.env.SECRET_KEY

beforeAll(() => {
  process.env.SECRET_KEY = "safe-owner-login-test-only"
  // Only RPC/account descriptions and the database are mocked. Signature recovery,
  // route validation, JWT issuance and refresh verification run their real code.
})

afterAll(() => {
  if (originalSecret === undefined) delete process.env.SECRET_KEY
  else process.env.SECRET_KEY = originalSecret
  jest.restoreAllMocks()
})

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(getProviderForServer).mockReturnValue(provider)
  jest.mocked(describeAccount).mockResolvedValue({
    kind: AccountKind.Safe,
    owners: [owner.address],
    threshold: 3,
  })
  getOwners.mockResolvedValue([owner.address])
  jest.mocked(prisma.adminAccount.findFirst).mockResolvedValue(null)
})

async function loginRequest({
  chainId = 9745,
  messageChainId = chainId,
  timeSigned = Math.floor(Date.now() / 1000),
  wallet = owner,
  account = address,
} = {}) {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      address: account,
      chainId,
      timeSigned,
      signature: await wallet.signMessage({
        message: getLoginSignatureMessage(account, timeSigned, messageChainId),
      }),
    }),
  })
}

const refreshRequest = (token: string) =>
  new NextRequest("http://localhost/api/auth/refresh", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  })

it.each([1, 11155111, 9745, 9746] as const)(
  "logs an owner in as the Safe on chain %s, retaining both identities",
  async (chainId) => {
    const response = await login(await loginRequest({ chainId }))
    expect(response.status).toBe(200)
    const token = await response.json()
    const expected = {
      address,
      signer: owner.address.toLowerCase(),
      chainId,
      isAdmin: false,
    }
    expect(token).toMatchObject(expected)
    expect(verify(token.token, process.env.SECRET_KEY!)).toMatchObject(expected)
    expect(getProviderForServer).toHaveBeenCalledWith(chainId)
    expect(getOwners).toHaveBeenCalledWith({ blockTag: 123 })
    expect(prisma.adminAccount.findFirst).toHaveBeenCalledWith({
      where: { address, chainId },
    })
  },
)

it("rejects a non-owner", async () => {
  const response = await login(await loginRequest({ wallet: stranger }))
  expect(response.status).toBe(400)
  expect(prisma.adminAccount.findFirst).not.toHaveBeenCalled()
})

it("uses the Safe's chain-specific admin permission for owner login", async () => {
  jest
    .mocked(prisma.adminAccount.findFirst)
    .mockResolvedValue({ id: 1, address, chainId: 9745 })
  const response = await login(await loginRequest())
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({
    address,
    signer: owner.address.toLowerCase(),
    chainId: 9745,
    isAdmin: true,
  })
  expect(prisma.adminAccount.findFirst).toHaveBeenCalledWith({
    where: { address, chainId: 9745 },
  })
})

it("retains API login for a signature validated by the full Safe verification path", async () => {
  jest
    .mocked(provider.call)
    .mockResolvedValueOnce(
      encodeAbiParameters([{ type: "bytes4" }], ["0x20c13b0b"]),
    )
  const response = await login(
    new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        address,
        chainId: 9745,
        signature: "0x",
        timeSigned: Math.floor(Date.now() / 1000),
      }),
    }),
  )
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({ address, signer: address })
})

it("rejects replaying a mainnet login signature on Plasma", async () => {
  const response = await login(await loginRequest({ messageChainId: 1 }))
  expect(response.status).toBe(400)
})

it.each([-LOGIN_SIGNATURE_MAX_AGE_SECONDS - 1, 60])(
  "rejects a login timestamp with offset %s seconds",
  async (offset) => {
    const response = await login(
      await loginRequest({
        timeSigned: Math.floor(Date.now() / 1000) + offset,
      }),
    )
    expect(response.status).toBe(400)
    expect(describeAccount).not.toHaveBeenCalled()
  },
)

it("retains ordinary EOA login", async () => {
  jest
    .mocked(describeAccount)
    .mockResolvedValue({ kind: AccountKind.EOA, has7702Delegation: false })
  const response = await login(await loginRequest({ account: owner.address }))
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({
    address: owner.address.toLowerCase(),
    signer: owner.address.toLowerCase(),
  })
})

it("does not accept a single owner signature for an agreement", async () => {
  const message = "Accept this agreement"
  const result = await verifyAndDescribeSignature({
    provider,
    address,
    message,
    signature: await owner.signMessage({ message }),
    allowSingleSafeOwner: false,
  })
  expect(result).toBeUndefined()
  expect(getOwners).not.toHaveBeenCalled()
})

it.each([1, 11155111, 9745, 9746] as const)(
  "rechecks ownership on chain %s and retains the owner during refresh",
  async (chainId) => {
    const token = await createApiToken(address, chainId, owner.address)
    const response = await refresh(refreshRequest(token!.token))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      address,
      signer: owner.address.toLowerCase(),
      chainId,
    })
    expect(describeAccount).toHaveBeenCalledWith(provider, address)
    expect(getProviderForServer).toHaveBeenCalledWith(chainId)
  },
)

it("rejects refresh after the signing owner is removed", async () => {
  const token = await createApiToken(address, 9745, owner.address)
  jest.mocked(describeAccount).mockResolvedValue({
    kind: AccountKind.Safe,
    owners: [stranger.address],
    threshold: 1,
  })
  jest.mocked(prisma.adminAccount.findFirst).mockClear()
  const response = await refresh(refreshRequest(token!.token))
  expect(response.status).toBe(401)
  expect(prisma.adminAccount.findFirst).not.toHaveBeenCalled()
})

it("rejects owner-session refresh when the account is no longer a Safe", async () => {
  const token = await createApiToken(address, 11155111, owner.address)
  jest.mocked(describeAccount).mockResolvedValue({
    kind: AccountKind.UnknownContract,
  })
  jest.mocked(prisma.adminAccount.findFirst).mockClear()
  const response = await refresh(refreshRequest(token!.token))
  expect(response.status).toBe(401)
  expect(prisma.adminAccount.findFirst).not.toHaveBeenCalled()
})

it("does not issue a refreshed session when ownership cannot be read", async () => {
  const token = await createApiToken(address, 11155111, owner.address)
  jest
    .mocked(describeAccount)
    .mockRejectedValueOnce(new Error("RPC unavailable"))
  jest.mocked(prisma.adminAccount.findFirst).mockClear()
  await expect(refresh(refreshRequest(token!.token))).rejects.toThrow(
    "RPC unavailable",
  )
  expect(prisma.adminAccount.findFirst).not.toHaveBeenCalled()
})

it("retains refresh for a full Safe signature session", async () => {
  const token = await createApiToken(address, 9745, address)
  const response = await refresh(refreshRequest(token!.token))
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({ address, signer: address })
  expect(describeAccount).not.toHaveBeenCalled()
})

it("rejects an invalid refresh token before calling RPC or the database", async () => {
  const response = await refresh(refreshRequest("invalid"))
  expect(response.status).toBe(401)
  expect(describeAccount).not.toHaveBeenCalled()
  expect(prisma.adminAccount.findFirst).not.toHaveBeenCalled()
})
