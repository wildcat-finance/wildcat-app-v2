/* eslint-disable global-require, @typescript-eslint/no-var-requires */
const mockPrismaClient = jest.fn(() => ({ tag: Math.random() }))
jest.mock("@prisma/client", () => ({
  PrismaClient: mockPrismaClient,
}))

describe("prisma singleton", () => {
  it("reuses one client across module re-evaluation via globalThis", () => {
    let a: unknown
    let b: unknown
    jest.isolateModules(() => {
      a = require("./prisma").prisma
    })
    jest.isolateModules(() => {
      b = require("./prisma").prisma
    })
    expect(a).toBeDefined()
    expect(a).toBe(b)
    expect(mockPrismaClient).toHaveBeenCalledTimes(1)
  })
})
