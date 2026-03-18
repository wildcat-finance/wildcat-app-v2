import { context } from "@opentelemetry/api"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { getMockArchControllerOwnerContract } from "@wildcatfi/wildcat-sdk"

import { toastRequest } from "@/components/Toasts"
import { QueryKeys } from "@/config/query-keys"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { logger } from "@/lib/logging/client"
import { withClientSpan } from "@/lib/telemetry/clientTracing"
import { useFlowMutation } from "@/lib/telemetry/useFlowMutation"
import { useAppSelector } from "@/store/hooks"

export const useRegisterTestnetBorrower = () => {
  const signer = useEthersSigner()
  const client = useQueryClient()
  const flow = useFlowMutation()
  const { chainId, isTestnet } = useAppSelector(
    (state) => state.selectedNetwork,
  )
  return useMutation({
    mutationFn: async (borrower: string) => {
      const borrowerAddress = borrower.toLowerCase()
      flow.start("admin.register_testnet_borrower.flow", {
        "market.chain_id": chainId,
        "borrower.address": borrowerAddress,
      })

      try {
        await withClientSpan(
          "admin.register_testnet_borrower",
          async (span) => {
            if (!signer || !isTestnet) {
              throw new Error("Invalid chain or signer")
            }
            const owner = getMockArchControllerOwnerContract(chainId, signer)
            await toastRequest(
              owner.registerBorrower(borrower).then((tx) => {
                span.setAttribute("tx.hash", tx.hash)
                return tx.wait()
              }),
              {
                pending: "Registering Borrower...",
                success: "Borrower Registered Successfully",
                error: "Failed to Register Borrower",
              },
            )
          },
          {
            parentContext: flow.getParentContext() ?? context.active(),
            attributes: {
              "market.chain_id": chainId,
              "borrower.address": borrowerAddress,
            },
          },
        )
        flow.endSuccess()
      } catch (error) {
        flow.endError(error)
        throw error
      }
    },
    onSuccess: () => {
      client.invalidateQueries({
        queryKey: QueryKeys.Admin.GET_ALL_BORROWER_INVITATIONS(chainId),
      })
      client.invalidateQueries({
        queryKey: QueryKeys.Admin.GET_ALL_BORROWER_PROFILES(chainId),
      })
    },
    onError(error, borrower) {
      logger.error(
        { err: error, borrower, chainId },
        "Failed to register testnet borrower",
      )
    },
  })
}
