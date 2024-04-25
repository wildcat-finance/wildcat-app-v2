import { useQuery } from "@tanstack/react-query"
import { useAccount } from "wagmi"
import { getController, Signer } from "@wildcatfi/wildcat-sdk"

import { TargetChainId } from "@/config/network"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { useCurrentNetwork } from "./useCurrentNetwork"

export const GET_CONTROLLER_KEY = "controller"

export const useGetController = () => {
  const { address } = useAccount()
  const signer = useEthersSigner()
  const { isWrongNetwork } = useCurrentNetwork()

  async function getUserController() {
    return getController(TargetChainId, signer as Signer, address as string)
  }

  return useQuery({
    queryKey: [GET_CONTROLLER_KEY, address],
    queryFn: getUserController,
    enabled: !!address && !!signer && !isWrongNetwork,
    refetchOnMount: false,
  })
}
