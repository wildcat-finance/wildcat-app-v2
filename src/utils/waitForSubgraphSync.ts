import {
  GetSubgraphStatusDocument,
  SubgraphGetSubgraphStatusQuery,
  SubgraphGetSubgraphStatusQueryVariables,
} from "@wildcatfi/wildcat-sdk/dist/gql/graphql"
import { toast } from "react-toastify"

import {
  dismissToast,
  toastInfo,
  toastSuccess,
} from "@/components/Toasts"
import { SubgraphClient } from "@/config/subgraph"

export async function getSubgraphSyncedBlock(): Promise<{
  hash: string
  number: number
  timestamp: number
}> {
  const result = await SubgraphClient.query<
    SubgraphGetSubgraphStatusQuery,
    SubgraphGetSubgraphStatusQueryVariables
  >({
    query: GetSubgraphStatusDocument,
    fetchPolicy: "no-cache",
  })
  // eslint-disable-next-line no-underscore-dangle
  const block = result.data._meta?.block
  if (!block) {
    throw Error("Could not get synced block from subgraph")
  }
  const { hash, number, timestamp } = block
  return { hash: hash as string, number, timestamp: timestamp as number }
}

export async function waitForSubgraphSync(
  targetBlock: number,
): Promise<number> {
  let toastId: string | undefined
  let initialBlock: number | undefined
  const check = async (): Promise<number> => {
    const latestBlock = (await getSubgraphSyncedBlock()).number
    if (initialBlock === undefined) {
      // If subgraph is synced on first check, don't show toast
      if (latestBlock >= targetBlock) {
        return latestBlock
      }

      initialBlock = latestBlock
    }
    if (latestBlock < targetBlock) {
      const blocksRemaining = targetBlock - latestBlock
      console.log(
        `Waiting for subgraph sync... ${blocksRemaining} blocks remaining`,
      )
      const blocksProcessed = latestBlock - initialBlock
      const totalBlocks = targetBlock - initialBlock
      const progress = blocksProcessed / totalBlocks
      // if (toastId !== undefined) dismissToast(toastId)
      if (toastId === undefined) {
        toastId = toastInfo(
          `Waiting for subgraph to sync to block: ${targetBlock}.`,
          { progress, autoClose: false },
        )
      } else {
        toast.update(toastId, {
          progress,
        })
      }

      // eslint-disable-next-line no-promise-executor-return
      await new Promise((resolve) => setTimeout(resolve, 5000))
      return check()
    }
    if (toastId !== undefined) dismissToast(toastId)
    toastSuccess(`Subgraph synced to block ${targetBlock}`)
    return latestBlock
  }
  return check()
}
