import { useQuery } from "@tanstack/react-query"
import { getController, Signer } from "@wildcatfi/wildcat-sdk"
import { useAccount } from "wagmi"

import { useEthersSigner } from "@/hooks/useEthersSigner"

import { useCurrentNetwork } from "./useCurrentNetwork"

export const GET_CONTROLLER_KEY = "controller"

export const useGetController = () => {
  const { address } = useAccount()
  const signer = useEthersSigner()
  const { isWrongNetwork, targetChainId } = useCurrentNetwork()

  async function getUserController() {
    return getController(targetChainId, signer as Signer, address as string)
  }

  return useQuery({
    queryKey: [targetChainId, GET_CONTROLLER_KEY, address],
    queryFn: getUserController,
    enabled: !!address && !!signer && !isWrongNetwork,
    refetchOnMount: false,
  })
}
