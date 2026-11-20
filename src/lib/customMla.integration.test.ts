/** @jest-environment node */

// Opt in with a migrated, disposable Postgres database on this machine. The
// route handlers use the shared client, so DATABASE_URL must name it too:
// BORROWER_TEST_DATABASE_URL=postgresql://... DATABASE_URL=$BORROWER_TEST_DATABASE_URL \
//   npx jest customMla.integration.test.ts

import { randomBytes } from "node:crypto"

import { Market, SupportedChainId } from "@wildcatfi/wildcat-sdk"
import { sign } from "jsonwebtoken"
import { NextRequest } from "next/server"

import { GET as lenderZip } from "@/app/api/mla/[market]/[lender]/signed/route"
import { GET as marketHtml } from "@/app/api/mla/[market]/html/route"
import {
  GET as getMarketMla,
  POST as assignMla,
} from "@/app/api/mla/[market]/route"
import { GET as borrowerSigned } from "@/app/api/mla/[market]/signed/route"
import { dummyCustomMla } from "@/app/api/mla/__fixtures__/dummyCustomMla"
import { MlaTemplateMetadata } from "@/app/api/mla/interface"
import { POST as signAsLender } from "@/app/api/mla/lender-signature/route"
import {
  PATCH as retireTemplate,
  GET as getTemplate,
} from "@/app/api/mla/templates/[id]/route"
import {
  GET as listCustom,
  POST as registerCustomMla,
} from "@/app/api/mla/templates/custom/route"
import { GET as listTemplates } from "@/app/api/mla/templates/route"
import { prisma } from "@/lib/db"
import { MlaTemplateField } from "@/lib/mlaFields"

jest.mock("@/lib/provider", () => ({
  getProviderForServer: jest.fn(() => ({ getCode: async () => "0x1234" })),
}))
jest.mock("@/lib/signatures", () => ({
  ...jest.requireActual("@/lib/signatures"),
  verifyAndDescribeSignature: jest.fn(
    async ({ address, signature }: { address: string; signature: string }) => ({
      kind: "ECDSA",
      address,
      signature,
    }),
  ),
}))
jest.mock("@/lib/mla", () => {
  const actual = jest.requireActual("@/lib/mla")
  return {
    ...actual,
    // Market data comes from the chain; the test supplies the one value the
    // signed message needs.
    getFieldValuesForBorrower: jest.fn(
      ({ market }: { market: { address: string } }) =>
        new Map([
          ["market.address", market.address],
          ["borrower.name", "Filled Borrower"],
        ]),
    ),
  }
})
jest.mock("@wildcatfi/wildcat-sdk", () => ({
  ...jest.requireActual("@wildcatfi/wildcat-sdk"),
  Market: { getMarket: jest.fn() },
}))

const databaseUrl = process.env.BORROWER_TEST_DATABASE_URL
const isLocalDatabase =
  !!databaseUrl &&
  databaseUrl === process.env.DATABASE_URL &&
  /@(localhost|127\.0\.0\.1)(:\d+)?\//.test(databaseUrl)
const describeWithDatabase = isLocalDatabase ? describe : describe.skip

const randomAddress = () => `0x${randomBytes(20).toString("hex")}`

const SEPOLIA = SupportedChainId.Sepolia
const PLASMA_TESTNET = SupportedChainId.PlasmaTestnet

describeWithDatabase("custom MLAs against Postgres", () => {
  const runId = randomBytes(4).toString("hex")
  const admin = randomAddress()
  const ownSepolia = randomAddress()
  const ownPlasma = randomAddress()
  const otherSepolia = randomAddress()
  const lender = randomAddress()
  const ownMarket = randomAddress()
  const otherMarket = randomAddress()
  const lateMarket = randomAddress()
  const names = [`Own ${runId}`, `Other ${runId}`]
  let ownId = ""
  let otherId = ""
  let templateId = 0
  let lenderAddressPlaceholder = ""

  const tokenFor = (address: string, chainId: number, isAdmin = false) =>
    sign(
      { address, signer: address, isAdmin, chainId },
      process.env.SECRET_KEY as string,
    )

  const request = (
    url: string,
    init: { method?: string; body?: unknown; token?: string } = {},
  ) =>
    new NextRequest(`http://localhost${url}`, {
      method: init.method ?? "GET",
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      headers: init.token ? { Authorization: `Bearer ${init.token}` } : {},
    })

  const listedIds = async (chainId: number, token?: string) => {
    const response = await listTemplates(
      request(`/api/mla/templates?chainId=${chainId}`, { token }),
    )
    return ((await response.json()) as MlaTemplateMetadata[]).map(
      ({ id }) => id,
    )
  }

  const assign = (market: string, borrower: string) => {
    jest.mocked(Market.getMarket).mockResolvedValue({
      address: market,
      borrower,
      underlyingToken: {},
    } as never)
    return assignMla(
      request(`/api/mla/${market}`, {
        method: "POST",
        body: {
          chainId: SEPOLIA,
          mlaTemplate: templateId,
          timeSigned: Date.now(),
          signature: "0xsignature",
        },
      }),
      { params: { market } },
    )
  }

  beforeAll(async () => {
    process.env.SECRET_KEY = process.env.SECRET_KEY || `test-${runId}`
    await prisma.adminAccount.create({
      data: { chainId: SEPOLIA, address: admin },
    })
    const own = await prisma.borrower.create({
      data: {
        isTestnet: true,
        name: names[0],
        registrations: {
          create: [
            { chainId: SEPOLIA, address: ownSepolia },
            { chainId: PLASMA_TESTNET, address: ownPlasma },
          ],
        },
      },
    })
    const other = await prisma.borrower.create({
      data: {
        isTestnet: true,
        name: names[1],
        registrations: {
          create: [{ chainId: SEPOLIA, address: otherSepolia }],
        },
      },
    })
    ownId = own.id
    otherId = other.id
  })

  afterAll(async () => {
    const markets = [ownMarket, otherMarket, lateMarket]
    await prisma.mlaLenderSignature.deleteMany({
      where: { market: { in: markets } },
    })
    await prisma.marketMlaDecision.deleteMany({
      where: { market: { in: markets } },
    })
    await prisma.mlaTemplate.deleteMany({
      where: { borrowerId: { in: [ownId, otherId] } },
    })
    await prisma.borrower.deleteMany({ where: { name: { in: names } } })
    await prisma.adminAccount.deleteMany({ where: { address: admin } })
    await prisma.$disconnect()
  })

  it("registers the fixture for one borrower, with fields from its placeholders", async () => {
    const response = await registerCustomMla(
      request("/api/mla/templates/custom", {
        method: "POST",
        token: tokenFor(admin, SEPOLIA, true),
        body: { ...dummyCustomMla, chainId: SEPOLIA, borrowerId: ownId },
      }),
    )
    expect(response.status).toBe(200)
    templateId = (await response.json()).id
    const stored = await prisma.mlaTemplate.findUniqueOrThrow({
      where: { id: templateId },
      select: { plaintext: true, lenderFields: true },
    })
    expect(stored.plaintext).toBe(dummyCustomMla.plaintext)
    const lenderFields = stored.lenderFields as MlaTemplateField[]
    expect(lenderFields.map(({ source }) => source)).toEqual([
      "lender.timeSigned",
      "lender.address",
    ])
    lenderAddressPlaceholder = lenderFields[1].placeholder

    const duplicate = await registerCustomMla(
      request("/api/mla/templates/custom", {
        method: "POST",
        token: tokenFor(admin, SEPOLIA, true),
        body: { ...dummyCustomMla, chainId: SEPOLIA, borrowerId: ownId },
      }),
    )
    expect(duplicate.status).toBe(409)
  })

  it("lists it for its borrower on every network of the class, and for nobody else", async () => {
    expect(await listedIds(SEPOLIA, tokenFor(ownSepolia, SEPOLIA))).toContain(
      templateId,
    )
    expect(
      await listedIds(PLASMA_TESTNET, tokenFor(ownPlasma, PLASMA_TESTNET)),
    ).toContain(templateId)
    expect(
      await listedIds(SEPOLIA, tokenFor(otherSepolia, SEPOLIA)),
    ).not.toContain(templateId)
    expect(await listedIds(SEPOLIA)).not.toContain(templateId)

    const hidden = await getTemplate(
      request(`/api/mla/templates/${templateId}?chainId=${SEPOLIA}`, {
        token: tokenFor(otherSepolia, SEPOLIA),
      }),
      { params: { id: String(templateId) } },
    )
    expect(hidden.status).toBe(404)
  })

  it("attaches only to the owning borrower's markets", async () => {
    expect((await assign(otherMarket, otherSepolia)).status).toBe(400)
    expect((await assign(ownMarket, ownSepolia)).status).toBe(200)

    const response = await getMarketMla(
      request(`/api/mla/${ownMarket}?chainId=${SEPOLIA}`),
      { params: { market: ownMarket } },
    )
    expect(await response.json()).toMatchObject({
      templateId,
      templateName: dummyCustomMla.name,
      templateVersion: dummyCustomMla.version,
      isCustomTemplate: true,
      borrower: ownSepolia,
    })
  })

  it("retires: no new markets, existing markets keep reading and downloading", async () => {
    const retired = await retireTemplate(
      request(`/api/mla/templates/${templateId}`, {
        method: "PATCH",
        token: tokenFor(admin, SEPOLIA, true),
        body: { retired: true },
      }),
      { params: { id: String(templateId) } },
    )
    expect(retired.status).toBe(200)
    expect(
      await listedIds(SEPOLIA, tokenFor(ownSepolia, SEPOLIA)),
    ).not.toContain(templateId)
    expect((await assign(lateMarket, ownSepolia)).status).toBe(400)

    const html = await marketHtml(
      request(`/api/mla/${ownMarket}/html?chainId=${SEPOLIA}`),
      { params: { market: ownMarket } },
    )
    expect(html.status).toBe(200)
    expect(await html.text()).toContain(`[${lenderAddressPlaceholder}]`)

    const signed = await borrowerSigned(
      request(`/api/mla/${ownMarket}/signed?chainId=${SEPOLIA}`),
      { params: { market: ownMarket } },
    )
    expect(signed.status).toBe(200)
    expect(await signed.text()).toContain("Filled Borrower")

    const lenderSigned = await signAsLender(
      request("/api/mla/lender-signature", {
        method: "POST",
        body: {
          chainId: SEPOLIA,
          market: ownMarket,
          address: lender,
          signature: "0xlender",
          timeSigned: Date.now(),
        },
      }),
    )
    expect(lenderSigned.status).toBe(200)
    const zip = await lenderZip(
      request(`/api/mla/${ownMarket}/${lender}/signed?chainId=${SEPOLIA}`),
      { params: { market: ownMarket, lender } },
    )
    expect(zip.status).toBe(200)
    expect(zip.headers.get("Content-Type")).toBe("application/zip")

    const adminList = await listCustom(
      request(`/api/mla/templates/custom?chainId=${SEPOLIA}`, {
        token: tokenFor(admin, SEPOLIA, true),
      }),
    )
    const rows = (await adminList.json()) as {
      id: number
      marketCount: number
      retiredAt?: string
    }[]
    expect(rows.find(({ id }) => id === templateId)).toMatchObject({
      marketCount: 1,
      retiredAt: expect.any(String),
    })
  })
})
