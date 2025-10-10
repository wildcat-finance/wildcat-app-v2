import { useMutation, useQueryClient } from "@tanstack/react-query"
import { getMockArchControllerOwnerContract } from "@wildcatfi/wildcat-sdk"

import { toastRequest } from "@/components/Toasts"
import { QueryKeys } from "@/config/query-keys"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { useAppSelector } from "@/store/hooks"

export const useRegisterTestnetBorrower = () => {
  const signer = useEthersSigner()
  const client = useQueryClient()
  const { chainId, isTestnet } = useAppSelector(
    (state) => state.selectedNetwork,
  )
  return useMutation({
    mutationFn: async (borrower: string) => {
      if (!signer || !isTestnet) {
        throw new Error("Invalid chain or signer")
      }
      const owner = getMockArchControllerOwnerContract(chainId, signer)
      await toastRequest(
        owner.registerBorrower(borrower).then((tx) => tx.wait()),
        {
          pending: "Registering Borrower...",
          success: "Borrower Registered Successfully",
          error: "Failed to Register Borrower",
        },
      )
    },
    onSuccess: () => {
      client.invalidateQueries({
        queryKey: QueryKeys.Admin.GET_ALL_BORROWER_INVITATIONS(chainId),
      })
      client.invalidateQueries({
        queryKey: QueryKeys.Admin.GET_ALL_BORROWER_PROFILES(chainId),
      })
    },
  })
}
