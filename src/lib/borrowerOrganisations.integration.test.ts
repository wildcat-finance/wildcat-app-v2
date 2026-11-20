/** @jest-environment node */

// Opt in with a migrated, disposable Postgres database on this machine. The
// route handlers use the shared client, so DATABASE_URL must name it too:
// BORROWER_TEST_DATABASE_URL=postgresql://... DATABASE_URL=$BORROWER_TEST_DATABASE_URL \
//   npx jest borrowerOrganisations.integration.test.ts

import { randomBytes } from "node:crypto"

import { SupportedChainId } from "@wildcatfi/wildcat-sdk"
import { sign } from "jsonwebtoken"
import { NextRequest } from "next/server"

import { BorrowerOrganisation } from "@/app/api/borrowers/interface"
import { GET as listBorrowers } from "@/app/api/borrowers/route"
import {
  DELETE as cancelInvite,
  POST as invite,
  PUT as acceptInvite,
} from "@/app/api/invite/route"
import { GET as getProfile } from "@/app/api/profiles/[address]/route"
import { POST as updateProfile } from "@/app/api/profiles/updates/route"
import {
  getMarketMlaDecision,
  getSignedMasterLoanAgreement,
  prisma,
} from "@/lib/db"

jest.mock("@/lib/provider", () => ({
  getProviderForServer: jest.fn(() => ({})),
}))
jest.mock("@/lib/registrar", () => ({
  tryResolveRegisteredBy: jest.fn(async () => undefined),
  resolveRegisteredByMany: jest.fn(async () => new Map()),
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
jest.mock("@wildcatfi/wildcat-sdk", () => ({
  ...jest.requireActual("@wildcatfi/wildcat-sdk"),
  getArchControllerContract: jest.fn(() => ({
    isRegisteredBorrower: jest.fn(async () => false),
  })),
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
const MAINNET = SupportedChainId.Mainnet

describeWithDatabase("borrower organisations against Postgres", () => {
  const runId = randomBytes(4).toString("hex")
  const organisationName = `Integration Borrower ${runId}`
  const admin = randomAddress()
  const sepoliaWallet = randomAddress()
  const plasmaWallet = randomAddress()
  const mainnetWallet = randomAddress()
  const market = randomAddress()
  const adminChains = [SEPOLIA, PLASMA_TESTNET, MAINNET]

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

  const organisation = () =>
    prisma.borrower.findFirstOrThrow({
      where: { name: organisationName },
      include: { registrations: true },
    })

  beforeAll(async () => {
    process.env.SECRET_KEY = process.env.SECRET_KEY || `test-${runId}`
    await prisma.adminAccount.createMany({
      data: adminChains.map((chainId) => ({ chainId, address: admin })),
    })
  })

  afterAll(async () => {
    const borrowers = await prisma.borrower.findMany({
      where: { name: organisationName },
      select: { id: true },
    })
    const ids = borrowers.map(({ id }) => id)
    await prisma.marketMlaDecision.deleteMany({ where: { market } })
    await prisma.mlaTemplate.deleteMany({
      where: { name: `Integration template ${runId}` },
    })
    await prisma.borrower.deleteMany({ where: { id: { in: ids } } })
    await prisma.adminAccount.deleteMany({ where: { address: admin } })
    await prisma.$disconnect()
  })

  it("creates one organisation and adds a second network to it", async () => {
    const created = await invite(
      request("/api/invite", {
        method: "POST",
        token: tokenFor(admin, SEPOLIA, true),
        body: {
          chainId: SEPOLIA,
          address: sepoliaWallet,
          name: organisationName,
          jurisdiction: "Testland",
        },
      }),
    )
    expect(created.status).toBe(200)

    const listed = await listBorrowers(
      request(`/api/borrowers?chainId=${PLASMA_TESTNET}`, {
        token: tokenFor(admin, PLASMA_TESTNET, true),
      }),
    )
    const organisations = (await listed.json()) as BorrowerOrganisation[]
    const listedOrganisation = organisations.find(
      ({ name }) => name === organisationName,
    )
    expect(listedOrganisation?.registrations).toEqual([
      { chainId: SEPOLIA, address: sepoliaWallet },
    ])

    const added = await invite(
      request("/api/invite", {
        method: "POST",
        token: tokenFor(admin, PLASMA_TESTNET, true),
        body: {
          chainId: PLASMA_TESTNET,
          address: plasmaWallet,
          borrowerId: listedOrganisation?.id,
          name: "ignored for an existing borrower",
        },
      }),
    )
    expect(added.status).toBe(200)

    const { registrations, name } = await organisation()
    expect(name).toBe(organisationName)
    expect(registrations.map(({ chainId }) => chainId).sort()).toEqual(
      [PLASMA_TESTNET, SEPOLIA].sort(),
    )
  })

  it("refuses an organisation of the other network class", async () => {
    const { id } = await organisation()
    const response = await invite(
      request("/api/invite", {
        method: "POST",
        token: tokenFor(admin, MAINNET, true),
        body: {
          chainId: MAINNET,
          address: mainnetWallet,
          borrowerId: id,
          name: organisationName,
        },
      }),
    )
    expect(response.status).toBe(400)
  })

  it("records the ToU acceptance on its network, linked to the organisation", async () => {
    const response = await acceptInvite(
      request("/api/invite", {
        method: "PUT",
        token: tokenFor(plasmaWallet, PLASMA_TESTNET),
        body: {
          chainId: PLASMA_TESTNET,
          address: plasmaWallet,
          name: organisationName,
          jurisdiction: "Testland",
          signature: "0xsignature",
          timeSigned: Date.now(),
        },
      }),
    )
    expect(response.status).toBe(200)
    const { id } = await organisation()
    const acceptances = await prisma.serviceAgreementSignature.findMany({
      where: { address: { in: [plasmaWallet, sepoliaWallet] } },
    })
    expect(acceptances).toHaveLength(1)
    expect(acceptances[0]).toMatchObject({
      chainId: PLASMA_TESTNET,
      party: "Borrower",
      borrowerId: id,
      organizationName: organisationName,
    })
  })

  it("shares one profile across the organisation's networks", async () => {
    const updated = await updateProfile(
      request("/api/profiles/updates", {
        method: "POST",
        token: tokenFor(sepoliaWallet, SEPOLIA),
        body: { chainId: SEPOLIA, description: `Edited on Sepolia ${runId}` },
      }),
    )
    expect(updated.status).toBe(200)
    const response = await getProfile(
      request(`/api/profiles/${plasmaWallet}?chainId=${PLASMA_TESTNET}`),
      { params: { address: plasmaWallet as `0x${string}` } },
    )
    const { profile } = await response.json()
    expect(profile).toMatchObject({
      address: plasmaWallet,
      chainId: PLASMA_TESTNET,
      name: organisationName,
      description: `Edited on Sepolia ${runId}`,
    })
  })

  it("rejects ToU and MLA rows that break the declared rules", async () => {
    const agreement = await prisma.serviceAgreement.findFirstOrThrow({
      where: { isCurrent: true },
    })
    await expect(
      prisma.serviceAgreementSignature.create({
        data: {
          chainId: SEPOLIA,
          address: sepoliaWallet,
          signer: sepoliaWallet,
          party: "Borrower",
          serviceAgreementId: agreement.id,
          signature: "0xsignature",
          kind: "ECDSA",
          timeSigned: new Date(),
        },
      }),
    ).rejects.toThrow()

    const { id } = await organisation()
    await prisma.marketMlaDecision.create({
      data: {
        chainId: SEPOLIA,
        market,
        outcome: "Declined",
        borrowerId: id,
        borrowerAddress: sepoliaWallet,
        signer: sepoliaWallet,
        signature: "0xsignature",
        kind: "ECDSA",
        timeSigned: new Date(),
      },
    })
    await expect(
      prisma.mlaLenderSignature.create({
        data: {
          chainId: SEPOLIA,
          market,
          address: randomAddress(),
          signer: randomAddress(),
          signature: "0xsignature",
          kind: "ECDSA",
          timeSigned: new Date(),
        },
      }),
    ).rejects.toThrow()
    expect((await getMarketMlaDecision(market, SEPOLIA))?.outcome).toBe(
      "Declined",
    )
    expect(await getSignedMasterLoanAgreement(market, SEPOLIA)).toBeUndefined()
    await prisma.marketMlaDecision.delete({
      where: { chainId_market: { chainId: SEPOLIA, market } },
    })
  })

  it("cancelling a pending invitation removes only that registration", async () => {
    const response = await cancelInvite(
      request(`/api/invite?address=${plasmaWallet}&chainId=${PLASMA_TESTNET}`, {
        method: "DELETE",
        token: tokenFor(admin, PLASMA_TESTNET, true),
      }),
    )
    expect(response.status).toBe(200)
    const { registrations } = await organisation()
    expect(registrations.map(({ address }) => address)).toEqual([sepoliaWallet])
    expect(
      await prisma.serviceAgreementSignature.count({
        where: { address: plasmaWallet },
      }),
    ).toBe(0)
  })

  it("removes an organisation with its last registration", async () => {
    const response = await cancelInvite(
      request(`/api/invite?address=${sepoliaWallet}&chainId=${SEPOLIA}`, {
        method: "DELETE",
        token: tokenFor(admin, SEPOLIA, true),
      }),
    )
    expect(response.status).toBe(200)
    expect(
      await prisma.borrower.count({ where: { name: organisationName } }),
    ).toBe(0)
  })

  // The organisation of `wallet`, found by the wallet: several organisations
  // in this suite share a name.
  const organisationOf = (chainId: number, wallet: string) =>
    prisma.borrower.findFirstOrThrow({
      where: { registrations: { some: { chainId, address: wallet } } },
      include: { registrations: true },
    })

  const inviteNew = async (chainId: number, wallet: string) => {
    const response = await invite(
      request("/api/invite", {
        method: "POST",
        token: tokenFor(admin, chainId, true),
        body: {
          chainId,
          address: wallet,
          name: organisationName,
          jurisdiction: "Testland",
        },
      }),
    )
    expect(response.status).toBe(200)
    return organisationOf(chainId, wallet)
  }

  const accept = (
    chainId: number,
    wallet: string,
    name: string,
    jurisdiction = "Elsewhere",
  ) =>
    acceptInvite(
      request("/api/invite", {
        method: "PUT",
        token: tokenFor(wallet, chainId),
        body: {
          chainId,
          address: wallet,
          name,
          jurisdiction,
          signature: "0xsignature",
          timeSigned: Date.now(),
        },
      }),
    )

  it("a wallet joining an onboarded organisation keeps its name and profile", async () => {
    const firstWallet = randomAddress()
    const joiningWallet = randomAddress()
    const { id } = await inviteNew(SEPOLIA, firstWallet)
    expect((await accept(SEPOLIA, firstWallet, organisationName)).status).toBe(
      200,
    )
    const added = await invite(
      request("/api/invite", {
        method: "POST",
        token: tokenFor(admin, PLASMA_TESTNET, true),
        body: {
          chainId: PLASMA_TESTNET,
          address: joiningWallet,
          borrowerId: id,
          name: "ignored for an existing borrower",
        },
      }),
    )
    expect(added.status).toBe(200)

    const renamed = await accept(PLASMA_TESTNET, joiningWallet, "Someone Else")
    expect(renamed.status).toBe(409)
    const joined = await accept(
      PLASMA_TESTNET,
      joiningWallet,
      organisationName,
      "Changed by the joining wallet",
    )
    expect(joined.status).toBe(200)

    const shared = await organisationOf(PLASMA_TESTNET, joiningWallet)
    expect(shared).toMatchObject({ id, name: organisationName })
    // The first wallet set the profile on acceptance; joining left it alone.
    expect(shared.jurisdiction).toBe("Elsewhere")
    expect(shared.registrations).toHaveLength(2)
  })

  it("keeps an organisation that owns a custom MLA when its last invitation is cancelled", async () => {
    const wallet = randomAddress()
    const { id } = await inviteNew(SEPOLIA, wallet)
    await prisma.mlaTemplate.create({
      data: {
        isTestnet: true,
        borrowerId: id,
        name: `Integration template ${runId}`,
        version: "1",
        html: "<p>Agreement</p>",
        plaintext: "Agreement",
        borrowerFields: [],
        lenderFields: [],
      },
    })
    const response = await cancelInvite(
      request(`/api/invite?address=${wallet}&chainId=${SEPOLIA}`, {
        method: "DELETE",
        token: tokenFor(admin, SEPOLIA, true),
      }),
    )
    expect(response.status).toBe(200)
    expect(
      await prisma.borrowerRegistration.count({ where: { address: wallet } }),
    ).toBe(0)
    expect(await prisma.borrower.count({ where: { id } })).toBe(1)
  })
})
