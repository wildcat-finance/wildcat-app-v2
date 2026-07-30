import { useQuery } from "@tanstack/react-query"
import {
  iERC20Abi,
  TokenWrapper,
  wildcat4626WrapperAbi,
} from "@wildcatfi/wildcat-sdk"
import { Address, PublicClient } from "viem"

import { POLLING_INTERVAL } from "@/config/polling"
import { QueryKeys } from "@/config/query-keys"

export type WrapperAccountState = {
  balances:
    | {
        marketBalance: ReturnType<TokenWrapper["marketToken"]["getAmount"]>
        shareBalance: ReturnType<TokenWrapper["shareToken"]["getAmount"]>
      }
    | undefined
  allowance: ReturnType<TokenWrapper["marketToken"]["getAmount"]> | undefined
  limits:
    | {
        maxDeposit: ReturnType<TokenWrapper["marketToken"]["getAmount"]>
        maxMint: ReturnType<TokenWrapper["shareToken"]["getAmount"]>
        maxWithdraw: ReturnType<TokenWrapper["marketToken"]["getAmount"]>
        maxRedeem: ReturnType<TokenWrapper["shareToken"]["getAmount"]>
      }
    | undefined
}

const resultOrUndefined = <T>(result: {
  status: "success" | "failure"
  result?: T
}) => (result.status === "success" ? result.result : undefined)

export const readWrapperAccountState = async (
  publicClient: PublicClient,
  wrapper: TokenWrapper,
  account: string,
): Promise<WrapperAccountState> => {
  const accountAddress = account as Address
  const marketTokenAddress = wrapper.marketToken.address as Address
  const shareTokenAddress = wrapper.shareToken.address as Address
  const wrapperAddress = wrapper.address as Address

  const [
    marketBalanceResult,
    shareBalanceResult,
    allowanceResult,
    maxDepositResult,
    maxMintResult,
    maxWithdrawResult,
    maxRedeemResult,
  ] = await publicClient.multicall({
    allowFailure: true,
    contracts: [
      {
        address: marketTokenAddress,
        abi: iERC20Abi,
        functionName: "balanceOf",
        args: [accountAddress],
      },
      {
        address: shareTokenAddress,
        abi: iERC20Abi,
        functionName: "balanceOf",
        args: [accountAddress],
      },
      {
        address: marketTokenAddress,
        abi: iERC20Abi,
        functionName: "allowance",
        args: [accountAddress, wrapperAddress],
      },
      {
        address: wrapperAddress,
        abi: wildcat4626WrapperAbi,
        functionName: "maxDeposit",
        args: [accountAddress],
      },
      {
        address: wrapperAddress,
        abi: wildcat4626WrapperAbi,
        functionName: "maxMint",
        args: [accountAddress],
      },
      {
        address: wrapperAddress,
        abi: wildcat4626WrapperAbi,
        functionName: "maxWithdraw",
        args: [accountAddress],
      },
      {
        address: wrapperAddress,
        abi: wildcat4626WrapperAbi,
        functionName: "maxRedeem",
        args: [accountAddress],
      },
    ],
  })

  const marketBalanceRaw = resultOrUndefined(marketBalanceResult)
  const shareBalanceRaw = resultOrUndefined(shareBalanceResult)
  const allowanceRaw = resultOrUndefined(allowanceResult)
  const maxDepositRaw = resultOrUndefined(maxDepositResult)
  const maxMintRaw = resultOrUndefined(maxMintResult)
  const maxWithdrawRaw = resultOrUndefined(maxWithdrawResult)
  const maxRedeemRaw = resultOrUndefined(maxRedeemResult)

  const balances =
    marketBalanceRaw !== undefined && shareBalanceRaw !== undefined
      ? {
          marketBalance: wrapper.marketToken.getAmount(marketBalanceRaw),
          shareBalance: wrapper.shareToken.getAmount(shareBalanceRaw),
        }
      : undefined

  const allowance =
    allowanceRaw !== undefined
      ? wrapper.marketToken.getAmount(allowanceRaw)
      : undefined

  const limits =
    maxDepositRaw !== undefined &&
    maxMintRaw !== undefined &&
    maxWithdrawRaw !== undefined &&
    maxRedeemRaw !== undefined
      ? {
          maxDeposit: wrapper.marketToken.getAmount(maxDepositRaw),
          maxMint: wrapper.shareToken.getAmount(maxMintRaw),
          maxWithdraw: wrapper.marketToken.getAmount(maxWithdrawRaw),
          maxRedeem: wrapper.shareToken.getAmount(maxRedeemRaw),
        }
      : undefined

  return { balances, allowance, limits }
}

export const useWrapperAccountState = (
  chainId: number | undefined,
  wrapper: TokenWrapper | undefined,
  account: string | undefined,
  publicClient: PublicClient | undefined,
) =>
  useQuery({
    queryKey: QueryKeys.Wrapper.GET_ACCOUNT_STATE(
      chainId ?? 0,
      wrapper?.address,
      account,
    ),
    enabled: !!chainId && !!wrapper && !!account && !!publicClient,
    refetchInterval: POLLING_INTERVAL,
    queryFn: async () => {
      if (!wrapper || !account || !publicClient) {
        throw new Error("Missing wrapper account-state params")
      }
      return readWrapperAccountState(publicClient, wrapper, account)
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })
