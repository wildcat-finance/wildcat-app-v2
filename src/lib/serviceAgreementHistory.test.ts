/** @jest-environment node */
import { createHash } from "crypto"

import { NextRequest } from "next/server"

import { GET as downloadVersion } from "@/app/api/service-agreement/versions/[version]/download/route"
import { GET as readVersion } from "@/app/api/service-agreement/versions/[version]/route"
import { GET as listVersions } from "@/app/api/service-agreement/versions/route"
import { prisma } from "@/lib/db"

jest.mock("@/lib/db", () => ({
  prisma: {
    serviceAgreement: { findFirst: jest.fn(), findMany: jest.fn() },
  },
}))
jest.mock("@/lib/provider", () => ({ getProviderForServer: jest.fn() }))
jest.mock("@/lib/signatures", () => ({
  verifyAndDescribeSignature: jest.fn(),
}))

const plaintext = "Terms — café\r\n\r\nOriginal spacing.  \n"
const agreement = {
  id: 3,
  version: "terms-of-use-v1-2025-01-17",
  plaintext,
  html: "<p>Terms</p>",
  plaintextSha256: createHash("sha256").update(plaintext).digest("hex"),
  legacyWrapperHash: null,
  acknowledgementText: "I accept these terms.",
  effectiveDate: new Date("2025-01-17T00:00:00Z"),
  isCurrent: false,
  reacceptanceDeadline: null,
  createdAt: new Date("2025-01-17T00:00:00Z"),
}
const legacy = {
  ...agreement,
  id: 1,
  version: "legacy-service-agreement-2023-12-18",
  plaintext: "Legacy",
  plaintextSha256:
    "48a56e9e278b17a98fbf18af466487ebc66e61884ebdbd1bd75e977e44905a3d",
}
const request = new NextRequest(
  "http://localhost/api/service-agreement/versions",
)

beforeEach(() => jest.clearAllMocks())

it("lists newest IDs first, including unavailable history, without document or acceptance data", async () => {
  const prelive = { ...agreement, id: 2, version: "prelive" }
  jest
    .mocked(prisma.serviceAgreement.findMany)
    .mockResolvedValue([agreement, prelive, legacy])
  const response = await listVersions()
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual(
    [agreement, prelive, legacy].map((row) => ({
      version: row.version,
      plaintextSha256: row.plaintextSha256,
      effectiveDate: row.effectiveDate.toISOString(),
      isCurrent: row.isCurrent,
      isAvailable: row !== legacy,
    })),
  )
  expect(prisma.serviceAgreement.findMany).toHaveBeenCalledWith(
    expect.objectContaining({ orderBy: { id: "desc" } }),
  )
})

it("views and downloads identical historical bytes and the version-specific filename", async () => {
  jest.mocked(prisma.serviceAgreement.findFirst).mockResolvedValue(agreement)
  const params = { version: agreement.version }
  const contentResponse = await readVersion(request, { params })
  const content = await contentResponse.json()
  const download = await downloadVersion(request, { params })
  const bytes = Buffer.from(await download.arrayBuffer())
  expect(contentResponse.status).toBe(200)
  expect(content.version).toBe(agreement.version)
  expect(content.plaintext).toBe(plaintext)
  expect(bytes.equals(Buffer.from(content.plaintext, "utf8"))).toBe(true)
  expect(createHash("sha256").update(bytes).digest("hex")).toBe(
    content.plaintextSha256,
  )
  expect(download.headers.get("Content-Type")).toBe("text/plain; charset=utf-8")
  expect(download.headers.get("Content-Disposition")).toBe(
    `attachment; filename="Wildcat Terms of Use - ${agreement.version}.txt"`,
  )
  expect(prisma.serviceAgreement.findFirst).toHaveBeenCalledWith(
    expect.objectContaining({ where: params, orderBy: { id: "desc" } }),
  )
})

it.each([
  ["missing", null],
  ["legacy placeholder", legacy],
  ["modified text", { ...agreement, plaintext: `${plaintext}changed` }],
] as const)(
  "refuses %s for both viewing and downloading",
  async (_name, row) => {
    jest.mocked(prisma.serviceAgreement.findFirst).mockResolvedValue(row)
    const params = { version: row?.version ?? "unknown-version" }
    const responses = await Promise.all([
      readVersion(request, { params }),
      downloadVersion(request, { params }),
    ])
    responses.forEach((response) => expect(response.status).toBe(404))
  },
)
