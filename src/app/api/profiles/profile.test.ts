/**
 * @jest-environment node
 */

// eslint-disable-next-line import/no-extraneous-dependencies
import { randomBytes } from "crypto"
import { before } from "node:test"

import { Market, SupportedChainId } from "@wildcatfi/wildcat-sdk"
import { NextApiRequest } from "next"
import { RequestInit } from "next/dist/server/web/spec-extension/request"
import { NextRequest } from "next/server"
import { bytesToHex, type Hex } from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
// import { Body, createMocks, createRequest } from "node-mocks-http"

import { getLoginSignatureMessage } from "@/config/api"
import { TargetChainId, TargetNetwork } from "@/config/network"
import { prisma } from "@/lib/db"
import {
  BasicBorrowerInfo,
  fillInMlaTemplate,
  getFieldValuesForBorrower,
  MlaTemplateField,
} from "@/lib/mla"
import { getProviderForServer } from "@/lib/provider"
import {
  buildServiceAgreementMessage,
  getCurrentServiceAgreement,
} from "@/lib/serviceAgreement"

import { GET as getProfile, DELETE as deleteProfile } from "./[address]/route"
import { GET as getAllProfiles } from "./route"
import {
  GET as getProfileUpdateRequests,
  POST as postProfileUpdateRequest,
  PUT as putProfileUpdateRequest,
} from "./updates/route"
import { LoginInput } from "../auth/login/interface"
import { POST as postLogin } from "../auth/login/route"
import {
  GET as getBorrowerInvite,
  HEAD as headBorrowerInvite,
} from "../invite/[address]/route"
import {
  AcceptInvitationInput,
  BorrowerInvitationInput,
} from "../invite/interface"
import {
  GET as getBorrowerInvites,
  POST as postBorrowerInvite,
  DELETE as deleteBorrowerInvite,
  PUT as putBorrowerInvite,
} from "../invite/route"
import { POST as postMla } from "../mla/[market]/route"
import {
  html as DefaultMlaHtml,
  plaintext as DefaultMlaPlaintext,
} from "../mla/default-mla.json"
import { lastSlaUpdateTime, MlaTemplate } from "../mla/interface"
import {
  POST as postMlaTemplate,
  GET as getMlaTemplates,
} from "../mla/templates/route"

const withDefaultChainId = (body: unknown) => {
  if (body && typeof body === "object" && !Array.isArray(body)) {
    return {
      chainId: TargetChainId,
      ...body,
    }
  }
  return body
}

const withDefaultChainIdParam = (path: string) => {
  const url = new URL(`http://localhost:3000${path}`)
  if (!url.searchParams.has("chainId")) {
    url.searchParams.set("chainId", `${TargetChainId}`)
  }
  return url
}

export const mockPut = (
  path: string,
  body: unknown = null,
  otherOptions: Omit<RequestInit, "body"> = {},
): NextRequest =>
  new NextRequest(withDefaultChainIdParam(path), {
    method: "PUT",
    body: body ? JSON.stringify(withDefaultChainId(body)) : null,
    ...otherOptions,
  })

export const mockHead = (
  path: string,
  otherOptions: RequestInit = {},
): NextRequest =>
  new NextRequest(withDefaultChainIdParam(path), {
    method: "HEAD",
    ...otherOptions,
  })

export const mockPost = (
  path: string,
  body: unknown = null,
  otherOptions: Omit<RequestInit, "body"> = {},
): NextRequest =>
  new NextRequest(withDefaultChainIdParam(path), {
    method: "POST",
    body: body ? JSON.stringify(withDefaultChainId(body)) : null,
    ...otherOptions,
  })
export const mockGet = (
  path: string,
  otherOptions: RequestInit = {},
): NextRequest =>
  new NextRequest(withDefaultChainIdParam(path), {
    method: "GET",
    ...otherOptions,
  })

const borrowerFields: MlaTemplateField[] = [
  // number
  { source: "network.chainId", placeholder: "Insert Network Chain ID" },
  // string
  { source: "network.name", placeholder: "Insert Network Name" },
  { source: "asset.name", placeholder: "Insert Asset Name" },
  { source: "asset.symbol", placeholder: "Insert Asset Symbol" },
  { source: "market.marketType", placeholder: "Insert Market Type" },
  { source: "market.name", placeholder: "Insert Market Name" },
  { source: "market.symbol", placeholder: "Insert Market Symbol" },
  { source: "borrower.name", placeholder: "Insert Borrower Name" },
  { source: "borrower.jurisdiction", placeholder: "Insert Jurisdiction" },
  {
    source: "borrower.physicalAddress",
    placeholder: "Insert Physical Address",
  },
  { source: "borrower.entityKind", placeholder: "Insert Entity Kind" },
  // address (format as checksum address)
  {
    source: "market.depositAccess",
    placeholder: "Insert Deposit Access",
  },
  {
    source: "market.transferAccess",
    placeholder: "Insert Transfer Access",
  },
  {
    source: "market.withdrawalAccess",
    placeholder: "Insert Withdrawal Access",
  },
  { source: "asset.address", placeholder: "Insert Asset Address" },
  { source: "market.address", placeholder: "Insert Market Address" },
  { source: "borrower.address", placeholder: "Insert Borrower Address" },
  // { source: "lender.address", placeholder: "Insert Lender Address" },
  {
    source: "chainalysisOracle.address",
    placeholder: "Insert Chainalysis Oracle Address",
  },
  {
    source: "hooksFactory.address",
    placeholder: "Insert Hooks Factory Address",
  },
  // token amount
  { source: "market.capacity", placeholder: "Insert Market Capacity" },
  {
    source: "market.minimumDeposit",
    placeholder: "Insert Minimum Deposit",
  },
  // duration
  {
    source: "market.delinquencyGracePeriod",
    placeholder: "Insert Delinquency Grace Period",
  },
  {
    source: "market.withdrawalBatchDuration",
    placeholder: "Insert Withdrawal Batch Duration",
  },
  // Date
  {
    source: "market.fixedTermEndTime",
    placeholder: "Insert Fixed Term End Time",
  },
  {
    source: "market.firstWithdrawalWindowStart",
    placeholder: "Insert First Withdrawal Window Start",
  },
  {
    source: "market.periodDuration",
    placeholder: "Insert Withdrawal Period Duration",
  },
  {
    source: "market.withdrawalWindowDuration",
    placeholder: "Insert Withdrawal Window Duration",
  },
  {
    source: "market.nextWithdrawalWindowStart",
    placeholder: "Insert Next Withdrawal Window Start",
  },
  {
    source: "borrower.timeSigned",
    placeholder: "Insert Borrower Time Signed",
  },
  // {
  //   source: "lender.timeSigned",
  //   placeholder: "Insert Lender Time Signed",
  // },
  // {
  //   source: "lender.timeSignedDayOrdinal",
  //   placeholder: "Insert Lender Time Signed Day Ordinal",
  // },
  // {
  //   source: "lender.timeSignedMonthYear",
  //   placeholder: "Insert Lender Time Signed Month Year",
  // },
  { source: "sla.timeUpdated", placeholder: "Insert SLA Time Updated" },
  // bips (format as %)
  { source: "market.apr", placeholder: "Insert APR" },
  {
    source: "market.delinquencyFee",
    placeholder: "Insert Delinquency Fee",
  },
  { source: "market.reserveRatio", placeholder: "Insert Reserve Ratio" },
  // boolean (format as Yes, No, N/A)
  {
    source: "market.allowClosureBeforeTerm",
    placeholder: "Insert Allow Closure Before Term",
  },
  {
    source: "market.allowTermReduction",
    placeholder: "Insert Allow Term Reduction",
  },
]
const lenderFields: MlaTemplateField[] = [
  {
    source: "lender.timeSigned",
    placeholder: "Insert Lender Time Signed",
  },
  {
    source: "lender.timeSignedDayOrdinal",
    placeholder: "Insert Lender Time Signed Day Ordinal",
  },
  {
    source: "lender.timeSignedMonthYear",
    placeholder: "Insert Lender Time Signed Month Year",
  },
  { source: "lender.address", placeholder: "Insert Lender Address" },
]

const nowSeconds = () => Math.floor(Date.now() / 1000)

process.env.SECRET_KEY ??= "test-secret"

describe("API", () => {
  const privateKey = randomBytes(32)
  const adminPrivateKey = randomBytes(32)

  const provider = getProviderForServer()
  const wallet = privateKeyToAccount(bytesToHex(privateKey))
  const adminWallet = privateKeyToAccount(bytesToHex(adminPrivateKey))
  const otherWallet = privateKeyToAccount(generatePrivateKey())
  const realWalletPrivateKey = process.env.TEST_BORROWER_PRIVATE_KEY as
    | Hex
    | undefined
  const borrowerAddress = wallet.address as `0x${string}`
  const otherChainId =
    TargetChainId === SupportedChainId.Mainnet
      ? SupportedChainId.Sepolia
      : SupportedChainId.Mainnet
  let adminToken: string = ""
  let borrowerToken: string = ""
  let otherToken: string = ""

  async function deleteAdminAccount(address: string) {
    const normalizedAddress = address.toLowerCase()
    await prisma.$executeRaw`
      DELETE FROM "AdminAccount"
      WHERE "address" = ${normalizedAddress}
        AND "chainId" = ${TargetChainId}
    `
  }

  async function ensureAdminAccount(address: string) {
    const normalizedAddress = address.toLowerCase()
    await prisma.adminAccount.upsert({
      where: {
        chainId_address: {
          chainId: TargetChainId,
          address: normalizedAddress,
        },
      },
      update: {},
      create: {
        chainId: TargetChainId,
        address: normalizedAddress,
      },
    })
  }

  async function getToken(walletToUse: typeof wallet, isAdmin: boolean) {
    if (isAdmin) {
      await ensureAdminAccount(walletToUse.address)
    }
    const timeSigned = nowSeconds()
    const LoginMessage = getLoginSignatureMessage(
      walletToUse.address,
      timeSigned,
      TargetChainId,
    )
    const signature = await walletToUse.signMessage({ message: LoginMessage })
    const req = mockPost("/api/auth/login", {
      address: walletToUse.address,
      signature,
      timeSigned,
      chainId: TargetChainId,
    } as LoginInput)
    const response = await postLogin(req)
    expect(response.status).toEqual(200)
    const { token } = await response.json()
    return token
  }

  const invite: BorrowerInvitationInput = {
    chainId: TargetChainId,
    address: borrowerAddress,
    name: "Borrower 1",
  }
  const acceptedBorrowerName = "Borrower 1 Updated"
  beforeAll(async () => {
    await Promise.all([
      getToken(adminWallet, true),
      getToken(wallet, false),
      getToken(otherWallet, false),
    ]).then(([adminTokenValue, borrowerTokenValue, otherTokenValue]) => {
      adminToken = adminTokenValue
      borrowerToken = borrowerTokenValue
      otherToken = otherTokenValue
    })
  }, 10_000)

  afterAll(async () => {
    await deleteAdminAccount(adminWallet.address)
  })

  describe("/api/auth/login", () => {
    test("[POST] Fails if no signature", async () => {
      const req = mockPost("/api/auth/login", {
        address: borrowerAddress,
      })
      const response = await postLogin(req)
      expect(response.status).toBe(400)
    })

    test("[POST] Fails if invalid signature", async () => {
      const req = mockPost("/api/auth/login", {
        address: borrowerAddress,
        signature: "0x",
        timeSigned: nowSeconds(),
        chainId: TargetChainId,
      })
      const response = await postLogin(req)
      expect(response.status).toBe(400)
      expect(await response.json()).toEqual({ error: "Invalid signature" })
    })

    test("[POST] Succeeds with ECDSA signature", async () => {
      const timeSigned = nowSeconds()
      const LoginMessage = getLoginSignatureMessage(
        adminWallet.address,
        timeSigned,
        TargetChainId,
      )
      const signature = await adminWallet.signMessage({
        message: LoginMessage,
      })
      const req = mockPost("/api/auth/login", {
        address: adminWallet.address,
        signature,
        timeSigned,
        chainId: TargetChainId,
      } as LoginInput)
      const response = await postLogin(req)
      expect(response.status).toBe(200)
      const { token } = await response.json()
      expect(token).toBeDefined()
    })
  })

  // describe("/api/invite", () => {
  describe("[POST] /api/invite", () => {
    test("[POST] Fails if not admin", async () => {
      const req = mockPost("/api/invite", invite, {
        headers: {
          Authorization: `Bearer ${borrowerToken}`,
        },
      })
      const response = await postBorrowerInvite(req)
      expect(response.status).toBe(403)
      expect(await response.json()).toEqual({ error: "Forbidden" })
    })

    test("[POST] Creates invitation", async () => {
      // const adminToken = await getAdminToken()
      const req = mockPost("/api/invite", invite, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      })
      const response = await postBorrowerInvite(req)
      expect(response.status).toBe(200)
      expect(await response.json()).toEqual({ success: true })
    })

    test("[POST] Creates profile with name", async () => {
      const req = mockGet(`/api/profiles/${borrowerAddress}`)
      const response = await getProfile(req, {
        params: { address: borrowerAddress },
      })
      expect(response.status).toBe(200)
      expect(await response.json()).toEqual({
        profile: {
          address: borrowerAddress.toLowerCase(),
          chainId: TargetChainId,
          name: "Borrower 1",
          registeredOnChain: false,
        },
      })
    })

    test("[POST] Fails if parameter missing", async () => {
      const req = mockPost(
        "/api/invite",
        { inviter: borrowerAddress },
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        },
      )
      const response = await postBorrowerInvite(req)
      expect(response.status).toBe(400)
      expect(await response.json()).toHaveProperty("errors")
    })

    test("[POST] Fails if invitation already exists", async () => {
      const req = mockPost("/api/invite", invite, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      })
      const response = await postBorrowerInvite(req)
      expect(response.status).toBe(400)
      expect(await response.json()).toEqual({
        error: `An invitation for ${borrowerAddress.toLowerCase()} already exists`,
      })
    })
  })

  describe("[GET] /api/invite/[address]", () => {
    test("Fails if query unauthenticated", async () => {
      const req = mockGet(`/api/invite/${borrowerAddress}`)
      const response = await getBorrowerInvite(req, {
        params: { address: borrowerAddress },
      })
      expect(response.status).toBe(401)
    })

    test("Succeeds if user is admin", async () => {
      const req = mockGet(`/api/invite/${borrowerAddress}`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      })
      const response = await getBorrowerInvite(req, {
        params: { address: borrowerAddress },
      })
      expect(response.status).toBe(200)
      expect(await response.json()).toEqual({
        invitation: {
          id: expect.any(Number),
          inviter: adminWallet.address.toLowerCase(),
          address: borrowerAddress.toLowerCase(),
          chainId: TargetChainId,
          name: "Borrower 1",
          registeredOnChain: false,
          timeInvited: expect.any(String),
        },
      })
    }, 15_000)

    test("Succeeds if user is invited borrower", async () => {
      const req = mockGet(`/api/invite/${borrowerAddress}`, {
        headers: {
          Authorization: `Bearer ${borrowerToken}`,
        },
      })
      const response = await getBorrowerInvite(req, {
        params: { address: borrowerAddress },
      })
      expect(response.status).toBe(200)
      expect(await response.json()).toEqual({
        invitation: {
          id: expect.any(Number),
          inviter: adminWallet.address.toLowerCase(),
          address: borrowerAddress.toLowerCase(),
          chainId: TargetChainId,
          name: "Borrower 1",
          registeredOnChain: false,
          timeInvited: expect.any(String),
        },
      })
    }, 15_000)

    test("Returns 404 if no invitation exists", async () => {
      const req = mockGet(`/api/invite/${otherWallet.address}`, {
        headers: {
          Authorization: `Bearer ${otherToken}`,
        },
      })
      const response = await getBorrowerInvite(req, {
        params: { address: otherWallet.address as `0x${string}` },
      })
      expect(response.status).toBe(404)
      expect(await response.json()).toEqual({
        invitation: null,
      })
    })

    test("Returns 401 if token does not match address", async () => {
      const req = mockGet(`/api/invite/${borrowerAddress}`, {
        headers: {
          Authorization: `Bearer ${otherToken}`,
        },
      })
      const response = await getBorrowerInvite(req, {
        params: { address: borrowerAddress },
      })
      expect(response.status).toBe(403)
      expect(await response.json()).toEqual({
        error: "Forbidden",
      })
    })
  })

  describe("[HEAD] /api/invite/[address]", () => {
    test("Returns 200 if invitation exists", async () => {
      const req = mockHead(`/api/invite/${borrowerAddress}`)
      const response = await headBorrowerInvite(req, {
        params: { address: borrowerAddress },
      })
      expect(response.status).toBe(200)
    })

    test("Returns 404 if invitation does not exist", async () => {
      const req = mockHead(`/api/invite/${borrowerAddress}`)
      const response = await headBorrowerInvite(req, {
        params: { address: otherWallet.address as `0x${string}` },
      })
      expect(response.status).toBe(404)
    })
  })

  describe("[PUT] /api/invite/[address]", () => {
    test("Fails if invitation does not exist", async () => {
      const timeSigned = Date.now()
      const wallet2 = privateKeyToAccount(generatePrivateKey())
      const token = await getToken(wallet2, false)
      const body: AcceptInvitationInput = {
        chainId: TargetChainId,
        address: wallet2.address as `0x${string}`,
        name: invite.name,
        timeSigned,
        signature: "0x",
      }
      const req = mockPut(`/api/invite/${wallet2.address}`, body, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const response = await putBorrowerInvite(req)
      expect(response.status).toBe(404)
      expect(await response.json()).toEqual({
        error: `Pending borrower invitation not found for ${wallet2.address.toLowerCase()}`,
      })
    })

    test("Fails if EOA signature is from other account", async () => {
      const timeSigned = Date.now()
      const agreement = await getCurrentServiceAgreement()
      const agreementText = buildServiceAgreementMessage({
        acknowledgementText: agreement.acknowledgementText,
        timeSigned,
        chainId: TargetChainId,
        organizationName: invite.name,
      })
      const wallet2 = privateKeyToAccount(generatePrivateKey())
      const body: AcceptInvitationInput = {
        chainId: TargetChainId,
        address: borrowerAddress,
        name: invite.name,
        timeSigned,
        signature: await wallet2.signMessage({ message: agreementText }),
      }
      const req = mockPut(`/api/invite/${wallet2.address}`, body, {
        headers: {
          Authorization: `Bearer ${borrowerToken}`,
        },
      })
      const response = await putBorrowerInvite(req)
      expect(response.status).toBe(400)
      expect(await response.json()).toEqual({ error: "Invalid signature" })
    }, 15_000)

    test("rolls back a failed compatibility write and allows retry", async () => {
      const timeSigned = Date.now()
      const agreement = await getCurrentServiceAgreement()
      const agreementText = buildServiceAgreementMessage({
        acknowledgementText: agreement.acknowledgementText,
        timeSigned,
        chainId: TargetChainId,
        organizationName: acceptedBorrowerName,
      })
      const body: AcceptInvitationInput = {
        chainId: TargetChainId,
        address: borrowerAddress,
        name: acceptedBorrowerName,
        timeSigned,
        signature: await wallet.signMessage({ message: agreementText }),
      }

      let failCompatibilityWrite = true
      prisma.$use((params, next) => {
        if (
          failCompatibilityWrite &&
          params.model === "BorrowerServiceAgreementSignature" &&
          params.action === "upsert"
        ) {
          failCompatibilityWrite = false
          throw new Error("forced compatibility write failure")
        }
        return next(params)
      })

      const failedRequest = mockPut(`/api/invite/${borrowerAddress}`, body, {
        headers: {
          Authorization: `Bearer ${borrowerToken}`,
        },
      })
      await expect(putBorrowerInvite(failedRequest)).rejects.toThrow(
        "forced compatibility write failure",
      )

      await expect(
        prisma.serviceAgreementSignature.findUnique({
          where: {
            chainId_address_party_serviceAgreementId: {
              chainId: TargetChainId,
              address: borrowerAddress.toLowerCase(),
              party: "Borrower",
              serviceAgreementId: agreement.id,
            },
          },
        }),
      ).resolves.toBeNull()
      await expect(
        prisma.borrower.findUnique({
          where: {
            chainId_address: {
              chainId: TargetChainId,
              address: borrowerAddress.toLowerCase(),
            },
          },
          select: { name: true },
        }),
      ).resolves.toEqual({ name: invite.name })

      const retryRequest = mockPut(`/api/invite/${borrowerAddress}`, body, {
        headers: {
          Authorization: `Bearer ${borrowerToken}`,
        },
      })
      const response = await putBorrowerInvite(retryRequest)
      expect(response.status).toBe(200)
      expect(await response.json()).toEqual({ success: true })
    }, 60_000)
  })
  // })

  describe("/api/profiles", () => {
    describe("[GET] /api/profiles/[address]", () => {
      test("Returns an empty profile response if no profile exists", async () => {
        const req = mockGet(`/api/profiles/${otherWallet.address}`)
        const response = await getProfile(req, {
          params: { address: otherWallet.address as `0x${string}` },
        })
        expect(response.status).toBe(200)
        expect(await response.json()).toEqual({ profile: null })
      })

      test("Returns profile if exists", async () => {
        const req = mockGet(`/api/profiles/${borrowerAddress}`)
        const response = await getProfile(req, {
          params: { address: borrowerAddress },
        })
        expect(response.status).toBe(200)
        expect(await response.json()).toEqual({
          profile: {
            address: borrowerAddress.toLowerCase(),
            chainId: TargetChainId,
            name: acceptedBorrowerName,
            registeredOnChain: false,
          },
        })
      })
    })

    describe("[POST] /api/profiles/updates", () => {
      test("Fails if not authenticated", async () => {
        const req = mockPost("/api/profiles/updates", {
          name: "Borrower 1",
        })
        const response = await postProfileUpdateRequest(req)
        expect(response.status).toBe(401)
        expect(await response.json()).toEqual({ error: "Unauthorized" })
      })

      test("Fails if no profile exists", async () => {
        const req = mockPost(
          "/api/profiles/updates",
          {
            chainId: TargetChainId,
            name: "Borrower 1",
          },
          {
            headers: {
              Authorization: `Bearer ${otherToken}`,
            },
          },
        )
        const response = await postProfileUpdateRequest(req)
        expect(response.status).toBe(404)
        expect(await response.json()).toEqual({
          error: `Borrower ${otherWallet.address.toLowerCase()} not found`,
        })
      })

      test("Rejects borrower self-update with token from another chain", async () => {
        await prisma.borrower.upsert({
          where: {
            chainId_address: {
              chainId: otherChainId,
              address: borrowerAddress.toLowerCase(),
            },
          },
          create: {
            chainId: otherChainId,
            address: borrowerAddress.toLowerCase(),
            name: "Other-chain borrower",
            registeredOnChain: false,
          },
          update: {
            name: "Other-chain borrower",
          },
        })
        const updatesBefore = await prisma.borrowerProfileUpdateRequest.count({
          where: {
            chainId: otherChainId,
            address: borrowerAddress.toLowerCase(),
          },
        })
        const req = mockPost(
          "/api/profiles/updates",
          {
            chainId: otherChainId,
            name: "Cross-chain update",
          },
          {
            headers: {
              Authorization: `Bearer ${borrowerToken}`,
            },
          },
        )
        const response = await postProfileUpdateRequest(req)
        expect(response.status).toBe(403)
        expect(await response.json()).toEqual({ error: "Forbidden" })
        await expect(
          prisma.borrowerProfileUpdateRequest.count({
            where: {
              chainId: otherChainId,
              address: borrowerAddress.toLowerCase(),
            },
          }),
        ).resolves.toBe(updatesBefore)
        await expect(
          prisma.borrower.findUnique({
            where: {
              chainId_address: {
                chainId: otherChainId,
                address: borrowerAddress.toLowerCase(),
              },
            },
            select: {
              name: true,
            },
          }),
        ).resolves.toEqual({ name: "Other-chain borrower" })
      })

      test("Allows borrower self-update on token chain", async () => {
        const req = mockPost(
          "/api/profiles/updates",
          {
            chainId: TargetChainId,
            description: "Updated borrower profile",
          },
          {
            headers: {
              Authorization: `Bearer ${borrowerToken}`,
            },
          },
        )
        const response = await postProfileUpdateRequest(req)
        expect(response.status).toBe(200)
        expect(await response.json()).toEqual({
          success: true,
          updateId: expect.any(Number),
        })
        await expect(
          prisma.borrower.findUnique({
            where: {
              chainId_address: {
                chainId: TargetChainId,
                address: borrowerAddress.toLowerCase(),
              },
            },
            select: {
              description: true,
            },
          }),
        ).resolves.toEqual({ description: "Updated borrower profile" })
      })
    })
  })

  describe("[POST] /api/mla/templates", () => {
    test("Create a new MLA template", async () => {
      if (
        (await prisma.mlaTemplate.count({
          where: { chainId: TargetChainId },
        })) > 0
      ) {
        console.log("Skipping MLA template creation because it already exists")
        return
      }

      const req = mockPost(
        "/api/mla/templates",
        {
          borrowerFields,
          lenderFields,
          html: DefaultMlaHtml,
          plaintext: DefaultMlaPlaintext,
          name: "Wildcat MLA Template",
          description: "Default MLA Template",
        },
        {
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        },
      )
      const response = await postMlaTemplate(req)
      expect(response.status).toBe(200)
      console.log("Created MLA template")
    })
  })
  ;(realWalletPrivateKey ? describe : describe.skip)(
    "[POST] /api/mla/[market]",
    () => {
      async function clearMla(marketAddress: string) {
        marketAddress = marketAddress.toLowerCase()
        if (
          (await prisma.mlaSignature.count({
            where: {
              chainId: TargetChainId,
              market: marketAddress,
            },
          })) > 0
        ) {
          await prisma.mlaSignature.deleteMany({
            where: {
              chainId: TargetChainId,
              market: marketAddress,
            },
          })
          await prisma.masterLoanAgreement.deleteMany({
            where: {
              chainId: TargetChainId,
              market: marketAddress,
            },
          })
        }
      }

      async function resetMlaTemplate() {
        const mlaTemplate = await prisma.mlaTemplate.findFirst({
          where: { chainId: TargetChainId },
        })
        await prisma.mlaTemplate.update({
          where: {
            id: mlaTemplate?.id,
          },
          data: {
            html: DefaultMlaHtml,
            borrowerFields,
            lenderFields,
          },
        })
      }
      test("Create a new MLA for a given market", async () => {
        const realWallet = privateKeyToAccount(realWalletPrivateKey as Hex)
        const marketAddress = "0xbab3e079d3f28a58a14e316dcb15a8b2cc25ca80"
        await clearMla(marketAddress)
        await resetMlaTemplate()
        const mlaTemplate = await prisma.mlaTemplate.findFirst({
          where: { chainId: TargetChainId },
        })
        if (!mlaTemplate) {
          throw new Error("No MLA template found")
        }

        const market = await Market.getMarket(
          TargetChainId,
          marketAddress,
          provider,
        ).catch(() =>
          Market.getMarketV2(TargetChainId, marketAddress, provider),
        )
        const borrowerProfile = await prisma.borrower.upsert({
          where: {
            chainId_address: {
              chainId: TargetChainId,
              address: realWallet.address.toLowerCase(),
            },
          },
          create: {
            chainId: TargetChainId,
            address: realWallet.address.toLowerCase(),
            name: "MLA Test Borrower",
            jurisdiction: "United States",
            entityKind: "LLC",
            physicalAddress: "123 Test Street",
            registeredOnChain: false,
          },
          update: {
            name: "MLA Test Borrower",
            jurisdiction: "United States",
            entityKind: "LLC",
            physicalAddress: "123 Test Street",
          },
        })
        const timeSigned = Date.now()

        const values = getFieldValuesForBorrower({
          market,
          borrowerInfo: borrowerProfile as unknown as BasicBorrowerInfo,
          networkData: TargetNetwork,
          timeSigned,
          lastSlaUpdateTime: +lastSlaUpdateTime,
          asset: market.underlyingToken,
        })
        const filledTemplate = fillInMlaTemplate(
          mlaTemplate as unknown as MlaTemplate,
          values,
        )
        const signature = await realWallet.signMessage({
          message: filledTemplate.plaintext,
        })
        const req = mockPost(`/api/mla/${market.address}`, {
          mlaTemplate: mlaTemplate.id,
          timeSigned,
          signature,
        })
        const response = await postMla(req, {
          params: { market: market.address },
        })
        expect(response.status).toBe(200)
        expect(await response.json()).toEqual({
          success: true,
        })
      }, 30_000)
    },
  )

  describe("[GET] /api/mla/templates", () => {
    test("Get all MLA templates", async () => {
      const response = await getMlaTemplates(mockGet("/api/mla/templates"))
      expect(response.status).toBe(200)
      const results = (await response.json()) as MlaTemplate[]
      expect(
        results.some((r: MlaTemplate) => r.name === "Wildcat MLA Template"),
      ).toBe(true)
    })
  })
})
