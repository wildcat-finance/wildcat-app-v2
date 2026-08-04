export type LenderStatusReader = (
  accountAddress: string,
) => Promise<{ isBlockedFromDeposits: boolean }>

export const getBlockedLenders = async (
  lenders: string[],
  readStatus?: LenderStatusReader,
): Promise<string[]> => {
  if (!readStatus) return lenders

  const isBlocked = await Promise.all(
    lenders.map(async (lender) => {
      try {
        const status = await readStatus(lender)
        return status?.isBlockedFromDeposits ?? true
      } catch {
        return true
      }
    }),
  )

  return lenders.filter((_, index) => isBlocked[index])
}
