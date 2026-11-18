/** @jest-environment node */
import { Market } from "@wildcatfi/wildcat-sdk"
import { NextRequest } from "next/server"

import {
  isAdminForChain,
  isAdminForNetworkClass,
  verifyApiToken,
} from "@/app/api/auth/verify-header"
import { findBorrowerRegistration, prisma } from "@/lib/db"

import { POST as assignMla } from "./[market]/route"
import { dummyCustomMla } from "./__fixtures__/dummyCustomMla"
import {
  GET as getTemplate,
  PATCH as updateTemplate,
} from "./templates/[id]/route"
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
  it("lists only market MLAs without a login", async () => {
    await listTemplates(request(`/api/mla/templates?chainId=${SEPOLIA}`))
    expect(prisma.mlaTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isTestnet: true, retiredAt: null, OR: [{ borrowerId: null }] },
      }),
    )
  })

  it("adds the logged-in borrower's own custom MLAs", async () => {
    loginAs(BORROWER_ADDRESS)
    jest
      .mocked(findBorrowerRegistration)
      .mockResolvedValue(registration(OWN_BORROWER))
    await listTemplates(request(`/api/mla/templates?chainId=${SEPOLIA}`))
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
  it("hides another borrower's custom MLA", async () => {
    loginAs(BORROWER_ADDRESS)
    jest
      .mocked(findBorrowerRegistration)
      .mockResolvedValue(registration(OTHER_BORROWER))
    jest
      .mocked(prisma.mlaTemplate.findFirst)
      .mockResolvedValue(template() as never)
    const response = await getTemplate(
      request(`/api/mla/templates/7?chainId=${SEPOLIA}`),
      { params: { id: "7" } },
    )
    expect(response.status).toBe(404)
  })

  it("shows a custom MLA to its borrower", async () => {
    loginAs(BORROWER_ADDRESS)
    jest
      .mocked(findBorrowerRegistration)
      .mockResolvedValue(registration(OWN_BORROWER))
    jest
      .mocked(prisma.mlaTemplate.findFirst)
      .mockResolvedValue(template() as never)
    const response = await getTemplate(
      request(`/api/mla/templates/7?chainId=${SEPOLIA}`),
      { params: { id: "7" } },
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      id: 7,
      borrowerId: OWN_BORROWER,
      version: "1.0",
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

describe("POST /api/mla/templates", () => {
  beforeEach(() => {
    loginAs(BORROWER_ADDRESS, true)
    jest.mocked(isAdminForChain).mockResolvedValue(true)
    jest
      .mocked(prisma.$transaction)
      .mockImplementation(async (fn: unknown) =>
        (fn as (tx: typeof prisma) => unknown)(prisma),
      )
    jest
      .mocked(prisma.mlaTemplate.create)
      .mockImplementation((({ data }: { data: object }) =>
        Promise.resolve({ id: 9, ...data })) as never)
  })

  it("registers the fixture for one borrower, generating escaped HTML", async () => {
    jest
      .mocked(prisma.borrower.findUnique)
      .mockResolvedValue({ isTestnet: true } as never)
    const response = await createTemplate(
      request("/api/mla/templates", "POST", {
        ...dummyCustomMla,
        borrowerId: OWN_BORROWER,
      }),
    )
    expect(response.status).toBe(200)
    const { data } = jest.mocked(prisma.mlaTemplate.create).mock.calls[0][0]
    expect(data).toMatchObject({
      borrowerId: OWN_BORROWER,
      isTestnet: true,
      name: dummyCustomMla.name,
      version: dummyCustomMla.version,
    })
    expect(data.html).toContain("<p>MASTER LOAN AGREEMENT")
    expect(prisma.mlaTemplate.updateMany).not.toHaveBeenCalled()
  })

  it("refuses the fixture unchanged: its borrower id matches nobody", async () => {
    jest.mocked(prisma.borrower.findUnique).mockResolvedValue(null)
    const response = await createTemplate(
      request("/api/mla/templates", "POST", dummyCustomMla),
    )
    expect(response.status).toBe(400)
    expect(prisma.mlaTemplate.create).not.toHaveBeenCalled()
  })

  it("refuses a borrower of the other network class", async () => {
    jest
      .mocked(prisma.borrower.findUnique)
      .mockResolvedValue({ isTestnet: false } as never)
    const response = await createTemplate(
      request("/api/mla/templates", "POST", {
        ...dummyCustomMla,
        borrowerId: OWN_BORROWER,
      }),
    )
    expect(response.status).toBe(400)
  })

  it("refuses a placeholder that is not listed as a field", async () => {
    const response = await createTemplate(
      request("/api/mla/templates", "POST", {
        ...dummyCustomMla,
        borrowerId: OWN_BORROWER,
        plaintext: `${dummyCustomMla.plaintext}\n{{market.symbol}}`,
      }),
    )
    expect(response.status).toBe(400)
    expect((await response.json()).problems).toEqual([
      "{{market.symbol}} is used in the text but not listed as a field",
    ])
  })

  it("refuses a custom MLA without a version", async () => {
    const response = await createTemplate(
      request("/api/mla/templates", "POST", {
        ...dummyCustomMla,
        borrowerId: OWN_BORROWER,
        version: undefined,
      }),
    )
    expect(response.status).toBe(400)
  })

  it("is admin-only", async () => {
    jest.mocked(isAdminForChain).mockResolvedValue(false)
    const response = await createTemplate(
      request("/api/mla/templates", "POST", {
        ...dummyCustomMla,
        borrowerId: OWN_BORROWER,
      }),
    )
    expect(response.status).toBe(403)
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

  const assign = () =>
    assignMla(
      request(`/api/mla/${MARKET}`, "POST", {
        chainId: SEPOLIA,
        mlaTemplate: 7,
        timeSigned: Date.now(),
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

  it("refuses a retired template", async () => {
    jest
      .mocked(findBorrowerRegistration)
      .mockResolvedValue(registration(OWN_BORROWER))
    jest
      .mocked(prisma.mlaTemplate.findFirst)
      .mockResolvedValue(template({ retiredAt: new Date() }) as never)
    const response = await assign()
    expect(response.status).toBe(400)
    expect(transaction.marketMlaDecision.create).not.toHaveBeenCalled()
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
