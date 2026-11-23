/** @jest-environment node */
import { Prisma } from "@prisma/client"
import { Market } from "@wildcatfi/wildcat-sdk"
import { NextRequest } from "next/server"

import {
  isAdminForChain,
  isAdminForNetworkClass,
  verifyApiToken,
} from "@/app/api/auth/verify-header"
import { findBorrowerRegistration, prisma } from "@/lib/db"
import { getFieldValuesForBorrower } from "@/lib/mla"

import { POST as assignMla } from "./[market]/route"
import { dummyCustomMla } from "./__fixtures__/dummyCustomMla"
import {
  GET as getTemplate,
  PATCH as updateTemplate,
} from "./templates/[id]/route"
import { POST as registerCustomMla } from "./templates/custom/route"
import { GET as listTemplates, POST as createTemplate } from "./templates/route"

const SEPOLIA = 11155111
const MARKET = `0x${"1".repeat(40)}`
const BORROWER_ADDRESS = `0x${"2".repeat(40)}`
const OWN_BORROWER = "11111111-1111-4111-8111-111111111111"
const OTHER_BORROWER = "22222222-2222-4222-8222-222222222222"

jest.mock("@/lib/db", () => ({
  prisma: {
    mlaTemplate: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    borrower: { findUnique: jest.fn() },
    marketMlaDecision: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  },
  findBorrowerRegistration: jest.fn(),
  getMarketMlaDecision: jest.fn(),
  toMasterLoanAgreementResponse: jest.fn(),
  toBorrowerProfile: jest.fn(
    (address: string, chainId: number, registeredOnChain: boolean) => ({
      address,
      chainId,
      registeredOnChain,
      name: "Borrower",
    }),
  ),
}))
jest.mock("@/app/api/auth/verify-header", () => ({
  verifyApiToken: jest.fn(),
  isAdminForChain: jest.fn(),
  isAdminForNetworkClass: jest.fn(),
}))
jest.mock("@/lib/provider", () => ({
  getProviderForServer: jest.fn(() => ({ getCode: async () => "0x1234" })),
}))
jest.mock("@/lib/signatures", () => ({
  verifyAndDescribeSignature: jest.fn(
    async ({ address, signature }: { address: string; signature: string }) => ({
      kind: "ECDSA",
      address,
      signature,
    }),
  ),
}))
jest.mock("@/lib/mla", () => ({
  ...jest.requireActual("@/lib/mla"),
  getFieldValuesForBorrower: jest.fn(
    () => new Map([["market.address", MARKET]]),
  ),
}))
jest.mock("@wildcatfi/wildcat-sdk", () => ({
  ...jest.requireActual("@wildcatfi/wildcat-sdk"),
  Market: { getMarket: jest.fn() },
}))

const template = (overrides: Record<string, unknown> = {}) => ({
  id: 7,
  isTestnet: true,
  borrowerId: OWN_BORROWER,
  name: dummyCustomMla.name,
  version: dummyCustomMla.version,
  description: null,
  hide: false,
  isDefault: false,
  html: "<p>{{market.address}}</p>",
  plaintext: "Market {{market.address}}",
  borrowerFields: [{ source: "market.address", placeholder: "[Market]" }],
  lenderFields: [],
  retiredAt: null,
  ...overrides,
})

const request = (url: string, method?: string, body?: unknown) =>
  new NextRequest(`http://localhost${url}`, {
    method: method ?? "GET",
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { Authorization: "Bearer token" },
  })

const loginAs = (address: string, isAdmin = false) =>
  jest
    .mocked(verifyApiToken)
    .mockResolvedValue({ address, signer: address, isAdmin, chainId: SEPOLIA })

const registration = (borrowerId: string) =>
  ({
    chainId: SEPOLIA,
    address: BORROWER_ADDRESS,
    borrowerId,
    isTestnet: true,
    registeredOnChain: true,
    registeredBy: null,
    checkedAt: null,
    invitedBy: null,
    invitedAt: null,
    borrower: { id: borrowerId, name: "Borrower" },
  }) as unknown as Awaited<ReturnType<typeof findBorrowerRegistration>>

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(verifyApiToken).mockResolvedValue(undefined)
  jest.mocked(isAdminForChain).mockResolvedValue(false)
  jest.mocked(isAdminForNetworkClass).mockResolvedValue(false)
  jest.mocked(findBorrowerRegistration).mockResolvedValue(null)
  jest.mocked(prisma.mlaTemplate.findMany).mockResolvedValue([])
})

describe("GET /api/mla/templates", () => {
  it("lists only market MLAs when no borrower wallet is named", async () => {
    await listTemplates(
      request(`/api/mla/templates?chainId=${SEPOLIA}&borrower=0xnot-a-wallet`),
    )
    expect(findBorrowerRegistration).not.toHaveBeenCalled()
    expect(prisma.mlaTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isTestnet: true, retiredAt: null, OR: [{ borrowerId: null }] },
      }),
    )
  })

  it("adds the custom MLAs of the named wallet's organisation, without a login", async () => {
    jest
      .mocked(findBorrowerRegistration)
      .mockResolvedValue(registration(OWN_BORROWER))
    await listTemplates(
      request(
        `/api/mla/templates?chainId=${SEPOLIA}&borrower=${BORROWER_ADDRESS}`,
      ),
    )
    expect(findBorrowerRegistration).toHaveBeenCalledWith(
      SEPOLIA,
      BORROWER_ADDRESS,
    )
    expect(prisma.mlaTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isTestnet: true,
          retiredAt: null,
          OR: [{ borrowerId: null }, { borrowerId: OWN_BORROWER }],
        },
      }),
    )
  })
})

describe("GET /api/mla/templates/[id]", () => {
  const getOwnTemplate = (query = `&borrower=${BORROWER_ADDRESS}`) =>
    getTemplate(request(`/api/mla/templates/7?chainId=${SEPOLIA}${query}`), {
      params: { id: "7" },
    })

  it("hides a custom MLA from other borrowers' wallets and from no wallet", async () => {
    jest
      .mocked(prisma.mlaTemplate.findFirst)
      .mockResolvedValue(template() as never)
    jest
      .mocked(findBorrowerRegistration)
      .mockResolvedValue(registration(OTHER_BORROWER))
    expect((await getOwnTemplate()).status).toBe(404)
    expect((await getOwnTemplate("")).status).toBe(404)
  })

  it("shows a custom MLA to its borrower's wallet, without a login", async () => {
    jest
      .mocked(findBorrowerRegistration)
      .mockResolvedValue(registration(OWN_BORROWER))
    jest
      .mocked(prisma.mlaTemplate.findFirst)
      .mockResolvedValue(template() as never)
    const response = await getOwnTemplate()
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      id: 7,
      borrowerId: OWN_BORROWER,
      version: dummyCustomMla.version,
    })
  })

  it("shows any custom MLA to an admin of the network class", async () => {
    loginAs(BORROWER_ADDRESS, true)
    jest.mocked(isAdminForNetworkClass).mockResolvedValue(true)
    jest
      .mocked(prisma.mlaTemplate.findFirst)
      .mockResolvedValue(template() as never)
    expect((await getOwnTemplate("")).status).toBe(200)
  })

  it("returns a retired template with its retirement time", async () => {
    jest
      .mocked(findBorrowerRegistration)
      .mockResolvedValue(registration(OWN_BORROWER))
    const retiredAt = new Date("2026-11-19T10:00:00Z")
    jest
      .mocked(prisma.mlaTemplate.findFirst)
      .mockResolvedValue(template({ retiredAt }) as never)
    const response = await getOwnTemplate()
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      retiredAt: retiredAt.toISOString(),
    })
  })

  it("rejects an id that is not a number", async () => {
    const response = await getTemplate(
      request(`/api/mla/templates/abc?chainId=${SEPOLIA}`),
      { params: { id: "abc" } },
    )
    expect(response.status).toBe(404)
    expect(prisma.mlaTemplate.findFirst).not.toHaveBeenCalled()
  })
})

describe("POST /api/mla/templates/custom", () => {
  const ownFixture = { ...dummyCustomMla, borrowerId: OWN_BORROWER }

  beforeEach(() => {
    loginAs(BORROWER_ADDRESS, true)
    jest.mocked(isAdminForChain).mockResolvedValue(true)
    jest.mocked(prisma.mlaTemplate.findFirst).mockResolvedValue(null)
    jest
      .mocked(prisma.mlaTemplate.create)
      .mockImplementation((({ data }: { data: object }) =>
        Promise.resolve({ id: 9, ...data })) as never)
  })

  const register = (body: unknown) =>
    registerCustomMla(request("/api/mla/templates/custom", "POST", body))

  it("stores both texts, with fields labelled as the class's market MLA labels them", async () => {
    jest
      .mocked(prisma.borrower.findUnique)
      .mockResolvedValue({ isTestnet: true } as never)
    jest.mocked(prisma.mlaTemplate.findFirst).mockResolvedValue({
      borrowerFields: [{ source: "market.apr", placeholder: "Interest Rate" }],
      lenderFields: [
        { source: "lender.address", placeholder: "Lender Wallet" },
      ],
    } as never)
    const response = await register(ownFixture)
    expect(response.status).toBe(200)
    expect((await response.json()).id).toBe(9)
    expect(prisma.mlaTemplate.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isTestnet: true, borrowerId: null, retiredAt: null },
      }),
    )
    const { data } = jest.mocked(prisma.mlaTemplate.create).mock.calls[0][0]
    expect(data).toMatchObject({
      borrowerId: OWN_BORROWER,
      isTestnet: true,
      name: dummyCustomMla.name,
      version: dummyCustomMla.version,
      html: dummyCustomMla.html,
      plaintext: dummyCustomMla.plaintext,
      borrowerFields: [
        { source: "borrower.name", placeholder: "Borrower Name" },
        { source: "market.address", placeholder: "Market Address" },
        { source: "market.apr", placeholder: "Interest Rate" },
        {
          source: "market.withdrawalBatchDuration",
          placeholder: "Withdrawal Cycle",
        },
      ],
      lenderFields: [
        { source: "lender.timeSigned", placeholder: "Date Signed" },
        { source: "lender.address", placeholder: "Lender Wallet" },
      ],
    })
  })

  it("refuses texts whose placeholders do not match", async () => {
    jest
      .mocked(prisma.borrower.findUnique)
      .mockResolvedValue({ isTestnet: true } as never)
    const response = await register({
      ...ownFixture,
      plaintext: `${dummyCustomMla.plaintext}\n{{market.capacity}}`,
    })
    expect(response.status).toBe(400)
    expect((await response.json()).problems).toEqual([
      "{{market.capacity}} is in the plain text but not the HTML",
    ])
    expect(prisma.mlaTemplate.create).not.toHaveBeenCalled()
  })

  it("needs both texts", async () => {
    expect((await register({ ...ownFixture, html: " " })).status).toBe(400)
    expect((await register({ ...ownFixture, plaintext: "" })).status).toBe(400)
    expect(prisma.mlaTemplate.create).not.toHaveBeenCalled()
  })

  it("refuses the fixture unchanged: its borrower id matches nobody", async () => {
    jest.mocked(prisma.borrower.findUnique).mockResolvedValue(null)
    const response = await register(dummyCustomMla)
    expect(response.status).toBe(400)
    expect(prisma.mlaTemplate.create).not.toHaveBeenCalled()
  })

  it("refuses a borrower of the other network class", async () => {
    jest
      .mocked(prisma.borrower.findUnique)
      .mockResolvedValue({ isTestnet: false } as never)
    expect((await register(ownFixture)).status).toBe(400)
  })

  it("needs a version", async () => {
    expect((await register({ ...ownFixture, version: "" })).status).toBe(400)
  })

  it("refuses a second MLA with the same name and version", async () => {
    jest
      .mocked(prisma.borrower.findUnique)
      .mockResolvedValue({ isTestnet: true } as never)
    jest.mocked(prisma.mlaTemplate.create).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("duplicate", {
        code: "P2002",
        clientVersion: "6.0.1",
      }),
    )
    expect((await register(ownFixture)).status).toBe(409)
  })

  it("is admin-only", async () => {
    jest.mocked(isAdminForChain).mockResolvedValue(false)
    expect((await register(ownFixture)).status).toBe(403)
  })
})

describe("POST /api/mla/templates", () => {
  it("refuses a market MLA placeholder that is not listed as a field", async () => {
    loginAs(BORROWER_ADDRESS, true)
    jest.mocked(isAdminForChain).mockResolvedValue(true)
    const response = await createTemplate(
      request("/api/mla/templates", "POST", {
        chainId: SEPOLIA,
        name: "Market MLA",
        plaintext: "Market {{market.address}} at {{market.symbol}}",
        borrowerFields: [{ source: "market.address", placeholder: "" }],
        lenderFields: [],
      }),
    )
    expect(response.status).toBe(400)
    expect((await response.json()).problems).toEqual([
      "{{market.symbol}} is used in the text but not listed as a field",
    ])
  })

  it("refuses a name another offered market MLA of the class has", async () => {
    loginAs(BORROWER_ADDRESS, true)
    jest.mocked(isAdminForChain).mockResolvedValue(true)
    jest
      .mocked(prisma.mlaTemplate.findFirst)
      .mockResolvedValue({ id: 4 } as never)
    const response = await createTemplate(
      request("/api/mla/templates", "POST", {
        chainId: SEPOLIA,
        name: "Wildcat MLA Template",
        plaintext: "Market {{market.address}}",
        borrowerFields: [{ source: "market.address", placeholder: "" }],
        lenderFields: [],
      }),
    )
    expect(response.status).toBe(409)
    expect(prisma.mlaTemplate.findFirst).toHaveBeenCalledWith({
      where: {
        isTestnet: true,
        borrowerId: null,
        hide: false,
        name: "Wildcat MLA Template",
      },
      select: { id: true },
    })
    expect(prisma.mlaTemplate.create).not.toHaveBeenCalled()
  })
})

describe("PATCH /api/mla/templates/[id]", () => {
  beforeEach(() => {
    loginAs(BORROWER_ADDRESS, true)
    jest.mocked(isAdminForNetworkClass).mockResolvedValue(true)
  })

  it("retires a custom MLA", async () => {
    jest
      .mocked(prisma.mlaTemplate.findUnique)
      .mockResolvedValue(template() as never)
    const response = await updateTemplate(
      request("/api/mla/templates/7", "PATCH", { retired: true }),
      { params: { id: "7" } },
    )
    expect(response.status).toBe(200)
    expect(prisma.mlaTemplate.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { retiredAt: expect.any(Date) },
    })
  })

  it("leaves market MLAs alone", async () => {
    jest
      .mocked(prisma.mlaTemplate.findUnique)
      .mockResolvedValue(template({ borrowerId: null }) as never)
    const response = await updateTemplate(
      request("/api/mla/templates/7", "PATCH", { retired: true }),
      { params: { id: "7" } },
    )
    expect(response.status).toBe(400)
    expect(prisma.mlaTemplate.update).not.toHaveBeenCalled()
  })
})

describe("POST /api/mla/[market]", () => {
  const transaction = {
    $executeRaw: jest.fn(),
    marketMlaDecision: { findUnique: jest.fn(), create: jest.fn() },
  }

  beforeEach(() => {
    jest.mocked(Market.getMarket).mockResolvedValue({
      borrower: BORROWER_ADDRESS,
      underlyingToken: {},
    } as never)
    jest.mocked(prisma.marketMlaDecision.findUnique).mockResolvedValue(null)
    transaction.marketMlaDecision.findUnique.mockResolvedValue(null)
    jest
      .mocked(prisma.$transaction)
      .mockImplementation(async (fn: unknown) =>
        (fn as (tx: typeof transaction) => unknown)(transaction),
      )
  })

  const assign = (timeSigned = Date.now()) =>
    assignMla(
      request(`/api/mla/${MARKET}`, "POST", {
        chainId: SEPOLIA,
        mlaTemplate: 7,
        timeSigned,
        signature: "0xsignature",
      }),
      { params: { market: MARKET } },
    )

  it("refuses another borrower's custom MLA", async () => {
    jest
      .mocked(findBorrowerRegistration)
      .mockResolvedValue(registration(OTHER_BORROWER))
    jest
      .mocked(prisma.mlaTemplate.findFirst)
      .mockResolvedValue(template() as never)
    const response = await assign()
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: "MLA template not available to this borrower",
    })
    expect(transaction.marketMlaDecision.create).not.toHaveBeenCalled()
  })

  it("refuses an agreement signed after its template was retired", async () => {
    jest
      .mocked(findBorrowerRegistration)
      .mockResolvedValue(registration(OWN_BORROWER))
    jest
      .mocked(prisma.mlaTemplate.findFirst)
      .mockResolvedValue(
        template({ retiredAt: new Date(Date.now() - 60_000) }) as never,
      )
    const response = await assign()
    expect(response.status).toBe(400)
    expect(transaction.marketMlaDecision.create).not.toHaveBeenCalled()
  })

  it("keeps an agreement signed before its template was retired", async () => {
    // A Safe collected approvals for the deployment while an admin retired
    // the template; the market is on chain and its agreement still uploads.
    jest
      .mocked(findBorrowerRegistration)
      .mockResolvedValue(registration(OWN_BORROWER))
    jest
      .mocked(prisma.mlaTemplate.findFirst)
      .mockResolvedValue(
        template({ retiredAt: new Date(Date.now() - 60_000) }) as never,
      )
    const response = await assign(Date.now() - 120_000)
    expect(response.status).toBe(200)
    expect(transaction.marketMlaDecision.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ templateId: 7 }),
    })
  })

  it("accepts a hidden market MLA, which is only off the pick lists", async () => {
    jest
      .mocked(findBorrowerRegistration)
      .mockResolvedValue(registration(OWN_BORROWER))
    jest
      .mocked(prisma.mlaTemplate.findFirst)
      .mockResolvedValue(template({ borrowerId: null, hide: true }) as never)
    const response = await assign()
    expect(response.status).toBe(200)
  })

  it("stores HTML with filled values escaped and signs the plain text as is", async () => {
    jest
      .mocked(findBorrowerRegistration)
      .mockResolvedValue(registration(OWN_BORROWER))
    jest.mocked(prisma.mlaTemplate.findFirst).mockResolvedValue(
      template({
        html: "<p>{{market.address}} {{borrower.name}}</p>",
        plaintext: "Market {{market.address}} {{borrower.name}}",
        borrowerFields: [
          { source: "market.address", placeholder: "Market" },
          { source: "borrower.name", placeholder: "Borrower Name" },
        ],
      }) as never,
    )
    jest.mocked(getFieldValuesForBorrower).mockReturnValueOnce(
      new Map([
        ["market.address", MARKET],
        ["borrower.name", '<img src=x onerror="alert(1)">'],
      ]),
    )
    const response = await assign()
    expect(response.status).toBe(200)
    expect(transaction.marketMlaDecision.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        html: `<p>${MARKET} &lt;img src=x onerror=&quot;alert(1)&quot;&gt;</p>`,
        plaintext: `Market ${MARKET} <img src=x onerror="alert(1)">`,
      }),
    })
  })

  it("assigns the borrower's own custom MLA", async () => {
    jest
      .mocked(findBorrowerRegistration)
      .mockResolvedValue(registration(OWN_BORROWER))
    jest
      .mocked(prisma.mlaTemplate.findFirst)
      .mockResolvedValue(template() as never)
    const response = await assign()
    expect(response.status).toBe(200)
    expect(transaction.marketMlaDecision.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        market: MARKET,
        outcome: "Assigned",
        borrowerId: OWN_BORROWER,
        borrowerAddress: BORROWER_ADDRESS,
        templateId: 7,
        plaintext: `Market ${MARKET}`,
      }),
    })
  })
})
