import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  baseAccessControlsErrorAbi,
  iOpenTermHooksAbi,
  kycRoleProviderAbi,
  type PartialTransaction,
  type SupportedChainId,
  toSafeTransactionInput,
} from "@wildcatfi/wildcat-sdk"
import { type Address, isAddressEqual } from "viem"
import { useAccount } from "wagmi"

import { QueryKeys } from "@/config/query-keys"
import { useEthersProvider } from "@/hooks/useEthersSigner"
import { describeContractError } from "@/utils/contractErrors"
import { invalidateMarketListQueries } from "@/utils/marketListQueries"
import {
  sendTransactionAndWait,
  toViemTransactionRequest,
  waitForSubmittedTransaction,
} from "@/utils/transactions"

export const useRoleProviderAdmin = (
  chainId: SupportedChainId,
  contract: Address,
  kind: "kyc" | "hooks",
) => {
  const { publicClient, walletClient, provider, targetChainId } =
    useEthersProvider({ chainId })
  const wallet = useAccount()
  const { connected: inSafe, safe, sdk } = useSafeAppsSDK()
  const client = useQueryClient()
  const actor = inSafe ? (safe.safeAddress as Address) : wallet.address
  const correctChain =
    targetChainId === chainId &&
    (inSafe ? safe.chainId : wallet.chainId) === chainId
  const abi = kind === "kyc" ? kycRoleProviderAbi : baseAccessControlsErrorAbi

  const readAdministrator = async () => {
    if (!publicClient) throw Error("Network connection unavailable")
    // borrower() returns the current hooks administrator on both protocol generations.
    return kind === "hooks"
      ? publicClient.readContract({
          address: contract,
          abi: iOpenTermHooksAbi,
          functionName: "borrower",
        })
      : publicClient.readContract({
          address: contract,
          abi: kycRoleProviderAbi,
          functionName: "administrator",
        })
  }
  const authority = useQuery({
    queryKey: ["roleProviderAdmin", chainId, kind, contract],
    queryFn: readAdministrator,
    enabled: !!publicClient,
    refetchInterval: 15_000,
  })
  const canWrite =
    !!actor &&
    correctChain &&
    !!authority.data &&
    !authority.isError &&
    isAddressEqual(actor, authority.data) &&
    (inSafe || !!walletClient?.account)
  const transaction = useMutation({
    mutationFn: async (tx: PartialTransaction) => {
      if (
        !canWrite ||
        !actor ||
        !publicClient ||
        !provider ||
        !isAddressEqual(tx.to as Address, contract) ||
        !isAddressEqual(actor, await readAdministrator())
      ) {
        throw Error(
          "Connect the current administrator wallet on the selected network.",
        )
      }
      if (inSafe) {
        await publicClient.call({
          account: actor,
          ...toViemTransactionRequest(tx),
        })
        const { safeTxHash } = await sdk.txs.send({
          txs: [toSafeTransactionInput(tx)],
        })
        await waitForSubmittedTransaction({
          provider,
          hash: safeTxHash,
          safeConnected: true,
          safeSdk: sdk,
        })
      } else {
        if (
          !walletClient?.account ||
          walletClient.chain?.id !== chainId ||
          !isAddressEqual(walletClient.account.address, actor)
        )
          throw Error("Wallet account or network changed.")
        await sendTransactionAndWait(publicClient, walletClient, tx, {
          errorAbi: abi,
        })
      }
    },
    onSuccess: async () => {
      invalidateMarketListQueries({ client, chainId })
      if (kind === "hooks") {
        client.invalidateQueries({
          queryKey: QueryKeys.Borrower.GET_POLICY(chainId, contract),
        })
        client.invalidateQueries({
          queryKey: QueryKeys.Borrower.GET_HOOKS_DATA(chainId),
        })
        client.invalidateQueries({
          queryKey: QueryKeys.Borrower.GET_HOOKS_DATA_WITH_SUBGRAPH(chainId),
        })
      }
      // One policy or shared list can affect accounts on several markets.
      await Promise.all([
        client.invalidateQueries({
          queryKey: ["roleProvider", chainId, contract],
        }),
        client.invalidateQueries({
          queryKey: QueryKeys.Lender.GET_MARKET_ACCOUNT_PREFIX(chainId),
        }),
        client.invalidateQueries({
          queryKey: QueryKeys.Markets.GET_MARKET(chainId),
        }),
      ])
    },
  })

  return {
    publicClient,
    provider,
    actor,
    correctChain,
    authority,
    canWrite,
    transaction,
    transactionError: transaction.isError
      ? describeContractError(transaction.error, abi)
      : undefined,
  }
}
