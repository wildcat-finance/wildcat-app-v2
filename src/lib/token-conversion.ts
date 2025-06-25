import { Token, TokenAmount } from "@wildcatfi/wildcat-sdk"
import { BigNumber } from "ethers"

export const CommonTokensMap: Record<
  string,
  { address: string; decimals: number }
> = {
  DAI: {
    address: "0x6b175474e89094c44da98b954eedeac495271d0f",
    decimals: 18,
  },
  USDT: {
    address: "0xdac17f958d2ee523a2206206994597c13d831ec7",
    decimals: 6,
  },
  USDC: {
    address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    decimals: 6,
  },
  WBTC: {
    address: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
    decimals: 8,
  },
  WETH: {
    address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
    decimals: 18,
  },
}

export const convertTokenAmount = (
  amount: TokenAmount,
  targetToken: Token,
): TokenAmount => {
  if (amount.token.decimals === targetToken.decimals) {
    return targetToken.getAmount(amount.raw)
  }
  if (targetToken.decimals < amount.token.decimals) {
    /// If the target token has fewer decimals, we need to divide the amount
    /// by 10^(amount.token.decimals - targetToken.decimals)
    return targetToken
      .getAmount(amount.raw)
      .div(BigNumber.from(10).pow(amount.token.decimals - targetToken.decimals))
  }
  /// If the target token has more decimals, we need to multiply the amount
  /// by 10^(targetToken.decimals - amount.token.decimals)
  return targetToken
    .getAmount(amount.raw)
    .mul(BigNumber.from(10).pow(targetToken.decimals - amount.token.decimals))
}

export const toMainnetToken = <T extends Token | TokenAmount>(token: T): T => {
  // eslint-disable-next-line no-underscore-dangle
  const testnetToken = token instanceof Token ? token : token.token
  const tokenInfo = CommonTokensMap[testnetToken.symbol.toUpperCase()]

  const mainnetToken = new Token(
    testnetToken.chainId,
    tokenInfo.address,
    testnetToken.name,
    testnetToken.symbol,
    tokenInfo.decimals,
    false,
    testnetToken.provider,
  )

  if (token instanceof TokenAmount) {
    // If the real version has fewer decimals, we need to convert the amount
    // by dividing by 10^(testnetToken.decimals - mainnetToken.decimals)
    return convertTokenAmount(token, mainnetToken) as T
  }
  return mainnetToken as T
}
