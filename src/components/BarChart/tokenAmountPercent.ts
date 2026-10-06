import { TokenAmount } from "@wildcatfi/wildcat-sdk"
import { BigNumber } from "ethers"
import { formatEther } from "ethers/lib/utils"

const ONE_HUNDRED_E18 = BigNumber.from(10).pow(20)

export const getTokenAmountPercentage = (
  total: TokenAmount,
  amount: TokenAmount,
) =>
  total.eq(0)
    ? 0
    : parseFloat(formatEther(amount.raw.mul(ONE_HUNDRED_E18).div(total.raw)))

export const getTokenAmountPercentageWidth = (
  total: TokenAmount,
  amount: TokenAmount,
) => `${getTokenAmountPercentage(total, amount)}`
