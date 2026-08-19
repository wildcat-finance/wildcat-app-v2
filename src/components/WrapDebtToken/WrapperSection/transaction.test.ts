import { getWrapperTransactionMethod } from "./transaction"

describe("getWrapperTransactionMethod", () => {
  it.each([
    [true, true, false, "deposit"],
    [true, false, false, "mint"],
    [false, true, false, "withdraw"],
    [false, true, true, "redeem"],
    [false, false, false, "redeem"],
  ])(
    "selects %s/%s/max=%s as %s",
    (isWrapTab, isAssetsInput, isMaxAssetUnwrap, expected) => {
      expect(
        getWrapperTransactionMethod({
          isWrapTab,
          isAssetsInput,
          isMaxAssetUnwrap,
        }),
      ).toBe(expected)
    },
  )
})
