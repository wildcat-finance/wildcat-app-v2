import { getLenderUpdateSafeBatch } from "./lenderAccess"

describe("getLenderUpdateSafeBatch", () => {
  const transactions = [{ data: "unblock" }, { data: "grant" }]

  it("returns the complete ordered batch for a connected Safe", () => {
    expect(getLenderUpdateSafeBatch(true, transactions)).toBe(transactions)
  })

  it("leaves EOA transactions on the sequential path", () => {
    expect(getLenderUpdateSafeBatch(false, transactions)).toBeUndefined()
  })

  it("does not batch a single Safe transaction", () => {
    expect(
      getLenderUpdateSafeBatch(true, transactions.slice(0, 1)),
    ).toBeUndefined()
  })
})
