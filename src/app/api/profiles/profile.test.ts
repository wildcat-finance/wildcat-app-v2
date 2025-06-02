/**
 * @jest-environment node
 */

// eslint-disable-next-line import/no-extraneous-dependencies
import { randomBytes } from "crypto"
import { before } from "node:test"

import { getLensV2Contract, Market } from "@wildcatfi/wildcat-sdk"
import { Wallet } from "ethers"
import { NextApiRequest } from "next"
import { RequestInit } from "next/dist/server/web/spec-extension/request"
import { NextRequest } from "next/server"
// import { Body, createMocks, createRequest } from "node-mocks-http"

import { TargetChainId, TargetNetwork } from "@/config/network"
import AgreementText from "@/config/wildcat-service-agreement-acknowledgement.json"
import { prisma } from "@/lib/db"
import {
  BasicBorrowerInfo,
  fillInMlaTemplate,
  getFieldValuesForBorrower,
  MlaTemplateField,
} from "@/lib/mla"
import { getProviderForServer } from "@/lib/provider"
import { dayjs } from "@/utils/dayjs"

import { GET as getProfile, DELETE as deleteProfile } from "./[address]/route"
import { GET as getAllProfiles } from "./route"
import {
  GET as getProfileUpdateRequests,
  POST as postProfileUpdateRequest,
  PUT as putProfileUpdateRequest,
  DELETE as deleteProfileUpdateRequest,
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

export const mockPut = (
  path: string,
  body: unknown = null,
  otherOptions: Omit<RequestInit, "body"> = {},
): NextRequest =>
  new NextRequest(`http://localhost:3000${path}`, {
    method: "PUT",
    body: body ? JSON.stringify(body) : null,
    ...otherOptions,
  })

export const mockHead = (
  path: string,
  otherOptions: RequestInit = {},
): NextRequest =>
  new NextRequest(`http://localhost:3000${path}`, {
    method: "HEAD",
    ...otherOptions,
  })

export const mockPost = (
  path: string,
  body: unknown = null,
  otherOptions: Omit<RequestInit, "body"> = {},
): NextRequest =>
  new NextRequest(`http://localhost:3000${path}`, {
    method: "POST",
    body: body ? JSON.stringify(body) : null,
    ...otherOptions,
  })
export const mockGet = (
  path: string,
  otherOptions: RequestInit = {},
): NextRequest =>
  new NextRequest(`http://localhost:3000${path}`, {
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
  {
    source: "market.allowForceBuyBack",
    placeholder: "Insert Allow Force Buy Back",
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

describe("API", () => {
  const privateKey = randomBytes(32)
  const adminPrivateKey = randomBytes(32)

  const provider = getProviderForServer()
  const wallet = new Wallet(privateKey, provider)
  const adminWallet = new Wallet(adminPrivateKey, provider)
  const otherWallet = Wallet.createRandom({ provider })
  const realWallet = new Wallet(
    process.env.TEST_BORROWER_PRIVATE_KEY as `0x${string}`,
    provider,
  )
  const borrowerAddress = wallet.address as `0x${string}`
  let adminToken: string = ""
  let borrowerToken: string = ""
  let otherToken: string = ""

  async function getToken(walletToUse: Wallet, isAdmin: boolean) {
    if (isAdmin) {
      const isAlreadyAdmin = await prisma.adminAccount.findFirst({
        where: {
          address: walletToUse.address.toLowerCase(),
        },
      })
      if (!isAlreadyAdmin) {
        await prisma.adminAccount.create({
          data: {
            address: walletToUse.address.toLowerCase(),
          },
        })
      }
    }
    const timeSigned = Date.now()
    const LoginMessage = `Connect to wildcat.finance as account ${walletToUse.address.toLowerCase()}\nDate: ${dayjs(
      timeSigned,
    ).format("MMMM DD, YYYY")}`
    const signature = await walletToUse.signMessage(LoginMessage)
    const req = mockPost("/api/auth/login", {
      address: walletToUse.address,
      signature,
      timeSigned,
    } as LoginInput)
    const response = await postLogin(req)
    expect(response.status).toEqual(200)
    const { token } = await response.json()
    return token
  }

  const invite: BorrowerInvitationInput = {
    address: borrowerAddress,
    name: "Borrower 1",
  }
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
        timeSigned: Date.now(),
      })
      const response = await postLogin(req)
      expect(response.status).toBe(400)
      expect(await response.json()).toEqual({ error: "Invalid signature" })
    })

    test("[POST] Succeeds with ECDSA signature", async () => {
      const timeSigned = Date.now()
      const LoginMessage = `Connect to wildcat.finance as account ${adminWallet.address.toLowerCase()}\nDate: ${dayjs(
        timeSigned,
      ).format("MMMM DD, YYYY")}`
      const signature = await adminWallet.signMessage(LoginMessage)
      const req = mockPost("/api/auth/login", {
        address: adminWallet.address,
        signature,
        timeSigned,
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
      const req = mockPost("/api/invite", invite)
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
          timeInvited: expect.any(String),
        },
      })
    })

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
          timeInvited: expect.any(String),
        },
      })
    })

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
      expect(response.status).toBe(401)
      expect(await response.json()).toEqual({
        error: "Unauthorized",
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
      const wallet2 = Wallet.createRandom({ provider })
      const token = await getToken(wallet2, false)
      const body: AcceptInvitationInput = {
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
      let agreementText = AgreementText
      const timeSigned = Date.now()
      const dateSigned = dayjs(timeSigned).format("MMMM DD, YYYY")
      if (dateSigned) {
        agreementText = `${agreementText}\n\nDate: ${dateSigned}`
      }
      agreementText = `${agreementText}\n\nOrganization Name: ${invite.name}`
      const wallet2 = Wallet.createRandom({ provider })
      const body: AcceptInvitationInput = {
        address: borrowerAddress,
        name: invite.name,
        timeSigned,
        signature: await wallet2.signMessage(agreementText),
      }
      const req = mockPut(`/api/invite/${wallet2.address}`, body, {
        headers: {
          Authorization: `Bearer ${borrowerToken}`,
        },
      })
      const response = await putBorrowerInvite(req)
      expect(response.status).toBe(400)
      expect(await response.json()).toEqual({ error: "Invalid signature" })
    })

    test("Accepts EOA signature", async () => {
      let agreementText = AgreementText
      const timeSigned = Date.now()
      const dateSigned = dayjs(timeSigned).format("MMMM DD, YYYY")
      if (dateSigned) {
        agreementText = `${agreementText}\n\nDate: ${dateSigned}`
      }
      agreementText = `${agreementText}\n\nOrganization Name: ${invite.name}`
      const body: AcceptInvitationInput = {
        address: borrowerAddress,
        name: invite.name,
        timeSigned,
        signature: await wallet.signMessage(agreementText),
      }
      const req = mockPut(`/api/invite/${borrowerAddress}`, body, {
        headers: {
          Authorization: `Bearer ${borrowerToken}`,
        },
      })
      const response = await putBorrowerInvite(req)
      expect(response.status).toBe(200)
      expect(await response.json()).toEqual({ success: true })
    })
  })
  // })

  describe("/api/profiles", () => {
    describe("[GET] /api/profiles/[address]", () => {
      test("Returns 404 if no profile exists", async () => {
        const req = mockGet(`/api/profiles/${otherWallet.address}`)
        const response = await getProfile(req, {
          params: { address: otherWallet.address as `0x${string}` },
        })
        expect(response.status).toBe(404)
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
            name: "Borrower 1",
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
    })
  })

  describe("[POST] /api/mla/templates", () => {
    test("Create a new MLA template", async () => {
      if ((await prisma.mlaTemplate.count()) > 0) {
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

  describe("[POST] /api/mla/[market]", () => {
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
      const mlaTemplate = await prisma.mlaTemplate.findFirst()
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
      const marketAddress = "0xbab3e079d3f28a58a14e316dcb15a8b2cc25ca80"
      await clearMla(marketAddress)
      await resetMlaTemplate()
      const mlaTemplate = await prisma.mlaTemplate.findFirst()
      if (!mlaTemplate) {
        throw new Error("No MLA template found")
      }

      const market = await Market.getMarket(
        TargetChainId,
        marketAddress,
        provider,
      ).catch(async () => {
        const lens = getLensV2Contract(TargetChainId, provider)
        return Market.fromMarketDataV2(
          TargetChainId,
          provider,
          await lens.getMarketData(marketAddress),
        )
      })
      const borrowerProfile = await prisma.borrower.findFirst({
        where: {
          address: realWallet.address.toLowerCase(),
        },
      })
      const timeSigned = Date.now()

      const values = getFieldValuesForBorrower({
        market,
        borrowerInfo: borrowerProfile as BasicBorrowerInfo,
        networkData: TargetNetwork,
        timeSigned,
        lastSlaUpdateTime: +lastSlaUpdateTime,
        asset: market.underlyingToken,
      })
      const filledTemplate = fillInMlaTemplate(
        mlaTemplate as unknown as MlaTemplate,
        values,
      )
      const signature = await realWallet.signMessage(filledTemplate.plaintext)
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
  })

  describe("[GET] /api/mla/templates", () => {
    test("Get all MLA templates", async () => {
      const response = await getMlaTemplates()
      expect(response.status).toBe(200)
      const results = (await response.json()) as MlaTemplate[]
      expect(
        results.some((r: MlaTemplate) => r.name === "Wildcat MLA Template"),
      ).toBe(true)
    })
  })
})
