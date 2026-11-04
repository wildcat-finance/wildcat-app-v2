/** @jest-environment node */
/* eslint-disable import/first */

// Temporary: the metric review page (product#917). Remove with the page.

const mockList = jest.fn()
jest.mock("@/lib/db", () => ({ prisma: {} }))
jest.mock("./list", () => ({
  listReviewBorrowers: (...args: unknown[]) => mockList(...args),
}))

import { GET } from "./route"

describe("review borrower list route", () => {
  const env = process.env.VERCEL_ENV
  afterEach(() => {
    process.env.VERCEL_ENV = env
    mockList.mockReset()
  })

  it("answers 404 on production without reading", async () => {
    process.env.VERCEL_ENV = "production"
    const response = await GET()
    expect(response.status).toBe(404)
    expect(mockList).not.toHaveBeenCalled()
  })

  it("lists borrowers on a preview", async () => {
    process.env.VERCEL_ENV = "preview"
    mockList.mockResolvedValue({ publication: null, borrowers: [] })
    const response = await GET()
    expect(response.status).toBe(200)
    expect(response.headers.get("Cache-Control")).toBe("no-store")
    await expect(response.json()).resolves.toEqual({
      publication: null,
      borrowers: [],
    })
  })
})
