export type WrapperTransactionMethod =
  | "deposit"
  | "mint"
  | "withdraw"
  | "redeem"

export const getWrapperTransactionMethod = ({
  isWrapTab,
  isAssetsInput,
  isMaxAssetUnwrap,
}: {
  isWrapTab: boolean
  isAssetsInput: boolean
  isMaxAssetUnwrap: boolean
}): WrapperTransactionMethod => {
  if (isWrapTab) return isAssetsInput ? "deposit" : "mint"
  if (isMaxAssetUnwrap) return "redeem"
  return isAssetsInput ? "withdraw" : "redeem"
}
