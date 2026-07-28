/**
 * @jest-environment node
 */

import { SupportedChainId } from "@wildcatfi/wildcat-sdk"
import { sign } from "jsonwebtoken"
import { NextRequest } from "next/server"

import { getLoginSignatureMessage } from "@/config/api"
import { prisma } from "@/lib/db"
import { verifyAndDescribeSignature } from "@/lib/signatures"

import { POST as login } from "./login/route"
import { POST as refresh } from "./refresh/route"
import {
  createApiToken,
  isAdminForChain,
  verifyApiToken,
} from "./verify-header"

jest.mock("@/lib/db", () => ({
  prisma: {
    adminAccount: {
      findFirst: jest.fn(),
    },
  },
}))

jest.mock("@/lib/provider", () => ({
  getProviderForServer: jest.fn(() => ({ call: jest.fn() })),
}))

jest.mock("@/lib/signatures", () => ({
  verifyAndDescribeSignature: jest.fn(),
}))

const address = "0x1111111111111111111111111111111111111111"
const signature = `0x${"11".repeat(65)}`
const secret = "auth-test-secret"

const mockAdminLookup = prisma.adminAccount.findFirst as jest.Mock
const mockVerifySignature = verifyAndDescribeSignature as jest.Mock

const request = (
  path: string,
  body?: unknown,
  authorization?: string,
): NextRequest =>
  new NextRequest(`http://localhost${path}`, {
    method: "POST",
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    headers: {
      "Content-Type": "application/json",
      ...(authorization ? { Authorization: `Bearer ${authorization}` } : {}),
    },
  })

beforeEach(() => {
  process.env.SECRET_KEY = secret
  mockAdminLookup.mockReset()
  mockVerifySignature.mockReset()
})

describe("chain-scoped API authentication", () => {
  test("login binds the signature message and token to the requested chain", async () => {
    mockAdminLookup.mockResolvedValue({ id: 1 })
    mockVerifySignature.mockResolvedValue({
      kind: "ECDSA",
      address,
      signature,
    })
    const timeSigned = Math.floor(Date.now() / 1000)

    const response = await login(
      request("/api/auth/login", {
        address,
        signature,
        timeSigned,
        chainId: SupportedChainId.Sepolia,
      }),
    )

    expect(response.status).toBe(200)
    const session = await response.json()
    expect(session).toMatchObject({
      address,
      signer: address,
      chainId: SupportedChainId.Sepolia,
      isAdmin: true,
    })
    expect(mockVerifySignature).toHaveBeenCalledWith(
      expect.objectContaining({
        address,
        allowSingleSafeOwner: true,
        message: getLoginSignatureMessage(
          address,
          timeSigned,
          SupportedChainId.Sepolia,
        ),
      }),
    )

    const verified = await verifyApiToken(
      request("/api/protected", undefined, session.token),
    )
    expect(verified).toEqual({
      address,
      signer: address,
      chainId: SupportedChainId.Sepolia,
      isAdmin: true,
    })
  })

  test("admin authority cannot cross chains even when the token says admin", async () => {
    const token = {
      address,
      signer: address,
      chainId: SupportedChainId.Sepolia,
      isAdmin: true,
    }
    mockAdminLookup.mockResolvedValue({ id: 1 })

    await expect(
      isAdminForChain(token, SupportedChainId.Mainnet),
    ).resolves.toBe(false)
    expect(mockAdminLookup).not.toHaveBeenCalled()

    await expect(
      isAdminForChain(token, SupportedChainId.Sepolia),
    ).resolves.toBe(true)
    expect(mockAdminLookup).toHaveBeenCalledWith({
      where: {
        chainId: SupportedChainId.Sepolia,
        address,
      },
    })
  })

  test("refresh preserves chain scope and rechecks live admin membership", async () => {
    mockAdminLookup.mockResolvedValueOnce({ id: 1 }).mockResolvedValueOnce(null)
    const original = await createApiToken(address, SupportedChainId.Sepolia)
    expect(original?.isAdmin).toBe(true)

    const response = await refresh(
      request("/api/auth/refresh", undefined, original?.token),
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      address,
      chainId: SupportedChainId.Sepolia,
      isAdmin: false,
    })
  })

  test("legacy or unsupported-chain JWTs are rejected", async () => {
    const legacyToken = sign(
      { address, signer: address, isAdmin: true },
      secret,
      { expiresIn: 60 },
    )
    const unsupportedToken = sign(
      { address, signer: address, isAdmin: true, chainId: 31337 },
      secret,
      { expiresIn: 60 },
    )

    await expect(
      verifyApiToken(request("/api/protected", undefined, legacyToken)),
    ).resolves.toBeUndefined()
    await expect(
      verifyApiToken(request("/api/protected", undefined, unsupportedToken)),
    ).resolves.toBeUndefined()
  })

  test("login rejects stale and future timestamps before signature checks", async () => {
    const now = Math.floor(Date.now() / 1000)
    const responses = await Promise.all(
      [now - 3_601, now + 1].map((timeSigned) =>
        login(
          request("/api/auth/login", {
            address,
            signature,
            timeSigned,
            chainId: SupportedChainId.Sepolia,
          }),
        ),
      ),
    )
    responses.forEach((response) => expect(response.status).toBe(400))
    expect(mockVerifySignature).not.toHaveBeenCalled()
  })
})
