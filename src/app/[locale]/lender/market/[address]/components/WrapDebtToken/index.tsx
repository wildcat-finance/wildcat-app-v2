import * as React from "react"

import { Box, Typography } from "@mui/material"
import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Market,
  Signer,
  SupportedChainId,
  TokenWrapper,
  WrapperFactory,
} from "@wildcatfi/wildcat-sdk"
import { constants } from "ethers"

import { WrapperSection } from "@/app/[locale]/lender/market/[address]/components/WrapDebtToken/components/WrapperSection"
import { toastRequest } from "@/components/Toasts"
import { NoWrapperState } from "@/components/WrapDebtToken/NoWrapperState"
import { WrapperSkeleton } from "@/components/WrapDebtToken/WrapperSkeleton"
import { QueryKeys } from "@/config/query-keys"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useEthersProvider } from "@/hooks/useEthersSigner"
import { COLORS } from "@/theme/colors"

export type WrapDebtTokenProps = {
  market: Market | undefined
  wrapper: TokenWrapper | undefined
  hasWrapper: boolean
  hasFactory: boolean
  isWrapperLookupLoading: boolean
  isWrapperLoading: boolean
  isWrapperError: boolean
  isAuthorizedLender: boolean
  isDifferentChain: boolean
}

export const WrapDebtToken = ({
  market,
  wrapper,
  hasWrapper,
  hasFactory,
  isWrapperLookupLoading,
  isWrapperLoading,
  isWrapperError,
  isAuthorizedLender,
  isDifferentChain,
}: WrapDebtTokenProps) => {
  const { targetChainId } = useCurrentNetwork()
  const { signer } = useEthersProvider({ chainId: market?.chainId })
  const { connected: safeConnected, sdk } = useSafeAppsSDK()
  const client = useQueryClient()

  const wrapperAddress = wrapper?.address

  const waitForSafeTransaction = async (safeTxHash: string) => {
    if (!sdk) throw new Error("No Safe SDK")
    const checkTransaction = async (): Promise<string> =>
      new Promise((resolve) => {
        const doCheck = async () => {
          const transactionBySafeHash =
            await sdk.txs.getBySafeTxHash(safeTxHash)
          if (transactionBySafeHash?.txHash) {
            resolve(transactionBySafeHash.txHash)
          } else {
            setTimeout(doCheck, 1000)
          }
        }
        doCheck()
      })
    const txHash = await checkTransaction()
    await sdk.eth.getTransactionReceipt([txHash])
    return txHash
  }

  const createWrapperMutation = useMutation({
    mutationFn: async () => {
      if (!market || !signer) throw new Error("Missing market or signer")
      if (market.chainId !== targetChainId) {
        throw new Error(
          `Market chainId does not match target chainId:` +
            ` Market ${market.chainId},` +
            ` Target ${targetChainId}`,
        )
      }

      if (safeConnected) {
        if (!sdk) throw new Error("No Safe SDK")
        const tx = WrapperFactory.populateCreateWrapper(
          market.chainId as SupportedChainId,
          signer,
          market.address,
        )
        const { safeTxHash } = await sdk.txs.send({ txs: [tx] })
        await waitForSafeTransaction(safeTxHash)
        return safeTxHash
      }

      const { wrapper: createdWrapper } = await WrapperFactory.createWrapper(
        market.chainId as SupportedChainId,
        signer,
        market.address,
      )
      return createdWrapper
    },
    onSuccess: () => {
      client.invalidateQueries({
        queryKey: QueryKeys.Wrapper.GET_WRAPPER_FOR_MARKET(
          market?.chainId ?? 0,
          market?.address,
        ),
      })
      if (wrapperAddress && wrapperAddress !== constants.AddressZero) {
        client.invalidateQueries({
          queryKey: QueryKeys.Wrapper.GET_WRAPPER(
            market?.chainId ?? 0,
            wrapperAddress,
          ),
        })
      }
    },
  })

  const canCreateWrapper =
    isAuthorizedLender &&
    hasFactory &&
    !!signer &&
    Signer.isSigner(signer) &&
    !isDifferentChain

  // return <WrapperSkeleton />

  return (
    <Box>
      {!isAuthorizedLender && (
        <Typography variant="text3" color={COLORS.manate}>
          Only authorized lenders can access the wrapper.
        </Typography>
      )}

      {isAuthorizedLender && (
        <>
          {!hasFactory && (
            <NoWrapperState
              canCreateWrapper={false}
              statusMessage="Wrappers are not available on this chain yet."
            />
          )}

          {hasFactory && !hasWrapper && !isWrapperLookupLoading && (
            <NoWrapperState
              canCreateWrapper={canCreateWrapper}
              onCreateWrapper={() =>
                toastRequest(createWrapperMutation.mutateAsync(), {
                  pending: "Deploying wrapper...",
                  success: "Wrapper deployed",
                  error: "Failed to deploy wrapper",
                })
              }
              isCreatingWrapper={createWrapperMutation.isPending}
              disableCreateWrapper={!canCreateWrapper}
            />
          )}

          {hasFactory && isWrapperLookupLoading && <WrapperSkeleton />}

          {hasWrapper && wrapper && !isWrapperLoading && !isWrapperError && (
            <WrapperSection
              market={market}
              wrapper={wrapper}
              isDifferentChain={isDifferentChain}
              isAuthorizedLender={isAuthorizedLender}
            />
          )}

          {hasWrapper && (isWrapperLoading || isWrapperError) && (
            <WrapperSkeleton />
          )}
        </>
      )}
    </Box>
  )
}
